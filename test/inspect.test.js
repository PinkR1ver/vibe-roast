const test = require("node:test");
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { inspectSources } = require("../src/inspect");
const { analyzePrompts } = require("../src/extract/prompt-analysis");
const { tokenize, wordFrequencies } = require("../src/extract/phrase-stats");
const { inspectEnvironment } = require("../src/extract/environment");
const { dayBounds } = require("../src/lib/dates");
const { extractCodexPrompt } = require("../src/sources/codex");
const { extractClaudePrompt } = require("../src/sources/claude");
const { extractCursorEntriesFromRows, inspectCursor } = require("../src/sources/cursor");
const { inspectTokenTracker } = require("../src/sources/token-tracker");

const fixtures = path.join(__dirname, "fixtures");

test("inspectSources extracts Codex and Claude prompts inside date range", async () => {
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: ["codex", "claude"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      claude: path.join(fixtures, "claude", "projects"),
    },
  });

  assert.equal(report.summary.prompt_count, 3);
  assert.equal(report.sources.codex.prompt_count, 2);
  assert.equal(report.sources.claude.prompt_count, 1);
  assert.equal(report.sources.codex.token_totals.total_tokens, 1800);
  assert.ok(report.prompts.some((p) => p.text.includes("登录页面")));
  assert.ok(report.prompts.every((p) => p.timestamp.startsWith("2026-06-07")));
});

test("inspectSources includes Codex, Claude, and Cursor when fixtures are present", async () => {
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: ["codex", "claude", "cursor"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      claude: path.join(fixtures, "claude", "projects"),
      cursor: path.join(fixtures, "cursor", "state.vscdb"),
    },
  });

  assert.equal(report.summary.source_count, 3);
  assert.equal(report.summary.prompt_count, 5);
  assert.equal(report.sources.codex.prompt_count, 2);
  assert.equal(report.sources.claude.prompt_count, 1);
  assert.equal(report.sources.cursor.prompt_count, 2);
  assert.equal(report.summary.token_totals.total_tokens, 3600);
  assert.deepEqual(
    [...new Set(report.prompts.map((prompt) => prompt.source))].sort(),
    ["claude", "codex", "cursor"],
  );
  assert.ok(report.prompts.every((p) => p.timestamp.startsWith("2026-06-07")));
});

test("inspectSources builds vibe_profile from multi-source prompts", async () => {
  const home = path.join(fixtures, "home");
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: ["codex", "claude", "cursor"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      claude: path.join(fixtures, "claude", "projects"),
      cursor: path.join(fixtures, "cursor", "state.vscdb"),
      home,
      codexHome: path.join(home, ".codex"),
      tokenTrackerQueue: path.join(fixtures, "missing-token-tracker.jsonl"),
    },
  });

  const vibe = report.vibe_profile;
  assert.ok(vibe);
  assert.ok(Number.isFinite(vibe.total));
  assert.ok(vibe.tier?.id);
  assert.ok(vibe.archetype?.id);
  assert.match(vibe.figure, /^\/assests\/characters\/.+-figure\.png$/);
  assert.match(vibe.badge, /^\/assests\/badges\/.+-badge\.svg$/);
  assert.equal(vibe.dimensions.length, 6);
  assert.ok(!vibe.signals.some((signal) => signal.label === "Useful prompts"));
  assert.equal(
    vibe.signals.find((signal) => signal.label === "Sources")?.value,
    "3",
  );
  assert.ok(report.profile_signals.prompt_analysis.useful_prompt_count >= 4);
});

test("Cursor row parser extracts prompt-like values from SQLite key/value rows", () => {
  const entries = extractCursorEntriesFromRows([
    {
      key: "bubbleId:abc",
      value: JSON.stringify({
        text: "帮我重构这个 React 组件，顺便解释为什么",
        timestamp: "2026-06-07T12:00:00.000Z",
        usage: { inputTokens: 321, outputTokens: 123 },
      }),
    },
    { key: "unrelated", value: "not a prompt" },
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].source, "cursor");
  assert.equal(entries[0].text, "帮我重构这个 React 组件，顺便解释为什么");
  assert.equal(entries[0].tokens.total_tokens, 444);
});

