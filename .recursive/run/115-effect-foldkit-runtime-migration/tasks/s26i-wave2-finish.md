# S26i finish wave 2 (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Ten of wave 2's 24 read routes are ported. Take the next six on the existing `readback.ts` surface - no new pattern.

## Requirements
1. Pick six remaining wave-2 rows with all `hostEndpoints` present and `requiresHostEndpoint` false.
2. Add them to the shared surface (spec, client, command, renderer) and to `runtime-endpoints.ts` so the parsed-registration tie test covers them.
3. Four DOM states each (`aria-busy` loading, distinct 401/403, exact per-route error phrase, invalid-body rejection) and one fetch-count refresh test each.
4. Flip each inventory row to `verified` with a named proof; report the new totals.

## Files
`apps/runtime-ui-next/src/**`, tests, inventory; `evidence/logs/s26i-*`; `evidence/other/s26i-tdd.json`.

NO legacy/host changes, no ECharts, no packaging, no installs, no commits, no subagents.

## TDD
RED per state per route; state any state that cannot exist. Report routes, states, RED/GREEN, counts, typecheck.