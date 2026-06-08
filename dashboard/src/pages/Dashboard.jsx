import React, { useState } from "react";
import { Card, Badge } from "../ui";
import { useApi, SkeletonCard, SkeletonMetric } from "../hooks/useApi.jsx";
import WordCloud from "../components/WordCloud.jsx";

const CATEGORY_LABELS = {
  planning: "Planning", debugging: "Debugging", implementation: "Implementation",
  refactor: "Refactor", testing: "Testing", packaging: "Packaging",
  explanation: "Explanation", research: "Research", ui_design: "UI/Design",
  workflow: "Workflow", reference: "Reference",
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
  debugging: "You're a problem solver at heart. Bugs don't stand a chance.",
  implementation: "You love turning ideas into working code. Building is your language.",
  refactor: "You see beauty in clean code. Continuous improvement is your mantra.",
  testing: "Quality is non-negotiable. You verify before you ship.",
  explanation: "Understanding the why matters as much as the what. Knowledge drives you.",
  research: "You dig deep. Surface-level understanding is never enough.",
  ui_design: "You care about the user experience. Beautiful, usable interfaces drive you.",
  workflow: "You optimize the process. Better tooling and automation is your superpower.",
};

export default function Dashboard() {
  const { data, loading, error } = useApi();
  const [envOpen, setEnvOpen] = useState(false);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!data) return null;

  const { summary, profile_signals, word_frequencies } = data;
  const pa = profile_signals?.prompt_analysis || {};
  const env = profile_signals?.environment?.codex;
  const categories = pa.categories || {};
  const totalPrompts = summary?.prompt_count || 0;
  const usefulRatio = pa.useful_ratio || 0;
  const sortedCategories = Object.entries(categories)
    .filter(([k]) => k !== "reference")
    .sort((a, b) => b[1].count - a[1].count);
  const maxCount = sortedCategories[0]?.[1]?.count || 1;
  const topKey = sortedCategories[0]?.[0] || "implementation";

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* ═══════════════════════════════════════════════
          PERSONALITY CARD — the hero
          ═══════════════════════════════════════════════ */}
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-brand-50 dark:bg-brand-950 mb-6">
          <span className="text-[40px] font-bold tracking-tight text-brand-600 dark:text-brand-400">
            {TYPE_CODE[topKey] || topKey.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <h1 className="text-h2 text-oai-black dark:text-oai-white mb-2">
          {TYPE_TITLE[topKey] || "The Coder"}
        </h1>
        <p className="text-body text-oai-gray-500 dark:text-oai-gray-400 max-w-md mx-auto mb-4">
          {TYPE_DESC[topKey] || "You have a unique and balanced approach to coding."}
        </p>
        <Badge variant="success">
          {CATEGORY_LABELS[topKey]} dominant
        </Badge>
      </div>

      {/* ═══════════════════════════════════════════════
          METRIC BAR — lightweight, supports the hero
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-3 mb-10">
        <Metric value={totalPrompts.toLocaleString()} label="Prompts" />
        <Metric value={summary?.source_count || 0} label="Sources" />
        <Metric value={`${(usefulRatio * 100).toFixed(0)}%`} label="Useful" />
        <Metric value={summary?.files_scanned || 0} label="Files" />
      </div>

      {/* ═══════════════════════════════════════════════
          CATEGORIES + WORD CLOUD — why this type?
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Card title="What You Do" subtitle="Prompt category distribution">
          <div className="space-y-3">
            {sortedCategories.slice(0, 7).map(([name, row]) => (
              <div key={name}>
                <div className="flex justify-between text-body-sm mb-1">
                  <span className="text-oai-gray-700 dark:text-oai-gray-300 capitalize">
                    {CATEGORY_LABELS[name] || name}
                  </span>
                  <span className="text-oai-gray-500 tabular-nums">{row.count}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill cat-${name}`}
                    style={{ width: `${Math.max((row.count / maxCount) * 100, 1)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {word_frequencies && word_frequencies.length > 0 && (
          <Card title="Your Vocabulary" subtitle="Most-used terms">
            <WordCloud words={word_frequencies} width={440} height={340} />
          </Card>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          PROMPT EXAMPLES — horizontal scroll cards
          ═══════════════════════════════════════════════ */}
      {pa.useful_prompts && pa.useful_prompts.length > 0 && (
        <div className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-oai-gray-500 dark:text-oai-gray-300">
                In Your Own Words
              </h3>
              <p className="text-body-sm text-oai-gray-500 mt-0.5">
                A sample of your {pa.useful_prompt_count?.toLocaleString()} useful prompts
              </p>
            </div>
            <span className="text-caption text-oai-gray-400 shrink-0 ml-4">
              scroll &rarr;
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {pa.useful_prompts.slice(0, 12).map((p, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-72 p-4 rounded-xl border border-oai-gray-200 dark:border-oai-gray-800 bg-white dark:bg-oai-gray-900"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info" className="text-[10px]">{p.source}</Badge>
                  <Badge className="text-[10px]">{CATEGORY_LABELS[p.category] || p.category}</Badge>
                </div>
                <p className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300 line-clamp-4">
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          ENVIRONMENT — collapsible, not the star
          ═══════════════════════════════════════════════ */}
      {env && (
        <div className="border-t border-oai-gray-200 dark:border-oai-gray-800 pt-8">
          <button
            onClick={() => setEnvOpen(!envOpen)}
            className="w-full flex items-center justify-between text-left hover:opacity-70 transition-opacity"
          >
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-oai-gray-500 dark:text-oai-gray-300">
                Your Setup
              </h3>
              <p className="text-body-sm text-oai-gray-500 mt-0.5">
                {env.skills?.count || 0} skills · {env.mcp_servers?.count || 0} MCP · {env.plugins?.count || 0} plugins
              </p>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth="1.5" className={`text-oai-gray-400 transition-transform ${envOpen ? "rotate-180" : ""}`}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {envOpen && (
            <div className="mt-6 space-y-6 animate-slide-up">
              {env.skills?.names?.length > 0 && (
                <div>
                  <h4 className="text-label uppercase text-oai-gray-500 mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {env.skills.names.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-body-sm bg-oai-gray-100 dark:bg-oai-gray-800 text-oai-gray-700 dark:text-oai-gray-300">
                        {name}
                        {env.skills.user_names?.includes(name) && (
                          <Badge variant="info" className="text-[10px] ml-1">user</Badge>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {env.mcp_servers?.names?.length > 0 && (
                  <div>
                    <h4 className="text-label uppercase text-oai-gray-500 mb-3">MCP Servers</h4>
                    <div className="space-y-1.5">
                      {env.mcp_servers.names.map((name) => (
                        <div key={name} className="flex items-center gap-2 text-body-sm text-oai-gray-700 dark:text-oai-gray-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {env.plugins?.names?.length > 0 && (
                  <div>
                    <h4 className="text-label uppercase text-oai-gray-500 mb-3">Plugins</h4>
                    <div className="space-y-1.5">
                      {env.plugins.names.map((name) => (
                        <div key={name} className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300">
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {env.config?.model && (
                <div className="flex flex-wrap gap-3">
                  {["model", "personality", "sandbox_mode"].map((key) =>
                    env.config[key] ? (
                      <div key={key} className="px-4 py-2 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50">
                        <span className="text-label uppercase text-oai-gray-500 mr-2">{key.replace("_", " ")}</span>
                        <span className="text-body-sm text-oai-black dark:text-oai-white font-medium">{env.config[key]}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tiny metric —───────────────────────────────────────── */

function Metric({ value, label }) {
  return (
    <div className="text-center p-3 rounded-xl bg-white dark:bg-oai-gray-900 border border-oai-gray-100 dark:border-oai-gray-800">
      <div className="text-h3 font-semibold tabular-nums text-brand-600 dark:text-brand-400">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-oai-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center py-10">
        <div className="skeleton w-28 h-28 rounded-3xl mx-auto mb-6" />
        <div className="skeleton h-8 w-48 mx-auto mb-3" />
        <div className="skeleton h-5 w-80 mx-auto mb-4" />
        <div className="skeleton h-5 w-32 mx-auto rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-3 mb-10">
        {[1, 2, 3, 4].map((i) => <SkeletonMetric key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

function ErrorCard({ error }) {
  return (
    <Card className="border-red-200 dark:border-red-800 max-w-lg mx-auto mt-20">
      <div className="text-center py-12">
        <p className="text-body text-red-600 dark:text-red-400 mb-2">Failed to load</p>
        <p className="text-body-sm text-oai-gray-500">{error}</p>
      </div>
    </Card>
  );
}
