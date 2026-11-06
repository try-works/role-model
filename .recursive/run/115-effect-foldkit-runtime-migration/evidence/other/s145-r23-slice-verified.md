# S145 Lead verification of the R23 transaction slice (private)

The worker landed one R23 conversion. I verified it before accepting, and then committed it myself.

## What I checked

| Check | Result |
|---|---|
| `node --test tests/track-b/run115-r23-transaction.test.mjs` | **3/3 pass** (rollback preserves primary; rollback failure cannot mask primary; real `CaptureQueue.endMaintenance` commit failure preserves the token) |
| cited regression `run115-r32-capture-boundary.test.mjs` | **5/5 pass** |
| other capture-boundary tests | **4/4 pass** |
| RED evidence | `s25y-red-transaction-helper.log` shows the test failing at import - the helper did not exist, so RED is genuine |
| diff | `endMaintenance` now calls `withSqlTransaction(this.database, () => { ... })`; the inline BEGIN/COMMIT/ROLLBACK is gone |
| helper | 16 lines: `BEGIN IMMEDIATE`, work, `COMMIT`, and `ROLLBACK` in a catch that rethrows the **primary** error |

## Why the helper is acceptable despite being small

The important property is stated in its own comment and is true of `DatabaseSync`: the work does not yield, so the transaction cannot interleave with another fiber, and a rollback failure cannot replace the error that triggered it. It is the same semantics the inline block had, now shared by the sites still to convert - which is the point of extracting it for R23 rather than rewriting each site differently.

## Scope of the claim

R23's remainder is 13 multi-row `PRAGMA table_info` sites and 21 transaction-owned cleanup sites, enumerated by the worker with file:line. **One** transaction site is converted. R23 stays blocked, and I am recording the enumeration as the work list rather than as progress.

## Committed

Private worktree `447235ba` - only the three slice files plus its evidence, so the slice stays separable from the older WIP (retention manager, closed domains) still uncommitted there. 10 unrelated entries remain dirty by design.