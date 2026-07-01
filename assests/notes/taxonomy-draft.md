# Vibe Profile Character Taxonomy (v2)

Assignee: ShinjukuZhu · Branch: `codex/profile-visual-assets` · Status: **8/16** + badges + banners

## Style anchor

Primary reference: `source/references/sbti-style-reference-board.png`  
Production boards: `vibe-profiles-v5-board-a.png` (01–04), `vibe-profiles-v5-board-b.png` (05–08)

SBTI card frame · circuit glow · diamond border accents · chibi or mascot · thick outlines · dark dashboard friendly.

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

## Planned (not in v5 pack)

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
characters/XX-name/  *-mascot.png  *-character.svg  *-card.svg
badges/XX-name/      *-badge.png    *-badge.svg   ← symbolic icon (v6 board)
banners/             home-hero.*  share-strip.*  result-header.*
source/references/   vibe-profiles-v5-board-a/b.png  vibe-badges-v6-board.png
```

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
