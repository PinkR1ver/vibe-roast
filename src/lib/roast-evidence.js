/** Build the privacy-bounded, deterministic evidence packet consumed by an AI roast writer. */

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const CLUSTER_NOISE_TERMS = new Set([
  "again", "already", "ambient", "app", "attached", "automatically", "been",
  "block", "browser", "cannot", "created", "current", "default", "dev", "doc",
  "don", "evidence", "explicitly", "failed", "in-app", "master", "may", "new",
  "opened", "proceed", "related", "reproduced", "saved", "sessions", "task",
]);

function dominantVariant(variants = new Map(), fallback = "") {
  return [...variants.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || fallback;
}

function isClusterNoiseTerm(value) {
  const term = String(value || "").trim();
  const normalized = term.toLowerCase();
  return (
    !term
    || CLUSTER_NOISE_TERMS.has(normalized)
    || /^[a-f0-9]{8,}$/i.test(term)
    || /^\d+(?:ms|s|m|h|d)$/i.test(term)
    || /^\d{4}[-_/]\d{1,2}(?:[-_/]\d{1,2})?/.test(term)
    || /^\d[\w-]{10,}$/.test(term)
  );
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
    .filter((row) => row.prompt_coverage >= 2)
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
    .filter((row) => !isClusterNoiseTerm(row.term))
    .sort((a, b) => (
      b.salience - a.salience
      || b.prompt_coverage - a.prompt_coverage
      || b.occurrence_count - a.occurrence_count
      || a.term.localeCompare(b.term)
    ))
    .slice(0, limit);
}

function domainClusterRows(records = [], limit = 6) {
  const concepts = new Map();
  const pairs = new Map();

  for (const record of records || []) {
    const local = new Map();
    for (const item of record?.concepts || []) {
      if (!item?.key || item.kind === "category" || item.vibe) continue;
      const key = String(item.key);
      const localRow = local.get(key) || { key, score: 0, variants: new Map() };
      for (const [term, rawCount] of Object.entries(item.variants || {})) {
        const count = Math.max(0, finiteNumber(rawCount));
        if (!term || count <= 0) continue;
        localRow.score += count;
        localRow.variants.set(term, (localRow.variants.get(term) || 0) + count);
      }
      local.set(key, localRow);
    }

    // Bound pair expansion for unusually dense prompts while retaining their
    // strongest domain concepts. No raw prompt text enters this structure.
    const rows = [...local.values()]
      .filter((row) => row.variants.size)
      .filter((row) => !isClusterNoiseTerm(dominantVariant(row.variants, row.key)))
      .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
      .slice(0, 10);

    for (const row of rows) {
      const concept = concepts.get(row.key) || {
        key: row.key,
        prompt_coverage: 0,
        variants: new Map(),
      };
      concept.prompt_coverage += 1;
      for (const [term, count] of row.variants) {
        concept.variants.set(term, (concept.variants.get(term) || 0) + count);
      }
      concepts.set(row.key, concept);
    }

    const keys = rows.map((row) => row.key).sort();
    for (let left = 0; left < keys.length; left += 1) {
      for (let right = left + 1; right < keys.length; right += 1) {
        const pairKey = `${keys[left]}\u0000${keys[right]}`;
        const pair = pairs.get(pairKey) || { left: keys[left], right: keys[right], prompt_coverage: 0 };
        pair.prompt_coverage += 1;
        pairs.set(pairKey, pair);
      }
    }
  }

  const strongPairs = [...pairs.values()]
    .map((pair) => ({
      ...pair,
      cohesion: pair.prompt_coverage / Math.max(
        1,
        Math.min(
          concepts.get(pair.left)?.prompt_coverage || 0,
          concepts.get(pair.right)?.prompt_coverage || 0,
        ),
      ),
    }))
    .filter((pair) => pair.prompt_coverage >= 2 && pair.cohesion >= 0.45)
    .sort((a, b) => (
      (b.prompt_coverage * b.cohesion) - (a.prompt_coverage * a.cohesion)
      || a.left.localeCompare(b.left)
      || a.right.localeCompare(b.right)
    ));

  const pairByKeys = new Map(strongPairs.map((pair) => [
    `${pair.left}\u0000${pair.right}`,
    pair,
  ]));
  const candidates = new Set(strongPairs.flatMap((pair) => [pair.left, pair.right]));
  const clusters = new Map();

  function pairFor(left, right) {
    const [first, second] = [left, right].sort();
    return pairByKeys.get(`${first}\u0000${second}`);
  }

  for (const seed of strongPairs) {
    const keys = [seed.left, seed.right];
    while (keys.length < 6) {
      const next = [...candidates]
        .filter((key) => !keys.includes(key))
        .map((key) => ({
          key,
          links: keys.map((member) => pairFor(key, member)),
        }))
        .filter((candidate) => candidate.links.every(Boolean))
        .sort((a, b) => (
          b.links.reduce((total, pair) => total + pair.prompt_coverage, 0)
          - a.links.reduce((total, pair) => total + pair.prompt_coverage, 0)
          || a.key.localeCompare(b.key)
        ))[0];
      if (!next) break;
      keys.push(next.key);
    }

    const signature = [...keys].sort().join("\u0000");
    if (clusters.has(signature)) continue;
    const links = [];
    for (let left = 0; left < keys.length; left += 1) {
      for (let right = left + 1; right < keys.length; right += 1) {
        links.push(pairFor(keys[left], keys[right]));
      }
    }
    const promptCoverage = Math.min(...links.map((pair) => pair.prompt_coverage));
    const cohesion = Math.min(...links.map((pair) => pair.cohesion));
    const terms = keys.map((key) => {
      const variants = concepts.get(key)?.variants || new Map();
      return dominantVariant(variants, key);
    }).map((term) => String(term).slice(0, 48));
    clusters.set(signature, {
      terms,
      prompt_coverage: promptCoverage,
      cohesion: Math.round(cohesion * 1000) / 1000,
      salience: Math.round(
        Math.log2(1 + promptCoverage) * cohesion * Math.min(4, terms.length) * 1000,
      ) / 1000,
    });
  }

  const ranked = [...clusters.values()]
    .sort((a, b) => (
      b.salience - a.salience
      || b.prompt_coverage - a.prompt_coverage
      || a.terms.join("\u0000").localeCompare(b.terms.join("\u0000"))
    ));
  const selected = [];
  for (const cluster of ranked) {
    const terms = new Set(cluster.terms);
    const duplicatesExisting = selected.some((existing) => {
      const overlap = existing.terms.filter((term) => terms.has(term)).length;
      return overlap / Math.min(existing.terms.length, cluster.terms.length) >= 0.8;
    });
    if (!duplicatesExisting) selected.push(cluster);
    if (selected.length >= limit) break;
  }
  return selected;
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
    schema_version: 2,
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
      recurring_domain_clusters: domainClusterRows(report.word_cloud_records, 12),
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

module.exports = {
  buildRoastEvidence,
  buildContradictions,
  domainConceptRows,
  domainClusterRows,
};
