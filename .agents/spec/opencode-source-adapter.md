# OpenCode Source Adapter

Created: 2026-08-07
Status: completed
Goal: Enable OpenCode as a first-class data source for prompt aggregation, token activity, and vibe-coding word clouds.
Scope: A new `src/sources/opencode.js` adapter that reads the local OpenCode SQLite database and returns normalized prompt records, plus registration, CLI flag, and fixture-backed tests.

## Implementation

- **Adapter**: `src/sources/opencode.js` reads `~/.local/share/opencode/opencode.db` via the system `sqlite3` CLI (same pattern as Cursor adapter).
- **Prompt extraction**: Joins `message` (where `role = "user"`) with `part` (where `type = "text"`) to extract user-authored prompt text. Assistant reasoning, text, and step parts are excluded.
- **Token totals**: Aggregated from `session.tokens_input/output/reasoning/cache_read/cache_write` columns. Archived sessions (`time_archived IS NOT NULL`) are excluded from totals.
- **Timestamp conversion**: Unix milliseconds stored by OpenCode are converted to ISO 8601 strings for the normalized contract.
- **Best-effort**: Missing database, unreadable SQLite, or empty tables return an empty report without crashing `inspectSources`.
- **Registration**: Added to `SOURCE_INSPECTORS` and `DEFAULT_SOURCES` in `src/sources/index.js`, and `KNOWN_SOURCES` picks it up automatically.
- **CLI**: `--opencode-root <path>` flag added to `bin/vibe-roast.js` for custom database paths.
- **Dashboard**: Frontend icon and color were already defined (`AgentIcon.jsx` line 16, `UsageAnalytics.jsx` line 21); no UI changes needed.
- **Word cloud**: Works automatically — the adapter returns `prompts[].text`, which feeds into the existing `wordCloudRecords → wordFrequenciesFromRecords` pipeline.

## Testing

- SQLite fixture at `test/fixtures/opencode/opencode.db` with two sessions (one active, one archived) and one old out-of-range session.
- 5 tests in `test/sources-extra.test.js`: fixture read, missing DB, date filtering, archived exclusion, source registration.
- No regressions in the full 155-test suite.

## Limitations

- Requires the `sqlite3` CLI on the system PATH (same constraint as Cursor adapter).
- Token attribution is at session level — per-prompt token breakdowns are not available from the OpenCode schema.
- Does not parse `prompt-history.jsonl` as a fallback; only the SQLite database is used.
- Session-level `context_breakdown_daily` is not populated (OpenCode does not expose per-category context attribution comparable to Codex/Claude).

## Completion

- [x] Adapter reads prompts and tokens from opencode.db
- [x] Registered in source registry and default list
- [x] CLI `--opencode-root` flag
- [x] Fixture-backed tests with missing-DB, date-range, and archived-session coverage
- [x] Documentation updated in `.agents/memory/data-sources-and-limitations.md`
- [x] Full test suite passes (155/155)
