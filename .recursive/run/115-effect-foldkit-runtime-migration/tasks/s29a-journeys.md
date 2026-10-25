# S29a packaged persistence journeys J1/J2/J5 against the packaged runtime (R17)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R17 requires the same request/decision/provider/capture IDs across the J1-J6 matrix, with unique synthetic markers, before/after counters and bounded watermarks, and every assertion in the source §6.9 matrix incorporated verbatim by reference.

## Scope for this slice
Take THREE journeys, not all six: J1 (stream), J2 (tool turns), J5 (restart persistence). Say explicitly why J3/J4/J6 are deferred.

## Method
1. Start the PACKAGED candidate executable (`role-model-router/dist/release/win32-x64/role-model-dev.exe`) on an ephemeral loopback port with a temp state root, and point it at the mock OpenAI-compatible upstream the packaging validator already uses (read `src/validate-packaging.ts` for how it starts and configures that mock). NEVER bind 3456/3457/3458.
2. For each journey: use a UNIQUE synthetic marker, exercise the journey over HTTP, then read the persisted state from the runtime's SQLite/state root and assert the ID chain (request/decision/provider/capture) is unbroken and the marker appears exactly where the matrix says it must.
3. J5 restart: stop the packaged runtime, start it again on the same state root, and assert the journey's records survive and remain queryable with the same IDs.
4. Record before/after counters and bounded watermarks; a journey that cannot be evidenced is recorded as INCONCLUSIVE with the reason, not as passed.

## Files you may write
a test or script under `evidence/other/s29a-*` plus `evidence/logs/s29a-*` and `evidence/other/s29a-tdd.json`. Keep the run worktree clean at the end (commit nothing; leave files for the Lead).

## Rules
No product changes unless a journey cannot be exercised without one (then report it first). No installs, no subagents, no operator ports, temp state on E: and removed.

## Report
Per journey: the marker, the ID chain observed, the assertions from the matrix that were and were not exercisable, INCONCLUSIVE items with reasons, and the exact command to reproduce.