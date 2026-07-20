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
  }

  if (!totalValue && number(activity.total_tokens)) {
    totalValue = number(activity.total_tokens);
  }
  if (!activeDays && number(activity.active_day_count)) {
    activeDays = number(activity.active_day_count);
  }

  const topProvider = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
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
    topProvider,
    activeRate,
    estimatedCostUsd: activity.estimated_cost_usd == null || activity.estimated_cost_usd === ""
      ? null
      : (Number.isFinite(Number(activity.estimated_cost_usd)) ? Number(activity.estimated_cost_usd) : null),
  };
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
    } else if (stats.topProvider) {
      signals.push({
        label: "Top provider",
        labelZh: "主平台",
        value: String(stats.topProvider).toUpperCase(),
      });
    } else {
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
    { label: "Sources", labelZh: "数据源", value: String(summary.source_count ?? 0) },
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
  summarizeActivity,
  buildActivitySignals,
};
