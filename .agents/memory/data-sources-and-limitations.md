# Data sources and limitations

Last updated: 2026-07-22

## Normalized source contract

Prompt adapters return a report shaped like:

```js
{
  source,
  root,
  files_scanned,
  prompt_count,
  token_totals,
  prompts: [{ source, timestamp, session_file, text }],
  notes,
}
```

`src/sources/index.js` is the registry and default-source list. The default inspect covers Codex, Claude, Cursor, Cline, Roo, Continue, Gemini, Aider, Windsurf, Copilot, Amazon Q, and Antigravity. `vibe-tracker` is registered but not part of the default list.

## Reliability by source

| Source | Primary format | Important limitation |
| --- | --- | --- |
| Codex | rollout JSONL | Keep only `user_message`; token events are session/event totals, not per-prompt attribution. |
| Claude Code | project JSONL | Keep user text blocks only; exclude tool results, meta rows, and compact summaries. |
| Cursor | `state.vscdb` | Schema varies; requires local `sqlite3`; compact bubbles often lack reliable timestamps and tokens. |
| Cline / Roo | VS Code-family task JSON | Search several editor `globalStorage` roots; layouts vary by extension version. |
| Continue | session JSON | Best-effort message-shape normalization. |
| Gemini CLI | chat JSON under `~/.gemini/tmp` | JSONL variants are not currently parsed by the adapter. |
| Aider | `.aider.chat.history.md` | Discovery is bounded to configured/common project roots; timestamp formats vary. |
| Windsurf | JSON/JSONL exports | Cascade `.pb` trajectories are treated as unreadable/encrypted. Markdown exports are discovered but not parsed. |
| Copilot Chat | VS Code-family storage JSON | Best-effort across changing session containers. |
| Amazon Q | LokiJS chat-history JSON | Only prompt/user rows are profile input. |
| Antigravity | plaintext JSON exports | Binary `.pb` conversations are skipped. |
| TokenTracker | append-only `queue.jsonl` | Activity-only; latest `(source, model, hour_start)` wins before daily aggregation. |
| Vibe tracker | `~/.vibe-wrapper/sessions.jsonl` | Optional explicit-hook sink; its synthetic session summaries must not be mistaken for authored prompts. |

## Token and activity semantics

- Local Codex/Claude logs do not provide reliable per-message token attribution. Their token totals must not be presented as token usage for an individual prompt.
- If TokenTracker has rows in range, `report.activity.metric` is `tokens` and the heatmap/model breakdown use daily TokenTracker totals.
- Token activity distinguishes three rankings: `top_agent` comes from TokenTracker source totals (Cursor/Codex/etc.); `top_provider` is inferred from concrete model names (OpenAI/Anthropic/etc.); `top_model` is the highest-token concrete model. Generic `auto`/`unknown` model buckets count toward Agent totals but are excluded from Provider and Model rankings.
- Otherwise `report.activity.metric` is `prompts`; daily values come only from prompts with timestamps, `total_tokens` remains zero, and UI copy must say prompts rather than tokens.
- Date filters apply to both adapter prompts and TokenTracker buckets. Cursor rows without timestamps can appear in all-time prompt totals but cannot be placed on a day.

## Prompt hygiene

- Codex assistant/tool events, Claude tool-result blocks, Cursor assistant/system bubbles, and generic system/tool notifications are excluded before aggregation.
- `profile_signals.prompt_analysis` classifies useful intent separately from pasted code/log reference material.
- Word frequencies use the complete useful-for-stats collection, prefer timestamped prompts when available, and remove fenced code, local paths, HTML/CSS/code-heavy lines, identifier noise, and stop words.

## Privacy boundary

The report includes raw prompt records and local environment metadata. The server is designed for localhost use; do not treat its API output as anonymized. The checked-in `assests/notes/live-inspect-summary.json` is a redacted product snapshot, not a template for storing live private data in `.agents/`.
