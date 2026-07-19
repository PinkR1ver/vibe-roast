import React, { useMemo } from "react";

const CELL = 12;
const GAP = 3;
const COLORS_LIGHT = ["#ebedf0", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"];
const COLORS_DARK = ["#1e293b", "#065f46", "#059669", "#10b981", "#34d399"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function buildHeatmap(prompts, weeks = 26) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - weeks * 7 + 1);
  // align to Monday
  const startDow = start.getUTCDay();
  const delta = startDow === 0 ? 6 : startDow - 1;
  start.setUTCDate(start.getUTCDate() - delta);

  const totalDays = Math.floor((end - start) / 86400000) + 1;
  const weekCount = Math.ceil(totalDays / 7);

  const counts = new Map();
  for (const p of prompts || []) {
    if (!p.timestamp) continue;
    const day = String(p.timestamp).slice(0, 10);
    counts.set(day, (counts.get(day) || 0) + 1);
  }

  const allValues = [];
  const grid = [];
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setUTCDate(dt.getUTCDate() + w * 7 + d);
      const key = dt.toISOString().slice(0, 10);
      const value = counts.get(key) || 0;
      if (dt > end) { week.push(null); continue; }
      if (value > 0) allValues.push(value);
      week.push({ day: key, value });
    }
    grid.push(week);
  }

  allValues.sort((a, b) => a - b);
  const q = (arr, pct) => {
    if (!arr.length) return 0;
    const pos = (arr.length - 1) * pct;
    const lo = Math.floor(pos), hi = Math.min(arr.length - 1, lo + 1);
    return Math.round(arr[lo] + (arr[hi] - arr[lo]) * (pos - lo));
  };
  const t1 = q(allValues, 0.5), t2 = q(allValues, 0.75), t3 = q(allValues, 0.9);

  for (const week of grid) {
    for (const cell of week) {
      if (!cell) continue;
      if (!cell.value) cell.level = 0;
      else if (cell.value <= t1) cell.level = 1;
      else if (cell.value <= t2) cell.level = 2;
      else if (cell.value <= t3) cell.level = 3;
      else cell.level = 4;
    }
  }

  return { grid, maxValue: allValues[allValues.length - 1] || 0 };
}

export default function ActivityHeatmap({ prompts = [], weeks = 26, dark = false }) {
  const heatmap = useMemo(() => buildHeatmap(prompts, weeks), [prompts, weeks]);
  const colors = dark ? COLORS_DARK : COLORS_LIGHT;
  const grid = heatmap.grid;
  const totalWidth = grid.length * (CELL + GAP) + 28;

  return (
    <div className="overflow-x-auto">
      <svg width={totalWidth} height={7 * (CELL + GAP) + 16} className="block">
        {/* Day labels */}
        {DAY_LABELS.map((label, i) => (
          <text
            key={i}
            x={0} y={i * (CELL + GAP) + CELL + 1}
            className="text-[9px] fill-oai-gray-400"
            textAnchor="start"
          >
            {label}
          </text>
        ))}
        {/* Cells */}
        {grid.map((week, wi) =>
          week.map((cell, di) => {
            if (!cell) return null;
            return (
              <rect
                key={`${wi}-${di}`}
                x={28 + wi * (CELL + GAP)}
                y={di * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                fill={colors[cell.level]}
              >
                {cell.value > 0 && (
                  <title>{cell.day}: {cell.value} prompts</title>
                )}
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}
