# Vibe Roaster review instructions

Prioritize actionable correctness, privacy, security, behavioral regressions,
and missing tests. Do not block on style-only preferences.

Project invariants:

- `src/inspect.js` is the aggregation boundary.
- Source adapters are best-effort; missing or unsupported stores return an
  empty report instead of crashing inspection.
- Only real user-authored prompt text may affect prompts, classification,
  scoring, word frequencies, or roast topics.
- Exclude assistant, system, tool-result, encrypted, synthetic, and app-owned
  context.
- TokenTracker is activity-only. Never represent prompt counts as token usage.
- Date-derived views prefer timestamped prompts; undated prompts may still
  contribute to all-time totals.
- Raw prompts, paths, environment configuration, credentials, and private
  session data must not cross the roast-evidence or hosted-inference boundary.
- `assests/` is intentionally misspelled and is a public path contract.
- Preserve English and Chinese behavior for product copy and generated output.

Review requirements:

- Give the file and smallest useful line range.
- Provide a concrete failing input or execution path.
- Distinguish an observed bug from a design preference.
- Check missing-root and malformed-input behavior for adapters.
- Check zero input, bounds, type selection, and asset paths for scoring changes.
- Check desktop/mobile layout and production build risk for frontend changes.
- Check credential, callback, cookie, CORS, and replay behavior for auth changes.
- Treat AI-generated code like any other contribution; require evidence from
  tests and repository contracts.
