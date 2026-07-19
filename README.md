# Vibe Wrapper

Local-first vibe coding session analysis: inspect Codex / Claude Code / Cursor / TokenTracker data, score an agent profile, and roast it with MBTI-style figures (ghfind-shaped result UX).

## Quick start (full app)

```bash
npm install
cd dashboard && npm install && cd ..
npm run build          # builds dashboard/dist
npm run serve          # http://localhost:7681
```

- **Roast Result** (default landing): `http://localhost:7681/` — score · tier · radar · roast · word cloud · 3D activity · `#hashtags` · 竖屏分享海报 (3:4)
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

The command prints JSON with source counts, prompt counts, token totals where available, TokenTracker-backed activity rows when available, word frequencies, and prompt records.
It also includes:

- `profile_signals` — useful vs reference prompts, categories, Codex skills/MCP/plugins
- `vibe_profile` — six-axis agent score (orchestration / prompt craft / build / debug / context / ship), tier, dominant archetype, figure paths, and roast copy

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
      scores: report.vibe_profile.scores,
    },
    top_terms: report.word_frequencies.slice(0, 10),
  }, null, 2));
})();
NODE
```

Default local sources:

- Codex: `~/.codex/sessions`
- Claude Code: `~/.claude/projects`
- Cursor: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` on macOS
- TokenTracker activity: `~/.tokentracker/tracker/queue.jsonl`

Cursor support is currently best-effort. It reads user `bubbleId` / composer / chat rows from `ItemTable` and `cursorDiskKV` (requires local `sqlite3`). Compact Cursor rows often omit token usage; prompts without timestamps are omitted from date-filtered views.

The dashboard 3D heatmap uses TokenTracker hourly token buckets when that queue exists. If it is missing, the heatmap falls back to prompt counts from the prompt adapters.

## Testing

```bash
npm test
```

Coverage for the three primary session sources:

| Source | Fixtures | What tests cover |
| --- | --- | --- |
| Codex | `test/fixtures/codex/sessions/**/*.jsonl` | JSONL prompt/token parse, date range, inspect + CLI |
| Claude Code | `test/fixtures/claude/projects/**/*.jsonl` | user-message extract, tokens, inspect + CLI |
| Cursor | `test/fixtures/cursor/state.vscdb` | SQLite row parse, path resolution, date filter, inspect + CLI |

Multi-source `inspectSources` also asserts `profile_signals` and `vibe_profile` (agent score / figure paths) when Codex + Claude + Cursor fixtures are combined. TokenTracker activity uses `test/fixtures/tokentracker/queue.jsonl`.

## Hooks (optional)

```bash
npm run inspect -- install    # or: node bin/vibe-wrapper.js install
```

Installs SessionEnd hooks for Claude Code / Codex so token usage lands in `~/.vibe-wrapper/sessions.jsonl`.
