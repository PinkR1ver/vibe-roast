# Vibe Profile Visual — Design System (v5 · SBTI board)

Primary style reference: `source/references/sbti-style-reference-board.png`

## Source of truth

| Asset | Role |
|-------|------|
| `vibe-profiles-v5-board-a.png` | Profiles 01–04 (4 columns) |
| `vibe-profiles-v5-board-b.png` | Profiles 05–08 (4 columns) |
| `characters/*/*-mascot.png` | One column slice per profile |
| `badges/*/*-badge.png` | Face/icon crop from slice |
| `banners/*.png` | Wide banner masters |

All deliverable SVGs embed PNG via `data:image/png;base64` (self-contained, no external href).

## Visual language (from SBTI board)

- Vertical card frame, diamond gem top/bottom center
- Dark fill + circuit trace glow (accent per profile)
- Thick black outlines, chibi or mascot (not required to be human)
- Cross-legged / prop-forward poses
- No long baked text in character art (issue rule)

## Profiles (v5 pack)

| Code | Form | Signature |
|------|------|-----------|
| SHIP | Chibi builder | Rocket laptop, fist pump |
| HUNT | Chibi debugger | Hood, error screen, duck |
| DRAW | Chibi architect | Glasses, flowchart tablet |
| FAITH | Robot disciple | Terminal halo worship |
| SPELL | Chibi priest | Giant prompt scroll |
| TABS | Chibi hoarder | Tab swarm, localhost ports |
| METER | Chibi maxxer | Context gauge at 99% |
| YOLO | Chibi shipper | Red YOLO button, chaos |

## Canvas

| Asset | Size |
|-------|------|
| Board slice | 384×1024 (from 1536×1024 ÷ 4) |
| Card SVG | 310×420 |
| Badge SVG | 64×64 |
| Home / share banner | 1200×400 (viewBox; source PNG scaled) |
| Result header banner | 1200×280 |

## Regenerate

```bash
cd assests
python scripts/split-reference.py
node scripts/sync-raster.mjs
python scripts/compose-banners.py
node scripts/sync-banners.mjs
node scripts/qa-faces.mjs
```

Manifest: `scripts/profiles.json`

## QA

Open `review.html` — compare board columns vs cards, badges, banners.
