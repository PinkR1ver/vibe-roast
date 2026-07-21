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
  resolveVscodeGlobalStorage,
} = require("./common");

const COPILOT_EXTENSION_IDS = [
  "github.copilot-chat",
  "GitHub.copilot-chat",
];

async function inspectCopilot({ root, range, home = os.homedir(), platform, env } = {}) {
  const roots = root
    ? [root]
    : [
        ...["Code", "Code - Insiders", "Cursor"].flatMap((appName) =>
          COPILOT_EXTENSION_IDS.map((id) =>
            resolveVscodeGlobalStorage({ home, platform, env, appName, parts: [id] }),
          ),
        ),
        path.join(home, ".copilot"),
      ];

  const prompts = [];
  const tokenTotals = emptyTotals();
  let filesScanned = 0;
  let usedRoot = roots[0] || null;
  const notes = [];

  for (const storeRoot of roots) {
    const files = await walkFiles(
      storeRoot,
      (_filePath, name) =>
        name.endsWith(".json") ||
        name.endsWith(".jsonl") ||
        name === "chat-sessions.json" ||
        name.includes("chat"),
    );
    if (!files.length) continue;
    usedRoot = storeRoot;

    for (const file of files) {
      const data = await readJsonFile(file);
      if (!data) continue;
      filesScanned += 1;
      for (const entry of extractCopilotEntries(data, file)) {
        if (!isInRange(entry.timestamp, range)) continue;
        prompts.push({
          source: "copilot",
          timestamp: entry.timestamp,
          session_file: file,
          text: entry.text,
        });
        addTotals(tokenTotals, entry.tokens);
      }
    }
    if (filesScanned > 0) break;
  }

  if (!filesScanned) {
    notes.push(
      "No readable GitHub Copilot Chat session JSON found under VS Code/Cursor globalStorage.",
    );
  }

  return {
    ...(emptyReport("copilot", usedRoot, notes)),
    files_scanned: filesScanned,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function extractCopilotEntries(data, file) {
  const out = [];
  const sessions = Array.isArray(data)
    ? data
    : Array.isArray(data.sessions)
      ? data.sessions
      : Array.isArray(data.chatSessions)
        ? data.chatSessions
        : [data];

  for (const session of sessions) {
    const requests = Array.isArray(session.requests)
      ? session.requests
      : Array.isArray(session.messages)
        ? session.messages
        : Array.isArray(session.history)
          ? session.history
          : [];

    for (const req of requests) {
      const text = extractCopilotUserText(req);
      if (!text) continue;
      out.push({
        text,
        timestamp: toIsoTimestamp(
          req.timestamp ||
            req.time ||
            req.createdAt ||
            session.creationDate ||
            session.lastMessageDate ||
            session.createdAt,
        ),
        tokens: usageFromObject(req) || usageFromObject(req.response),
      });
    }

    // Some exports store the user message on the request itself.
    if (!requests.length) {
      const text = extractCopilotUserText(session);
      if (text) {
        out.push({
          text,
          timestamp: toIsoTimestamp(session.creationDate || session.createdAt || session.timestamp),
          tokens: usageFromObject(session),
        });
      }
    }
  }

  // Flat message list files
  if (!out.length && data && typeof data === "object" && Array.isArray(data.messages)) {
    for (const msg of data.messages) {
      const text = extractCopilotUserText(msg);
      if (!text) continue;
      out.push({
        text,
        timestamp: toIsoTimestamp(msg.timestamp || msg.createdAt),
        tokens: usageFromObject(msg),
      });
    }
  }

  void file;
  return out;
}

function extractCopilotUserText(row) {
  if (!row || typeof row !== "object") return "";
  const role = String(row.role || row.kind || row.author || row.participant || "").toLowerCase();
  if (role && !/(user|human|request)/.test(role) && role !== "0") {
    // Copilot chat requests often omit role and use `message` / `prompt`.
    if (!row.message && !row.prompt && !row.text && !row.request) return "";
    if (/(assistant|bot|copilot|response|model)/.test(role)) return "";
  }
  return cleanText(
    row.message ??
      row.prompt ??
      row.text ??
      row.request ??
      row.content ??
      row.userMessage ??
      "",
  );
}

module.exports = { inspectCopilot, extractCopilotUserText, extractCopilotEntries };
