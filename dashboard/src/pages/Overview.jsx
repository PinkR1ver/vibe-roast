import React from "react";
import { Card, Badge, MetricDisplay } from "../ui";
import { useApi, SkeletonCard, SkeletonMetric } from "../hooks/useApi.jsx";
import WordCloud from "../components/WordCloud.jsx";

const CATEGORY_LABELS = {
  planning: "Planning",
  debugging: "Debugging",
  implementation: "Implementation",
  refactor: "Refactor",
  testing: "Testing",
  packaging: "Packaging",
  explanation: "Explanation",
  research: "Research",
  ui_design: "UI/Design",
  workflow: "Workflow",
  reference: "Reference",
};

export default function Overview() {
  const { data, loading, error } = useApi();

  if (loading) return <OverviewSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!data) return null;

  const { summary, profile_signals, word_frequencies } = data;
  const promptAnalysis = profile_signals?.prompt_analysis || {};
  const categories = promptAnalysis.categories || {};
  const totalUseful = promptAnalysis.useful_prompt_count || 0;
  const totalPrompts = summary?.prompt_count || 0;
  const usefulRatio = promptAnalysis.useful_ratio || 0;
  const topCategory = Object.entries(categories)
    .filter(([k]) => k !== "reference")
    .sort((a, b) => b[1].count - a[1].count)[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="mb-1">
        <h1 className="text-h2 text-oai-black dark:text-oai-white">Vibe Profile</h1>
        <p className="text-body-sm text-oai-gray-500 mt-1">
          {data.range?.from || "..."} &rarr; {data.range?.to || "..."} &middot;{" "}
          {summary?.source_count || 0} sources
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center py-5">
          <div className="text-h1 font-semibold tabular-nums text-brand-600 dark:text-brand-400">{totalPrompts.toLocaleString()}</div>
          <div className="text-label uppercase text-oai-gray-500 dark:text-oai-gray-400 mt-1">Prompts</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-h1 font-semibold tabular-nums text-brand-600 dark:text-brand-400">{summary?.source_count || 0}</div>
          <div className="text-label uppercase text-oai-gray-500 dark:text-oai-gray-400 mt-1">Sources</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-h1 font-semibold tabular-nums text-brand-600 dark:text-brand-400">{(usefulRatio * 100).toFixed(0)}%</div>
          <div className="text-label uppercase text-oai-gray-500 dark:text-oai-gray-400 mt-1">Useful</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-h1 font-semibold tabular-nums text-brand-600 dark:text-brand-400">{summary?.files_scanned || 0}</div>
          <div className="text-label uppercase text-oai-gray-500 dark:text-oai-gray-400 mt-1">Files</div>
        </Card>
      </div>

      {/* Vibe Profile Card + Category Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MBTI-style placeholder */}
        <Card title="MBTI Profile" subtitle="Based on your prompt patterns">
          <div className="flex items-center gap-4 py-4">
            <div className="text-5xl font-bold text-brand-600 dark:text-brand-400 tabular-nums w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center shrink-0">
              {topCategory ? categoryCode(topCategory[0]) : "--"}
            </div>
            <div>
              <p className="text-body text-oai-gray-700 dark:text-oai-gray-300">
                {topCategory ? profileDescription(topCategory[0]) : "Not enough data yet"}
              </p>
              {topCategory && (
                <Badge variant="success" className="mt-2">
                  Top: {CATEGORY_LABELS[topCategory[0]] || topCategory[0]}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Category distribution */}
        <Card title="Category Breakdown" subtitle={`${totalUseful} useful prompts`}>
          <div className="space-y-3">
            {Object.entries(categories)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 8)
              .map(([name, row]) => {
                const pct = totalPrompts > 0 ? ((row.count / totalPrompts) * 100).toFixed(1) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-body-sm mb-1">
                      <span className="text-oai-gray-700 dark:text-oai-gray-300 capitalize">
                        {CATEGORY_LABELS[name] || name}
                      </span>
                      <span className="text-oai-gray-500 tabular-nums">{row.count} ({pct}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-bar-fill cat-${name}`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Word Cloud */}
      {word_frequencies && word_frequencies.length > 0 && (
        <Card title="Word Cloud" subtitle="Most frequent terms in useful prompts">
          <WordCloud words={word_frequencies} />
        </Card>
      )}

      {/* Source summary */}
      <Card title="Source Summary">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["codex", "claude", "cursor"].map((source) => {
            const s = data.sources?.[source];
            return (
              <div key={source} className="p-4 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50">
                <div className="text-label uppercase text-oai-gray-500 mb-2">{source}</div>
                <div className="text-h3 tabular-nums text-oai-gray-900 dark:text-oai-gray-100">
                  {s?.prompt_count != null ? s.prompt_count.toLocaleString() : "--"}
                </div>
                <div className="text-caption text-oai-gray-500 mt-1">
                  {s?.files_scanned || 0} files &middot;{" "}
                  {s?.token_totals?.total_tokens ? `${s.token_totals.total_tokens.toLocaleString()} tokens` : "no tokens"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function categoryCode(name) {
  const map = { planning: "PLN", debugging: "DBG", implementation: "IMP", refactor: "REF", testing: "TST", packaging: "PKG", explanation: "EXP", research: "RSR", ui_design: "UID", workflow: "WRK" };
  return map[name] || name.slice(0, 3).toUpperCase();
}

function profileDescription(name) {
  const map = {
    planning: "You think before you code. Architecture and design are your natural first steps.",
    debugging: "You're a problem solver at heart. Bugs don't stand a chance.",
    implementation: "You're a builder. You love turning ideas into working code.",
    refactor: "You see beauty in clean code. Continuous improvement is your mantra.",
    testing: "Quality is non-negotiable. You verify before you ship.",
    explanation: "You're a knowledge seeker. Understanding the why matters as much as the what.",
    research: "You dig deep. Surface-level understanding is never enough.",
    ui_design: "You care about the user experience. Beautiful, usable interfaces drive you.",
    workflow: "You optimize the process. Better tooling and automation is your superpower.",
  };
  return map[name] || "You have a unique and balanced approach to coding.";
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="skeleton h-9 w-48 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonMetric key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

function ErrorCard({ error }) {
  return (
    <Card className="border-red-200 dark:border-red-800">
      <div className="text-center py-8">
        <p className="text-body text-red-600 dark:text-red-400 mb-2">Failed to load data</p>
        <p className="text-body-sm text-oai-gray-500">{error}</p>
      </div>
    </Card>
  );
}
