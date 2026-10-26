# S152 Two more R23 conversions, and the burndown shrank by two

`extensions/knowledge-worker/index.mjs` - two of its three hand-rolled transactions now delegate:

| Site | Shape before | Shape after |
|---|---|---|
| `#recordRecoveryReceipt` | `BEGIN` -> insert + bounded prune -> `COMMIT`, failure **swallowed** | `withSqlTransaction(...)`, failure still swallowed by the outer catch (unchanged: a receipt write must never mask the mutation error it records) |
| `#persistCandidateSet` | `BEGIN` -> delete all + N inserts + fence upsert -> `COMMIT`, catch -> `ROLLBACK` -> recovery receipt -> rethrow | `withSqlTransaction(...)` returns the candidate list; catch keeps the recovery receipt and rethrows; the helper owns rollback |

The third site (`:2011`, a single-line FTS rebuild transaction) is deliberately untouched this round - it is one dense line and deserves its own careful pass.

## Verification

- all `*knowledge*` tests: **18/18**;
- inventory after removing the two converted entries: **51 sites**, both inventory tests pass.

## A harness mistake worth recording

My first knowledge-worker run reported a failing test named `\`. Cause: I passed `@files` where the array contained an empty string, and `node --test ""` treats the empty argument as a **filter matching nothing**, which reports one failing "test". The code was fine; my invocation was not.

Same family as the BOM and the non-recursive glob: a measurement that fails for reasons unrelated to the thing measured. Running the file explicitly gave 4/4 immediately.

## R23 burndown

| Round | Converted | Inventory |
|---|---|---|
| 125 | 4 | 21 booked (undercounted) |
| 127 | 5 | 53 (accurate) |
| 129 | **7** | **51** |

The list only shrinks, and any new hand-rolled transaction fails the suite until it is converted or explicitly justified.