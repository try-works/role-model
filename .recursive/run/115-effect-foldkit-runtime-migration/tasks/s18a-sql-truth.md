# S18a SQL blocking and maintenance truth (public, R24)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R24 requires the opposite of a performance claim: prove that `node:sqlite` DatabaseSync **remains blocking**, make no scheduled-runSync or Effect-Tx-memory substitute, preserve per-store PRAGMA, and measure the lock/event-loop cost. It also requires draining and fencing owners for reset/restore.

## Read first
1. `00-requirements.md` R24 (lines 222-228).
2. `role-model-router/packages/sql-sqlite-node/src/service.ts` (the accepted Effect service) and `role-model-router/packages/sqlite-memory/src/index.ts`.
3. The accepted S6a evidence for the busy-timeout contract so you do not re-litigate it.

## Required work
1. A measurement, not an assertion: capture event-loop delay or lock-wait while a long `DatabaseSync` statement runs, and show that other work is blocked during it. The RED must show the current code path is blocking (that is the true, desired state) and the test must fail if someone later pretends it is non-blocking.
2. Preserve per-store PRAGMA: read back the PRAGMAs each store actually sets and pin them. If a store relies on a default, say which default and where it comes from.
3. Drain and fence an owner before a reset/restore path: prove that a reset/restore refuses while an owner is active and proceeds only after the owner is drained. If no such path exists in the public tree, report exactly where it would live instead of inventing one.
4. No scheduled runSync and no Effect transaction memory standing in for SQL transactions: assert that no such substitute appears in the paths you touched.

## Files you may write
- one new test file under `role-model-router/packages/sql-sqlite-node/test/` and/or `role-model-router/packages/sqlite-memory/test/` (say which and why)
- measurement helper code inside those packages
- `evidence/logs/s18a-*` and `evidence/other/s18a-tdd.json`

Do not change product behaviour: this slice measures and pins what is true, and reports gaps rather than fixing them silently. Do not touch root, lockfile, vendor, the client app, or the private repo.

## Rules
No installs, no commits, no subagents. Keep measurements deterministic enough to survive CI: state the tolerance and why, and avoid absolute timing assertions that flake.
Report: the measured numbers with their tolerance, the PRAGMAs pinned per store, the drain/fence proof or the exact site that lacks one, RED/GREEN, counts and typecheck.