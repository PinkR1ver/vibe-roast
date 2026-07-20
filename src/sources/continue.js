const os = require("node:os");
const path = require("node:path");

const { walkFiles } = require("../lib/jsonl");
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

async function inspectContinue({ root, range, home = os.homedir() } = {}) {
  const sessionsRoot = root || path.join(home, ".continue", "sessions");
  const files = await walkFiles(sessionsRoot, (_filePath, name) => name.endsWith(".json"));
  const prompts = [];
  const tokenTotals = emptyTotals();

  for (const file of files) {
    const data = await readJsonFile(file);
    if (!data) continue;
    const history = Array.isArray(data.history)
      ? data.history
      : Array.isArray(data.messages)
        ? data.messages
        : Array.isArray(data)
          ? data
          : [];

    for (const row of history) {
      const text = extractContinueUserText(row);
      if (!text) continue;
      const timestamp =
        toIsoTimestamp(row.timestamp || row.time || row.dateCreated || data.dateCreated || data.createdAt) ||
        null;
      if (!isInRange(timestamp, range)) continue;
      prompts.push({
        source: "continue",
        timestamp,
        session_file: file,
        text,
      });
      addTotals(tokenTotals, usageFromObject(row) || usageFromObject(row.message));
    }
  }

  return {
    ...(emptyReport("continue", sessionsRoot)),
    files_scanned: files.length,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function extractContinueUserText(row) {
  if (!row || typeof row !== "object") return "";
  const message = row.message && typeof row.message === "object" ? row.message : row;
  const role = String(message.role || row.role || "").toLowerCase();
  if (role && role !== "user") return "";
  return cleanText(message.content ?? row.content ?? row.text ?? "");
}

module.exports = { inspectContinue, extractContinueUserText };
