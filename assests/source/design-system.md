# Vibe Profile Visual — Design System (v6 · MBTI flat)

Primary style: classic 16Personalities geometric faceted flat vector (Piotr Antkowiak / Zeda Labs language).

## Art style (canonical)

- Full-body figures, ~5.5–6 heads tall (slightly oversized head)
- Geometric faceted color planes, clean silhouettes, **no black outlines / no line art**
- Simplified faces (dot/oval eyes, minimal nose, simple mouth)
- Large stylized hair masses as 2–3 shade planes (no strand detail)
- Muted harmonious palette (~6–10 colors) per type accent
- Faceted shade planes only — no painterly gradients, grunge, or fabric texture
- Clothing communicates type; one compact symbolic prop grouping
- Natural narrative poses
- Minimal / abstract environment only (product page supplies soft stage blob)
- **No collectible card frame** on product surfaces
- Reference boards: `notes/mbti-ref-analysts.jpg`, `notes/mbti-ref-sentinels.jpg`

## Source of truth

| Asset | Role |
|-------|------|
| `characters/*/*-figure.png` | Freestanding MBTI-style figure (primary) |
| `characters/*/*-character.svg` | Thin wrapper pointing at figure |
| `characters/*/*-card.svg` | Alias of character (compat) — not a framed card |
| `characters/*/*.sbti-archive.svg` | Previous SBTI diamond-card raster embeds |
| `badges/*/*-badge.svg` | Symbolic badge icons (v6 board) |

## Profiles

| Code | Accent | Prop language |
|------|--------|---------------|
| SHIP | Mint | Laptop + rocket badge |
| HUNT | Pink | Rubber duck + error tablet |
| DRAW | Blue | Flowchart tablet + glasses |
| FAITH | Purple | Halo terminal |
| SPELL | Gold | Rules scroll |
| TABS | Orange | Floating browser tabs |
| METER | Cyan | Context gauge ~99% |
| YOLO | Red | Big merge / YOLO button |

## Product display

- Roast Result places the figure **on a soft abstract stage blob** — not inside a bordered card.
- Figure PNGs use `mix-blend-mode: multiply` so light scene canvases dissolve into the page (no rectangular card chrome).
- Score / tier / signals sit beside/below the figure in the React Roast Result UI (and optional `live-report.html` export).

## Preview

Run `npm run serve` and open `http://localhost:7681/` for the live Roast Result. Current figures load from `assests/characters-vibe-types/`; `assests/characters/` is the legacy fallback pack.
