# Contributing to Vibe Roaster

Thanks for helping improve Vibe Roaster. This project reads private local
AI-coding histories, so correctness and privacy are part of every contribution.

For Chinese guidance, see [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md).

## Before you start

- Search existing issues and pull requests.
- Small fixes and documentation improvements may go directly to a pull request.
- Open an issue first for architecture changes, new data sources, public report
  schema changes, scoring changes, authentication, or privacy-boundary changes.
- Never post real session dumps, prompts, credentials, tokens, or identifying
  local paths. Build the smallest synthetic reproduction instead.

## Development setup

Requirements:

- Node.js 20 or newer. CI currently verifies Node.js 20, 22, and 24. Worker and
  Wrangler development requires Node.js 22 or newer.
- npm
- `sqlite3` for Cursor fixture and local-store work

Install and verify:

```bash
npm ci
npm test
npm ci --prefix dashboard
npm run build --prefix dashboard
```

The repository applies an L0–L4 review model. See
[the quality-gate contract](.github/QUALITY_GATES.md) for the responsibility,
blocking policy, and local audit command for each layer.

Useful commands:

```bash
npm run inspect -- --from YYYY-MM-DD --to YYYY-MM-DD --sources codex,claude
npm run serve
npm run worker:dev
```

Read `.agents/AGENTS.md`, `.agents/docs/architecture.md`, and the relevant
`.agents/spec/` file before changing cross-cutting behavior.

## Change requirements

Keep each pull request focused. Do not mix product changes with broad
formatting, generated media, dependency churn, or unrelated refactors.

Adapter changes must:

- use synthetic fixture-backed tests;
- cover missing-root behavior;
- remain best-effort instead of crashing the full inspection;
- extract only real user-authored prompt text.

Profile and scoring changes must:

- cover empty input and score bounds;
- verify category, type, and asset-path behavior;
- keep `src/lib/agent-score.js` aligned with `assests/scripts/score-engine.js`
  when the profile model changes.

Frontend changes must:

- pass the production dashboard build;
- include desktop and mobile screenshots for visible layout changes;
- preserve English and Chinese behavior.

Server, Worker, OAuth, and release changes must describe:

- the trust boundary;
- credential and secret handling;
- failure behavior;
- any migration or rollback requirement.

## Privacy and security

- Do not commit API keys, OAuth secrets, `.env.local`, `worker/.dev.vars`,
  owner sessions, local inspect snapshots, or raw private histories.
- Do not add private session material to fixtures, documentation, screenshots,
  issue reports, or test failure output.
- TokenTracker data is activity-only. Never relabel prompt counts as tokens.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## AI-assisted contributions

AI-assisted contributions are welcome. The author remains responsible for the
design, code, licenses, tests, privacy, and review responses.

In the pull request, disclose:

- which tools materially contributed;
- which parts were generated or substantially rewritten;
- how the result was verified by a human.

Do not paste private prompts or confidential context as proof of AI usage.
AI review is advisory and never replaces maintainer approval.

## Pull requests

Use a conventional pull request title:

```text
feat: add a source adapter
fix(prompt-analysis): preserve user intent around logs
docs: clarify local privacy boundaries
```

Allowed types are `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`,
`ci`, `chore`, `revert`, and `security`.

Complete the pull request template, link relevant issues, and explain the
user-visible effect. Draft pull requests are encouraged for early automated
feedback. Mark a pull request ready only after local checks pass.

Maintainers normally squash-merge pull requests. A clean pull request title
therefore matters more than polishing every intermediate commit.

## Review expectations

Review findings should prioritize correctness, privacy, security, behavioral
regressions, and missing tests. Style-only comments should not block a change
unless they affect maintainability or an established project convention.

After substantial updates, request re-review and resolve every conversation
before merge.
