const cp = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { isInRange } = require("../lib/dates");
const { normalizeWhitespace } = require("../extract/text");
const { emptyTotals, number, addTotals, toIsoTimestamp } = require("./common");

function resolveOpenCodeDbPath({
  home = os.homedir(),
  platform: pf = process.platform,
  env = process.env,
} = {}) {
  if (pf === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "opencode",
      "opencode.db",
    );
  }
  if (pf === "win32") {
    const appData = env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.win32.join(appData, "opencode", "opencode.db");
  }
  const dataHome = env.XDG_DATA_HOME || path.join(home, ".local", "share");
  return path.join(dataHome, "opencode", "opencode.db");
}

async function inspectOpenCode({ root, range } = {}) {
  const dbPath = root || resolveOpenCodeDbPath();

  if (!fs.existsSync(dbPath)) {
    return {
      source: "opencode",
      root: dbPath,
      files_scanned: 0,
      prompt_count: 0,
      token_totals: emptyTotals(),
      prompts: [],
      notes: [],
    };
  }

  const allPrompts = readOpenCodePrompts(dbPath, range);
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
  if (filteredPrompts.some((p) => !p.timestamp)) {
    notes.push(
      "Some OpenCode prompts lack reliable timestamps; date-filtered views may omit them.",
    );
  }
  return notes;
}

function readOpenCodePrompts(dbPath, range) {
  const { fromMs, toMs } = range || {};
  const clauses = [
    "json_extract(m.data, '$.role') = 'user'",
    "json_extract(p.data, '$.type') = 'text'",
    "length(COALESCE(json_extract(p.data, '$.text'), '')) > 0",
    "json_valid(m.data)",
    "json_valid(p.data)",
    "s.time_archived IS NULL",
  ];
  if (fromMs != null) clauses.push(`m.time_created >= ${fromMs}`);
  if (toMs != null) clauses.push(`m.time_created <= ${toMs}`);

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
    WHERE ${clauses.join("\n      AND ")}
    ORDER BY m.time_created DESC
    LIMIT 50000
  `;

  const rows = readSqliteRows(dbPath, sql);

  // Re-sort ascending for chronological prompt order.
  return rows
    .map((row) => ({
      source: "opencode",
      timestamp: toIsoTimestamp(row.time_created),
      session_file: `opencode:${row.session_slug}`,
      text: normalizeWhitespace(row.text),
    }))
    .reverse();
}

function readOpenCodeTokenTotals(dbPath, range) {
  const { fromMs, toMs } = range || {};
  const clauses = ["time_archived IS NULL"];
  if (fromMs != null) clauses.push(`time_created >= ${fromMs}`);
  if (toMs != null) clauses.push(`time_created <= ${toMs}`);

  const sql = `
    SELECT
      tokens_input,
      tokens_output,
      tokens_reasoning,
      tokens_cache_read,
      tokens_cache_write
    FROM session
    WHERE ${clauses.join("\n      AND ")}
    ORDER BY time_created
    LIMIT 50000
  `;

  const rows = readSqliteRows(dbPath, sql);
  const totals = emptyTotals();

  for (const row of rows) {
    totals.input_tokens += number(row.tokens_input);
    totals.cached_input_tokens += number(row.tokens_cache_read);
    totals.cache_creation_input_tokens += number(row.tokens_cache_write);
    totals.output_tokens += number(row.tokens_output);
    totals.reasoning_output_tokens += number(row.tokens_reasoning);
  }
  totals.total_tokens =
    totals.input_tokens +
    totals.cached_input_tokens +
    totals.cache_creation_input_tokens +
    totals.output_tokens +
    totals.reasoning_output_tokens;

  return totals;
}

function readSqliteRows(dbPath, sql) {
  try {
    const out = cp.execFileSync(
      "sqlite3",
      ["-readonly", "-json", dbPath, sql],
      {
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    const parsed = JSON.parse(out || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

module.exports = {
  inspectOpenCode,
  resolveOpenCodeDbPath,
};
