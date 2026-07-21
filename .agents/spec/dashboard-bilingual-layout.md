# Roast Result bilingual layout (EN / ZH)

Status: completed
Created: 2026-06-09
Last updated: 2026-07-22

## Goal

Ship English/Chinese locale toggle on the Roast Result page (and keep heatmap chrome translated).

## Scope

- Lightweight dictionary: `dashboard/src/lib/i18n.js` + `LocaleContext` (`vibe-locale` in `localStorage`).
- Translate brand-area controls, KPIs, section titles, roast language, empty/loading states, heatmap modal copy, and share-poster modal chrome.
- Axis hints use `hint` / `hintZh` from the score engine.
- Raw prompt text, model names, source ids, and numeric values stay unmodified.
- Share control is an icon button with an i18n’d `aria-label`; click opens a 3:4 poster preview modal (download is explicit, not auto).

## Testing

`test/i18n.test.js` covers dictionary lookup and fallback. Manual check: toggle EN/ZH, open share modal, confirm Download/Close and poster preview before saving.
