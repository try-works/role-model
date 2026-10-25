# S26k wave 3 slice 1: configuration/control routes (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Wave 2 is delivered (16 read routes). Wave 3 is 27 configuration/control/write routes. This slice takes the CONTROL routes that read configuration and dispatch non-destructive commands - not the destructive writes.

## Requirements
1. Pick up to eight wave-3 `control` rows whose `hostEndpoints` are all present and that need no confirmation flow.
2. Add a `control.ts` surface alongside `readback.ts` (same discipline: injectable fetch, one command per action, shared renderer), with: read state, dispatch action, in-flight guard (a second dispatch while one is pending must not double-fire), success/empty/loading/error on the DOM, and exact error phrasing.
3. Add each path to `runtime-endpoints.ts` so the parsed-registration tie covers it, including the method (the tie must assert GET vs POST/PATCH, not just the path).
4. Flip inventory rows to `verified` with named proofs; leave anything needing confirmation or a destructive write `absent` with a reason.

## Files
`apps/runtime-ui-next/src/**`, tests, inventory; `evidence/logs/s26k-*`; `evidence/other/s26k-tdd.json`.

NO legacy/host changes, no ECharts, no packaging, no installs, no commits, no subagents, and no real operator state - tests use injected fetch only.

## TDD
RED per state and per action, including the double-dispatch guard. Report routes ported, routes refused with reasons, the method-aware tie, RED/GREEN, counts and typecheck.