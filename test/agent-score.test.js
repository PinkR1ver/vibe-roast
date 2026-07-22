const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreFromCategories, classifyType, buildVibeProfile, DIMENSIONS, PERSONALITIES } = require("../src/lib/agent-score");

test("scoreFromCategories produces six bounded behavior dimensions", () => {
  const scores = scoreFromCategories({ implementation: { count: 40 }, packaging: { count: 10 }, debugging: { count: 5 }, planning: { count: 8 }, workflow: { count: 12 }, reference: { count: 4 } }, {}, { useful_ratio: 0.9, long_prompt_ratio: 0.15 });
  assert.deepEqual(Object.keys(scores).sort(), DIMENSIONS.map((dim) => dim.key).sort());
  for (const value of Object.values(scores)) assert.ok(value >= 0 && value <= 100);
});

test("four dichotomies resolve a stable four-letter code", () => {
  const result = classifyType({ implementation: { count: 30 }, packaging: { count: 8 }, testing: { count: 45 }, debugging: { count: 25 }, workflow: { count: 18 }, planning: { count: 3 } }, { useful_ratio: 0.96, long_prompt_ratio: 0.05 });
  assert.equal(result.code, "MOVF");
  assert.equal(result.axes.length, 4);
  assert.ok(PERSONALITIES[result.code]);
  for (const axis of result.axes) assert.equal(axis.left.percent + axis.right.percent, 100);
});

test("buildVibeProfile returns type evidence, confidence, figure, and roast", () => {
  const profile = buildVibeProfile({
    categories: { debugging: { count: 30 }, testing: { count: 15 }, implementation: { count: 8 }, planning: { count: 4 }, reference: { count: 2 } },
    summary: { source_count: 2, prompt_count: 44 },
    promptAnalysis: { useful_prompt_count: 42, useful_ratio: 0.95, long_prompt_ratio: 0.1 },
    activity: { metric: "tokens", total_tokens: 12500, daily_rows: [{ day: "2026-06-01", value: 5000 }, { day: "2026-06-02", value: 7500 }] },
  });
  assert.equal(profile.status, "ready");
  assert.match(profile.type_code, /^[MA][OP][VS][FX]$/);
  assert.equal(profile.type_axes.length, 4);
  assert.ok(profile.confidence > 0 && profile.confidence <= 100);
  assert.match(profile.figure, /\/assests\/characters-vibe-types\/.+-figure\.png$/);
  assert.equal(profile.dimensions.length, 6);
  assert.ok(profile.roast.includes("🔥"));
  assert.ok(profile.roastZh.length > 80);
  assert.equal(profile.signals[0].label, "Total tokens");
});

test("empty input stays zero and is marked insufficient", () => {
  const profile = buildVibeProfile({ categories: {}, promptAnalysis: { useful_prompt_count: 0 } });
  assert.deepEqual(Object.values(profile.scores), [0, 0, 0, 0, 0, 0]);
  assert.equal(profile.status, "insufficient_data");
  assert.equal(profile.confidence, 0);
});
