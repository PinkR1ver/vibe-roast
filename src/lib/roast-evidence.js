/** Build the privacy-bounded, deterministic evidence packet consumed by an AI roast writer. */

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function categoryRows(categories = {}) {
  return Object.entries(categories)
    .map(([key, row]) => ({
      key,
      count: finiteNumber(typeof row === "number" ? row : row?.count),
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function conceptRows(wordFrequencies = [], limit = 16) {
  return (wordFrequencies || [])
    .map((row) => ({
      term: String(row?.term || "").trim().slice(0, 48),
      occurrence_count: finiteNumber(row?.count),
      prompt_coverage: finiteNumber(row?.prompt_count),
      weight: finiteNumber(row?.weight),
    }))
    .filter((row) => row.term && row.occurrence_count > 0)
    .slice(0, limit);
}

function domainConceptRows(records = [], limit = 12) {
  const concepts = new Map();
  for (const record of records || []) {
    const seen = new Set();
    for (const item of record?.concepts || []) {
      if (!item?.key || item.kind === "category" || item.vibe) continue;
      const row = concepts.get(item.key) || {
        key: item.key,
        acronym: Boolean(item.acronym),
        occurrence_count: 0,
        prompt_coverage: 0,
        variants: new Map(),
      };
      for (const [term, rawCount] of Object.entries(item.variants || {})) {
        const count = Math.max(0, finiteNumber(rawCount));
        if (!term || count <= 0) continue;
        row.occurrence_count += count;
        row.variants.set(term, (row.variants.get(term) || 0) + count);
      }
      if (!seen.has(item.key)) {
        row.prompt_coverage += 1;
        seen.add(item.key);
      }
      concepts.set(item.key, row);
    }
  }

  return [...concepts.values()]
    .filter((row) => row.prompt_coverage >= 3)
    .map((row) => {
      const term = [...row.variants.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || row.key;
      const repetition = row.occurrence_count / Math.max(1, row.prompt_coverage);
      return {
        term: String(term).slice(0, 48),
        occurrence_count: row.occurrence_count,
        prompt_coverage: row.prompt_coverage,
        acronym: row.acronym,
        salience: Math.round(
          Math.log2(1 + row.prompt_coverage) * Math.min(3, repetition) * (row.acronym ? 1.25 : 1) * 1000,
        ) / 1000,
      };
    })
    .sort((a, b) => (
      b.salience - a.salience
      || b.prompt_coverage - a.prompt_coverage
      || b.occurrence_count - a.occurrence_count
      || a.term.localeCompare(b.term)
    ))
    .slice(0, limit);
}

function dimensionRows(dimensions = []) {
  return (dimensions || []).map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    label_zh: dimension.labelZh,
    value: finiteNumber(dimension.value),
  }));
}

function axisRows(axes = []) {
  return (axes || []).map((axis) => ({
    key: axis.key,
    chosen: axis.letter,
    left: { code: axis.left?.code, percent: finiteNumber(axis.left?.percent) },
    right: { code: axis.right?.code, percent: finiteNumber(axis.right?.percent) },
    margin: finiteNumber(axis.margin),
  }));
}

function buildContradictions(vibe, categories) {
  const notes = [];
  const dimensions = [...(vibe?.dimensions || [])]
    .sort((a, b) => finiteNumber(a.value) - finiteNumber(b.value));
  const closest = [...(vibe?.type_axes || [])]
    .sort((a, b) => finiteNumber(a.margin) - finiteNumber(b.margin))[0];
  const rows = categoryRows(categories);
  const counts = Object.fromEntries(rows.map((row) => [row.key, row.count]));

  if (dimensions.length >= 2) {
    notes.push({
      kind: "strongest_vs_weakest_dimension",
      strongest: dimensions[dimensions.length - 1].key,
      strongest_value: finiteNumber(dimensions[dimensions.length - 1].value),
      weakest: dimensions[0].key,
      weakest_value: finiteNumber(dimensions[0].value),
    });
  }
  if (closest) {
    notes.push({
      kind: "closest_personality_split",
      axis: closest.key,
      left: `${closest.left?.code}:${finiteNumber(closest.left?.percent)}`,
      right: `${closest.right?.code}:${finiteNumber(closest.right?.percent)}`,
    });
  }

  const building = finiteNumber(counts.implementation) + finiteNumber(counts.packaging) + finiteNumber(counts.ui_design);
  const verifying = finiteNumber(counts.testing) + finiteNumber(counts.debugging) + finiteNumber(counts.refactor);
  if (building + verifying > 0) {
    notes.push({
      kind: "building_vs_verifying",
      building,
      verifying,
      ratio: Math.round((building / Math.max(verifying, 1)) * 10) / 10,
    });
  }
  return notes;
}

function buildRoastEvidence(report = {}) {
  const vibe = report.vibe_profile || {};
  const categories = report.profile_signals?.prompt_analysis?.categories || {};
  const activity = report.activity || {};
  const summary = report.summary || {};

  return {
    schema_version: 1,
    immutable_profile: {
      type_code: vibe.type_code,
      personality: vibe.personality?.title,
      personality_zh: vibe.personality?.titleZh,
      confidence: finiteNumber(vibe.confidence),
      status: vibe.status,
      axes: axisRows(vibe.type_axes),
      dimensions: dimensionRows(vibe.dimensions),
    },
    prompt_behavior: {
      useful_prompt_count: finiteNumber(report.profile_signals?.prompt_analysis?.useful_prompt_count),
      categories: categoryRows(categories),
      recurring_behavior_terms: conceptRows(report.word_frequencies, 12),
      recurring_domain_concepts: domainConceptRows(report.word_cloud_records),
    },
    activity: {
      metric: activity.metric,
      total_tokens: finiteNumber(activity.total_tokens),
      active_days: finiteNumber(activity.active_day_count),
      longest_streak: finiteNumber(activity.longest_streak),
      active_rate: activity.active_rate || null,
      top_agent: activity.top_agent || null,
      top_provider: activity.top_provider || null,
      top_model: activity.top_model || null,
      active_agents: (summary.active_sources || []).slice(0, 12),
    },
    roast_targets: buildContradictions(vibe, categories),
    guardrails: {
      profile_is_immutable: true,
      aggregate_evidence_only: true,
      raw_prompts_included: false,
      attack_behavior_not_identity: true,
      unsupported_claims_forbidden: true,
    },
  };
}

module.exports = { buildRoastEvidence, buildContradictions, domainConceptRows };
