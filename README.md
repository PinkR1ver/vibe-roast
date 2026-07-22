# Vibe Wrapper

Local-first vibe coding session analysis: inspect Codex / Claude Code / Cursor / TokenTracker and other mainstream local agents, score an agent profile, and **roast** it with MBTI-style figures.

The only product UI is **Roast Result** (cream editorial page: 16-type figure · type axes · radar · roast · word cloud · activity heatmap · hashtags · share poster).

## Quick start

```bash
npm install
cd dashboard && npm install && cd ..
npm run build          # builds Roast Result UI → dashboard/dist
npm run serve          # http://localhost:7681
```

- **Roast Result**: `http://localhost:7681/`
- Optional static export: `http://localhost:7681/assests/live-report.html`
- Character figures / badges / banners: served under `/assests/characters`, `/assests/badges`, `/assests/banners`

Dev mode (API + Vite HMR):

```bash
# terminal 1
VIBE_WRAPPER_NO_OPEN=1 npm run serve
# terminal 2
npm run dev            # http://localhost:5173 (proxies /api and /assests)
```

## Inspect Local Sessions

```bash
npm run inspect -- --from 2026-06-01 --to 2026-06-08 --sources codex,claude,cursor
```

Multi-source (primary + best-effort mainstream agents):

```bash
npm run inspect -- --from 2026-06-01 --to 2026-06-08 \
  --sources codex,claude,cursor,cline,roo,continue,gemini,aider,windsurf,copilot
```

The command prints JSON with source counts, prompt counts, token totals where available, TokenTracker-backed activity rows when available, word frequencies, and prompt records.
It also includes:

- `profile_signals` — useful vs reference prompts, categories, Codex skills/MCP/plugins
- `vibe_profile` — four-letter vibe type, four evidence splits, confidence, six descriptive dimensions, figure path, and bilingual roast copy

Missing roots are safe: empty directories (or absent agent installs) return zero counts and do not crash.

## Preview Profile Signals

```bash
node - <<'NODE'
const { inspectSources } = require('./src/inspect');
(async () => {
  const report = await inspectSources({
    from: '2026-06-01',
    to: '2026-06-08',
    sources: ['codex', 'claude', 'cursor'],
  });
  console.log(JSON.stringify({
    summary: report.summary,
    vibe_profile: {
      total: report.vibe_profile.total,
      tier: report.vibe_profile.tier.id,
      type: report.vibe_profile.type_code,
    },
    top_terms: report.word_frequencies.slice(0, 10),
  }, null, 2));
})();
NODE
```

## How the roast works

Vibe Roaster is an entertainment-oriented behavioral profile, not a psychological test. The engine is deterministic and local: it does not send prompt text to an LLM.

The pipeline is:

```text
local user prompts
  → remove assistant / tool / system noise
  → separate useful intent from pasted code and logs
  → match every useful prompt to one or more intent categories
  → split one prompt's weight equally across its matched categories
  → resolve four behavioral dichotomies into a four-letter type
  → calculate six descriptive radar dimensions
  → assemble a bilingual roast from the selected letters and closest tension
```

### Prompt categories

Classification is multi-label. For example, “fix this login bug and add a regression test” contributes `0.5` to Debugging and `0.5` to Testing, so one verbose prompt cannot count as several prompts. Reference material stays outside the useful-intent denominator.

| Category | Typical evidence |
| --- | --- |
| Planning | plans, design, architecture, brainstorming |
| Debugging | bugs, failures, exceptions, root-cause work |
| Testing | tests, specs, regression, assertions, coverage |
| Refactor | restructuring, extraction, cleanup, abstraction |
| Packaging | build, release, publish, npm, deployment work |
| Explanation | explain, why, walkthrough requests |
| Research | search, documentation, investigation |
| UI design | pages, components, layout, interaction, CSS/UX |
| Workflow | agents, hooks, MCP, skills, automation, instructions |
| Implementation | useful requests that do not match a more specific category |
| Reference | pasted code, logs, stack traces, system/tool noise; excluded from useful intent counts |

