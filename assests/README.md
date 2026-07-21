# Vibe Profile Visual Pack (v6 · MBTI flat)

Figures, badges, and banners for the **Roast Result** product UI at the repo root — see [`README.md`](../README.md).

## What's in v6

- **8 profiles** as freestanding MBTI-style flat vector figures (`*-figure.png`)
- **No collectible card frame** on product pages — figures sit on a soft abstract stage
- **8 badges** — symbolic icons (64×64 SVG, not mascot crops)
- Old SBTI diamond rasters archived as `*.sbti-archive.svg`
- **`scripts/score-engine.js`** — six-axis agent score helpers (Node mirrors this in `src/lib/agent-score.js`)
- **`live-report.html`** — optional static export of a live inspect snapshot (not the primary UI)

## Style

See `source/design-system.md` — no black outlines · 5.5–6 heads · muted 6–10 colors · simplified faces · symbolic props.

## Structure

```
assests/
├── characters/01-builder … 08-yolo-shipper/
│   ├── *-figure.png          # primary MBTI figure
│   ├── *-character.svg       # thin wrapper → figure
│   ├── *-card.svg            # alias (compat, not framed)
│   └── *.sbti-archive.svg    # old SBTI diamond cards
├── badges/01-builder … 08-yolo-shipper/
├── banners/  home-hero.*  share-strip.*  result-header.*
├── live-report.html          # optional static roast export
├── notes/live-inspect-summary.json  # redacted snapshot for live-report
├── scripts/score-engine.js   # scoring helpers + DEMO_PROFILES
├── scripts/roast-extras.js   # word cloud / heatmap / share poster helpers
├── source/design-system.md
└── source/references/        # legacy SBTI boards + badge board
```

With `npm run serve`, figures load from `http://localhost:7681/assests/characters/...`.
