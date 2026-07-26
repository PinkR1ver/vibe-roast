# Vibe Profile Visual Pack (v7 · 16 vibe types)

Figures, badges, and banners for the **Roast Result** product UI at the repo root — see [`README.md`](../README.md).

## What's in v7

- **16 current vibe types** as freestanding low-poly flat vector figures under `characters-vibe-types/`
- **8 legacy archetypes** retained under `characters/` as compatibility fallbacks
- **No collectible card frame** on product pages — figures sit on a soft abstract stage
- **8 badges** — symbolic icons (64×64 SVG, not mascot crops)
- Old SBTI diamond rasters archived as `*.sbti-archive.svg`
- **`scripts/score-engine.js`** — four-axis type and six-dimension reference helpers (Node mirrors this in `src/lib/agent-score.js`)

## Style

See `source/design-system.md` — no black outlines · 5.5–6 heads · muted 6–10 colors · simplified faces · symbolic props.

## Structure

```
assests/
├── characters-vibe-types/    # 16 current type figures
│   └── <type>-<slug>/
│       └── *-figure.png      # 1024×1536 production figure
├── characters/01-builder … 08-yolo-shipper/
│   ├── *-figure.png          # legacy runtime fallback
│   ├── *-character.svg       # thin wrapper → figure
│   ├── *-card.svg            # alias (compat, not framed)
│   └── *.sbti-archive.svg    # old SBTI diamond cards
├── badges/01-builder … 08-yolo-shipper/
├── banners/  home-hero.*  share-strip.*  result-header.*
├── screenshots/             # anonymized product screenshots used in README
├── scripts/score-engine.js   # type and behavior-dimension reference helpers
├── scripts/vibe-types.json   # 16-type figure manifest
├── source/design-system.md
├── source/vibe-types-visual-brief.md
└── source/references/        # legacy SBTI boards + badge board
```

With `npm run serve`, current figures load from `http://localhost:7681/assests/characters-vibe-types/...`.
