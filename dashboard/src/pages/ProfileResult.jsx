import React, { useMemo, useState } from "react";
import { useLocale } from "../contexts/LocaleContext.jsx";
import WordCloud from "../components/WordCloud.jsx";
import ActivityHeatmap3DPanel from "../components/ActivityHeatmap3DPanel.jsx";
import { buildHashtags } from "../lib/hashtags.js";
import { buildModelBreakdown } from "../lib/profile-viz.js";
import { downloadCanvasPng, renderSharePoster } from "../lib/share-poster.js";

const ROAST_CLOUD_COLORS = [
  "#ff5a1f", "#f0c14a", "#e07a3a", "#c45c26", "#8b5a2b",
  "#23d6a5", "#5b8cff", "#6b6560", "#d97706", "#b45309",
];

function compactNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return n.toLocaleString();
  if (n < 1000000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  if (n < 10000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
  return `${(n / 1000000000).toFixed(n >= 10000000000 ? 0 : 2)}B`;
}

function PageChrome({ accent, onShare, posterBusy, t }) {
  const { toggleLocale } = useLocale();

  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <h1 className="roast-brand m-0 text-[44px] sm:text-[52px] leading-[0.95] text-[#1a1a1a]">
        Vibe Roaster
      </h1>
      <div className="flex items-center gap-1 pb-1">
        <button
          type="button"
          onClick={toggleLocale}
          className="h-8 px-2 rounded-lg text-[11px] font-semibold text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/[0.04] transition-colors"
          title="Language"
        >
          {t("app.language")}
        </button>
        <a
          href="https://github.com/PinkR1ver/vibe-wrapper"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/[0.04] transition-colors"
          aria-label="GitHub"
        >
          <svg width="16" height="16" viewBox="0 0 15 15" fill="currentColor">
            <path d="M7.5.5a7 7 0 0 0-2.21 13.64c.35.06.48-.15.48-.33v-1.16c-1.97.42-2.38-.94-2.38-.94-.33-.82-.8-1.04-.8-1.04-.64-.44.05-.43.05-.43.71.05 1.09.72 1.09.72.64 1.08 1.67.77 2.07.59.06-.46.25-.77.45-.95-1.58-.18-3.24-.78-3.24-3.5 0-.77.28-1.4.73-1.9-.07-.18-.32-.9.07-1.87 0 0 .6-.19 1.95.73A6.8 6.8 0 0 1 7.5 3.9a6.8 6.8 0 0 1 1.78.24c1.35-.92 1.95-.73 1.95-.73.39.97.14 1.69.07 1.87.45.5.73 1.13.73 1.9 0 2.73-1.66 3.32-3.25 3.5.26.22.48.65.48 1.3v1.93c0 .18.13.4.49.33A7 7 0 0 0 7.5.5Z" />
          </svg>
        </a>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            disabled={posterBusy}
            className="ml-1 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(255,90,31,0.25)] disabled:opacity-60"
            style={{ background: accent }}
          >
            {posterBusy ? t("profile.posterBusy") : t("profile.posterCta")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfileResult({ data }) {
  const { locale, t } = useLocale();
  const zh = locale === "zh";
  const vibe = data?.vibe_profile;
  const summary = data?.summary || {};
  const activity = data?.activity || null;
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState("");

  const categories = data?.profile_signals?.prompt_analysis?.categories || {};
  const hashtags = useMemo(() => buildHashtags(vibe, categories), [vibe, categories]);
  const words = data?.word_frequencies || [];
  const accent = vibe?.archetype?.accent || "#ff5a1f";
  const modelBreakdown = useMemo(() => buildModelBreakdown(activity || {}), [activity]);
  const isTokenMetric = activity?.metric === "tokens" && Number(activity?.total_tokens || 0) > 0;
  const peak = activity?.peak_day;
  const hasCost = activity?.estimated_cost_usd != null && Number(activity.estimated_cost_usd) > 0;
  const estCost = hasCost ? Number(activity.estimated_cost_usd) : null;

  if (!vibe) {
    return (
      <div className="min-h-screen bg-[#f3f1ec] text-[#1a1a1a] px-4 py-8">
        <div className="mx-auto w-full max-w-[1120px]">
          <PageChrome accent={accent} t={t} />
          <p className="text-[#6b6560]">{t("profile.empty")}</p>
        </div>
      </div>
    );
  }

  const roast = zh ? vibe.roastZh : vibe.roast;
  const tldr = zh ? vibe.tldrZh : vibe.tldr;
  const tierBlurb = zh ? vibe.tier.blurbZh : vibe.tier.blurb;
  const hook = zh ? vibe.archetype.hookZh : vibe.archetype.hook;

  async function handleSharePoster() {
    setPosterBusy(true);
    setPosterError("");
    try {
      const canvas = await renderSharePoster({ vibe, hashtags });
      const code = (vibe.archetype?.code || "vibe").toLowerCase();
      downloadCanvasPng(canvas, `vibe-roast-${code}-3x4.png`);
    } catch (err) {
      setPosterError(err?.message || String(err));
    } finally {
      setPosterBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,#ffe7d6_0%,transparent_55%),radial-gradient(900px_500px_at_100%_0%,#d9fff3_0%,transparent_50%),linear-gradient(180deg,#f3f1ec_0%,#e8e4db_100%)] text-[#1a1a1a]"
      style={{ ["--roast-accent"]: accent }}
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 pt-7 pb-20">
        <PageChrome
          accent={accent}
          onShare={handleSharePoster}
          posterBusy={posterBusy}
          t={t}
        />
        {posterError && <p className="mb-4 text-sm text-[#e24b4b]">{posterError}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] gap-5 items-start min-w-0">
          <aside className="min-w-0 text-center">
            <div className="relative mx-auto mb-2 overflow-hidden px-2 pt-3 isolate">
              <div
                className="pointer-events-none absolute left-1/2 top-[8%] z-0 h-[78%] w-full -translate-x-1/2 rounded-[46%_54%_42%_58%/48%_44%_56%_52%]"
                style={{
                  background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${accent} 28%, #fff), transparent 58%), radial-gradient(circle at 70% 65%, color-mix(in srgb, ${accent} 16%, #f3f1ec), transparent 62%)`,
                }}
              />
              <img
                src={vibe.figure}
                alt={vibe.archetype.title}
                width={384}
                height={512}
                className="relative z-[1] mx-auto h-auto w-[88%] max-w-[280px] object-contain drop-shadow-[0_18px_28px_rgba(40,28,12,0.12)]"
              />
            </div>
            <p className="m-0 text-[13px] font-bold tracking-wide text-[#6b6560]">@{vibe.archetype.code.toLowerCase()}</p>
            <h1 className="mt-1 mb-1 text-[28px] font-extrabold tracking-tight" style={{ color: accent }}>
              {vibe.archetype.title}
            </h1>
            <p className="m-0 text-sm font-semibold text-[#6b6560]">{hook}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-1 text-[12px] font-bold"
                  style={{
                    background: `color-mix(in srgb, ${accent} 14%, #fffcf7)`,
                    color: `color-mix(in srgb, ${accent} 72%, #222)`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-5 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="font-[JetBrains_Mono,ui-monospace,monospace] text-[42px] font-bold leading-none tracking-tight">
                    {Number(vibe.total).toFixed(1)}
                    <span className="ml-1 text-base font-semibold text-[#6b6560]">/ 100</span>
                  </div>
                  <div className="mt-2 text-sm font-bold" style={{ color: vibe.tier.color }}>
                    {vibe.tier.emoji} {vibe.tier.id}
                  </div>
                  <p className="mt-1 mb-0 text-sm text-[#6b6560]">{tierBlurb}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {vibe.signals.map((signal) => (
                    <div key={signal.label} className="min-w-[88px] rounded-xl bg-[#f3f1ec] px-2.5 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6560]">
                        {zh ? signal.labelZh : signal.label}
                      </div>
                      <div className="mt-1 text-sm font-bold tabular-nums">{signal.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 mb-0 text-xs text-[#6b6560]">
                {data?.range?.from || "…"} → {data?.range?.to || "…"} · {summary.source_count || 0} {t("profile.sources")}
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 min-w-0">
              <div className="min-w-0 rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-4 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="m-0 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.radar")}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b8680]">{t("profile.sixAxis")}</span>
                </div>
                <ScoreRadar dimensions={vibe.dimensions} accent={accent} zh={zh} />
              </div>

              <div className="min-w-0 rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-4 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
                <h2 className="m-0 mb-3 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.axes")}</h2>
                <div className="space-y-2.5">
                  {vibe.dimensions.map((dim) => (
                    <div key={dim.key} className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{zh ? dim.labelZh : dim.label}</div>
                        <div className="text-[11px] text-[#8b8680] break-words">{dim.hint}</div>
                      </div>
                      <div className="shrink-0 whitespace-nowrap font-[JetBrains_Mono,ui-monospace,monospace] text-sm font-bold tabular-nums" style={{ color: accent }}>
                        {Number(dim.value).toFixed(1)}
                        <span className="text-[#8b8680]">/{dim.max}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-5 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
              <h2 className="m-0 mb-3 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.roast")}</h2>
              <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap">{roast}</p>
              <p className="mt-4 mb-0 rounded-xl bg-[#fff0e8] px-3 py-2 text-sm">
                <b>TL;DR</b> · {tldr}
              </p>
            </div>

            {words.length > 0 && (
              <div className="rounded-[18px] border border-black/[0.04] bg-[#fffcf7] px-3 py-2.5 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b8680]">{t("profile.cloudKicker")}</div>
                <h2 className="m-0 mb-1.5 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.cloud")}</h2>
                <div className="h-[140px] w-full overflow-hidden rounded-xl bg-[#f7f4ef]">
                  <WordCloud
                    words={words.slice(0, 80)}
                    width={720}
                    height={140}
                    gridSize={3}
                    weightDivisor={4.2}
                    rotateRatio={0.08}
                    minRotation={-0.18}
                    maxRotation={0.18}
                    ellipticity={0.9}
                    minSize={7}
                    colors={ROAST_CLOUD_COLORS}
                    fontFamily="Outfit, system-ui, sans-serif"
                  />
                </div>
              </div>
            )}

            <div className="rounded-[18px] border border-black/[0.04] bg-[#fffcf7] px-3 py-2.5 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b8680]">{t("profile.activityKicker")}</div>
              <h2 className="m-0 mb-0.5 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.activity")}</h2>
              <p className="mt-0 mb-2 text-xs text-[#8b8680]">
                {isTokenMetric ? t("profile.activityHintTokens") : t("profile.activityHint")}
              </p>

              <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <RoastStat
                  label={isTokenMetric ? t("profile.stat.totalTokens") : t("profile.stat.totalPrompts")}
                  value={compactNumber(isTokenMetric ? activity.total_tokens : (activity?.daily_rows || []).reduce((s, r) => s + Number(r.value || 0), 0))}
                  accent="#059669"
                />
                <RoastStat
                  label={hasCost ? t("profile.stat.estCost") : t("profile.stat.activeDays")}
                  value={hasCost ? `$${estCost.toFixed(estCost >= 100 ? 0 : 2)}` : String(activity?.active_day_count || 0)}
                  accent={hasCost ? "#059669" : undefined}
                />
                <RoastStat
                  label={t("profile.stat.streak")}
                  value={`${activity?.longest_streak || 0}${zh ? " 天" : "d"}`}
                />
                <RoastStat
                  label={t("profile.stat.peakDay")}
                  value={peak?.value ? compactNumber(peak.value) : "—"}
                  suffix={peak?.day || undefined}
                />
              </div>

              {modelBreakdown.sources.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {modelBreakdown.sources.slice(0, 4).map((source) => (
                    <div
                      key={source.key}
                      className="inline-flex items-baseline gap-1.5 rounded-md border border-black/[0.04] bg-[#f7f4ef] px-2 py-1"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8b8680]">{source.key}</span>
                      <span className="text-sm font-extrabold tabular-nums text-[#1a1a1a]">{source.percent}%</span>
                      {isTokenMetric && (
                        <span className="text-[9px] text-[#8b8680]">{compactNumber(source.tokens)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="h-[320px] max-h-[340px]">
                <ActivityHeatmap3DPanel
                  prompts={data?.prompts || []}
                  activity={activity}
                  weeks={52}
                  forceLight
                  defaultPalette="emerald"
                  roastStyle
                  showViewToggle
                  defaultViewMode="2d"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RoastStat({ label, value, suffix, accent }) {
  return (
    <div className="rounded-lg bg-[#f7f4ef] px-2.5 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8b8680]">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className="font-[JetBrains_Mono,ui-monospace,monospace] text-lg font-extrabold tabular-nums tracking-tight"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {suffix && <span className="text-[9px] font-semibold text-[#8b8680]">{suffix}</span>}
      </div>
    </div>
  );
}

function ScoreRadar({ dimensions, accent, zh }) {
  const size = 300;
  const pad = 28;
  const center = size / 2;
  const maxRadius = 92;
  const rings = [0.33, 0.66, 1];
  const points = dimensions.map((dim, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
    const ratio = Math.min(1, Number(dim.score || 0));
    const radius = 20 + ratio * (maxRadius - 20);
    const labelR = maxRadius + 30;
    return {
      ...dim,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * labelR,
      labelY: center + Math.sin(angle) * labelR,
      axisX: center + Math.cos(angle) * maxRadius,
      axisY: center + Math.sin(angle) * maxRadius,
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="flex min-w-0 items-center justify-center overflow-visible py-2">
      <svg
        viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
        className="h-auto w-full max-w-[340px] overflow-visible"
        role="img"
        aria-label="Score radar"
      >
        {rings.map((ring) => {
          const ringPoints = dimensions
            .map((_, index) => {
              const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
              return `${center + Math.cos(angle) * maxRadius * ring},${center + Math.sin(angle) * maxRadius * ring}`;
            })
            .join(" ");
          return <polygon key={ring} points={ringPoints} fill="none" stroke="rgba(40,30,20,0.1)" strokeWidth="1" />;
        })}
        {points.map((point) => (
          <line key={point.key} x1={center} y1={center} x2={point.axisX} y2={point.axisY} stroke="rgba(40,30,20,0.1)" strokeWidth="1" />
        ))}
        <polygon points={polygon} fill={`${accent}33`} stroke={accent} strokeWidth="2.5" />
        {points.map((point) => (
          <circle key={`${point.key}-dot`} cx={point.x} cy={point.y} r="3.5" fill={accent} stroke="#fffcf7" strokeWidth="1.5" />
        ))}
        {points.map((point) => {
          const anchor = point.labelX < center - 6 ? "end" : point.labelX > center + 6 ? "start" : "middle";
          return (
            <text
              key={`${point.key}-label`}
              x={point.labelX}
              y={point.labelY}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="#6b6560"
              fontSize="10"
              fontWeight="700"
            >
              {zh ? point.labelZh : point.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
