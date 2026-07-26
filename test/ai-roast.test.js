const test = require("node:test");
const assert = require("node:assert/strict");
const { wordCloudRecords } = require("../src/extract/phrase-stats");
const { buildRoastEvidence, domainClusterRows } = require("../src/lib/roast-evidence");
const { buildRoastSnapshot, encodeRoastSnapshot } = require("../src/lib/roast-snapshot");
const {
  generateAiRoast,
  providerConfig,
  requestForProvider,
  responseContent,
  validateRoastPayload,
  SYSTEM_PROMPT,
  USER_INSTRUCTIONS,
} = require("../src/lib/ai-roast");

function sampleReport() {
  return {
    summary: { active_sources: ["codex", "cursor"] },
    activity: {
      metric: "tokens",
      total_tokens: 123456,
      active_day_count: 12,
      longest_streak: 4,
      active_rate: "42.0",
      top_agent: "codex",
      top_provider: "OpenAI",
      top_model: "gpt-test",
    },
    profile_signals: {
      prompt_analysis: {
        useful_prompt_count: 40,
        categories: {
          implementation: { count: 20, examples: ["private prompt must not escape"] },
          testing: { count: 4 },
        },
      },
    },
    word_frequencies: [
      { term: "前庭", count: 14, prompt_count: 9, weight: 10 },
      { term: "HIT", count: 10, prompt_count: 7, weight: 8 },
    ],
    word_cloud_records: [
      { concepts: [{ key: "term:vestibular", kind: "term", variants: { 前庭: 2 } }, { key: "term:hit", kind: "term", acronym: true, variants: { HIT: 1 } }] },
      { concepts: [{ key: "term:vestibular", kind: "term", variants: { 前庭: 1 } }, { key: "term:hit", kind: "term", acronym: true, variants: { HIT: 2 } }] },
      { concepts: [{ key: "term:vestibular", kind: "term", variants: { 前庭: 3 } }, { key: "term:hit", kind: "term", acronym: true, variants: { HIT: 1 } }] },
    ],
    vibe_profile: {
      status: "ready",
      confidence: 78,
      type_code: "MPSF",
      personality: { title: "Builder", titleZh: "构建侠" },
      type_axes: [{
        key: "verifier_shipper",
        letter: "S",
        margin: 30,
        left: { code: "V", percent: 35 },
        right: { code: "S", percent: 65 },
      }],
      dimensions: [
        { key: "build", label: "Build", labelZh: "构建", value: 92 },
        { key: "debug", label: "Debug", labelZh: "调试", value: 18 },
      ],
    },
    prompts: [{ text: "raw private prompt" }],
  };
}

test("roast evidence includes distinctive concepts but excludes raw prompts and category examples", () => {
  const evidence = buildRoastEvidence(sampleReport());
  const serialized = JSON.stringify(evidence);
  assert.match(serialized, /前庭/);
  assert.match(serialized, /HIT/);
  assert.match(serialized, /occurrence_count/);
  assert.deepEqual(evidence.prompt_behavior.recurring_domain_clusters[0].terms, ["HIT", "前庭"]);
  assert.equal(evidence.prompt_behavior.recurring_domain_clusters[0].prompt_coverage, 3);
  assert.doesNotMatch(serialized, /raw private prompt/);
  assert.doesNotMatch(serialized, /private prompt must not escape/);
  assert.equal(evidence.guardrails.raw_prompts_included, false);
});

test("roast snapshot keeps behavioral state but omits growing activity totals", () => {
  const evidence = buildRoastEvidence(sampleReport());
  const snapshot = buildRoastSnapshot(evidence);
  const serialized = JSON.stringify(snapshot);
  assert.equal(snapshot.type_code, "MPSF");
  assert.equal(snapshot.writer_prompt_version, 6);
  assert.deepEqual(new Set(snapshot.concepts.slice(0, 2)), new Set(["前庭", "hit"]));
  assert.equal("total_tokens" in snapshot, false);
  assert.equal("active_days" in snapshot, false);
  assert.deepEqual(
    JSON.parse(Buffer.from(encodeRoastSnapshot(evidence), "base64url").toString("utf8")),
    snapshot,
  );
  assert.doesNotMatch(serialized, /raw private prompt/);
});

test("domain clusters preserve recurring same-prompt relationships without raw prompt text", () => {
  const rawPrompt = "定时查询三角洲 bullet 价格和市场行情";
  const records = wordCloudRecords(Array.from({ length: 4 }, (_, index) => ({
    source: "codex",
    timestamp: `2026-07-${20 + index}T08:00:00Z`,
    text: rawPrompt,
    categories: [],
  })));
  const clusters = domainClusterRows(records);
  const terms = new Set(clusters[0].terms);
  for (const term of ["三角洲", "bullet", "价格", "市场"]) assert.ok(terms.has(term));
  assert.equal(clusters[0].prompt_coverage, 4);
  assert.equal(clusters[0].cohesion, 1);
  assert.doesNotMatch(JSON.stringify(clusters), new RegExp(rawPrompt));
});

