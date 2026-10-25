# S26e wave 2 batch: four more read routes (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
S26d established the pattern for a wave-2 read route. Apply it to four more routes in one batch, so wave 2 shrinks measurably rather than one route at a time.

## Read first
1. `evidence/other/s26a-route-inventory.json` - pick four wave-2 rows whose `hostEndpoints` are all present and `requiresHostEndpoint` is false.
2. The S26d implementation and test (`src/observability.ts`, `test/s26d-observability.test.ts`) as the pattern.

## Required work
1. For each of the four routes: a client with an injectable fetch (bearer only when provisioned, abort forwarded, no-store where the legacy request had it), a page rendered through Commands/Messages, and success/empty/loading/error asserted on the DOM with an exact error phrase.
2. Share the client factory and the state-rendering helpers rather than copy-pasting four variants; divergence between the four must be intent, not drift.
3. Refresh through the existing single subscription - no second owner; one test per route proving fetch count increments on the shared source.
4. Flip each inventory row to `verified` with a `proofTestName` the file contains; the drift test must enforce it.

## Files you may write
- `apps/runtime-ui-next/src/**`, its tests, and the four inventory statuses
- `evidence/logs/s26e-*` and `evidence/other/s26e-tdd.json`

NO legacy app changes beyond reading, no host changes, no ECharts, no packaging. No installs, no commits, no subagents.

## Strict TDD
RED per state per route. If a route cannot meet the pattern (no empty state, no unit, no exact error), say so and implement what is true rather than inventing a state. Report: the four routes, the shared surface, states per route with justifications, RED/GREEN, counts and typecheck.