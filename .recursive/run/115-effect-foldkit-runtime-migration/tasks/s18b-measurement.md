# S18b make the R24 measurement mean something (public)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review proved the measurement can pass without measuring: a 25 ms busy-wait returning [] satisfies both the floor and the timer ordering, and a no-op transactionSync passes the second test. Fix the measurement so it cannot pass on a fake.

## Required fixes
1. ASSERT THE WORK, not just the duration: the blocking test must prove the statement actually ran (for example an 800001-row recursive CTE result count or an inserted row), and the transaction test must prove its effect (the row exists / count is 0 after rollback). A no-op must fail.
2. REMOVE the absolute 20 ms floor as the only hard guard. Compare against a measured non-blocking baseline in the same process (for example a timer that fires promptly while no statement runs), so the assertion is relative and does not false-fail on a fast machine or false-pass on a loaded one. State the tolerance formula.
3. PRAGMA TRUTH for sqlite-memory: reading a fresh connection reports per-connection defaults, not what the initializer set. Either read the initializer's OWN connection, or split the claim honestly into file-level settings (WAL, auto_vacuum) that survive on a new connection and connection-level settings that do not. The mutation 'initializer sets synchronous=OFF/foreign_keys=OFF on its own connection' must fail.
4. NO-SUBSTITUTE must be behavioural: a transaction that never runs its callback, or buffers in a Ref and never issues SQL, must fail a test - not only trip a string check. Keep any static check as a secondary guard and say it is secondary.

## Files you may write
- the SQLite characterization tests under `role-model-router/packages/sql-sqlite-node/test/` and `role-model-router/packages/sqlite-memory/test/`
- measurement helpers inside those packages
- `evidence/logs/s18b-*` and `evidence/other/s18b-tdd.json`

No product behaviour changes. No installs, no commits, no subagents.

## Rules
Apply each of the reviewer's failing inputs as a mutation, show the RED, restore. Report the strengthened assertions, the tolerance formula, the PRAGMA split, the behavioural no-substitute test, and per-mutation RED/GREEN.