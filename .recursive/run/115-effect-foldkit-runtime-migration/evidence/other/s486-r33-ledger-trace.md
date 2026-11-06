# S486 — R33/B10 operation-ledger trace (READ-ONLY)

Date: 2026-10-29. No source edits, no commit. I wrote only this file.

## Inputs and exact locations

- Requirement: `.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md:294-301` (`R33` Backend completion B10).
- Ledger source: `.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s344-b10-ledger.json` (private worktree), `schemaVersion role-model.private-operation-ledger.v1`, 15 `entries` at line 11, 4 `pending` groups at line 494, 3 `notYetEnumerated` groups at line 647.
- Checker: `scripts/track-b/ledger-check.mjs:26-90`; it validates entry citation/disposition/callers and pending caller symbols, but does **not** require operations to be dispositioned and does not reject non-empty `pending`/`notYetEnumerated`.
- Checker tests: `tests/track-b/run115-b10-ledger-check.test.mjs:14-18` assert the current ledger passes, so the current suite certifies a ledger that still carries 34 pending operations.

## Current shape (measured)

- 15 surface entries: 7 `converted` (sidecar-factory-evaluation/operator/replay/retention, storage-audit-runner, evaluation-handoff, replay-runner) and 8 `retained-compatible-adapter` (eventlog-service, artifactstore-service, capture-queue-factory/service, operator-surface, knowledge-store-package, crowdsourced-learning-package, replay-core-package).
- 34 pending operations in four groups:
  - `eventlog-methods` (`.json:496`, 9): `append`, `read`, `readByLocator`, `provenance`, `verify`, `retain`, `rollbackRetention`, `health`, `close`.
  - `artifactstore-methods` (`.json:533`, 12): `put`, `putTyped`, `get`, `resolve`, `link`, `recordOccurrence`, `traceRoot`, `snapshotClosure`, `transaction`, `lease`, `health`, `close`.
  - `capture-queue-methods` (`.json:578`, 9): `enqueue`, `peek`, `flush`, `beginMaintenance`, `endMaintenance`, `drain`, `receipts`, `health`, `close`.
  - `replay-internals` (`.json:630`, 4): `processJob`, `recordFailure`, `run`, `activeRun`.
- 3 `notYetEnumerated` groups (`.json:647-651`): shared queues/capture modules outside the three S0 surfaces; sidecar factory internal methods and replay composition internals; replay runner/handoff internals. These have **no operation list at all**, so they cannot be dispositioned as-is.

## Missing R33 field groups

R33 requires: repo/path/export/owner/caller; service/Layer/scope/error-wire/cancel/transaction/lease/fence; B/M/task/R IDs; RED/GREEN/refactor/CI coverage; source/build/reviewer/rollback; and a per-operation disposition.

| Required group | Ledger presence | Exact gap |
|---|---|---|
| repo | none | All `surface` paths are repo-relative with no public/private repo identity. |
| path | partial | `surface` exists, but no separate canonical path field and no path for operations. |
| export | partial | `definition.symbol` exists for 15 surface entries; no export name per operation and no export field distinct from definition symbol. |
| owner | none | No owner field on any entry, pending group or operation. |
| caller | partial | Exactly one caller per surface entry; 17 of 34 pending operations have **no caller at all** (see below). No caller ref per operation. |
| service/Layer/scope | partial | `identity.layer/scope` exist but are `null` on 8 entries; converted entries carry `conversion.service/layer/open`, but retained entries carry no service identity. |
| error-wire | partial | `identity.error` is a prose description, not a wired error channel/contract citation. |
| cancel | partial | `identity.cancel` is prose and `null` on eventlog/artifactstore/operator-surface; no per-operation cancellation contract. |
| transaction | partial | `identity.transaction` exists but is `null` on 8 entries and not recorded per operation. |
| lease | absent | No entry or operation has a lease field. |
| fence | absent | No entry or operation has a fence/epoch guard field. |
| B/M/task/R IDs | absent | No B/M/task/R traceability fields; only the top-level `requirement: "R33/B10"`. |
| RED/GREEN/refactor/CI coverage | absent | No per-operation RED/GREEN/refactor logs or CI coverage. `conversion.review` is prose for 7 entries only and is not this group. |
| source/build | absent | No source or build receipt fields. |
| reviewer | partial/prose | Only `conversion.review` prose on 7 converted entries; no reviewer identity/sign-off for any operation. |
| rollback | absent | No rollback/restore field or procedure. |
| per-operation disposition | **absent** | Entries are surface-level. 34 pending operations and 3 unenumerated groups have no disposition; R33 forbids blanket monolith retention. |

### Operations with no caller in the ledger

- `eventlog-methods`: `read`, `readByLocator`, `provenance`, `rollbackRetention`, `health`.
- `artifactstore-methods`: `put`, `resolve`, `recordOccurrence`, `traceRoot`, `snapshotClosure`, `transaction`, `lease`.
- `capture-queue-methods`: `peek`, `receipts`.
- `replay-internals`: `processJob`, `recordFailure`, `run`.

All remaining operation callers are single examples, not proof every caller migrated; the R33 requirement is per-operation caller refs.

## Bounded repair shape (no implementation)

1. **Schema v2, per-operation rows.** Keep the 15 surface entries as rollups, but add `operations[]` for every exported/used method. Each row carries: `repo`, `path`, `export`, `owner`; `callers[]` with `file:line`, operation, product/test/QA kind; `runtime` `{service, layer, scope, errorWire, cancel, transaction, lease, fence}`; `traceability` `{B, M, tasks[], R[]}`; `evidence` `{RED, GREEN, refactor, CI}`; `release` `{source, build, reviewer, rollback}`; `disposition` from the existing five-value vocabulary.
2. **Retire `pending`/`notYetEnumerated` by enumeration.** Expand the 3 unenumerated groups into concrete operations first; each receives a disposition or an owner-cited `approved-N-A` with rationale. The final ledger must have empty `pending` and `notYetEnumerated` (or neither key) and no surface-level-only disposition.
3. **Checker/tests must fail closed.** Extend `ledger-check.mjs` to require the fields above, reject any operation without a disposition, and reject non-empty `pending`/`notYetEnumerated`. Add negative tests for each missing group. The current `run115-b10-ledger-check.test.mjs:14-18` “ledger passes” assertion must move to the completed v2 fixture; keep the old fixture as a known-incomplete negative.
4. **Evidence truthfulness.** RED/GREEN/CI must point at actual run artifacts, not prose; reviewer must be an independent identity; rollback must name the restore path. Planned/implemented remains non-verified until this exists.
5. **Scope.** Ledger JSON + checker + checker tests only. Do not mark R33/B10 complete, do not change product code, and do not replace per-operation rows with another surface rollup.

## Limitations

- Read-only JSON/source trace; I did not execute the packaged or private runtime, and I did not body-verify every extension method.
- The 34 count is exactly the operations arrays; the 3 notYet groups are unenumerated and therefore understate the eventual row count.
- No whole R33/R32/R24 claim; this document only enumerates the ledger gap and a bounded repair shape.

