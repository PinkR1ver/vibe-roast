import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import AgentIcon, { agentLabel, normalizeAgentId } from "./AgentIcon.jsx";
import WordCloud from "./WordCloud.jsx";
import { useLocale } from "../contexts/LocaleContext.jsx";
import {
  buildContextBreakdowns,
  buildModelUsage,
  buildUsageOverview,
  buildUsageTrend,
  filterUsageRows,
  filterUsageRowsBySource,
} from "../lib/usage-analytics.js";
import { buildVibeCloudWords, filterWordCloudRecords } from "../lib/vibe-cloud.js";

const PERIODS = ["day", "week", "month", "total", "custom"];
const SOURCE_COLORS = {
  cursor: "#18b981",
  codex: "#3b82f6",
  claude: "#df7854",
  opencode: "#8b5cf6",
  gemini: "#22d3ee",
  copilot: "#facc15",
};
const FALLBACK_COLORS = ["#f59e0b", "#ec4899", "#14b8a6", "#6366f1"];
const CLOUD_COLORS = [
  "#ff5a1f", "#f0c14a", "#e07a3a", "#c45c26", "#8b5a2b",
  "#23d6a5", "#5b8cff", "#6b6560", "#d97706", "#b45309",
];

function sourceColor(source, index = 0) {
  return SOURCE_COLORS[normalizeAgentId(source)] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function compactNumber(value) {
  const number = Number(value) || 0;
  if (number < 1000) return number.toLocaleString();
  if (number < 1e6) return `${(number / 1e3).toFixed(number >= 1e4 ? 0 : 1)}K`;
  if (number < 1e9) return `${(number / 1e6).toFixed(number >= 1e8 ? 0 : 1)}M`;
  return `${(number / 1e9).toFixed(number >= 1e10 ? 1 : 2)}B`;
}

function periodLabel(period, zh) {
  const labels = zh
    ? { day: "日", week: "周", month: "月", total: "全部", custom: "自定义" }
    : { day: "Day", week: "Week", month: "Month", total: "Total", custom: "Custom" };
  return labels[period];
}

function AnimatedCompactNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return undefined;
    }
    setDisplay(0);
    let frame;
    const started = performance.now();
    const duration = 850;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return compactNumber(display);
}

