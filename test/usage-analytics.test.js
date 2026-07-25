const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadModule() {
  return import(pathToFileURL(path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "lib",
    "usage-analytics.js",
  )));
}

async function loadCloudModule() {
  return import(pathToFileURL(path.join(
    __dirname,
    "..",
    "dashboard",
    "src",
    "lib",
    "vibe-cloud.js",
  )));
}

const ROWS = [
  {
    day: "2026-06-29",
    value: 100,
    sources: { cursor: 70, codex: 30 },
    models: { "cursor/claude": 70, "codex/gpt-5": 30 },
  },
  {
    day: "2026-07-01",
    value: 200,
    sources: { cursor: 50, claude: 150 },
    models: { "cursor/gpt-5": 50, "claude/sonnet": 150 },
  },
  {
    day: "2026-07-05",
    value: 300,
    sources: { codex: 300 },
    models: { "codex/gpt-5": 300 },
  },
];

test("usage overview ranks agents and counts concrete models", async () => {
  const { buildUsageOverview } = await loadModule();
  const overview = buildUsageOverview(ROWS);
  assert.equal(overview.totalTokens, 600);
  assert.equal(overview.modelCount, 4);
  assert.equal(overview.sources[0].source, "codex");
  assert.equal(overview.sources[0].tokens, 330);
});

test("usage periods use the latest available activity day", async () => {
  const { filterUsageRows } = await loadModule();
  assert.deepEqual(filterUsageRows(ROWS, "day").map((row) => row.day), ["2026-07-05"]);
  assert.deepEqual(filterUsageRows(ROWS, "week").map((row) => row.day), [
    "2026-06-29",
    "2026-07-01",
    "2026-07-05",
  ]);
  assert.deepEqual(filterUsageRows(ROWS, "month").map((row) => row.day), [
    "2026-07-01",
    "2026-07-05",
  ]);
});

test("usage trend switches to monthly buckets for long ranges", async () => {
  const { buildUsageTrend } = await loadModule();
  const trend = buildUsageTrend([
    ROWS[0],
    { ...ROWS[2], day: "2026-08-20" },
  ]);
  assert.deepEqual(trend.map((bucket) => bucket.key), ["2026-06", "2026-08"]);
  assert.equal(trend[1].sources.codex, 300);
});

test("agent filtering also narrows the model buckets", async () => {
  const { buildUsageOverview, filterUsageRowsBySource } = await loadModule();
  const cursorRows = filterUsageRowsBySource(ROWS, "cursor");
  const overview = buildUsageOverview(cursorRows);

  assert.equal(overview.totalTokens, 120);
  assert.equal(overview.modelCount, 2);
  assert.deepEqual(Object.keys(cursorRows[0].models), ["cursor/claude"]);
  assert.deepEqual(Object.keys(cursorRows[2].models), []);
});

test("model usage aggregates matching model names across agents", async () => {
  const { buildModelUsage } = await loadModule();
  const usage = buildModelUsage(ROWS, { estimatedCostUsd: 60 });
  const gpt5 = usage.models.find((model) => model.model === "gpt-5");

  assert.equal(usage.totalTokens, 600);
  assert.equal(gpt5?.tokens, 380);
  assert.equal(gpt5?.dominantSource, "codex");
  assert.equal(Number(gpt5?.percent.toFixed(2)), 63.33);
  assert.equal(Number(gpt5?.estimatedCostUsd.toFixed(2)), 38);
});

test("context breakdown follows time and agent filters and scales to activity totals", async () => {
  const { buildContextBreakdowns, filterUsageRowsBySource } = await loadModule();
  const rows = [
    {
      day: "2026-07-01",
      value: 1000,
      sources: { codex: 800, cursor: 200 },
      models: {},
      context_breakdown: {
        codex: {
          categories: { messages: 300, tool_calls: 500, reasoning: 200 },
          total_tokens: 1000,
          input_tokens: 800,
          cached_input_tokens: 600,
          tool_call_count: 4,
          event_count: 2,
          method: "turn_delta",
        },
      },
    },
  ];

  const [codex] = buildContextBreakdowns(rows);
  assert.equal(codex.totalTokens, 800);
  assert.equal(codex.categories.find((item) => item.key === "tool_calls")?.tokens, 400);
  assert.equal(codex.cacheHitRate, 75);
  assert.equal(codex.toolCallCount, 4);

  const cursorRows = filterUsageRowsBySource(rows, "cursor");
  assert.deepEqual(buildContextBreakdowns(cursorRows), []);
});

