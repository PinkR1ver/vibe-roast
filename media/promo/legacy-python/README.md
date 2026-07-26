# Vibe Roaster promo

An 18-second code-rendered motion spot built entirely from the repository's
existing character, Banner, Dashboard, and type-system artwork.

## Storyboard

| Time | Beat |
| --- | --- |
| 0–3s | Prompt fragments converge into `YOUR PROMPTS HAVE A PERSONALITY.` |
| 3–6s | The four type axes scan into `MPSF`. |
| 6–10s | Builder and topic-aware poker hashtags are revealed with Token receipts. |
| 10–14s | All sixteen personality characters assemble. |
| 14–18s | `Vibe Roaster`, `16 TYPES / NO ALIBIS`, and `npx vibe-roast`. |

The sound bed is generated locally from synthesized pulses, clicks, risers,
impacts, and a short final shimmer. It contains no sampled or licensed music.

## Render

Requires Python 3, Pillow, and FFmpeg with `libx264` and AAC support.

```bash
# Fast animatics
python3 media/promo/legacy-python/render_promo.py --orientation vertical --preset draft
python3 media/promo/legacy-python/render_promo.py --orientation horizontal --preset draft

# Delivery masters
python3 media/promo/legacy-python/render_promo.py --orientation vertical --preset final
python3 media/promo/legacy-python/render_promo.py --orientation horizontal --preset final
```

Outputs are written to `media/promo/output/`. Great Vibes and its SIL Open Font
License are kept once under `assests/source/fonts/`.
