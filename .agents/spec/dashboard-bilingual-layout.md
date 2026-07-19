# Dashboard Bilingual Layout

Status: completed
Created: 2026-06-09
Last updated: 2026-06-09

## Goal

Make the profile dashboard work in English and Chinese, and move the word cloud above the 3D Activity Map.

## Scope

- Add a lightweight dashboard i18n dictionary and locale context.
- Add an English/Chinese toggle in the top bar, persisted in `localStorage` as `vibe-locale`.
- Translate dashboard labels, type names/descriptions, category labels, stats labels, heatmap modal copy, and heatmap controls.
- Keep raw prompt text, model names, source names, and numeric values unmodified.
- Move the word cloud from the right DNA column into the main middle column, above the 3D Activity Map.
- Render the word cloud as a wider, denser visual block so its weight matches the 3D Activity Map below it.
- Keep the right column focused on category/DNA bars.

## Testing Notes

Added a Node test for i18n lookup and fallback behavior. Browser verification checked that Word Cloud renders above 3D Activity Map, uses a larger visual footprint, and that Chinese labels appear after toggling the language.

## Completion Summary

Implemented `dashboard/src/lib/i18n.js`, `dashboard/src/contexts/LocaleContext.jsx`, top-bar language toggle, translated dashboard/heatmap chrome, and the revised middle-column layout. The word cloud now uses a larger wide-format canvas with denser placement and restrained rotation.
