const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { inspectSources } = require("../src/inspect");
const { analyzePrompts } = require("../src/extract/prompt-analysis");
const { inspectEnvironment } = require("../src/extract/environment");
const { extractCursorEntriesFromRows } = require("../src/sources/cursor");

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