test("two repeated topic prompts are enough to expose a playful domain cluster", () => {
  const records = wordCloudRecords(Array.from({ length: 2 }, (_, index) => ({
    source: "codex",
    timestamp: `2026-07-${20 + index}T08:00:00Z`,
    text: "查询三角洲 bullet 价格和市场",
    categories: [],
  })));
  const clusters = domainClusterRows(records);
  assert.ok(clusters.length > 0);
  assert.equal(clusters[0].prompt_coverage, 2);
  assert.ok(clusters[0].cohesion >= 0.45);
});

test("AI writer sends only evidence and validates bilingual JSON", async () => {
  const evidence = buildRoastEvidence(sampleReport());
  let request;
  let calls = 0;
  const result = await generateAiRoast(evidence, {
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      request = options;
      calls += 1;
      return {
        ok: true,
        json: async () => ({
          model: "deepseek-v4-flash",
          choices: [{
            message: {
              content: JSON.stringify({
                hashtagPairs: [
                  { en: "VestibularLab", zh: "前庭实验室", kind: "domain_character", meaning: "a lab scene built around vestibular concepts" },
                  { en: "ShipFirst", zh: "先发再验", kind: "behavior_character", meaning: "shipping signal outweighs verification" },
                  { en: "Builder", zh: "构建侠", kind: "personality_character", meaning: "the fixed MPSF personality title" },
                ],
                roast: "You built a vestibular lab before the test runner found its shoes.",
                roastZh: "前庭系统已经起飞，测试运行器还在门口找鞋。",
                tldr: "Vestibular velocity, verification pending.",
                tldrZh: "前庭先飞，验证候机。",
              }),
            },
          }],
        }),
      };
    },
  });
  const body = JSON.parse(request.body);
  const serialized = JSON.stringify(body);
  assert.equal(body.model, "deepseek-v4-flash");
  assert.equal(body.thinking.type, "disabled");
  assert.doesNotMatch(serialized, /raw private prompt/);
  assert.equal(calls, 1);
  assert.equal(result.writer.provider, "deepseek");
  assert.deepEqual(result.hashtags, ["VestibularLab", "ShipFirst", "Builder"]);
  assert.deepEqual(result.hashtagsZh, ["前庭实验室", "先发再验", "构建侠"]);
  assert.equal(result.hashtagPairs[0].kind, "domain_character");
});

test("AI payload validation rejects incomplete output", () => {
  assert.throws(() => validateRoastPayload({ roast: "only one field" }), /missing required/);
});

test("writer guardrails distinguish observed prompt behavior from code quality", () => {
  assert.match(SYSTEM_PROMPT, /under-observed/);
  assert.match(SYSTEM_PROMPT, /does not prove the code is wrong/);
  assert.match(SYSTEM_PROMPT, /not objective engineering quality/);
  assert.match(SYSTEM_PROMPT, /text mentions/);
  assert.match(SYSTEM_PROMPT, /Never combine separate concepts/);
  assert.match(SYSTEM_PROMPT, /do not reveal execution order/);
});

test("roast prompt requires a three-beat comic structure instead of metric summary", () => {
  assert.match(SYSTEM_PROMPT, /three-beat escalation/);
  assert.match(SYSTEM_PROMPT, /central comic premise/);
  assert.match(SYSTEM_PROMPT, /Sustain one concrete metaphor world/);
  assert.match(SYSTEM_PROMPT, /final sentence must be a quotable punchline/);
  assert.match(USER_INSTRUCTIONS, /target 120-170 words/);
  assert.match(USER_INSTRUCTIONS, /exactly 3 short paragraphs/);
});

