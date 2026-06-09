import React, { useState } from "react";
import { useApi } from "../hooks/useApi.jsx";
import { Badge } from "../ui";
import WordCloud from "../components/WordCloud.jsx";
import ActivityHeatmap3DPanel from "../components/ActivityHeatmap3DPanel.jsx";
import { useLocale } from "../contexts/LocaleContext.jsx";

const TYPE_CODE = {
  planning: "PLN", debugging: "DBG", implementation: "IMP", refactor: "REF",
  testing: "TST", packaging: "PKG", explanation: "EXP", research: "RSR",
  ui_design: "UID", workflow: "WRK",
};

export default function Dashboard() {
  const { data, loading, error } = useApi();
  const { t } = useLocale();
  const [envOpen, setEnvOpen] = useState(false);

  if (loading) return <Skeleton />;
  if (error) return <ErrorState error={error} title={t("dashboard.loading.errorTitle")} />;
  if (!data) return null;

  const { summary, profile_signals, word_frequencies, prompts, activity } = data;
  const pa = profile_signals?.prompt_analysis || {};
  const env = profile_signals?.environment?.codex;
  const categories = pa.categories || {};
  const totalPrompts = summary?.prompt_count || 0;
  const usefulRatio = pa.useful_ratio || 0;
  const sorted = Object.entries(categories)
    .filter(([k]) => k !== "reference")
    .sort((a, b) => b[1].count - a[1].count);
  const maxCount = sorted[0]?.[1]?.count || 1;
  const topKey = sorted[0]?.[0] || "implementation";

  return (
    <div className="animate-fade-in min-h-[calc(100vh-49px)] lg:h-[calc(100vh-49px)] flex flex-col bg-oai-gray-950 overflow-y-auto lg:overflow-hidden">
      {/* ═══ TOP ROW: 1 + 2 + 1 column grid ═══ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-0 min-h-0">
        {/* ── Col 1: Personality ── */}
        <div className="flex flex-col items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-oai-gray-900 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400 mb-4">
            {t("dashboard.profile.kicker")}
          </p>
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
            <span className="text-[34px] font-black tracking-tighter text-brand-400">
              {TYPE_CODE[topKey]}
            </span>
          </div>
          <h1 className="text-h4 text-white mb-1.5">{t(`type.${topKey}.title`)}</h1>
          <p className="text-body-sm text-oai-gray-400 max-w-[240px] leading-relaxed mb-4">
            {t(`type.${topKey}.desc`)}
          </p>
          <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
            <MiniStat value={totalPrompts.toLocaleString()} label={t("dashboard.stats.prompts")} />
            <MiniStat value={summary?.source_count} label={t("dashboard.stats.tools")} />
            <MiniStat value={`${(usefulRatio * 100).toFixed(0)}%`} label={t("dashboard.stats.useful")} />
            <MiniStat value={summary?.files_scanned || 0} label={t("dashboard.stats.files")} />
          </div>
        </div>

        {/* ── Col 2: Word Cloud + 3D Activity Map (wider) ── */}
        <div className="flex flex-col p-6 border-b lg:border-b-0 lg:border-r border-oai-gray-900 overflow-hidden min-h-[760px] lg:min-h-0 gap-5">
          {word_frequencies && word_frequencies.length > 0 && (
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400 mb-1.5">
                {t("dashboard.cloud.kicker")}
              </p>
              <h2 className="text-h4 text-white mb-2">{t("dashboard.cloud.title")}</h2>
              <div className="h-[270px] lg:h-[280px] flex items-center justify-center overflow-hidden">
                <WordCloud
                  words={word_frequencies}
                  width={760}
                  height={270}
                  gridSize={4}
                  weightDivisor={3.2}
                  rotateRatio={0.08}
                  minRotation={-0.14}
                  maxRotation={0.14}
                  ellipticity={0.62}
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
        <div className="flex flex-col justify-center p-6 overflow-hidden min-h-[360px] lg:min-h-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400 mb-1.5">
            {t("dashboard.dna.kicker")}
          </p>
          <h2 className="text-h4 text-white mb-3">{t("dashboard.dna.title")}</h2>

          {/* Category bars */}
          <div className="space-y-2 mb-4">
            {sorted.slice(0, 7).map(([name, row]) => (
              <div key={name}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-oai-gray-400">{t(`category.${name}`)}</span>
                  <span className="text-oai-gray-600 tabular-nums">{row.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-oai-gray-800 overflow-hidden">
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

      {/* ═══ BOTTOM ROW: Prompts + Environment ═══ */}
      <div className="border-t border-oai-gray-900">
        {/* Prompt examples */}
        {pa.useful_prompts && pa.useful_prompts.length > 0 && (
          <div className="px-6 py-3 flex items-center gap-4 overflow-x-auto border-b border-oai-gray-900">
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400">{t("dashboard.voice.kicker")}</p>
              <p className="text-xs text-oai-gray-500">{t("dashboard.voice.usefulPrompts", { count: pa.useful_prompt_count })}</p>
            </div>
            {pa.useful_prompts.slice(0, 10).map((p, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-64 p-3 rounded-xl bg-oai-gray-900 border border-oai-gray-800 hover:border-oai-gray-700 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Badge variant="info" className="text-[9px]">{p.source}</Badge>
                  <span className="text-[9px] text-oai-gray-500">{t(`category.${p.category}`)}</span>
                </div>
                <p className="text-xs text-oai-gray-300 line-clamp-2 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Environment (collapsed bar) */}
        {env && (
          <button
            onClick={() => setEnvOpen(!envOpen)}
            className="w-full px-6 py-2.5 flex items-center justify-between text-left hover:bg-oai-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400">{t("dashboard.world.kicker")}</span>
              <span className="text-xs text-oai-gray-500">
                {env.skills?.count || 0} {t("dashboard.env.skills")} · {env.mcp_servers?.count || 0} MCP · {env.plugins?.count || 0} {t("dashboard.env.plugins")}
                {env.config?.model ? ` · model: ${env.config.model}` : ""}
              </span>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth="1.5" className={`text-oai-gray-600 transition-transform shrink-0 ${envOpen ? "rotate-180" : ""}`}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        )}

        {/* Environment expand */}
        {envOpen && env && (
          <div className="px-6 py-4 border-t border-oai-gray-900 animate-slide-up overflow-y-auto max-h-48">
            <div className="flex flex-wrap gap-3">
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

function Skeleton() {
  return (
    <div className="h-screen bg-oai-gray-950 flex items-center justify-center">
      <div className="skeleton w-16 h-16 rounded-2xl" />
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