### Four type axes

The type is MBTI-like in presentation, but its letters describe observed coding-agent behavior rather than psychology. Each axis compares two evidence pools and exposes the percentage split in the UI.

| Axis | Left pole | Right pole | Main evidence |
| --- | --- | --- | --- |
| M / A | **Maker** — asks for runnable artifacts | **Architect** — asks for plans and explanations | implementation, packaging, testing, debugging vs planning, research, explanation |
| O / P | **Orchestrator** — delegates through workflows | **Promptsmith** — directs one agent through crafted requests | workflow language vs explanation, UI direction, and direct implementation language |
| V / S | **Verifier** — proves and repairs | **Shipper** — builds and releases | debugging, testing, refactor vs implementation and packaging |
| F / X | **Focused** — keeps requests compact | **Max-context** — supplies broad context | useful/reference ratio and long-prompt ratio |

Codex skills, MCP servers, and plugin counts do **not** select a type. This avoids giving one agent application a built-in personality advantage.

### The sixteen types

| Type | Role | Type | Role |
| --- | --- | --- | --- |
| MOVF | Agent Engineer | AOVF | Systems Architect |
| MOVX | Systems Wrangler | AOVX | Context Cartographer |
| MOSF | YOLO Shipper | AOSF | Strategy Shipper |
| MOSX | Agent Commander | AOSX | Agent Believer |
| MPVF | Debugger | APVF | Architect |
| MPVX | Context Maxxer | APVX | Prompt Priest |
| MPSF | Builder | APSF | Diagram Sprinter |
| MPSX | Tab Hoarder | APSX | Infinite Planner |

There is no primary/secondary persona. One four-letter result is built from four independently inspectable decisions. The six-axis radar remains descriptive detail—Agent orchestration, prompt craft, build drive, verification drive, context appetite, and shipping bias—and is not summed into a quality rank.

### Confidence and roast assembly

Confidence combines sample size (reaching full sample weight at 80 useful prompts) with separation between the two poles on each axis. Fewer than 20 useful prompts returns `insufficient_data` and explicitly calls the type provisional; empty input produces six zero radar values instead of invented points.

Roast copy is modular. It selects one comic observation for each winning letter, then calls out the closest axis split as the main tension. Prompt text is never quoted in the roast. The 16 role hooks and visuals make the result memorable, while the percentages and confidence keep the joke traceable to evidence.

### Activity identity is separate from personality

When TokenTracker data exists, the result also reports:

- **Top Agent** — the application/source with the most recorded tokens, such as Cursor or Codex.
- **Top Provider** — the inferred model vendor, such as OpenAI, Anthropic, Google, DeepSeek, or xAI.
- **Top Model** — the concrete model with the most recorded tokens.

Generic model buckets such as `auto` and `unknown` count toward Top Agent but are excluded from Top Provider and Top Model. Activity totals, streaks, and these rankings remain result-card evidence; they do not select the four-letter type.

### Current limitations

- Category matching is keyword-based; it recognizes multiple intents but does not perform semantic task understanding.
- Scores use prompt proportions, not task difficulty, code quality, outcome quality, or whether a suggested change was accepted.
- Long-prompt length is a coarse proxy for context appetite; it does not know whether every included file was necessary.
- Token totals and activity cadence do not currently change the type.
- The result describes the selected date range and can change when the range changes.

## Supported sources

