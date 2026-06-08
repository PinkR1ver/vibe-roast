import React from "react";
import { Card, Badge } from "../ui";
import { useApi, SkeletonCard, SkeletonMetric } from "../hooks/useApi.jsx";
import WordCloud from "../components/WordCloud.jsx";

const CATEGORY_LABELS = {
  planning: "Planning", debugging: "Debugging", implementation: "Implementation",
  refactor: "Refactor", testing: "Testing", packaging: "Packaging",
  explanation: "Explanation", research: "Research", ui_design: "UI/Design",
  workflow: "Workflow", reference: "Reference",
};

export default function Dashboard() {
  const { data, loading, error } = useApi();

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!data) return null;

  const { summary, profile_signals, word_frequencies } = data;
  const pa = profile_signals?.prompt_analysis || {};
  const env = profile_signals?.environment?.codex;
  const categories = pa.categories || {};
  const totalPrompts = summary?.prompt_count || 0;
  const usefulRatio = pa.useful_ratio || 0;
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1].count - a[1].count);
  const maxCount = sortedCategories[0]?.[1]?.count || 1;
  const topCategory = Object.entries(categories)
    .filter(([k]) => k !== "reference")
    .sort((a, b) => b[1].count - a[1].count)[0];

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ═══ Overview ═══ */}
      <section>
        <SectionHeading title="Vibe Profile" subtitle={`${data.range?.from || "..."} → ${data.range?.to || "..."} · ${summary?.source_count || 0} sources`} />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Metric value={totalPrompts.toLocaleString()} label="Prompts" />
          <Metric value={summary?.source_count || 0} label="Sources" />
          <Metric value={`${(usefulRatio * 100).toFixed(0)}%`} label="Useful" />
          <Metric value={summary?.files_scanned || 0} label="Files" />
        </div>

        {/* MBTI Profile + Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card title="Personality Profile" subtitle="Based on your prompt patterns">
            <div className="flex items-center gap-4 py-2">
              <div className="text-4xl font-bold text-brand-600 dark:text-brand-400 tabular-nums w-16 h-16 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center shrink-0">
                {topCategory ? categoryCode(topCategory[0]) : "--"}
              </div>
              <div>
                <p className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300">
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

          <Card title="Category Breakdown" subtitle={`${pa.useful_prompt_count || 0} useful prompts`}>
            <div className="space-y-3">
              {sortedCategories.slice(0, 8).map(([name, row]) => {
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
                      <div className={`progress-bar-fill cat-${name}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Source Summary */}
        <Card title="Sources">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["codex", "claude", "cursor"].map((source) => {
              const s = data.sources?.[source];
              return (
                <div key={source} className="p-4 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50">
                  <div className="text-label uppercase text-oai-gray-500 mb-2">{source}</div>
                  <div className="text-h3 tabular-nums text-oai-black dark:text-oai-white">
                    {s?.prompt_count != null ? s.prompt_count.toLocaleString() : "--"}
                  </div>
                  <div className="text-caption text-oai-gray-500 mt-1">
                    {s?.files_scanned || 0} files ·{" "}
                    {s?.token_totals?.total_tokens ? `${s.token_totals.total_tokens.toLocaleString()} tokens` : "no tokens"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* ═══ Prompt Analysis ═══ */}
      <section>
        <SectionHeading title="Prompt Analysis" subtitle={`${pa.total_prompts?.toLocaleString() || 0} prompts classified`} />

        {/* Useful vs Reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center py-5">
            <div className="text-h2 font-semibold tabular-nums text-brand-600 dark:text-brand-400">
              {((pa.useful_ratio || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-label uppercase text-oai-gray-500 mt-1">Useful Ratio</div>
          </Card>
          <Card className="md:col-span-2 flex items-center">
            <div className="w-full">
              <div className="flex justify-between text-body-sm mb-2">
                <span className="text-oai-gray-700 dark:text-oai-gray-300">
                  <Badge variant="success">Useful</Badge> {pa.useful_prompt_count?.toLocaleString() || 0}
                </span>
                <span className="text-oai-gray-700 dark:text-oai-gray-300">
                  <Badge variant="secondary">Reference</Badge> {pa.reference_prompt_count?.toLocaleString() || 0}
                </span>
              </div>
              <div className="progress-bar h-3">
                <div className="progress-bar-fill h-3" style={{ width: `${Math.max(((pa.useful_ratio || 0) * 100), 1)}%` }} />
              </div>
              <p className="text-caption text-oai-gray-500 mt-2">Useful prompts express intent. Reference material is pasted code or logs.</p>
            </div>
          </Card>
        </div>

        {/* Category Bars */}
        <Card title="All Categories" className="mb-8">
          <div className="space-y-4">
            {sortedCategories.map(([name, row]) => {
              const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-body-sm mb-1.5">
                    <span className="text-oai-gray-700 dark:text-oai-gray-300 font-medium capitalize">
                      {CATEGORY_LABELS[name] || name}
                    </span>
                    <span className="text-oai-gray-500 tabular-nums">{row.count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-bar-fill cat-${name}`} style={{ width: `${Math.max(barWidth, 1)}%` }} />
                  </div>
                  {row.examples?.[0] && (
                    <p className="text-caption text-oai-gray-400 mt-1 truncate">&ldquo;{row.examples[0]?.text}&rdquo;</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Reference Signals */}
        {pa.reference_summary?.signals && (
          <Card title="Reference Signals" subtitle="Extracted from pasted code and logs" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SignalList title="Languages" items={pa.reference_summary.signals.languages} />
              <SignalList title="File Extensions" items={pa.reference_summary.signals.file_extensions} />
              <SignalList title="Error Types" items={pa.reference_summary.signals.error_types} />
            </div>
            {pa.reference_summary.signals.files?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-label uppercase text-oai-gray-500 mb-3">Referenced Files</h4>
                <div className="flex flex-wrap gap-2">
                  {pa.reference_summary.signals.files.slice(0, 20).map((f) => (
                    <code key={f.path} className="px-2 py-1 rounded-md bg-oai-gray-100 dark:bg-oai-gray-800 text-body-sm font-mono text-oai-gray-600 dark:text-oai-gray-400">
                      {f.path}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Useful Prompt Examples */}
        {pa.useful_prompts && pa.useful_prompts.length > 0 && (
          <Card title="Prompt Examples" subtitle={`${pa.useful_prompts.length} of ${pa.useful_prompt_count || 0}`}>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pa.useful_prompts.slice(0, 20).map((p, i) => (
                <div key={i} className="p-4 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50 border border-oai-gray-100 dark:border-oai-gray-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="info" className="text-[10px]">{p.source}</Badge>
                    <Badge className="text-[10px]">{CATEGORY_LABELS[p.category] || p.category}</Badge>
                    {p.timestamp && <span className="text-caption text-oai-gray-400 ml-auto">{p.timestamp}</span>}
                  </div>
                  <p className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300 whitespace-pre-wrap line-clamp-3">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* ═══ Word Cloud ═══ */}
      {word_frequencies && word_frequencies.length > 0 && (
        <section>
          <SectionHeading title="Word Cloud" subtitle="Most frequent terms in your prompts" />
          <Card>
            <WordCloud words={word_frequencies} />
          </Card>
        </section>
      )}

      {/* ═══ Environment ═══ */}
      {env && (
        <section>
          <SectionHeading
            title="Environment"
            subtitle={<span>Codex setup at <code className="text-xs bg-oai-gray-100 dark:bg-oai-gray-800 px-1 py-0.5 rounded">{env.home}</code></span>}
          />

          <Card title="Skills" subtitle={`${env.skills?.count || 0} total (${env.skills?.user_count || 0} user, ${env.skills?.plugin_count || 0} plugin)`} className="mb-6">
            {env.skills?.names?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {env.skills.names.map((name) => (
                  <div key={name} className="flex items-center gap-2 p-3 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50 border border-oai-gray-100 dark:border-oai-gray-800">
                    <span className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300 flex-1">{name}</span>
                    <div className="flex gap-1">
                      {env.skills.user_names?.includes(name) && <Badge variant="info">user</Badge>}
                      {env.skills.plugin_names?.includes(name) && <Badge variant="secondary">plugin</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-oai-gray-500">No skills detected</p>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card title="MCP Servers" subtitle={`${env.mcp_servers?.count || 0} configured`}>
              {env.mcp_servers?.names?.length > 0 ? (
                <div className="space-y-2">
                  {env.mcp_servers.names.map((name) => (
                    <div key={name} className="flex items-center gap-2 p-2.5 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300">{name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-oai-gray-500">No MCP servers configured</p>
              )}
            </Card>
            <Card title="Plugins" subtitle={`${env.plugins?.count || 0} total, ${env.plugins?.enabled_count || 0} enabled`}>
              {env.plugins?.names?.length > 0 ? (
                <div className="space-y-2">
                  {env.plugins.names.map((name) => (
                    <div key={name} className="flex items-center gap-2 p-2.5 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50">
                      <span className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300 flex-1">{name}</span>
                      <Badge variant="success">enabled</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-oai-gray-500">No plugins detected</p>
              )}
            </Card>
          </div>

          {env.config?.present && (
            <Card title="Configuration" subtitle="config.toml settings" className="mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ConfigItem label="Model" value={env.config.model} />
                <ConfigItem label="Personality" value={env.config.personality} />
                <ConfigItem label="Sandbox Mode" value={env.config.sandbox_mode} />
                <ConfigItem label="Approval Policy" value={env.config.approval_policy} />
              </div>
            </Card>
          )}

          {env.custom_instructions?.present && (
            <Card title="Custom Instructions" subtitle={`${env.custom_instructions.char_count?.toLocaleString()} chars, ${env.custom_instructions.line_count} lines`}>
              <pre className="p-4 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50 text-body-sm font-mono text-oai-gray-600 dark:text-oai-gray-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {env.custom_instructions.preview}
              </pre>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

/* ── Reusable sub-components ────────────────────────────── */

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-h2 text-oai-black dark:text-oai-white">{title}</h2>
      {subtitle && <p className="text-body-sm text-oai-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <Card className="text-center py-5 hover-lift">
      <div className="text-h2 font-semibold tabular-nums text-brand-600 dark:text-brand-400">{value}</div>
      <div className="text-label uppercase text-oai-gray-500 dark:text-oai-gray-400 mt-1">{label}</div>
    </Card>
  );
}

function SignalList({ title, items }) {
  const entries = Object.entries(items || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <div>
      <h4 className="text-label uppercase text-oai-gray-500 mb-3">{title}</h4>
      <div className="space-y-2">
        {entries.slice(0, 8).map(([name, count]) => (
          <div key={name} className="flex justify-between items-center">
            <span className="text-body-sm text-oai-gray-700 dark:text-oai-gray-300">{name}</span>
            <span className="text-caption text-oai-gray-500 tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigItem({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-oai-gray-50 dark:bg-oai-gray-800/50 text-center">
      <div className="text-label uppercase text-oai-gray-500 mb-1">{label}</div>
      <div className="text-body-sm font-medium text-oai-black dark:text-oai-white">
        {value || <span className="text-oai-gray-400">—</span>}
      </div>
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

/* ── Skeleton ────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <section>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-64 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonMetric key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonCard />
      </section>
      <section>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SkeletonCard /><SkeletonCard className="md:col-span-2" />
        </div>
        <SkeletonCard />
      </section>
      <section>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-64 mb-8" />
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <SkeletonCard /><SkeletonCard />
        </div>
      </section>
    </div>
  );
}

function ErrorCard({ error }) {
  return (
    <Card className="border-red-200 dark:border-red-800">
      <div className="text-center py-12">
        <p className="text-body text-red-600 dark:text-red-400 mb-2">Failed to load data</p>
        <p className="text-body-sm text-oai-gray-500">{error}</p>
      </div>
    </Card>
  );
}
