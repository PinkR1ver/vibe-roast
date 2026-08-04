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
      artifact_origin: classification.artifact_origin,
      artifact_kinds: classification.artifact_kinds,
    };

    if (classification.useful) {
      const intentText = classification.intent_text || text;
      usefulCount += 1;
      usefulCharacterCount += intentText.length;
      if (intentText.length >= 600) longPromptCount += 1;
      const weight = 1 / classification.categories.length;
      for (const category of classification.categories) {
        const bucket = categories[category];
        bucket.count = Number((bucket.count + weight).toFixed(4));
        if (bucket.examples.length < 3) bucket.examples.push(preview(entry));
      }
      usefulForStats.push({
        text: classification.intent_text || entry.text,
        source: entry.source,
        timestamp: entry.timestamp,
        categories: entry.categories,
      });
      if (usefulPrompts.length < usefulLimit) usefulPrompts.push(entry);
    } else {
      categories.reference.count += 1;
      if (categories.reference.examples.length < 3)
        categories.reference.examples.push(preview(entry));
      referencePrompts.push(entry);
    }
  }

  return {
    total_prompts: (prompts || []).length,
    useful_prompt_count: usefulCount,
    reference_prompt_count: referencePrompts.length,
    useful_ratio:
      prompts && prompts.length > 0
        ? Number((usefulCount / prompts.length).toFixed(4))
        : 0,
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
  if (isSystemOrToolNoise(text)) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      categories: ["reference"],
      reasons: ["system_or_tool_noise"],
      artifact_origin: "app_owned",
      artifact_kinds: [],
      intent_text: "",
    };
  }

  const artifacts = artifactEvidence(text);
  const intentText = textOutsideArtifacts(text, artifacts);
  const origin =
    artifacts.kinds.length > 0 ? inferArtifactOrigin(intentText) : null;

  // Large structured material has ambiguous provenance. Keep only request prose
  // with explicit provenance or an inherently reference-shaped attachment.
  if (artifacts.strong) {
    if (
      hasSubstantialUserIntent(intentText) &&
      canRetainArtifactIntent(artifacts, origin)
    ) {
      const categories = inferCategories(intentText.toLowerCase());
      return {
        useful: true,
        usefulness: "high",
        category: categories[0],
        categories,
        reasons: [
          origin === "user_authored"
            ? "user_authored_artifact_with_intent"
            : origin === "external_or_generated"
              ? "user_intent_with_external_reference"
              : "user_intent_with_attached_reference",
        ],
        artifact_origin: origin,
        artifact_kinds: artifacts.kinds,
        intent_text: intentText,
      };
    }
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      categories: ["reference"],
      reasons: [referenceReason(artifacts, origin)],
      artifact_origin: origin,
      artifact_kinds: artifacts.kinds,
      intent_text: intentText,
    };
  }

  if (
    artifacts.moderate &&
    (!hasSubstantialUserIntent(intentText) ||
      !canRetainArtifactIntent(artifacts, origin))
  ) {
    return {
      useful: false,
      usefulness: "reference",
      category: "reference",
      categories: ["reference"],
      reasons: [referenceReason(artifacts, origin)],
      artifact_origin: origin,
      artifact_kinds: artifacts.kinds,
      intent_text: intentText,
    };
  }

  const categoryText = artifacts.kinds.length > 0 ? intentText || text : text;
  const categories = inferCategories(categoryText.toLowerCase());
  return {
    useful: true,
    usefulness: "high",
    category: categories[0],
    categories,
    reasons: [
      artifacts.kinds.length > 0
        ? artifactIntentReason(origin)
        : "contains_user_intent",
    ],
    artifact_origin: origin,
    artifact_kinds: artifacts.kinds,
    intent_text: categoryText,
  };
}

