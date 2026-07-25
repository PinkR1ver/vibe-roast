const CATEGORY_ORDER = [
  "planning",
  "debugging",
  "implementation",
  "refactor",
  "testing",
  "packaging",
  "explanation",
  "research",
  "ui_design",
  "workflow",
  "reference",
];

function analyzePrompts(prompts, { usefulLimit = 60 } = {}) {
  const categories = Object.fromEntries(
    CATEGORY_ORDER.map((name) => [name, { count: 0, examples: [] }]),
  );
  const usefulPrompts = [];
  const usefulForStats = [];
  const referencePrompts = [];
  let usefulCount = 0;
  let usefulCharacterCount = 0;
  let longPromptCount = 0;

  for (const prompt of prompts || []) {
    const text = String(prompt?.text || "").trim();
    if (!text) continue;

    const classification = classifyPrompt(text);
    const entry = {
      source: prompt.source || "unknown",
      timestamp: prompt.timestamp || null,
      text,
      category: classification.category,
      categories: classification.categories,
      usefulness: classification.usefulness,
      reasons: classification.reasons,
    };

    if (classification.useful) {
      usefulCount += 1;
      usefulCharacterCount += text.length;
      if (text.length >= 600) longPromptCount += 1;
      const weight = 1 / classification.categories.length;
      for (const category of classification.categories) {
        const bucket = categories[category];
        bucket.count = Number((bucket.count + weight).toFixed(4));
        if (bucket.examples.length < 3) bucket.examples.push(preview(entry));
      }
      usefulForStats.push({
        text: entry.text,
        source: entry.source,
        timestamp: entry.timestamp,
        categories: entry.categories,
      });
      if (usefulPrompts.length < usefulLimit) usefulPrompts.push(entry);
    } else {
      categories.reference.count += 1;
      if (categories.reference.examples.length < 3) categories.reference.examples.push(preview(entry));
      referencePrompts.push(entry);
    }
  }

  return {
    total_prompts: (prompts || []).length,
    useful_prompt_count: usefulCount,
    reference_prompt_count: referencePrompts.length,
    useful_ratio:
      prompts && prompts.length > 0 ? Number((usefulCount / prompts.length).toFixed(4)) : 0,
    average_useful_prompt_chars:
      usefulCount > 0 ? Math.round(usefulCharacterCount / usefulCount) : 0,
    long_prompt_ratio:
      usefulCount > 0 ? Number((longPromptCount / usefulCount).toFixed(4)) : 0,
    categories,
    useful_prompts: usefulPrompts,
    useful_for_stats: usefulForStats,
    reference_summary: summarizeReferences(referencePrompts),
  };
}

function classifyPrompt(text) {
  const normalized = text.toLowerCase();
  const codeScore = codeLikeScore(text);
  const logScore = logLikeScore(text);

  if (isSystemOrToolNoise(text)) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      categories: ["reference"],
      reasons: ["system_or_tool_noise"],
    };
  }

  if (logScore >= 3) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      categories: ["reference"],
      reasons: ["looks_like_error_or_log"],
    };
  }

  // Heavy pasted files / dumps — never treat as useful intent prompts.
  if (codeScore >= 4) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      categories: ["reference"],
      reasons: ["looks_like_pasted_code"],
    };
  }

  // Milder code blocks without enough natural-language intent.
  if (codeScore >= 3 && !hasSubstantialUserIntent(text)) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      reasons: ["looks_like_pasted_code"],
    };
  }

  const categories = inferCategories(normalized);
  return {
    useful: true,
    usefulness: "high",
    category: categories[0],
    categories,
    reasons: ["contains_user_intent"],
  };
}

function isSystemOrToolNoise(text) {
  const raw = String(text || "");
  if (/<system_notification>/i.test(raw)) return true;
  if (/^\s*<(?:system|tool_result|tool_call|agent_transcript)[\s>]/i.test(raw)) return true;
  if (/\bThe following task has finished\b/i.test(raw)) return true;
  if (/^\s*\[?(system|tool)\]?\s*:/i.test(raw)) return true;
  return false;
}

