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
  resolveVscodeGlobalStorage,
} = require("./common");

async function inspectVscodeTaskStore({
  source,
  extensionId,
  root,
  range,
  home,
  platform,
  env,
  appNames = ["Code", "Code - Insiders", "Cursor", "Windsurf"],
} = {}) {
  const roots = root
    ? [root]
    : appNames.map((appName) =>
        resolveVscodeGlobalStorage({ home, platform, env, appName, parts: [extensionId, "tasks"] }),
      );

  const prompts = [];
  const tokenTotals = emptyTotals();
  let filesScanned = 0;
  const notes = [];
  let usedRoot = roots[0] || null;

  for (const tasksRoot of roots) {
    const files = await walkFiles(
      tasksRoot,
      (_filePath, name) =>
        name === "ui_messages.json" ||
        name === "api_conversation_history.json" ||
        name.endsWith(".json"),
    );
    if (!files.length) continue;
    usedRoot = tasksRoot;
    for (const file of files) {
      const base = path.basename(file);
      if (
        base !== "ui_messages.json" &&
        base !== "api_conversation_history.json" &&
        !/messages?/i.test(base)
      ) {
        continue;
      }
      filesScanned += 1;
      const data = await readJsonFile(file);
      const rows = normalizeMessageRows(data);
      for (const row of rows) {
        const text = extractTaskUserText(row);
        if (!text) continue;
        const timestamp = toIsoTimestamp(row.ts || row.timestamp || row.time || row.createdAt || row.date);
        if (!isInRange(timestamp, range)) continue;
        prompts.push({
          source,
          timestamp,
          session_file: file,
          text,
        });
        addTotals(tokenTotals, usageFromObject(row));
      }
    }
    if (filesScanned > 0) break;
  }

  if (!filesScanned && !root) {
    notes.push(
      `No ${source} task transcripts found under VS Code/Cursor globalStorage (${extensionId}/tasks).`,
    );
  }

  return {
    ...(emptyReport(source, usedRoot, notes)),
    files_scanned: filesScanned,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function normalizeMessageRows(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.messages)) return data.messages;
  if (Array.isArray(data.clineMessages)) return data.clineMessages;
  if (Array.isArray(data.history)) return data.history;
  return [];
}

function extractTaskUserText(row) {
  if (!row || typeof row !== "object") return "";
  const type = String(row.type || row.role || row.say || row.ask || "").toLowerCase();
  const say = String(row.say || "").toLowerCase();
  const ask = String(row.ask || "").toLowerCase();
  const role = String(row.role || "").toLowerCase();

  const looksUser =
    role === "user" ||
    type === "user" ||
    type === "human" ||
    say === "user_feedback" ||
    say === "text" && role !== "assistant" ||
    ask === "followup" ||
    ask === "command" ||
    (type === "ask" && !/tool|error|completion/i.test(ask));

  if (!looksUser) {
    // api_conversation_history style
    if (role !== "user" && type !== "user") return "";
  }

  const candidates = [
    row.text,
    row.content,
    row.message,
    row.userContent,
    row.ask === "followup" ? row.text : null,
    Array.isArray(row.content) ? row.content : null,
  ];
  for (const candidate of candidates) {
    const text = cleanText(candidate);
    if (text) return text;
  }
  return "";
}

module.exports = {
  inspectVscodeTaskStore,
  extractTaskUserText,
  normalizeMessageRows,
};
