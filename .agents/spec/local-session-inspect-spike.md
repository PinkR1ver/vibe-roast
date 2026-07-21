# Local Session Inspect Spike

Status: completed
Created: 2026-06-08
Last updated: 2026-06-08

## Goal

Build a minimal CLI that verifies whether this project can read local Codex, Claude Code, and Cursor session data, extract user prompts, and summarize prompt/token/date-range signals.

## Scope

- Provide `vibe-wrapper inspect`.
- Support `--from`, `--to`, `--sources`, `--format json`, and source root overrides for testability.
- Extract prompt text and token usage where available.
- Produce local stdout output only.
- Keep Cursor parsing best-effort because Cursor local storage schemas vary.

## Initial Architecture

- `src/sources/codex.js`: discover and parse Codex JSONL sessions.
- `src/sources/claude.js`: discover and parse Claude Code JSONL project sessions.
- `src/sources/cursor.js`: inspect Cursor SQLite state database and parse recognizable prompt-bearing values.
- `src/extract/phrase-stats.js`: simple word and phrase frequency summaries.
- `src/inspect.js`: orchestrate sources and aggregate reports.
- `bin/vibe-wrapper.js`: CLI entry point.

## Testing Notes

Use Node's built-in test runner (`npm test`) with fixture session files:

- Codex / Claude Code: JSONL under `test/fixtures/codex` and `test/fixtures/claude`
- Cursor: SQLite `test/fixtures/cursor/state.vscdb` plus parser unit tests; live reads need `sqlite3` on PATH
- Multi-source inspect asserts all three adapters plus `vibe_profile`

2026-06-11 maintenance note: phrase extraction now splits English identifiers such as `SessionEnd` and `session_id` so Claude Code session/hook terminology contributes searchable words like `session`, `end`, and `hook`.

2026-06-11 maintenance note: phrase extraction now splits English identifiers such as `SessionEnd` and `session_id` so Claude Code session/hook terminology contributes searchable words like `session`, `end`, and `hook`.

## Completion Summary

Implemented a minimal Node CLI and source adapters for Codex, Claude Code, and Cursor. Verification on this machine found local prompt signal from all three sources. Cursor currently yields prompt text from `cursorDiskKV` `bubbleId` rows, but compact rows do not provide reliable timestamps or token usage.
