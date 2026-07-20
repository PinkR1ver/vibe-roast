import React, { useMemo } from "react";
import { buildActivityHeatmap } from "../lib/activity-heatmap.js";

const COLORS_LIGHT = ["#ebedf0", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"];
const COLORS_DARK = ["#1e293b", "#065f46", "#059669", "#10b981", "#34d399"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function ActivityHeatmap({
  prompts = [],
  dailyRows = null,
  weeks = 26,
  dark = false,
  compact = false,
}) {
  const heatmap = useMemo(
    () => buildActivityHeatmap({ prompts, dailyRows, weeks }),
    [prompts, dailyRows, weeks],
  );
  const cell = compact ? 9 : 12;
  const gap = compact ? 2 : 3;
  const labelW = compact ? 22 : 28;
  const colors = dark ? COLORS_DARK : COLORS_LIGHT;
  const grid = heatmap.weeks || [];
  const totalWidth = Math.max(grid.length * (cell + gap) + labelW, 120);

  return (
    <div className="overflow-x-auto">
      <svg width={totalWidth} height={7 * (cell + gap) + (compact ? 8 : 16)} className="block">
        {DAY_LABELS.map((label, i) => (
          <text
            key={i}
            x={0}
            y={i * (cell + gap) + cell + 1}
            className="text-[9px] fill-oai-gray-400"
            textAnchor="start"
          >
            {label}
          </text>
        ))}
        {grid.map((week, wi) =>
          (week || []).map((cellDay, di) => {
            if (!cellDay) return null;
            return (
              <rect
                key={`${wi}-${di}`}
                x={labelW + wi * (cell + gap)}
                y={di * (cell + gap)}
                width={cell}
                height={cell}
                rx={2}
                fill={colors[cellDay.level] || colors[0]}
              >
                <title>{`${cellDay.day}: ${Number(cellDay.value || 0).toLocaleString()}`}</title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}
