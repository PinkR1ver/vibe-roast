# TokenTracker Queue Activity Adapter

Status: completed
Created: 2026-06-09
Last updated: 2026-06-09

## Goal

Make the dashboard 3D heatmap use the same kind of data as TokenTracker: daily token usage aggregated from TokenTracker's local queue.

## Scope

- Read `~/.tokentracker/tracker/queue.jsonl` when present.
- Treat TokenTracker rows as activity data, not prompt text, so personality analysis and word frequencies remain based on local prompt adapters.
- Deduplicate append-only queue rows by latest `(source, model, hour_start)`, matching TokenTracker's dashboard behavior.
- Aggregate deduplicated hourly buckets into daily token rows with model/source breakdowns.
- Expose the result as `report.activity` from `inspectSources`.
- Prefer `report.activity.daily_rows` in the dashboard 3D heatmap; fall back to prompt counts if TokenTracker data is unavailable.

## Testing Notes

Added fixture-backed Node tests for queue aggregation, deduplication, daily rows, model breakdown, and `inspectSources` integration.

## Completion Summary

Implemented `src/sources/token-tracker.js`, added `activity` to inspect output, updated the dashboard heatmap to consume token daily rows, and documented the data source.
