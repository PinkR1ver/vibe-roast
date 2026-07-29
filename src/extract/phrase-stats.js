const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "you",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "not",
  "but",
  "all",
  "can",
  "her",
  "his",
  "him",
  "she",
  "they",
  "them",
  "their",
  "what",
  "when",
  "where",
  "which",
  "who",
  "will",
  "would",
  "could",
  "should",
  "into",
  "out",
  "our",
  "your",
  "about",
  "then",
  "than",
  "also",
  "just",
  "like",
  "some",
  "such",
  "only",
  "other",
  "over",
  "after",
  "before",
  "if",
  "to",
  "or",
  "in",
  "of",
  "is",
  "it",
  "on",
  "as",
  "be",
  "by",
  "at",
  "an",
  "we",
  "me",
  "my",
  "do",
  "does",
  "did",
  "so",
  "no",
  "yes",
  "up",
  "down",
  "true",
  "false",
  "none",
  "null",
  "self",
  "def",
  "class",
  "return",
  "import",
  "from",
  "const",
  "let",
  "var",
  "function",
  "一个",
  "一下",
  "这个",
  "然后",
  "可以",
  "帮我",
  "class",
  "classname",
  "dashboard",
  "div",
  "file",
  "files",
  "path",
  "paths",
  "key",
  "keys",
  "id",
  "ids",
  "model",
  "models",
  "name",
  "names",
  "provider",
  "providers",
  "selected",
  "source",
  "sources",
  "text",
  "usage",
  "breakdown",
  "active",
  "blah",
  "clipboard",
  "codex",
  "claude",
  "config",
  "cursor",
  "range",
  "gemini",
  "json",
  "mentioned",
  "opencode",
  "png",
  "pot",
  "request",
  "staff",
  "user",
  "world",
  "patch",
  "const",
  "let",
  "var",
  "function",
  "return",
  "import",
  "export",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "if",
  "else",
  "for",
  "while",
  "map",
  "filter",
  "props",
  "state",
  "style",
  "class",
  "classname",
  "border",
  "rounded",
  "flex",
  "grid",
  "gray",
  "white",
  "black",
  "bg",
  "px",
  "py",
  "mt",
  "mb",
  "oai",
  "md",
  "use",
  "using",
  "used",
  "make",
  "made",
  "get",
  "got",
  "need",
  "needs",
  "please",
  "really",
  "well",
  "look",
  "looks",
  "good",
  "okay",
  "ok",
  "project",
  "projects",
  "http",
  "https",
  "www",
  "com",
]);

const HAN_STOP_WORDS = new Set([
  "还是",
  "现在",
  "这个",
  "这些",
  "那个",
  "那些",
  "这里",
  "里面",
  "一下",
  "一些",
  "一个",
  "然后",
  "以及",
  "可以",
  "需要",
  "帮我",
  "我们",
  "你们",
  "他们",
  "什么",
  "怎么",
  "为什么",
  "已经",
  "还有",
  "进行",
  "相关",
  "部分",
  "整体",
  "目前",
  "但是",
  "其实",
  "所以",
  "同时",
  "直接",
  "开始",
  "时候",
  "情况",
  "内容",
  "问题",
  "文件",
  "没有",
  "不要",
  "使用",
  "显示",
  "看看",
  "我的",
  "你的",
  "就好",
  "这样",
  "做的",
  "界面",
  "检查",
  "就是",
  "不用",
  "觉得",
  "说明",
  "效果",
  "一点",
  "位置",
  "而是",
  "放到",
  "加入",
  "之后",
  "最后",
  "下面",
  "感觉",
  "因为",
  "生成",
  "其次",
  "直接",
  "重新",
  "继续",
  "应该",
  "知道",
  "后面",
  "出来",
  "很多",
  "完全",
  "其他",
  "自己",
  "结果",
  "所有",
  "也要",
  "选择",
  "具体",
  "好了",
  "这种",
  "不对",
  "好的",
  "根据",
  "当前",
  "整个",
  "不太",
  "中间",
  "重要",
  "对应",
  "或者",
  "理解",
  "上面",
  "也是",
  "不同",
  "一致",
  "比如",
  "进去",
  "全部",
  "那边",
  "进来",
  "每次",
  "考虑",
  "都要",
]);

