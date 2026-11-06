# S26g wave 2 batch 2: five more read routes (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Apply the established readback pattern to five more wave-2 rows.

## Requirements
1. Pick five wave-2 rows with all `hostEndpoints` present and `requiresHostEndpoint` false. Add them to the shared `readback.ts` surface (client factory, parser spec, generic command, renderer) - do not fork a second pattern.
2. Four DOM states each (success/empty/loading/error), `aria-busy` on loading, distinct 401/403, exact per-route error phrase, and a fetch-count refresh test through the single subscription.
3. Add each client path to `runtime-endpoints.ts` and let the endpoint test tie it to the parsed host table.
4. Flip each inventory row to `verified` with a named proof.

## Files
`apps/runtime-ui-next/src/**`, its tests, inventory statuses; `evidence/logs/s26g-*`; `evidence/other/s26g-tdd.json`.

NO legacy/host changes, no ECharts, no packaging, no installs, no commits, no subagents.

## TDD
RED per state per route; say so where a state cannot exist rather than inventing it. Report the five routes, states, RED/GREEN, counts, typecheck.