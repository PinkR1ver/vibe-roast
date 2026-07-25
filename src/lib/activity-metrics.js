function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function compactNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return String(Math.round(n));
  if (n < 1000000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  if (n < 10000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
  return `${(n / 1000000000).toFixed(n >= 10000000000 ? 0 : 2)}B`;
}

function formatUsd(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${n.toFixed(n >= 100 ? 0 : 2)}`;
}

/** Derive streak / peak / totals from activity.daily_rows (sorted or unsorted). */
function summarizeActivity(activity = {}) {
  const rows = Array.isArray(activity.daily_rows) ? [...activity.daily_rows] : [];
  rows.sort((a, b) => String(a.day || "").localeCompare(String(b.day || "")));

  let totalValue = 0;
  let activeDays = 0;
  let maxStreak = 0;
  let currentStreak = 0;
  let peakDay = { day: null, value: 0 };
  const sourceTotals = new Map();
  const providerTotals = new Map();
  const modelTotals = new Map();

  let prevDay = null;
  for (const row of rows) {
    const value = number(row.value ?? row.billable_total_tokens ?? row.total_tokens);
    totalValue += value;
    if (value > 0) {
      activeDays += 1;
      if (prevDay && consecutiveDays(prevDay, row.day)) currentStreak += 1;
      else currentStreak = 1;
      maxStreak = Math.max(maxStreak, currentStreak);
      prevDay = row.day;
    } else {
      currentStreak = 0;
      prevDay = row.day;
    }
    if (value > peakDay.value) peakDay = { day: row.day, value };

    for (const [source, raw] of Object.entries(row.sources || {})) {
      sourceTotals.set(source, (sourceTotals.get(source) || 0) + number(raw));
    }
    for (const [key, raw] of Object.entries(row.models || {})) {
      const value = number(raw);
      if (!value) continue;
      const model = modelFromKey(key);
      if (!isConcreteModel(model)) continue;
      modelTotals.set(model, (modelTotals.get(model) || 0) + value);
      const provider = inferModelProvider(model);
      if (provider) providerTotals.set(provider, (providerTotals.get(provider) || 0) + value);
    }
  }

  if (!totalValue && number(activity.total_tokens)) {
    totalValue = number(activity.total_tokens);
  }
  if (!activeDays && number(activity.active_day_count)) {
    activeDays = number(activity.active_day_count);
  }

  const topAgent = topKey(sourceTotals);
  const topProvider = topKey(providerTotals);
  const topModel = topKey(modelTotals);
  const metric = activity.metric || (totalValue > 0 && activity.source === "token-tracker" ? "tokens" : "prompts");
  const spanDays = rows.length > 0
    ? Math.max(1, daysBetween(rows[0].day, rows[rows.length - 1].day) + 1)
    : 0;
  const activeRate = spanDays ? ((activeDays / spanDays) * 100).toFixed(1) : null;

  return {
    metric,
    totalValue,
    activeDays,
    maxStreak,
    peakDay,
    topAgent,
    topProvider,
    topModel,
    activeRate,
    estimatedCostUsd: activity.estimated_cost_usd == null || activity.estimated_cost_usd === ""
      ? null
      : (Number.isFinite(Number(activity.estimated_cost_usd)) ? Number(activity.estimated_cost_usd) : null),
  };
}

function topKey(totals) {
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || null;
}

function modelFromKey(key) {
  const [, ...modelParts] = String(key || "").split("/");
  return (modelParts.join("/") || String(key || "")).trim();
}

function isConcreteModel(model) {
  const normalized = String(model || "").trim().toLowerCase();
  return Boolean(normalized) && !["auto", "unknown", "default", "other", "n/a"].includes(normalized);
}

function inferModelProvider(model) {
  const value = String(model || "").trim().toLowerCase();
  if (!isConcreteModel(value)) return null;
  if (/(^|[-_/.])(gpt|chatgpt|codex|o[1-9])([-_/.]|$)/.test(value)) return "OpenAI";
  if (/(claude|sonnet|opus|haiku)/.test(value)) return "Anthropic";
  if (/(gemini|gemma)/.test(value)) return "Google";
  if (/deepseek/.test(value)) return "DeepSeek";
  if (/grok/.test(value)) return "xAI";
  if (/(qwen|qwq)/.test(value)) return "Alibaba";
  if (/llama/.test(value)) return "Meta";
  if (/(mistral|mixtral|codestral)/.test(value)) return "Mistral";
  if (/(command-r|cohere)/.test(value)) return "Cohere";
  if (/(kimi|moonshot)/.test(value)) return "Moonshot";
  if (/(glm|zhipu)/.test(value)) return "Zhipu";
  if (/(ernie|baidu)/.test(value)) return "Baidu";
  if (/(doubao|seed-code)/.test(value)) return "ByteDance";
  if (/minimax/.test(value)) return "MiniMax";
  if (/(nova|amazon)/.test(value)) return "Amazon";
  if (/(phi[-_.]|^phi$)/.test(value)) return "Microsoft";
  if (/composer/.test(value)) return "Cursor";
  return null;
}

function formatModelName(model) {
  return String(model || "")
    .replace(/^gpt(?=[-_.]|$)/i, "GPT")
    .replace(/^claude(?=[-_.]|$)/i, "Claude")
    .replace(/^gemini(?=[-_.]|$)/i, "Gemini")
    .replace(/^deepseek(?=[-_.]|$)/i, "DeepSeek")
    .replace(/^grok(?=[-_.]|$)/i, "Grok");
}

function consecutiveDays(prev, next) {
  if (!prev || !next) return false;
  return daysBetween(prev, next) === 1;
}

function daysBetween(a, b) {
  const am = Date.parse(`${a}T00:00:00.000Z`);
  const bm = Date.parse(`${b}T00:00:00.000Z`);
  if (!Number.isFinite(am) || !Number.isFinite(bm)) return NaN;
  return Math.round((bm - am) / 86400000);
}

/**
 * Score-card signals for Roast Result — prefers TokenTracker token KPIs
 * over useful-prompt counts when daily token rows exist.
 */
function buildActivitySignals({ activity = {}, summary = {}, categories = {} } = {}) {
  const stats = summarizeActivity(activity);
  const topCategory = Object.entries(categories)
    .filter(([key]) => key !== "reference")
    .map(([key, row]) => [key, Number(row?.count || 0)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])[0];

  if (stats.metric === "tokens" && stats.totalValue > 0) {
    const signals = [
      { label: "Total tokens", labelZh: "总 Tokens", value: compactNumber(stats.totalValue) },
      {
        label: "Active days",
        labelZh: "活跃天数",
        value: String(stats.activeDays || summary.active_day_count || 0),
      },
    ];
    const cost = formatUsd(stats.estimatedCostUsd);
    if (cost) {
      signals.push({ label: "Est. cost", labelZh: "估算费用", value: cost });
    }
    if (stats.topAgent) {
      signals.push({
        label: "Top agent",
        labelZh: "主 Agent",
        value: String(stats.topAgent).toUpperCase(),
      });
    }
    if (stats.topProvider) {
      signals.push({
        label: "Top provider",
        labelZh: "主供应商",
        value: stats.topProvider,
      });
    }
    if (stats.topModel) {
      signals.push({
        label: "Top model",
        labelZh: "主模型",
        value: formatModelName(stats.topModel),
      });
    }
    if (signals.length === 2) {
      signals.push({
        label: "Peak day",
        labelZh: "峰值日",
        value: stats.peakDay.value > 0 ? compactNumber(stats.peakDay.value) : "—",
      });
    }
    return signals;
  }

  return [
    {
      label: "Active days",
      labelZh: "活跃天数",
      value: String(stats.activeDays || activity.active_day_count || 0),
    },
    {
      label: "Agents found",
      labelZh: "检测到 Agent",
      value: String(summary.active_source_count ?? summary.source_count ?? 0),
    },
    {
      label: "Top category",
      labelZh: "主类别",
      value: topCategory ? String(topCategory[0]) : "—",
    },
  ];
}

module.exports = {
  compactNumber,
  formatUsd,
  inferModelProvider,
  summarizeActivity,
  buildActivitySignals,
};
