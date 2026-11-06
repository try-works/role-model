# S146 Two more R23 slices, and two pre-existing failures I did not cause

## My slice: one additive-schema owner

`shared/sql/schema.mjs` now owns "what columns does this table have" (`tableColumns(database, table)`), because 13 sites built that set inline and none of them guarded the identifier interpolation.

- **validated identifier** (`/^[A-Za-z_][A-Za-z0-9_]*$/`) - `PRAGMA` cannot take a bound parameter for the table name, so the guard is the only protection against injection into pragma text;
- converted `shared/capture/durable-queue.mjs:71`, the first of the 13.

TDD: RED first (`ERR_MODULE_NOT_FOUND` for the helper, log `s146-red-schema-helper.log`), then 4/4 green: real columns, ADD COLUMN visibility, five refused identifiers with the database intact afterwards, and an empty set for a missing table.

## Worker slice (verified by me): queue-admin

`inTransaction` was already transactional manually, but in the `commit:false` path a **failing ROLLBACK threw the rollback error and masked the refused action's value**. The conversion uses the shared helper and carries the refusal through a private `RefusedAction` sentinel, which the helper rolls back; the outer catch turns it back into the value.

| Check | Result |
|---|---|
| `run115-r23-queue-admin` | **3/3** (rollback failure no longer masks the value; refusal leaves zero rows; primary error preserved with zero rows) |
| cited regression `run101-r9-queue-admin` | **10/10** |
| diff shape | manual BEGIN/COMMIT/ROLLBACK replaced by `withSqlTransaction`; sentinel added; no other semantics touched |

## Two failures I did not cause - and how I proved it

`tests/track-b/run96-runtime-graph-capture.test.mjs` reports **2 failures out of 20** (`handles interruption after trace-root commit`, `handles interruption before queue acknowledgement`).

- with my schema conversion applied: 18/20;
- with `durable-queue.mjs` checked out from **before** the R23 slice: 18/20 - identical.

So these pre-date both slices. My first attempt at that comparison was invalid: writing the file back through PowerShell added a BOM and made *every* capture test fail at module load, which I recognised and redid with `git checkout <rev> -- file`. Worth recording, because a bad baseline comparison is how a real regression gets attributed to the wrong change.

## R23 status

Remainder after these slices: **12 of 13** `table_info` sites and **19 of 21** transaction-owned cleanup sites. R23 stays blocked; the enumeration is the work list.