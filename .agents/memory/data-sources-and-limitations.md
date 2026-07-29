# Data sources and limitations

Last updated: 2026-07-29

## Normalized source contract

Prompt adapters return a report shaped like:

```js
{
  source,
  root,
  files_scanned,
  prompt_count,
  token_totals,
  context_breakdown_daily,
  prompts: [{ source, timestamp, session_file, text }],
  notes,
}
```

`src/sources/index.js` is the registry and default-source list. The default inspect covers Codex, Claude, Cursor, Cline, Roo, Continue, Gemini, Aider, Windsurf, Copilot, Amazon Q, and Antigravity. `vibe-tracker` is registered but not part of the default list.

## Reliability by source

| Source | Primary format | Important limitation |
| --- | --- | --- |
| Codex | rollout JSONL | Keep only `user_message`; context categories use non-overlapping token deltas and heuristic per-turn tool attribution, never per-prompt attribution. |
| Claude Code | project JSONL | Keep user text blocks only; exclude tool results, meta rows, and compact summaries. Context categories merge streaming snapshots by message id before approximate content-block allocation. |
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
| Vibe tracker | `~/.vibe-roast/sessions.jsonl` | Optional explicit-hook sink; its synthetic session summaries must not be mistaken for authored prompts. |

## Token and activity semantics

- Local Codex/Claude logs do not provide reliable per-message token attribution. Their token totals must not be presented as token usage for an individual prompt.
- `tokentracker-cli` is a runtime dependency. Normal Vibe Roaster launches initialize it once with `--no-auth` and sync it before serving or inspecting; package installation itself remains side-effect free. TokenTracker account/OAuth/leaderboard features are outside the Vibe Roaster data path.
- `report.activity.metric` is always `tokens`. When TokenTracker has rows in range, the heatmap/model breakdown use its daily totals.
- Token activity distinguishes three rankings: `top_agent` comes from TokenTracker source totals (Cursor/Codex/etc.); `top_provider` is inferred from concrete model names (OpenAI/Anthropic/etc.); `top_model` is the highest-token concrete model. Generic `auto`/`unknown` model buckets count toward Agent totals but are excluded from Provider and Model rankings.
- If TokenTracker cannot produce rows, Activity remains an empty Token dataset with `total_tokens: 0`; Prompt counts are not relabeled as Token usage.
- Date filters apply to both adapter prompts and TokenTracker buckets. Cursor rows without timestamps can appear in all-time prompt totals but cannot be placed on a day.
- Codex/Claude context breakdown rows are attached to matching TokenTracker activity days. The UI rescales their category proportions to the authoritative TokenTracker source total for the selected time range.
- Codex Messages/Tool calls attribution is heuristic: each non-overlapping turn delta goes to the distinct tools observed in that turn, or Messages when no tool was observed; reported reasoning tokens stay separate. Claude output is approximately distributed by merged text/thinking/tool-use content-block size, while message input/cache tokens remain Messages or the first-session System prompt.

## Prompt hygiene

- Codex assistant/tool events, Claude tool-result blocks, Cursor assistant/system bubbles, and generic system/tool notifications are excluded before aggregation.
- Codex extraction removes known desktop-owned envelopes, including recommended-plugin, environment, app-context, permission, skills, and `AGENTS.md` instruction blocks, while preserving the authored request that follows them.
- `profile_signals.prompt_analysis` classifies useful intent separately from pasted code/log reference material.
- Structured attachments have ambiguous provenance. Code, config, diffs, logs, terminal output, prompt templates, and opaque text are separated from the surrounding request. Separable actionable prose around code, config, diffs, logs, or terminal output is retained while unknown material origin stays `unverified`; explicit self-authorship or external/generated provenance is recorded separately. Only stripped request text affects profile statistics. Pure code without request prose, source-unknown templates, and opaque text remain reference evidence.
- Word frequencies use the complete useful-for-stats collection, prefer timestamped prompts when available, and remove fenced code, local paths, HTML/CSS/code-heavy lines, identifier noise, and stop words.

## Privacy boundary

The report includes raw prompt records and local environment metadata. The server is designed for localhost use; do not treat its API output as anonymized.
