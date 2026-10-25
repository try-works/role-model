# S26n fix the padded refusals, the synthetic actions and the method tie (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The wave-3 review found padded refusals, synthetic control actions that no test exercises against a host, and a method tie that is text matching. Fix all three.

## 1. Stop refusing read-only and redirect rows with a write reason
These are NOT 'needs action payload, identity, or confirmation':
- redirects: `legacy-redirect` (a Navigate map), `local-models`, `local-matrix`, `router-config` (short Navigate stubs) - express them as redirects and test that each path resolves to its target
- read-only pages: `integrations-downstream`, `integrations-upstream`, `local-peer-models`, `queues-configuration-card`, `local-choose` - port them as readback specs (the shared surface already does reads) with the four states
Only rows that genuinely POST/PATCH a destructive change keep a write/confirmation reason, and that reason must name the endpoint and the action.

## 2. Replace synthetic actions with real ones
`control.ts` currently dispatches synthetic ids/modes (`synthetic-provider-account`, `synthetic-model`, `best-total-score`). Use the real action the legacy page sends - read the legacy component and the host handler - and send real paths, methods and bodies.

## 3. Make the control client testable and the tie semantic
- Add a test that exercises `createControlClients` against a stub host (or a real in-process host handler) capturing method, path and body, and assert each action's exact request. Mutating the method to GET or the body to `{}` must FAIL.
- Replace the literal `request.method === "..." && url.pathname === "..."` tie with a check that survives semantics: at minimum it must fail for a dead condition (`false && ...`) and for a nested/reordered real condition - or, better, run the control client against the real handler in-process.

## 4. Fix the counts and lock them
The prose says 24 absent while the totals say 23. Correct it, and the tests added in S26l (absent rows need a reason; totals must match rows) must cover the wave-3 numbers too.

## Files
`apps/runtime-ui-next/src/**`, tests, inventory; `evidence/logs/s26n-*`; `evidence/other/s26n-tdd.json`.

NO legacy/host changes unless a real in-process handler harness is needed (say so), no ECharts, no packaging, no installs, no commits, no subagents, injected fetch or in-process host only - never operator state.

## TDD
RED for each redirect, each read-only page, each real control action, the dead-condition tie and the count rule. Report: rows ported, remaining refusals with their endpoint+action, the real action list, RED/GREEN, counts and typecheck.