import React, { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import ActivityHeatmap3DPanel from "../components/ActivityHeatmap3DPanel.jsx";
import AgentIcon from "../components/AgentIcon.jsx";
import SharePosterModal from "../components/SharePosterModal.jsx";
import UsageAnalytics from "../components/UsageAnalytics.jsx";
import { buildHashtags, mergeHashtags } from "../lib/hashtags.js";
import { canvasToPngFile, downloadCanvasPng, renderSharePoster } from "../lib/share-poster.js";

function rangeLabel(range, zh) {
  if (!range?.from && !range?.to) return zh ? "全部时间" : "ALL TIME";
  return `${range?.from || "…"} → ${range?.to || "…"}`;
}

function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 3 4Zm-6 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.6 11.4 15 8.6M8.6 12.6 15.4 15.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PageChrome({ accent, onShare, posterBusy, t }) {
  const { toggleLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const themeOptions = [
    { key: "light", Icon: Sun },
    { key: "dark", Icon: Moon },
    { key: "system", Icon: Monitor },
  ];

  return (
    <div className="motion-chrome mb-7 flex flex-wrap items-end justify-between gap-4">
      <h1 className="roast-brand m-0 text-[44px] sm:text-[52px] leading-[0.95] text-[#1a1a1a] dark:text-[#fafafa]">
        {t("app.brand")}
      </h1>
      <div className="flex items-center gap-1 pb-1">
        <div
          className="mr-1 inline-flex items-center rounded-xl border border-black/[0.06] bg-white/45 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]"
          role="group"
          aria-label={t("theme.system")}
        >
          {themeOptions.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={`motion-button inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                theme === key
                  ? "bg-white text-[#1a1a1a] shadow-sm dark:bg-[#2a2a2a] dark:text-white"
                  : "text-[#8b8680] hover:text-[#1a1a1a] dark:text-[#8f8f8f] dark:hover:text-white"
              }`}
              title={t(`theme.${key}`)}
              aria-label={t(`theme.${key}`)}
              aria-pressed={theme === key}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          className="motion-button h-10 min-w-[2.5rem] px-2.5 rounded-xl text-[11px] font-semibold text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/[0.04] transition-colors dark:text-[#a3a3a3] dark:hover:bg-white/[0.06] dark:hover:text-white"
          title={t("app.languageTitle")}
          aria-label={t("app.languageTitle")}
        >
          {t("app.language")}
        </button>
        <a
          href="https://github.com/PinkR1ver/vibe-roast"
          target="_blank"
          rel="noopener noreferrer"
          className="motion-button inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#6b6560] hover:text-[#1a1a1a] hover:bg-black/[0.04] transition-colors dark:text-[#a3a3a3] dark:hover:bg-white/[0.06] dark:hover:text-white"
          aria-label={t("app.github")}
          title={t("app.github")}
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
            className="motion-button motion-share ml-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_10px_20px_rgba(255,90,31,0.25)] disabled:opacity-60"
            style={{ background: accent }}
            aria-label={posterBusy ? t("profile.posterBusy") : t("profile.posterShare")}
            title={posterBusy ? t("profile.posterBusy") : t("profile.posterShare")}
          >
            {posterBusy ? (
              <span className="text-[10px] font-bold tracking-wide">…</span>
            ) : (
              <ShareIcon />
            )}
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
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterPreview, setPosterPreview] = useState("");
  const [posterCanvas, setPosterCanvas] = useState(null);
  const [shareNotice, setShareNotice] = useState("");
  const pageRef = useRef(null);

  const categories = data?.profile_signals?.prompt_analysis?.categories || {};
  const hashtags = useMemo(
    () => {
      const generated = zh ? vibe?.hashtagsZh : vibe?.hashtags;
      if (Array.isArray(generated) && generated.length >= 3) {
        return mergeHashtags(generated);
      }
      return buildHashtags(vibe, categories, { locale: zh ? "zh" : "en" });
    },
    [vibe, categories, zh],
  );
  const accent = vibe?.archetype?.accent || "#ff5a1f";
  const nativeShareSupported = useMemo(() => {
    if (!posterCanvas || typeof navigator === "undefined" || typeof File === "undefined" || !navigator.share || !navigator.canShare) return false;
    try {
      const probe = new File([""], "vibe-roast-card.png", { type: "image/png" });
      return navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }, [posterCanvas]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;
    const nodes = [...root.querySelectorAll(".motion-reveal")];
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [vibe?.type_code]);
  if (!vibe) {
    return (
      <div className="min-h-screen bg-[#f3f1ec] text-[#1a1a1a] px-4 py-8 dark:bg-[#0a0a0a] dark:text-[#fafafa]">
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
  const personalityTitle = zh ? (vibe.archetype.titleZh || vibe.archetype.title) : vibe.archetype.title;

  async function handleSharePoster() {
    setPosterBusy(true);
    setPosterError("");
    setPosterOpen(true);
    setPosterPreview("");
    setPosterCanvas(null);
    setShareNotice("");
    try {
      const canvas = await renderSharePoster({ vibe, hashtags, locale });
      setPosterCanvas(canvas);
      setPosterPreview(canvas.toDataURL("image/png"));
    } catch (err) {
      setPosterError(err?.message || String(err));
      setPosterOpen(false);
    } finally {
      setPosterBusy(false);
    }
  }

  function handleDownloadPoster() {
    if (!posterCanvas) return;
    const code = (vibe.archetype?.code || "vibe").toLowerCase();
    downloadCanvasPng(posterCanvas, `vibe-roast-${code}-card.png`);
    setShareNotice(t("profile.posterSaved"));
  }

  function handleClosePoster() {
    setPosterOpen(false);
  }

  function buildShareCaption() {
    const code = vibe.type_code || vibe.archetype?.code || "";
    const title = zh ? vibe.archetype?.titleZh : vibe.archetype?.title;
    const shareTldr = zh ? (vibe.tldrZh || vibe.tldr) : (vibe.tldr || vibe.tldrZh);
    const invitation = zh ? "测测你的编码人格" : "Roast your coding vibe";
    return [
      `${title || "Vibe Coder"} · ${code}`,
      shareTldr,
      hashtags.slice(0, 4).join(" "),
      `${invitation}: https://github.com/PinkR1ver/vibe-roast`,
    ].filter(Boolean).join("\n\n");
  }

  async function handleNativeShare() {
    if (!posterCanvas || !navigator.share) return;
    const code = (vibe.archetype?.code || "vibe").toLowerCase();
    try {
      const file = await canvasToPngFile(posterCanvas, `vibe-roast-${code}-card.png`);
      await navigator.share({
        title: t("profile.posterTitle"),
        text: buildShareCaption(),
        files: [file],
      });
      setShareNotice(t("profile.posterShared"));
    } catch (error) {
      if (error?.name !== "AbortError") {
        setShareNotice(error?.message || t("profile.posterShareFailed"));
      }
    }
  }

  async function handleCopyCaption() {
    const caption = buildShareCaption();
    try {
      await navigator.clipboard.writeText(caption);
      setShareNotice(t("profile.posterCaptionCopied"));
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = caption;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      setShareNotice(t("profile.posterCaptionCopied"));
    }
  }

  return (
    <div
      ref={pageRef}
      className="roast-page min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,#ffe7d6_0%,transparent_55%),radial-gradient(900px_500px_at_100%_0%,#d9fff3_0%,transparent_50%),linear-gradient(180deg,#f3f1ec_0%,#e8e4db_100%)] text-[#1a1a1a] transition-colors dark:text-[#fafafa]"
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
          <aside className="motion-hero min-w-0 text-center">
            <div className="relative mx-auto mb-2 overflow-hidden px-2 pt-3 isolate">
              <div
                className="pointer-events-none absolute left-1/2 top-[8%] z-0 h-[78%] w-full -translate-x-1/2 rounded-[46%_54%_42%_58%/48%_44%_56%_52%]"
                style={{
                  background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${accent} 28%, var(--roast-card)), transparent 58%), radial-gradient(circle at 70% 65%, color-mix(in srgb, ${accent} 16%, var(--roast-page)), transparent 62%)`,
                }}
              />
              <img
                src={vibe.figure}
                alt={personalityTitle}
                onError={(event) => {
                  if (vibe.figure_fallback && event.currentTarget.src !== new URL(vibe.figure_fallback, window.location.href).href) {
                    event.currentTarget.src = vibe.figure_fallback;
                  }
                }}
                width={384}
                height={512}
                className="motion-character relative z-[1] mx-auto h-auto w-[88%] max-w-[280px] object-contain drop-shadow-[0_18px_28px_rgba(40,28,12,0.12)]"
              />
            </div>
            <p className="m-0 text-[13px] font-bold tracking-wide text-[#6b6560]">@{vibe.archetype.code.toLowerCase()}</p>
            <h1 className="mt-1 mb-1 text-[28px] font-extrabold tracking-tight" style={{ color: accent }}>
              {personalityTitle}
            </h1>
            <p className="m-0 text-sm font-semibold text-[#6b6560]">{hook}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="motion-chip rounded-full px-2.5 py-1 text-[12px] font-bold"
                  style={{
                    background: `color-mix(in srgb, ${accent} 14%, var(--roast-card))`,
                    color: `color-mix(in srgb, ${accent} 72%, var(--roast-text))`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="motion-reveal motion-surface rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-5 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="font-[JetBrains_Mono,ui-monospace,monospace] text-[42px] font-bold leading-none tracking-[0.08em]">
                    {vibe.type_code || vibe.archetype.code}
                  </div>
                  <div
                    className="mt-2 flex items-baseline gap-1.5 font-bold"
                    style={{ color: vibe.tier.color }}
                  >
                    <span className="text-[12px]" aria-hidden="true">{vibe.tier.emoji}</span>
                    <span className="text-[17px] tabular-nums">{vibe.confidence}%</span>
                    <span className="text-[11px] uppercase tracking-[0.06em]">
                      {zh ? "类型置信度" : "TYPE CONFIDENCE"}
                    </span>
                  </div>
                  <p className="mt-1 mb-0 text-[13px] text-[#6b6560]">{tierBlurb}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 text-center">
                  {vibe.signals.map((signal, index) => (
                    <div
                      key={signal.label}
                      className="motion-stat min-w-0 rounded-xl bg-[#f3f1ec] px-2.5 py-2"
                      style={{ ["--motion-delay"]: `${120 + index * 55}ms` }}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6560]">
                        {zh ? signal.labelZh : signal.label}
                      </div>
                      <div className="mt-1 break-words text-sm font-bold leading-tight tabular-nums" title={signal.value}>
                        {signal.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b6560]">
                <span>
                  {rangeLabel(data?.range, zh)} · {t("profile.agentsFound", {
                    count: summary.active_source_count ?? summary.active_sources?.length ?? 0,
                  })}
                </span>
                {(summary.active_sources || []).length > 0 && (
                  <span className="inline-flex items-center gap-1" aria-label={t("profile.detectedAgents")}>
                    {summary.active_sources.map((agent) => (
                      <AgentIcon
                        key={agent}
                        agent={agent}
                        size={22}
                        className="ring-2 ring-[#fffcf7]"
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4 min-w-0">
              <div className="motion-reveal motion-surface min-w-0 rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-4 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="m-0 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.radar")}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b8680]">{t("profile.sixAxis")}</span>
                </div>
                <ScoreRadar dimensions={vibe.dimensions} accent={accent} zh={zh} ariaLabel={t("profile.radarAria")} />
              </div>

              <div className="motion-reveal motion-surface min-w-0 rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-4 shadow-[0_10px_30px_rgba(40,28,12,0.06)]" style={{ ["--motion-delay"]: "70ms" }}>
                <h2 className="m-0 mb-3 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.axes")}</h2>
                <div className="space-y-2.5">
                  {(vibe.type_axes || []).map((axis, index) => (
                    <div key={axis.key} className="min-w-0">
                      <div className="mb-1 flex justify-between gap-2 text-xs font-bold">
                        <span style={{ color: axis.letter === axis.left.code ? accent : undefined }}>{axis.left.code} · {zh ? axis.left.labelZh : axis.left.label} {axis.left.percent}%</span>
                        <span style={{ color: axis.letter === axis.right.code ? accent : undefined }}>{axis.right.percent}% {axis.right.code} · {zh ? axis.right.labelZh : axis.right.label}</span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-[#e8e4db]">
                        <div className="motion-progress" style={{ width: `${axis.left.percent}%`, background: accent, ["--motion-delay"]: `${100 + index * 75}ms` }} />
                        <div className="motion-progress bg-[#d6d0c6]" style={{ width: `${axis.right.percent}%`, ["--motion-delay"]: `${140 + index * 75}ms` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="motion-reveal motion-surface rounded-[18px] border border-black/[0.04] bg-[#fffcf7] p-5 shadow-[0_10px_30px_rgba(40,28,12,0.06)]">
              <h2 className="m-0 mb-3 text-sm font-extrabold tracking-wide uppercase text-[#6b6560]">{t("profile.roast")}</h2>
              <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap">{roast}</p>
              <p className="mt-4 mb-0 rounded-xl bg-[#fff0e8] px-3 py-2 text-sm">
                <b>{t("profile.tldr")}</b> · {tldr}
              </p>
            </div>

            <div className="motion-reveal motion-surface rounded-[18px] border border-black/[0.06] bg-[#fffcf7] p-5 shadow-[0_10px_30px_rgba(40,28,12,0.06)] dark:border-white/[0.08]">
              <div>
                <ActivityHeatmap3DPanel
                  prompts={data?.prompts || []}
                  activity={activity}
                  weeks={52}
                  defaultPalette="emerald"
                  roastStyle
                  showViewToggle
                  defaultViewMode="2d"
                />
              </div>
            </div>

            <UsageAnalytics
              activity={activity}
              wordCloudRecords={data?.word_cloud_records || []}
            />
          </section>
        </div>
      </div>

      <SharePosterModal
        open={posterOpen}
        previewUrl={posterPreview}
        accent={accent}
        busy={posterBusy}
        nativeShareSupported={nativeShareSupported}
        notice={shareNotice}
        onClose={handleClosePoster}
        onDownload={handleDownloadPoster}
        onNativeShare={handleNativeShare}
        onCopyCaption={handleCopyCaption}
        t={t}
      />
    </div>
  );
}

function ScoreRadar({ dimensions, accent, zh, ariaLabel }) {
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
        aria-label={ariaLabel}
      >
        {rings.map((ring) => {
          const ringPoints = dimensions
            .map((_, index) => {
              const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
              return `${center + Math.cos(angle) * maxRadius * ring},${center + Math.sin(angle) * maxRadius * ring}`;
            })
            .join(" ");
          return <polygon className="radar-grid" key={ring} points={ringPoints} fill="none" stroke="var(--radar-grid)" strokeWidth="1" />;
        })}
        {points.map((point) => (
          <line className="radar-grid" key={point.key} x1={center} y1={center} x2={point.axisX} y2={point.axisY} stroke="var(--radar-grid)" strokeWidth="1" />
        ))}
        <polygon className="radar-shape" points={polygon} fill={`${accent}33`} stroke={accent} strokeWidth="2.5" />
        {points.map((point) => (
          <circle className="radar-dot" key={`${point.key}-dot`} cx={point.x} cy={point.y} r="3.5" fill={accent} stroke="var(--roast-card)" strokeWidth="1.5" />
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
              fill="var(--roast-muted)"
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