test("Cursor row parser treats cursorDiskKV type 1 bubbles as user prompts", () => {
  const entries = extractCursorEntriesFromRows([
    {
      key: "bubbleId:composer:prompt",
      value: JSON.stringify({
        type: 1,
        text: "给这个项目补一个最小 CLI 入口",
      }),
    },
    {
      key: "bubbleId:composer:assistant",
      value: JSON.stringify({
        type: 2,
        text: "我会先检查项目结构。",
      }),
    },
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].text, "给这个项目补一个最小 CLI 入口");
});

test("Codex prompt extractor ignores assistant messages", () => {
  assert.equal(extractCodexPrompt({
    payload: {
      type: "assistant_message",
      message: "我会先检查项目结构。",
    },
  }), "");
  assert.equal(extractCodexPrompt({
    payload: {
      type: "user_message",
      message: "帮我检查项目结构",
    },
  }), "帮我检查项目结构");
});

test("Claude prompt extractor ignores tool result content", () => {
  assert.equal(extractClaudePrompt({
    type: "user",
    message: {
      role: "user",
      content: [
        { type: "tool_result", content: "Fast-forward 13 files changed create mode 100644" },
        { type: "text", text: "总结一下这次改动" },
      ],
    },
  }), "总结一下这次改动");
});

test("Cursor date range omits prompt rows without timestamps", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-cursor-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const dbPath = path.join(dir, "state.vscdb");
  const sql = `
    CREATE TABLE ItemTable (key TEXT, value TEXT);
    INSERT INTO ItemTable VALUES (
      'bubbleId:undated',
      '{"text":"长期未标记 prompt"}'
    );
    INSERT INTO ItemTable VALUES (
      'bubbleId:dated',
      '{"text":"今天要处理 range filter","timestamp":"2026-06-07T12:00:00.000Z"}'
    );
  `;
  cp.execFileSync("sqlite3", [dbPath], { input: sql });

  const report = await inspectCursor({
    dbPath,
    range: dayBounds("2026-06-07", "2026-06-07"),
  });

  assert.equal(report.prompt_count, 1);
  assert.equal(report.prompts[0].text, "今天要处理 range filter");
});

test("TokenTracker queue adapter aggregates hourly token buckets by day", async () => {
  const report = await inspectTokenTracker({
    queuePath: path.join(fixtures, "tokentracker", "queue.jsonl"),
    range: {
      from: "2026-06-07T00:00:00.000Z",
      to: "2026-06-08T23:59:59.999Z",
    },
  });

  assert.equal(report.files_scanned, 1);
  assert.equal(report.bucket_count, 3);
  assert.equal(report.active_day_count, 2);
  assert.equal(report.token_totals.total_tokens, 5800);
  assert.deepEqual(report.daily_rows.map((row) => row.day), ["2026-06-07", "2026-06-08"]);
  assert.equal(report.daily_rows[0].total_tokens, 5000);
  assert.equal(report.daily_rows[0].conversation_count, 4);
  assert.equal(report.daily_rows[0].models["codex/gpt-5"], 1500);
  assert.equal(report.daily_rows[0].models["cursor/claude-4"], 3500);
  assert.equal(report.daily_rows[1].billable_total_tokens, 750);
});

