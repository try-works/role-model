# S26j finish wave 2 (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Twelve routes are verified. Wave 2 has 24 read routes total; finish the remainder on the SAME `readback.ts` surface - no new pattern, no forks.

## Requirements
1. Take the remaining wave-2 read rows whose `hostEndpoints` are all present and `requiresHostEndpoint` false.
2. Add each to the shared surface (spec, client, command, renderer) and to `runtime-endpoints.ts` so the parsed-registration tie covers it.
3. Four DOM states each (`aria-busy` loading, distinct 401/403, exact per-route error phrase, invalid-body rejection) and one fetch-count refresh test each.
4. Flip each inventory row to `verified` with a named proof, and report the final wave-2 totals.
5. If a row cannot be ported (missing endpoint, needs a host change, needs a state the client cannot know), leave it `absent`, say why, and list it - do not fake it.

## Files
`apps/runtime-ui-next/src/**`, tests, inventory; `evidence/logs/s26j-*`; `evidence/other/s26j-tdd.json`.

NO legacy/host changes, no ECharts, no packaging, no installs, no commits, no subagents.

## TDD
RED per state per route. Report routes ported, routes refused with reasons, wave-2 totals, RED/GREEN, counts and typecheck.