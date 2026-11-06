# S150 Scheduler slice verified; the toolchain's temp path is D:, not E:

## The slice

`extensions/background-evidence-scheduler/index.mjs` `#persist` - a real transaction (`BEGIN IMMEDIATE` -> job/done/dead upserts -> bounded deletes -> `COMMIT`, rollback with primary rethrow) - now delegates to `withSqlTransaction`. Six other candidates in that file remain hand-rolled by design.

| Check | Result |
|---|---|
| invariant `run115-r23-scheduler-transaction` | **1/1** |
| regression `run96-s3-replay-control` | **57/57** |
| scope of the invariant | extracts only the `#persist` -> `#persistJob` block; I confirmed it starts at the **definition** (`"  #persist() {"`, 1525 chars) and that no call-site false match precedes it |
| RED | demonstrated against `git show HEAD:...` (`s261-red-scheduler-persist.log`) |

The earlier tautology (S148) is what made me probe the extraction instead of reading it: `indexOf("  " + name + "(")` can match an indented **call**, so I checked that this file has none before that offset.

## A real environment finding: `D:\DEV\dsh-temp`

The worker reported an `EBUSY` on knowledge-store SQLite files under **`D:\DEV\dsh-temp`** - not `E:`. That path is this harness's `os.tmpdir()` default; a test process started without `TMP`/`TEMP` set lands there, and two concurrent runs then collide on the same scratch database.

That is not a repository defect, but it is an operating rule for every future run in this repo: **export `TMP`/`TEMP` to `E:` before any test command**, including subagents. Two of this session's "flakes" are explained by exactly this - shared scratch paths under the default temp dir.

## R23 counts after this slice

| Item | Converted | Remainder |
|---|---|---|
| `table_info` sites | 3 | **13** |
| transaction sites | 5 | **~55** (accurate count, S150a: 66 `BEGIN IMMEDIATE` occurrences tree-wide minus helper/tests/scripts; my earlier 54 came from a non-recursive glob) |