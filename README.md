# Vibe Wrapper

Local-first vibe coding session analysis: inspect Codex / Claude Code / Cursor / TokenTracker and other mainstream local agents, score an agent profile, and roast it with MBTI-style figures (ghfind-shaped result UX).

## Quick start (full app)

```bash
npm install
cd dashboard && npm install && cd ..
npm run build          # builds dashboard/dist
npm run serve          # http://localhost:7681
```

- **Roast Result** (default landing): `http://localhost:7681/` — score · tier · radar · roast · word cloud · activity heatmap · `#hashtags` · 竖屏分享海报 (3:4)
- Dashboard (activity + DNA radar): top nav → **Dashboard**
- Static live report: `http://localhost:7681/assests/live-report.html`
- Visual asset demo (static, no inspect): `http://localhost:7681/assests/result.html`

Dev mode (API + Vite HMR):

```bash
# terminal 1
VIBE_WRAPPER_NO_OPEN=1 npm run serve
# terminal 2
cd dashboard && npm run dev   # http://localhost:5173 (proxies /api and /assests)
```

## Visual pack only (`assests/`)

Static MBTI figures, badges, banners, and the ghfind-like demo page — no Node inspect required:

```bash
# after npm run serve, or open files directly:
open assests/result.html      # roast demo with 8 personas
open assests/preview.html     # figure gallery
open assests/review.html      # QA board
```

See [`assests/README.md`](assests/README.md) for the visual pack structure.

## Inspect Local Sessions

```bash
npm run inspect -- --from 2026-06-01 --to 2026-06-08 --sources codex,claude,cursor
```

Multi-source (primary + best-effort mainstream agents):

```bash
npm run inspect -- --from 2026-06-01 --to 2026-06-08 \
  --sources codex,claude,cursor,cline,roo,continue,gemini,aider,windsurf,copilot
```

The command prints JSON with source counts, prompt counts, token totals where available, TokenTracker-backed activity rows when available, word frequencies, and prompt records.
It also includes:

- `profile_signals` — useful vs reference prompts, categories, Codex skills/MCP/plugins
- `vibe_profile` — six-axis agent score (orchestration / prompt craft / build / debug / context / ship), tier, dominant archetype, figure paths, and roast copy

Missing roots are safe: empty directories (or absent agent installs) return zero counts and do not crash.

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
  console.log(JSON.stringify({
    summary: report.summary,
    vibe_profile: {
      total: report.vibe_profile.total,
      tier: report.vibe_profile.tier.id,
      archetype: report.vibe_profile.archetype.code,
    },
    top_terms: report.word_frequencies.slice(0, 10),
  }, null, 2));
})();
NODE
```

## Supported sources

| Source | `--sources` id | Default local path | Notes |
| --- | --- | --- | --- |
| Codex | `codex` | `~/.codex/sessions` | JSONL rollouts |
| Claude Code | `claude` | `~/.claude/projects` | Project JSONL |
| Cursor | `cursor` | Cursor `state.vscdb` (platform path) | Best-effort SQLite (`sqlite3`) |
| Cline | `cline` | VS Code/Cursor `globalStorage/saoudrizwan.claude-dev/tasks` | `ui_messages.json` |
| Roo Code | `roo` | VS Code/Cursor `globalStorage/rooveterinaryinc.roo-cline/tasks` | Same task layout as Cline |
| Continue | `continue` | `~/.continue/sessions` | Session JSON |
| Gemini CLI | `gemini` | `~/.gemini/tmp/*/chats` | Session JSON |
| Aider | `aider` | `.aider.chat.history.md` under cwd / `~/projects`… | Markdown history |
| Windsurf | `windsurf` | `~/.codeium/windsurf` | Plaintext JSON/JSONL only; Cascade `.pb` is encrypted |
| Copilot Chat | `copilot` | VS Code/Cursor `globalStorage/github.copilot-chat` | Best-effort session JSON |
| TokenTracker | _(activity)_ | `~/.tokentracker/tracker/queue.jsonl` | Heatmap tokens when present |
| Vibe tracker | `vibe-tracker` | `~/.vibe-wrapper/sessions.jsonl` | Optional hook sink |

Override roots with `--codex-root`, `--claude-root`, `--cursor-db`, `--cline-root`, `--roo-root`, `--continue-root`, `--gemini-root`, `--aider-root`, `--windsurf-root`, `--copilot-root`.

Cursor support is currently best-effort. It reads user `bubbleId` / composer / chat rows from `ItemTable` and `cursorDiskKV` (requires local `sqlite3`). Compact Cursor rows often omit token usage; prompts without timestamps are omitted from date-filtered views.

The dashboard activity heatmap uses TokenTracker hourly token buckets when that queue exists. If it is missing, the heatmap falls back to prompt counts from the prompt adapters.

## Testing

```bash
npm test
```

Coverage for primary + extra session sources:

| Source | Fixtures | What tests cover |
| --- | --- | --- |
| Codex | `test/fixtures/codex/sessions/**/*.jsonl` | JSONL prompt/token parse, date range, inspect + CLI |
| Claude Code | `test/fixtures/claude/projects/**/*.jsonl` | user-message extract, tokens, inspect + CLI |
| Cursor | `test/fixtures/cursor/state.vscdb` | SQLite row parse, path resolution, date filter, inspect + CLI |
| Cline / Roo / Continue / Gemini / Aider / Windsurf / Copilot | `test/fixtures/{cline,roo,continue,gemini,aider,windsurf,copilot}/…` | prompt extract, empty-root safety, multi-source merge |

Multi-source `inspectSources` also asserts `profile_signals` and `vibe_profile` (agent score / figure paths) when Codex + Claude + Cursor fixtures are combined. TokenTracker activity uses `test/fixtures/tokentracker/queue.jsonl`.

## Hooks (optional)

```bash
npm run inspect -- install    # or: node bin/vibe-wrapper.js install
```

Installs SessionEnd hooks for Claude Code / Codex so token usage lands in `~/.vibe-wrapper/sessions.jsonl`.
