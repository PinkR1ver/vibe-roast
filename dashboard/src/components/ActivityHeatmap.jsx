import React, { useMemo } from "react";
import { buildActivityHeatmap } from "../lib/activity-heatmap.js";

const CELL = 12;
const GAP = 3;
const COLORS_LIGHT = ["#ebedf0", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"];
const COLORS_DARK = ["#1e293b", "#065f46", "#059669", "#10b981", "#34d399"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function ActivityHeatmap({ prompts = [], dailyRows = null, weeks = 26, dark = false }) {
  const heatmap = useMemo(
    () => buildActivityHeatmap({ prompts, dailyRows, weeks }),
    [prompts, dailyRows, weeks],
  );
  const colors = dark ? COLORS_DARK : COLORS_LIGHT;
  const grid = heatmap.weeks || [];
  const totalWidth = Math.max(grid.length * (CELL + GAP) + 28, 120);

  return (
    <div className="overflow-x-auto">
      <svg width={totalWidth} height={7 * (CELL + GAP) + 16} className="block">
        {DAY_LABELS.map((label, i) => (
          <text
            key={i}
            x={0}
            y={i * (CELL + GAP) + CELL + 1}
            className="text-[9px] fill-oai-gray-400"
            textAnchor="start"
          >
            {label}
          </text>
        ))}
        {grid.map((week, wi) =>
          (week || []).map((cell, di) => {
            if (!cell) return null;
            return (
              <rect
                key={`${wi}-${di}`}
                x={28 + wi * (CELL + GAP)}
                y={di * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                fill={colors[cell.level] || colors[0]}
              >
                <title>{`${cell.day}: ${Number(cell.value || 0).toLocaleString()}`}</title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}
