# S13c chart states and render policy (public, R10 partial)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The chart primitive renders data, an empty state and an accessible table. R10 also requires the states around it. Build those now; the ECharts mount lifecycle stays out until the owner decides on that dependency.

## Read first
1. `00-requirements.md` R10 and the surrounding chart clauses.
2. `role-model-router/packages/ui/src/foldkit-chart.ts` and its Scene test.
3. The diagnostics page (`role-model-router/apps/runtime-ui-next/src/diagnostics.ts`) for how this codebase already renders loading/stale/denied/empty honestly.

## Required work
1. Extend the chart primitive (or add a sibling state wrapper) so these are distinct and testable: loading, error with a bounded reason, stale with the age and rule, truncated with how many points were dropped, and no-data (already exists). A state that cannot be distinguished from another must be changed, not documented.
2. A deterministic render policy: given a series and a state, the rendered markup is a pure function of them - no clock reads inside the renderer, no randomness, no ids. Document the policy in the module.
3. Tests: one per state, plus one proving the renderer is deterministic (same input twice, identical markup) and one proving truncation is visible rather than silently dropping points.

## Files you may write
- `role-model-router/packages/ui/src/foldkit-chart.ts` (or one sibling module)
- its Scene test under `role-model-router/packages/foldkit/test/`
- `evidence/logs/s13c-*` and `evidence/other/s13c-tdd.json`

Do not add ECharts or any dependency, do not touch vendor, root, lockfile, other packages, or the private repo.

## Strict TDD
One behavioural RED per state. Report: the policy, RED/GREEN per state, counts, typecheck exit, and precisely what R10 still needs.