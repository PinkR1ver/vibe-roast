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

async function inspectGemini({ root, range, home = os.homedir() } = {}) {
  const geminiRoot = root || path.join(home, ".gemini", "tmp");
  const files = await walkFiles(
    geminiRoot,
    (filePath, name) =>
      (name.endsWith(".json") || name.endsWith(".jsonl")) &&
      (/chats?[\\/]/i.test(filePath) || /session/i.test(name) || name.startsWith("session-")),
  );
  const prompts = [];
  const tokenTotals = emptyTotals();

  for (const file of files) {
    if (file.endsWith(".jsonl")) {
      // Rare JSONL exports under gemini tmp — reuse Continue-like objects via readJsonFile line-by-line isn't needed often.
      continue;
    }
    const data = await readJsonFile(file);
    if (!data) continue;
    const messages = Array.isArray(data.messages)
      ? data.messages
      : Array.isArray(data.history)
        ? data.history
        : Array.isArray(data)
          ? data
          : [];

    for (const row of messages) {
      const text = extractGeminiUserText(row);
      if (!text) continue;
      const timestamp = toIsoTimestamp(
        row.timestamp || row.time || row.createdAt || data.lastUpdated || data.startTime || data.sessionId,
      );
      if (!isInRange(timestamp, range)) continue;
      prompts.push({
        source: "gemini",
        timestamp,
        session_file: file,
        text,
      });
      addTotals(tokenTotals, usageFromObject(row));
    }
  }

  return {
    ...(emptyReport("gemini", geminiRoot)),
    files_scanned: files.length,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function extractGeminiUserText(row) {
  if (!row || typeof row !== "object") return "";
  const type = String(row.type || row.role || "").toLowerCase();
  if (type && !["user", "human", "input"].includes(type)) return "";
  return cleanText(row.content ?? row.text ?? row.message ?? row.parts ?? "");
}

module.exports = { inspectGemini, extractGeminiUserText };
