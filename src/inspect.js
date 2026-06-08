const { dayBounds } = require("./lib/dates");
const { wordFrequencies } = require("./extract/phrase-stats");
const { analyzePrompts } = require("./extract/prompt-analysis");
const { inspectEnvironment } = require("./extract/environment");
const { inspectCodex } = require("./sources/codex");
const { inspectClaude } = require("./sources/claude");
const { inspectCursor } = require("./sources/cursor");

const SOURCE_INSPECTORS = {
  codex: inspectCodex,
  claude: inspectClaude,
  cursor: inspectCursor,
};

async function inspectSources({ from, to, sources = ["codex", "claude", "cursor"], roots = {} } = {}) {
  const range = dayBounds(from, to);
  const selected = normalizeSources(sources);
  const sourceReports = {};
  const prompts = [];

  for (const source of selected) {
    const inspect = SOURCE_INSPECTORS[source];
    if (!inspect) continue;
    const report = await inspect({
      root: roots[source],
      dbPath: roots.cursorDb || roots.cursor,
      range,
    });
    sourceReports[source] = stripPrompts(report);
    prompts.push(...report.prompts);
  }

  prompts.sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
  const promptAnalysis = analyzePrompts(prompts);
  const environment = await inspectEnvironment({
    home: roots.home,
    codexHome: roots.codexHome,
  });

  return {
    generated_at: new Date().toISOString(),
    range: { from: from || null, to: to || null },
    summary: buildSummary(sourceReports, prompts),
    sources: sourceReports,
    word_frequencies: wordFrequencies(promptAnalysis.useful_prompts),
    profile_signals: {
      prompt_analysis: promptAnalysis,
      environment,
    },
    prompts,
  };
}

function normalizeSources(sources) {
  if (typeof sources === "string") {
    return sources.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return Array.isArray(sources) && sources.length > 0 ? sources : ["codex", "claude", "cursor"];
}

function stripPrompts(report) {
  const { prompts: _prompts, ...rest } = report;
  return rest;
}

function buildSummary(sourceReports, prompts) {
  const tokenTotals = emptyTotals();
  let filesScanned = 0;
  for (const report of Object.values(sourceReports)) {
    filesScanned += report.files_scanned || 0;
    addTotals(tokenTotals, report.token_totals || {});
  }

  const timestampedPrompts = prompts.filter((prompt) => prompt.timestamp);

  return {
    source_count: Object.keys(sourceReports).length,
    files_scanned: filesScanned,
    prompt_count: prompts.length,
    first_prompt_at: timestampedPrompts[0]?.timestamp || null,
    last_prompt_at: timestampedPrompts[timestampedPrompts.length - 1]?.timestamp || null,
    token_totals: tokenTotals,
  };
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
  for (const key of Object.keys(target)) {
    const n = Number(delta[key] || 0);
    target[key] += Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
}

module.exports = { inspectSources };
