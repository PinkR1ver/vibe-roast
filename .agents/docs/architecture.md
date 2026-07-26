# Architecture

Last updated: 2026-07-24

The focused GitHub OAuth and hosted-free-AI diagrams live in
[`hosted-roast-architecture.md`](./hosted-roast-architecture.md).

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
       - TokenTracker activity
       - four-axis type + confidence + behavioral radar
       - privacy-bounded roast evidence
                |
        +-------+--------+
        |                |
        v                v
 CLI JSON stdout    `/api/inspect`
                         |
                         v
              provider access modal
              - multi-provider API key
              - deterministic local fallback
              - optional GitHub OAuth identity
                         |
                         v
              React Roast Result page
              + grid/terrain activity view
              + 3:4 share poster
```

## Backend

- `bin/vibe-roast.js` is the sole package CLI and routes `serve`, `inspect`, `install`, and `uninstall`. No command means `serve`. Interactive launches use the zero-dependency ANSI renderer in `src/lib/terminal-ui.js` for a short branded status sequence and rotating English humour; non-TTY, CI, `NO_COLOR`, and `VIBE_ROAST_PLAIN_OUTPUT=1` runs retain stable plain output.
- The CLI loads an optional ignored `.env.local` or `.env` file from the current working directory before importing runtime modules. Explicit process environment variables take precedence.
- `src/server.js` is a small Node HTTP server. It serves the built SPA, `/api/inspect`, provider metadata, `/api/roast`, GitHub OAuth callback/session endpoints, and the repository visual pack under `/assests`. `/api/roast` consumes the already-built aggregate evidence packet rather than rescanning local histories. BYOK requests go directly to the selected provider; hosted requests forward the signed broker session to the Worker's OpenAI-compatible inference endpoint.
- GitHub authentication identifies users of the hosted free tier but is not itself a model provider. The local server uses OAuth state + PKCE, an HttpOnly loopback cookie, and an owner-only session file under `~/.vibe-roast/`. Production npm clients default to the Cloudflare Worker broker at `https://auth.pinktalk.online`; `VIBE_ROAST_AUTH_BROKER_URL` is a self-hosting/development override. The Worker's SQLite-backed Durable Object stores one-time flows/tickets, per-account UTC-day quota counters, and the latest generated roast plus aggregate material-change snapshot for each GitHub identity. Stable-profile cache hits bypass inference and quota. Its Workers AI binding fixes hosted inference to Qwen3 30B and accepts only signed broker sessions. Direct local-secret mode exists only for development.
- `src/sources/index.js` owns the adapter registry and default mainstream source list. Shared parsers live in `src/sources/common.js` and `src/sources/vscode-tasks.js`.
- `src/lib/token-tracker-runtime.js` initializes the bundled `tokentracker-cli` collector on first use and syncs it on later launches. It explicitly uses local-only `--no-auth` initialization and disables telemetry by default, so TokenTracker OAuth, accounts, leaderboards, and cloud sync are not dependencies of Vibe Roaster reporting.
- `src/inspect.js` applies the date range, runs selected adapters, strips duplicate prompt arrays from per-source summaries, aggregates prompts/tokens/activity, and returns the public report. Activity remains Token-based; collection failures produce zero Token data instead of a Prompt-count unit switch.
- `src/extract/prompt-analysis.js` separates user intent from code/log/reference material, derives multi-label categories, and splits each prompt's total category weight to `1`.
- `src/extract/phrase-stats.js` sanitizes useful prompt text and builds word frequencies.
- `src/extract/environment.js` reads Codex skills, MCP/plugin/config, and instruction metadata.
- `src/lib/activity-metrics.js` derives active days, streaks, peak day, active rate, and top provider.
- `src/lib/agent-score.js` maps prompt evidence into four dichotomies and one of sixteen types, calculates confidence plus six descriptive dimensions, assembles the deterministic bilingual fallback roast, and resolves visual asset paths. Environment inventory does not select a type.
- `src/lib/roast-evidence.js` builds an aggregate-only evidence packet without raw prompts, paths, category examples, or environment configuration. It includes recurring domain concepts plus privacy-bounded same-prompt co-occurrence clusters, allowing the writer to turn a coherent topic such as a game, market, and item-price pattern into a playful fictional scene role without combining unrelated interests. Two repeated topic prompts can establish a cluster, and a distinctive recurring standalone concept may seed a comic alter ego. When explicitly enabled, `src/lib/ai-roast.js` sends only this packet through OpenAI-compatible, Anthropic Messages, or Gemini GenerateContent adapters. Writer prompt version 6 asks for five freely ordered bilingual stage-name hashtags and deliberately permits bold exaggeration, slang, puns, mock jobs, and subculture references while keeping factual prose evidence-bound. The writer uses a three-beat comic prompt and one model call, normalizes provider JSON variants, validates the required bilingual schema, and formats paragraphs. There is intentionally no post-generation grounding/style audit, editor pass, repair call, sanitizer, or sentence-level safety edit. Generated copy can replace bilingual hashtags/roast copy but cannot change the deterministic type, axes, confidence, or dimensions.
- `src/lib/roast-snapshot.js` derives the privacy-bounded material-change snapshot used only by the hosted GitHub path. It omits cumulative activity totals so normal growth stays stable. The Worker regenerates after a type/top-Agent change, a 15-point axis shift, an 18-point radar shift, a 20-point category-distribution shift, a large confidence change, or low overlap between established concept sets.
- `src/hooks/install.js` explicitly adds/removes Claude SessionEnd and Codex notify hooks. `bin/hook.js` appends captured session totals to `~/.vibe-roast/sessions.jsonl`.

