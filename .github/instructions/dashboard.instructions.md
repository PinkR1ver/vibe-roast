---
applyTo: "dashboard/**/*.{js,jsx,css,html}"
---

- Preserve bilingual labels, theme behavior, and filtered analytics semantics.
- Require a production build for functional changes.
- For visible layout changes, request desktop and mobile evidence.
- Check that long translated text does not overflow controls or cards.
- Do not expose raw prompts, local paths, credentials, or provider secrets.
- Activity remains token-based even when no TokenTracker rows are available.
