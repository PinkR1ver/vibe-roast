const { dayBounds } = require("./lib/dates");
const { wordCloudRecords, wordFrequenciesFromRecords } = require("./extract/phrase-stats");
const { analyzePrompts } = require("./extract/prompt-analysis");
const { inspectEnvironment } = require("./extract/environment");
const { buildVibeProfile } = require("./lib/agent-score");
const { buildRoastEvidence } = require("./lib/roast-evidence");
const { inspectTokenTracker } = require("./sources/token-tracker");
const { SOURCE_INSPECTORS, normalizeSources } = require("./sources");

async function inspectSources({ from, to, sources, roots = {}, injectedReports = {} } = {}) {
  const range = dayBounds(from, to);
  const injectedSourceNames = Object.keys(injectedReports || {});
  const selected = Array.isArray(sources) && sources.length === 0 && injectedSourceNames.length > 0
    ? injectedSourceNames
    : normalizeSources(sources);
  const sourceReports = {};
  const prompts = [];
  const tokenTrackerActivity = await inspectTokenTracker({
    queuePath: roots.tokenTrackerQueue,
    range,
  });

  for (const source of selected) {
    const inspect = SOURCE_INSPECTORS[source];
    if (!inspect && !injectedReports[source]) continue;
    const report = injectedReports[source] || await inspect({
      root: roots[source],
      dbPath: roots.cursorDb || roots.cursor,
      range,
      home: roots.home,
    });
    sourceReports[source] = stripPrompts(report);
    prompts.push(...(report.prompts || []));
  }

  prompts.sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
  const promptAnalysis = analyzePrompts(prompts);
  const wordSourcePrompts = prompts.filter((prompt) => prompt.timestamp);
  const wordPromptAnalysis = analyzePrompts(wordSourcePrompts.length > 0 ? wordSourcePrompts : prompts, {
    usefulLimit: prompts.length,
  });
  const environment = await inspectEnvironment({
    home: roots.home,
    codexHome: roots.codexHome,
  });
  const activity = enrichActivity(buildActivity(tokenTrackerActivity, prompts, sourceReports));
  const summary = buildSummary(sourceReports, prompts, activity);
  const vibe_profile = buildVibeProfile({
    categories: promptAnalysis.categories || {},
    env: environment?.codex || {},
    summary,
    promptAnalysis,
    activity,
  });
  const word_cloud_records = wordCloudRecords(
    wordPromptAnalysis.useful_for_stats || wordPromptAnalysis.useful_prompts,
  );

  const report = {
    generated_at: new Date().toISOString(),
    range: { from: from || null, to: to || null },
    summary,
    sources: sourceReports,
    activity,
    word_frequencies: wordFrequenciesFromRecords(word_cloud_records),
    word_cloud_records,
    profile_signals: {
      prompt_analysis: promptAnalysis,
      environment,
    },
    vibe_profile,
    prompts,
  };
  report.roast_evidence = buildRoastEvidence(report);
  return report;
}

