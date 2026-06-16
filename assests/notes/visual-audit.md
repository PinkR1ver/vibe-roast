# Visual audit — raster embed pass

**Date:** 2026-06-11  
**Method:** Reference PNG split + base64 SVG embed (pixel match).

## Approach

| Method | Match quality |
|--------|----------------|
| Hand-traced SVG | Approximate — drifts on faces, props, labels |
| **PNG slice → embedded SVG** | **Identical** to `vibe-mascots-v4-reference.png` column |

## Pipeline

```bash
python scripts/split-reference.py
node scripts/sync-raster.mjs
node scripts/qa-faces.mjs
```

## Checks

- [x] Each `*-mascot.png` is one column of the reference board
- [x] Character/card SVG use `data:image/png;base64` (no external href)
- [x] Card art includes reference labels (DEPLOY, ERROR, SHIP, …)
- [x] No legacy human neck/hood layers

## Preview

`review.html` — PNG slice vs card SVG side by side on `#3a3a39` (reference gray).
