const test = require("node:test");
const assert = require("node:assert/strict");
const {
  compactNumber,
  summarizeActivity,
  buildActivitySignals,
} = require("../src/lib/activity-metrics");

test("compactNumber formats token totals", () => {
  assert.equal(compactNumber(842), "842");
  assert.equal(compactNumber(12500), "13K");
  assert.equal(compactNumber(631724922), "631.7M");
});

test("summarizeActivity computes streak and peak from daily rows", () => {
  const stats = summarizeActivity({
    metric: "tokens",
    total_tokens: 5000,
    daily_rows: [
      { day: "2026-06-01", value: 100, sources: { cursor: 100 } },
      { day: "2026-06-02", value: 400, sources: { cursor: 200, workbuddy: 200 } },
      { day: "2026-06-04", value: 50, sources: { cursor: 50 } },
    ],
  });
  assert.equal(stats.totalValue, 550);
  assert.equal(stats.activeDays, 3);
  assert.equal(stats.maxStreak, 2);
  assert.equal(stats.peakDay.day, "2026-06-02");
  assert.equal(stats.peakDay.value, 400);
  assert.equal(stats.topProvider, "cursor");
});

test("buildActivitySignals prefers token KPIs over useful prompts", () => {
  const signals = buildActivitySignals({
    activity: {
      metric: "tokens",
      total_tokens: 631724922,
      active_day_count: 112,
      daily_rows: [
        { day: "2026-06-01", value: 100, sources: { cursor: 100 } },
        { day: "2026-06-02", value: 200, sources: { cursor: 200 } },
      ],
    },
    summary: { source_count: 3 },
    categories: { implementation: { count: 10 } },
  });
  assert.equal(signals[0].label, "Total tokens");
  assert.ok(!signals.some((s) => s.label === "Useful prompts"));
  assert.equal(signals[1].label, "Active days");
  assert.equal(signals[2].label, "Top provider");
  assert.equal(signals[2].value, "CURSOR");
});

test("buildActivitySignals falls back without inventing token totals", () => {
  const signals = buildActivitySignals({
    activity: {
      metric: "prompts",
      total_tokens: 0,
      daily_rows: [{ day: "2026-06-01", value: 3, sources: { cursor: 3 } }],
    },
    summary: { source_count: 2 },
    categories: { debugging: { count: 4 } },
  });
  assert.equal(signals[0].label, "Active days");
  assert.equal(signals[1].label, "Sources");
  assert.equal(signals[1].value, "2");
  assert.equal(signals[2].value, "debugging");
});
