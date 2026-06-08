import React, { useState } from "react";
import { useApi, SkeletonCard } from "../hooks/useApi.jsx";
import { Badge } from "../ui";
import WordCloud from "../components/WordCloud.jsx";
import ActivityHeatmap from "../components/ActivityHeatmap.jsx";

const CAT_LABEL = {
  planning: "Planning", debugging: "Debugging", implementation: "Implementation",
  refactor: "Refactor", testing: "Testing", packaging: "Packaging",
  explanation: "Explanation", research: "Research", ui_design: "UI/Design",
  workflow: "Workflow",
};
const TYPE_CODE = {
  planning: "PLN", debugging: "DBG", implementation: "IMP", refactor: "REF",
  testing: "TST", packaging: "PKG", explanation: "EXP", research: "RSR",
  ui_design: "UID", workflow: "WRK",
};
const TYPE_TITLE = {
  planning: "The Architect", debugging: "The Debugger", implementation: "The Builder",
  refactor: "The Refiner", testing: "The Guardian", packaging: "The Publisher",
  explanation: "The Scholar", research: "The Explorer", ui_design: "The Designer",
  workflow: "The Automator",
};
const TYPE_DESC = {
  planning: "You think before you code. Architecture and design are your natural first steps.",
  debugging: "You're a problem solver at heart. Bugs don't stand a chance against you.",
  implementation: "You love turning ideas into working code. Building is how you express yourself.",
  refactor: "You see beauty in clean structure. Continuous improvement is your mantra.",
  testing: "Quality is non-negotiable. You verify before you ship, every single time.",
  explanation: "Understanding the why matters as much as the what. Knowledge drives your craft.",
  research: "You dig deep. Surface-level understanding is never enough for you.",
  ui_design: "You care about the user experience. Beautiful, polished interfaces drive you.",
  workflow: "You optimize the process. Better tools and automation is your superpower.",
};

