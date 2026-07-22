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
  "judew",
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
]);

function wordFrequencies(prompts, { limit = 30 } = {}) {
  const counts = new Map();
  for (const prompt of prompts) {
    for (const term of tokenize(promptTextForCloud(prompt.text))) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
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
    .replace(/\b(?:import|from\s+\S+\s+import|class\s+\w+|def\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|function\s+\w+)\b[\s\S]*$/gim, " ")
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/gi, " ")
    .replace(/\b(?:torch|numpy|nn|plt|pd|np)\.[A-Za-z_][\w.]*\b/g, " ")
    .split(/\r?\n/)
    .filter((line) => !looksLikeCodeLine(line))
    .join("\n");
}

function tokenize(text) {
  const normalized = String(text || "");
  const matches = normalized.match(/[\p{Script=Han}]{2,}|[a-z0-9][a-z0-9_-]{1,}/giu) || [];
  const terms = [];
  for (const match of matches) {
    if (/^[\p{Script=Han}]+$/u.test(match) && match.length > 2) {
      terms.push(match.toLowerCase());
      for (let i = 0; i < match.length - 1; i++) {
        terms.push(match.slice(i, i + 2).toLowerCase());
      }
    } else {
      terms.push(...splitAsciiTerm(match));
    }
  }
  return terms.filter((term) => !STOP_WORDS.has(term) && !/^\d+$/.test(term));
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

module.exports = { wordFrequencies, tokenize, promptTextForCloud };
