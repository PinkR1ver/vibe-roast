const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createInterface } = require("node:readline");

const STORE_DIR = path.join(os.homedir(), ".vibe-roast");

async function inspectVibeTracker({ range } = {}) {
  const storeFile = path.join(STORE_DIR, "sessions.jsonl");
  const prompts = [];
  let tokenTotals = emptyTotals();
  let filesScanned = 0;

  try {
    filesScanned = 1;
    const stream = fs.createReadStream(storeFile, "utf8");
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (!inRange(record.ended_at, range)) continue;

        tokenTotals.input_tokens += Number(record.input_tokens || 0);
        tokenTotals.output_tokens += Number(record.output_tokens || 0);
        tokenTotals.cached_input_tokens += Number(record.cached_input_tokens || 0);
        tokenTotals.cache_creation_input_tokens += Number(record.cache_creation_input_tokens || 0);
        tokenTotals.total_tokens += Number(record.total_tokens || 0);

        prompts.push({
          source: "vibe-tracker",
          timestamp: record.ended_at,
          text: `Session by ${record.source}: ${record.model || "unknown"} — ${formatTokens(record.total_tokens)} tokens`,
          input_tokens: record.input_tokens,
          output_tokens: record.output_tokens,
          cached_input_tokens: record.cached_input_tokens,
          cache_creation_input_tokens: record.cache_creation_input_tokens,
        });
      } catch { /* skip */ }
    }
  } catch {
    // No data yet — return empty
  }

  return {
    files_scanned: filesScanned,
    prompt_count: prompts.length,
    token_totals: tokenTotals,
    prompts,
  };
}

function inRange(timestamp, range) {
  if (!timestamp || !range) return true;
  if (range.from && timestamp < range.from + "T00:00:00.000Z") return false;
  if (range.to && timestamp > range.to + "T23:59:59.999Z") return false;
  return true;
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

function formatTokens(n) {
  n = Number(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

module.exports = { inspectVibeTracker };
