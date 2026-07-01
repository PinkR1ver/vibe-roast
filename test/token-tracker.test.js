const test = require("node:test");
const assert = require("node:assert");
const { inspectTokenTracker, isLegacyInclusiveCodexRow, normalizeQueueRow } = require("../src/sources/token-tracker");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const fixtures = path.join(__dirname, "fixtures");

test("isLegacyInclusiveCodexRow detects legacy Codex rows where input includes cache reads", () => {
  // Canonical legacy pattern: total_tokens === input_tokens + output_tokens
  // with cached_input_tokens > 0. This is the case that needs correction.
  const legacy = {
    source: "codex",
    model: "gpt-5",
    hour_start: "2026-06-07T10:00:00.000Z",
    input_tokens: 1250,
    cached_input_tokens: 50,
    cache_creation_input_tokens: 0,
    output_tokens: 250,
    reasoning_output_tokens: 30,
    total_tokens: 1500,
    conversation_count: 3,
  };
  assert.equal(isLegacyInclusiveCodexRow(legacy), true);
});

test("isLegacyInclusiveCodexRow returns false for corrected Codex rows", () => {
  // After correction, total_tokens !== input_tokens + output_tokens
  // because input_tokens no longer includes cached_input_tokens
  const corrected = {
    source: "codex",
    model: "gpt-5",
    hour_start: "2026-06-07T10:00:00.000Z",
    input_tokens: 1200,
    cached_input_tokens: 50,
    cache_creation_input_tokens: 0,
    output_tokens: 250,
    reasoning_output_tokens: 30,
    total_tokens: 1500,
    conversation_count: 3,
  };
  assert.equal(isLegacyInclusiveCodexRow(corrected), false);
});

test("isLegacyInclusiveCodexRow returns false when cached_input_tokens is 0", () => {
  const row = {
    source: "codex",
    input_tokens: 1000,
    cached_input_tokens: 0,
    output_tokens: 200,
    total_tokens: 1200,
  };
  assert.equal(isLegacyInclusiveCodexRow(row), false);
});

test("isLegacyInclusiveCodexRow returns false for non-codex sources", () => {
  const row = {
    source: "claude",
    input_tokens: 1250,
    cached_input_tokens: 50,
    output_tokens: 250,
    total_tokens: 1500,
  };
  assert.equal(isLegacyInclusiveCodexRow(row), false);
});

test("isLegacyInclusiveCodexRow handles every-code alias", () => {
  const legacy = {
    source: "every-code",
    input_tokens: 1000,
    cached_input_tokens: 100,
    output_tokens: 400,
    total_tokens: 1400,
  };
  assert.equal(isLegacyInclusiveCodexRow(legacy), true);
});

test("normalizeQueueRow fixes legacy Codex input_tokens by subtracting cached_input_tokens", () => {
  const legacy = {
    source: "codex",
    model: "gpt-5",
    hour_start: "2026-06-07T10:00:00.000Z",
    input_tokens: 1250,
    cached_input_tokens: 50,
    cache_creation_input_tokens: 0,
    output_tokens: 250,
    reasoning_output_tokens: 30,
    total_tokens: 1500,
  };
  const result = normalizeQueueRow(legacy);
  assert.equal(result.input_tokens, 1200);
  assert.equal(result.cached_input_tokens, 50);
  assert.equal(result.total_tokens, 1500);
});

test("normalizeQueueRow does not modify non-legacy Codex rows", () => {
  const corrected = {
    source: "codex",
    model: "gpt-5",
    hour_start: "2026-06-07T10:00:00.000Z",
    input_tokens: 1200,
    cached_input_tokens: 50,
    cache_creation_input_tokens: 0,
    output_tokens: 250,
    reasoning_output_tokens: 30,
    total_tokens: 1500,
  };
  const result = normalizeQueueRow(corrected);
  assert.equal(result.input_tokens, 1200);
});

test("normalizeQueueRow fixes Cursor billable_total_tokens = 0", () => {
  const cursorRow = {
    source: "cursor",
    model: "claude-4",
    hour_start: "2026-06-07T11:00:00.000Z",
    input_tokens: 3000,
    output_tokens: 500,
    total_tokens: 3500,
    billable_total_tokens: 0,
  };
  const result = normalizeQueueRow(cursorRow);
  assert.equal(result.billable_total_tokens, 3500);
});

test("normalizeQueueRow does not change Cursor billable when already correct", () => {
  const cursorRow = {
    source: "cursor",
    model: "claude-4",
    hour_start: "2026-06-07T11:00:00.000Z",
    input_tokens: 3000,
    output_tokens: 500,
    total_tokens: 3500,
    billable_total_tokens: 3500,
  };
  const result = normalizeQueueRow(cursorRow);
  assert.equal(result.billable_total_tokens, 3500);
});

test("normalizeQueueRow does not modify billable for non-Cursor sources", () => {
  // Claude rows with billable=0 should stay 0 — only Cursor had the legacy bug.
  const claudeRow = {
    source: "claude",
    model: "sonnet",
    hour_start: "2026-06-08T09:00:00.000Z",
    input_tokens: 100,
    output_tokens: 0,
    total_tokens: 100,
    billable_total_tokens: 0,
  };
  const result = normalizeQueueRow(claudeRow);
  assert.equal(result.billable_total_tokens, 0);
});

test("normalizeQueueRow applies both Codex and Cursor fixes when both apply", () => {
  // Edge case: Cursor source but the row also looks like legacy Codex.
  // Only Cursor fix should apply since isLegacyInclusiveCodexRow checks source.
  const cursorRow = {
    source: "cursor",
    model: "claude-4",
    hour_start: "2026-06-07T11:00:00.000Z",
    input_tokens: 3000,
    cached_input_tokens: 500,
    output_tokens: 500,
    total_tokens: 3500,
    billable_total_tokens: 0,
  };
  const result = normalizeQueueRow(cursorRow);
  // Codex fix does NOT apply because source is "cursor"
  assert.equal(result.input_tokens, 3000);
  // Cursor fix applies
  assert.equal(result.billable_total_tokens, 3500);
});
