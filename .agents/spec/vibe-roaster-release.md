# Vibe Roaster Release and Mainstream Adapters

Status: completed
Created: 2026-07-22
Last updated: 2026-07-26
Delivered by: GitHub PR #6, merge commit `b3bac2d39ed8614cd8e44f0102a51e068d0073c6`

## Goal

Replace the exploratory multi-page dashboard with a focused, shareable Roast Result product and broaden local session inspection beyond Codex, Claude, and Cursor.

## Delivered scope

- Make `ProfileResult` the only app surface, with a cream editorial layout, bilingual copy, eight MBTI-style archetypes, six-axis score/radar, roast/TL;DR, hashtags, word cloud, and activity panels.
- Add 3:4 canvas share-poster preview/download with locale-aware copy.
- Prefer a compact 2D activity heatmap in the page while retaining an expanded interactive 3D view.
- Add normalized adapters for Cline, Roo, Continue, Gemini CLI, Aider, Windsurf, Copilot Chat, Amazon Q, and Antigravity alongside Codex, Claude, Cursor, and optional Vibe tracker.
- Add activity summaries and a six-axis scoring/archetype engine to the backend report.
- Package the visual system under the stable `/assests` URL and document supported formats and limitations.
- Harden prompt hygiene so assistant/tool/system content does not enter the roast or word cloud.

## Verification

- PR head `55ddc2533698240cd29b96d0b2a16dd851370395` passed 54/54 tests and a Vite production build before merge.
- After preserving and reconciling local prompt-hygiene work, the expanded suite covers complete useful-prompt stats, timestamp preference, code/path filtering, and injected adapter reports.

## Follow-up constraints

- Do not restore the deleted analytics pages as hidden navigation; new product features should extend the Roast Result flow unless the product direction changes explicitly.
- Keep adapter failures isolated and empty-root safe.
- Keep the Node scoring implementation and visual score reference aligned.

## Share-card refresh

On 2026-07-26 the 3:4 export was redesigned as an editorial personality cover instead of a miniature report. The character, four-letter type, and roast are composed as one poster; selected type axes become a quiet index rather than dashboard cards. Confidence remains part of the result page but is intentionally omitted from the share card. The share dialog exposes only actions the browser can complete reliably: native image sharing when supported, caption copying, and PNG download.

The poster now treats the complete hashtag set as part of the identity composition instead of truncating it in the footer. AI-written tags lead with an interpreted domain or scene character—derived from a coherent recurring-concept cluster rather than copied frequency terms—then add coding-behavior and personality jokes. The deterministic fallback deliberately stays with known personality/category labels instead of pretending that a raw keyword is a semantic identity. The footer carries both the public GitHub repository URL and the `npx vibe-roast` command so a detached image still has a clear path back to the project.

AI hashtags use a paired bilingual schema (`en`, `zh`, `kind`, and a short semantic `meaning`) so both languages must express the same joke. Chinese is a localization of the intended meaning rather than a surface-form translation: for example `CodeCult` maps to `代码教团`/`代码邪教`, not `代码文化`. Fixed personality labels reuse the deterministic bilingual profile titles, while proper nouns and meaningful acronyms may remain unchanged. Writer prompt version 3 invalidates older cached copy once so existing profiles receive the paired-label behavior.