export default function Dashboard() {
  const { data, loading, error } = useApi();
  const [envOpen, setEnvOpen] = useState(false);

  if (loading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const { summary, profile_signals, word_frequencies, prompts } = data;
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
    <div className="animate-fade-in">
      {/* ═══════════════════════════════════════════════
          SECTION 1 — HERO
          Dark gradient, huge type, emotional statement
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-oai-gray-950 via-oai-gray-950 to-brand-950 text-white">
        <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 text-center">
          {/* Tag */}
          <p className="text-label uppercase tracking-[0.2em] text-brand-400 mb-6">
            Your Vibe Profile
          </p>

          {/* Type code */}
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-white/10 backdrop-blur mb-8">
            <span className="text-[52px] font-black tracking-tighter text-brand-400">
              {TYPE_CODE[topKey]}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-hero text-white mb-4">
            {TYPE_TITLE[topKey]}
          </h1>

          {/* Description */}
          <p className="text-body text-oai-gray-300 max-w-md mx-auto mb-8 leading-relaxed">
            {TYPE_DESC[topKey]}
          </p>

          {/* Stats pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <StatPill value={totalPrompts.toLocaleString()} label="prompts" />
            <StatPill value={summary?.source_count} label="tools" />
            <StatPill value={`${(usefulRatio * 100).toFixed(0)}%`} label="useful" />
            <StatPill value={String(summary?.files_scanned || 0)} label="files scanned" />
          </div>

          {/* Scroll hint */}
          <div className="mt-12 animate-pulse-slow">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-oai-gray-500">
              <path d="M8 3v8M4 8l4 4 4-4" />
            </svg>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2 — ACTIVITY HEATMAP
          "Your journey, day by day"
          ═══════════════════════════════════════════════ */}
      <section className="bg-oai-gray-950 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-label uppercase tracking-[0.2em] text-brand-400 mb-3">Your Rhythm</p>
          <h2 className="text-h2 text-white mb-2">When you show up</h2>
          <p className="text-body-sm text-oai-gray-500 mb-8">
            Each square is a day. The greener, the more prompts you sent.
          </p>
          <div className="rounded-2xl bg-oai-gray-900 p-4 border border-oai-gray-800">
            <ActivityHeatmap prompts={prompts || []} weeks={26} dark />
          </div>
          {summary?.first_prompt_at && (
            <p className="text-caption text-oai-gray-600 mt-4 text-center">
              First prompt: {summary.first_prompt_at} &middot; Last: {summary.last_prompt_at}
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3 — CATEGORIES + WORD CLOUD
          "What you do, what you say"
          ═══════════════════════════════════════════════ */}
      <section className="bg-oai-gray-950 py-16 border-t border-oai-gray-900">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-label uppercase tracking-[0.2em] text-brand-400 mb-3">Your DNA</p>
          <h2 className="text-h2 text-white mb-8">How you spend your time</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Categories */}
            <div>
              <div className="space-y-3">
                {sorted.slice(0, 7).map(([name, row]) => (
                  <div key={name}>
                    <div className="flex justify-between text-body-sm mb-1.5">
                      <span className="text-oai-gray-300">{CAT_LABEL[name] || name}</span>
                      <span className="text-oai-gray-500 tabular-nums">{row.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-oai-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full cat-${name} transition-all duration-700`}
                        style={{ width: `${Math.max((row.count / maxCount) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-caption text-oai-gray-600 mt-4">
                {pa.useful_prompt_count} useful · {pa.reference_prompt_count} reference
              </p>
            </div>

            {/* Word Cloud */}
            {word_frequencies && word_frequencies.length > 0 && (
              <div className="flex items-center justify-center">
                <WordCloud words={word_frequencies} width={380} height={320} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4 — PROMPT EXAMPLES
          "In your own words"
          ═══════════════════════════════════════════════ */}
      {pa.useful_prompts && pa.useful_prompts.length > 0 && (
        <section className="bg-oai-gray-950 py-16 border-t border-oai-gray-900">
          <div className="max-w-2xl mx-auto px-6">
            <p className="text-label uppercase tracking-[0.2em] text-brand-400 mb-3">Your Voice</p>
            <h2 className="text-h2 text-white mb-2">In your own words</h2>
            <p className="text-body-sm text-oai-gray-500 mb-8">
              A sample of what you asked your AI tools
            </p>

            <div className="flex gap-4 overflow-x-auto pb-2 snap-x -mx-6 px-6">
              {pa.useful_prompts.slice(0, 12).map((p, i) => (
                <div
                  key={i}
                  className="snap-start shrink-0 w-72 p-5 rounded-2xl bg-oai-gray-900 border border-oai-gray-800 hover:border-oai-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="info" className="text-[10px]">{p.source}</Badge>
                    <Badge className="text-[10px]">{CAT_LABEL[p.category] || p.category}</Badge>
                  </div>
                  <p className="text-body-sm text-oai-gray-300 line-clamp-4 leading-relaxed">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          SECTION 5 — ENVIRONMENT
          Collapsed, dark theme
          ═══════════════════════════════════════════════ */}
      {env && (
        <section className="bg-oai-gray-950 py-16 border-t border-oai-gray-900">
          <div className="max-w-2xl mx-auto px-6">
            <button
              onClick={() => setEnvOpen(!envOpen)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div>
                <p className="text-label uppercase tracking-[0.2em] text-brand-400 mb-3">Your World</p>
                <h2 className="text-h2 text-white">The tools behind the vibe</h2>
                <p className="text-body-sm text-oai-gray-500 mt-2">
                  {env.skills?.count || 0} skills · {env.mcp_servers?.count || 0} MCP servers · {env.plugins?.count || 0} plugins
                </p>
              </div>
              <svg
                width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                strokeWidth="1.5" className={`text-oai-gray-500 transition-transform shrink-0 ${envOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>

            {envOpen && (
              <div className="mt-8 space-y-6 animate-slide-up">
                {/* Skills */}
                {env.skills?.names?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-oai-gray-500 mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {env.skills.names.map((n) => (
                        <span key={n} className="px-3 py-1.5 rounded-full text-body-sm bg-oai-gray-800 text-oai-gray-300 border border-oai-gray-700">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* MCP + Plugins */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {env.mcp_servers?.names?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-oai-gray-500 mb-3">MCP Servers</h4>
                      <div className="space-y-1.5">
                        {env.mcp_servers.names.map((n) => (
                          <div key={n} className="flex items-center gap-2 text-body-sm text-oai-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />{n}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {env.plugins?.names?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-oai-gray-500 mb-3">Plugins</h4>
                      <div className="space-y-1.5">
                        {env.plugins.names.map((n) => (
                          <div key={n} className="text-body-sm text-oai-gray-300">{n}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Config */}
                {env.config?.model && (
                  <div className="flex flex-wrap gap-3">
                    {["model", "personality"].map((k) =>
                      env.config[k] ? (
                        <div key={k} className="px-4 py-2 rounded-xl bg-oai-gray-900 border border-oai-gray-800">
                          <span className="text-[10px] uppercase tracking-wider text-oai-gray-500 mr-2">{k}</span>
                          <span className="text-body-sm text-oai-gray-200 font-medium">{env.config[k]}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Stat pill for hero ─────────────────────────────────── */

function StatPill({ value, label }) {
  return (
    <div className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/10 text-center">
      <div className="text-[20px] font-bold tabular-nums text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-oai-gray-400">{label}</div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="animate-fade-in">
      <div className="bg-oai-gray-950 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="skeleton w-32 h-32 rounded-3xl mx-auto mb-8" />
          <div className="skeleton h-12 w-64 mx-auto mb-4" />
          <div className="skeleton h-5 w-80 mx-auto mb-8" />
          <div className="flex justify-center gap-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton w-24 h-16 rounded-full" />)}
          </div>
        </div>
      </div>
      <div className="bg-oai-gray-950 py-16 border-t border-oai-gray-900">
        <div className="max-w-2xl mx-auto px-6">
          <div className="skeleton h-4 w-24 mb-3" />
          <div className="skeleton h-7 w-48 mb-8" />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="min-h-screen bg-oai-gray-950 flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-h2 text-white mb-2">Not yet</p>
        <p className="text-body text-oai-gray-500">{error}</p>
      </div>
    </div>
  );
}
