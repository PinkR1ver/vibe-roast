const test = require("node:test");
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { inspectSources } = require("../src/inspect");
const {
  analyzePrompts,
  classifyPrompt,
} = require("../src/extract/prompt-analysis");
const {
  tokenize,
  wordCloudRecords,
  wordFrequencies,
  promptTextForCloud,
} = require("../src/extract/phrase-stats");
const { inspectEnvironment } = require("../src/extract/environment");
const { dayBounds } = require("../src/lib/dates");
const { extractCodexPrompt } = require("../src/sources/codex");
const { extractClaudePrompt } = require("../src/sources/claude");
const {
  extractCursorEntriesFromRows,
  inspectCursor,
} = require("../src/sources/cursor");
const { inspectTokenTracker } = require("../src/sources/token-tracker");
const { codexUsageDelta } = require("../src/sources/codex");
const {
  collectClaudeContextMessage,
  splitClaudeOutput,
} = require("../src/sources/claude");

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
  assert.equal(report.summary.active_source_count, 3);
  assert.deepEqual(report.summary.active_sources.sort(), [
    "claude",
    "codex",
    "cursor",
  ]);
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
  assert.ok(Number.isFinite(vibe.confidence));
  assert.match(vibe.type_code, /^[MA][OP][VS][FX]$/);
  assert.equal(vibe.type_axes.length, 4);
  assert.ok(vibe.personality?.id);
  assert.match(
    vibe.figure,
    /^\/assests\/characters-vibe-types\/.+-figure\.png$/,
  );
  assert.equal(vibe.badge, null);
  assert.equal(vibe.dimensions.length, 6);
  assert.ok(!vibe.signals.some((signal) => signal.label === "Useful prompts"));
  assert.equal(
    vibe.signals.find((signal) => signal.label === "Agents found")?.value,
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
  assert.equal(
    extractCodexPrompt({
      payload: {
        type: "assistant_message",
        message: "我会先检查项目结构。",
      },
    }),
    "",
  );
  assert.equal(
    extractCodexPrompt({
      payload: {
        type: "user_message",
        message: "帮我检查项目结构",
      },
    }),
    "帮我检查项目结构",
  );
});

test("Claude prompt extractor ignores tool result content", () => {
  assert.equal(
    extractClaudePrompt({
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            content: "Fast-forward 13 files changed create mode 100644",
          },
          { type: "text", text: "总结一下这次改动" },
        ],
      },
    }),
    "总结一下这次改动",
  );
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
  assert.deepEqual(
    report.daily_rows.map((row) => row.day),
    ["2026-06-07", "2026-06-08"],
  );
  assert.equal(report.daily_rows[0].total_tokens, 5000);
  assert.equal(report.daily_rows[0].conversation_count, 4);
  assert.equal(report.daily_rows[0].models["codex/gpt-5"], 1500);
  assert.equal(report.daily_rows[0].models["cursor/claude-4"], 3500);
  assert.equal(report.daily_rows[1].billable_total_tokens, 750);
});

test("Codex context uses non-overlapping cumulative token deltas", () => {
  const delta = codexUsageDelta(
    {
      total: {
        input_tokens: 1600,
        cached_input_tokens: 600,
        output_tokens: 500,
        reasoning_output_tokens: 100,
        total_tokens: 2100,
      },
    },
    {
      input_tokens: 1000,
      cached_input_tokens: 400,
      output_tokens: 200,
      reasoning_output_tokens: 50,
      total_tokens: 1200,
    },
  );

  assert.deepEqual(delta, {
    input_tokens: 400,
    cached_input_tokens: 200,
    cache_creation_input_tokens: 0,
    output_tokens: 300,
    reasoning_output_tokens: 50,
    total_tokens: 900,
  });
});

test("Claude context assigns output across text, thinking, and tool blocks", () => {
  const split = splitClaudeOutput(100, 20, [
    { type: "text", text: "abcd" },
    { type: "thinking", thinking: "ignored when explicit reasoning exists" },
    { type: "tool_use", name: "Read", input: { file: "x" } },
  ]);

  assert.equal(split.reasoning, 20);
  assert.equal(
    split.messages + split.tool_calls + split.reasoning + split.custom_agents,
    100,
  );
  assert.ok(split.tool_calls > split.messages);
  assert.equal(split.tool_call_count, 1);
});

