---
applyTo: "src/**/*.js,test/**/*.test.js,bin/**/*.js"
---

Review backend changes against `.agents/docs/architecture.md` and
`.agents/memory/data-sources-and-limitations.md`.

- Reject raw private session data in fixtures or diagnostics.
- Require fixture-backed tests for parsing and aggregation changes.
- Preserve normalized report fields and best-effort empty behavior.
- Keep prompt authorship separate from attached code, logs, tool output, and
  app-owned envelopes.
- Verify public report additions are safe for localhost API consumers and do
  not silently enter hosted roast evidence.
