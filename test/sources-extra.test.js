const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const { dayBounds } = require("../src/lib/dates");
const { DEFAULT_SOURCES, normalizeSources } = require("../src/sources");
const { inspectCline } = require("../src/sources/cline");
const { inspectRoo } = require("../src/sources/roo");
const { inspectContinue, extractContinueUserText } = require("../src/sources/continue");
const { inspectGemini, extractGeminiUserText } = require("../src/sources/gemini");
const { inspectAider, parseAiderHistory } = require("../src/sources/aider");
const { inspectWindsurf } = require("../src/sources/windsurf");
const { inspectCopilot } = require("../src/sources/copilot");
const { inspectAmazonQ, extractAmazonQUserText } = require("../src/sources/amazonq");
const { inspectAntigravity, extractAntigravityUserText } = require("../src/sources/antigravity");
const { inspectSources } = require("../src/inspect");

const fixtures = path.join(__dirname, "fixtures");
const range = dayBounds("2026-06-07", "2026-06-07");

test("normalizeSources defaults to mainstream agent list", () => {
  assert.ok(DEFAULT_SOURCES.includes("cline"));
  assert.ok(DEFAULT_SOURCES.includes("gemini"));
  assert.deepEqual(normalizeSources(undefined).slice(0, 3), ["codex", "claude", "cursor"]);
});

test("inspectCline reads ui_messages fixture", async () => {
  const report = await inspectCline({
    root: path.join(fixtures, "cline", "tasks"),
    range,
  });
  assert.equal(report.source, "cline");
  assert.equal(report.prompt_count, 2);
  assert.ok(report.prompts.some((p) => p.text.includes("flaky test")));
});

test("inspectRoo reads ui_messages fixture", async () => {
  const report = await inspectRoo({
    root: path.join(fixtures, "roo", "tasks"),
    range,
  });
  assert.equal(report.source, "roo");
  assert.equal(report.prompt_count, 1);
  assert.match(report.prompts[0].text, /auth module/);
});

test("inspectContinue reads session JSON", async () => {
  assert.equal(
    extractContinueUserText({ message: { role: "user", content: "hello continue" } }),
    "hello continue",
  );
  const report = await inspectContinue({
    root: path.join(fixtures, "continue", "sessions"),
    range,
  });
  assert.equal(report.source, "continue");
  assert.equal(report.prompt_count, 1);
  assert.match(report.prompts[0].text, /reducer/);
});

test("inspectGemini reads chat JSON", async () => {
  assert.equal(extractGeminiUserText({ type: "user", content: "hi gemini" }), "hi gemini");
  assert.equal(extractGeminiUserText({ type: "gemini", content: "nope" }), "");
  const report = await inspectGemini({
    root: path.join(fixtures, "gemini", "tmp"),
    range,
  });
  assert.equal(report.source, "gemini");
  assert.equal(report.prompt_count, 1);
  assert.match(report.prompts[0].text, /migration/);
});

test("inspectAider parses chat history markdown", async () => {
  const entries = parseAiderHistory(`# aider: user (2026-06-07 10:15:00)\nShip it\n`);
  assert.equal(entries.length, 1);
  assert.match(entries[0].text, /Ship it/);
  const report = await inspectAider({
    root: path.join(fixtures, "aider", "project"),
    range,
  });
  assert.equal(report.source, "aider");
  assert.equal(report.prompt_count, 1);
  assert.match(report.prompts[0].text, /webhook/);
});

test("inspectWindsurf reads plaintext exports and ignores encrypted pb", async () => {
  const report = await inspectWindsurf({
    root: path.join(fixtures, "windsurf", "exports"),
    range,
  });
  assert.equal(report.source, "windsurf");
  assert.equal(report.prompt_count, 1);
  assert.match(report.prompts[0].text, /CSS grid/);
  assert.ok(report.files_scanned >= 2);
});

test("inspectCopilot reads chat session JSON", async () => {
  const report = await inspectCopilot({
    root: path.join(fixtures, "copilot", "sessions"),
    range,
  });
  assert.equal(report.source, "copilot");
  assert.equal(report.prompt_count, 1);
  assert.match(report.prompts[0].text, /parseArgs/);
});

test("inspectAmazonQ reads LokiJS chat-history JSON", async () => {
  assert.equal(extractAmazonQUserText({ type: "prompt", body: "hi q" }), "hi q");
  assert.equal(extractAmazonQUserText({ type: "answer", body: "nope" }), "");
  const report = await inspectAmazonQ({
    root: path.join(fixtures, "amazonq", "history"),
    range,
  });
  assert.equal(report.source, "amazonq");
  assert.equal(report.prompt_count, 2);
  assert.ok(report.prompts.some((p) => /exponential backoff/i.test(p.text)));
});

test("inspectAntigravity reads JSON exports and skips protobuf", async () => {
  assert.equal(
    extractAntigravityUserText({ role: "user", content: "hello anti" }),
    "hello anti",
  );
  const report = await inspectAntigravity({
    root: path.join(fixtures, "antigravity", "conversations"),
    range,
  });
  assert.equal(report.source, "antigravity");
  assert.equal(report.prompt_count, 1);
  assert.match(report.prompts[0].text, /antigravity adapter/);
  assert.ok(report.files_scanned >= 2);
});

test("new sources return empty counts for missing dirs without throwing", async () => {
  const missing = path.join(fixtures, "empty-agents", "definitely-missing");
  const reports = await Promise.all([
    inspectCline({ root: missing, range }),
    inspectRoo({ root: missing, range }),
    inspectContinue({ root: missing, range }),
    inspectGemini({ root: missing, range }),
    inspectAider({ root: missing, range }),
    inspectWindsurf({ root: missing, range }),
    inspectCopilot({ root: missing, range }),
    inspectAmazonQ({ root: missing, range }),
    inspectAntigravity({ root: missing, range }),
  ]);
  for (const report of reports) {
    assert.equal(report.prompt_count, 0);
    assert.ok(report.files_scanned === 0 || Array.isArray(report.prompts));
    assert.deepEqual(report.prompts, []);
  }
});

test("inspectSources merges mainstream agent fixtures", async () => {
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: [
      "cline",
      "roo",
      "continue",
      "gemini",
      "aider",
      "windsurf",
      "copilot",
      "amazonq",
      "antigravity",
    ],
    roots: {
      cline: path.join(fixtures, "cline", "tasks"),
      roo: path.join(fixtures, "roo", "tasks"),
      continue: path.join(fixtures, "continue", "sessions"),
      gemini: path.join(fixtures, "gemini", "tmp"),
      aider: path.join(fixtures, "aider", "project"),
      windsurf: path.join(fixtures, "windsurf", "exports"),
      copilot: path.join(fixtures, "copilot", "sessions"),
      amazonq: path.join(fixtures, "amazonq", "history"),
      antigravity: path.join(fixtures, "antigravity", "conversations"),
      home: fs.mkdtempSync(path.join(os.tmpdir(), "vibe-home-")),
      tokenTrackerQueue: path.join(fixtures, "missing-token-tracker.jsonl"),
    },
  });

  assert.equal(report.summary.source_count, 9);
  assert.equal(report.summary.prompt_count, 11);
  assert.ok(report.sources.cline.prompt_count >= 1);
  assert.ok(report.sources.copilot.prompt_count >= 1);
  assert.ok(report.sources.amazonq.prompt_count >= 1);
  assert.ok(report.sources.antigravity.prompt_count >= 1);
  assert.ok(report.word_frequencies.length >= 1);
});
