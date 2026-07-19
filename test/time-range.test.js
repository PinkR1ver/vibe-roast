const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("buildTimeRange returns concrete day week month and custom ranges", async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "dashboard", "src", "lib", "time-range.js")));
  const now = new Date("2026-06-17T12:00:00.000Z");

  assert.deepEqual(mod.buildTimeRange("day", {}, now), {
    from: "2026-06-17",
    to: "2026-06-17",
    label: "2026-06-17",
  });
  assert.deepEqual(mod.buildTimeRange("week", {}, now), {
    from: "2026-06-11",
    to: "2026-06-17",
    label: "2026-06-11 - 2026-06-17",
  });
  assert.deepEqual(mod.buildTimeRange("month", {}, now), {
    from: "2026-05-19",
    to: "2026-06-17",
    label: "2026-05-19 - 2026-06-17",
  });
  assert.deepEqual(mod.buildTimeRange("total", {}, now), {
    label: "All time",
  });
  assert.deepEqual(mod.buildTimeRange("custom", { from: "2026-06-01", to: "2026-06-10" }, now), {
    from: "2026-06-01",
    to: "2026-06-10",
    label: "2026-06-01 - 2026-06-10",
  });
});
