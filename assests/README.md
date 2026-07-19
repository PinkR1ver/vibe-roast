# Vibe Profile Visual Pack (v6 · MBTI flat)

PR [#3](https://github.com/PinkR1ver/vibe-wrapper/pull/3) · Issue #2 · Branch `codex/profile-visual-assets`

## What's in v6

- **8 profiles** as freestanding MBTI-style flat vector figures (`*-figure.png`)
- **No collectible card frame** on product pages — figures sit on a soft abstract stage
- **8 badges** — symbolic icons (64×64 SVG, not mascot crops)
- Old SBTI diamond rasters archived as `*.sbti-archive.svg`

## Preview

| Page | Purpose |
|------|---------|
| `result.html` | Evaluation / roast surface (picker switches all 8) |
| `preview.html` | 8-figure gallery |
| `review.html` | QA: figures, badges, legacy boards, banners |

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
├── source/design-system.md
└── source/references/        # legacy SBTI boards + badge board
```