| Source | `--sources` id | Default local path | Notes |
| --- | --- | --- | --- |
| Codex | `codex` | `~/.codex/sessions` | JSONL rollouts |
| Claude Code | `claude` | `~/.claude/projects` | Project JSONL |
| Cursor | `cursor` | Cursor `state.vscdb` (platform path) | Best-effort SQLite (`sqlite3`) |
| Cline | `cline` | VS Code/Cursor `globalStorage/saoudrizwan.claude-dev/tasks` | `ui_messages.json` |
| Roo Code | `roo` | VS Code/Cursor `globalStorage/rooveterinaryinc.roo-cline/tasks` | Same task layout as Cline |
| Continue | `continue` | `~/.continue/sessions` | Session JSON |
| Gemini CLI | `gemini` | `~/.gemini/tmp/*/chats` | Session JSON |
| Aider | `aider` | `.aider.chat.history.md` under cwd / `~/projects`… | Markdown history |
| Windsurf | `windsurf` | `~/.codeium/windsurf` | Plaintext JSON/JSONL only; Cascade `.pb` is encrypted |
| Copilot Chat | `copilot` | VS Code/Cursor `globalStorage/github.copilot-chat` | Best-effort session JSON |
| Amazon Q | `amazonq` | `~/.aws/amazonq/history` | LokiJS `chat-history-*.json` (`type: prompt`) |
| Antigravity | `antigravity` | `~/.gemini/antigravity(-ide)/conversations` | Plaintext JSON exports only; conversation `.pb` is binary |
| TokenTracker | _(activity)_ | `~/.tokentracker/tracker/queue.jsonl` | Heatmap tokens when present |
| Vibe tracker | `vibe-tracker` | `~/.vibe-wrapper/sessions.jsonl` | Optional hook sink |

Override roots with `--codex-root`, `--claude-root`, `--cursor-db`, `--cline-root`, `--roo-root`, `--continue-root`, `--gemini-root`, `--aider-root`, `--windsurf-root`, `--copilot-root`, `--amazonq-root`, `--antigravity-root`.

**Not supported (no reliable plaintext session store on this machine / formats):** JetBrains AI Assistant cloud history, ChatGPT desktop (encrypted), Cursor cloud-only threads without local bubbles, Antigravity / Windsurf Cascade protobuf trajectories without a JSON export.

Cursor support is currently best-effort. It reads user `bubbleId` / composer / chat rows from `ItemTable` and `cursorDiskKV` (requires local `sqlite3`). Compact Cursor rows often omit token usage; prompts without timestamps are omitted from date-filtered views.

The Roast Result activity heatmap uses TokenTracker hourly token buckets when that queue exists. If it is missing, the heatmap falls back to prompt counts from the prompt adapters.

## Visual assets (`assests/`)

The legacy eight-figure pack remains as a runtime fallback. The complete sixteen-type PNG set lives under `assests/characters-vibe-types/`; its generation directions are documented in [`assests/source/vibe-types-visual-brief.md`](assests/source/vibe-types-visual-brief.md).

## Testing

```bash
npm test
```

Coverage for primary + extra session sources:

| Source | Fixtures | What tests cover |
| --- | --- | --- |
| Codex | `test/fixtures/codex/sessions/**/*.jsonl` | JSONL prompt/token parse, date range, inspect + CLI |
| Claude Code | `test/fixtures/claude/projects/**/*.jsonl` | user-message extract, tokens, inspect + CLI |
| Cursor | `test/fixtures/cursor/state.vscdb` | SQLite row parse, path resolution, date filter, inspect + CLI |
| Cline / Roo / Continue / Gemini / Aider / Windsurf / Copilot / Amazon Q / Antigravity | `test/fixtures/{cline,roo,continue,gemini,aider,windsurf,copilot,amazonq,antigravity}/…` | prompt extract, empty-root safety, multi-source merge |

Multi-source `inspectSources` also asserts `profile_signals` and `vibe_profile` (agent score / figure paths) when Codex + Claude + Cursor fixtures are combined. TokenTracker activity uses `test/fixtures/tokentracker/queue.jsonl`.

## Hooks (optional)

```bash
npm run inspect -- install    # or: node bin/vibe-wrapper.js install
```

Installs SessionEnd hooks for Claude Code / Codex so token usage lands in `~/.vibe-wrapper/sessions.jsonl`.
