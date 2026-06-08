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
    for (const term of tokenize(prompt.text)) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
}

function tokenize(text) {
  const normalized = String(text || "").toLowerCase();
  const matches = normalized.match(/[\p{Script=Han}]{2,}|[a-z0-9][a-z0-9_-]{1,}/gu) || [];
  const terms = [];
  for (const match of matches) {
    if (/^[\p{Script=Han}]+$/u.test(match) && match.length > 2) {
      terms.push(match);
      for (let i = 0; i < match.length - 1; i++) {
        terms.push(match.slice(i, i + 2));
      }
    } else {
      terms.push(match);
    }
  }
  return terms.filter((term) => !STOP_WORDS.has(term));
}

module.exports = { wordFrequencies, tokenize };
