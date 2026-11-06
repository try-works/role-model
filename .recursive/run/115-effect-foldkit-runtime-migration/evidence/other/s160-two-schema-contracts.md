# S160 Two schema contracts, three modules converted, and a burndown for the rest

## The API split that S159 demanded

`shared/sql/schema.mjs` now exports two explicit contracts:

| Helper | Returns | For call sites that |
|---|---|---|
| `tableColumns(db, table)` | `Set` | use `.has()` / `.size` |
| `tableColumnList(db, table)` | `string[]` | use `.includes()` / `.map()` |

The previous single Set contract was textually compatible with `.map(...)`-derived arrays and semantically wrong, which is how knowledge-store came to call `.includes` on a Set (S159). Three tests pin both contracts, the identifier guard, and the agreement between them.

## Converted this round (each: syntax -> construct probe -> module tests)

| Module | Sites | Contract | Evidence |
|---|---|---|---|
| `artifact-store` | 2 (`graph_edges`, `graph_occurrences`) | list (`.includes`) | artifact suites **24/24** |
| `background-evidence-scheduler` | 2 (`scheduler_jobs`, `scheduler_dead`) | set (`.has`) | replay-control **57/57** |
| `crowdsourced-learning` | 1 (`contribution_outbox`) | set (`.has`) | b08 + ack-replay + publication floors **11/11** |

Construct probes: `CaptureQueue`, `EventLog`, `EvidenceScheduler` all construct in-memory after their conversions.

## Two of my own scripting slips, both caught by running it

1. My import-inserter checked `s.includes("tableColumnList")` **after** inserting usages, so it concluded the import was already there and skipped it. `artifact-store` then referenced an undefined symbol and three tests **timed out at ~34 s** each instead of failing fast. Adding the import fixed it (5/5, then 24/24).
2. `$s` (a one-element array) still produced an empty argument to `node --test`, which reports a failing test named `\` - the same trap as S152. Not a code signal.

## New: a schema-discovery burndown

`r23-schema-inventory.json` + its test enforce the same invariant as the transaction inventory: **no inline `PRAGMA table_info`** outside the helper, no unallowlisted site, no stale entry. Remaining: **7** (evaluation-core 6, knowledge-worker 1).

## R23 state

| Burndown | Remaining |
|---|---|
| hand-rolled transactions | 40 |
| inline `table_info` | 7 |

Both are enforced lists now, and both only shrink.