/** Intent outside fenced/code lines — avoids counting "IMPLEMENT" inside dumps. */
function hasSubstantialUserIntent(text) {
  const stripped = String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*(import|from|const|let|var|def|class|function|export|package|#include)\b.*$/gim, " ")
    .replace(/[{};=<>]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length < 12) return false;
  return hasIntentVerb(stripped.toLowerCase()) || /[\p{Script=Han}]{2,}/u.test(stripped);
}

function inferCategories(text) {
  const rules = [
    ["planning", /(方案|计划|架构|先不要写代码|brainstorm|plan|architecture)/i],
    ["debugging", /(bug|报错|错误|失败|修复|debug|error|exception|traceback|syntaxerror)/i],
    ["testing", /(测试|test|spec|回归|覆盖率|断言)/i],
    ["refactor", /(重构|refactor|抽象|拆分|整理)/i],
    ["packaging", /(打包|发布|npm|xpi|release|publish|build)/i],
    ["explanation", /(解释|为什么|讲一下|说明|explain|why)/i],
    ["research", /(查找|调研|搜索|资料|文档|research|search|look up)/i],
    ["ui_design", /(页面|布局|组件|交互|视觉|按钮|ui|ux|style|css|design)/i],
    ["workflow", /(workflow|流程|自动化|hook|mcp|skill|agent|instructions|system prompt)/i],
  ];
  const matched = rules.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  if (/(实现|编写|创建|新增|修改|开发|implement|create|add|write|code|update|build)/i.test(text)) {
    matched.push("implementation");
  }
  return [...new Set(matched.length > 0 ? matched : ["implementation"])];
}

function hasIntentVerb(text) {
  return /(帮我|请|我要|我想|实现|做|改|修|优化|设计|解释|分析|生成|add|fix|build|create|implement|explain|analyze|update|refactor)/i.test(
    text,
  );
}

function codeLikeScore(text) {
  let score = 0;
  const raw = String(text || "");
  if (/```/.test(raw)) score += 2;
  if (/\b(const|let|var|function|class|return|import|export|async|await|def|self\.|torch\.|nn\.)\b/.test(raw)) {
    score += 1;
  }
  if (/[{};]{2,}/.test(raw)) score += 1;
  if (/=>|<\/?[a-z][\s\S]*>/i.test(raw)) score += 1;
  const lines = raw.split(/\r?\n/);
  if (lines.length >= 8) score += 1;
  // Collapsed single-line dumps still look like code by density.
  if (lines.length < 8 && raw.length > 400) {
    const codeTokens = (raw.match(/\b(def|class|import|return|const|self|torch|nn|plt)\b/gi) || []).length;
    if (codeTokens >= 6) score += 2;
  }
  if (/[A-Za-z0-9_$]+\([^)]*\)/.test(raw)) score += 1;
  return score;
}

function logLikeScore(text) {
  let score = 0;
  if (/(syntaxerror|typeerror|referenceerror|traceback|exception|stack trace)/i.test(text)) score += 2;
  if (/\bat .+:\d+:\d+/.test(text)) score += 1;
  if (/(warning|error|failed|missing resource|deprecated)/i.test(text)) score += 1;
  if (text.split(/\r?\n/).length >= 6 && /:\d+:\d+/.test(text)) score += 1;
  return score;
}

function preview(entry) {
  return {
    source: entry.source,
    timestamp: entry.timestamp,
    text: entry.text.slice(0, 180),
  };
}

function summarizeReferences(referencePrompts) {
  const signals = emptyReferenceSignals();
  for (const prompt of referencePrompts) {
    addReferenceSignals(signals, prompt.text);
  }

  return {
    count: referencePrompts.length,
    code_or_log_count: referencePrompts.length,
    signals: finalizeReferenceSignals(signals),
    examples: referencePrompts.slice(0, 5).map(preview),
  };
}

function emptyReferenceSignals() {
  return {
    languages: new Map(),
    file_extensions: new Map(),
    error_types: new Map(),
    files: new Map(),
  };
}

function addReferenceSignals(signals, text) {
  const promptLanguages = new Set();
  for (const language of extractFencedLanguages(text)) {
    promptLanguages.add(normalizeLanguage(language));
  }

  for (const filePath of extractFilePaths(text)) {
    const ext = fileExtension(filePath);
    if (ext && !languageFromExtension(ext)) continue;
    signals.files.set(filePath, { path: filePath, extension: ext || null });
    if (ext) {
      inc(signals.file_extensions, ext);
      const language = languageFromExtension(ext);
      if (language) promptLanguages.add(language);
    }
  }

  for (const language of promptLanguages) inc(signals.languages, language);

  for (const errorType of extractErrorTypes(text)) {
    inc(signals.error_types, errorType);
  }
}

function extractFencedLanguages(text) {
  const out = [];
  const re = /```([A-Za-z0-9_+.-]+)/g;
  let match;
  while ((match = re.exec(text))) out.push(match[1]);
  return out;
}

function extractFilePaths(text) {
  const out = new Set();
  const re =
    /(?:^|\s|["'`(])((?:\.{1,2}\/|\/|[A-Za-z0-9_-]+\/)?[A-Za-z0-9_@./-]+\.(?:[A-Za-z0-9]{1,8}))(?:[:\s)"'`]|$)/g;
  let match;
  while ((match = re.exec(text))) {
    const candidate = match[1].replace(/[),.;]+$/g, "");
    if (candidate.includes("://")) continue;
    if (/^\d+\.\d+$/.test(candidate)) continue;
    out.add(candidate);
  }
  return Array.from(out).slice(0, 80);
}

function extractErrorTypes(text) {
  const out = [];
  const re =
    /\b(SyntaxError|TypeError|ReferenceError|RangeError|ImportError|ModuleNotFoundError|JSONDecodeError|AssertionError|Error|Exception|Traceback)\b/g;
  let match;
  while ((match = re.exec(text))) out.push(match[1]);
  return out;
}

function fileExtension(filePath) {
  const match = String(filePath).match(/(\.[A-Za-z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function languageFromExtension(ext) {
  return (
    {
      ".js": "javascript",
      ".jsx": "jsx",
      ".ts": "typescript",
      ".tsx": "tsx",
      ".py": "python",
      ".rb": "ruby",
      ".go": "go",
      ".rs": "rust",
      ".java": "java",
      ".kt": "kotlin",
      ".swift": "swift",
      ".css": "css",
      ".scss": "scss",
      ".html": "html",
      ".json": "json",
      ".toml": "toml",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".md": "markdown",
      ".sql": "sql",
      ".sh": "shell",
      ".ftl": "fluent",
    }[ext] || null
  );
}

function normalizeLanguage(language) {
  const raw = String(language || "").toLowerCase();
  return (
    {
      js: "javascript",
      mjs: "javascript",
      cjs: "javascript",
      ts: "typescript",
      py: "python",
      sh: "shell",
      bash: "shell",
    }[raw] || raw
  );
}

function inc(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function finalizeReferenceSignals(signals) {
  return {
    languages: mapToObject(signals.languages),
    file_extensions: mapToObject(signals.file_extensions),
    error_types: mapToObject(signals.error_types),
    files: Array.from(signals.files.values()).slice(0, 40),
  };
}

function mapToObject(map) {
  return Object.fromEntries(
    Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

module.exports = { analyzePrompts, classifyPrompt, inferCategories };
