# Vibe Profile Visual Pack (v5)

PR [#3](https://github.com/PinkR1ver/vibe-wrapper/pull/3) · Issue #2 · Branch `codex/profile-visual-assets`

## What's in v5

- **8 profiles** in SBTI card style (`sbti-style-reference-board.png`)
- **8 badges** — v6 **symbolic icons** (64×64 SVG, not mascot crops)
- **3 banners** (home 1200×400, share 1200×400, result 1200×280)
- Raster PNG → base64 SVG pipeline (pixel match with reference boards)

## Preview

| Page | Purpose |
|------|---------|
| `review.html` | Full QA: boards, cards, badges, banners |
| `preview.html` | 8-card gallery |

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

Config: `scripts/profiles.json`

## Structure

```
assests/
├── characters/01-builder … 08-yolo-shipper/
├── badges/01-builder … 08-yolo-shipper/
├── banners/  home-hero.*  share-strip.*  result-header.*
├── source/references/
│   ├── sbti-style-reference-board.png      # style anchor
│   ├── vibe-profiles-v5-board-a.png        # profiles 01–04
│   ├── vibe-profiles-v5-board-b.png        # profiles 05–08
│   └── vibe-badges-v6-board.png            # symbolic badges
└── scripts/  split-reference.py  split-badges.py  sync-raster.mjs
```
