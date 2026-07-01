const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createInterface } = require("node:readline");

const DEFAULT_QUEUE = path.join(os.homedir(), ".tokentracker", "tracker", "queue.jsonl");

// ---------------------------------------------------------------------------
// Legacy-row corrections — aligned with TokenTracker normalizeQueueRow
// (src/lib/local-api.js)
// ---------------------------------------------------------------------------

function isLegacyInclusiveCodexRow(row) {
  if (!row || (row.source !== "codex" && row.source !== "every-code")) return false;
  const inputTokens = Number(row.input_tokens || 0);
  const cachedInputTokens = Number(row.cached_input_tokens || 0);
  const outputTokens = Number(row.output_tokens || 0);
  const totalTokens = Number(row.total_tokens || 0);
  if (!Number.isFinite(inputTokens) || !Number.isFinite(cachedInputTokens)) return false;
  if (cachedInputTokens <= 0 || inputTokens < cachedInputTokens) return false;
  // Legacy Codex queue rows stored input inclusive of cache reads, while
  // total_tokens remained input + output. Canonical rows keep input as pure
  // non-cached input, identified by this exact invariant.
  return totalTokens === inputTokens + outputTokens;
}

function normalizeQueueRow(row) {
  let normalized = row;
  if (isLegacyInclusiveCodexRow(normalized)) {
    normalized = {
      ...normalized,
      input_tokens:
        Number(normalized.input_tokens || 0) - Number(normalized.cached_input_tokens || 0),
    };
  }
  // Legacy Cursor rows from versions ≤ 0.26.5 wrote billable_total_tokens = 0
  // for "Included in Pro" / "Enterprise" records. The dashboard headline sums
  // billable_total_tokens, so those rows silently disappeared from totals.
  // Bump billable up to total_tokens at read time.
  const sourceName = String(normalized.source || "").toLowerCase();
  if (sourceName === "cursor") {
    const totalTokens = Number(normalized.total_tokens || 0);
    const billable = Number(normalized.billable_total_tokens || 0);
    if (totalTokens > 0 && billable < totalTokens) {
      normalized = { ...normalized, billable_total_tokens: totalTokens };
    }
  }
  return normalized;
}

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
        row = normalizeQueueRow(JSON.parse(line));
      } catch {
        continue;
      }

      // Match TokenTracker dedup key: (source, model, hour_start) only.
      // Rows without hour_start are skipped — same as upstream.
      const timestamp = row.hour_start;
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
  // Match TokenTracker aggregateByDay nullish fallback:
  // only substitute total_tokens when billable is absent (null / undefined),
  // not when it is legitimately zero.
  if (row.billable_total_tokens == null && totals.total_tokens > 0) {
    totals.billable_total_tokens = totals.total_tokens;
  }
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

module.exports = { inspectTokenTracker, isLegacyInclusiveCodexRow, normalizeQueueRow };
