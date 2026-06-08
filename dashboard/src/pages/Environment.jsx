import React from "react";
import { Card, Badge } from "../ui";
import { useApi, SkeletonCard } from "../hooks/useApi.jsx";

export default function Environment() {
  const { data, loading, error } = useApi();

  if (loading) return <EnvSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!data) return null;

  const env = data.profile_signals?.environment?.codex;
  if (!env) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-h1 text-neutral-950 dark:text-neutral-50">Environment</h1>
          <p className="text-body-sm text-neutral-500 mt-1">Codex setup signals</p>
        </div>
        <Card>
          <p className="text-body text-neutral-500 text-center py-8">No Codex environment data found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-h1 text-neutral-950 dark:text-neutral-50">Environment</h1>
        <p className="text-body-sm text-neutral-500 mt-1">
          Codex setup at <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">{env.home}</code>
        </p>
      </div>

      {/* Skills */}
      <Card title="Skills" subtitle={`${env.skills?.count || 0} total (${env.skills?.user_count || 0} user, ${env.skills?.plugin_count || 0} plugin)`}>
        {env.skills?.names?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {env.skills.names.map((name) => {
              const isUser = env.skills.user_names?.includes(name);
              const isPlugin = env.skills.plugin_names?.includes(name);
              return (
                <div key={name} className="flex items-center gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-body-sm text-neutral-700 dark:text-neutral-300 flex-1">{name}</span>
                  <div className="flex gap-1">
                    {isUser && <Badge variant="info">user</Badge>}
                    {isPlugin && <Badge variant="secondary">plugin</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-body-sm text-neutral-500">No skills detected</p>
        )}
      </Card>

      {/* MCP Servers + Plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="MCP Servers" subtitle={`${env.mcp_servers?.count || 0} configured`}>
          {env.mcp_servers?.names?.length > 0 ? (
            <div className="space-y-2">
              {env.mcp_servers.names.map((name) => (
                <div key={name} className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-body-sm text-neutral-700 dark:text-neutral-300">{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-neutral-500">No MCP servers configured</p>
          )}
        </Card>

        <Card title="Plugins" subtitle={`${env.plugins?.count || 0} total, ${env.plugins?.enabled_count || 0} enabled`}>
          {env.plugins?.names?.length > 0 ? (
            <div className="space-y-2">
              {env.plugins.names.map((name) => (
                <div key={name} className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                  <span className="text-body-sm text-neutral-700 dark:text-neutral-300 flex-1">{name}</span>
                  <Badge variant="success">enabled</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-neutral-500">No plugins detected</p>
          )}
        </Card>
      </div>

      {/* Config */}
      {env.config?.present && (
        <Card title="Configuration" subtitle="config.toml settings">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ConfigItem label="Model" value={env.config.model} />
            <ConfigItem label="Personality" value={env.config.personality} />
            <ConfigItem label="Sandbox Mode" value={env.config.sandbox_mode} />
            <ConfigItem label="Approval Policy" value={env.config.approval_policy} />
          </div>
        </Card>
      )}

      {/* Custom Instructions */}
      {env.custom_instructions?.present && (
        <Card
          title="Custom Instructions"
          subtitle={`${env.custom_instructions.char_count?.toLocaleString()} chars, ${env.custom_instructions.line_count} lines`}
        >
          <pre className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-body-sm font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {env.custom_instructions.preview}
          </pre>
        </Card>
      )}
    </div>
  );
}

function ConfigItem({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-center">
      <div className="text-label uppercase text-neutral-500 mb-1">{label}</div>
      <div className="text-body-sm font-medium text-neutral-900 dark:text-neutral-100">
        {value || <span className="text-neutral-400">—</span>}
      </div>
    </div>
  );
}

function EnvSkeleton() {
  return (
    <div className="space-y-6">
      <div><div className="skeleton h-9 w-48 mb-2" /><div className="skeleton h-4 w-96" /></div>
      <SkeletonCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard /><SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  );
}

function ErrorCard({ error }) {
  return (
    <Card className="border-red-200 dark:border-red-800">
      <div className="text-center py-8">
        <p className="text-body text-red-600 dark:text-red-400 mb-2">Failed to load data</p>
        <p className="text-body-sm text-neutral-500">{error}</p>
      </div>
    </Card>
  );
}
