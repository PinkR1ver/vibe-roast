import React from "react";
import { useLocale } from "../contexts/LocaleContext.jsx";

export default function ProfileResult({ data, onBack }) {
  const { locale, t } = useLocale();
  const zh = locale === "zh";
  const vibe = data?.vibe_profile;
  const summary = data?.summary || {};

  if (!vibe) {
    return (
      <div className="min-h-[calc(100vh-49px)] bg-[#f3f1ec] text-[#1a1a1a] px-6 py-10">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-[#6b6560] mb-6">
          ← {t("profile.back")}
        </button>
        <p className="text-[#6b6560]">{t("profile.empty")}</p>
      </div>
    );
  }

  const accent = vibe.archetype.accent || "#ff5a1f";
  const roast = zh ? vibe.roastZh : vibe.roast;
  const tldr = zh ? vibe.tldrZh : vibe.tldr;
  const tierBlurb = zh ? vibe.tier.blurbZh : vibe.tier.blurb;
  const hook = zh ? vibe.archetype.hookZh : vibe.archetype.hook;

  return (
    <div className="min-h-[calc(100vh-49px)] bg-[radial-gradient(1200px_600px_at_10%_-10%,#ffe7d6_0%,transparent_55%),radial-gradient(900px_500px_at_100%_0%,#d9fff3_0%,transparent_50%),linear-gradient(180deg,#f3f1ec_0%,#e8e4db_100%)] text-[#1a1a1a]">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 pb-20">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b6560] hover:text-[#1a1a1a]"
        >
          ← {t("profile.back")}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] gap-5 items-start">
          <aside className="text-center">
            <div className="relative mx-auto mb-2 px-2 pt-3">
              <div
                className="pointer-events-none absolute left-1/2 top-[8%] z-0 h-[78%] w-[118%] -translate-x-1/2 rounded-[46%_54%_42%_58%/48%_44%_56%_52%]"
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
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/5 bg-[#fffcf7] px-3 py-1.5 text-xs font-bold">
              <img src={vibe.badge} alt="" width={18} height={18} className="rounded" />
              <span>{vibe.archetype.code}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-4">
              <div className="rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-4 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="m-0 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.radar")}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b8680]">{t("profile.sixAxis")}</span>
                </div>
                <ScoreRadar dimensions={vibe.dimensions} accent={accent} zh={zh} />
              </div>

              <div className="rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-4 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
                <h2 className="m-0 mb-3 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.axes")}</h2>
                <div className="space-y-2.5">
                  {vibe.dimensions.map((dim) => (
                    <div key={dim.key} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{zh ? dim.labelZh : dim.label}</div>
                        <div className="text-[11px] text-[#8b8680]">{dim.hint}</div>
                      </div>
                      <div className="shrink-0 font-[JetBrains_Mono,ui-monospace,monospace] text-sm font-bold tabular-nums" style={{ color: accent }}>
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
          </section>
        </div>
      </div>
    </div>
  );
}

function ScoreRadar({ dimensions, accent, zh }) {
  const size = 280;
  const center = size / 2;
  const maxRadius = 92;
  const rings = [0.33, 0.66, 1];
  const points = dimensions.map((dim, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
    const ratio = Math.min(1, Number(dim.score || 0));
    const radius = 20 + ratio * (maxRadius - 20);
    return {
      ...dim,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * 112,
      labelY: center + Math.sin(angle) * 112,
      axisX: center + Math.cos(angle) * maxRadius,
      axisY: center + Math.sin(angle) * maxRadius,
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="flex items-center justify-center py-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible" role="img" aria-label="Score radar">
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