## Public report

The major fields returned by `inspectSources` are:

- `range`, `generated_at`, and `summary`; `summary.source_count` is the inspected-adapter count retained for compatibility, while `active_sources` and `active_source_count` represent agents with real prompt or TokenTracker activity.
- `sources`: normalized source summaries without their duplicated prompt arrays
- `activity`: TokenTracker daily tokens (or an empty Token dataset when collection is unavailable), plus derived activity metrics
- `word_frequencies`: all-time ranked useful-prompt concepts with raw occurrence `count`, distinct-prompt `prompt_count`, and display `weight`
- `word_cloud_records`: lightweight per-prompt concept/category records keyed by source and timestamp, including coding-vocabulary and observed-acronym signals, used for local time/Agent-filtered cloud recomputation
- `profile_signals.prompt_analysis` and `.environment`
- `vibe_profile`: status, confidence, four-letter `type_code`, four `type_axes`, personality, descriptive dimensions, signals, bilingual roast/TL;DR, optional bilingual AI hashtags, and figure path. `archetype`, `total`, and `tier` remain transitional UI aliases for personality/confidence.
- `roast_evidence`: privacy-bounded aggregate evidence used by the optional AI writer. It intentionally contains no raw prompts.
- `prompts`: normalized raw prompt records used by the analysis

Treat this shape as the contract between the backend, CLI, tests, and React UI.

## Frontend

- `dashboard/src/App.jsx` fetches the all-time report, automatically restores the hosted profile when a GitHub session already exists, otherwise gates the initial result behind `RoastAccessModal`, posts the selected local credential/provider to `/api/roast`, and then renders `ProfileResult`.
- `dashboard/src/components/RoastAccessModal.jsx` owns the one-click GitHub + hosted-free-AI flow, multi-provider API form, process-only API credential explanation, generation status, and explicit local fallback.
- `dashboard/src/pages/ProfileResult.jsx` owns the Roast Result composition: 16-type figure, four evidence bars, confidence, radar, roast, word cloud, activity, model totals, hashtags, locale/theme controls, and share-poster modal.
- `dashboard/src/contexts/ThemeContext.jsx` persists explicit `light`, `dark`, or `system` selection. System mode follows live OS color-scheme changes.
- `dashboard/src/components/ActivityHeatmap.jsx` and `ActivityHeatmap3D*.jsx` render a TokenTracker-style annual heatmap with month/day labels, five-level legend, local UTC offset, and 2D/3D tabs. The default 2D grid is compact; 3D remains expandable and interactive.
- `dashboard/src/components/UsageAnalytics.jsx` renders the functional time/agent-filtered usage summary, vibe-coding word cloud, Codex/Claude context breakdown, compact model-usage list, and stacked trend below Activity. Pure filtering, source/model/context aggregation, context-total rescaling, optional proportional model-cost allocation, model counts, and daily/monthly bucketing live in `dashboard/src/lib/usage-analytics.js`; `dashboard/src/lib/vibe-cloud.js` applies the same time/Agent state, promotes recurring project-domain entities through coverage/repetition/time concentration/acronym signals, and reuses lifetime domain weights in narrow filters.
- `dashboard/src/components/AgentIcon.jsx` maps normalized agent IDs to compact local icon badges; detected agents come from real report activity rather than the adapter scan list.
- `dashboard/src/components/WordCloud.jsx` wraps the `wordcloud` library. It sizes terms by backend `weight`, uses stable term-derived colors and ordering, and exposes the terms as screen-reader text.
- `dashboard/src/lib/i18n.js`, `hashtags.js`, `profile-viz.js`, and `share-poster.js` provide bilingual labels, tags, model aggregation, and canvas poster generation.
- Motion is a progressive layer rather than a layout dependency: page chrome and the profile figure enter first, report cards reveal once on intersection, evidence/radar/heatmap/usage graphics animate their data, and controls use short hover/press feedback. `prefers-reduced-motion` removes staged movement and exposes all content immediately.
- Vite proxies `/api` and `/assests` to port 7681 in development.

## Visual pack

`assests/` (intentional spelling) retains the legacy eight-archetype pack and defines the new sixteen-type pack under `characters-vibe-types/`. `assests/source/design-system.md` and `assests/source/vibe-types-visual-brief.md` are the visual sources of truth. Raster assets are product inputs, and their paths are part of the type/UI contract.

## Testing and packaging

- `test/*.test.js` uses Node's built-in runner. Source tests use small fixtures, including a real Cursor SQLite fixture.
- Root tests cover CLI, adapters, aggregation, prompt hygiene, activity metrics, scoring, hashtags, i18n, and frontend helper modules.
- `npm run build` is the frontend production check. `prepack` rebuilds the UI, and the root `files` whitelist controls the npm tarball.
