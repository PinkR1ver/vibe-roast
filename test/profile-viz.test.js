const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("buildDnaDimensions maps prompt categories into six normalized dimensions", async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "dashboard", "src", "lib", "profile-viz.js")));

  const dimensions = mod.buildDnaDimensions({
    implementation: { count: 12 },
    debugging: { count: 6 },
    planning: { count: 3 },
    ui_design: { count: 9 },
    testing: { count: 0 },
    workflow: { count: 15 },
  });

  assert.deepEqual(dimensions.map((item) => item.key), [
    "build",
    "debug",
    "plan",
    "design",
    "quality",
    "workflow",
  ]);
  assert.equal(dimensions.find((item) => item.key === "workflow").value, 15);
  assert.equal(dimensions.find((item) => item.key === "quality").score, 0);
  assert.equal(dimensions.find((item) => item.key === "workflow").score, 1);
  assert.equal(dimensions.find((item) => item.key === "plan").score, 0.2);
});

test("buildWorldMetrics extracts compact environment metrics", async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "dashboard", "src", "lib", "profile-viz.js")));

  const metrics = mod.buildWorldMetrics({
    skills: { count: 8 },
    mcp_servers: { names: ["github", "browser"] },
    plugins: { count: 3 },
    config: { model: "gpt-5" },
  });

  assert.deepEqual(metrics, [
    { key: "skills", value: "8" },
    { key: "mcp", value: "2" },
    { key: "plugins", value: "3" },
    { key: "model", value: "gpt-5" },
  ]);
});

test("buildModelBreakdown aggregates TokenTracker model usage", async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "dashboard", "src", "lib", "profile-viz.js")));

  const breakdown = mod.buildModelBreakdown({
    daily_rows: [
      { models: { "codex/gpt-5": 1200, "cursor/claude-4": 800 } },
      { models: { "codex/gpt-5": 300, "claude/sonnet": 500 } },
    ],
  });

  assert.equal(breakdown.totalTokens, 2800);
  assert.equal(breakdown.modelCount, 3);
  assert.deepEqual(breakdown.models.map((item) => item.key), [
    "codex/gpt-5",
    "cursor/claude-4",
    "claude/sonnet",
  ]);
  assert.deepEqual(breakdown.models[0], {
    key: "codex/gpt-5",
    source: "codex",
    model: "gpt-5",
    tokens: 1500,
    percent: 53.6,
  });
  assert.deepEqual(breakdown.sources.map((item) => item.key), ["codex", "cursor", "claude"]);
  assert.equal(breakdown.sources[0].percent, 53.6);
  assert.equal(breakdown.sources[0].modelCount, 1);
  assert.deepEqual(breakdown.sources[0].models.map((item) => item.key), ["codex/gpt-5"]);
  assert.deepEqual(breakdown.sources[1].models.map((item) => item.key), ["cursor/claude-4"]);
});
