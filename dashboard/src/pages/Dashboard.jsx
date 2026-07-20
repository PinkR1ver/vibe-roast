import React, { useState } from "react";
import { useApi } from "../hooks/useApi.jsx";
import WordCloud from "../components/WordCloud.jsx";
import ActivityHeatmap3DPanel from "../components/ActivityHeatmap3DPanel.jsx";
import { ProviderIcon } from "../components/ProviderIcon.jsx";
import { useLocale } from "../contexts/LocaleContext.jsx";
import { buildDnaDimensions, buildModelBreakdown, buildWorldMetrics } from "../lib/profile-viz.js";
import { buildTimeRange } from "../lib/time-range.js";

export default function Dashboard({ onOpenProfile }) {
  const { t, locale } = useLocale();
  const [rangeMode, setRangeMode] = useState("total");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const range = buildTimeRange(rangeMode, customRange);
  const { data, loading, error } = useApi(range);
  const [envOpen, setEnvOpen] = useState(false);

  if (loading && !data) return <Skeleton filter={<TimeFilter mode={rangeMode} rangeLabel={range.label} customRange={customRange} loading={loading} onModeChange={setRangeMode} onCustomChange={setCustomRange} t={t} />} />;
  if (error) return <ErrorState error={error} title={t("dashboard.loading.errorTitle")} />;
  if (!data) return null;

  const { summary, profile_signals, word_frequencies, prompts, activity, vibe_profile: vibe } = data;
  const pa = profile_signals?.prompt_analysis || {};
  const env = profile_signals?.environment?.codex;
  const categories = pa.categories || {};
  const totalPrompts = summary?.prompt_count || 0;
  const usefulRatio = pa.useful_ratio || 0;
  const sorted = Object.entries(categories)
    .filter(([k]) => k !== "reference")
    .sort((a, b) => b[1].count - a[1].count);
  const maxCount = sorted[0]?.[1]?.count || 1;
  const dnaDimensions = buildDnaDimensions(categories);
  const worldMetrics = buildWorldMetrics(env);
  const modelBreakdown = buildModelBreakdown(activity);
  const zh = locale === "zh";
  const archetypeTitle = vibe?.archetype?.title || t("dashboard.profile.unknown");
  const archetypeHook = zh ? vibe?.archetype?.hookZh : vibe?.archetype?.hook;

  return (
    <div className="animate-fade-in min-h-[calc(100vh-49px)] lg:h-[calc(100vh-49px)] flex flex-col bg-oai-gray-950 overflow-y-auto lg:overflow-hidden">
      <TimeFilter mode={rangeMode} rangeLabel={range.label} customRange={customRange} loading={loading} onModeChange={setRangeMode} onCustomChange={setCustomRange} t={t} />
      {/* ═══ TOP ROW: 1 + 2 + 1 column grid ═══ */}
      <div key={`${range.from || "total"}-${range.to || "all"}-${data.generated_at}`} className={`dashboard-stage flex-1 grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-0 min-h-0 ${loading ? "is-refreshing" : ""}`}>
        {/* ── Col 1: Personality ── */}
        <div className="dashboard-part stagger-1 flex flex-col items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-oai-gray-900 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400 mb-3">
            {t("dashboard.profile.kicker")}
          </p>
          {vibe?.figure ? (
            <button
              type="button"
              onClick={() => onOpenProfile?.(data)}
              className="group mb-3 w-full max-w-[200px] rounded-2xl border border-oai-gray-800 bg-oai-gray-900/40 p-3 transition-colors hover:border-brand-500/40 hover:bg-oai-gray-900"
              title={t("dashboard.profile.openResult")}
            >
              <img
                src={vibe.figure}
                alt={archetypeTitle}
                className="mx-auto h-36 w-auto object-contain drop-shadow-lg transition-transform group-hover:scale-[1.02]"
              />
            </button>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <span className="text-[34px] font-black tracking-tighter text-brand-400">VW</span>
            </div>
          )}
          <h1 className="text-h4 text-white mb-1">{archetypeTitle}</h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: vibe?.archetype?.accent || "#10b981" }}>
            {vibe?.archetype?.code || "—"} · {vibe?.tier?.id || "—"}
          </p>
          <p className="text-body-sm text-oai-gray-400 max-w-[240px] leading-relaxed mb-2">
            {archetypeHook || t("dashboard.profile.fallbackHook")}
          </p>
          {vibe && (
            <div className="mb-3 text-[28px] font-black tabular-nums text-white">
              {Number(vibe.total).toFixed(1)}
              <span className="ml-1 text-xs font-semibold text-oai-gray-500">/ 100</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onOpenProfile?.(data)}
            className="mb-4 h-8 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500 transition-colors"
          >
            {t("dashboard.profile.openResult")}
          </button>
          <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
            <MiniStat value={totalPrompts.toLocaleString()} label={t("dashboard.stats.prompts")} />
            <MiniStat value={summary?.source_count} label={t("dashboard.stats.tools")} />
            <MiniStat value={`${(usefulRatio * 100).toFixed(0)}%`} label={t("dashboard.stats.useful")} />
            <MiniStat value={summary?.files_scanned || 0} label={t("dashboard.stats.files")} />
          </div>
        </div>

        {/* ── Col 2: Word Cloud + 3D Activity Map (wider) ── */}
        <div className="dashboard-part stagger-2 flex flex-col p-6 border-b lg:border-b-0 lg:border-r border-oai-gray-900 overflow-hidden min-h-[760px] lg:min-h-0 gap-5">
          {word_frequencies && word_frequencies.length > 0 && (
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400 mb-1.5">
                {t("dashboard.cloud.kicker")}
              </p>
              <h2 className="text-h4 text-white mb-2">{t("dashboard.cloud.title")}</h2>
              <div className="h-[270px] w-full overflow-hidden lg:h-[280px]">
                <WordCloud
                  words={word_frequencies}
                  width={760}
                  height={270}
                  gridSize={6}
                  weightDivisor={4}
                  rotateRatio={0.12}
                  minRotation={-0.28}
                  maxRotation={0.28}
                  ellipticity={0.65}
                  minSize={10}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col flex-1 min-h-[280px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400 mb-1.5">
              {t("dashboard.rhythm.kicker")}
            </p>
            <h2 className="text-h4 text-white mb-1">{t("dashboard.rhythm.title")}</h2>
            <p className="text-caption text-oai-gray-500 mb-4">
              {t("dashboard.rhythm.description")}
            </p>
            <div className="flex-1 min-h-0">
              <ActivityHeatmap3DPanel prompts={prompts || []} activity={activity} weeks={52} />
            </div>
          </div>
        </div>

        {/* ── Col 3: Categories ── */}
        <div className="dashboard-part stagger-3 flex flex-col justify-center p-5 overflow-hidden min-h-[440px] lg:min-h-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400 mb-1.5">
            {t("dashboard.dna.kicker")}
          </p>
          <div className="flex items-end justify-between gap-3 mb-3">
            <h2 className="text-h4 text-white">{t("dashboard.dna.title")}</h2>
            <span className="text-[10px] uppercase tracking-[0.18em] text-oai-gray-600">
              {t("dashboard.dna.sixAxis")}
            </span>
          </div>

          <RadarChart dimensions={dnaDimensions} labelFor={(key) => t(`dashboard.dna.axis.${key}`)} />

          <div className="mt-4 grid grid-cols-2 gap-2">
            {sorted.slice(0, 6).map(([name, row]) => (
              <div key={name} className="rounded-lg border border-oai-gray-800 bg-oai-gray-900/60 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2 text-[10px] mb-1.5">
                  <span className="text-oai-gray-400">{t(`category.${name}`)}</span>
                  <span className="text-oai-gray-600 tabular-nums">{row.count}</span>
                </div>
                <div className="h-1 rounded-full bg-oai-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full cat-${name}`}
                    style={{ width: `${Math.max((row.count / maxCount) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ═══ BOTTOM ROW: Environment ═══ */}
      <div className="dashboard-part stagger-4 border-t border-oai-gray-900">
        {env && (
          <WorldPanel env={env} metrics={worldMetrics} modelBreakdown={modelBreakdown} open={envOpen} onToggle={() => setEnvOpen(!envOpen)} t={t} />
        )}
      </div>
    </div>
  );
}

function WorldPanel({ env, metrics, modelBreakdown, open, onToggle, t }) {
  const [selectedSource, setSelectedSource] = useState(null);
  const visibleSkills = env.skills?.names?.slice(0, 8) || [];
  const visiblePlugins = env.plugins?.names?.slice(0, 5) || [];
  const resourceMetrics = metrics.filter((metric) => metric.key !== "model");
  const hasModels = modelBreakdown.models.length > 0;
  const sourceColors = modelBreakdown.sources.map((source, index) => sourceColor(source.key, index));
  const activeSource = modelBreakdown.sources.find((source) => source.key === selectedSource) || modelBreakdown.sources[0] || null;
  const activeModels = activeSource?.models || modelBreakdown.models;

  return (
    <div className="px-7 py-3.5">
      <div className="w-full text-left">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400">{t("dashboard.world.kicker")}</p>
            <p className="text-xs text-oai-gray-500">{t("dashboard.world.subtitle")}</p>
          </div>
          <div className="flex items-baseline gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.16em] text-oai-gray-600">{t("dashboard.world.totalTokens")}</div>
              <div className="text-xl font-black tracking-tight text-white tabular-nums">{formatCompact(modelBreakdown.totalTokens || 0)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.16em] text-oai-gray-600">{t("dashboard.world.models")}</div>
              <div className="text-sm font-semibold text-brand-400 tabular-nums">{modelBreakdown.modelCount || 0}</div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg p-2 text-oai-gray-600 transition-colors hover:bg-oai-gray-900 hover:text-oai-gray-300"
              title={open ? t("dashboard.world.collapse") : t("dashboard.world.expand")}
            >
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                strokeWidth="1.5" className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-oai-gray-800">
          {hasModels ? modelBreakdown.sources.map((source, index) => (
            <div className="source-segment" key={source.key} style={{ width: `${source.percent}%`, backgroundColor: sourceColors[index], animationDelay: `${220 + index * 45}ms` }} />
          )) : (
            <div className="w-full bg-brand-500/60" />
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
          {hasModels ? modelBreakdown.sources.slice(0, 5).map((source, index) => (
            <button
              key={source.key}
              type="button"
              onClick={() => {
                setSelectedSource(source.key);
                if (!open) onToggle();
              }}
              className={`provider-card rounded-xl border px-3 py-2.5 text-left ${activeSource?.key === source.key ? "is-selected border-oai-gray-600 bg-oai-gray-800" : "border-oai-gray-800 bg-oai-gray-900/50"}`}
              style={{ "--provider-color": sourceColors[index], animationDelay: `${120 + index * 55}ms` }}
            >
              <div className="flex items-center gap-2">
                <ProviderIcon provider={source.key} size={16} className="shrink-0" style={{ color: sourceColors[index] }} />
                <span className="truncate text-xs font-semibold uppercase text-white">{source.key}</span>
              </div>
              <div className="mt-2 text-lg font-bold tabular-nums text-white">{source.percent}%</div>
              <div className="mt-0.5 text-[10px] text-oai-gray-500">
                {t("dashboard.world.modelCount", { count: source.modelCount })}
              </div>
            </button>
          )) : resourceMetrics.map((metric) => (
            <div key={metric.key} className="rounded-xl border border-oai-gray-800 bg-oai-gray-900/50 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.16em] text-oai-gray-600">{t(`dashboard.world.${metric.key}`)}</div>
              <div className="mt-1 text-lg font-bold text-white truncate">{metric.value}</div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="pt-3 mt-3 border-t border-oai-gray-900 animate-slide-up overflow-y-auto max-h-48">
          {hasModels && (
            <div className="mb-3 space-y-1">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-oai-gray-600">
                <ProviderIcon provider={activeSource?.key} size={13} style={{ color: sourceColor(activeSource?.key, 0) }} />
                {activeSource?.key || t("dashboard.world.models")}
              </div>
              {activeModels.slice(0, 12).map((model) => (
                <div key={model.key} className="grid grid-cols-[minmax(0,1fr)_90px_52px] items-center gap-3 border-b border-oai-gray-900 py-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-xs text-oai-gray-300">{model.model}</div>
                    <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-oai-gray-800">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(model.percent, 2)}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums text-oai-gray-500">{formatCompact(model.tokens)}</div>
                  <div className="text-right text-xs tabular-nums text-oai-gray-300">{model.percent}%</div>
                </div>
              ))}
            </div>
          )}
          <div className="mb-3 flex gap-3 overflow-hidden text-[10px] text-oai-gray-500">
            <ChipRow label={t("dashboard.world.skills")} names={visibleSkills} />
            <ChipRow label={t("dashboard.world.plugins")} names={visiblePlugins} />
          </div>
          <div className="flex flex-wrap gap-2">
            {env.skills?.names?.map((n) => (
              <span key={n} className="px-2.5 py-1 rounded-full text-[11px] bg-oai-gray-800 text-oai-gray-300">{n}</span>
            ))}
          </div>
          {env.mcp_servers?.names?.length > 0 && (
            <div className="flex items-center gap-3 mt-3 text-xs text-oai-gray-500">
              <span className="text-oai-gray-600">MCP:</span>
              {env.mcp_servers.names.join(", ")}
            </div>
          )}
          {env.plugins?.names?.length > 0 && (
            <div className="flex items-center gap-3 mt-1 text-xs text-oai-gray-500">
              <span className="text-oai-gray-600">Plugins:</span>
              {env.plugins.names.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function sourceColor(source, index) {
  const colors = {
    cursor: "#2ecc71",
    codex: "#3b82f6",
    claude: "#d97757",
    opencode: "#8b5cf6",
    gemini: "#2196f3",
  };
  return colors[String(source || "").toLowerCase()] || `hsl(${150 + index * 40}, 62%, 48%)`;
}

function TimeFilter({ mode, rangeLabel, customRange, loading, onModeChange, onCustomChange, t }) {
  const modes = ["day", "week", "month", "total", "custom"];
  const visibleRangeLabel = mode === "total" ? t("dashboard.time.allTime") : rangeLabel;

  return (
    <div className="time-filter border-b border-oai-gray-900 px-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
        {modes.map((item) => (
          <button
            key={item}
            onClick={() => onModeChange(item)}
            className={`time-filter-button h-8 rounded-lg px-3 text-xs transition-colors ${
              mode === item
                ? "is-active bg-oai-gray-800 text-white"
                : "text-oai-gray-400 hover:bg-oai-gray-900 hover:text-white"
            }`}
          >
            {t(`dashboard.time.${item}`)}
          </button>
        ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-oai-gray-500">
          <span className={loading ? "range-pulse" : ""}>{visibleRangeLabel}</span>
          {loading && <span className="loading-dot" />}
        </div>
        {mode === "custom" && (
          <div className="flex items-center gap-2">
            <DateInput
              value={customRange.from}
              onChange={(from) => onCustomChange({ ...customRange, from })}
            />
            <span className="text-xs text-oai-gray-700">{t("dashboard.time.to")}</span>
            <DateInput
              value={customRange.to}
              onChange={(to) => onCustomChange({ ...customRange, to })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-lg border border-oai-gray-800 bg-oai-gray-900 px-2 text-xs text-oai-gray-300 outline-none focus:border-brand-500"
    />
  );
}

function formatCompact(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function ChipRow({ label, names }) {
  if (!names.length) return null;

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      <span className="shrink-0 uppercase tracking-[0.14em] text-oai-gray-600">{label}</span>
      {names.slice(0, 5).map((name) => (
        <span key={name} className="shrink-0 rounded-full bg-oai-gray-800 px-2 py-0.5 text-oai-gray-400">
          {name}
        </span>
      ))}
    </div>
  );
}

function RadarChart({ dimensions, labelFor }) {
  const size = 220;
  const center = size / 2;
  const maxRadius = 74;
  const rings = [0.33, 0.66, 1];
  const points = dimensions.map((dimension, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
    const radius = 24 + dimension.score * (maxRadius - 24);
    return {
      ...dimension,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * 94,
      labelY: center + Math.sin(angle) * 94,
      axisX: center + Math.cos(angle) * maxRadius,
      axisY: center + Math.sin(angle) * maxRadius,
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="relative flex items-center justify-center rounded-2xl border border-oai-gray-800 bg-oai-gray-900/50 py-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {rings.map((ring) => {
          const ringPoints = dimensions.map((_, index) => {
            const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
            return `${center + Math.cos(angle) * maxRadius * ring},${center + Math.sin(angle) * maxRadius * ring}`;
          }).join(" ");
          return <polygon key={ring} points={ringPoints} fill="none" stroke="rgba(115,115,115,0.24)" strokeWidth="1" />;
        })}
        {points.map((point) => (
          <line key={point.key} x1={center} y1={center} x2={point.axisX} y2={point.axisY} stroke="rgba(115,115,115,0.18)" strokeWidth="1" />
        ))}
        <polygon points={polygon} fill="rgba(16,185,129,0.22)" stroke="#10b981" strokeWidth="2" />
        {points.map((point) => (
          <circle key={point.key} cx={point.x} cy={point.y} r="3.5" fill="#10b981" stroke="#0a0a0a" strokeWidth="1.5" />
        ))}
        {points.map((point) => (
          <text
            key={`${point.key}-label`}
            x={point.labelX}
            y={point.labelY}
            textAnchor={point.labelX < center - 6 ? "end" : point.labelX > center + 6 ? "start" : "middle"}
            dominantBaseline="middle"
            className="fill-oai-gray-400 text-[10px] font-semibold uppercase"
          >
            {labelFor(point.key)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ── Mini stat ──────────────────────────────────────────── */

function MiniStat({ value, label }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-oai-gray-900 border border-oai-gray-800 text-center">
      <div className="text-[17px] font-bold tabular-nums text-white">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-oai-gray-500">{label}</div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

function Skeleton({ filter = null }) {
  return (
    <div className="h-screen bg-oai-gray-950 flex flex-col">
      {filter}
      <div className="flex flex-1 items-center justify-center">
        <div className="loader-mark">
          <span>V</span>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, title }) {
  return (
    <div className="h-screen bg-oai-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-h3 text-white mb-2">{title}</p>
        <p className="text-body-sm text-oai-gray-500">{error}</p>
      </div>
    </div>
  );
}
