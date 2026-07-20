const os = require("node:os");
const path = require("node:path");

const { walkFiles, readJsonl } = require("../lib/jsonl");
const { isInRange } = require("../lib/dates");
const {
  emptyTotals,
  emptyReport,
  addTotals,
  usageFromObject,
  cleanText,
  toIsoTimestamp,
  readJsonFile,
} = require("./common");

async function inspectWindsurf({ root, range, home = os.homedir() } = {}) {
  const windsurfRoot = root || path.join(home, ".codeium", "windsurf");
  const files = await walkFiles(
    windsurfRoot,
    (_filePath, name) =>
      name.endsWith(".json") ||
      name.endsWith(".jsonl") ||
      name.endsWith(".md") ||
      name.endsWith(".pb"),
  );

  const prompts = [];
  const tokenTotals = emptyTotals();
  let readableFiles = 0;
  let encryptedPb = 0;

  for (const file of files) {
    if (file.endsWith(".pb")) {
      encryptedPb += 1;
      continue;
    }
    readableFiles += 1;
    if (file.endsWith(".jsonl")) {
      await readJsonl(file, (obj) => {
        const text = extractWindsurfUserText(obj);
        if (!text) return;
        const timestamp = toIsoTimestamp(obj.timestamp || obj.time || obj.createdAt);
        if (!isInRange(timestamp, range)) return;
        prompts.push({
          source: "windsurf",
          timestamp,
          session_file: file,
          text,
        });
        addTotals(tokenTotals, usageFromObject(obj));
      });
      continue;
    }

    if (file.endsWith(".md")) {
      // Exported Cascade markdown — treat lines after "## User" / "### User" as prompts.
      // Keep lightweight: only explicit user headings.
      continue;
    }

    const data = await readJsonFile(file);
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data?.trajectory)
          ? data.trajectory
          : Array.isArray(data?.steps)
            ? data.steps
            : [];
    for (const row of rows) {
      const text = extractWindsurfUserText(row);
      if (!text) continue;
      const timestamp = toIsoTimestamp(row.timestamp || row.time || row.createdAt || data?.createdAt);
      if (!isInRange(timestamp, range)) continue;
      prompts.push({
        source: "windsurf",
        timestamp,
        session_file: file,
        text,
      });
      addTotals(tokenTotals, usageFromObject(row));
    }
  }

  const notes = [];
  if (encryptedPb > 0 && prompts.length === 0) {
    notes.push(
      `Found ${encryptedPb} encrypted Cascade .pb trajectory file(s); plaintext JSON/JSONL exports are required for prompt extraction.`,
    );
  }

  return {
    ...(emptyReport("windsurf", windsurfRoot, notes)),
    files_scanned: readableFiles + encryptedPb,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function extractWindsurfUserText(row) {
  if (!row || typeof row !== "object") return "";
  const role = String(row.role || row.type || row.author || row.kind || "").toLowerCase();
  if (role && !/(user|human|prompt|input)/.test(role)) return "";
  return cleanText(row.text ?? row.content ?? row.message ?? row.prompt ?? "");
}

module.exports = { inspectWindsurf, extractWindsurfUserText };
