# S365c — real defect readback (LANDED)

Region: index.ts composition report edge (persistence call) + new end-to-end test; route/handler unchanged.

## Wiring
- `createModuleHealthComposition.reportRequestFailure`: after classifying the escape (S365a) and recording it in the writer, it resolves `backendStorageRefOf(options)?.current?.initialization?.databasePath` and persists a failure row via `persistRuntimeTelemetryFailure({ databasePath, requestId: "module-health-<ts>-<seq>", statusCode: 500, errorClass: <cause code> })` (best-effort try/catch). The cause code is the dominant classification: cause.interrupt, cause.die, cause.fail, cause.other.
- `persistRuntimeTelemetryFailure` writes the row into the backend-owned `runtime_telemetry_records` store, which `BackendStorageContract.diagnosticRecords()` (S365b') reads back (failure -> error, code from errorClass).
- Client-caused 4xx escapes return before classification/persistence (S365a preserved end-to-end); no composition without enabled+calibration (default-off unchanged).

## End-to-end test
`test/s374-defect-readback.test.ts`:
- "an injected genuine defect is classified by the edge, lands in the telemetry store and reads back through the authorized path" — composes a REAL backend storage (temp root, scope-s374), binds it to the options ref, reports `Cause.die(new Error("injected runtime defect"))`; asserts `storage.diagnosticRecords()` contains `cause.die` at level `error`, then reads through `composition.source()` -> `handleLocalDiagnosticsRead` (the authorized handler, bearer credential + operator context) and asserts the visible record `cause.die`/`error` and length <= MAX_DIAGNOSTICS_RECORDS.
- "client-caused 4xx escapes are still excluded end-to-end" — 404/422 leave `diagnosticRecords()` empty and the read body record list empty.
- "stays disabled without calibration (default-off unchanged)" — no composition without enabled+calibration.

## Evidence
- RED `s374-red.log`: EXIT_CODE=1 (1/3 failed: the defect did not reach the telemetry store pre-implementation).
- GREEN `s374-green.log`: 7 files / 37 tests; tsc exit 0.
- Hashes: src/index.ts 5EADDBB2..., test/s374-defect-readback.test.ts 0A6043DC....
- Lint: s374 clean (0).
## S377 repair (double-record + lint)

| Hold | Fix | Evidence |
| --- | --- | --- |
| Double-record: source concatenated diagnosticRecords + writer records (one Cause.die -> 2 visible records) | Single-source selection: when the backend-owned store is bound, the persisted telemetry row is the canonical record (identity = the module-health requestId written with it) and the writer entry is not concatenated; without a bound store the writer source remains the fallback | RED s374-red2.log: expected 1 but got 2; GREEN s374-green2.log: 7 files / 37 tests |
| Bare cast at test :76 | Removed the redundant cast (body.records is already typed LocalDiagnosticRecord[]) and added the exact-one assertions | test/s374 lint clean (0) |

Assertions now require EXACTLY ONE visible/stored cause.die per injected defect (toHaveLength(1)), not some/<=MAX.
Hashes: src/index.ts 2FD69C22..., test/s374-defect-readback.test.ts 714B1726....
