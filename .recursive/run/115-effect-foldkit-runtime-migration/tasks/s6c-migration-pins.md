# S6c pin the properties the S6b review could mutate away (public, R23)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review passed S6b but proved three properties are unpinned and one number is unexplained. Fix those; they are cheap and they make the migration's claims real.

## Fixes
1. ONE CONNECTION: add an assertion that a lookup opens exactly one connection (a spy/counter around the service factory, or a counting seam) - adding a second unused DatabaseSync/makeSync must fail.
2. CLOSE ON EVERY PATH: add an assertion that the connection is closed on success, on a thrown error and on the caught-error path - deleting closeSync from the finally must fail. Observe it directly (a close counter or a second open that would otherwise fail) rather than relying on cleanup.
3. READ-ONLY OPEN: pin it. Attempt a write through the opened handle and assert it fails (or observe the open flags through a seam); a read-write `new DatabaseSync(file)` must fail the test.
4. EXPLAIN THE 7388 ms: state in the evidence why the busy-lock case takes ~7.4 s rather than the 5 s default - if it is repeated open retries (100/200 ms) plus waits, say so with the arithmetic; do not cite a precise number you cannot explain.
5. PORTABILITY: honour `ROLE_MODEL_TEST_TEMP_ROOT` (or the repo's existing override) instead of hardcoding `E:\role-model-run115`, so a host without E: does not fail all four tests.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/test/s6b-cli-sqlite-service-migration.test.ts`
- the migrated cli.ts helper only if a counting seam is genuinely needed (state it)
- `evidence/logs/s6c-*` and `evidence/other/s6c-tdd.json`

No other product files. No installs, no commits, no subagents, no operator ports.

## Rules
Mutation-first for 1-3: apply the reviewer's mutation, capture the RED, then make it fail. Report the timing explanation, per-mutation RED/GREEN, counts and typecheck.