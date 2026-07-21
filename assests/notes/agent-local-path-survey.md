# Local agent session path survey (macOS)

Surveyed on this machine (`2026-07-21`) while extending `src/sources/*`.

## Present on this machine

| Path | Status |
| --- | --- |
| `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` | Present (Cursor) |
| `~/.tokentracker/tracker/queue.jsonl` | Present (activity) |
| `~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/` | Present (embeddings/logs only; no chat-session JSON in this install) |

## Absent on this machine (adapters still ship best-effort)

| Agent | Expected path(s) | Adapter |
| --- | --- | --- |
| Codex | `~/.codex/sessions` | `codex` |
| Claude Code | `~/.claude/projects` | `claude` |
| Windsurf / Cascade | `~/.codeium/windsurf`, App Support `Windsurf` | `windsurf` (JSON only; `.pb` skipped) |
| Cline | VS Code/Cursor `globalStorage/saoudrizwan.claude-dev/tasks` | `cline` |
| Roo Code | `…/rooveterinaryinc.roo-cline/tasks` | `roo` |
| Continue | `~/.continue/sessions` | `continue` |
| Aider | `.aider.chat.history.md` under project roots | `aider` |
| Gemini CLI | `~/.gemini/tmp/*/chats` | `gemini` |
| Amazon Q | `~/.aws/amazonq/history/chat-history-*.json` | `amazonq` |
| Antigravity | `~/.gemini/antigravity(-ide)/conversations/*.pb` + App Support `state.vscdb` | `antigravity` (JSON exports only) |

## Unsupported / not practical

| Tool | Why |
| --- | --- |
| Antigravity native trajectories | Conversation bodies are protobuf `.pb`; no stable plaintext schema to parse without IDE internals |
| Windsurf Cascade trajectories | Same `.pb` encryption/binary issue |
| GitHub Copilot Chat (this install) | Extension folder exists but only command embeddings / debug logs — no readable chat JSON |
| ChatGPT desktop / cloud agents | Encrypted or server-side history |
| JetBrains AI Assistant | No clear local prompt JSON on macOS for this survey |

Adapters never throw on missing roots; they return empty prompt counts and optional `notes`.
