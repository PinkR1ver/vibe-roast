import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, Maximize2, Pause, Play, RotateCcw, Terminal, X } from "lucide-react";
import ActivityHeatmap3D, { PALETTES } from "./ActivityHeatmap3D.jsx";
import ActivityHeatmap from "./ActivityHeatmap.jsx";
import { buildActivityHeatmap } from "../lib/activity-heatmap.js";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLocale } from "../contexts/LocaleContext.jsx";

const PALETTE_LABELS = {
  emerald: "Emerald",
  ocean: "Ocean",
  neon: "Neon",
  amber: "Amber",
};

const PALETTE_ACCENTS = {
  emerald: { rawColor: "#10b981", text: "text-emerald-400" },
  ocean: { rawColor: "#3b82f6", text: "text-blue-400" },
  neon: { rawColor: "#a855f7", text: "text-purple-400" },
  amber: { rawColor: "#f59e0b", text: "text-amber-400" },
};

function compactNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return n.toLocaleString();
  if (n < 1000000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  if (n < 1000000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 2)}M`;
  return `${(n / 1000000000).toFixed(n >= 10000000000 ? 0 : 2)}B`;
}

function calculateStats(weeks, metric, t) {
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
  let peakDay = { day: t("heatmap.noData"), value: 0 };

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
  let title = metric === "tokens" ? t("heatmap.peakContributor") : t("heatmap.steadySignal");
  let message = metric === "tokens"
    ? t("heatmap.tokenMessage.default")
    : t("heatmap.promptMessage.steady");
  if (metric === "tokens") {
    if (totalValue >= 1000000000) {
      title = t("heatmap.peakContributor");
      message = t("heatmap.tokenMessage.peak");
    } else if (totalValue >= 100000000) {
      title = t("heatmap.heavyTokenFlow");
      message = t("heatmap.tokenMessage.heavy");
    }
  } else if (totalValue >= 1000) {
    title = t("heatmap.heavyCadence");
    message = t("heatmap.promptMessage.heavy");
  } else if (totalValue >= 300) {
    title = t("heatmap.coreWorkflow");
    message = t("heatmap.promptMessage.core");
  } else if (totalValue >= 80) {
    title = t("heatmap.buildingMomentum");
    message = t("heatmap.promptMessage.momentum");
  }

  return { totalValue, activeDays, activeRate, maxStreak, peakDay, title, message };
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
  const stats = useMemo(() => calculateStats(heatmap.weeks || [], metric, t), [heatmap.weeks, metric, t]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activePalette, setActivePalette] = useState(defaultPalette);
  const [modalAutoRotate, setModalAutoRotate] = useState(false);
  const [viewMode, setViewMode] = useState(
    defaultViewMode ?? (showViewToggle || roastStyle ? "2d" : "3d"),
  );
  const [viewAnimKey, setViewAnimKey] = useState(0);
  const [viewTransition, setViewTransition] = useState("in"); // out | in
  const resetViewRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const compactShell = roastStyle || showViewToggle;
  const shellMin = compactShell ? "min-h-[180px]" : "min-h-[240px]";
  const shellMax = compactShell ? "max-h-[280px]" : "";

  const accent = PALETTE_ACCENTS[activePalette] || PALETTE_ACCENTS.emerald;
  const accentColors = isDark ? PALETTES[activePalette].dark : PALETTES[activePalette].light;

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
              className={`relative w-full max-w-6xl h-[88vh] backdrop-blur-2xl bg-white/90 dark:bg-oai-gray-900/90 border border-oai-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col md:flex-row overflow-hidden ${
                isClosing ? "animate-tt-modal-exit" : "animate-tt-modal"
              }`}
            >
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 z-50 p-2 rounded-full border border-oai-gray-200/60 dark:border-oai-gray-800/60 bg-white/50 dark:bg-oai-gray-900/50 text-oai-gray-500 dark:text-oai-gray-400 hover:text-oai-gray-900 dark:hover:text-white hover:rotate-90 hover:scale-105 active:scale-95 transition-all duration-300"
                title={t("heatmap.close")}
              >
                <X size={16} />
              </button>

              <aside className="w-full md:w-[340px] border-b md:border-b-0 md:border-r border-zinc-200/50 dark:border-zinc-800/40 p-5 md:p-6 flex flex-col gap-6 overflow-y-auto backdrop-blur-md bg-zinc-50/50 dark:bg-zinc-950/50">
                <div>
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accent.rawColor }} />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: accent.rawColor }} />
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest font-mono text-zinc-400 dark:text-zinc-500">
                      {t("heatmap.insight")}
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none mt-2 select-none">
                    {metric === "tokens" ? t("heatmap.tokenTitle") : t("heatmap.promptTitle")}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500 mt-2 font-normal select-none">
                    {metric === "tokens"
                      ? t("heatmap.tokenDesc")
                      : t("heatmap.promptDesc")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-5 border-y border-zinc-200/50 dark:border-zinc-800/50 py-5 select-none">
                  <Metric
                    label={metric === "tokens" ? t("heatmap.totalTokens") : t("heatmap.totalPrompts")}
                    value={compactNumber(stats.totalValue)}
                    exact={`${stats.totalValue.toLocaleString()} ${unitLabel.toLowerCase()}`}
                    accent={accent.rawColor}
                  />
                  <Metric
                    label={metric === "tokens" ? t("heatmap.activeRateDays") : t("heatmap.activeDays")}
                    value={`${stats.activeRate}%`}
                    suffix={metric === "tokens" ? `(${stats.activeDays}D)` : undefined}
                    exact={t("heatmap.activeDayCount", { count: stats.activeDays })}
                  />
                  <Metric label={metric === "tokens" ? t("heatmap.longestStreak") : t("heatmap.maxStreak")} value={stats.maxStreak} suffix={t("heatmap.days")} highlight />
                  <Metric label={metric === "tokens" ? t("heatmap.tokenBuckets") : t("heatmap.sourceCount")} value={metric === "tokens" ? activity?.bucket_count || 0 : new Set(prompts.map((p) => p.source).filter(Boolean)).size || 0} />
                  <div className="flex flex-col gap-1 col-span-2 relative group cursor-help">
                    <Metric
                      label={metric === "tokens" ? t("heatmap.peakBlowout") : t("heatmap.peakDay")}
                      value={stats.peakDay.value > 0 ? compactNumber(stats.peakDay.value) : t("heatmap.noData")}
                      suffix={stats.peakDay.day}
                      exact={`${stats.peakDay.value.toLocaleString()} ${unitLabel.toLowerCase()}`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 py-1">
                  <div className="flex items-center gap-1.5 select-none">
                    <Terminal size={11} style={{ color: accent.rawColor }} />
                    <span className="text-[9px] font-extrabold uppercase tracking-widest font-mono" style={{ color: accent.rawColor }}>
                      {stats.title}
                    </span>
                  </div>
                  <div className="pl-3.5 border-l-2 relative transition-all duration-300" style={{ borderColor: accent.rawColor }}>
                    <div className="absolute inset-y-0 left-0 w-[3px] blur-[2px] opacity-15 pointer-events-none rounded-full" style={{ backgroundColor: accent.rawColor }} />
                    <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-normal">
                      {stats.message}
                    </p>
                  </div>
                </div>

                <div className="mt-auto border-t border-zinc-200/50 dark:border-zinc-800/50 pt-4 select-none">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                        {metric === "tokens" ? t("heatmap.activityLevels") : t("heatmap.legend")}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                        {PALETTE_LABELS[activePalette]}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {accentColors.map((color, idx) => (
                        <div key={idx} className="flex-1 h-1 rounded-[2px]" style={{ backgroundColor: color }} title={`Level ${idx}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              <section className="flex-1 h-full relative flex items-center justify-center overflow-hidden p-4">
                <div
                  className="absolute inset-0 pointer-events-none transition-colors duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${accent.rawColor}0f, transparent 42%)`,
                  }}
                />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 p-1.5 backdrop-blur-md bg-white/70 dark:bg-oai-gray-900/75 border border-oai-gray-200/60 dark:border-oai-gray-800/80 rounded-full shadow-lg z-30 select-none">
                  <div className="flex items-center gap-1.5 px-2">
                    {Object.keys(PALETTE_ACCENTS).map((key) => {
                      const selected = activePalette === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActivePalette(key)}
                          title={PALETTE_LABELS[key]}
                          className="w-3.5 h-3.5 rounded-full transition-all duration-200 relative hover:scale-125"
                          style={{ backgroundColor: PALETTE_ACCENTS[key].rawColor }}
                        >
                          {selected && <span className="absolute inset-0 rounded-full ring-2 ring-offset-1 ring-offset-white dark:ring-offset-oai-gray-900 ring-oai-gray-900 dark:ring-white scale-110" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="w-[1px] h-4 bg-oai-gray-200 dark:bg-oai-gray-800" />
                  <div className="flex items-center gap-1 pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !modalAutoRotate;
                        setModalAutoRotate(next);
                        resetViewRef.current?.toggleAutoRotate(next);
                      }}
                      title={modalAutoRotate ? t("heatmap.pause") : t("heatmap.play")}
                      className={`p-1.5 rounded-full transition-all duration-200 hover:bg-oai-gray-100 dark:hover:bg-oai-gray-800 ${
                        modalAutoRotate ? accent.text : "text-oai-gray-400 hover:text-oai-gray-600 dark:hover:text-oai-gray-200"
                      }`}
                    >
                      {modalAutoRotate ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalAutoRotate(false);
                        resetViewRef.current?.reset();
                      }}
                      title={t("heatmap.reset")}
                      className="p-1.5 rounded-full text-oai-gray-400 hover:text-oai-gray-600 dark:hover:text-oai-gray-200 hover:bg-oai-gray-100 dark:hover:bg-oai-gray-800 transition-all duration-200"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                </div>

                <ActivityHeatmap3D
                  prompts={prompts}
                  dailyRows={dailyRows}
                  weeks={heatmapWeeks}
                  isDark={isDark}
                  interactive
                  palette={activePalette}
                  autoRotateInit={modalAutoRotate}
                  onResetViewRef={resetViewRef}
                  unitLabel={unitLabel}
                />

                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[9px] font-bold text-oai-gray-400 bg-white/80 dark:bg-oai-gray-900/80 border border-oai-gray-200/50 dark:border-oai-gray-800/80 rounded-md px-2.5 py-1.5 select-none pointer-events-none backdrop-blur-md shadow-sm">
                  <Info size={10} className={accent.text} />
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
        {showViewToggle && (
          <div
            className={`absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 rounded-full p-0.5 text-[10px] font-bold ${
              roastStyle
                ? "border border-black/5 bg-[#fffcf7]/95 text-[#6b6560]"
                : "border border-oai-gray-200/70 bg-white/90 text-oai-gray-500 dark:border-oai-gray-800 dark:bg-oai-gray-900/90 dark:text-oai-gray-400"
            }`}
          >
            {["2d", "3d"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchViewMode(mode)}
                className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors ${
                  viewMode === mode
                    ? roastStyle
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/90 text-white"
                    : "hover:text-emerald-600"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}

        <div
          key={`${viewMode}-${viewAnimKey}`}
          className={`h-full w-full ${shellMin} ${shellMax} ${
            viewTransition === "out" ? "heatmap-view-exit" : "heatmap-view-enter"
          }`}
        >
        {viewMode === "2d" ? (
          <div
            className={`flex h-full ${shellMin} ${shellMax} items-center justify-center overflow-x-auto rounded-lg border ${
              compactShell ? "px-1 py-1" : "px-3 py-4"
            } ${roastStyle ? "border-black/[0.04] bg-[#f7f4ef]" : "border-transparent"}`}
          >
            <ActivityHeatmap
              prompts={prompts}
              dailyRows={dailyRows}
              weeks={heatmapWeeks}
              dark={isDark}
              compact={false}
              dense={compactShell}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsClosing(false);
              setIsModalOpen(true);
            }}
            className={`group relative w-full h-full ${shellMin} ${shellMax} overflow-hidden rounded-lg border transition-all cursor-pointer ${
              roastStyle
                ? "border-black/[0.04] bg-[#f7f4ef] hover:border-[color-mix(in_srgb,var(--roast-accent,#ff5a1f)_35%,#e4dfd6)]"
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

function Metric({ label, value, suffix, exact, accent, highlight = false }) {
  return (
    <div className="flex flex-col gap-1 relative group cursor-default">
      {exact && (
        <div className="absolute left-0 bottom-full mb-2 pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
          <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-[10px] font-semibold font-mono rounded-lg px-2.5 py-1.5 shadow-xl border border-zinc-200 dark:border-zinc-800/80 whitespace-nowrap">
            {exact}
          </div>
        </div>
      )}
      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-black tracking-tight font-mono transition-transform duration-200 group-hover:-translate-y-[1px] ${highlight ? "text-amber-500" : "text-zinc-900 dark:text-zinc-50"}`}>
          {value}
        </span>
        {suffix && <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">{suffix}</span>}
        {accent && (
          <svg width="24" height="10" viewBox="0 0 24 10" fill="none" className="opacity-30 group-hover:opacity-60 transition-opacity">
            <path d="M1 9C3 7 5 7 7 4C9 1 11 0 13 2C15 4 17 0 23 0" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}