test("inspectSources exposes TokenTracker activity without adding synthetic prompts", async () => {
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-08",
    sources: ["codex"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      tokenTrackerQueue: path.join(fixtures, "tokentracker", "queue.jsonl"),
    },
  });

  assert.equal(report.activity.source, "token-tracker");
  assert.equal(report.activity.metric, "tokens");
  assert.equal(report.activity.daily_rows.length, 2);
  assert.equal(report.activity.total_tokens, 5800);
  assert.equal(report.summary.prompt_count, 2);
  assert.equal(report.sources["token-tracker"], undefined);
  assert.equal(report.vibe_profile.signals[0].label, "Total tokens");
  assert.ok(!report.vibe_profile.signals.some((s) => s.label === "Useful prompts"));
  assert.ok(report.activity.peak_day?.day);
  assert.ok(report.activity.longest_streak >= 1);
});

test("inspectSources filters TokenTracker activity by date range", async () => {
  const report = await inspectSources({
    from: "2026-06-08",
    to: "2026-06-08",
    sources: ["codex"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      tokenTrackerQueue: path.join(fixtures, "tokentracker", "queue.jsonl"),
    },
  });

  assert.deepEqual(report.activity.daily_rows.map((row) => row.day), ["2026-06-08"]);
  assert.equal(report.activity.total_tokens, 800);
  assert.equal(report.activity.daily_rows[0].models["claude/sonnet"], 750);
});

test("inspectSources builds prompt daily_rows when TokenTracker is absent", async () => {
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: ["codex", "claude"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      claude: path.join(fixtures, "claude", "projects"),
      tokenTrackerQueue: path.join(fixtures, "missing-tokentracker.jsonl"),
    },
  });

  assert.equal(report.activity.source, "prompts");
  assert.equal(report.activity.metric, "prompts");
  assert.ok(report.activity.daily_rows.length >= 1);
  assert.equal(report.activity.daily_rows[0].day, "2026-06-07");
  assert.ok(report.activity.daily_rows[0].value >= 1);
});

test("inspectSources computes useful high-frequency terms", async () => {
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: ["codex", "claude"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      claude: path.join(fixtures, "claude", "projects"),
    },
  });

  const terms = report.word_frequencies.map((row) => row.term);
  assert.ok(terms.includes("token"));
  assert.ok(terms.includes("测试"));
});

test("word cloud input excludes assistant and tool content", async () => {
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: ["codex", "claude"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      claude: path.join(fixtures, "claude", "projects"),
    },
  });

  const blob = report.prompts.map((p) => p.text).join("\n");
  assert.ok(!/xerophyte/i.test(blob), "assistant/tool xerophyte must not enter prompts");
  const terms = report.word_frequencies.map((row) => row.term);
  assert.ok(!terms.includes("xerophyte"));
  assert.ok(!terms.includes("xerophyte-followup"));
  assert.ok(report.prompts.every((p) => p.source === "codex" || p.source === "claude"));
  assert.ok(report.prompts.some((p) => /登录页面/.test(p.text)));
  assert.ok(report.prompts.some((p) => /根因/.test(p.text)));
});

test("Cursor row parser drops system notifications and assistant bubbles", () => {
  const entries = extractCursorEntriesFromRows([
    {
      key: "bubbleId:composer:prompt",
      value: JSON.stringify({
        type: 1,
        text: "帮我补一个 CLI 入口",
      }),
    },
    {
      key: "bubbleId:composer:assistant",
      value: JSON.stringify({
        type: 2,
        text: "我会先检查 xerophyte 结构。",
      }),
    },
    {
      key: "bubbleId:system",
      value: JSON.stringify({
        type: 1,
        text: "<system_notification> The following task has finished. xerophyte done",
      }),
    },
  ]);

  assert.equal(entries.length, 1);
  assert.match(entries[0].text, /CLI/);
  assert.ok(!entries.some((e) => /xerophyte/i.test(e.text)));
});