test("vibe cloud records follow the usage period and agent filter", async () => {
  const { filterUsageRows } = await loadModule();
  const { filterWordCloudRecords } = await loadCloudModule();
  const records = [
    { source: "cursor", timestamp: "2026-06-29T10:00:00Z", concepts: [] },
    { source: "claude", timestamp: "2026-07-01T10:00:00Z", concepts: [] },
    { source: "codex", timestamp: "2026-07-05T10:00:00Z", concepts: [] },
    { source: "codex", timestamp: null, concepts: [] },
  ];
  const monthRows = filterUsageRows(ROWS, "month");

  assert.deepEqual(
    filterWordCloudRecords(records, monthRows, "month", {}, "all").map((row) => row.source),
    ["claude", "codex"],
  );
  assert.deepEqual(
    filterWordCloudRecords(records, monthRows, "month", {}, "codex").map((row) => row.source),
    ["codex"],
  );
  assert.equal(filterWordCloudRecords(records, ROWS, "total").length, 4);
});

test("vibe cloud combines coding categories with recurring prompt concepts", async () => {
  const { buildVibeCloudWords } = await loadCloudModule();
  const records = [
    {
      concepts: [
        { key: "concept:motion", kind: "term", vibe: true, variants: { 动效: 1, animation: 1 } },
        { key: "category:ui_design", kind: "category", vibe: true, variants: { ui_design: 1 } },
      ],
    },
    {
      concepts: [
        { key: "concept:motion", kind: "term", vibe: true, variants: { 动效: 1 } },
        { key: "category:ui_design", kind: "category", vibe: true, variants: { ui_design: 1 } },
      ],
    },
  ];
  const words = buildVibeCloudWords(records, { locale: "zh" });

  const uiDesign = words.find((row) => row.key === "category:ui_design");
  assert.equal(uiDesign?.term, "UI 设计");
  assert.equal(uiDesign?.prompt_count, 2);
  assert.ok(uiDesign?.weight > 2);
  assert.equal(words.find((row) => row.key === "concept:motion")?.term, "动效");
});

test("vibe cloud promotes recurring project-domain entities", async () => {
  const { buildVibeCloudWords } = await loadCloudModule();
  const months = ["2025-10", "2025-11", "2025-12", "2026-01"];
  const records = months.flatMap((month, monthIndex) => (
    Array.from({ length: 3 }, (_, index) => ({
      timestamp: `${month}-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
      concepts: [
        {
          key: "term:generalword",
          kind: "term",
          vibe: false,
          acronym: false,
          variants: { generalword: 1 },
        },
        ...(monthIndex === 1 ? [{
          key: "term:前庭",
          kind: "term",
          vibe: false,
          acronym: false,
          variants: { 前庭: 1 },
        }] : []),
      ],
    }))
  ));
  records.slice(0, 3).forEach((record) => {
    record.concepts.push({
      key: "term:hit",
      kind: "term",
      vibe: false,
      acronym: true,
      variants: { HIT: 1 },
    });
  });

  const words = buildVibeCloudWords(records, { locale: "zh", limit: 20 });

  assert.ok(words.some((row) => row.term === "前庭"));
  assert.ok(words.some((row) => row.term === "HIT"));
  assert.ok(!words.some((row) => row.term === "generalword"));

  const domainWeights = Object.fromEntries(
    words.filter((row) => row.kind === "domain").map((row) => [row.key, row.weight]),
  );
  const narrowRangeWords = buildVibeCloudWords([
    {
      timestamp: "2025-11-01T10:00:00Z",
      concepts: [{
        key: "term:前庭",
        kind: "term",
        vibe: false,
        acronym: false,
        variants: { 前庭: 1 },
      }],
    },
  ], { locale: "zh", domainWeights });

  assert.ok(narrowRangeWords.some((row) => row.term === "前庭"));
});
