import React from "react";
import { Card, Badge } from "../ui";
import { useApi, SkeletonCard } from "../hooks/useApi.jsx";

const CATEGORY_LABELS = {
  planning: "Planning", debugging: "Debugging", implementation: "Implementation",
  refactor: "Refactor", testing: "Testing", packaging: "Packaging",
  explanation: "Explanation", research: "Research", ui_design: "UI/Design",
  workflow: "Workflow", reference: "Reference",
};

export default function PromptAnalysis() {
  const { data, loading, error } = useApi();

  if (loading) return <PromptSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!data) return null;

  const pa = data.profile_signals?.prompt_analysis || {};
  const categories = pa.categories || {};
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1].count - a[1].count);
  const maxCount = sortedCategories[0]?.[1]?.count || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-h2 text-oai-black dark:text-oai-white">Prompt Analysis</h1>
        <p className="text-body-sm text-oai-gray-500 mt-1">
          Classification of {pa.total_prompts?.toLocaleString() || 0} prompts
        </p>
      </div>

      {/* Useful vs Reference ratio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center py-6 md:col-span-1">
          <div className="text-hero tabular-nums text-brand-600 dark:text-brand-400">
            {((pa.useful_ratio || 0) * 100).toFixed(0)}%
          </div>
          <div className="text-label uppercase text-oai-gray-500 dark:text-oai-gray-400 mt-1">Useful Ratio</div>
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
              <div
                className="progress-bar-fill h-3"
                style={{ width: `${Math.max(((pa.useful_ratio || 0) * 100), 1)}%` }}
              />
            </div>
            <p className="text-caption text-oai-gray-500 mt-2">
              Useful prompts express intent. Reference material is pasted code or logs.
            </p>
          </div>
        </Card>
      </div>

      {/* Category bars */}
      <Card title="Categories">
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
                <div className="flex items-center gap-3">
                  <div className="flex-1 progress-bar">
                    <div
                      className={`progress-bar-fill cat-${name}`}
                      style={{ width: `${Math.max(barWidth, 1)}%` }}
                    />
                  </div>
                </div>
                {row.examples?.length > 0 && (
                  <p className="text-caption text-oai-gray-400 mt-1 truncate">&ldquo;{row.examples[0]?.text}&rdquo;</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Useful prompt examples */}
      {pa.useful_prompts && pa.useful_prompts.length > 0 && (
        <Card title="Useful Prompt Examples" subtitle={`Showing ${pa.useful_prompts.length} of ${pa.useful_prompt_count || 0}`}>
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

      {/* Reference signals */}
      {pa.reference_summary?.signals && (
        <Card title="Reference Signals" subtitle="Extracted from pasted code and logs">
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
    </div>
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

function PromptSkeleton() {
  return (
    <div className="space-y-6">
      <div><div className="skeleton h-9 w-48 mb-2" /><div className="skeleton h-4 w-64" /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard /><SkeletonCard className="md:col-span-2" />
      </div>
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
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