test("inspectSources computes word frequencies from all useful prompts", async () => {
  const prompts = Array.from({ length: 65 }, (_, i) => ({
    source: "codex",
    timestamp: `2026-06-07T00:${String(i).padStart(2, "0")}:00.000Z`,
    session_file: `s-${i}`,
    text: i < 60 ? "实现 alpha 功能" : "实现 omega omega omega 功能",
    tokens: {},
  }));

  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: [],
    roots: {
      tokenTrackerQueue: path.join(fixtures, "missing-token-queue.jsonl"),
    },
    injectedReports: {
      codex: {
        source: "codex",
        root: "injected",
        files_scanned: 1,
        prompt_count: prompts.length,
        token_totals: {},
        prompts,
        notes: [],
      },
    },
  });

  const omega = report.word_frequencies.find((row) => row.term === "omega");
  assert.equal(omega?.count, 15);
});

test("inspectSources prefers timestamped prompts for word frequencies", async () => {
  const report = await inspectSources({
    sources: [],
    roots: {
      tokenTrackerQueue: path.join(fixtures, "missing-token-queue.jsonl"),
    },
    injectedReports: {
      cursor: {
        source: "cursor",
        root: "injected",
        files_scanned: 1,
        prompt_count: 2,
        token_totals: {},
        prompts: [
          {
            source: "cursor",
            timestamp: null,
            session_file: "cursor",
            text: "legacyblob legacyblob legacyblob",
          },
          {
            source: "cursor",
            timestamp: "2026-06-07T12:00:00.000Z",
            session_file: "cursor",
            text: "电子发票 报销",
          },
        ],
        notes: [],
      },
    },
  });

  const terms = report.word_frequencies.map((row) => row.term);
  assert.ok(terms.includes("发票"));
  assert.ok(!terms.includes("legacyblob"));
});

test("tokenize extracts session from Claude Code style identifiers", () => {
  const terms = tokenize("Claude Code SessionEnd hook 里的 session_id 没抓住");

  assert.ok(terms.includes("session"));
  assert.ok(terms.includes("end"));
  assert.ok(terms.includes("hook"));
});

test("tokenize filters common UI state words from word cloud terms", () => {
  const terms = tokenize("selectedSource provider model key className dashboard 发票 统计");

  assert.ok(!terms.includes("selected"));
  assert.ok(!terms.includes("source"));
  assert.ok(!terms.includes("provider"));
  assert.ok(!terms.includes("model"));
  assert.ok(!terms.includes("key"));
  assert.ok(terms.includes("发票"));
  assert.ok(terms.includes("统计"));
});

test("wordFrequencies ignores pasted code lines inside useful prompts", () => {
  const words = wordFrequencies([
    {
      text: `帮我优化电子发票页面
const activeSource = resolveSelectedSource(selectedSource, sources);
<div className="flex items-center gap-2 text-oai-gray-500">`,
    },
  ]).map((row) => row.term);

  assert.ok(words.includes("电子"));
  assert.ok(words.includes("发票"));
  assert.ok(!words.includes("activesource"));
  assert.ok(!words.includes("resolve"));
  assert.ok(!words.includes("span"));
});

test("wordFrequencies keeps natural language before inline code", () => {
  const words = wordFrequencies([
    {
      text: "U-Net架构可以引入代码块说明 import torch from torch import nn class convBlock(nn.Module): self.layer = nn.Sequential()",
    },
    {
      text: "胶囊还是太大<div class=\"z-10\"><span fill=\"currentColor\">Klaviyo</span></div>",
    },
  ]).map((row) => row.term);

  assert.ok(words.includes("架构"));
  assert.ok(words.includes("代码"));
  assert.ok(words.includes("胶囊"));
  assert.ok(!words.includes("torch"));
  assert.ok(!words.includes("self"));
  assert.ok(!words.includes("currentcolor"));
});

test("wordFrequencies strips local path fragments", () => {
  const words = wordFrequencies([
    {
      text: "请检查 /Volumes/macOSexternal/Documents/proj/vibe-wrapper/dashboard/src/pages/Dashboard.jsx 里的发票页面",
    },
  ]).map((row) => row.term);

  assert.ok(words.includes("发票"));
  assert.ok(!words.includes("volumes"));
  assert.ok(!words.includes("macosexternal"));
});

