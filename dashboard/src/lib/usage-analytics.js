function positiveNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function rowValue(row) {
  return positiveNumber(row?.billable_total_tokens ?? row?.total_tokens ?? row?.value);
}

export function filterUsageRows(rows = [], period = "total", custom = {}) {
  const dated = (rows || [])
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(String(row?.day || "")))
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day));
  if (dated.length === 0 || period === "total") return dated;

  if (period === "custom") {
    return dated.filter((row) =>
      (!custom.from || row.day >= custom.from) && (!custom.to || row.day <= custom.to)
    );
  }

  const lastDay = dated[dated.length - 1].day;
  if (period === "day") return dated.filter((row) => row.day === lastDay);
  if (period === "month") return dated.filter((row) => row.day.slice(0, 7) === lastDay.slice(0, 7));

  const end = new Date(`${lastDay}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const startDay = start.toISOString().slice(0, 10);
  return dated.filter((row) => row.day >= startDay && row.day <= lastDay);
}

export function buildUsageOverview(rows = []) {
  const sourceTotals = new Map();
  const sourceModels = new Map();
  const allModels = new Set();
  let totalTokens = 0;

  for (const row of rows || []) {
    totalTokens += rowValue(row);
    for (const [source, rawValue] of Object.entries(row?.sources || {})) {
      const value = positiveNumber(rawValue);
      if (value > 0) sourceTotals.set(source, (sourceTotals.get(source) || 0) + value);
    }
    for (const modelKey of Object.keys(row?.models || {})) {
      allModels.add(modelKey);
      const [source = "unknown"] = String(modelKey).split("/");
      if (!sourceModels.has(source)) sourceModels.set(source, new Set());
      sourceModels.get(source).add(modelKey);
    }
  }

  const sources = [...sourceTotals.entries()]
    .map(([source, tokens]) => ({
      source,
      tokens,
      percent: totalTokens > 0 ? (tokens / totalTokens) * 100 : 0,
      modelCount: sourceModels.get(source)?.size || 0,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  return { totalTokens, modelCount: allModels.size, sources };
}

export function buildUsageTrend(rows = []) {
  const ordered = (rows || []).slice().sort((a, b) => String(a.day).localeCompare(String(b.day)));
  if (ordered.length === 0) return [];
  const first = new Date(`${ordered[0].day}T00:00:00Z`);
  const last = new Date(`${ordered[ordered.length - 1].day}T00:00:00Z`);
  const spanDays = Math.round((last - first) / 86400000) + 1;
  const monthly = spanDays > 45;
  const buckets = new Map();

  for (const row of ordered) {
    const key = monthly ? row.day.slice(0, 7) : row.day;
    const bucket = buckets.get(key) || { key, total: 0, sources: {} };
    bucket.total += rowValue(row);
    for (const [source, rawValue] of Object.entries(row?.sources || {})) {
      bucket.sources[source] = (bucket.sources[source] || 0) + positiveNumber(rawValue);
    }
    buckets.set(key, bucket);
  }

  return [...buckets.values()];
}

export function filterUsageRowsBySource(rows = [], source = "all") {
  if (source === "all") return rows;
  return rows.map((row) => {
    const value = positiveNumber(row?.sources?.[source]);
    const models = Object.fromEntries(
      Object.entries(row?.models || {}).filter(([modelKey]) => (
        String(modelKey).split("/")[0] === source
      )),
    );
    return {
      ...row,
      value,
      total_tokens: value,
      billable_total_tokens: value,
      sources: value > 0 ? { [source]: value } : {},
      models,
      context_breakdown: row?.context_breakdown?.[source]
        ? { [source]: row.context_breakdown[source] }
        : {},
    };
  });
}

export function buildModelUsage(rows = [], { estimatedCostUsd = 0 } = {}) {
  const models = new Map();
  let totalTokens = 0;

  for (const row of rows || []) {
    for (const [modelKey, rawValue] of Object.entries(row?.models || {})) {
      const tokens = positiveNumber(rawValue);
      if (tokens === 0) continue;
      const [source = "unknown", ...modelParts] = String(modelKey).split("/");
      const model = modelParts.join("/") || source;
      const normalizedModel = model.toLowerCase();
      const entry = models.get(normalizedModel) || {
        model,
        tokens: 0,
        sources: {},
      };
      entry.tokens += tokens;
      entry.sources[source] = (entry.sources[source] || 0) + tokens;
      models.set(normalizedModel, entry);
      totalTokens += tokens;
    }
  }

  const cost = positiveNumber(estimatedCostUsd);
  return {
    totalTokens,
    models: [...models.values()]
      .map((entry) => {
        const dominantSource = Object.entries(entry.sources)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
        const percent = totalTokens > 0 ? (entry.tokens / totalTokens) * 100 : 0;
        return {
          ...entry,
          dominantSource,
          percent,
          estimatedCostUsd: cost > 0 ? cost * (entry.tokens / totalTokens) : 0,
        };
      })
      .sort((a, b) => b.tokens - a.tokens || a.model.localeCompare(b.model)),
  };
}

export function buildContextBreakdowns(rows = []) {
  const bySource = new Map();

  for (const row of rows || []) {
    for (const [source, raw] of Object.entries(row?.context_breakdown || {})) {
      const current = bySource.get(source) || {
        source,
        categories: {
          messages: 0,
          tool_calls: 0,
          reasoning: 0,
          system_prompt: 0,
          custom_agents: 0,
        },
        rawTotalTokens: 0,
        referenceTokens: 0,
        inputTokens: 0,
        cachedInputTokens: 0,
        toolCallCount: 0,
        eventCount: 0,
        methods: new Set(),
      };
      for (const key of Object.keys(current.categories)) {
        current.categories[key] += positiveNumber(raw?.categories?.[key]);
      }
      current.rawTotalTokens += positiveNumber(raw?.total_tokens);
      current.referenceTokens += positiveNumber(row?.sources?.[source]);
      current.inputTokens += positiveNumber(raw?.input_tokens);
      current.cachedInputTokens += positiveNumber(raw?.cached_input_tokens);
      current.toolCallCount += positiveNumber(raw?.tool_call_count);
      current.eventCount += positiveNumber(raw?.event_count);
      if (raw?.method) current.methods.add(raw.method);
      bySource.set(source, current);
    }
  }

  return [...bySource.values()]
    .filter((entry) => entry.rawTotalTokens > 0 && entry.referenceTokens > 0)
    .map((entry) => {
      const scale = entry.rawTotalTokens > 0
        ? entry.referenceTokens / entry.rawTotalTokens
        : 1;
      const categories = Object.entries(entry.categories)
        .map(([key, tokens]) => ({
          key,
          tokens: tokens * scale,
          percent: entry.referenceTokens > 0
            ? (tokens * scale / entry.referenceTokens) * 100
            : 0,
        }))
        .filter((category) => category.tokens > 0)
        .sort((a, b) => b.tokens - a.tokens);
      return {
        ...entry,
        methods: [...entry.methods],
        totalTokens: entry.referenceTokens,
        cacheHitRate: entry.inputTokens > 0
          ? (entry.cachedInputTokens / entry.inputTokens) * 100
          : 0,
        categories,
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);
}
