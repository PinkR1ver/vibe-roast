# TokenTracker Queue Activity Adapter

Status: completed
Created: 2026-06-09
Last updated: 2026-07-26

## Goal

Use TokenTracker's local hourly queue as the preferred activity metric while keeping prompt analysis independent from TokenTracker.

## Current contract

- Read `~/.tokentracker/tracker/queue.jsonl` when present or accept an override for tests/CLI use.
- Treat rows as activity only; never inject them into authored prompts, word frequencies, or prompt categories.
- Deduplicate append-only rows by latest `(source, model, hour_start)` and aggregate daily token/model/source totals.
- Apply the inspect date range before aggregation.
- Expose the result through `report.activity` with `metric: "tokens"` and derived streak, peak-day, active-rate, and top-provider values.
- Keep Agent, model provider, and concrete model semantics separate: `top_agent` ranks source applications, `top_provider` ranks inferred model vendors, and `top_model` ranks concrete models. Exclude generic `auto`/`unknown` buckets from the latter two.
- Bundle `tokentracker-cli` as a production dependency. Initialize its local collectors and compatible hooks on first Vibe Roaster launch, then sync before later reports.
- When no TokenTracker rows exist, keep `metric: "tokens"` with an empty daily series and `total_tokens: 0`; never present Prompt counts as Tokens.
- Disable TokenTracker telemetry by default when Vibe Roaster invokes it.

## UI consumption

The current Roast Result page shows a TokenTracker-style annual activity card: month/day labels, five-level Less/More legend, local UTC offset, and 2D/3D tabs with an expandable interactive view. Below it, functional usage cards provide Day/Week/Month/Total/Custom filtering, Agent filtering, total tokens, proportional estimated cost when available, Agent breakdown, a filter-linked vibe-coding word cloud, Codex/Claude context breakdowns, a compact per-model token/percent/cost breakdown, and a stacked daily/monthly usage trend. Context rows follow the same time/Agent filters and rescale raw-session category proportions to TokenTracker's authoritative source total; Codex context appears only when Codex is selected, Claude context only when Claude Code is selected, and the section stays hidden for All or unsupported agents. Their UI labels explicitly distinguish Codex turn-delta heuristics from Claude content-block approximation. Model rows aggregate equal concrete names across sources, preserve `auto`/`unknown` routing buckets, and collapse to the leading six until expanded. Heatmap cells, Agent proportions, totals, the cloud, context rows, model list, and trend bars update when their containing section enters the viewport or its filter changes; reduced-motion users receive the final state immediately. Summary KPIs remain in the profile header instead of being duplicated inside Activity. The full page supports persisted light, dark, and system themes. Agent badges use normalized local icon mappings. The profile header reports only agents with real prompt or TokenTracker activity; it does not present the number of scanned adapters as found agents. The former dashboard provider-card selection behavior is obsolete and was removed with the old dashboard.

## Testing notes

Fixture-backed tests cover dependency initialization/sync/error handling, queue aggregation, deduplication, daily rows, date filtering, empty-token behavior, activity summaries, inspect integration, usage-range filtering, source totals, model counts, context scaling/filtering, Codex cumulative deltas, Claude streaming-snapshot merging, and trend bucketing.

## Completion summary

Implemented in `src/lib/token-tracker-runtime.js` and `src/sources/token-tracker.js`, enriched in `src/inspect.js` and `src/lib/activity-metrics.js`, and consumed by the Roast Result activity components and `dashboard/src/lib/profile-viz.js`.
