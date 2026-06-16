# Vibe Profile Visual — Design System (v4 · raster from reference)

Inspired by [SBTI](https://sbti.digital/en/types): symbolic mascots (rocket, duck, tablet-bot), not humans.

## Source of truth

| Asset | Role |
|-------|------|
| `source/references/vibe-mascots-v4-reference.png` | Approved visual model (3-up board) |
| `characters/*/*-mascot.png` | One column slice per character (512×1024) |
| `*-character.svg` / `*-card.svg` | Self-contained SVG with **embedded PNG** (base64) |

## Why raster embed, not hand SVG

Vector re-draws drift from the reference (faces, props, labels). To match the PNG **pixel-for-pixel**, we split the reference and inline it. Updating the look = replace the reference PNG, then re-run the scripts.

## Characters

| Type | Form | In reference art |
|------|------|------------------|
| SHIP | Mint rocket | Porthole face, DEPLOY chevrons, flame |
| HUNT | Rubber duck | Magnifier, ERROR badge |
| DRAW | Blue tablet bot | Glasses, diagram crown |

## Canvas

| Asset | Size |
|-------|------|
| Mascot PNG slice | 512×1024 (from reference) |
| Character SVG | viewBox 512×1024 (full slice) |
| Card SVG | 310×420 (slice scaled to 210×420, centered) |

## Regenerate

```bash
cd assests
python scripts/split-reference.py
node scripts/sync-raster.mjs
node scripts/qa-faces.mjs
```

## Visual QA

Open `review.html` — left: full reference board; right: generated card (should match the corresponding column).
