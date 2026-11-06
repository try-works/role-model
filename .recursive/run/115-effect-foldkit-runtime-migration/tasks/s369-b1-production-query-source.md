# S365b — B1 production query source: STOP-CHARACTERIZATION (S21d)

Read-only stop-characterization; **no product edits** (the slice cannot honestly wire a real query source without a bigger split). Worktree public HEAD `e8cd28ff`.

## Contract clause status

| # | Clause | Status | Why |
| --- | --- | --- | --- |
| 1 | Production query source wired at the composition root from a real store | **BLOCKED / NOT WIRED** | The composition root only receives `Pick<StartBridgeServerOptions, "diagnostics">` (`index.ts:20573-20575`); the diagnostics option has no record/query hook. The backend-owned storage is reachable only through the storage ref (`cli.ts:4353,4487` binds it; `index.ts:21205-21213` reads it in the backend), and the composition root never resolves that ref. |
| 2 | Route stays disabled until calibrated (S365a gate) | **SATISFIED (unchanged)** | Gate `config?.enabled !== true || config.calibration?.approved !== true` (`index.ts:20578`); s10b default-off tests still pass. |
| 3 | Read contract caps/staleness/states apply unchanged | **SATISFIED (byte-for-behavior untouched)** | No edits to `local-diagnostics-read.ts`; caps/staleness/states remain `:26-30`, `:65`; route `index.ts:17548-17568` untouched. |
| 4 | Identity: source is the SAME store the backend owns (no second store) | **NOT SATISFIABLE through an existing API** | `BackendStorageContract` = `{ id, initialization, graphStore, observationStorage, openRetentionCleanupDatabase, close }` (`composition-dag.ts`, contract region) exposes **no diagnostic-record query**. `ObservationStorageContract` exposes only `persist/read/readHydrated/cached/queueDepth/hydrationError/drain` (`composition-dag.ts:520-529`) — no enumeration. |
| 5 | Default-off unchanged; DEFERRED WIRE either replaced or honestly noted | **SATISFIED as honest note** | `local-diagnostics-read.ts:20-23` still states the truthful deferred wire; no fake source was wired. |

## Why a bigger split is required (not an approximation)

1. **No backend-owned query surface.** The Backend storage (`composeBackendStorage`, S341) owns the SQLite initialization/databasePath and the observation storage, but neither the graph store nor the observation store yields records. Supplying diagnostics records needs a new bounded query method on the storage contract.
2. **Opening the DB from the composition root would be a second store/read path.** `storageRef.current.initialization.databasePath` could be read lazily, but constructing a separate SQLite read (e.g. via `listRuntimeTelemetryRecords`, already imported at `index.ts:108`) would violate clause 4 (identity/no second store) and duplicate lifecycle/ownership.
3. **Scope.** Changing `BackendStorageContract` and its factory lives in `composition-dag.ts` (Backend storage factory split region), outside this slice's authorized scope (`local-diagnostics-read.ts` + composition root `index.ts:20526-20625` + tests). S21d says characterize rather than fake.
4. Observed documentation drift (not fixed here): the composition doc at `index.ts:20622-20625` still describes the pre-S365a gate ("enabled not literally true", coarse error/client-caused escapes). It should be corrected in the follow-on slice, not silently in a characterization.

## Named follow-on slice: S365b' — BackendStorage diagnostic-records query

Bounded, test-first scope:
- Add to `BackendStorageContract` a bounded `diagnosticRecords(): readonly LocalDiagnosticRecord[]` (cap ≤ `MAX_DIAGNOSTICS_RECORDS`), implemented in `composeBackendStorage` over the **backend-owned** telemetry store (same `initialization.databasePath`; no second connection/store ownership).
- In the composition root (`createModuleHealthComposition`), when enabled+calibrated, resolve the backend storage lazily via `backendStorageRefOf(options)?.current` and build the source from `backendStorage.diagnosticRecords()` (plus the writer's in-process records); keep the read contract's caps/staleness/states as the only formatting authority.
- Identity test: the source resolves the **same** `BackendStorageContract` instance the backend composed (`storageRef.current`), and its `diagnosticRecords` call count increments on read (no second construction); default-off and calibration gate tests stay green.
- Fix the stale composition doc (`index.ts:20622-20625`) while touching the region.

Caller/region table for S365b':

| Region | Role | Cite |
| --- | --- | --- |
| Backend storage contract/factory | add bounded diagnostic-records query | `composition-dag.ts` `BackendStorageContract` + `composeBackendStorage` |
| Storage ref binding | identity handoff (already exists) | `cli.ts:4353,4487`; `composition-dag.ts` `backendStorageRefOf` |
| Composition root | lazily resolve storage, build source under the gate | `index.ts:20573-20625` |
| Read contract | caps/staleness/states, unchanged | `local-diagnostics-read.ts:26-65` |
| Route | unchanged | `index.ts:17548-17568` |
| Tests | identity + caps + default-off + calibration | new host test beside `test/run115-s10b-module-health-wiring.test.ts` |

## State

No product edits, no RED/GREEN for a stop-characterization; strict RED resumes with S365b'. No commit. HEAD `e8cd28ff`.
## S365b' LANDED (authorized follow-on)

- BackendStorageContract now exposes `diagnosticRecords: () => readonly LocalDiagnosticRecord[]`, implemented in `composeBackendStorage` over the backend-owned telemetry store (`listRuntimeTelemetryRecords({ databasePath: initialization.databasePath, limit: MAX_DIAGNOSTICS_RECORDS * 4 })`): failure -> error, unknown -> warn, code from `errorClass` (fallbacks `telemetry.failure`/`telemetry.unknown`), capped at 50, [] on query error.
- Composition root: when enabled AND calibrated, `createModuleHealthComposition` resolves `backendStorageRefOf(options)?.current` lazily and merges `diagnosticRecords()` with the writer's records, sorted newest-first and sliced to the read-contract bound; the read contract remains the only formatting/caps authority.
- The stale composition doc (index.ts:20622-20625 plus the recorded R20 gap wording) now describes the calibrated gate, the S365a classification/4xx exclusion, and the S365b' source.
- Tests (test/s369-diagnostics-query-source.test.ts): identity ("resolves the SAME backend storage instance and reads its bounded records (identity, no second construction)"), cap test, disabled/calibration test, and a real-store test (`composeBackendStorage` fresh DB -> bounded empty records).
- RED s369-red.log EXIT_CODE=1 (2/4 failed pre-implementation); GREEN s369-green.log 6 files / 34 tests; tsc exit 0. Hashes: composition-dag 839ACB95..., index 8A26D4CA..., s369 test D3E0DE16.... Lint: DAG clean (0 findings on this run), s369 test clean.
## S372 lint repair (final)

- The double cast in test/s369 was replaced with a typed `storageStub()` helper: a single SAFETY-commented test-boundary cast to BackendStorageContract (only diagnosticRecords is read by the composition root).
- Lint: s369 CLEAN (0 findings; previous no-known-value-widening :23 and no-chained-type-assertions :25 gone). GREEN s369-green2.log: 6 files / 34 tests; tsc exit 0. Hash: s369 test F1F20F55....
- The non-mapping test note (records mapping over a real failure row) remains the named follow-up; no behavior changes in this repair.
## S372 residual lint repair (final)

- Removed the explicit `storageRef` object annotation; it now infers with only the undefined case asserted once (`undefined as BackendStorageContract | undefined`) under a SAFETY comment. no-known-value-widening :30 is gone.
- Lint: s369 CLEAN (0 findings). GREEN s369-green2.log: 6 files / 34 tests; tsc exit 0. Hash: s369 test 66717F6B....
