# S169 The independent review found my burndown claim was false. It was.

The reviewer (s9b-reviewer, see `s168-independent-review.md`) returned four FAIL/caveat verdicts. Two were immediately actionable and one invalidated a number I had been reporting for several rounds.

## Claim: "40 hand-rolled transactions + 1 reasoned table_info site, enforced by tests"

**Not true.** The transaction test matched only `exec("BEGIN IMMEDIATE")` and scanned only `extensions/` and `shared/`, so it could not see:

- `extensions/knowledge-store/index.mjs` plain-`BEGIN` **read snapshot** (a real transaction),
- three transactions in `scripts/track-b/runtime-operations-server.mjs` (product code),
- one in `scripts/track-b/run98-a55-cost-backfill.mjs`,
- two `PRAGMA table_info` probes in the operations server (schema inventory scanned the same two directories).

## The finding that mattered most: two transaction kinds

The helper hardcoded `BEGIN IMMEDIATE`. Converting the knowledge-store read snapshot to it would have turned a **reader into a writer** and changed contention behaviour, which is presumably why the codemod skipped it - silently, because the inventory could not see it.

`shared/sql/transaction.mjs` now has two explicit kinds:

| Helper | Opens with | For |
|---|---|---|
| `withSqlTransaction` | `BEGIN IMMEDIATE` | read-then-write, needs the write lock up front |
| `withSqlReadTransaction` | `BEGIN` (deferred) | consistent read snapshot, must not take the write lock |

Both roll back and rethrow, and a failing rollback never replaces the primary failure. Pinned by `run115-r23-transaction-modes.test.mjs` (4 tests) including a fake database that records the `exec` sequence and one whose ROLLBACK throws.

## Converted

`knowledge-store` route-ladder paging now uses `withSqlReadTransaction`. Evidence: **112/112** route-ladder/pagination tests pass (16 files, including `run105-review-store-pagination.test.mjs`), and the module constructs (`run115-r23-schema-set-contract.test.mjs` 2/2).

## Corrected numbers, enforced for real

| Burndown | Before (claimed) | Now (true) |
|---|---|---|
| hand-rolled transactions | 40 | **44** |
| inline `table_info` | 1 | **4** |

Every entry now carries a **reason**, and both scans include `scripts/track-b` product code while excluding test files and the codemod's own documentation string:

- transactions: 44 (knowledge-store 5 incl. the conditional caller-owned one, operations server 3, backfill script 1, plus the previously honest remainder);
- schema: 4 (evaluation-core 1 needing full PRAGMA rows, operations server 2, storage audit 1 read-only probe).

## My own errors while doing this

1. A whole-file string replace hit the **wrong transaction** in knowledge-store (the tail pattern occurs twice), deleting a write path's COMMIT/catch and leaving a `try` with no `catch` - caught by `node --check` only after the edit had already corrupted the file. Redone with an index-scoped replacement anchored on the unique plain `BEGIN`.
2. My import inserter placed the import **inside a multi-line import statement** (`import {` ... `}`), giving `SyntaxError: Unexpected reserved word` at line 16. Fourth silent import failure this session; repaired and verified by importing the module, not by reading the diff.

## Still outstanding from the review

- `verify-client-journeys` still forces `--scope-id` and its health-failure `process.exit` bypasses the kill/wait path;
- `compare-release` can still report a misleading `same` (same port both sides, `text/html` bodies, `IDENTITY` stripping `endpoint`/`path`, URL/exe cross-channel bypass, stale fixed state dir, right-child leak when the left is not ready);
- the R32 operations-server wiring has no test that would fail if it were reverted;
- `withSqlTransaction` swallowing a rollback failure is now pinned as intended for the refusal paths, but the reviewer is right that the old code propagated it - that is a deliberate behaviour change and belongs in the addendum, not only in a test name.