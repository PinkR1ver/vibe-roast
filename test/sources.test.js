const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { inspectCodex, extractCodexPrompt, extractCodexTokens } = require("../src/sources/codex");
const { inspectClaude, extractClaudePrompt, extractClaudeTokens } = require("../src/sources/claude");
const { inspectCursor, resolveCursorDbPath } = require("../src/sources/cursor");
const { dayBounds } = require("../src/lib/dates");

const fixtures = path.join(__dirname, "fixtures");

test("extractCodexPrompt reads payload.message and nested msg.message", () => {
  assert.equal(
    extractCodexPrompt({
      payload: { type: "user_message", message: "实现登录页" },
    }),
    "实现登录页",
  );
  assert.equal(
    extractCodexPrompt({
      payload: { msg: { type: "user_message", message: "优化移动端" } },
    }),
    "优化移动端",
  );
  assert.equal(extractCodexPrompt({ payload: { type: "assistant" } }), "");
  assert.equal(
    extractCodexPrompt({
      payload: { type: "agent_message", message: "我会先检查 xerophyte 布局" },
    }),
    "",
  );
  assert.equal(
    extractCodexPrompt({
      payload: { type: "assistant", message: "xerophyte done" },
    }),
    "",
  );
});

test("extractCodexTokens normalizes total_token_usage", () => {
  const tokens = extractCodexTokens({
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15,
        },
      },
    },
  });
  assert.equal(tokens.total_tokens, 15);
  assert.equal(tokens.input_tokens, 10);
});

test("inspectCodex reads fixture session JSONL", async () => {
  const report = await inspectCodex({
    root: path.join(fixtures, "codex", "sessions"),
    range: dayBounds("2026-06-07", "2026-06-07"),
  });

  assert.equal(report.source, "codex");
  assert.equal(report.files_scanned, 1);
  assert.equal(report.prompt_count, 2);
  assert.equal(report.token_totals.total_tokens, 1800);
  assert.ok(report.prompts.every((p) => p.source === "codex"));
});

test("extractClaudePrompt only keeps user messages", () => {
  assert.equal(
    extractClaudePrompt({
      type: "user",
      message: { role: "user", content: [{ type: "text", text: "写测试" }] },
    }),
    "写测试",
  );
  assert.equal(
    extractClaudePrompt({
      type: "assistant",
      message: { role: "assistant", content: "我会先分析。" },
    }),
    "",
  );
  assert.equal(
    extractClaudePrompt({
      type: "user",
      message: {
        role: "user",
        content: [{ type: "tool_result", content: "xerophyte tool dump" }],
      },
    }),
    "",
  );
});

test("extractClaudeTokens maps cache_read_input_tokens", () => {
  const tokens = extractClaudeTokens({
    message: {
      usage: {
        input_tokens: 100,
        cache_read_input_tokens: 20,
        cache_creation_input_tokens: 5,
        output_tokens: 40,
      },
    },
  });
  assert.equal(tokens.cached_input_tokens, 20);
  assert.equal(tokens.total_tokens, 165);
});

test("inspectClaude reads fixture project JSONL", async () => {
  const report = await inspectClaude({
    root: path.join(fixtures, "claude", "projects"),
    range: dayBounds("2026-06-07", "2026-06-07"),
  });

  assert.equal(report.source, "claude");
  assert.equal(report.files_scanned, 1);
  assert.equal(report.prompt_count, 1);
  assert.equal(report.token_totals.total_tokens, 1500);
  assert.match(report.prompts[0].text, /根因/);
});

test("resolveCursorDbPath follows platform defaults", () => {
  assert.match(
    resolveCursorDbPath({ home: "/Users/demo", platform: "darwin" }),
    /Library\/Application Support\/Cursor\/User\/globalStorage\/state\.vscdb$/,
  );
  assert.match(
    resolveCursorDbPath({ home: "/home/demo", platform: "linux", env: {} }),
    /\.config\/Cursor\/User\/globalStorage\/state\.vscdb$/,
  );
  assert.match(
    resolveCursorDbPath({
      home: "C:\\Users\\demo",
      platform: "win32",
      env: { APPDATA: "C:\\Users\\demo\\AppData\\Roaming" },
    }),
    /Cursor[\\/]User[\\/]globalStorage[\\/]state\.vscdb$/,
  );
});

test("inspectCursor reads fixture state.vscdb prompts and tokens", async () => {
  const report = await inspectCursor({
    dbPath: path.join(fixtures, "cursor", "state.vscdb"),
    range: dayBounds("2026-06-07", "2026-06-07"),
  });

  assert.equal(report.source, "cursor");
  assert.equal(report.files_scanned, 1);
  assert.equal(report.prompt_count, 2);
  assert.equal(report.token_totals.total_tokens, 300);
  assert.ok(report.prompts.some((p) => p.text.includes("Cursor")));
  assert.ok(report.prompts.some((p) => p.text.includes("hooks")));
  assert.deepEqual(report.notes, []);
});
