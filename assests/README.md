# Vibe Profile Visual Pack

First deliverable for [Issue #2](https://github.com/PinkR1ver/vibe-wrapper/issues/2) — creative asset branch only.

## Folder structure

```
assests/
├── README.md
├── preview.html / review.html
├── characters/
│   ├── 01-builder/
│   │   ├── builder-mascot.png      ← slice from reference PNG (source pixels)
│   │   ├── builder-character.svg   ← PNG embedded as base64
│   │   └── builder-card.svg
│   └── … (debugger, architect)
├── source/references/
│   └── vibe-mascots-v4-reference.png
├── scripts/
│   ├── split-reference.py        ← 1 PNG → 3 mascot slices
│   ├── sync-raster.mjs           ← slices → character + card SVGs
│   └── qa-faces.mjs
└── notes/taxonomy-draft.md
```

## Preview

Open **`review.html`** in a browser (file:// is fine).

## Art pipeline (pixel match)

Hand-traced SVG paths cannot match the visual model reference exactly. The approved look lives in **`source/references/vibe-mascots-v4-reference.png`**. Regenerate assets from that file:

```bash
cd assests
python scripts/split-reference.py
node scripts/sync-raster.mjs
node scripts/qa-faces.mjs
```

Each character SVG is a **self-contained wrapper** with the PNG inlined as `data:image/png;base64,…` (no external `href` — works in browser preview and `<img>` tags).

## Conventions

- **`builder-mascot.png`** = source of truth (one third of the reference board).
- **Character / card SVG** = embedded raster, not re-drawn vectors.
- Type labels (`SHIP`, `DEPLOY`, `ERROR`, …) stay inside the reference art — not re-typeset in code.
