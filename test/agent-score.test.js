const test = require("node:test");
const assert = require("node:assert/strict");
const {
  scoreFromCategories,
  totalScore,
  tierFor,
  dominantArchetype,
  buildVibeProfile,
  DIMENSIONS,
} = require("../src/lib/agent-score");

test("scoreFromCategories produces six axes within max bounds", () => {
  const scores = scoreFromCategories(
    {
      implementation: { count: 40 },
      packaging: { count: 10 },
      debugging: { count: 5 },
      planning: { count: 8 },
      workflow: { count: 12 },
      reference: { count: 4 },
    },
    {
      skills: { count: 8 },
      mcp_servers: { count: 3, names: ["a", "b", "c"] },
      plugins: { count: 2 },
    },
  );

  assert.deepEqual(Object.keys(scores).sort(), [
    "build",
    "context",
    "debug",
    "orchestration",
    "promptCraft",
    "ship",
  ].sort());
  for (const dim of DIMENSIONS) {
    assert.ok(scores[dim.key] >= 0 && scores[dim.key] <= dim.max);
  }
  const total = totalScore(scores);
  assert.ok(total > 0 && total <= 100);
  assert.equal(tierFor(total).id, tierFor(total).id);
});

test("dominantArchetype prefers builder when build+ship are high", () => {
  const id = dominantArchetype({
    orchestration: 8,
    promptCraft: 9,
    build: 15,
    debug: 4,
    context: 10,
    ship: 12,
  });
  assert.equal(id, "01-builder");
});

test("buildVibeProfile returns figure paths and roast", () => {
  const profile = buildVibeProfile({
    categories: {
      debugging: { count: 30 },
      implementation: { count: 8 },
      planning: { count: 4 },
      reference: { count: 2 },
    },
    env: { skills: { count: 2 }, mcp_servers: { count: 0 }, plugins: { count: 0 } },
    summary: { source_count: 2, prompt_count: 44 },
    promptAnalysis: { useful_prompt_count: 42 },
    activity: {
      metric: "tokens",
      total_tokens: 12500,
      daily_rows: [
        { day: "2026-06-01", value: 5000, sources: { cursor: 5000 } },
        { day: "2026-06-02", value: 7500, sources: { cursor: 7500 } },
      ],
    },
  });

  assert.ok(profile.total >= 0);
  assert.ok(profile.tier.id);
  assert.match(profile.figure, /\/assests\/characters\/.+-figure\.png$/);
  assert.match(profile.badge, /\/assests\/badges\/.+-badge\.svg$/);
  assert.equal(profile.dimensions.length, 6);
  assert.ok(profile.roast.includes("🔥"));
  assert.ok(profile.roastZh.length > 10);
  assert.ok(profile.roast.length > 200, "roast should be a richer multi-paragraph blurb");
  assert.ok(profile.roastZh.length > 80, "zh roast should be substantially longer");
  assert.ok(profile.roast.includes("\n\n") || profile.roast.split(".").length >= 4);
  assert.equal(profile.signals[0].label, "Total tokens");
  assert.ok(!profile.signals.some((s) => s.label === "Useful prompts"));
});

test("scoreFromCategories treats zero counts as zero not NaN", () => {
  const scores = scoreFromCategories(
    {
      debugging: { count: 1 },
      ui_design: { count: 2 },
      reference: { count: 0 },
      planning: { count: 0 },
    },
    { skills: { count: 3 }, mcp_servers: { count: 2 }, plugins: { count: 1 } },
  );
  for (const value of Object.values(scores)) {
    assert.equal(Number.isFinite(value), true);
  }
  assert.ok(totalScore(scores) > 0);
});