test("Claude context merges streaming snapshots before assigning usage", () => {
  const messages = new Map();
  const base = {
    timestamp: "2026-07-01T10:00:00Z",
    message: {
      id: "message-1",
      usage: { input_tokens: 100, output_tokens: 20 },
    },
  };
  collectClaudeContextMessage(
    messages,
    {
      ...base,
      message: {
        ...base.message,
        content: [{ type: "thinking", thinking: "plan" }],
      },
    },
    base.timestamp,
  );
  collectClaudeContextMessage(
    messages,
    {
      ...base,
      message: {
        ...base.message,
        content: [
          {
            type: "tool_use",
            id: "tool-1",
            name: "Read",
            input: { file: "a" },
          },
        ],
      },
    },
    base.timestamp,
  );

  const [message] = messages.values();
  assert.equal(messages.size, 1);
  assert.deepEqual(
    message.content.map((block) => block.type),
    ["thinking", "tool_use"],
  );
  assert.equal(message.usage.output_tokens, 20);
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
  assert.deepEqual(report.summary.active_sources, [
    "cursor",
    "codex",
    "claude",
  ]);
  assert.equal(report.summary.active_source_count, 3);
  assert.equal(report.sources["token-tracker"], undefined);
  assert.equal(report.vibe_profile.signals[0].label, "Total tokens");
  assert.ok(
    !report.vibe_profile.signals.some((s) => s.label === "Useful prompts"),
  );
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

  assert.deepEqual(
    report.activity.daily_rows.map((row) => row.day),
    ["2026-06-08"],
  );
  assert.equal(report.activity.total_tokens, 800);
  assert.equal(report.activity.daily_rows[0].models["claude/sonnet"], 750);
});

test("inspectSources keeps the activity metric in token mode when TokenTracker is empty", async () => {
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

  assert.equal(report.activity.source, "token-tracker");
  assert.equal(report.activity.metric, "tokens");
  assert.deepEqual(report.activity.daily_rows, []);
  assert.equal(report.activity.total_tokens, 0);
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
  assert.ok(
    report.word_frequencies.some((row) => row.key === "category:testing"),
  );
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
  assert.ok(
    !/xerophyte/i.test(blob),
    "assistant/tool xerophyte must not enter prompts",
  );
  const terms = report.word_frequencies.map((row) => row.term);
  assert.ok(!terms.includes("xerophyte"));
  assert.ok(!terms.includes("xerophyte-followup"));
  assert.ok(
    report.prompts.every((p) => p.source === "codex" || p.source === "claude"),
  );
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
  assert.equal(omega?.prompt_count, 5);
  assert.ok(omega?.weight < omega?.count);
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
  const terms = tokenize(
    "selectedSource provider model key className dashboard 发票 统计",
  );

  assert.ok(!terms.includes("selected"));
  assert.ok(!terms.includes("source"));
  assert.ok(!terms.includes("provider"));
  assert.ok(!terms.includes("model"));
  assert.ok(!terms.includes("key"));
  assert.ok(terms.includes("发票"));
  assert.ok(terms.includes("统计"));
});

test("tokenize uses developer-aware Chinese terms instead of noisy bigrams", () => {
  const terms = tokenize("优化电子发票页面动效");

  assert.ok(terms.includes("优化"));
  assert.ok(terms.includes("电子"));
  assert.ok(terms.includes("发票"));
  assert.ok(terms.includes("页面"));
  assert.ok(terms.includes("动效"));
  assert.ok(!terms.includes("化电"));
  assert.ok(!terms.includes("子发"));
});

test("wordFrequencies prioritizes prompt coverage over repetition", () => {
  const words = wordFrequencies([
    { text: "alpha alpha alpha alpha alpha alpha alpha alpha alpha alpha" },
    { text: "beta" },
    { text: "beta" },
    { text: "beta" },
  ]);

  assert.equal(words[0].term, "beta");
  assert.equal(words[0].prompt_count, 3);
  assert.equal(words.find((row) => row.term === "alpha")?.count, 10);
});

test("wordFrequencies merges common bilingual concept variants", () => {
  const words = wordFrequencies([
    { text: "动效 animation" },
    { text: "动效 motion" },
  ]);
  const motion = words.find((row) => row.term === "动效");

  assert.equal(motion?.count, 4);
  assert.equal(motion?.prompt_count, 2);
  assert.equal(
    words.filter((row) => ["动效", "animation", "motion"].includes(row.term))
      .length,
    1,
  );
});

