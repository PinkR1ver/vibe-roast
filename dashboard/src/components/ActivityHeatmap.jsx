import React, { useMemo } from "react";
import { buildActivityHeatmap } from "../lib/activity-heatmap.js";
import { useLocale } from "../contexts/LocaleContext.jsx";

const COLORS_LIGHT = ["#ebedf0", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"];
const COLORS_DARK = ["#121212", "#065f46", "#059669", "#10b981", "#34d399"];
const CELL = 11;
const GAP = 2;
const LABEL_WIDTH = 26;

export default function ActivityHeatmap({
  prompts = [],
  dailyRows = null,
  weeks = 26,
  dark = false,
  compact = false,
  dense = false,
}) {
  const { locale, t } = useLocale();
  const heatmap = useMemo(
    () => buildActivityHeatmap({ prompts, dailyRows, weeks }),
    [prompts, dailyRows, weeks],
  );
  const colors = dark ? COLORS_DARK : COLORS_LIGHT;
  const grid = heatmap.weeks || [];
  const totalWidth = Math.max(grid.length * (CELL + GAP) + LABEL_WIDTH, 120);
  const dayLabels = locale === "zh"
    ? ["日", "一", "二", "三", "四", "五", "六"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabels = useMemo(() => {
    const labels = [];
    grid.forEach((week, index) => {
      const monthStart = (week || []).find((cellDay) => cellDay?.day?.endsWith("-01"))?.day;
      if (!monthStart) return;
      const date = new Date(`${monthStart}T00:00:00Z`);
      labels.push({
        index,
        text: new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
          month: "short",
          timeZone: "UTC",
        }).format(date),
      });
    });
    return labels;
  }, [grid, locale]);

  return (
    <div className="w-full">
      <div className="activity-scroll overflow-x-auto overflow-y-hidden pb-1">
        <div style={{ width: totalWidth }}>
          <div className="relative mb-1 h-3 text-[10px] uppercase text-[#8b8680] dark:text-[#8f8f8f]">
            {monthLabels.map((month) => (
              <span
                key={`${month.text}-${month.index}`}
                className="absolute whitespace-nowrap"
                style={{ left: LABEL_WIDTH + month.index * (CELL + GAP) }}
              >
                {month.text}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap: GAP }}>
            <div
              className="grid shrink-0 text-[10px] text-[#8b8680] dark:text-[#8f8f8f]"
              style={{ width: LABEL_WIDTH, gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}
            >
              {dayLabels.map((label) => <span key={label} className="leading-none">{label}</span>)}
            </div>
            <div
              className="grid"
              style={{
                gridAutoFlow: "column",
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gap: GAP,
              }}
            >
              {grid.map((week, wi) =>
                (week || []).map((cellDay, di) => (
                  cellDay ? (
                    <span
                      key={cellDay.day || `${wi}-${di}`}
                      className="activity-cell cursor-pointer rounded-[2px] transition-transform hover:z-10 hover:scale-125"
                      style={{
                        width: CELL,
                        height: CELL,
                        background: colors[cellDay.level] || colors[0],
                        ["--motion-delay"]: `${Math.min(420, wi * 7 + di * 5)}ms`,
                      }}
                      title={`${cellDay.day}: ${Number(cellDay.value || 0).toLocaleString()}`}
                    />
                  ) : <span key={`${wi}-${di}`} style={{ width: CELL, height: CELL }} />
                )),
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-[10px] text-[#8b8680] dark:text-[#8f8f8f]">{t("heatmap.less")}</span>
        <span className="flex gap-0.5">
          {colors.map((color, index) => (
            <span key={color} className="rounded-[1px]" style={{ width: 10, height: 10, background: color }} title={`Level ${index}`} />
          ))}
        </span>
        <span className="text-[10px] text-[#8b8680] dark:text-[#8f8f8f]">{t("heatmap.more")}</span>
      </div>
    </div>
  );
}
