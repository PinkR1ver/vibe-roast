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
  const referencePrompts = [];
  let usefulCount = 0;

  for (const prompt of prompts || []) {
    const text = String(prompt?.text || "").trim();
    if (!text) continue;

    const classification = classifyPrompt(text);
    const entry = {
      source: prompt.source || "unknown",
      timestamp: prompt.timestamp || null,
      text,
      category: classification.category,
      usefulness: classification.usefulness,
      reasons: classification.reasons,
    };

    const bucket = categories[classification.category] || categories.reference;
    bucket.count += 1;
    if (bucket.examples.length < 3) {
      bucket.examples.push(preview(entry));
    }

    if (classification.useful) {
      usefulCount += 1;
      if (usefulPrompts.length < usefulLimit) usefulPrompts.push(entry);
    } else {
      referencePrompts.push(entry);
    }
  }

  return {
    total_prompts: (prompts || []).length,
    useful_prompt_count: usefulCount,
    reference_prompt_count: referencePrompts.length,
    useful_ratio:
      prompts && prompts.length > 0 ? Number((usefulCount / prompts.length).toFixed(4)) : 0,
    categories,
    useful_prompts: usefulPrompts,
    reference_summary: summarizeReferences(referencePrompts),
  };
}

function classifyPrompt(text) {
  const normalized = text.toLowerCase();
  const codeScore = codeLikeScore(text);
  const logScore = logLikeScore(text);

  if (logScore >= 3) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      reasons: ["looks_like_error_or_log"],
    };
  }

  if (codeScore >= 3 && !hasIntentVerb(normalized)) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      reasons: ["looks_like_pasted_code"],
    };
  }

  const category = inferCategory(normalized);
  return {
    useful: true,
    usefulness: "high",
    category,
    reasons: ["contains_user_intent"],
  };
}

function inferCategory(text) {
  if (/(方案|计划|设计|架构|先不要写代码|brainstorm|plan|design|architecture)/i.test(text)) {
    return "planning";
  }
  if (/(bug|报错|错误|失败|修复|debug|error|exception|traceback|syntaxerror)/i.test(text)) {
    return "debugging";
  }
  if (/(测试|test|spec|回归|覆盖率|断言)/i.test(text)) return "testing";
  if (/(重构|refactor|抽象|拆分|整理)/i.test(text)) return "refactor";
  if (/(打包|发布|npm|xpi|release|publish|build)/i.test(text)) return "packaging";
  if (/(解释|为什么|讲一下|说明|explain|why)/i.test(text)) return "explanation";
  if (/(查找|调研|搜索|资料|文档|research|search|look up)/i.test(text)) return "research";
  if (/(页面|布局|组件|交互|视觉|按钮|ui|ux|style|css)/i.test(text)) return "ui_design";
  if (/(workflow|流程|自动化|hook|mcp|skill|agent|instructions|system prompt)/i.test(text)) {
    return "workflow";
  }
  return "implementation";
}

function hasIntentVerb(text) {
  return /(帮我|请|我要|我想|实现|做|改|修|优化|设计|解释|分析|生成|add|fix|build|create|implement|explain|analyze|update|refactor)/i.test(
    text,
  );
}

function codeLikeScore(text) {
  let score = 0;
  if (/```/.test(text)) score += 2;
  if (/\b(const|let|var|function|class|return|import|export|async|await)\b/.test(text)) score += 1;
  if (/[{};]{2,}/.test(text)) score += 1;
  if (/=>|<\/?[a-z][\s\S]*>/i.test(text)) score += 1;
  if (text.split(/\r?\n/).length >= 8) score += 1;
  if (/[A-Za-z0-9_$]+\([^)]*\)/.test(text)) score += 1;
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

module.exports = { analyzePrompts, classifyPrompt };
