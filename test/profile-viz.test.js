const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

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
