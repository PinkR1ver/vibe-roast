# Vibe Profile Character Taxonomy (v3 · MBTI flat)

Assignee: ShinjukuZhu · Branch: `codex/profile-visual-assets` · Status: **8/8 figures** + badges + result page

## Style anchor

**v6:** modern flat vector editorial (MBTI / 16Personalities language)  
Spec: no black outlines · 5.5–6 heads · muted 6–10 color palette · freestanding full-body · abstract stage only

Archive: previous SBTI diamond cards live as `*.sbti-archive.svg`

## 2026 vibe-coding meme hooks (Apr–Jun)

| Meme signal | Source vibe | Used in |
|-------------|-------------|---------|
| Agentic engineering vs vibe coding | Karpathy / industry discourse 2026 | FAITH, YOLO |
| Cursor `--yolo` / agent mode | Cursor CLI & agent workflows | YOLO |
| Context window / credit meter anxiety | ICSE 2026 vibe-coding studies, SaaS pricing | METER |
| “47 tabs / three localhost ports” | ProgrammerHumor AI memes 2026 | TABS |
| Giant system prompt scroll | Prompt-engineering culture | SPELL |
| “Thank you for the code though” | Production ≠ generation gap | HUNT, YOLO |
| Codex / agent disciple | Owner brief + Cursor agent culture | FAITH |

## 8 implemented archetypes

| # | Archetype | Code | Accent | Hook | Meme / state |
|---|-----------|------|--------|------|--------------|
| 01 | Builder | SHIP | Mint | Deploy first | Ship now, refine in prod |
| 02 | Debugger | HUNT | Pink | Duck + breakpoint | 3am error line + rubber duck |
| 03 | Architect | DRAW | Blue | Three-box flow | Boxes before bytes |
| 04 | Codex Believer | FAITH | Purple | Agent halo terminal | Prays to the agent — owner example |
| 05 | Prompt Priest | SPELL | Gold | Giant rules scroll | `.cursor/rules` as holy text |
| 06 | Tab Hoarder | TABS | Orange | Tab swarm | :3000 :8000 :5000 all open |
| 07 | Context Maxxer | METER | Cyan | Gauge at 99% | Context/credits almost full |
| 08 | YOLO Shipper | YOLO | Red | Big red button | Agent `--yolo`, skip review merge |

## Planned (not in v6 pack)

| # | Archetype | Code | Hook |
|---|-----------|------|------|
| 09 | Rescue Engineer | PATCH | Rebuild vibe-coded prod |
| 10 | Workflow DJ | MIX | Hooks + MCP + agents |
| 11 | Terminal Monk | SHELL | GUI is optional |
| 12 | Readme Never | VOID | Code exists, docs don’t |
| 13 | Research Rabbit | DEEP | Docs tab infinity |
| 14 | Trust Dropper | DOUBT | 29% trust, 84% usage |
| 15 | UI Polisher | GLOW | Pixel pass at 2am |
| 16 | Chaos Shipper | LFG | Friday deploy energy |

## Asset map

```
characters/XX-name/  *-figure.png  *-character.svg  *-card.svg(=figure)
                     *.sbti-archive.svg  ← old framed SBTI rasters
badges/XX-name/      *-badge.png    *-badge.svg
banners/             home-hero.*  share-strip.*  result-header.*  (legacy compose)
source/references/   vibe-profiles-v5-board-a/b.png  vibe-badges-v6-board.png
```

Product surface: `result.html` / `preview.html` — figures float on abstract stage, **no card frame**.

## Scoring axes (result page · agent evaluation)

Aligned with product DNA (`build / debug / plan / design / quality / workflow`) but deepened for **coding-agent usage** (not GitHub stars). Weighted to 100 like ghfind:

| Axis | Max | Maps from | Why it exists |
|------|-----|-----------|---------------|
| Agent orchestration | 20 | workflow + skills/MCP/plugins | Can you conduct agents, not just chat? |
| Prompt craft | 18 | useful ratio + explanation/planning | Intent quality vs paste dumps |
| Build throughput | 18 | implementation + packaging | Did anything actually ship? |
| Debug resilience | 14 | debugging | Root-cause stamina |
| Context discipline | 16 | inverse reference flood + hygiene | Window / credit self-control |
| Ship courage | 14 | packaging + anti-paralysis | Merge energy vs endless ADRs |

Tiers (ghfind-shaped): `GOD ≥88` · `ELITE ≥72` · `SOLID ≥55` · `NPC ≥35` · `TRASH <35`.

Demo UI: `assests/result.html` · engine: `assests/scripts/score-engine.js`.

## Badge symbols (v6 — not mascot crops)

| Code | Symbol |
|------|--------|
| SHIP | Rocket + deploy/play button |
| HUNT | Error X + rubber duck |
| DRAW | Three-box flow arrows |
| FAITH | Terminal + halo |
| SPELL | Rules scroll |
| TABS | Stacked tabs + port badges |
| METER | Gauge at 99% |
| YOLO | Red panic button + lightning |

## Regenerate

```bash
cd assests
python scripts/split-reference.py
python scripts/split-badges.py
node scripts/sync-raster.mjs
python scripts/compose-banners.py
node scripts/sync-banners.mjs
node scripts/qa-faces.mjs
```
