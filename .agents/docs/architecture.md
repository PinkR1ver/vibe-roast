# Architecture

Last updated: 2026-07-22

## Product flow

```text
local session stores / TokenTracker queue
                |
                v
       source adapters (`src/sources`)
                |
                v
       `inspectSources` aggregation
       - prompt classification
       - word frequencies
       - environment signals
       - token/prompt activity
       - four-axis type + confidence + behavioral radar + roast
                |
        +-------+--------+
        |                |
        v                v
 CLI JSON stdout    `/api/inspect`
                         |
                         v
              React Roast Result page
              + 2D/3D activity view
              + 3:4 share poster
```

## Backend

- `bin/vibe-wrapper.js` routes `serve`, `inspect`, `install`, and `uninstall`. No command means `serve`.
- `src/server.js` is a small Node HTTP server. It serves the built SPA, `/api/inspect`, and the repository visual pack under `/assests`.
- `src/sources/index.js` owns the adapter registry and default mainstream source list. Shared parsers live in `src/sources/common.js` and `src/sources/vscode-tasks.js`.
- `src/inspect.js` applies the date range, runs selected adapters, strips duplicate prompt arrays from per-source summaries, aggregates prompts/tokens/activity, and returns the public report.
- `src/extract/prompt-analysis.js` separates user intent from code/log/reference material, derives multi-label categories, and splits each prompt's total category weight to `1`.
- `src/extract/phrase-stats.js` sanitizes useful prompt text and builds word frequencies.
- `src/extract/environment.js` reads Codex skills, MCP/plugin/config, and instruction metadata.
- `src/lib/activity-metrics.js` derives active days, streaks, peak day, active rate, and top provider.
- `src/lib/agent-score.js` maps prompt evidence into four dichotomies and one of sixteen types, calculates confidence plus six descriptive dimensions, assembles bilingual modular roast copy, and resolves visual asset paths. Environment inventory does not select a type.
- `src/hooks/install.js` explicitly adds/removes Claude SessionEnd and Codex notify hooks. `bin/hook.js` appends captured session totals to `~/.vibe-wrapper/sessions.jsonl`.

## Public report

The major fields returned by `inspectSources` are:

- `range`, `generated_at`, and `summary`
- `sources`: normalized source summaries without their duplicated prompt arrays
- `activity`: TokenTracker daily tokens or timestamped prompt-count fallback, plus derived activity metrics
- `word_frequencies`
- `profile_signals.prompt_analysis` and `.environment`
- `vibe_profile`: status, confidence, four-letter `type_code`, four `type_axes`, personality, descriptive dimensions, signals, bilingual roast/TL;DR, and figure path. `archetype`, `total`, and `tier` remain transitional UI aliases for personality/confidence.
- `prompts`: normalized raw prompt records used by the analysis

Treat this shape as the contract between the backend, CLI, tests, and React UI.

## Frontend

- `dashboard/src/App.jsx` fetches the all-time report and renders only `ProfileResult`.
- `dashboard/src/pages/ProfileResult.jsx` owns the Roast Result composition: 16-type figure, four evidence bars, confidence, radar, roast, word cloud, activity, model totals, hashtags, locale toggle, and share-poster modal.
- `dashboard/src/components/ActivityHeatmap.jsx` and `ActivityHeatmap3D*.jsx` render the compact/default 2D view and expanded interactive 3D view.
- `dashboard/src/components/WordCloud.jsx` wraps the `wordcloud` library.
- `dashboard/src/lib/i18n.js`, `hashtags.js`, `profile-viz.js`, and `share-poster.js` provide bilingual labels, tags, model aggregation, and canvas poster generation.
- Vite proxies `/api` and `/assests` to port 7681 in development.

## Visual pack

`assests/` (intentional spelling) retains the legacy eight-archetype pack and defines the new sixteen-type pack under `characters-vibe-types/`. `assests/source/design-system.md` and `assests/source/vibe-types-visual-brief.md` are the visual sources of truth. Raster assets are product inputs, and their paths are part of the type/UI contract.

## Testing and packaging

- `test/*.test.js` uses Node's built-in runner. Source tests use small fixtures, including a real Cursor SQLite fixture.
- Root tests cover CLI, adapters, aggregation, prompt hygiene, activity metrics, scoring, hashtags, i18n, and frontend helper modules.
- `npm run build` is the frontend production check. `prepack` rebuilds the UI, and the root `files` whitelist controls the npm tarball.
