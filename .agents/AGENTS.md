# Vibe Wrapper Agent Notes

Local-first **Roast Result** product: inspect local AI coding sessions (Codex / Claude Code / Cursor / TokenTracker and other adapters), score a six-axis vibe profile, and roast it with MBTI-style figures for social sharing.

## Product surface

- Primary UI: React **Roast Result** (`dashboard/`) — figure · score · radar · roast · word cloud · activity heatmap · hashtags · share poster modal.
- Optional static export: `assests/live-report.html`.
- CLI: `vibe-wrapper inspect` / `serve` / `install` (hooks).

## Durable docs

- Keep decisions and completed feature specs under `.agents/`.
- Keep useful memory notes in `.agents/memory/` (data limits, npm packaging).
- Do not store secrets or raw private session dumps here.