test("analyzePrompts separates useful intent from pasted code and logs", () => {
  const analysis = analyzePrompts([
    { source: "codex", text: "帮我修复登录 bug，并写一个回归测试" },
    { source: "cursor", text: "SyntaxError: JSON.parse unexpected character at line 1 column 10\n    at reader.js:22890:16" },
    { source: "claude", text: "const value = items.map((item) => item.id).join(',');\nreturn value;" },
    { source: "codex", text: "先不要写代码，帮我设计一下方案" },
  ]);

  assert.equal(analysis.total_prompts, 4);
  assert.equal(analysis.useful_prompt_count, 2);
  assert.equal(analysis.reference_prompt_count, 2);
  assert.equal(analysis.categories.debugging.count, 1);
  assert.equal(analysis.categories.planning.count, 1);
  assert.ok(analysis.useful_prompts.some((p) => p.text.includes("回归测试")));
});

test("analyzePrompts extracts code and log signals from reference prompts", () => {
  const analysis = analyzePrompts([
    {
      source: "cursor",
      text: "src/App.tsx\n```tsx\nexport function App() { return <main className=\"page\">Hi</main>; }\n```",
    },
    {
      source: "codex",
      text: "SyntaxError: JSON.parse unexpected character\n    at reader.js:22890:16\nMissing resource in locale zh-TW: panel.ftl",
    },
  ]);

  const signals = analysis.reference_summary.signals;
  assert.equal(signals.languages.tsx, 1);
  assert.equal(signals.languages.javascript, 1);
  assert.equal(signals.file_extensions[".tsx"], 1);
  assert.equal(signals.file_extensions[".js"], 1);
  assert.equal(signals.file_extensions[".ftl"], 1);
  assert.equal(signals.error_types.SyntaxError, 1);
  assert.ok(signals.files.some((file) => file.path === "src/App.tsx"));
});

test("analyzePrompts counts all useful prompts even when useful prompt examples are limited", () => {
  const prompts = Array.from({ length: 5 }, (_, i) => ({
    source: "codex",
    text: `帮我实现第 ${i} 个功能`,
  }));
  const analysis = analyzePrompts(prompts, { usefulLimit: 2 });

  assert.equal(analysis.useful_prompt_count, 5);
  assert.equal(analysis.useful_prompts.length, 2);
  assert.equal(analysis.useful_ratio, 1);
});

test("inspectEnvironment counts skills, MCP servers, plugins, and custom instructions", async () => {
  const home = path.join(fixtures, "home");
  const env = await inspectEnvironment({ home, codexHome: path.join(home, ".codex") });

  assert.equal(env.codex.skills.count, 3);
  assert.equal(env.codex.skills.user_count, 2);
  assert.equal(env.codex.skills.plugin_count, 1);
  assert.equal(env.codex.mcp_servers.count, 2);
  assert.deepEqual(env.codex.mcp_servers.names, ["browser", "node_repl"]);
  assert.equal(env.codex.plugins.enabled_count, 1);
  assert.equal(env.codex.custom_instructions.present, true);
  assert.equal(env.codex.custom_instructions.char_count, 58);
});

test("inspectSources includes profile signals for useful prompts and environment", async () => {
  const home = path.join(fixtures, "home");
  const report = await inspectSources({
    from: "2026-06-07",
    to: "2026-06-07",
    sources: ["codex", "claude"],
    roots: {
      codex: path.join(fixtures, "codex", "sessions"),
      claude: path.join(fixtures, "claude", "projects"),
      codexHome: path.join(home, ".codex"),
      home,
    },
  });

  assert.equal(report.profile_signals.prompt_analysis.useful_prompt_count, 3);
  assert.equal(report.profile_signals.environment.codex.skills.count, 3);
});
