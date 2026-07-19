# Profile Signal Extractor

Status: completed
Created: 2026-06-08
Last updated: 2026-06-08

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
