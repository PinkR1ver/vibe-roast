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

export function buildActivityHeatmap({ prompts = [], weeks = 52 }) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const start = addUtcDays(end, -(weeks * 7 - 1));

  // Align start to Sunday
  const startDow = start.getUTCDay();
  const startAligned = addUtcDays(start, -startDow);

  // Aggregate prompts by day
  const valuesByDay = new Map();
  for (const p of prompts || []) {
    if (!p.timestamp) continue;
    const day = String(p.timestamp).slice(0, 10);
    const cur = valuesByDay.get(day) || { value: 0, models: {} };
    cur.value++;
    const src = p.source || "unknown";
    cur.models[src] = (cur.models[src] || 0) + 1;
    valuesByDay.set(day, cur);
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
        level: clampLevel(levelFor(value)),
        models: dayData?.models || null,
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
