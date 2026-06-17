export const DNA_DIMENSIONS = [
  { key: "build", categories: ["implementation", "packaging"] },
  { key: "debug", categories: ["debugging"] },
  { key: "plan", categories: ["planning", "research"] },
  { key: "design", categories: ["ui_design", "explanation"] },
  { key: "quality", categories: ["testing", "refactor"] },
  { key: "workflow", categories: ["workflow"] },
];

export function buildDnaDimensions(categories = {}) {
  const dimensions = DNA_DIMENSIONS.map((dimension) => {
    const value = dimension.categories.reduce((sum, category) => {
      return sum + Number(categories[category]?.count || 0);
    }, 0);
    return { key: dimension.key, value };
  });
  const max = Math.max(...dimensions.map((dimension) => dimension.value), 1);

  return dimensions.map((dimension) => ({
    ...dimension,
    score: roundScore(dimension.value / max),
  }));
}

export function buildWorldMetrics(env = {}) {
  return [
    { key: "skills", value: String(env.skills?.count ?? env.skills?.names?.length ?? 0) },
    { key: "mcp", value: String(env.mcp_servers?.count ?? env.mcp_servers?.names?.length ?? 0) },
    { key: "plugins", value: String(env.plugins?.count ?? env.plugins?.names?.length ?? 0) },
    { key: "model", value: env.config?.model || "default" },
  ];
}

export function buildModelBreakdown(activity = {}) {
  const modelTotals = new Map();
  const sourceTotals = new Map();
  const sourceModels = new Map();

  for (const row of activity.daily_rows || []) {
    for (const [key, rawValue] of Object.entries(row.models || {})) {
      const tokens = Number(rawValue || 0);
      if (tokens <= 0) continue;
      modelTotals.set(key, (modelTotals.get(key) || 0) + tokens);
      const source = splitModelKey(key).source;
      sourceTotals.set(source, (sourceTotals.get(source) || 0) + tokens);
      if (!sourceModels.has(source)) sourceModels.set(source, new Set());
      sourceModels.get(source).add(key);
    }
  }

  const totalTokens = Array.from(modelTotals.values()).reduce((sum, value) => sum + value, 0);
  const models = Array.from(modelTotals.entries())
    .map(([key, tokens]) => {
      const parts = splitModelKey(key);
      return {
        key,
        ...parts,
        tokens,
        percent: percentOf(tokens, totalTokens),
      };
    })
    .sort((a, b) => b.tokens - a.tokens);
  const sources = Array.from(sourceTotals.entries())
    .map(([key, tokens]) => {
      const sourceModelKeys = sourceModels.get(key) || new Set();
      return {
        key,
        tokens,
        modelCount: sourceModelKeys.size,
        percent: percentOf(tokens, totalTokens),
        models: models.filter((model) => sourceModelKeys.has(model.key)),
      };
    })
    .sort((a, b) => b.tokens - a.tokens);

  return {
    totalTokens,
    modelCount: models.length,
    models,
    sources,
  };
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

function percentOf(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function splitModelKey(key) {
  const [source, ...rest] = String(key).split("/");
  return {
    source: source || "unknown",
    model: rest.join("/") || source || "unknown",
  };
}