// Intl.Segmenter is deliberately conservative around short developer terms
// ("动效" may become "动" + "效"). This compact vocabulary restores common
// concepts without shipping a large language-specific tokenizer.
const KNOWN_HAN_TERMS = [
  "人工智能",
  "供应商",
  "提示词",
  "工作流",
  "移动端",
  "桌面端",
  "深色模式",
  "浅色模式",
  "用户体验",
  "响应式",
  "可访问性",
  "自动化",
  "数据库",
  "代码块",
  "回归测试",
  "单元测试",
  "集成测试",
  "错误日志",
  "词云",
  "动效",
  "动画",
  "重构",
  "优化",
  "页面",
  "组件",
  "布局",
  "设计",
  "逻辑",
  "功能",
  "测试",
  "回归",
  "错误",
  "修复",
  "解释",
  "方案",
  "架构",
  "数据",
  "模型",
  "代码",
  "发布",
  "构建",
  "性能",
  "交互",
  "视觉",
  "按钮",
  "卡片",
  "主题",
  "算法",
  "检测",
  "代理",
  "文档",
  "接口",
  "服务",
  "缓存",
  "登录",
  "发票",
  "电子",
  "胶囊",
];

const CONCEPT_GROUPS = [
  ["motion", ["motion", "animation", "animations", "animated", "动效", "动画"]],
  ["testing", ["testing", "test", "tests", "测试"]],
  ["refactor", ["refactor", "refactoring", "重构"]],
  ["debugging", ["debugging", "debug", "bug", "bugs", "调试"]],
  ["design", ["design", "designing", "ui", "ux", "设计"]],
  ["performance", ["performance", "perf", "性能"]],
  ["workflow", ["workflow", "workflows", "agent", "agents", "工作流"]],
  ["prompt", ["prompt", "prompts", "prompting", "提示词"]],
  ["component", ["component", "components", "组件"]],
  ["layout", ["layout", "layouts", "布局"]],
  ["model", ["model", "models", "模型"]],
];

const CONCEPT_BY_TERM = new Map(
  CONCEPT_GROUPS.flatMap(([concept, terms]) => terms.map((term) => [term, `concept:${concept}`])),
);
const CATEGORY_BY_CONCEPT = new Map([
  ["concept:testing", "category:testing"],
  ["concept:refactor", "category:refactor"],
  ["concept:debugging", "category:debugging"],
  ["concept:design", "category:ui_design"],
  ["concept:workflow", "category:workflow"],
]);
const VIBE_ASCII_TERMS = new Set([
  "api",
  "branch",
  "build",
  "canvas",
  "cli",
  "commit",
  "css",
  "deploy",
  "deployment",
  "frontend",
  "backend",
  "git",
  "github",
  "html",
  "javascript",
  "merge",
  "mcp",
  "node",
  "npm",
  "page",
  "plugin",
  "pr",
  "prompt",
  "push",
  "react",
  "release",
  "repo",
  "server",
  "skill",
  "sql",
  "sqlite",
  "swift",
  "swiftui",
  "token",
  "typescript",
  "vite",
  "zsh",
]);

function wordFrequencies(prompts, { limit = 30 } = {}) {
  return wordFrequenciesFromRecords(wordCloudRecords(prompts), { limit });
}

