const cp = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const { isInRange } = require("../lib/dates");
const { normalizeWhitespace, textFromContent } = require("../extract/text");

function resolveCursorDbPath({ home = os.homedir(), platform = process.platform, env = process.env } = {}) {
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
  }
  if (platform === "win32") {
    const appData = env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.win32.join(appData, "Cursor", "User", "globalStorage", "state.vscdb");
  }
  const xdg = env.XDG_CONFIG_HOME || path.join(home, ".config");
  return path.join(xdg, "Cursor", "User", "globalStorage", "state.vscdb");
}

async function inspectCursor({ dbPath, range } = {}) {
  const stateDbPath = dbPath || resolveCursorDbPath();
  const rows = readCursorRows(stateDbPath);
  const allEntries = extractCursorEntriesFromRows(rows);
  const prompts = allEntries.filter((entry) => isInRange(entry.timestamp, range));
  const tokenTotals = emptyTotals();
  for (const prompt of prompts) addTotals(tokenTotals, prompt.tokens);

  return {
    source: "cursor",
    root: stateDbPath,
    files_scanned: rows.length > 0 ? 1 : 0,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts: prompts.map(({ tokens, ...entry }) => entry),
    notes: buildCursorNotes(rows, prompts),
  };
}

function buildCursorNotes(rows, prompts) {
  if (rows.length === 0) {
    return [
      "No readable Cursor SQLite rows found. Install sqlite3 or pass --cursor-db to a readable state.vscdb.",
    ];
  }
  if (prompts.some((prompt) => !prompt.timestamp)) {
    return [
      "Cursor bubble rows expose prompt text but not reliable timestamps in the compact local query; date filters may include undated Cursor prompts.",
    ];
  }
  return [];
}

function readCursorRows(dbPath) {
  const itemSql =
    "SELECT key, value FROM ItemTable WHERE key LIKE '%bubble%' OR key LIKE '%composer%' OR key LIKE '%chat%' LIMIT 20000;";
  const diskSql =
    "SELECT key, json_object('type', json_extract(value, '$.type'), 'text', json_extract(value, '$.text')) AS value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%' AND json_extract(value, '$.type') = 1 AND length(COALESCE(json_extract(value, '$.text'), '')) > 0 LIMIT 20000;";
  return [...readSqliteRows(dbPath, itemSql), ...readSqliteRows(dbPath, diskSql)];
}

function readSqliteRows(dbPath, sql) {
  try {
    const out = cp.execFileSync("sqlite3", ["-json", dbPath, sql], {
      encoding: "utf8",
      timeout: 10000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(out || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractCursorEntriesFromRows(rows) {
  const entries = [];
  for (const row of rows || []) {
    if (!isCursorPromptKey(row.key)) continue;
    const value = parseMaybeJson(row.value);
    const candidates = collectCursorPromptCandidates(value);
    for (const candidate of candidates) {
      const text = normalizeWhitespace(textFromContent(candidate.text));
      if (!looksLikePrompt(text)) continue;
      entries.push({
        source: "cursor",
        timestamp: candidate.timestamp || value?.timestamp || value?.createdAt || null,
        session_file: row.key || "cursor-state",
        text,
        tokens: normalizeCursorTokens(candidate.usage || value?.usage || value),
      });
    }
  }
  return dedupeEntries(entries);
}

function isCursorPromptKey(key) {
  return /(bubble|composer|chat|conversation|message)/i.test(String(key || ""));
}

function collectCursorPromptCandidates(value) {
  const out = [];
  visit(value, (node) => {
    if (!node || typeof node !== "object") return;
    const role = String(node.role || node.type || node.kind || "").toLowerCase();
    const text = node.text ?? node.content ?? node.message ?? node.prompt;
    if (!text) return;
    if (node.type === 2 || role === "assistant") return;
    if (role && !/(^1$|user|human|prompt|request|bubble)/.test(role)) return;
    out.push({
      text,
      timestamp: node.timestamp || node.createdAt || node.time || null,
      usage: node.usage || node.tokenUsage || node.tokens || null,
    });
  });
  return out;
}

function visit(value, fn, seen = new Set()) {
  if (value == null) return;
  if (typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  fn(value);
  if (Array.isArray(value)) {
    for (const item of value) visit(item, fn, seen);
    return;
  }
  for (const item of Object.values(value)) visit(item, fn, seen);
}

function parseMaybeJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return { text: value };
  }
}

function looksLikePrompt(text) {
  if (!text || text.length < 4) return false;
  if (/^(true|false|null|undefined)$/i.test(text)) return false;
  return /[\p{Letter}\p{Script=Han}]/u.test(text);
}

function normalizeCursorTokens(raw) {
  const input = number(raw?.inputTokens || raw?.input_tokens || raw?.promptTokens || raw?.tokens_prompt);
  const output = number(raw?.outputTokens || raw?.output_tokens || raw?.generatedTokens || raw?.tokens_generated);
  const total = number(raw?.totalTokens || raw?.total_tokens) || input + output;
  return {
    input_tokens: input,
    cached_input_tokens: 0,
    cache_creation_input_tokens: 0,
    output_tokens: output,
    reasoning_output_tokens: 0,
    total_tokens: total,
  };
}

function dedupeEntries(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = `${entry.timestamp || ""}|${entry.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function emptyTotals() {
  return {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_creation_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
    total_tokens: 0,
  };
}

function addTotals(target, delta) {
  for (const key of Object.keys(target)) target[key] += number(delta[key]);
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

module.exports = { inspectCursor, resolveCursorDbPath, extractCursorEntriesFromRows };
