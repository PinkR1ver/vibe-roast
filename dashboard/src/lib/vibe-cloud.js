const CATEGORY_LABELS = {
  planning: { en: "Planning", zh: "方案设计" },
  debugging: { en: "Debugging", zh: "调试修复" },
  implementation: { en: "Building", zh: "功能实现" },
  refactor: { en: "Refactoring", zh: "代码重构" },
  testing: { en: "Testing", zh: "测试验证" },
  packaging: { en: "Shipping", zh: "构建发布" },
  explanation: { en: "Explaining", zh: "原理解释" },
  research: { en: "Research", zh: "技术调研" },
  ui_design: { en: "UI Design", zh: "UI 设计" },
  workflow: { en: "Agent Workflow", zh: "Agent 工作流" },
};
const CATEGORY_BY_CONCEPT = new Map([
  ["concept:testing", "category:testing"],
  ["concept:refactor", "category:refactor"],
  ["concept:debugging", "category:debugging"],
  ["concept:design", "category:ui_design"],
  ["concept:workflow", "category:workflow"],
]);

function preferredVariant(variants) {
  return [...variants.entries()]
    .sort((a, b) => (
      b[1].promptCount - a[1].promptCount
      || b[1].count - a[1].count
      || a[0].length - b[0].length
      || a[0].localeCompare(b[0])
    ))[0]?.[0] || "";
}

export function filterWordCloudRecords(
  records = [],
  filteredRows = [],
  period = "total",
  custom = {},
  source = "all",
) {
  let from = "";
  let to = "";

  if (period === "custom") {
    from = custom.from || "";
    to = custom.to || "";
  } else if (period !== "total") {
    from = filteredRows[0]?.day || "";
    to = filteredRows[filteredRows.length - 1]?.day || "";
    if (!from || !to) return [];
  }

  return records.filter((record) => {
    if (source !== "all" && record.source !== source) return false;
    if (period === "total" && !from && !to) return true;
    const day = String(record.timestamp || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    return (!from || day >= from) && (!to || day <= to);
  });
}

export function buildVibeCloudWords(
  records = [],
  { locale = "en", limit = 36, domainWeights = {} } = {},
) {
  const concepts = new Map();
  const rangeMonthCount = new Set(
    records
      .map((record) => String(record.timestamp || "").slice(0, 7))
      .filter((month) => /^\d{4}-\d{2}$/.test(month)),
  ).size;

  for (const record of records) {
    const month = String(record.timestamp || "").slice(0, 7);
    for (const item of record.concepts || []) {
      const concept = concepts.get(item.key) || {
        key: item.key,
        kind: item.kind || "term",
        vibe: Boolean(item.vibe),
        acronym: Boolean(item.acronym),
        count: 0,
        promptCount: 0,
        months: new Map(),
        variants: new Map(),
      };
      concept.vibe = concept.vibe || Boolean(item.vibe);
      concept.acronym = concept.acronym || Boolean(item.acronym);
      let conceptCount = 0;
      for (const [term, rawCount] of Object.entries(item.variants || {})) {
        const count = Math.max(0, Number(rawCount) || 0);
        if (count === 0) continue;
        const variant = concept.variants.get(term) || { count: 0, promptCount: 0 };
        variant.count += count;
        variant.promptCount += 1;
        concept.variants.set(term, variant);
        conceptCount += count;
      }
      if (conceptCount === 0) continue;
      concept.count += conceptCount;
      concept.promptCount += 1;
      if (/^\d{4}-\d{2}$/.test(month)) {
        concept.months.set(month, (concept.months.get(month) || 0) + 1);
      }
      concepts.set(item.key, concept);
    }
  }

  return [...concepts.values()]
    .filter((concept) => {
      const categoryKey = CATEGORY_BY_CONCEPT.get(concept.key);
      if (categoryKey && concepts.has(categoryKey)) return false;
      return isDomainCandidate(
        concept,
        records.length,
        rangeMonthCount,
        Number(domainWeights[concept.key] || 0),
      );
    })
    .map((concept) => {
      const category = concept.key.startsWith("category:")
        ? concept.key.slice("category:".length)
        : "";
      const discoveredDomain = concept.kind !== "category" && !concept.vibe;
      const term = category
        ? CATEGORY_LABELS[category]?.[locale === "zh" ? "zh" : "en"] || category
        : preferredVariant(concept.variants);
      const repetition = Math.max(0, concept.count - concept.promptCount);
      const categoryBoost = concept.kind === "category" ? 1.12 : 1;
      const baseWeight = (concept.promptCount + Math.log2(1 + repetition) * 0.35)
        * categoryBoost;
      // Domain entities behave differently from action/category terms. Repeated
      // mentions inside several independent prompts are a strong "project noun"
      // signal, while logarithmic coverage prevents generic connective words
      // from winning only because they appear once everywhere.
      const mentionsPerPrompt = concept.count / Math.max(1, concept.promptCount);
      const domainWeight = Math.log2(1 + concept.promptCount)
        * Math.pow(Math.min(3, mentionsPerPrompt), 2)
        * 10
        * (concept.acronym ? 1.2 : 1);
      const inheritedDomainWeight = Number(domainWeights[concept.key] || 0) * 0.85;
      return {
        key: concept.key,
        kind: discoveredDomain ? "domain" : concept.kind,
        term,
        count: concept.count,
        prompt_count: concept.promptCount,
        weight: Number(
          (discoveredDomain
            ? Math.max(domainWeight, inheritedDomainWeight)
            : baseWeight).toFixed(3),
        ),
      };
    })
    .filter((item) => item.term)
    .sort((a, b) => (
      b.weight - a.weight
      || b.prompt_count - a.prompt_count
      || b.count - a.count
      || a.term.localeCompare(b.term)
    ))
    .slice(0, limit);
}

function isDomainCandidate(concept, recordCount, rangeMonthCount, inheritedDomainWeight = 0) {
  if (concept.kind === "category" || concept.vibe) return true;
  if (inheritedDomainWeight > 0) return true;

  const minimumCoverage = Math.min(12, Math.max(3, Math.ceil(recordCount * 0.006)));
  if (concept.promptCount < minimumCoverage) return false;
  if (concept.acronym) return true;

  const term = preferredVariant(concept.variants);
  const plausibleEntity = /^[\p{Script=Han}]{2,}$/u.test(term)
    || /^[a-z][a-z0-9-]{3,}$/i.test(term);
  if (!plausibleEntity || concept.months.size === 0) return false;
  if (rangeMonthCount <= 3) return true;

  const peakMonthCount = Math.max(0, ...concept.months.values());
  const peakMonthShare = peakMonthCount / concept.promptCount;
  return concept.months.size <= 2 || peakMonthShare >= 0.45;
}
