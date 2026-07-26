/* Adapted from TokenTracker — buildActivityHeatmap for prompt counts */

function formatDateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addUtcDays(date, days) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function diffUtcDays(a, b) {
  return Math.floor((Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
    Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) / 86400000);
}

function quantile(sorted, q) {
  if (!Array.isArray(sorted) || sorted.length === 0) return 0;
  const n = sorted.length;
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const left = sorted[base] ?? sorted[n - 1];
  const right = sorted[Math.min(n - 1, base + 1)] ?? sorted[n - 1];
  return Math.round(left + (right - left) * rest);
}

function clampLevel(level) {
  if (level <= 0) return 0;
  if (level >= 4) return 4;
  return level;
}

export function buildActivityHeatmap({ prompts = [], dailyRows = null, weeks = 52 }) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const start = addUtcDays(end, -(weeks * 7 - 1));

  // Align start to Sunday
  const startDow = start.getUTCDay();
  const startAligned = addUtcDays(start, -startDow);

  // Aggregate either TokenTracker daily token rows or prompt counts by day.
  const valuesByDay = new Map();
  if (Array.isArray(dailyRows)) {
    for (const row of dailyRows) {
      if (!row?.day) continue;
      const value = number(row.billable_total_tokens ?? row.total_tokens ?? row.value);
      const current = valuesByDay.get(row.day) || { value: 0, models: {}, sources: {}, conversation_count: 0 };
      current.value += value;
      current.total_tokens = (current.total_tokens || 0) + number(row.total_tokens ?? value);
      current.billable_total_tokens = (current.billable_total_tokens || 0) + value;
      current.conversation_count += number(row.conversation_count);
      mergeCounts(current.models, row.models);
      mergeCounts(current.sources, row.sources);
      valuesByDay.set(row.day, current);
    }
  } else {
    for (const p of prompts || []) {
      if (!p.timestamp) continue;
      const day = String(p.timestamp).slice(0, 10);
      const cur = valuesByDay.get(day) || { value: 0, models: {} };
      cur.value++;
      const src = p.source || "unknown";
      cur.models[src] = (cur.models[src] || 0) + 1;
      valuesByDay.set(day, cur);
    }
  }

  const totalDays = diffUtcDays(startAligned, end) + 1;
  const weekCount = Math.ceil(totalDays / 7);

  const allValues = [];
  for (let i = 0; i < totalDays; i++) {
    const dt = addUtcDays(startAligned, i);
    const key = formatDateUTC(dt);
    const v = valuesByDay.get(key)?.value || 0;
    if (v > 0) allValues.push(v);
  }
  allValues.sort((a, b) => a - b);

  const t1 = quantile(allValues, 0.5);
  const t2 = quantile(allValues, 0.75);
  const t3 = quantile(allValues, 0.9);

  function levelFor(value) {
    if (!value || value <= 0) return 0;
    if (value <= t1) return 1;
    if (value <= t2) return 2;
    if (value <= t3) return 3;
    return 4;
  }

  const weeksOut = [];
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const dt = addUtcDays(startAligned, idx);
      if (dt.getTime() > end.getTime()) {
        week.push(null);
        continue;
      }
      const day = formatDateUTC(dt);
      const dayData = valuesByDay.get(day);
      const value = dayData ? dayData.value : 0;
      week.push({
        day,
        value,
        total_tokens: dayData?.total_tokens,
        billable_total_tokens: dayData?.billable_total_tokens,
        conversation_count: dayData?.conversation_count,
        level: clampLevel(levelFor(value)),
        models: dayData?.models || null,
        sources: dayData?.sources || null,
      });
    }
    weeksOut.push(week);
  }

  const trimmed = weeksOut.length > weeks ? weeksOut.slice(weeksOut.length - weeks) : weeksOut;

  return {
    from: formatDateUTC(startAligned),
    to: formatDateUTC(end),
    weeks: trimmed,
    thresholds: { t1, t2, t3 },
  };
}

function mergeCounts(target, source) {
  if (!source || typeof source !== "object") return;
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + number(value);
  }
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
