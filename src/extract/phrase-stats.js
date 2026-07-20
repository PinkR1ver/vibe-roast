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
    .replace(/\/(?:Users|home|var|tmp|private)\/[^\s"'`]+/gi, " ")
    .replace(/[A-Za-z]:\\[^\s"'`]+/g, " ")
    .replace(/^\s{0,4}(?:import |from |const |let |var |def |class |function |export |return |self\.|#include|# ).*$/gim, " ")
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/gi, " ")
    .replace(/\b(?:torch|numpy|nn|plt|pd|np)\.[A-Za-z_][\w.]*\b/g, " ");
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
  return terms.filter((term) => !STOP_WORDS.has(term));
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
