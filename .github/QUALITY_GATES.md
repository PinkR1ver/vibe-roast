# Pull request quality gates

Vibe Roaster uses five complementary review layers. Cheap deterministic checks
run first; probabilistic review supplies evidence but never makes the merge
decision.

| Level | Responsibility | Implementation | Merge policy |
| --- | --- | --- | --- |
| L0 | Formatting | Prettier on changed code and configuration files | Blocking |
| L1 | Code smells | ESLint on changed JavaScript and JSX | Blocking |
| L2 | Rule-based security and dependencies | CodeQL, dependency change review, and high/critical `npm audit` findings | Blocking |
| L3 | Behavior and coverage direction | Node 20/22/24 tests, coverage baseline, dashboard/Worker builds, and package validation | Blocking |
| L4 | Semantics, logic, privacy, and design | Copilot review guided by repository and path-specific instructions, plus maintainer review | Advisory |

## Execution model

L0 runs before L1. L3 starts only after both fast checks pass. L2 runs in
parallel because its analyzers are independent and slower. L4 may comment at
any time, but it does not produce a required merge verdict.

L0 and L1 inspect changed files rather than rewriting the repository baseline.
This is an intentional progressive-adoption boundary: every touched source file
must satisfy the new rules, while this automation PR does not create a broad
formatting diff or conflicts with active product work. Generated assets,
promotional media, and `.agents/` context are outside these source-code gates.
Generated npm lockfiles are also excluded from formatting because npm owns their
serialization. If the comparison base cannot be resolved, the changed-file gate
fails closed instead of silently treating the diff as empty.

L3 uses `c8 --all` and verifies that every file in the declared executable-code
universe appears in the coverage report, including files no test imports. The
current honest floor is 79.7% lines, 67.7% branches, and 89.2% functions.
Raising coverage should ratchet these values upward; lowering them requires an
explicit rationale in the pull request.

## Local audit

Run the deterministic layers before requesting review:

```bash
npm ci
npm run format:check
npm run lint
npm run audit:dependencies
npm test
npm run test:coverage
npm ci --prefix dashboard
npm run build --prefix dashboard
npm ci --prefix worker
npm run deploy:dry --prefix worker
npm pack --dry-run --ignore-scripts
```

Then review the final diff against `.github/copilot-instructions.md` and the
applicable path-specific instructions. AI findings need a concrete failing path
or repository-contract violation; style preferences alone are not actionable.

## Branch-rule rollout

After these jobs have succeeded on the default branch, configure the L0–L3 job
names as required checks. Keep those names stable. Do not make Copilot or any
other L4 review a required status check; maintainers retain the final decision.
