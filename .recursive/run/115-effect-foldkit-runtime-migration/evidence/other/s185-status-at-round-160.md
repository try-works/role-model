# Run 115 status at round 160 - what is proven, what is not

This is the consolidated picture. Every line below is either a measurement recorded in this directory or explicitly marked as unproven.

## Requirement ledger (39 rows)

| Disposition | Count | Rows |
|---|---|---|
| verified | **5** | R4, R6, R19, R25, R26 |
| implemented | **2** | R22, R33 |
| blocked | **32** | each with a named precondition in the ledger |

Nothing else moved into `verified` this run, and the 32 blocked rows are not idle work - they need artefacts this environment cannot supply: a real Run 88 stage identity, live provider credentials, a private trace-root route, or CI dispatch.

## Backend (private tree)

| Area | State |
|---|---|
| transaction ownership (R23) | **44** hand-rolled sites, each reason-bearing; `withSqlTransaction` (write) and `withSqlReadTransaction` (deferred read) split after an independent review found the distinction; inventory test fails on any unlisted site |
| schema discovery | **4** inline `PRAGMA table_info` sites, reason-bearing; `tableColumns` (Set) and `tableColumnList` (array) are separate contracts after a Set/array misuse crashed knowledge-store |
| R32 retention | manager factory wired into the operations service, guarded by a source test proven red-on-revert |
| private suite | 2,882 / 2,926 at the last full run; the 38 failures are environmental (python/uv bridge, unbuilt distribution) or concurrency-sensitive - **not individually proven**, and two of them were once my stale inventory |

## Client (public tree)

| Area | State |
|---|---|
| Foldkit shell | 25 routes, all render content; old React app still in tree (D-U1 cutover not complete) |
| rendered checks | 5 classes now automated: invisible control, mislabelled control, contrast, overflow, focus visibility |
| rendered audit | `scripts/runtime/audit-rendered-ui.mjs` over CDP, **no new dependency**; 20 routes x 2 widths x focus = 0 failures |
| gate | `verify-packaged-candidate.mjs --rendered` (skip is typed, `--require-rendered` is strict) |
| CI | advisory step gated by `vars.R39_VERIFY_BLOCKING` |
| UI invariants | 9 tests across s175/s177/s178/s181/s182, all proven red-on-revert |
| host suite | 2,677 / 2,683 at round 142; one classified pre-existing failure |

## Release parity

| Claim | Evidence | Date |
|---|---|---|
| D vs C, 9 surfaces | `{"same":7,"environment-state":2}`, **0 different** | this run |
| packaged candidate gate | 10 checks PASS at `0.0.20-163-g6ed7ece9` (sha `e3181d50`) | this run |
| cross-origin write gate | foreign `Origin` PATCH -> 403 no ACAO; no-Origin -> 200; foreign GET -> 200 ACAO `*` | this run |
| R leg | **not re-measured** with a dev candidate - a cross-channel comparison measures the channel, and the tool now refuses it | dated |

## What I found about my own process

Five UI defects were invisible to the suite and found by looking; one of them I created while fixing another. Three codegen failures came from generating code with string literals instead of encoding data. Two verification claims were written before the verification (one burndown count, one revert test). Every one of these was caught by **running** something, never by reading a diff.

## What would move the needle next

1. A green dispatch run of the three advisory CI steps, then `vars.R39_VERIFY_BLOCKING=true`.
2. A production-channel candidate, which would make the R leg re-measurable.
3. Owner decisions on the two UI scope questions (IA grouping; Overview visualisations) and on R16 config seeding.