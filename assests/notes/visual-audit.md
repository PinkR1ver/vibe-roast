# Visual audit — v5 SBTI pack

**Date:** 2026-06-11  
**PR:** [#3](https://github.com/PinkR1ver/vibe-wrapper/pull/3) (owner revision)

## Owner feedback addressed

- [x] Expand to **8 profiles** with vibe-coding meme hooks (not mechanical 16 fill)
- [x] **Badges** — v6 symbolic icons per archetype (`vibe-badges-v6-board.png`), 64×64 SVG
- [x] **Banners** — composed from **8 mascot slices only** (`compose-banners.py`), exact 1200×400 / 1200×280, no crop
- [x] Style pivot to **`sbti-style-reference-board.png`** (v5 boards A/B)
- [x] Raster PNG slice embed pipeline retained

## Checks

```bash
cd assests
node scripts/qa-faces.mjs   # 8×3 character assets + 3 banners
```

- [x] 8 character + 8 card + 8 badge SVGs with embedded PNG
- [x] 3 banner SVGs (1200×400 / 1200×280 viewBox)
- [x] No external image href in deliverables

## Preview

`review.html` — full v5 gallery