function buildActivity(tokenTrackerActivity, prompts = [], sourceReports = {}) {
  if (tokenTrackerActivity?.daily_rows?.length > 0) {
    return {
      source: "token-tracker",
      metric: "tokens",
      daily_rows: attachContextBreakdown(tokenTrackerActivity.daily_rows, sourceReports),
      total_tokens: tokenTrackerActivity.token_totals?.total_tokens || 0,
      active_day_count: tokenTrackerActivity.active_day_count || 0,
      bucket_count: tokenTrackerActivity.bucket_count || 0,
      daily_row_count: tokenTrackerActivity.daily_rows.length,
      root: tokenTrackerActivity.root,
      estimated_cost_usd: parseOptionalCost(tokenTrackerActivity.estimated_cost_usd),
    };
  }

  const byDay = new Map();
  for (const prompt of prompts || []) {
    if (!prompt?.timestamp) continue;
    const day = String(prompt.timestamp).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const row = byDay.get(day) || { day, value: 0, conversation_count: 0, models: {}, sources: {} };
    row.value += 1;
    row.conversation_count += 1;
    const source = prompt.source || "unknown";
    row.sources[source] = (row.sources[source] || 0) + 1;
    row.models[source] = (row.models[source] || 0) + 1;
    byDay.set(day, row);
  }

  const daily_rows = [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((row) => ({
      day: row.day,
      value: row.value,
      total_tokens: row.value,
      billable_total_tokens: row.value,
      conversation_count: row.conversation_count,
      models: row.models,
      sources: row.sources,
    }));

  return {
    source: "prompts",
    metric: "prompts",
    daily_rows,
    total_tokens: 0,
    active_day_count: daily_rows.length,
    bucket_count: 0,
    daily_row_count: daily_rows.length,
    root: null,
    estimated_cost_usd: null,
  };
}

function attachContextBreakdown(dailyRows, sourceReports) {
  const contextByDay = new Map();
  for (const [source, report] of Object.entries(sourceReports || {})) {
    for (const row of report?.context_breakdown_daily || []) {
      if (!row?.day) continue;
      const day = contextByDay.get(row.day) || {};
      day[source] = row;
      contextByDay.set(row.day, day);
    }
  }
  return (dailyRows || []).map((row) => ({
    ...row,
    context_breakdown: contextByDay.get(row.day) || {},
  }));
}

function enrichActivity(activity) {
  const { summarizeActivity } = require("./lib/activity-metrics");
  const stats = summarizeActivity(activity);
  return {
    ...activity,
    total_tokens: activity.metric === "tokens"
      ? (activity.total_tokens || stats.totalValue)
      : activity.total_tokens || 0,
    active_day_count: stats.activeDays || activity.active_day_count || 0,
    longest_streak: stats.maxStreak,
    peak_day: stats.peakDay.day
      ? { day: stats.peakDay.day, value: stats.peakDay.value }
      : null,
    top_agent: stats.topAgent,
    top_provider: stats.topProvider,
    top_model: stats.topModel,
    active_rate: stats.activeRate,
    estimated_cost_usd: parseOptionalCost(activity.estimated_cost_usd),
  };
}

function parseOptionalCost(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripPrompts(report) {
  const { prompts: _prompts, ...rest } = report;
  return rest;
}

function buildSummary(sourceReports, prompts, activity) {
  const tokenTotals = emptyTotals();
  let filesScanned = 0;
  for (const report of Object.values(sourceReports)) {
    filesScanned += report.files_scanned || 0;
    addTotals(tokenTotals, report.token_totals || {});
  }

  const timestampedPrompts = prompts.filter((prompt) => prompt.timestamp);
  const activeSources = rankActiveSources(sourceReports, prompts, activity);

  return {
    // Kept for CLI/API compatibility: this is the number of adapters inspected.
    source_count: Object.keys(sourceReports).length,
    active_source_count: activeSources.length,
    active_sources: activeSources,
    files_scanned: filesScanned,
    prompt_count: prompts.length,
    first_prompt_at: timestampedPrompts[0]?.timestamp || null,
    last_prompt_at: timestampedPrompts[timestampedPrompts.length - 1]?.timestamp || null,
    token_totals: tokenTotals,
  };
}

function rankActiveSources(sourceReports, prompts, activity) {
  const scores = new Map();
  const add = (source, value = 1) => {
    const key = normalizeSourceId(source);
    const amount = Number(value);
    if (!key || !Number.isFinite(amount) || amount <= 0) return;
    scores.set(key, (scores.get(key) || 0) + amount);
  };

  for (const prompt of prompts || []) add(prompt?.source);

  for (const [key, report] of Object.entries(sourceReports || {})) {
    const promptCount = Number(report?.prompt_count || 0);
    const tokenCount = Number(report?.token_totals?.total_tokens || 0);
    if (promptCount > 0 || tokenCount > 0) add(report?.source || key, promptCount || tokenCount);
  }

  for (const row of activity?.daily_rows || []) {
    for (const [source, value] of Object.entries(row?.sources || {})) add(source, value);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([source]) => source);
}

function normalizeSourceId(source) {
  const key = String(source || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!key || key === "unknown") return null;
  const aliases = {
    "claude-code": "claude",
    "github-copilot": "copilot",
    "amazon-q": "amazonq",
    "gemini-cli": "gemini",
    "roo-code": "roo",
  };
  return aliases[key] || key;
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

module.exports = { inspectSources, SOURCE_INSPECTORS, normalizeSources };
