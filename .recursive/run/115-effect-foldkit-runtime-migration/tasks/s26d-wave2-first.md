# S26d wave 2 first route: observability snapshot end to end (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Wave 2 is 24 read-only telemetry/observability routes whose host endpoints already exist. Port ONE end to end as the pattern the rest follow, and make it honest about what is proven.

## Read first
1. `evidence/other/s26a-route-inventory.json` - pick a wave-2 route whose endpoints the correlation showed are PRESENT.
2. The legacy route and component for that route (for the exact data shape and the states it maintains).
3. `apps/runtime-ui-next/src/{refresh.ts,diagnostics-client.ts}` and the diagnostics page, as the established client+page+Command pattern.

## Required work
1. Port the chosen read route: a client that performs the real host read (injectable fetch, bearer only when provisioned, abort forwarded, the same gate expectations as the diagnostics client), a page that renders it, and Commands/Messages for load/refresh.
2. Maintain success, empty, loading and error states - each asserted on the rendered DOM, including an exact-phrase assertion for the error state.
3. Reuse the shell's single refresh subscription for refresh where applicable rather than adding a second owner.
4. Update the inventory row to `verified` with a `proofTestName` the file contains, and let the drift test enforce it.

## Files you may write
- `apps/runtime-ui-next/src/**`, its tests, and the inventory status for the one row
- `evidence/logs/s26d-*` and `evidence/other/s26d-tdd.json`

NO legacy app changes beyond reading, no host changes, no ECharts, no packaging. No installs, no commits, no subagents.

## Strict TDD
RED per state. Report: the route chosen and why, the client contract, the states with their assertions, the refresh integration, the inventory change, RED/GREEN, counts and typecheck.