function isSystemOrToolNoise(text) {
  const raw = String(text || "");
  if (/<system_notification>/i.test(raw)) return true;
  if (
    /^\s*<(?:system|tool_result|tool_call|agent_transcript|recommended_plugins|environment_context|app-context|permissions|collaboration_mode|apps_instructions|plugins_instructions|skills_instructions)[\s>]/i.test(
      raw,
    )
  ) {
    return true;
  }
  if (/^\s*#\s*AGENTS\.md instructions\b/i.test(raw)) return true;
  if (/^\s*<INSTRUCTIONS>[\s\S]*<\/INSTRUCTIONS>\s*$/i.test(raw)) return true;
  if (/^\s*You are (?:ChatGPT|Codex),?\b/i.test(raw)) return true;
  if (
    /Here is a list of plugins that are available but not installed/i.test(raw)
  )
    return true;
  if (/\bThe following task has finished\b/i.test(raw)) return true;
  if (/^\s*\[?(system|tool)\]?\s*:/i.test(raw)) return true;
  return false;
}

/** Keep request prose while removing common attached-material line shapes. */
function textOutsideArtifacts(text, artifacts = artifactEvidence(text)) {
  let stripped = String(text || "").replace(/```[\s\S]*?```/g, " ");
  if (artifacts.kinds.includes("diff")) {
    stripped = stripped
      .replace(
        /^\s*(?:diff --git|index [a-f0-9.]+|@@ .* @@|[+-]{3} [ab]\/).*$\n?/gim,
        " ",
      )
      .replace(/^\s*[+-](?![+-]).*$\n?/gm, " ");
  }
  if (artifacts.kinds.includes("terminal_output")) {
    stripped = stripTerminalBlocks(stripped);
  }
  return stripped
    .replace(
      /^\s*Traceback \(most recent call last\):[\s\S]*?^\s*[A-Za-z]+Error:.*$\n?/gim,
      " ",
    )
    .replace(
      /^\s*(?:at .+:\d+:\d+|Traceback \(most recent call last\):|File ["'].+["'], line \d+.*|[A-Za-z]+Error:).*$\n?/gim,
      " ",
    )
    .replace(
      /^\s*(?:[$%]\s+\S+|npm (?:ERR!|WARN)|ELIFECYCLE|Process exited with code).*$\n?/gim,
      " ",
    )
    .replace(
      /^\s*(?:import\s+(?:["'{*]|[\w$]+\s+from\b).*|from\s+\S+\s+import\b.*|(?:const|let|var)\s+\w+\s*=.*|(?:def|class|(?:async\s+)?function)\s+\w+\s*[:({].*|export\s+(?:default\b|(?:const|let|var|class|function)\b).*|package\s+[\w.]+\s*;|#include\s*[<"].*|(?:if|for|while|catch)\s*\(.*|(?:try|else)\s*\{.*|return\s+(?:(?:await|new)\s+)?(?:[A-Za-z_$][\w$]*(?:[.(]|\s*=>)|["'[{\d]|true\b|false\b|null\b).*|throw\s+new\s+\w+\s*\(.*|[}\])]+\s*;?)$/gim,
      " ",
    )
    .replace(
      /^\s*(?:[A-Za-z_$][\w$]*\.)?[A-Za-z_$][\w$]*\([^)]*\)\s*;?\s*$/gm,
      " ",
    )
    .replace(
      /^\s*["']?[\w.-]+["']?\s*[:=]\s*(?:["'[{\d]|true\b|false\b|null\b).*$\n?/gim,
      " ",
    )
    .replace(/[{};=<>]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Intent outside fenced/code lines — avoids counting "IMPLEMENT" inside dumps. */
function hasSubstantialUserIntent(text) {
  const stripped = String(text || "").trim();
  if (hasQuestionIntent(stripped)) return true;
  if (stripped.length < 12) return false;
  return hasIntentVerb(stripped.toLowerCase());
}

function stripTerminalBlocks(text) {
  const kept = [];
  let inTerminal = false;
  let sawBlank = false;

  for (const line of String(text || "").split(/\r?\n/)) {
    if (/^\s*[$%]\s+\S/.test(line)) {
      inTerminal = true;
      sawBlank = false;
      continue;
    }
    if (!inTerminal) {
      kept.push(line);
      continue;
    }
    if (!line.trim()) {
      sawBlank = true;
      continue;
    }
    if (
      hasDirectRequestIntent(line) ||
      hasQuestionIntent(line) ||
      (sawBlank && hasIntentVerb(line.toLowerCase()))
    ) {
      inTerminal = false;
      sawBlank = false;
      kept.push(line);
      continue;
    }
    sawBlank = false;
    if (/^\s*(?:ELIFECYCLE|Process exited with code)\b/i.test(line)) {
      inTerminal = false;
    }
  }

  return kept.join("\n");
}

function hasQuestionIntent(text) {
  const raw = String(text || "").trim();
  return (
    /[?？]/u.test(raw) ||
    /^\s*(?:why|how|what|where|when|which|who|can|could|would|should|does|do|did|is|are)\b/i.test(
      raw,
    ) ||
    /(?:为什么|为何|怎么回事|怎么|怎样|如何|哪里|哪儿|什么问题|是否|能否|可不可以|有没有)/u.test(
      raw,
    )
  );
}

function hasDirectRequestIntent(text) {
  const raw = String(text || "").trim();
  return /^(?:(?:please|kindly)\s+)?(?:add|fix|build|create|implement|explain|analyze|summarize|update|refactor|write|review)\b(?!\s+(?:available|complete|completed|failed|finished|successful|succeeded)\b)|^(?:请|帮我|麻烦|实现|修改|修复|优化|设计|解释|分析|生成)/iu.test(
    raw,
  );
}

function inferArtifactOrigin(text) {
  const raw = String(text || "");
  if (
    /(?:AI|模型|助手|工具|脚手架|模板).{0,16}(?:生成|产出|导出)|(?:复制|粘贴|摘录|引用|终端输出|运行结果|报错日志|第三方代码)|(?:generated|produced|exported) by (?:an? )?(?:AI|model|tool)|(?:copied|pasted|quoted|generated) (?:code|config|output|diff|text)|(?:terminal|command|test) output/i.test(
      raw,
    )
  ) {
    return "external_or_generated";
  }
  if (
    /(?:我(?:自己|刚刚?|已经)?写的|我写了|这是我(?:自己)?(?:写|实现|整理|配置)的|下面是我(?:自己)?写的|我的(?:这段|以下)?(?:代码|配置|查询|脚本|补丁|文档|SQL)|(?:code|config|query|script|patch|spec) i (?:wrote|implemented|authored)|i (?:wrote|implemented|authored) (?:this|the) (?:code|config|query|script|patch|spec)|my (?:javascript|js|python|code|config|query|script|patch|spec))/i.test(
      raw,
    )
  ) {
    return "user_authored";
  }
  return "unverified";
}

function canRetainArtifactIntent(artifacts, origin) {
  if (origin !== "unverified") return true;
  if (
    artifacts.kinds.some((kind) =>
      ["prompt_template", "opaque_text"].includes(kind),
    )
  ) {
    return false;
  }
  return artifacts.kinds.length > 0;
}

function artifactIntentReason(origin) {
  if (origin === "user_authored") return "user_authored_artifact_with_intent";
  if (origin === "external_or_generated")
    return "user_intent_with_external_reference";
  return "user_intent_with_attached_reference";
}

function inferCategories(text) {
  const rules = [
    [
      "planning",
      /(?:方案|计划|架构|先不要写代码|\b(?:brainstorm|plan|architecture)\b)/i,
    ],
    [
      "debugging",
      /(?:bug|报错|错误|失败|修复|\b(?:debug|error|exception|traceback|syntaxerror)\b)/i,
    ],
    [
      "testing",
      /(?:测试|回归|覆盖率|断言|\b(?:tests?|testing|tested|specs?)\b)/i,
    ],
    ["refactor", /(?:重构|抽象|拆分|整理|\brefactor\b)/i],
    ["packaging", /(?:打包|发布|\b(?:npm|xpi|release|publish|build)\b)/i],
    ["explanation", /(?:解释|为什么|讲一下|说明|\b(?:explain|why)\b)/i],
    [
      "research",
      /(?:查找|调研|搜索|资料|文档|\b(?:research|search|look up)\b)/i,
    ],
    [
      "ui_design",
      /(?:页面|布局|组件|交互|视觉|按钮|\b(?:ui|ux|style|css|design)\b)/i,
    ],
    [
      "workflow",
      /(?:流程|自动化|\b(?:workflow|hook|mcp|skill|agent|instructions|system prompt)\b)/i,
    ],
  ];
  const matched = rules
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);
  if (
    /(?:实现|编写|创建|新增|修改|开发|\b(?:implement|create|add|write|code|update|build)\b)/i.test(
      text,
    )
  ) {
    matched.push("implementation");
  }
  return [...new Set(matched.length > 0 ? matched : ["implementation"])];
}

function hasIntentVerb(text) {
  return /(?:帮我|请|我要|我想|实现|做|改|修|优化|设计|解释|分析|生成|\b(?:add|fix|build|create|implement|explain|analyze|summarize|update|refactor|write|review)\b)/i.test(
    text,
  );
}

function codeLikeScore(text) {
  let score = 0;
  const raw = String(text || "");
  if (/```/.test(raw)) score += 2;
  if (
    /\b(const|let|var|function|class|return|import|export|async|await|def|self\.|torch\.|nn\.)\b/.test(
      raw,
    )
  ) {
    score += 1;
  }
  if (/[{};]{2,}/.test(raw)) score += 1;
  if (/=>|<\/?[a-z][\s\S]*>/i.test(raw)) score += 1;
  const lines = raw.split(/\r?\n/);
  if (lines.length >= 8) score += 1;
  // Collapsed single-line dumps still look like code by density.
  if (lines.length < 8 && raw.length > 400) {
    const codeTokens = (
      raw.match(/\b(def|class|import|return|const|self|torch|nn|plt)\b/gi) || []
    ).length;
    if (codeTokens >= 6) score += 2;
  }
  const codeLines = (
    raw.match(
      /^\s*(?:(?:import|from|const|let|var|def|class|function|export|return|if|for|while|try|catch)\b|[.#]?[A-Za-z_$][\w$:.[]\]#-]*\s*\{|[\w-]+\s*:\s*[^:]+;?\s*$|<\/?[A-Za-z][^>]*>)/gim,
    ) || []
  ).length;
  if (codeLines >= 2) score += 2;
  if (/[A-Za-z0-9_$]+\([^)]*\)/.test(raw)) score += 1;
  return score;
}

function logLikeScore(text) {
  let score = 0;
  if (
    /(syntaxerror|typeerror|referenceerror|traceback|exception|stack trace)/i.test(
      text,
    )
  )
    score += 2;
  if (/\bat .+:\d+:\d+/.test(text)) score += 1;
  if (/(warning|error|failed|missing resource|deprecated)/i.test(text))
    score += 1;
  if (text.split(/\r?\n/).length >= 6 && /:\d+:\d+/.test(text)) score += 1;
  return score;
}

function artifactEvidence(text) {
  const raw = String(text || "");
  const code = codeLikeScore(raw);
  const log = logLikeScore(raw);
  const diff = diffLikeScore(raw);
  const config = configLikeScore(raw);
  const terminal = terminalLikeScore(raw);
  const template = promptTemplateLikeScore(raw);
  const opaque = opaqueTextLikeScore(raw);
  const kinds = [];

  if (code >= 3) kinds.push("code");
  if (config >= 3) kinds.push("config");
  if (diff >= 3) kinds.push("diff");
  if (log >= 3) kinds.push("log");
  if (terminal >= 3) kinds.push("terminal_output");
  if (template >= 3) kinds.push("prompt_template");
  if (opaque >= 3) kinds.push("opaque_text");

  return {
    kinds,
    strong:
      code >= 4 ||
      config >= 4 ||
      diff >= 4 ||
      log >= 3 ||
      terminal >= 4 ||
      template >= 4 ||
      opaque >= 4,
    moderate: kinds.length > 0,
  };
}

function diffLikeScore(text) {
  let score = 0;
  if (/^diff --git /m.test(text)) score += 2;
  if (/^@@ .+ @@/m.test(text)) score += 1;
  if (/^(?:---|\+\+\+) [ab]\//m.test(text)) score += 1;
  if ((text.match(/^[+-](?![+\-\s]).+$/gm) || []).length >= 4) score += 2;
  return score;
}

function configLikeScore(text) {
  let score = 0;
  if (/```(?:json|jsonc|ya?ml|toml|ini|env|xml)\b/i.test(text)) score += 4;
  const trimmed = String(text || "").trim();
  if (/^[{[]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") score += 4;
    } catch {
      // Invalid JSON continues through the structural checks below.
    }
  }
  const keyValueLines = (
    text.match(
      /^\s*["']?[\w.-]+["']?\s*[:=]\s*(?:["'[{\d]|true\b|false\b|null\b).+$/gim,
    ) || []
  ).length;
  if (keyValueLines >= 4) score += 3;
  if (keyValueLines >= 10) score += 1;
  return score;
}

function terminalLikeScore(text) {
  let score = 0;
  const promptLines = (text.match(/^\s*[$%]\s+\S.+$/gm) || []).length;
  if (promptLines >= 1) score += 3;
  if (promptLines >= 3) score += 1;
  if (
    /(?:npm ERR!|ELIFECYCLE|Process exited with code|command not found|Tests:\s+\d+)/i.test(
      text,
    )
  )
    score += 2;
  if ((text.match(/^\s*(?:PASS|FAIL|WARN|ERROR|INFO)\b/gm) || []).length >= 3)
    score += 2;
  return score;
}

function promptTemplateLikeScore(text) {
  let score = 0;
  if (/^\s*(?:system|developer) prompt\s*:/im.test(text)) score += 2;
  if (/^\s*You are (?:an?|the)\b/im.test(text)) score += 2;
  const sections = (
    text.match(
      /^\s*#{1,3}\s*(?:context|instructions?|constraints?|rules?|output format|examples?|任务|指令|约束|输出格式)\s*$/gim,
    ) || []
  ).length;
  if (sections >= 2) score += 2;
  if (sections >= 4) score += 2;
  if (
    /\{\{[\w.-]+\}\}|<PLACEHOLDER>|\[(?:INSERT|PLACEHOLDER)[^\]]*\]/i.test(text)
  )
    score += 1;
  return score;
}

function opaqueTextLikeScore(text) {
  const raw = String(text || "");
  if (/[A-Za-z0-9+/]{500,}={0,2}/.test(raw)) return 4;
  const longestLine = raw
    .split(/\r?\n/)
    .reduce((max, line) => Math.max(max, line.length), 0);
  return longestLine >= 1500 &&
    (raw.match(/\s/g) || []).length / Math.max(1, raw.length) < 0.08
    ? 4
    : 0;
}

function referenceReason(artifacts, origin) {
  if (origin === "user_authored")
    return "user_authored_artifact_without_intent";
  if (origin === "external_or_generated")
    return "external_reference_without_intent";
  if (artifacts.kinds.includes("prompt_template"))
    return "looks_like_prompt_template";
  if (
    artifacts.kinds.includes("log") ||
    artifacts.kinds.includes("terminal_output")
  ) {
    return "looks_like_error_or_log";
  }
  if (artifacts.kinds.length === 1 && artifacts.kinds[0] === "code") {
    return "unverified_code_origin";
  }
  return "unverified_artifact_origin";
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
    for (const kind of prompt.artifact_kinds || [])
      inc(signals.artifact_kinds, kind);
  }

  return {
    count: referencePrompts.length,
    artifact_count: referencePrompts.filter(
      (prompt) => prompt.artifact_kinds?.length > 0,
    ).length,
    code_or_log_count: referencePrompts.filter((prompt) =>
      prompt.artifact_kinds?.some((kind) =>
        ["code", "log", "terminal_output"].includes(kind),
      ),
    ).length,
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
    artifact_kinds: new Map(),
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
    artifact_kinds: mapToObject(signals.artifact_kinds),
    files: Array.from(signals.files.values()).slice(0, 40),
  };
}

function mapToObject(map) {
  return Object.fromEntries(
    Array.from(map.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
}

module.exports = { analyzePrompts, classifyPrompt, inferCategories };
