# TokenTracker Queue Activity Adapter

Status: completed
Created: 2026-06-09
Last updated: 2026-07-22

## Goal

Use TokenTracker's local hourly queue as the preferred activity metric while keeping prompt analysis independent from TokenTracker.

## Current contract

- Read `~/.tokentracker/tracker/queue.jsonl` when present or accept an override for tests/CLI use.
- Treat rows as activity only; never inject them into authored prompts, word frequencies, or prompt categories.
- Deduplicate append-only rows by latest `(source, model, hour_start)` and aggregate daily token/model/source totals.
- Apply the inspect date range before aggregation.
- Expose the result through `report.activity` with `metric: "tokens"` and derived streak, peak-day, active-rate, and top-provider values.
- Keep Agent, model provider, and concrete model semantics separate: `top_agent` ranks source applications, `top_provider` ranks inferred model vendors, and `top_model` ranks concrete models. Exclude generic `auto`/`unknown` buckets from the latter two.
- When no TokenTracker rows exist, build timestamped daily prompt counts with `metric: "prompts"` and keep `total_tokens` at zero.
- UI labels and scoring signals must respect the metric; never present prompt counts as tokens.

## UI consumption

The current Roast Result page shows a compact 2D activity map, expandable 3D detail, token/prompt KPI cards, Top Agent/Provider/Model signals, and a TokenTracker model breakdown where available. The former dashboard provider-card selection behavior is obsolete and was removed with the old dashboard.

## Testing notes

Fixture-backed tests cover queue aggregation, deduplication, daily rows, date filtering, model/source breakdown, prompt-count fallback, activity summaries, and inspect integration.

## Completion summary

Implemented in `src/sources/token-tracker.js`, enriched in `src/inspect.js` and `src/lib/activity-metrics.js`, and consumed by the Roast Result activity components and `dashboard/src/lib/profile-viz.js`.
