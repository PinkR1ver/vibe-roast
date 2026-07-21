# Live pipeline walkthrough

End-to-end: **scan → score → character → radar → roast → viewable page**.

Date: 2026-07-20 (local) · Machine: this Cursor host

## Outcome

| Field | Value |
| --- | --- |
| Score | **50.7 / 100** |
| Tier | **NPC** 😐 |
| Archetype | **Prompt Priest** (`05-prompt-priest`) |
| Prompts | 322 (Cursor 322 · Codex 0 · Claude 0) |
| Roast (ZH) | 你的 system prompt 是分章节的…卷轴是圣物——二进制还等着受洗。 |

Axes (radar): orchestration 0.3 · promptCraft 17.9 · build 11.3 · debug 1.0 · context 15.9 · ship 4.3

## Commands run

```bash
# 1) Live inspect (all three sources)
node bin/vibe-wrapper.js inspect --sources codex,claude,cursor

# 2) Redacted summary written to:
#    assests/notes/live-inspect-summary.json
#    (no prompt bodies — summary / sources counts / vibe_profile / aggregates only)

# 3) Build dashboard + serve
npm run build
VIBE_WRAPPER_NO_OPEN=1 PORT=7681 npm run serve
# equivalent: VIBE_WRAPPER_NO_OPEN=1 PORT=7681 node bin/vibe-wrapper.js serve
```

## URLs to open

| Surface | URL | Status |
| --- | --- | --- |
| Dashboard (live `/api`) | http://127.0.0.1:7681/ | 200 |
| ProfileResult | Dashboard → **打开 Roast 结果页** (reads `/api/inspect`) | API 200 · vibe_profile present |
| Static live report | http://127.0.0.1:7681/assests/live-report.html | 200 |
| Static alt (assets http.server) | http://127.0.0.1:8765/live-report.html | 200 |
| Figure PNG | http://127.0.0.1:7681/assests/characters/05-prompt-priest/prompt-priest-figure.png | 200 |

API check:

```bash
curl -s 'http://127.0.0.1:7681/api/inspect?sources=codex,claude,cursor' \
  | python3 -c "import sys,json; v=json.load(sys.stdin)['vibe_profile']; print(v['total'], v['tier']['id'], v['archetype']['title'])"
# → 50.7 NPC Prompt Priest
```

## Artifacts (safe to commit)

- `assests/notes/live-inspect-summary.json` — redacted inspect snapshot
- `assests/live-report.html` — static visual report (styles from `result.html`, embedded vibe_profile)
- `assests/notes/live-flow-report.md` — this note

**Not committed:** raw inspect with `prompts[].text` / `useful_prompts` bodies (~242KB).

## Pipeline map

```
local sources (codex / claude / cursor)
        ↓  inspectSources()
   summary + profile_signals + prompts
        ↓  buildVibeProfile()
   vibe_profile { scores, tier, archetype, figure, radar dims, roast }
        ↓
   ┌────┴────┐
   │         │
 /api/inspect   assests/live-report.html (static embed)
   │
 dashboard → ProfileResult (figure + score + radar + roast)
```

## Verification checklist

- [x] Live inspect completed (`prompt_count` 322)
- [x] Redacted JSON has no `"text"` prompt fields
- [x] Character = Prompt Priest, figure path under `assests/characters/05-prompt-priest/`
- [x] Score 50.7 · tier NPC visible in static HTML + API
- [x] Radar six axes + ZH roast present in static report
- [x] `npm run build` + serve on :7681 returns 200 for `/`, `/assests/live-report.html`, `/api/inspect`
