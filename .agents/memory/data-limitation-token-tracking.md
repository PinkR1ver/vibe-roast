---
name: data-limitation-no-per-message-tokens
description: Codex and Claude Code session JSONL files lack per-message token usage; TokenTracker gets token data via hooks, not log reading
metadata:
  type: project
---

Codex JSONL (timestamp/type/payload) and Claude Code JSONL (permission-mode/attachment) do not store per-message token usage. Current activity heatmap shows **prompt counts per day**, not token usage per day like TokenTracker.

TokenTracker captures token usage via SessionEnd hooks that write to its own queue.jsonl — it does not read historical session logs for token data.

**Why this matters:** The 3D activity heatmap data differs from what TokenTracker shows because the underlying metric is different (prompts vs tokens). To match TokenTracker's behavior, Vibe Wrapper would need to install its own SessionEnd hooks to capture token usage going forward.
