# S6a SQLite service: explicit async Effect callers with a compatible sync facade (public, R23)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R23 (B3). Read `/.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md` R23 lines 214-220 first, then the code.

## Current shape
`role-model-router/packages/sql-sqlite-node/src/index.ts` is the wrapper over the vendored SQLite client; consumers reach it through `@role-model-router/sqlite-memory` and `node:sqlite` direct use in the host app. Do not assume; read the actual callers before deciding anything.

## Required behaviour (from R23)
1. Async Effect callers exist explicitly, and a compatible synchronous facade remains for the code paths that cannot be async (SEA startup, migrations, sync test helpers). The facade must be the same connection owner, not a second pool.
2. Fallible partial open: a failure partway through open (including PRAGMA setup) leaves nothing half-initialized and closes what it opened.
3. Busy retry: initial + 2 busy retries at 100ms and 200ms, plus a 5s timeout, matching the requirement rather than an invented schedule.
4. Same-connection SQL transactions: a transaction runs on the connection that opened it, and a primary error is preserved even when rollback and close also fail.
5. Never retry provider or network side effects inside a SQL transaction.
6. Connection/fiber ownership is serialized explicitly (Effect Ref or equivalent) rather than a mutable depth counter shared across yielding fibers. Effect Ref/Tx memory is not SQL.

## Files you may write
- `role-model-router/packages/sql-sqlite-node/src/**`
- one or more tests under that package, or under `role-model-router/packages/sqlite-memory/test/` if that is where the existing harness lives (say which and why)
- `evidence/logs/s6a-*` and `evidence/other/s6a-tdd.json`

Do not touch: other packages' source, the host app, root, lockfile, vendor, private repo. If a caller must change and is outside these paths, stop and report the exact call site instead of editing it.

## Strict TDD
One behavioural RED per contract item above; a missing module is a setup RED and does not count as the behavioural proof. If an item cannot be tested without touching an out-of-scope caller, report that item as blocked with the reason rather than writing a test that proves nothing.

## Rules
- Read the vendored SQLite client and Effect 4.0.6 sources for every API you use and cite file:line in your report.
- No installs, no commits, no subagents, no providers, no operator ports.
Report: contract item by contract item with its test, RED messages, GREEN counts, the existing sqlite suites you re-ran, any item blocked and why, sha256 of changed files.