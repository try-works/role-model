# Package A (run 105) - RED/GREEN evidence notes

Suites and their RED->GREEN, in the order they were produced.

## a1 (run105-a1-weighted-verdict) - weighted verdict
RED: the module did not exist yet (`extensions/knowledge-worker/ladder-aggregation.mjs`),
so the suite failed to import. Captured in `run105-a1-weighted-verdict.red.txt`.
GREEN: 9/9 pass - `run105-a1-weighted-verdict.green.txt`.

## a2 (run105-a2-total-order) - lexicographic total order
RED: same module-not-found. `run105-a2-total-order.red.txt`.
GREEN: 6/6 pass - `run105-a2-total-order.green.txt`.

## a3 (run105-a3-created-at) - comparison-group created_at_ms
TWO-STAGE RED, recorded honestly:
1. First RED (eager contract): the column did not exist at all - the suite failed with
   `no such column: created_at_ms` on both INSERT paths and `createdAtMs === undefined`
   on the listing. That output was superseded on disk by stage 2 below.
2. Final RED (lazy contract): a legacy-shaped store must KEEP its 4-column legacy shape on
   open; only a write adds the column. That assertion failed against the eager
   ALTER-at-open implementation (`legacy shape must be preserved on open`, true !== false).
   Captured in `run105-a3-created-at.red.txt`.
GREEN: 4/4 pass - `run105-a3-created-at.green.txt`.

WHY LAZY (regression the eager form caused, found by running the focused suites):
- `tests/track-b/run107-group-paging.test.mjs` seeds `evaluation_comparison_groups` with
  positional 4-value INSERTs. Measured: with the column present, SQLite raises
  `table evaluation_comparison_groups has 5 columns but 4 values were supplied` (a column
  DEFAULT does not rescue a positional INSERT).
- Measured with the true baseline file (`HEAD~1` evaluation-core): run107 passes 4/4; with
  the eager ALTER-at-open it fails 0/4. The plan pins run107 green UNMODIFIED, and run107 is
  not a package-A file, so the implementation - not the fixture - had to change.
- The column is therefore ensured LAZILY by the PRAGMA-guarded `#ensureComparisonGroupCreatedAt`
  at the two write sites, and the listing builds its SELECT from the columns that exist
  (`createdAtMs` stays null for a store without the column).
Re-verified after the rework: run107 4/4 GREEN, a3 4/4 GREEN.

## a4 (run105-a4-scope-join) - D4 scope join and fail-closed projection
RED: module-not-found. `run105-a4-scope-join.red.txt`.
GREEN: 10/10 pass - `run105-a4-scope-join.green.txt`.

## a5 (run105-a5-admission-floor) - R9 admission floor
RED: module-not-found. `run105-a5-admission-floor.red.txt`.
GREEN: 8/8 pass - `run105-a5-admission-floor.green.txt`.

## Focused non-regression suites (run after the final implementation)
run107-group-paging 4/4, run104-r9-effort-exclusion 5/5, run104-r8-finalization-boundary 3/3,
run98-a34-comparable-readback 3/3, run98-a30-judge-provenance 7/7, run99-learning-visuals 8/8,
run97-learning-summary 2/2. All exit 0.

## Pre-existing failures observed (NOT caused by this package)
- `run101-a48-learning-evidence-readback` fails 1/8 with `frame exceeds inline limit` on the
  TRUE baseline file as well (measured against `HEAD~1` evaluation-core), so it is pre-existing.

## Environment note
- `shared/effect`, `shared/effect-mq` and `shared/sql-sqlite-node` ship no `dist/` in a fresh
  worktree (gitignored). Their builders were run once (`node shared/<pkg>/build.mjs`) to make
  `import "effect"` resolvable; these are build artifacts, not source changes.