test("hashtag prompt turns concept clusters into shareable character labels", () => {
  assert.match(SYSTEM_PROMPT, /Hashtags are interpretations, not a frequency table/);
  assert.match(SYSTEM_PROMPT, /preflop \+ folds \+ raises \+ river/);
  assert.match(SYSTEM_PROMPT, /HoldemPlayer/);
  assert.match(SYSTEM_PROMPT, /ArmsDealer/);
  assert.match(SYSTEM_PROMPT, /武器贩子/);
  assert.match(SYSTEM_PROMPT, /obviously fictional scene role/);
  assert.match(SYSTEM_PROMPT, /stage names from a comedy writer's room/);
  assert.match(SYSTEM_PROMPT, /Bold exaggeration, slang, puns/);
  assert.match(SYSTEM_PROMPT, /distinctive standalone recurring concept/);
  assert.match(SYSTEM_PROMPT, /nobody would want to screenshot it/);
  assert.match(SYSTEM_PROMPT, /Never fuse unrelated concepts|Never combine separate concepts/);
  assert.match(USER_INSTRUCTIONS, /most shareable tag/);
  assert.match(USER_INSTRUCTIONS, /most distinctive semantically credible cluster/);
  assert.match(USER_INSTRUCTIONS, /exactly 5 hashtagPairs/);
  assert.match(USER_INSTRUCTIONS, /Do not force a rigid order/);
  assert.match(USER_INSTRUCTIONS, /not copied high-frequency words/);
  assert.match(USER_INSTRUCTIONS, /culturally natural localization/);
});

test("paired hashtag validation preserves meaning alignment and supports proper nouns", () => {
  const output = validateRoastPayload({
    hashtagPairs: [
      { en: "CodeCult", zh: "代码教团", kind: "behavior_character", meaning: "cult-like devotion to code" },
      { en: "HIT", zh: "HIT", kind: "proper_noun", meaning: "a recurring domain acronym" },
      { en: "Builder", zh: "构建侠", kind: "personality_character", meaning: "fixed personality title" },
    ],
    roast: "One. Two. Three.",
    roastZh: "一。二。三。",
    tldr: "Summary.",
    tldrZh: "总结。",
  });
  assert.deepEqual(output.hashtags, ["CodeCult", "HIT", "Builder"]);
  assert.deepEqual(output.hashtagsZh, ["代码教团", "HIT", "构建侠"]);
  assert.equal(output.hashtagPairs[0].meaning, "cult-like devotion to code");
});

test("overlong model copy is truncated on a sentence boundary", () => {
  const long = `${"A".repeat(700)}. ${"B".repeat(700)}.`;
  const output = validateRoastPayload({
    hashtags: ["One", "Two", "Three"],
    hashtagsZh: ["一", "二", "三"],
    roast: long,
    roastZh: "中文 roast。",
    tldr: "Summary.",
    tldrZh: "总结。",
  });
  assert.ok(output.roast.length <= 1100);
  assert.match(output.roast, /\.$/);
  assert.doesNotMatch(output.roast, /B{10}/);
});

test("AI payload validation accepts fenced JSON from non-JSON-mode models", () => {
  const output = validateRoastPayload(`\`\`\`json
{
  "hashtags": ["One", "Two", "Three"],
  "hashtagsZh": ["一", "二", "三"],
  "roast": "A courtroom metaphor enters with receipts.",
  "roastZh": "法庭隐喻带着证据入场。",
  "tldr": "The dashboard called a witness.",
  "tldrZh": "仪表盘传唤了证人。"
}
\`\`\``);
  assert.equal(output.hashtags[0], "One");
  assert.match(output.roast, /courtroom/);
});

test("overlong one-line copy ends intentionally instead of cutting mid-word", () => {
  const output = validateRoastPayload({
    hashtags: ["One", "Two", "Three"],
    hashtagsZh: ["一", "二", "三"],
    roast: "A valid roast.",
    roastZh: "中文 roast。",
    tldr: "This deliberately overlong summary has many words ".repeat(8),
    tldrZh: "总结。",
  });
  assert.ok(output.tldr.length <= 150);
  assert.match(output.tldr, /[，；：,;:…]$/);
});

test("multi-provider writer builds OpenAI-compatible, Anthropic, and Gemini requests", () => {
  const messages = [
    { role: "system", content: "System" },
    { role: "user", content: "User" },
  ];
  const openai = requestForProvider(providerConfig("groq"), {
    apiKey: "groq-key",
    messages,
    temperature: 0.2,
    maxTokens: 100,
  });
  assert.equal(openai.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(openai.options.headers.Authorization, "Bearer groq-key");
  assert.equal(JSON.parse(openai.options.body).model, "llama-3.3-70b-versatile");

  const anthropic = requestForProvider(providerConfig("anthropic"), {
    apiKey: "anthropic-key",
    messages,
    temperature: 0.2,
    maxTokens: 100,
  });
  const anthropicBody = JSON.parse(anthropic.options.body);
  assert.equal(anthropic.url, "https://api.anthropic.com/v1/messages");
  assert.equal(anthropic.options.headers["x-api-key"], "anthropic-key");
  assert.equal(anthropicBody.system, "System");
  assert.deepEqual(anthropicBody.messages, [{ role: "user", content: "User" }]);

  const gemini = requestForProvider(providerConfig("gemini"), {
    apiKey: "gemini-key",
    messages,
    temperature: 0.2,
    maxTokens: 100,
  });
  assert.match(gemini.url, /generateContent\?key=gemini-key$/);
  assert.equal(JSON.parse(gemini.options.body).generationConfig.responseMimeType, "application/json");
});

test("multi-provider writer normalizes protocol-specific response text", () => {
  assert.equal(
    responseContent(providerConfig("anthropic"), { content: [{ type: "text", text: "{\"ok\":true}" }] }),
    "{\"ok\":true}",
  );
  assert.equal(
    responseContent(providerConfig("gemini"), {
      candidates: [{ content: { parts: [{ text: "{\"ok\":" }, { text: "true}" }] } }],
    }),
    "{\"ok\":true}",
  );
  assert.throws(() => providerConfig("unknown-provider"), /Unsupported AI provider/);
});