export default function UsageAnalytics({ activity, wordCloudRecords = [] }) {
  const { locale, t } = useLocale();
  const zh = locale === "zh";
  const [period, setPeriod] = useState("total");
  const [source, setSource] = useState("all");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [showAllModels, setShowAllModels] = useState(false);
  const allRows = activity?.daily_rows || [];
  const filteredRows = useMemo(
    () => filterUsageRows(allRows, period, custom),
    [allRows, period, custom],
  );
  const overviewAll = useMemo(() => buildUsageOverview(filteredRows), [filteredRows]);
  const lifetimeOverview = useMemo(() => buildUsageOverview(allRows), [allRows]);
  const visibleRows = useMemo(
    () => filterUsageRowsBySource(filteredRows, source),
    [filteredRows, source],
  );
  const overview = useMemo(() => buildUsageOverview(visibleRows), [visibleRows]);
  const trend = useMemo(() => buildUsageTrend(visibleRows), [visibleRows]);
  const visibleWordRecords = useMemo(
    () => filterWordCloudRecords(wordCloudRecords, filteredRows, period, custom, source),
    [wordCloudRecords, filteredRows, period, custom, source],
  );
  const domainWeights = useMemo(
    () => Object.fromEntries(
      buildVibeCloudWords(wordCloudRecords, { locale, limit: 500 })
        .filter((word) => word.kind === "domain")
        .map((word) => [word.key, word.weight]),
    ),
    [wordCloudRecords, locale],
  );
  const cloudWords = useMemo(
    () => buildVibeCloudWords(visibleWordRecords, { locale, limit: 36, domainWeights }),
    [visibleWordRecords, locale, domainWeights],
  );
  const estimatedCost = Number(activity?.estimated_cost_usd || 0)
    * (lifetimeOverview.totalTokens > 0 ? overview.totalTokens / lifetimeOverview.totalTokens : 0);
  const modelUsage = useMemo(
    () => buildModelUsage(visibleRows, { estimatedCostUsd: estimatedCost }),
    [visibleRows, estimatedCost],
  );
  const contextBreakdowns = useMemo(
    () => buildContextBreakdowns(visibleRows),
    [visibleRows],
  );
  const contextBreakdown = source === "codex" || source === "claude"
    ? contextBreakdowns.find((item) => item.source === source)
    : null;
  const sourceOptions = overviewAll.sources;

  return (
    <div className="space-y-4">
      <section className="motion-reveal motion-surface rounded-[18px] border border-black/[0.06] bg-[#fffcf7] p-5 shadow-[0_10px_30px_rgba(40,28,12,0.06)] dark:border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label={t("usage.period")}>
            {PERIODS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={period === key}
                onClick={() => setPeriod(key)}
                className={`motion-button rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  period === key
                    ? "bg-black/[0.07] text-[#1a1a1a] dark:bg-white/[0.09] dark:text-white"
                    : "text-[#6b6560] hover:bg-black/[0.04] dark:text-[#b0b0b0] dark:hover:bg-white/[0.05]"
                }`}
              >
                {periodLabel(key, zh)}
              </button>
            ))}
          </div>

          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="h-9 rounded-lg border border-black/[0.1] bg-transparent px-3 text-xs font-medium text-[#1a1a1a] outline-none dark:border-white/[0.12] dark:text-white"
            aria-label={t("usage.agentFilter")}
          >
            <option value="all">{t("usage.allAgents")}</option>
            {sourceOptions.map((item) => (
              <option key={item.source} value={item.source}>{agentLabel(item.source)}</option>
            ))}
          </select>
        </div>

        {period === "custom" && (
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <input
              type="date"
              value={custom.from}
              onChange={(event) => setCustom((current) => ({ ...current, from: event.target.value }))}
              className="rounded-lg border border-black/[0.1] bg-transparent px-2 py-1.5 text-xs dark:border-white/[0.12]"
              aria-label={t("usage.from")}
            />
            <span className="self-center text-xs text-[#8b8680] dark:text-[#8f8f8f]">→</span>
            <input
              type="date"
              value={custom.to}
              onChange={(event) => setCustom((current) => ({ ...current, to: event.target.value }))}
              className="rounded-lg border border-black/[0.1] bg-transparent px-2 py-1.5 text-xs dark:border-white/[0.12]"
              aria-label={t("usage.to")}
            />
          </div>
        )}

        <div className="py-7 text-center">
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#6b6560] dark:text-[#b0b0b0]">
            {activity?.metric === "tokens" ? t("profile.stat.totalTokens") : t("profile.stat.totalPrompts")}
          </div>
          <div className="mt-2 font-[JetBrains_Mono,ui-monospace,monospace] text-[58px] font-bold leading-none tracking-[-0.05em]">
            <AnimatedCompactNumber value={overview.totalTokens} />
          </div>
          {estimatedCost > 0 && (
            <div className="mt-5 flex items-baseline justify-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8680] dark:text-[#8f8f8f]">
                {t("profile.stat.estCost")}
              </span>
              <span className="text-xl font-bold text-emerald-500">
                ${estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <div className="mb-5 flex h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
          {(source === "all" ? overview.sources : overview.sources.slice(0, 1)).map((item, index) => (
            <span
              key={item.source}
              className="usage-segment"
              style={{
                width: source === "all" ? `${item.percent}%` : "100%",
                background: sourceColor(item.source, index),
                ["--motion-delay"]: `${index * 70}ms`,
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          <UsageSourceCard
            source="all"
            selected={source === "all"}
            percent={overviewAll.totalTokens > 0 ? 100 : 0}
            modelCount={overviewAll.modelCount}
            onClick={() => setSource("all")}
            t={t}
          />
          {sourceOptions.map((item, index) => (
            <UsageSourceCard
              key={item.source}
              {...item}
              selected={source === item.source}
              color={sourceColor(item.source, index)}
              onClick={() => setSource(item.source)}
              t={t}
            />
          ))}
        </div>

        <div className="mt-5 border-t border-black/[0.07] pt-4 dark:border-white/[0.08]">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b8680] dark:text-[#8f8f8f]">
                {t("usage.cloudKicker")}
              </div>
              <h2 className="m-0 mt-0.5 text-sm font-semibold uppercase tracking-[0.03em] text-[#393633] dark:text-[#d4d4d4]">
                {t("usage.cloud")}
              </h2>
            </div>
            <span className="text-[11px] text-[#8b8680] dark:text-[#8f8f8f]">
              {t("usage.cloudPromptCount", { count: visibleWordRecords.length })}
            </span>
          </div>

          <div className="h-[170px] w-full overflow-hidden rounded-xl bg-[#f7f4ef] dark:bg-black/20">
            {cloudWords.length > 0 ? (
              <WordCloud
                words={cloudWords}
                width={860}
                height={170}
                gridSize={3}
                weightDivisor={4.2}
                rotateRatio={0.06}
                minRotation={-0.16}
                maxRotation={0.16}
                ellipticity={0.92}
                minSize={7}
                colors={CLOUD_COLORS}
                fontFamily="Outfit, system-ui, sans-serif"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#8b8680] dark:text-[#8f8f8f]">
                {t("usage.cloudEmpty")}
              </div>
            )}
          </div>
        </div>

        <ContextBreakdown
          breakdown={contextBreakdown}
          source={source}
          t={t}
        />

        <ModelUsage
          usage={modelUsage}
          showAll={showAllModels}
          onToggle={() => setShowAllModels((current) => !current)}
          zh={zh}
          t={t}
        />
      </section>

      <UsageTrend trend={trend} sources={sourceOptions} zh={zh} t={t} />
    </div>
  );
}

function ModelUsage({ usage, showAll, onToggle, zh, t }) {
  const models = usage?.models || [];
  if (models.length === 0) return null;
  const visible = showAll ? models : models.slice(0, 6);
  const expandable = models.length > visible.length || showAll;
  const showCost = visible.some((model) => model.estimatedCostUsd > 0);

  return (
    <div className="mt-4 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
      <div className="mb-0.5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b8680] dark:text-[#8f8f8f]">
            {t("usage.modelKicker")}
          </div>
          <h2 className="m-0 mt-0.5 text-sm font-semibold uppercase tracking-[0.03em] text-[#393633] dark:text-[#d4d4d4]">
            {t("usage.models")}
          </h2>
        </div>
        <span className="text-[11px] text-[#8b8680] dark:text-[#8f8f8f]">
          {t("profile.stat.modelCount", { count: models.length })}
        </span>
      </div>

      <div>
        {visible.map((model) => (
          <div key={model.model} className="border-b border-black/[0.055] py-1.5 last:border-b-0 dark:border-white/[0.065]">
            <div
              className={`grid items-baseline gap-x-3 text-xs ${
                showCost
                  ? "grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                  : "grid-cols-[minmax(0,1fr)_auto_auto]"
              }`}
            >
              <span className="truncate font-medium text-[#393633] dark:text-[#d4d4d4]" title={model.model}>
                {modelName(model.model, zh)}
              </span>
              <span className="font-[JetBrains_Mono,ui-monospace,monospace] tabular-nums text-[#6b6560] dark:text-[#b0b0b0]">
                {compactNumber(model.tokens)}
              </span>
              {showCost && (
                <span className="min-w-[56px] text-right tabular-nums text-[#8b8680] dark:text-[#8f8f8f]">
                  {model.estimatedCostUsd > 0
                    ? `$${model.estimatedCostUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : "—"}
                </span>
              )}
              <span className="w-[46px] text-right font-[JetBrains_Mono,ui-monospace,monospace] tabular-nums text-[#393633] dark:text-[#d4d4d4]">
                {model.percent < 0.1 && model.percent > 0 ? "<0.1" : model.percent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1 h-[2px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
              <span
                className="block h-full origin-left rounded-full"
                style={{
                  width: `${Math.max(0.5, model.percent)}%`,
                  background: sourceColor(model.dominantSource),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {expandable && (
        <button
          type="button"
          onClick={onToggle}
          className="motion-button mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[#6b6560] hover:bg-black/[0.04] dark:text-[#b0b0b0] dark:hover:bg-white/[0.05]"
        >
          {showAll ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showAll
            ? t("usage.showLessModels")
            : t("usage.showAllModels", { count: models.length })}
        </button>
      )}
    </div>
  );
}

const CONTEXT_COLORS = {
  messages: "#2997dc",
  tool_calls: "#3f8bc5",
  reasoning: "#78a9cf",
  system_prompt: "#8a9cab",
  custom_agents: "#5f7890",
};

function ContextBreakdown({ breakdown, source, t }) {
  if (!breakdown) return null;

  return (
    <div className="mt-4 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b8680] dark:text-[#8f8f8f]">
            {t("usage.contextKicker")}
          </div>
          <h2 className="m-0 mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-[#393633] dark:text-[#d4d4d4]">
            <AgentIcon agent={source} size={16} />
            {t("usage.contextTitle", { agent: agentLabel(source) })}
          </h2>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#8b8680] dark:text-[#8f8f8f]">
        {breakdown.cacheHitRate > 0 && (
          <span>{t("usage.cacheHit", { percent: Math.round(breakdown.cacheHitRate) })}</span>
        )}
        <span>{t("usage.contextEvents", { count: breakdown.eventCount })}</span>
        {breakdown.toolCallCount > 0 && (
          <span>{t("usage.toolCallCount", { count: breakdown.toolCallCount })}</span>
        )}
      </div>

      <div className="space-y-0.5">
        {breakdown.categories.map((category) => (
          <div
            key={category.key}
            className="relative grid min-h-6 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 overflow-hidden rounded px-1.5 text-[11px]"
          >
            <span
              className="absolute inset-y-0 left-0 opacity-[0.14]"
              style={{
                width: `${Math.max(1, category.percent)}%`,
                background: CONTEXT_COLORS[category.key],
              }}
            />
            <span className="relative flex items-center gap-1.5 text-[#4b4743] dark:text-[#c8c8c8]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: CONTEXT_COLORS[category.key] }} />
              {t(`usage.context.${category.key}`)}
            </span>
            <span className="relative font-[JetBrains_Mono,ui-monospace,monospace] tabular-nums text-[#6b6560] dark:text-[#b0b0b0]">
              {compactNumber(category.tokens)}
            </span>
            <span className="relative w-[44px] text-right tabular-nums text-[#8b8680] dark:text-[#8f8f8f]">
              {category.percent < 0.1 ? "<0.1" : category.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <details className="mt-2 text-[10px] text-[#99938d] dark:text-[#777]">
        <summary className="w-fit cursor-pointer select-none font-medium underline-offset-2 hover:underline">
          {t("usage.methodology")}
        </summary>
        <p className="mb-0 mt-1.5 max-w-2xl leading-relaxed">
          {source === "codex" ? t("usage.contextCodexNote") : t("usage.contextClaudeNote")}
        </p>
      </details>
    </div>
  );
}

function modelName(model, zh) {
  if (model === "auto") return zh ? "自动路由" : "Auto routing";
  if (model === "unknown") return zh ? "未知模型" : "Unknown model";
  return model;
}

function UsageSourceCard({ source, percent, modelCount, selected, color, onClick, t }) {
  const all = source === "all";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`motion-button motion-source-card min-w-0 rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-emerald-500/45 bg-emerald-500/[0.05]"
          : "border-black/[0.12] hover:border-black/[0.22] dark:border-white/[0.14] dark:hover:border-white/[0.24]"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase">
        {all ? <span className="inline-flex h-[18px] w-[18px] items-center justify-center">◈</span> : <AgentIcon agent={source} size={18} />}
        <span className="truncate">{all ? t("usage.all") : agentLabel(source)}</span>
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums" style={!all ? { color } : undefined}>
        {percent < 0.01 && percent > 0 ? "<0.01" : percent.toFixed(2)}%
      </div>
      <div className="mt-1 text-[11px] text-[#8b8680] dark:text-[#8f8f8f]">
        {t("profile.stat.modelCount", { count: modelCount })}
      </div>
    </button>
  );
}

function UsageTrend({ trend, sources, zh, t }) {
  const max = Math.max(1, ...trend.map((bucket) => bucket.total));
  const sourceOrder = sources.map((item) => item.source);
  const firstLabel = trend[0]?.key || "—";
  const lastLabel = trend[trend.length - 1]?.key || "—";

  return (
    <section className="motion-reveal motion-surface rounded-[18px] border border-black/[0.06] bg-[#fffcf7] p-5 shadow-[0_10px_30px_rgba(40,28,12,0.06)] dark:border-white/[0.08]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 text-sm font-semibold uppercase tracking-[0.03em] text-[#393633] dark:text-[#d4d4d4]">
          {t("usage.trend")}
        </h2>
      </div>
      <div className="relative h-[175px] border-y border-black/[0.07] dark:border-white/[0.08]">
        {[0.25, 0.5, 0.75].map((position) => (
          <span
            key={position}
            className="pointer-events-none absolute inset-x-0 border-t border-black/[0.06] dark:border-white/[0.07]"
            style={{ top: `${position * 100}%` }}
          />
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] pt-2">
          {trend.map((bucket, bucketIndex) => (
            <div key={`${bucket.key}-${bucket.total}`} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${bucket.key}: ${bucket.total.toLocaleString()}`}>
              <div
                className="usage-trend-bar flex w-full flex-col-reverse"
                style={{
                  height: `${Math.max(2, (bucket.total / max) * 100)}%`,
                  ["--motion-delay"]: `${Math.min(360, bucketIndex * 32)}ms`,
                }}
              >
                {sourceOrder.map((source, index) => {
                  const value = Number(bucket.sources[source] || 0);
                  if (value <= 0) return null;
                  return (
                    <span
                      key={source}
                      style={{
                        height: `${(value / bucket.total) * 100}%`,
                        background: sourceColor(source, index),
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-[#6b6560] dark:text-[#b0b0b0]">
        <span>{formatBucketLabel(firstLabel, zh)}</span>
        <span>{formatBucketLabel(lastLabel, zh)}</span>
      </div>
    </section>
  );
}

function formatBucketLabel(key, zh) {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(key)) return key;
  const date = new Date(`${key}${key.length === 7 ? "-01" : ""}T00:00:00Z`);
  return new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    ...(key.length === 10 ? { day: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}
