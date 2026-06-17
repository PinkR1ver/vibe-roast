const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createInterface } = require("node:readline");

const DEFAULT_QUEUE = path.join(os.homedir(), ".tokentracker", "tracker", "queue.jsonl");

async function inspectTokenTracker({ queuePath, range } = {}) {
  const file = queuePath || DEFAULT_QUEUE;
  let filesScanned = 0;
  const buckets = new Map();

  try {
    filesScanned = 1;
    const rl = createInterface({
      input: fs.createReadStream(file, "utf8"),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }

      const timestamp = row.hour_start || row.timestamp || row.ended_at || row.created_at;
      if (!timestamp || !inRange(timestamp, range)) continue;

      const totals = normalizeTotals(row);
      if (totals.total_tokens <= 0 && totals.billable_total_tokens <= 0) continue;

      const source = normalizeText(row.source, "unknown").toLowerCase();
      const model = normalizeText(row.model, "unknown");
      buckets.set(`${source}|${model}|${timestamp}`, {
        ...row,
        source,
        model,
        hour_start: timestamp,
      });
    }
  } catch {
    return emptyReport(file, filesScanned);
  }

  const daily = new Map();
  const tokenTotals = emptyTotals();

  for (const row of buckets.values()) {
    const timestamp = row.hour_start;
    const totals = normalizeTotals(row);
    addTotals(tokenTotals, totals);

    const day = String(timestamp).slice(0, 10);
    const current = daily.get(day) || {
      day,
      total_tokens: 0,
      billable_total_tokens: 0,
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_creation_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      conversation_count: 0,
      models: {},
      sources: {},
    };

    addTotals(current, totals);
    current.conversation_count += number(row.conversation_count);

    const source = row.source;
    const model = row.model;
    const modelKey = `${source}/${model}`;
    const value = totals.billable_total_tokens || totals.total_tokens;
    current.models[modelKey] = (current.models[modelKey] || 0) + value;
    current.sources[source] = (current.sources[source] || 0) + value;
    daily.set(day, current);
  }

  const dailyRows = Array.from(daily.values()).sort((a, b) => a.day.localeCompare(b.day));

  return {
    source: "token-tracker",
    root: file,
    files_scanned: filesScanned,
    bucket_count: buckets.size,
    active_day_count: dailyRows.filter((row) => (row.billable_total_tokens || row.total_tokens) > 0).length,
    token_totals: publicTotals(tokenTotals),
    daily_rows: dailyRows.map((row) => ({
      ...row,
      value: row.billable_total_tokens || row.total_tokens,
      level_value: row.billable_total_tokens || row.total_tokens,
    })),
    prompts: [],
  };
}

function normalizeText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function emptyReport(file, filesScanned = 0) {
  return {
    source: "token-tracker",
    root: file,
    files_scanned: filesScanned,
    bucket_count: 0,
    active_day_count: 0,
    token_totals: publicTotals(emptyTotals()),
    daily_rows: [],
    prompts: [],
  };
}

function inRange(timestamp, range) {
  if (!range) return true;
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return true;
  const fromMs = range.fromMs ?? (range.from ? Date.parse(range.from) : null);
  const toMs = range.toMs ?? (range.to ? Date.parse(range.to) : null);
  if (Number.isFinite(fromMs) && ms < fromMs) return false;
  if (Number.isFinite(toMs) && ms > toMs) return false;
  return true;
}

function normalizeTotals(row) {
  const totals = {
    input_tokens: number(row.input_tokens),
    cached_input_tokens: number(row.cached_input_tokens),
    cache_creation_input_tokens: number(row.cache_creation_input_tokens),
    output_tokens: number(row.output_tokens),
    reasoning_output_tokens: number(row.reasoning_output_tokens),
    total_tokens: number(row.total_tokens),
    billable_total_tokens: number(row.billable_total_tokens),
  };
  if (!totals.billable_total_tokens) totals.billable_total_tokens = totals.total_tokens;
  return totals;
}

function emptyTotals() {
  return {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_creation_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
    total_tokens: 0,
    billable_total_tokens: 0,
  };
}

function publicTotals(totals) {
  const { billable_total_tokens: _billable, ...rest } = totals;
  return rest;
}

function addTotals(target, delta) {
  for (const key of Object.keys(delta)) {
    target[key] = number(target[key]) + number(delta[key]);
  }
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

module.exports = { inspectTokenTracker };
