const cp = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const { isInRange } = require("../lib/dates");
const { normalizeWhitespace } = require("../extract/text");

function resolveOpenCodeDbPath({
  home = os.homedir(),
  env = process.env,
} = {}) {
  const dataHome = env.XDG_DATA_HOME || path.join(home, ".local", "share");
  return path.join(dataHome, "opencode", "opencode.db");
}

async function inspectOpenCode({ root, range } = {}) {
  const dbPath = root || resolveOpenCodeDbPath();

  const allPrompts = readOpenCodePrompts(dbPath);
  const prompts = allPrompts.filter((p) => isInRange(p.timestamp, range));
  const tokenTotals = readOpenCodeTokenTotals(dbPath, range);

  return {
    source: "opencode",
    root: dbPath,
    files_scanned: allPrompts.length > 0 ? 1 : 0,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
    notes: buildNotes(allPrompts, prompts),
  };
}

function buildNotes(allPrompts, filteredPrompts) {
  const notes = [];
  if (allPrompts.length === 0) {
    notes.push(
      "No readable OpenCode prompts found. Ensure sqlite3 is installed and the OpenCode database exists at ~/.local/share/opencode/opencode.db, or pass --opencode-root to a readable opencode.db.",
    );
  }
  if (filteredPrompts.some((p) => !p.timestamp)) {
    notes.push(
      "Some OpenCode prompts lack reliable timestamps; date-filtered views may omit them.",
    );
  }
  return notes;
}

function readOpenCodePrompts(dbPath) {
  const sql = `
    SELECT
      m.id,
      m.session_id,
      m.time_created,
      json_extract(p.data, '$.text') AS text,
      COALESCE(s.slug, m.session_id) AS session_slug
    FROM message m
    JOIN part p ON p.message_id = m.id
    LEFT JOIN session s ON s.id = m.session_id
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND length(COALESCE(json_extract(p.data, '$.text'), '')) > 0
    ORDER BY m.time_created
    LIMIT 50000
  `;

  const rows = readSqliteRows(dbPath, sql);

  return rows.map((row) => ({
    source: "opencode",
    timestamp: unixMsToIso(row.time_created),
    session_file: `${dbPath}#${row.session_slug}`,
    text: normalizeWhitespace(row.text),
  }));
}

function readOpenCodeTokenTotals(dbPath, range) {
  const sql = `
    SELECT
      tokens_input,
      tokens_output,
      tokens_reasoning,
      tokens_cache_read,
      tokens_cache_write,
      time_created
    FROM session
    WHERE time_archived IS NULL
    ORDER BY time_created
    LIMIT 50000
  `;

  const rows = readSqliteRows(dbPath, sql);
  const totals = emptyTokenTotals();

  for (const row of rows) {
    const timestamp = unixMsToIso(row.time_created);
    if (!isInRange(timestamp, range)) continue;

    totals.input_tokens += num(row.tokens_input);
    totals.cached_input_tokens += num(row.tokens_cache_read);
    totals.cache_creation_input_tokens += num(row.tokens_cache_write);
    totals.output_tokens += num(row.tokens_output);
    totals.reasoning_output_tokens += num(row.tokens_reasoning);
    totals.total_tokens +=
      num(row.tokens_input) +
      num(row.tokens_cache_read) +
      num(row.tokens_cache_write) +
      num(row.tokens_output) +
      num(row.tokens_reasoning);
  }

  return totals;
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

function emptyTokenTotals() {
  return {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_creation_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
    total_tokens: 0,
  };
}

function unixMsToIso(ms) {
  if (!ms) return null;
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n).toISOString();
}

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

module.exports = {
  inspectOpenCode,
  resolveOpenCodeDbPath,
};
