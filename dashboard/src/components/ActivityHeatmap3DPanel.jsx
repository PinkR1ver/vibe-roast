import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, Maximize2, RotateCcw, X } from "lucide-react";
import ActivityHeatmap3D, { PALETTES } from "./ActivityHeatmap3D.jsx";
import ActivityHeatmap from "./ActivityHeatmap.jsx";
import { buildActivityHeatmap } from "../lib/activity-heatmap.js";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLocale } from "../contexts/LocaleContext.jsx";

const PALETTE_ACCENTS = {
  emerald: { rawColor: "#10b981" },
  ocean: { rawColor: "#3b82f6" },
  neon: { rawColor: "#a855f7" },
  amber: { rawColor: "#f59e0b" },
};

function compactNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return n.toLocaleString();
  if (n < 1000000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  if (n < 1000000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 2)}M`;
  return `${(n / 1000000000).toFixed(n >= 10000000000 ? 0 : 2)}B`;
}

function calculateStats(weeks) {
  const cells = [];
  for (const week of weeks) {
    for (const cell of Array.isArray(week) ? week : []) {
      if (cell?.day) cells.push(cell);
    }
  }
  cells.sort((a, b) => a.day.localeCompare(b.day));

  let totalValue = 0;
  let activeDays = 0;
  let maxStreak = 0;
  let currentStreak = 0;
  let peakDay = { day: "—", value: 0 };

  for (const cell of cells) {
    const value = Number(cell.value) || 0;
    totalValue += value;
    if (value > 0) {
      activeDays += 1;
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    if (value > peakDay.value) peakDay = { day: cell.day, value };
  }

  const activeRate = cells.length ? ((activeDays / cells.length) * 100).toFixed(1) : "0.0";
  return { totalValue, activeDays, activeRate, maxStreak, peakDay };
}

export default function ActivityHeatmap3DPanel({
  prompts = [],
  activity = null,
  weeks = 20,
  className = "",
  forceLight = false,
  defaultPalette = "emerald",
  roastStyle = false,
  showViewToggle = false,
  defaultViewMode,
}) {
  const { theme } = useTheme();
  const { t } = useLocale();
  const isDark = forceLight
    ? false
    : theme === "dark" ||
      (theme === "system" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const hasDaily = Array.isArray(activity?.daily_rows) && activity.daily_rows.length > 0;
  const metric = hasDaily ? activity.metric || "tokens" : "prompts";
  const dailyRows = hasDaily ? activity.daily_rows : null;
  const heatmapWeeks = metric === "tokens" ? Math.max(weeks, 52) : weeks;
  const unitLabel = metric === "tokens" ? t("heatmap.tokens") : t("heatmap.prompts");
  const heatmap = useMemo(
    () => buildActivityHeatmap({ prompts, dailyRows, weeks: heatmapWeeks }),
    [prompts, dailyRows, heatmapWeeks],
  );
  const stats = useMemo(() => calculateStats(heatmap.weeks || []), [heatmap.weeks]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const activePalette = PALETTES[defaultPalette] ? defaultPalette : "emerald";
  const [viewMode, setViewMode] = useState(
    defaultViewMode ?? (showViewToggle || roastStyle ? "2d" : "3d"),
  );
  const [viewAnimKey, setViewAnimKey] = useState(0);
  const [viewTransition, setViewTransition] = useState("in"); // out | in
  const resetViewRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const compactShell = roastStyle || showViewToggle;
  const shellMin = compactShell ? "min-h-[190px]" : "min-h-[240px]";
  const shellMax = compactShell ? "max-h-[320px]" : "";

  const accent = PALETTE_ACCENTS[activePalette] || PALETTE_ACCENTS.emerald;
  const accentColors = isDark ? PALETTES[activePalette].dark : PALETTES[activePalette].light;
  const timezoneLabel = useMemo(() => {
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
    return `UTC${sign}${hours}:${minutes}`;
  }, []);

  const closeModal = () => setIsClosing(true);

  const switchViewMode = (mode) => {
    if (mode === viewMode) return;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setViewTransition("out");
    transitionTimerRef.current = setTimeout(() => {
      setViewMode(mode);
      setViewAnimKey((k) => k + 1);
      setViewTransition("in");
    }, 160);
  };

  useEffect(() => () => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isModalOpen || isClosing) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, isClosing]);

  const modal =
    isModalOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && isClosing) {
                setIsModalOpen(false);
                setIsClosing(false);
              }
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-md bg-black/40 ${
              isClosing ? "animate-tt-fade-out" : "animate-tt-fade-in"
            }`}
          >
            <div
              className={`relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] border border-black/[0.07] bg-[#fffcf7] shadow-[0_24px_70px_rgba(45,30,18,0.22)] dark:border-white/[0.08] dark:bg-[#171717] md:flex-row ${
                isClosing ? "animate-tt-modal-exit" : "animate-tt-modal"
              }`}
            >
              <div className="absolute right-4 top-4 z-50 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => resetViewRef.current?.reset()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-[#fffcf7] text-[#8b8680] hover:text-[#1a1a1a] dark:border-white/[0.08] dark:bg-[#171717] dark:text-[#8f8f8f] dark:hover:text-white"
                  title={t("heatmap.reset")}
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-[#fffcf7] text-[#8b8680] hover:text-[#1a1a1a] dark:border-white/[0.08] dark:bg-[#171717] dark:text-[#8f8f8f] dark:hover:text-white"
                  title={t("heatmap.close")}
                >
                  <X size={15} />
                </button>
              </div>

              <aside className="flex w-full flex-col gap-6 overflow-y-auto border-b border-black/[0.06] bg-[#f7f4ef] p-5 dark:border-white/[0.07] dark:bg-[#121212] md:w-[320px] md:border-b-0 md:border-r md:p-6">
                <div>
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent.rawColor }} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b8680] dark:text-[#8f8f8f]">
                      {t("heatmap.insight")}
                    </span>
                  </div>
                  <h4 className="mt-2 text-xl font-extrabold leading-none tracking-tight text-[#1a1a1a] dark:text-[#fafafa]">
                    {metric === "tokens" ? t("heatmap.tokenTitle") : t("heatmap.promptTitle")}
                  </h4>
                  <p className="mt-2 text-xs leading-5 text-[#716b65] dark:text-[#aaa49e]">
                    {metric === "tokens"
                      ? t("heatmap.tokenDesc")
                      : t("heatmap.promptDesc")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-5 border-y border-black/[0.07] py-5 dark:border-white/[0.08]">
                  <Metric
                    label={metric === "tokens" ? t("heatmap.totalTokens") : t("heatmap.totalPrompts")}
                    value={compactNumber(stats.totalValue)}
                    exact={`${stats.totalValue.toLocaleString()} ${unitLabel.toLowerCase()}`}
                  />
                  <Metric
                    label={metric === "tokens" ? t("heatmap.activeRateDays") : t("heatmap.activeDays")}
                    value={`${stats.activeRate}%`}
                    suffix={metric === "tokens" ? `(${stats.activeDays}D)` : undefined}
                    exact={t("heatmap.activeDayCount", { count: stats.activeDays })}
                  />
                  <Metric label={metric === "tokens" ? t("heatmap.longestStreak") : t("heatmap.maxStreak")} value={stats.maxStreak} suffix={t("heatmap.days")} />
                  <Metric
                    label={t("heatmap.peakDay")}
                    value={stats.peakDay.value > 0 ? compactNumber(stats.peakDay.value) : t("heatmap.noData")}
                    suffix={stats.peakDay.day}
                    exact={`${stats.peakDay.value.toLocaleString()} ${unitLabel.toLowerCase()}`}
                  />
                </div>

                <div className="mt-auto border-t border-black/[0.07] pt-4 dark:border-white/[0.08]">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b8680] dark:text-[#8f8f8f]">
                      {metric === "tokens" ? t("heatmap.activityLevels") : t("heatmap.legend")}
                    </span>
                    <div className="flex gap-1">
                      {accentColors.map((color, idx) => (
                        <div key={idx} className="flex-1 h-1 rounded-[2px]" style={{ backgroundColor: color }} title={`Level ${idx}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              <section className="relative flex h-full flex-1 items-center justify-center overflow-hidden p-4">
                <div
                  className="absolute inset-0 pointer-events-none transition-colors duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${accent.rawColor}0f, transparent 42%)`,
                  }}
                />
                <ActivityHeatmap3D
                  prompts={prompts}
                  dailyRows={dailyRows}
                  weeks={heatmapWeeks}
                  isDark={isDark}
                  interactive
                  palette={activePalette}
                  autoRotateInit={false}
                  onResetViewRef={resetViewRef}
                  unitLabel={unitLabel}
                />

                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[9px] font-bold text-oai-gray-400 bg-white/80 dark:bg-oai-gray-900/80 border border-oai-gray-200/50 dark:border-oai-gray-800/80 rounded-md px-2.5 py-1.5 select-none pointer-events-none backdrop-blur-md shadow-sm">
                  <Info size={10} style={{ color: accent.rawColor }} />
                  <span>{t("heatmap.footerTip")}</span>
                </div>
              </section>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={`relative w-full h-full ${shellMin} ${shellMax} ${className}`}>
        <div className="mb-4 flex min-h-7 items-center justify-between gap-3">
          <h2 className="m-0 text-sm font-semibold uppercase tracking-[0.03em] text-[#393633] dark:text-[#d4d4d4]">
            {t("profile.activity")}
          </h2>
          <div className="flex items-center gap-2">
            {showViewToggle && (
              <div
                role="tablist"
                aria-label={t("heatmap.viewLabel")}
                className="flex items-center rounded-lg border border-black/[0.07] bg-black/[0.02] p-0.5 text-[10px] font-medium text-[#8b8680] dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#8f8f8f]"
              >
            {["2d", "3d"].map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => switchViewMode(mode)}
                className={`rounded-md px-2 py-0.5 uppercase transition-colors ${
                  viewMode === mode
                    ? "bg-white text-[#1a1a1a] shadow-sm dark:bg-[#2a2a2a] dark:text-white"
                    : "hover:text-[#1a1a1a] dark:hover:text-white"
                }`}
              >
                {mode === "2d" ? t("heatmap.viewGrid") : t("heatmap.viewTerrain")}
              </button>
            ))}
              </div>
            )}
            <span className="text-xs text-[#8b8680] dark:text-[#8f8f8f]">{timezoneLabel}</span>
          </div>
        </div>

        <div
          key={`${viewMode}-${viewAnimKey}`}
          className={`h-full w-full ${shellMin} ${shellMax} ${
            viewTransition === "out" ? "heatmap-view-exit" : "heatmap-view-enter"
          }`}
        >
        {viewMode === "2d" ? (
          <div
            className="flex w-full items-center justify-center overflow-hidden"
          >
            <ActivityHeatmap
              prompts={prompts}
              dailyRows={dailyRows}
              weeks={heatmapWeeks}
              dark={isDark}
              compact={false}
              dense={false}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsClosing(false);
              setIsModalOpen(true);
            }}
            className={`group relative w-full h-[170px] overflow-hidden rounded-lg border transition-all cursor-pointer ${
              roastStyle
                ? "border-black/[0.04] bg-[#f7f4ef] hover:border-emerald-500/30 dark:border-white/[0.06] dark:bg-[#121212]"
                : "border-transparent hover:border-oai-gray-700"
            }`}
            title={t("heatmap.openTitle")}
          >
            <ActivityHeatmap3D
              prompts={prompts}
              dailyRows={dailyRows}
              weeks={heatmapWeeks}
              interactive={false}
              autoRotateInit={false}
              isDark={isDark}
              palette={activePalette}
              unitLabel={unitLabel}
            />
            <div
              className={`absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 ${
                roastStyle ? "bg-gradient-to-t from-[#f3f1ec]/70 to-transparent" : "bg-gradient-to-t from-oai-gray-950/20 to-transparent"
              }`}
            >
              <span
                className={`text-[10px] shadow px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200 ${
                  roastStyle
                    ? "bg-[#fffcf7]/95 border border-black/5 text-[#6b6560]"
                    : "bg-white/95 dark:bg-oai-gray-900/95 border border-oai-gray-200/60 dark:border-oai-gray-800/80 text-oai-gray-500 dark:text-oai-gray-400"
                }`}
              >
                <Maximize2 size={9} />
                {t("heatmap.open")}
              </span>
            </div>
          </button>
        )}
        </div>
      </div>
      {modal}
    </>
  );
}

function Metric({ label, value, suffix, exact }) {
  return (
    <div className="flex flex-col gap-1 relative group cursor-default">
      {exact && (
        <div className="absolute left-0 bottom-full mb-2 pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
          <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-[10px] font-semibold font-mono rounded-lg px-2.5 py-1.5 shadow-xl border border-zinc-200 dark:border-zinc-800/80 whitespace-nowrap">
            {exact}
          </div>
        </div>
      )}
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8680] dark:text-[#8f8f8f]">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-xl font-bold tracking-tight text-[#1a1a1a] transition-transform duration-200 group-hover:-translate-y-[1px] dark:text-[#fafafa]">
          {value}
        </span>
        {suffix && <span className="text-[10px] font-bold text-[#8b8680] dark:text-[#8f8f8f]">{suffix}</span>}
      </div>
    </div>
  );
}