function wordCloudRecords(prompts = []) {
  return prompts.map((prompt) => {
    const cloudText = promptTextForCloud(prompt.text);
    const terms = tokenize(cloudText);
    const byConcept = new Map();
    for (const term of terms) {
      const key = CONCEPT_BY_TERM.get(term) || `term:${term}`;
      const acronym = isAcronymUse(term, cloudText);
      const displayTerm = acronym ? term.toUpperCase() : term;
      const existing = byConcept.get(key) || {
        key,
        kind: "term",
        vibe: false,
        acronym: false,
        variants: {},
      };
      existing.vibe = existing.vibe || isVibeCodingTerm(term);
      existing.acronym = existing.acronym || acronym;
      existing.variants[displayTerm] = (existing.variants[displayTerm] || 0) + 1;
      byConcept.set(key, existing);
    }
    for (const category of prompt.categories || []) {
      if (category === "implementation") continue;
      const key = `category:${category}`;
      byConcept.set(key, {
        key,
        kind: "category",
        vibe: true,
        acronym: false,
        variants: { [category]: 1 },
      });
    }
    return {
      source: prompt.source || "unknown",
      timestamp: prompt.timestamp || null,
      concepts: [...byConcept.values()],
    };
  });
}

function wordFrequenciesFromRecords(records = [], { limit = 30, vibeOnly = false } = {}) {
  const concepts = new Map();
  for (const record of records) {
    for (const item of record.concepts || []) {
      const key = item.key;
      const concept = concepts.get(key) || {
        key,
        kind: item.kind || "term",
        vibe: Boolean(item.vibe),
        count: 0,
        prompt_count: 0,
        variants: new Map(),
      };
      concept.vibe = concept.vibe || Boolean(item.vibe);
      let conceptCount = 0;
      for (const [term, rawCount] of Object.entries(item.variants || {})) {
        const count = Math.max(0, Number(rawCount) || 0);
        if (count === 0) continue;
        const variant = concept.variants.get(term) || { count: 0, prompt_count: 0 };
        conceptCount += count;
        variant.count += count;
        variant.prompt_count += 1;
        concept.variants.set(term, variant);
      }
      if (conceptCount === 0) continue;
      concept.count += conceptCount;
      concept.prompt_count += 1;
      concepts.set(key, concept);
    }
  }

  return Array.from(concepts.values())
    .filter((concept) => {
      const categoryKey = CATEGORY_BY_CONCEPT.get(concept.key);
      if (categoryKey && concepts.has(categoryKey)) return false;
      return !vibeOnly || concept.vibe;
    })
    .map((concept) => {
      const term = preferredVariant(concept.variants);
      // Prompt coverage is the primary signal. Repetition inside one prompt gets
      // only a small logarithmic boost, so pasted/verbose prompts cannot dominate.
      const repetition = Math.max(0, concept.count - concept.prompt_count);
      const weight = Number(
        ((concept.prompt_count + Math.log2(1 + repetition) * 0.35)
          * (concept.kind === "category" ? 1.12 : 1)).toFixed(3),
      );
      return {
        key: concept.key,
        kind: concept.kind,
        term,
        count: concept.count,
        prompt_count: concept.prompt_count,
        weight,
      };
    })
    .sort((a, b) => b.weight - a.weight || b.prompt_count - a.prompt_count || b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
}

function isAcronymUse(term, text) {
  if (!/^[a-z][a-z0-9]{1,5}$/.test(term)) return false;
  const upper = term.toUpperCase();
  return new RegExp(`(^|[^A-Za-z0-9])${upper}(?=$|[^A-Za-z0-9])`).test(String(text || ""));
}

function isVibeCodingTerm(term) {
  if (CONCEPT_BY_TERM.has(term)) return true;
  if (/^[\p{Script=Han}]+$/u.test(term)) return KNOWN_HAN_TERMS.includes(term);
  return VIBE_ASCII_TERMS.has(term);
}

function preferredVariant(variants) {
  return [...variants.entries()]
    .sort((a, b) => (
      b[1].prompt_count - a[1].prompt_count
      || b[1].count - a[1].count
      || a[0].length - b[0].length
      || a[0].localeCompare(b[0])
    ))[0]?.[0] || "";
}

/** Prefer natural-language intent; drop fenced/code-heavy lines before tokenizing. */
function promptTextForCloud(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\/(?:Users|Volumes|home|var|tmp|private)\/[^\s"'`]+/gi, " ")
    .replace(/[A-Za-z]:\\[^\s"'`]+/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/--[A-Za-z0-9_-]+\s*:[^;]+;?/g, " ")
    .replace(/\b(?:import\s+\S+\s+from\s+\S+|from\s+\S+\s+import\s+\S+|(?:const|let|var)\s+\w+\s*=|(?:class|def|function)\s+\w+)[^\n]*$/gim, " ")
    .replace(/^\s*(?:import\b|from\s+\S+\s+import\b|class\s+\w+|def\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|function\s+\w+)\b.*$/gim, " ")
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/gi, " ")
    .replace(/\b(?:torch|numpy|nn|plt|pd|np)\.[A-Za-z_][\w.]*\b/g, " ")
    .split(/\r?\n/)
    .filter((line) => !looksLikeCodeLine(line))
    .join("\n");
}

function tokenize(text) {
  const normalized = String(text || "");
  const matches = normalized.match(/[\p{Script=Han}]+|[a-z0-9][a-z0-9_-]{1,}/giu) || [];
  const terms = [];
  for (const match of matches) {
    if (/^[\p{Script=Han}]+$/u.test(match)) {
      terms.push(...splitHanTerm(match));
    } else {
      terms.push(...splitAsciiTerm(match));
    }
  }
  return terms.filter((term) => (
    term.length > 1
    && !STOP_WORDS.has(term)
    && !HAN_STOP_WORDS.has(term)
    && !/^\d+$/.test(term)
  ));
}

function splitHanTerm(term) {
  const candidates = [];
  const knownCoverage = new Set();

  for (const known of KNOWN_HAN_TERMS) {
    let start = term.indexOf(known);
    while (start >= 0) {
      candidates.push({ term: known, start, end: start + known.length });
      start = term.indexOf(known, start + known.length);
    }
  }

  const matches = [];
  candidates
    .sort((a, b) => a.start - b.start || b.term.length - a.term.length)
    .forEach((candidate) => {
      const indexes = Array.from(
        { length: candidate.end - candidate.start },
        (_, offset) => candidate.start + offset,
      );
      if (indexes.some((index) => knownCoverage.has(index))) return;
      matches.push(candidate);
      indexes.forEach((index) => knownCoverage.add(index));
    });

  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
    for (const segment of segmenter.segment(term)) {
      const value = segment.segment.toLowerCase();
      if (!segment.isWordLike || value.length < 2) continue;
      const overlapsKnown = Array.from(
        { length: segment.segment.length },
        (_, offset) => segment.index + offset,
      ).every((index) => knownCoverage.has(index));
      if (!overlapsKnown) matches.push({
        term: value,
        start: segment.index,
        end: segment.index + segment.segment.length,
      });
    }
  }

  if (matches.length === 0 && term.length === 2) return [term.toLowerCase()];
  return matches
    .sort((a, b) => a.start - b.start || b.term.length - a.term.length)
    .map((entry) => entry.term.toLowerCase());
}

function looksLikeCodeLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return false;
  const withoutDiff = trimmed.replace(/^[+-]\s?/, "");
  const hasHan = /[\p{Script=Han}]/u.test(withoutDiff);
  if (/^(const|let|var|return|import|export|function|class|if|else|for|while|await|async)\b/.test(withoutDiff)) return true;
  if (/\b(className|useState|useEffect|style=|aria-|data-|set[A-Z][A-Za-z0-9_]*)\b/.test(withoutDiff)) return true;
  if (!hasHan && /[{}<>;=]/.test(withoutDiff)) return true;
  const styleTokens = withoutDiff.match(/\b(?:text|bg|border|rounded|flex|grid|items|justify|gap|px|py|mt|mb|w|h|dark):?-[A-Za-z0-9/[\].%-]+/g) || [];
  if (!hasHan && styleTokens.length >= 3) return true;
  return false;
}

function splitAsciiTerm(term) {
  const normalized = String(term || "").toLowerCase();
  const parts = String(term || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.toLowerCase())
    .filter((part) => part.length > 1);

  return Array.from(new Set([normalized, ...parts]));
}

module.exports = {
  wordFrequencies,
  wordCloudRecords,
  wordFrequenciesFromRecords,
  tokenize,
  promptTextForCloud,
};
