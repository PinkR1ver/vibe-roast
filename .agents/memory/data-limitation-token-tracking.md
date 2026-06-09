---
name: data-limitation-no-per-message-tokens
description: Codex and Claude Code session JSONL files lack per-message token usage; TokenTracker gets token data via hooks, not log reading
metadata:
  type: project
---

Codex JSONL (timestamp/type/payload) and Claude Code JSONL (permission-mode/attachment) do not store per-message token usage. Current activity heatmap shows **prompt counts per day**, not token usage per day like TokenTracker.

TokenTracker captures token usage via SessionEnd hooks that write to its own queue.jsonl — it does not read historical session logs for token data.

**Why this matters:** The 3D activity heatmap data differs from what TokenTracker shows because the underlying metric is different (prompts vs tokens). To match TokenTracker's behavior, Vibe Wrapper would need to install its own SessionEnd hooks to capture token usage going forward.

2026-06-09 update: the dashboard heatmap visual shell now follows TokenTracker's 3D design more closely, including preview-to-modal interaction, stats sidebar, palette controls, rotate/reset controls, and source breakdown tooltips.

Later 2026-06-09 update: Vibe Wrapper now reads `~/.tokentracker/tracker/queue.jsonl` as a dedicated activity source when available. TokenTracker queue rows are append-only, so the adapter deduplicates by latest `(source, model, hour_start)` before aggregating daily token rows. The 3D heatmap uses these token daily rows first and only falls back to prompt counts when TokenTracker data is unavailable.
