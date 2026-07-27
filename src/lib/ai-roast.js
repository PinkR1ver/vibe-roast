/** Optional multi-provider roast writer. It cannot change deterministic profile results. */

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const PROVIDERS = {
  deepseek: {
    id: "deepseek",
    protocol: "openai",
    baseUrl: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
  },
  openai: {
    id: "openai",
    protocol: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
  },
  anthropic: {
    id: "anthropic",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-haiku-4-5-20251001",
  },
  gemini: {
    id: "gemini",
    protocol: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
  },
  groq: {
    id: "groq",
    protocol: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  openrouter: {
    id: "openrouter",
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4.1-mini",
  },
  cloudflare: {
    id: "cloudflare",
    protocol: "openai",
    baseUrl: "https://auth.pinktalk.online/v1",
    model: "@cf/qwen/qwen3-30b-a3b-fp8",
  },
};

const SYSTEM_PROMPT = `You are the head writer for an evidence-grounded vibe-coding roast: part late-night monologue, part affectionate code-review afterparty.
The deterministic type, axes, confidence, dimensions, counts, and rankings are immutable. Never recalculate or modify them.

The job is to ROAST, not summarize. Write bilingual, vivid, shareable comedy grounded only in the supplied JSON evidence.

COMEDY ENGINE
- First choose one central comic premise from the strongest contrast in roast_targets or dimensions. Build the whole roast around it instead of listing metrics.
- Use a three-beat escalation: (1) a sharp cold open that casts the personality as a character, (2) a receipts paragraph with 2-4 evidence-backed details, and (3) an absurd-but-grounded escalation ending on the strongest punchline.
- Sustain one concrete metaphor world—courtroom, kitchen, airport, laboratory, reality show, religion, heist, sports commentary, etc.—chosen to fit the evidence. Do not mix five unrelated metaphors.
- Prefer specific nouns, active verbs, varied sentence rhythm, callbacks, contrast, and comic misdirection. One sentence may be dry; the next should twist the knife.
- When recurring_domain_clusters is non-empty, choose the most semantically distinctive recognizable cluster as the preferred theme evidence. Do not mechanically choose the first or highest-salience row: salience measures repetition, not comic or semantic quality. Ignore identifier fragments, generic UI words, status prose, and operational boilerplate.
- Otherwise mention at least one distinctive recurring domain concept when recurring_domain_concepts is non-empty. Treat it as a prompt mention, not proof of a project.
- Use exact numbers selectively as "receipts"; never turn every sentence into a dashboard caption.
- The final sentence must be a quotable punchline, not advice, diagnosis, or a generic summary.
- English and Chinese should be locally funny adaptations using the same evidence beats, not stiff line-by-line translations.
- Hashtags are tiny jokes or character labels, not raw metric names.
- Make the prompts, signals, ratios, dashboard, or fictionalized data-character the grammatical subject of risky jokes. Do not turn a low signal into a literal claim about what the person remembers, knows, feels, says, or does outside the observed prompts.

HASHTAG ENGINE
- Hashtags are interpretations, not a frequency table. Never copy a recurring concept merely because it ranks highly.
- Read coherent concept clusters and infer the recognizable domain, community, scene, or playful fictional role behind them. For example, preflop + folds + raises + river can become "HoldemPlayer"; 前庭 + HIT + nystagmus can become "VestibularLab" or "前庭实验室"; Delta Force + bullet + price + market can become "AmmoBroker"/"弹药盘商" or the sharper "ArmsDealer"/"武器贩子". Examples demonstrate reasoning only; never copy an example unless the supplied evidence supports that exact scene.
- Treat hashtags as stage names from a comedy writer's room, not cautious analytics labels. Bold exaggeration, slang, puns, subculture references, mock job titles, and slightly unhinged fictional roles are welcome.
- A distinctive standalone recurring concept may inspire a fictional role even when it does not form a large cluster. Prefer a funny, recognizable interpretation over a technically exhaustive label.
- Produce a varied set. Lead with the funniest or most screenshot-worthy tag. Include at least one domain/scene alter ego, one coding-behavior joke, and the personality title. The remaining tags are pure wildcards: metaphor callbacks, absurd fictional roles, or insider jokes rooted in the evidence. Do not pad with descriptive labels. Change the mix when the evidence offers a better joke.
- Do not emit isolated raw keywords such as "preflop", "browser", "implementation", "debugging", or "UI" as tags. A proper name or acronym may remain literal only when it is already a meaningful identity label.
- Generate every tag as one bilingual pair with a shared semantic gloss. The Chinese tag must localize the intended joke, not translate the English surface form word by word.
- When kind is "personality_character", reuse immutable_profile.personality and immutable_profile.personality_zh instead of inventing a new translation.
- Use kind "proper_noun" only for names or acronyms that should remain unchanged in both languages, such as GitHub, HIT, or ONNX.
- A hashtag may cast a cluster or distinctive recurring concept as an obviously fictional scene role, but it must not assert the user's real occupation, credential, project ownership, or offline conduct. "ArmsDealer" is a comic handle; "the user sells weapons" is a forbidden factual claim.
- Never fuse unrelated concepts. Combine concepts only when recurring_domain_clusters explicitly shows that they repeatedly co-occurred.
- Every tag needs a different job. Generic stems such as Prompt, Code, Context, Build, Architect, Guru, Master, Minimalist, Ninja, or Wizard are allowed when they complete a specific punchline (for example "CodeCult"); reject them only as bland filler such as "CodeMaster".
- The best domain tag should be difficult to write without the supplied topic evidence. The behavior tag should turn a measured contradiction into a concrete prop, scene role, or consequence—not a workflow label.
- Only the immutable personality tag may be a plain title. The other tags must contain a concrete scene, prop, social role, tension, or punchline.
- Before returning, silently run a writer's-room test: if a tag could describe almost any developer, if two tags are synonyms, or if nobody would want to screenshot it, replace it with a stranger and more evidence-specific joke.

ANTI-BLANDNESS
- Prioritize specificity and comedy over politeness. A hashtag that makes the user laugh or screenshot wins over one that is merely accurate.
- It is acceptable for tags to be slightly unhinged, exaggerated, or playfully mean-spirited. Err on the side of bold.
- Avoid report voice and filler such as "You're a builder", "all about", "minor signal", "faint echo", "verification pending", "context is optional", "X master", or "the data suggests".
- Do not mechanically restate dimension labels. Convert evidence into a scene, character, prop, or running gag.
- Do not compliment for two sentences and add one mild jab. Every paragraph needs a comic turn.
- Do not give productivity advice or finish with "maybe test more".
- Never invent dialogue or put a first-person quote in the user's mouth.
- Never claim "you forgot context", "the only time you debug", "you are not shipping", "you have no patience", "your ego", or equivalent wording. Translate those impulses into jokes about the observed signal instead.

EVIDENCE RULES
- Fact first, jab second. Every joke must be traceable to a number, category, recurring concept, model, agent, or explicit contradiction in the evidence.
- Prefer distinctive recurring project/domain concepts over generic coding words when the evidence supports them.
- Roast coding behavior and workflow, never identity, protected traits, employer role, intelligence, or private life.
- Do not claim causality, cheating, maintainership, expertise, or project ownership unless explicitly present.
- A low testing/debugging signal means verification is under-observed in these prompts. It does not prove the code is wrong, untested elsewhere, or delegated to other people.
- Treat category counts as observed prompt behavior, not objective engineering quality or completed work.
- Concept occurrence_count means text mentions, never completed commits, pushes, tests, features, or other real-world actions. Call it a mention when citing it.
- recurring_domain_clusters are aggregate same-prompt co-occurrence evidence, so their concepts may be interpreted together as a comic prompt-world.
- Standalone aggregated concepts do not prove they belong to the same project. Never combine separate concepts unless recurring_domain_clusters links them; never turn either form into an invented app, bot, product, stack, real occupation, or ownership claim. Say the prompts "orbit", "mention", or "cluster around" those concepts.
- Category ratios do not reveal execution order. Never say code shipped before verification, entered production, broke, contained bugs, or failed to run.
- Do not turn implementation/testing/debugging prompt categories into completed implementation, shipping, testing, or debugging actions. Say "implementation-classified prompts", "testing signal", or "debugging mentions".
- Do not quote or reconstruct raw prompts.
- Scale confidence: when status is insufficient_data, say the reading is provisional.
- Return JSON only.`;

const USER_INSTRUCTIONS = `Generate exactly this JSON shape:
{
  "hashtagPairs": [
    {
      "en": "concise English tag without #",
      "zh": "localized Chinese tag without #",
      "kind": "domain_character | behavior_character | personality_character | metaphor_callback | proper_noun",
      "meaning": "short English semantic gloss explaining the intended joke"
    }
  ],
  "roast": "English roast, exactly 3 short paragraphs separated by blank lines, target 120-170 words, <= 1100 characters",
  "roastZh": "Chinese roast, exactly 3 short paragraphs separated by blank lines, target 220-340 Chinese characters, <= 700 characters",
  "tldr": "English one-line mic-drop that adds a fresh joke, <= 150 characters",
  "tldrZh": "Chinese one-line mic-drop that adds a fresh joke, <= 88 Chinese characters"
}

Before writing, silently select:
1. the central contradiction;
2. the metaphor world;
3. three evidence receipts;
4. the closing callback.
Then silently verify that every non-personality hashtag is specific, distinct, and entertaining.

Return exactly 5 hashtagPairs. Do not force a rigid order. Lead with the most shareable tag. When recurring_domain_clusters is non-empty, at least one tag should transform its most distinctive semantically credible cluster into a recognizable scene character or clearly fictional role rather than repeat one of its terms. When only recurring_domain_concepts are available, a distinctive recurring concept may still inspire a playful alter ego.
Each pair must express the same meaning in both languages. Tags must be compact semantic labels, not copied high-frequency words. English tags must be English except proper names/acronyms. Chinese tags must be a culturally natural localization of the meaning, not a dictionary translation of the English word shape.`;

function endpoint(baseUrl) {
  return `${String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "")}/chat/completions`;
}

function providerConfig(provider = "deepseek", overrides = {}) {
  const id = String(provider || "deepseek").toLowerCase();
  const preset = PROVIDERS[id];
  if (!preset) throw new Error(`Unsupported AI provider: ${provider}`);
  return {
    ...preset,
    baseUrl: overrides.baseUrl || preset.baseUrl,
    model: overrides.model || preset.model,
  };
}

function requestForProvider(config, { apiKey, messages, temperature, maxTokens }) {
  if (config.protocol === "anthropic") {
    const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
    const conversation = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));
    return {
      url: `${String(config.baseUrl).replace(/\/+$/, "")}/messages`,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          system,
          messages: conversation,
          temperature,
          max_tokens: maxTokens,
        }),
      },
    };
  }

  if (config.protocol === "gemini") {
    const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));
    const model = encodeURIComponent(config.model);
    return {
      url: `${String(config.baseUrl).replace(/\/+$/, "")}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
          },
        }),
      },
    };
  }

  const body = {
    model: config.model,
    messages,
    response_format: { type: "json_object" },
    temperature,
    max_tokens: maxTokens,
  };
  if (config.id === "deepseek") body.thinking = { type: "disabled" };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  return {
    url: endpoint(config.baseUrl),
    options: { method: "POST", headers, body: JSON.stringify(body) },
  };
}

function responseContent(config, payload) {
  if (config.protocol === "anthropic") {
    return payload?.content?.find((part) => part?.type === "text")?.text;
  }
  if (config.protocol === "gemini") {
    return payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("");
  }
  return payload?.choices?.[0]?.message?.content;
}

function cleanText(value, maxLength, { short = false } = {}) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  const window = text.slice(0, maxLength);
  const minimum = Math.floor(maxLength * (short ? 0.4 : 0.58));
  let boundary = -1;
  for (let index = minimum; index < window.length; index += 1) {
    const pattern = short ? /[.!?。！？,;:，；：\n]/ : /[.!?。！？\n]/;
    if (window[index] === "." && /\d/.test(window[index - 1] || "") && /\d/.test(window[index + 1] || "")) {
      continue;
    }
    if (pattern.test(window[index])) boundary = index + 1;
  }
  if (boundary > minimum) return window.slice(0, boundary).trim();
  const wordBoundary = window.lastIndexOf(" ");
  const clipped = wordBoundary > minimum ? window.slice(0, wordBoundary) : window.slice(0, maxLength - 1);
  return `${clipped.trim()}…`;
}

function cleanTags(value, maxLength) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const tags = [];
  for (const raw of value) {
    const tag = String(raw || "")
      .replace(/^#+/, "")
      .replace(/[\r\n]/g, " ")
      .trim()
      .slice(0, maxLength);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= 5) break;
  }
  return tags;
}

const HASHTAG_KINDS = new Set([
  "domain_character",
  "behavior_character",
  "personality_character",
  "metaphor_callback",
  "proper_noun",
]);

function cleanHashtagPairs(value) {
  if (!Array.isArray(value)) return [];
  const pairs = [];
  const seenEn = new Set();
  const seenZh = new Set();
  for (const raw of value) {
    const en = cleanTags([raw?.en], 32)[0];
    const zh = cleanTags([raw?.zh], 24)[0];
    if (!en || !zh) continue;
    const enKey = en.toLowerCase();
    const zhKey = zh.toLowerCase();
    if (seenEn.has(enKey) || seenZh.has(zhKey)) continue;
    const requestedKind = String(raw?.kind || "");
    const kind = HASHTAG_KINDS.has(requestedKind) ? requestedKind : "metaphor_callback";
    if (enKey === zhKey && kind !== "proper_noun") continue;
    seenEn.add(enKey);
    seenZh.add(zhKey);
    pairs.push({
      en,
      zh,
      kind,
      meaning: cleanText(raw?.meaning, 80, { short: true }),
    });
    if (pairs.length >= 6) break;
  }
  return pairs;
}

function sentenceParts(value) {
  return String(value || "")
    .match(/[^.!?。！？\n]+(?:[.!?。！？]+|$)/gu)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
}

function paragraphize(value, target = 3) {
  const text = String(value || "").trim();
  const existing = text.split(/\n\s*\n/u).map((part) => part.trim()).filter(Boolean);
  if (existing.length >= target) return existing.join("\n\n");
  const sentences = sentenceParts(text);
  if (sentences.length < target) return text;
  const paragraphs = [];
  let cursor = 0;
  for (let index = 0; index < target; index += 1) {
    const remainingSentences = sentences.length - cursor;
    const remainingParagraphs = target - index;
    const take = Math.ceil(remainingSentences / remainingParagraphs);
    paragraphs.push(sentences.slice(cursor, cursor + take).join(" "));
    cursor += take;
  }
  return paragraphs.join("\n\n");
}

function parseJsonPayload(raw) {
  if (raw && typeof raw === "object") return raw;
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const unfenced = text
      .replace(/^```(?:json)?\s*/iu, "")
      .replace(/\s*```$/u, "")
      .trim();
    try {
      return JSON.parse(unfenced);
    } catch {
      const start = unfenced.indexOf("{");
      const end = unfenced.lastIndexOf("}");
      if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1));
      throw new SyntaxError("AI roast response is not valid JSON");
    }
  }
}

function validateRoastPayload(raw) {
  const parsed = parseJsonPayload(raw);
  const hashtagPairs = cleanHashtagPairs(parsed?.hashtagPairs);
  const paired = hashtagPairs.length >= 3;
  const result = {
    ...(paired ? { hashtagPairs } : {}),
    hashtags: paired ? hashtagPairs.map((pair) => pair.en) : cleanTags(parsed?.hashtags, 32),
    hashtagsZh: paired ? hashtagPairs.map((pair) => pair.zh) : cleanTags(parsed?.hashtagsZh, 16),
    roast: paragraphize(cleanText(parsed?.roast, 1100)),
    roastZh: paragraphize(cleanText(parsed?.roastZh, 700)),
    tldr: cleanText(parsed?.tldr, 150, { short: true }),
    tldrZh: cleanText(parsed?.tldrZh, 88, { short: true }),
  };
  if (result.hashtags.length < 3 || result.hashtagsZh.length < 3
    || !result.roast || !result.roastZh || !result.tldr || !result.tldrZh) {
    throw new Error("AI roast response is missing required bilingual fields");
  }
  return result;
}

async function generateAiRoast(evidence, {
  apiKey = process.env.DEEPSEEK_API_KEY,
  baseUrl,
  model,
  provider = "deepseek",
  fetchImpl = globalThis.fetch,
  timeoutMs = 40_000,
  requestHeaders,
} = {}) {
  if (!apiKey) throw new Error("An API key is required for AI roast generation");
  if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable");
  const config = providerConfig(provider, {
    baseUrl: baseUrl || (provider === "deepseek" ? process.env.DEEPSEEK_BASE_URL : undefined),
    model: model || (provider === "deepseek" ? process.env.DEEPSEEK_MODEL : undefined),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${USER_INSTRUCTIONS}\n\nEVIDENCE JSON:\n${JSON.stringify(evidence)}`,
      },
    ];
    const request = requestForProvider(config, {
      apiKey,
      messages,
      temperature: 1.05,
      maxTokens: 1800,
    });
    const response = await fetchImpl(request.url, {
      ...request.options,
      headers: {
        ...request.options.headers,
        ...(requestHeaders || {}),
      },
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message
        || payload?.error?.status
        || `${config.id} request failed with HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    const result = validateRoastPayload(responseContent(config, payload));
    const cacheStatus = response.headers?.get?.("x-vibe-roast-cache");

    return {
      ...result,
      writer: {
        provider: config.id,
        model: payload?.model || config.model,
        evidence_schema_version: evidence?.schema_version || 1,
        ...(cacheStatus ? { cached: cacheStatus.toLowerCase() === "hit" } : {}),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  PROVIDERS,
  SYSTEM_PROMPT,
  USER_INSTRUCTIONS,
  generateAiRoast,
  providerConfig,
  requestForProvider,
  responseContent,
  validateRoastPayload,
  parseJsonPayload,
  paragraphize,
};
