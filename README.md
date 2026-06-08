# Vibe Wrapper

Local-first spike for reading vibe coding session data from Codex, Claude Code, and Cursor.

## Inspect Local Sessions

```bash
npm run inspect -- --from 2026-06-01 --to 2026-06-08 --sources codex,claude,cursor
```

The command prints JSON with source counts, prompt counts, token totals where available, word frequencies, and prompt records.
It also includes `profile_signals`, which separates useful intent prompts from pasted code/log reference material and reports local Codex setup signals such as skill count, MCP servers, enabled plugins, and custom instructions. Reference material is still analyzed for code/log signals such as languages, file extensions, file paths, and error types.

## Preview Profile Signals

```bash
node - <<'NODE'
const { inspectSources } = require('./src/inspect');
(async () => {
  const report = await inspectSources({
    from: '2026-06-01',
    to: '2026-06-08',
    sources: ['codex', 'claude', 'cursor'],
  });
  const prompt = report.profile_signals.prompt_analysis;
  const env = report.profile_signals.environment.codex;
  console.log(JSON.stringify({
    summary: report.summary,
    prompt_counts: {
      total: prompt.total_prompts,
      useful: prompt.useful_prompt_count,
      reference: prompt.reference_prompt_count,
      useful_ratio: prompt.useful_ratio,
    },
    categories: Object.fromEntries(
      Object.entries(prompt.categories)
        .map(([name, row]) => [name, row.count])
        .filter(([, count]) => count > 0)
    ),
    reference_signals: prompt.reference_summary.signals,
    environment: {
      skills: {
        total: env.skills.count,
        user: env.skills.user_count,
        plugin: env.skills.plugin_count,
        sample: env.skills.names.slice(0, 12),
      },
      mcp_servers: env.mcp_servers,
      plugins_enabled: env.plugins.enabled_count,
      custom_instructions_chars: env.custom_instructions.char_count,
    },
    top_terms: report.word_frequencies.slice(0, 15),
  }, null, 2));
})();
NODE
```

Default local sources:

- Codex: `~/.codex/sessions`
- Claude Code: `~/.claude/projects`
- Cursor: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` on macOS

Cursor support is currently best-effort. It reads user `bubbleId` rows from `cursorDiskKV`, but those compact prompt rows may not include reliable timestamps or token usage.
