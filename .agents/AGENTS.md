# Vibe Roaster Agent Guide

Vibe Roaster is a local-first Node.js application, published as `vibe-roast`, that reads local AI coding-session history and turns it into a bilingual, shareable profile. The current product surface is the single Roast Result page; the former multi-page analytics dashboard is no longer part of the app shell.

## Start here

- Read `.agents/docs/architecture.md` before changing cross-cutting behavior.
- Read `.agents/memory/data-sources-and-limitations.md` before changing adapters, token totals, date filtering, word-cloud input, or privacy behavior.
- Read the relevant file under `.agents/spec/` for historical intent and completion state.
- `README.md` is the user-facing source for install, CLI, supported-source, and development instructions.

## Runtime and commands

- Root runtime: Node.js 20+, CommonJS. `tokentracker-cli` is the production dependency that provides normalized local token collection.
- UI runtime: React 18 + Vite + Tailwind; dashboard code is ESM.
- `npm test`: run all Node fixture/unit tests.
- `npm run build`: install dashboard dependencies and build `dashboard/dist`.
- `npm run serve`: serve the API, built SPA, and visual pack at `http://localhost:7681`.
- `npm run dev`: run Vite at `http://localhost:5173`; the API server must run separately.
- `npm run inspect -- --from YYYY-MM-DD --to YYYY-MM-DD --sources ...`: emit the full local report as JSON.

## Motion and launch media

- Start product promo or launch-film work with
  `.agents/skills/product-launch-video/SKILL.md`; its required HyperFrames core,
  animation, keyframe, creative, CLI, and media skills are vendored beside it.
- Use `.agents/skills/remotion-best-practices/SKILL.md` when the deliverable is
  better maintained as a React/Remotion composition rather than HyperFrames.
- Existing launch-film sources and masters live under `media/promo/`. Preserve
  the repository's canonical character and README-banner artwork when iterating.

## Architectural invariants

- `src/inspect.js` is the aggregation boundary. Source adapters return normalized reports; profile scoring and the UI consume that aggregate rather than reading local stores directly.
- Source adapters must be best-effort: a missing root or unsupported local format returns an empty report instead of crashing the full inspect.
- Only real user-authored prompt text belongs in `prompts`, prompt classification, scoring, word frequencies, or roast topic clusters. Exclude assistant, system, tool-result, encrypted/binary, synthetic activity content, and app-owned envelopes such as ambient browser state, attachment metadata, recommended-plugin lists, and environment context.
- TokenTracker data is activity-only. Vibe Roaster initializes/syncs the bundled collector before normal runs and keeps Activity in Token mode; an unavailable collector yields zero Token data, never relabeled Prompt counts.
- Undated prompts may contribute to all-time prompt totals, but date-derived views and word-cloud input should prefer timestamped prompts.
- Keep scoring logic in `src/lib/agent-score.js` aligned with the visual reference implementation in `assests/scripts/score-engine.js` when the profile model changes.
- `assests/` is intentionally misspelled and is part of the published package and public URL contract (`/assests/...`). Do not rename it as a cleanup.
- Preserve bilingual behavior for product copy, generated roast fields, hashtags, heatmap labels, and share posters. Raw prompts, model names, and source names are not translated.

## Privacy and release constraints

- The app is local-first, but `/api/inspect` returns prompt records and the local server currently sends permissive CORS headers. Do not expose the server beyond localhost without an explicit privacy/security design.
- Never commit raw private session dumps, credentials, tokens, or machine-specific inspect snapshots into `.agents/`.
- `npm install` remains side-effect free. The first interactive `vibe-roast` run visibly initializes bundled TokenTracker collectors and compatible hooks; later runs sync them before inspection.
- The root `files` whitelist and `prepack` build define the npm artifact. Keep CLI, backend, built UI, `assests/`, and README available to the published package.

## Verification expectations

- Adapter and aggregation changes need fixture-backed Node tests, including empty/missing-root behavior.
- Scoring changes need bounds, zero-input, archetype, and asset-path coverage.
- UI changes need `npm run build`; visually verify desktop/mobile composition and the 3:4 share-poster flow when layout or canvas code changes.
- When feature status or architecture changes, update the relevant spec and `.agents/spec/README.md` in the same task.

## Contribution and automation

- `CONTRIBUTING.md` and `CONTRIBUTING.zh-CN.md` are the source of truth for contributor requirements; keep the pull request template and CI title policy aligned with them.
- `.github/QUALITY_GATES.md` defines the L0–L4 contract. L0 formatting and L1 lint apply incrementally to changed source/configuration files; L2 security/dependency checks and L3 tests/build/coverage are blocking; L4 AI and human semantic review is advisory.
- Pull requests run root tests on Node.js 20, 22, and 24, enforce the `c8 --all` executable-code coverage universe and ratcheted floor, build the dashboard, validate the Worker bundle and npm package, audit high/critical dependency findings, run dependency review, and receive CodeQL analysis. Worker/Wrangler development requires Node.js 22+ even though the root CLI supports Node.js 20+.
- GitHub Actions must use least-privilege permissions and pin third-party actions to full commit SHAs. Dependabot keeps npm and action pins current.
- `.github/copilot-instructions.md` and path-specific files under `.github/instructions/` guide AI review. AI feedback is advisory and does not replace maintainer approval.
- Do not configure a required status check until that check has run successfully on the default branch. Keep required check names stable once branch rules depend on them.