test("wordCloudRecords preserves observed acronyms for domain discovery", () => {
  const [record] = wordCloudRecords([
    {
      source: "cursor",
      timestamp: "2026-01-14T00:00:00Z",
      text: "继续做 HIT 和前庭分析界面",
    },
  ]);
  const hit = record.concepts.find((concept) => concept.key === "term:hit");
  const vestibular = record.concepts.find(
    (concept) => concept.key === "term:前庭",
  );

  assert.equal(hit?.acronym, true);
  assert.equal(hit?.variants.HIT, 1);
  assert.equal(vestibular?.vibe, false);
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
      text: '胶囊还是太大<div class="z-10"><span fill="currentColor">Klaviyo</span></div>',
    },
  ]).map((row) => row.term);

  assert.ok(words.includes("架构"));
  assert.ok(words.includes("代码块"));
  assert.ok(words.includes("胶囊"));
  assert.ok(!words.includes("torch"));
  assert.ok(!words.includes("self"));
  assert.ok(!words.includes("currentcolor"));
});

test("wordFrequencies strips local path fragments", () => {
  const words = wordFrequencies([
    {
      text: "请检查 /Volumes/macOSexternal/Documents/proj/vibe-roast/dashboard/src/pages/Dashboard.jsx 里的发票页面",
    },
  ]).map((row) => row.term);

  assert.ok(words.includes("发票"));
  assert.ok(!words.includes("volumes"));
  assert.ok(!words.includes("macosexternal"));
});

test("analyzePrompts separates useful intent from pasted code and logs", () => {
  const analysis = analyzePrompts([
    { source: "codex", text: "帮我修复登录 bug，并写一个回归测试" },
    {
      source: "cursor",
      text: "SyntaxError: JSON.parse unexpected character at line 1 column 10\n    at reader.js:22890:16",
    },
    {
      source: "claude",
      text: "const value = items.map((item) => item.id).join(',');\nreturn value;",
    },
    { source: "codex", text: "先不要写代码，帮我设计一下方案" },
  ]);

  assert.equal(analysis.total_prompts, 4);
  assert.equal(analysis.useful_prompt_count, 2);
  assert.equal(analysis.reference_prompt_count, 2);
  assert.equal(analysis.categories.debugging.count, 0.5);
  assert.equal(analysis.categories.testing.count, 0.5);
  assert.equal(analysis.categories.planning.count, 1);
  assert.ok(analysis.useful_prompts.some((p) => p.text.includes("回归测试")));
});

test("analyzePrompts separates code authorship from surrounding request intent", () => {
  const authored = [
    "这是我自己写的 JavaScript，请帮我修复点击后重复提交的问题。",
    "```js",
    "export async function submit(form) {",
    "  const payload = new FormData(form);",
    "  const response = await fetch('/api/orders', { method: 'POST', body: payload });",
    "  if (!response.ok) throw new Error('submit failed');",
    "  return response.json();",
    "}",
    "```",
  ].join("\n");
  const unverified = authored.replace(
    "这是我自己写的 JavaScript，请帮我修复点击后重复提交的问题。",
    "请分析下面的 JavaScript。",
  );

  const analysis = analyzePrompts([
    { source: "codex", text: authored },
    { source: "codex", text: unverified },
  ]);

  assert.equal(analysis.useful_prompt_count, 2);
  assert.equal(analysis.reference_prompt_count, 0);
  assert.deepEqual(analysis.useful_prompts[0].reasons, [
    "user_authored_artifact_with_intent",
  ]);
  assert.equal(analysis.useful_prompts[0].artifact_origin, "user_authored");
  assert.deepEqual(analysis.useful_prompts[0].artifact_kinds, ["code"]);
  assert.equal(analysis.useful_prompts[0].category, "debugging");
  assert.deepEqual(analysis.useful_prompts[1].reasons, [
    "user_intent_with_attached_reference",
  ]);
  assert.equal(analysis.useful_prompts[1].artifact_origin, "unverified");
  assert.equal(analysis.useful_for_stats[1].text, "请分析下面的 JavaScript。");
});

