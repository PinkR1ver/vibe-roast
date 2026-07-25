const SNAPSHOT_VERSION = 1;
const WRITER_PROMPT_VERSION = 3;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizedTerm(value) {
  return String(value || "").trim().toLocaleLowerCase().slice(0, 48);
}

function buildRoastSnapshot(evidence = {}) {
  const profile = evidence.immutable_profile || {};
  const categories = evidence.prompt_behavior?.categories || [];
  const categoryTotal = categories.reduce((total, row) => total + Math.max(0, finite(row?.count)), 0);
  const concepts = [
    ...(evidence.prompt_behavior?.recurring_domain_concepts || []),
    ...(evidence.prompt_behavior?.recurring_behavior_terms || []),
  ];

  return {
    snapshot_version: SNAPSHOT_VERSION,
    writer_prompt_version: WRITER_PROMPT_VERSION,
    evidence_schema_version: finite(evidence.schema_version),
    type_code: String(profile.type_code || ""),
    status: String(profile.status || ""),
    confidence: Math.round(finite(profile.confidence)),
    axes: (profile.axes || []).map((axis) => ({
      key: String(axis?.key || ""),
      chosen: String(axis?.chosen || ""),
      left_percent: Math.round(finite(axis?.left?.percent)),
    })).filter((axis) => axis.key),
    dimensions: (profile.dimensions || []).map((dimension) => ({
      key: String(dimension?.key || ""),
      value: Math.round(finite(dimension?.value)),
    })).filter((dimension) => dimension.key),
    category_shares: categories.map((row) => ({
      key: String(row?.key || ""),
      share: categoryTotal > 0
        ? Math.round((Math.max(0, finite(row?.count)) / categoryTotal) * 100)
        : 0,
    })).filter((row) => row.key),
    concepts: [...new Set(concepts.map((row) => normalizedTerm(row?.term)).filter(Boolean))].slice(0, 8),
    top_agent: String(evidence.activity?.top_agent || ""),
  };
}

function encodeRoastSnapshot(evidence) {
  return Buffer.from(JSON.stringify(buildRoastSnapshot(evidence)), "utf8").toString("base64url");
}

module.exports = {
  SNAPSHOT_VERSION,
  WRITER_PROMPT_VERSION,
  buildRoastSnapshot,
  encodeRoastSnapshot,
};
