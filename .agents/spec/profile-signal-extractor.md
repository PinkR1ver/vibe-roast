# Profile Signal Extractor

Status: completed
Created: 2026-06-08
Last updated: 2026-08-05

## Goal

Add an extractor layer that turns raw local session data into higher-value signals for the future MBTI-like result page.

## Scope

- Classify prompts into useful intent prompts and reference prompts.
- Keep useful prompt definition broad: planning, debugging, implementation, refactor, testing, packaging, explanation, research, UI/design, and workflow prompts are all useful.
- Treat pasted code, stack traces, and large logs as reference material so they do not dominate word frequencies.
- Extract local Codex environment signals: skill count/names, MCP server count/names, enabled plugins, model/personality config, and `AGENTS.md` custom instructions metadata.

## Notes

Cursor prompt text extraction is available, but Cursor timestamps and token usage remain limited.

## Completion Summary

Implemented `profile_signals` in the inspect report. It now includes useful/reference prompt classification, category counts, useful prompt examples, reference summaries, reference code/log signals, Codex skill counts split by user/plugin source, MCP server names, plugin counts, config basics, and custom instruction metadata. Reference code/log signals include detected languages, file extensions, file paths, and error types.

PR #6 made these signals inputs to the six-axis `vibe_profile`. Subsequent prompt-hygiene work keeps the complete useful prompt set for statistics while bounding displayed examples, prefers timestamped prompts for word clouds, and excludes assistant/tool/system text plus pasted code and path noise.

Word-cloud ranking now treats distinct-prompt coverage as the primary relevance signal and gives repetition inside one prompt only a logarithmic bonus. The report retains raw `count` and adds `prompt_count` plus display `weight`. Chinese segmentation combines `Intl.Segmenter` with a compact developer-term vocabulary, and common bilingual concept variants are grouped before ranking. UI rendering narrows the vocabulary to coding-domain terms and specific behavioral categories, omits the generic Implementation fallback, and collapses lexical/category duplicates. Unknown recurring terms can be promoted as project-domain entities using independent-Prompt coverage, mentions per Prompt, time concentration, and observed-acronym signals; casing such as `HIT` is preserved. Lightweight `word_cloud_records` let Usage Analytics rebuild the cloud for Day/Week/Month/Total/Custom and Agent filters, while a lifetime domain index keeps established entities eligible in narrow selections.

Structured-material classification is deliberately provenance-conservative. The extractor recognizes code in any language, configuration data, patches, logs, terminal output, prompt templates, and opaque encoded/minified text. A separable actionable request around code, config, diffs, logs, or terminal output is retained even when the material's origin is unknown; the material remains an unverified attached reference and does not become authorship evidence. Explicit self-authorship or external/generated provenance is recorded separately. Only stripped request text contributes to categories, word statistics, average length, and long-prompt ratio. Pure code without request prose, source-unknown prompt templates, and opaque material remain reference evidence. App-owned envelopes such as recommended-plugin lists, environment context, and injected `AGENTS.md` instructions are always excluded.

Follow-up hardening retains common English and Chinese interrogative requests around attachments, strips complete terminal-output regions, and removes unfenced declaration/return/throw code shapes before category inference.