test("analyzePrompts rejects app-owned prompt envelopes even when they contain JavaScript and intent verbs", () => {
  const analysis = analyzePrompts([
    {
      source: "codex",
      text: [
        "<recommended_plugins>",
        "Here is a list of plugins that are available but not installed.",
        "</recommended_plugins>",
        "# AGENTS.md instructions",
        "<INSTRUCTIONS>Please build the feature.</INSTRUCTIONS>",
        "```js",
        "const build = () => test();",
        "```",
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_prompt_count, 0);
  assert.equal(analysis.reference_prompt_count, 1);
  assert.deepEqual(
    analysis.reference_summary.examples[0].text.startsWith(
      "<recommended_plugins>",
    ),
    true,
  );
});

test("analyzePrompts infers categories from request text instead of JavaScript identifiers", () => {
  const analysis = analyzePrompts([
    {
      source: "codex",
      text: [
        "这是我写的代码，请解释为什么这里会变慢。",
        "```js",
        "const buildTestPlan = async () => createPackage(await researchWorkflow());",
        "export default buildTestPlan;",
        "```",
      ].join("\n"),
    },
  ]);

  assert.deepEqual(analysis.useful_prompts[0].categories, ["explanation"]);
});

test("analyzePrompts separates intent from generated code and terminal output", () => {
  const generatedIntent = "这是模型生成的 Python，请帮我检查安全问题。";
  const terminalIntent = "这是终端输出，请帮我修复构建失败。";
  const analysis = analyzePrompts([
    {
      source: "codex",
      text: [
        generatedIntent,
        "```python",
        "import os",
        "def run(value):",
        "    return os.system(value)",
        "```",
      ].join("\n"),
    },
    {
      source: "claude",
      text: [
        terminalIntent,
        "$ npm test",
        "npm ERR! Test failed",
        "Process exited with code 1",
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_prompt_count, 2);
  assert.deepEqual(
    analysis.useful_prompts.map((prompt) => prompt.artifact_origin),
    ["external_or_generated", "external_or_generated"],
  );
  assert.deepEqual(
    analysis.useful_prompts.map((prompt) => prompt.reasons[0]),
    [
      "user_intent_with_external_reference",
      "user_intent_with_external_reference",
    ],
  );
  assert.deepEqual(
    analysis.useful_for_stats.map((prompt) => prompt.text),
    [generatedIntent, terminalIntent],
  );
  assert.equal(
    analysis.average_useful_prompt_chars,
    Math.round((generatedIntent.length + terminalIntent.length) / 2),
  );
  assert.equal(analysis.long_prompt_ratio, 0);
});

test("analyzePrompts retains debugging intent around an unlabelled traceback", () => {
  const intent = "请帮我分析这个错误并修复登录问题。";
  const analysis = analyzePrompts([
    {
      text: [
        intent,
        "Traceback (most recent call last):",
        '  File "auth.py", line 42, in login',
        "    return session.user.id",
        "AttributeError: 'NoneType' object has no attribute 'user'",
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_prompt_count, 1);
  assert.deepEqual(analysis.useful_prompts[0].categories, ["debugging"]);
  assert.equal(analysis.useful_prompts[0].artifact_origin, "unverified");
  assert.deepEqual(analysis.useful_prompts[0].reasons, [
    "user_intent_with_attached_reference",
  ]);
  assert.equal(analysis.useful_for_stats[0].text, intent);
});

test("analyzePrompts retains interrogative intent around attached code", () => {
  const code = [
    "```js",
    "export async function load() {",
    "  const result = await fetch('/api');",
    "  return result.json();",
    "}",
    "```",
  ].join("\n");
  const analysis = analyzePrompts([
    { text: `Why does this fail?\n${code}` },
    { text: `这个报错是怎么回事？\n${code}` },
  ]);

  assert.equal(analysis.useful_prompt_count, 2);
  assert.deepEqual(
    analysis.useful_for_stats.map((prompt) => prompt.text),
    ["Why does this fail?", "这个报错是怎么回事？"],
  );
});

test("analyzePrompts removes ordinary stdout from terminal attachments", () => {
  const intent = "Please fix the failing test.";
  const analysis = analyzePrompts([
    {
      text: [
        intent,
        "$ npm test",
        "Loading Acme Payments Production Fixtures",
        "Connected Banana Orchard Customer Alpha",
        "npm ERR! Test failed",
        "Process exited with code 1",
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_for_stats[0].text, intent);
  assert.ok(
    !wordFrequencies(analysis.useful_for_stats).some(
      (row) => row.term === "acme",
    ),
  );
});

test("analyzePrompts removes successful stdout from single-command terminal attachments", () => {
  const intent = "Please summarize the build result.";
  const analysis = analyzePrompts([
    {
      text: [
        intent,
        "$ npm run build",
        "vite v6.4.3 building for production...",
        "dist/assets/index-R4nd0m.js 42.00 kB",
        "✓ built in 812ms",
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_prompt_count, 1);
  assert.deepEqual(analysis.useful_prompts[0].artifact_kinds, [
    "terminal_output",
  ]);
  assert.equal(analysis.useful_for_stats[0].text, intent);
  assert.ok(
    !wordFrequencies(analysis.useful_for_stats).some((row) =>
      ["vite", "dist", "assets", "r4nd0m"].includes(row.term),
    ),
  );
});

test("analyzePrompts retains output-first terminal requests without a blank separator", () => {
  const intent = "Please summarize the build result.";
  const analysis = analyzePrompts([
    {
      text: [
        "$ npm run build",
        "vite v6.4.3 building for production...",
        "dist/assets/index-R4nd0m.js 42.00 kB",
        "✓ built in 812ms",
        intent,
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_prompt_count, 1);
  assert.equal(analysis.useful_for_stats[0].text, intent);
  assert.deepEqual(analysis.useful_prompts[0].artifact_kinds, [
    "terminal_output",
  ]);
});

test("analyzePrompts removes unfenced code before category inference", () => {
  const intent = "Please explain this behavior.";
  const analysis = analyzePrompts([
    {
      text: [
        intent,
        "async function load() {",
        "  const result = await fetchData();",
        "  if (!result.ok) throw new Error('bad');",
        "  return build(result);",
        "}",
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_for_stats[0].text, intent);
  assert.deepEqual(analysis.useful_prompts[0].categories, ["explanation"]);
});

test("English category and intent keywords require word boundaries", () => {
  const prose = analyzePrompts([
    { text: "Please explain a guide about padding and prefixes." },
  ]);
  const codeReference = analyzePrompts([
    {
      text: ["padding prefixes guide material", "```", "foo(bar)", "```"].join(
        "\n",
      ),
    },
  ]);

  assert.deepEqual(prose.useful_prompts[0].categories, ["explanation"]);
  assert.equal(codeReference.useful_prompt_count, 0);
  assert.equal(codeReference.reference_prompt_count, 1);
});

test("English testing categories include plural and inflected forms", () => {
  const analysis = analyzePrompts([
    { text: "Please write unit tests." },
    { text: "Add specs for this module." },
    { text: "The feature was tested with fixtures." },
    { text: "Testing should cover the login flow." },
  ]);

  assert.ok(
    analysis.useful_prompts.every((prompt) =>
      prompt.categories.includes("testing"),
    ),
  );
});

test("analyzePrompts recognizes write requests around code attachments", () => {
  const intent = "Please write unit tests for this:";
  const analysis = analyzePrompts([
    {
      text: [
        intent,
        "```js",
        "export function sum(left, right) {",
        "  return left + right;",
        "}",
        "```",
      ].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_prompt_count, 1);
  assert.deepEqual(analysis.useful_prompts[0].categories, [
    "testing",
    "implementation",
  ]);
  assert.equal(analysis.useful_for_stats[0].text, intent);
});

test("English sentence starters survive artifact stripping", () => {
  const requests = [
    "For the login page, fix the validation.",
    "If possible, please add error handling.",
    "While you're working on this, please update the tests.",
    "Return the filtered results and please explain the change.",
    "Try opening the file and please analyze the failure.",
    "From the documentation, please fix this integration.",
    "Class definitions confuse me; please explain this behavior.",
    "Import duties are unrelated; please update this module.",
  ];
  const prompts = requests.map((request) => ({
    text: [
      request,
      "```js",
      "export function validate(value) {",
      "  if (!value) throw new Error('required');",
      "  return value.trim();",
      "}",
      "```",
    ].join("\n"),
  }));
  const analysis = analyzePrompts(prompts);

  assert.equal(analysis.useful_prompt_count, requests.length);
  assert.deepEqual(
    analysis.useful_for_stats.map((prompt) => prompt.text),
    requests,
  );
  assert.ok(
    analysis.useful_prompts.every(
      (prompt) => prompt.artifact_origin === "unverified",
    ),
  );
});

test("moderate prompt templates cannot bypass provenance retention", () => {
  const analysis = analyzePrompts([
    {
      text: ["帮我完善这个模板", "System prompt:", "{{user_input}}"].join("\n"),
    },
  ]);

  assert.equal(analysis.useful_prompt_count, 0);
  assert.equal(analysis.reference_prompt_count, 1);
  assert.deepEqual(analysis.reference_summary.signals.artifact_kinds, {
    prompt_template: 1,
  });
});

test("analyzePrompts rejects short multi-line code without request prose", () => {
  const analysis = analyzePrompts([
    { text: "const first = items[0];\nlet second = items[1];" },
  ]);

  assert.equal(analysis.useful_prompt_count, 0);
  assert.deepEqual(analysis.reference_summary.signals.artifact_kinds, {
    code: 1,
  });
});

test("reference reasons agree with declared artifact origin", () => {
  const classification = classifyPrompt(
    [
      "这是我自己写的代码：",
      "```js",
      "const first = items[0];",
      "let second = items[1];",
      "```",
    ].join("\n"),
  );

  assert.equal(classification.useful, false);
  assert.equal(classification.artifact_origin, "user_authored");
  assert.deepEqual(classification.reasons, [
    "user_authored_artifact_without_intent",
  ]);
});

test("analyzePrompts recognizes config, diff, prompt-template, and opaque references", () => {
  const analysis = analyzePrompts([
    {
      text: "```yaml\nserver:\n  host: localhost\n  port: 7681\nfeatures:\n  roast: true\n```",
    },
    {
      text: [
        "diff --git a/a.js b/a.js",
        "index 123..456 100644",
        "--- a/a.js",
        "+++ b/a.js",
        "@@ -1,2 +1,2 @@",
        "-const value = oldValue;",
        "+const value = newValue;",
        "-renderOld();",
        "+renderNew();",
      ].join("\n"),
    },
    {
      text: [
        "System prompt:",
        "You are an expert.",
        "## Context",
        "A generated context",
        "## Instructions",
        "Build the result",
        "## Constraints",
        "Use the template",
        "## Output Format",
        "JSON",
      ].join("\n"),
    },
    { text: "A".repeat(1600) },
  ]);

  assert.equal(analysis.useful_prompt_count, 0);
  assert.equal(analysis.reference_prompt_count, 4);
  assert.equal(analysis.reference_summary.artifact_count, 4);
  assert.equal(analysis.reference_summary.signals.artifact_kinds.config, 1);
  assert.equal(analysis.reference_summary.signals.artifact_kinds.diff, 1);
  assert.equal(
    analysis.reference_summary.signals.artifact_kinds.prompt_template,
    1,
  );
  assert.equal(
    analysis.reference_summary.signals.artifact_kinds.opaque_text,
    1,
  );
});

test("analyzePrompts preserves ordinary Markdown requirement lists", () => {
  const text = [
    "请实现账户设置页面：",
    "- 支持修改头像",
    "- 添加邮箱验证",
    "- 增加回归测试",
    "- 优化移动端布局",
  ].join("\n");
  const analysis = analyzePrompts([{ text }]);

  assert.equal(analysis.useful_prompt_count, 1);
  assert.deepEqual(analysis.useful_prompts[0].artifact_kinds, []);
  assert.equal(analysis.useful_for_stats[0].text, text);
});

test("analyzePrompts preserves pure Markdown lists and blockquotes", () => {
  const list = [
    "- 请实现头像修改",
    "- 添加邮箱验证",
    "- 增加回归测试",
    "- 优化移动端布局",
  ].join("\n");
  const quote = [
    "> Please explain the migration plan",
    "> Please add rollback steps",
    "> Keep the existing API stable",
  ].join("\n");
  const analysis = analyzePrompts([{ text: list }, { text: quote }]);

  assert.equal(analysis.useful_prompt_count, 2);
  assert.ok(
    analysis.useful_prompts.every(
      (prompt) => prompt.artifact_kinds.length === 0,
    ),
  );
  assert.deepEqual(
    analysis.useful_for_stats.map((prompt) => prompt.text),
    [list, quote],
  );
});

test("promptTextForCloud preserves natural-language import mentions", () => {
  assert.equal(
    promptTextForCloud("I want to import the library and also add types"),
    "I want to import the library and also add types",
  );
  assert.equal(
    promptTextForCloud(
      "Keep this request\nimport { thing } from './module.js'\nand this explanation",
    ),
    "Keep this request\n \nand this explanation",
  );
  assert.equal(
    promptTextForCloud(
      "Keep this request\nimport React from 'react'\nWhat do you think about the performance?",
    ),
    "Keep this request\n \nWhat do you think about the performance?",
  );
});

test("analyzePrompts extracts code and log signals from reference prompts", () => {
  const analysis = analyzePrompts([
    {
      source: "cursor",
      text: 'src/App.tsx\n```tsx\nexport function App() { return <main className="page">Hi</main>; }\n```',
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
  const env = await inspectEnvironment({
    home,
    codexHome: path.join(home, ".codex"),
  });

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
