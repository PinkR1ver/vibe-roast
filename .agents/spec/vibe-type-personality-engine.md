# Vibe type personality engine

- Created: 2026-07-22
- Last updated: 2026-07-23
- Status: completed

## Goal

Replace the single dominant score archetype with an inspectable MBTI-like four-axis, sixteen-type coding-agent personality model and a coherent sixteen-character visual system.

## Implemented

- Multi-label keyword classification with total weight `1` per useful prompt.
- M/A, O/P, V/S, and F/X evidence splits with visible percentages.
- Six descriptive 0–100 radar dimensions that are not summed into a quality rank.
- Confidence derived from useful-prompt sample size and axis separation.
- `insufficient_data` below 20 useful prompts; zero input remains zero.
- Modular bilingual roast assembled from selected letters and closest tension.
- Agent-neutral type selection: Codex environment inventory does not bias the result.
- Result page and share poster display type code and confidence.
- Sixteen-role visual brief, asset-path manifest, and sixteen generated 1024×1536 true-alpha PNG figures.

## Follow-up

- Replace transitional `archetype` / `total` / `tier` aliases after downstream compatibility review.

## Verification

- `npm test` — 63/63 passing.
- `npm run build` — Vite production build passing.
- All sixteen final PNGs validated at 1024×1536 with real alpha channels and transparent pixels.
- Desktop role-section visual regression confirms figures blend naturally with the existing accent glow without rectangular image backgrounds.
- Desktop and 390×844 mobile result-page checks passing; no horizontal overflow.
