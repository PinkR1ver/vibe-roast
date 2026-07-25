# Evidence-grounded AI roast

- Created: 2026-07-23
- Last updated: 2026-07-24
- Status: completed

## Goal

Borrow ghfind's separation between deterministic analysis and optional AI writing: keep the local four-axis personality result immutable, then let an opt-in writer turn a privacy-bounded evidence packet into bilingual hashtags and roast copy.

## Implemented

- `roast_evidence` contains only aggregate type, category, recurring-concept, activity, and contradiction signals.
- Raw prompts, category examples, paths, environment inventory, and credentials are excluded from the writer payload.
- DeepSeek's OpenAI-compatible endpoint is supported with `deepseek-v4-flash` in non-thinking JSON mode.
- The result is gated by a bilingual provider modal: user-supplied API key or deterministic local fallback. Optional GitHub OAuth is identity-only.
- API-key generation supports DeepSeek, OpenAI, Anthropic, Gemini, Groq, and OpenRouter through OpenAI-compatible, Anthropic Messages, and Gemini GenerateContent adapters.
- GitHub Models was removed as a writer provider after GitHub announced its July 30, 2026 retirement. GitHub OAuth is handled separately from model generation.
- The result page prefers generated bilingual tags and copy when present.
- Interactive generation posts the report's existing `roast_evidence` to `/api/roast`; it does not rerun the full local inspect. The browser aborts after 45 seconds and always clears its busy state.
- The writing prompt uses one central evidence-backed comic premise, a
  three-beat escalation, one sustained metaphor world, 2-4 selective receipts,
  bilingual adaptation, callbacks, and a distinct TL;DR mic-drop. It explicitly
  rejects dashboard-summary filler and generic metric restatement.
- Generated roasts target three readable paragraphs; deterministic
  sentence-boundary formatting restores the composition when a provider
  collapses JSON newlines.
- The writer is intentionally single-pass: one model request per roast, with no
  editor retry, grounding/style audit, compliance repair, sanitizer, or final
  sentence filter. Evidence and comedy guidance live in the prompt, but the
  returned prose is not semantically policed after generation.
- Non-JSON-mode providers may return fenced or prose-wrapped JSON; the parser
  extracts the bounded object before schema validation.
- Missing credentials, network errors, timeouts, and invalid model output retain the deterministic roast.

## Runtime

Interactive users choose an API provider or the deterministic local result. API Provider credentials are supplied to the localhost endpoint for one request and are not persisted by the app.

## Verification

- Unit coverage asserts privacy boundaries, single-call request shape, protocol
  adapters, bilingual parsing, comic-structure instructions, schema validation,
  and invalid-output fallback behavior.
- Production build and localhost visual verification cover the API-provider choice, identity-only GitHub OAuth, and unconfigured-broker states.
