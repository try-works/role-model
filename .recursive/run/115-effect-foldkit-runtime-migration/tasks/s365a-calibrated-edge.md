# S365a — calibrated module-health edge (LANDED)

Region: index.ts composition (`createModuleHealthComposition`, report wrapper), diagnostics option surface, listener edge; tests s366 + s10b.

## Landed contract
1. CAUSE CLASSIFICATION: `reportRequestFailure` now calls `writer.recordCause(moduleHealthCauseForEscape(error))`: a real Cause is preserved (Fail/Die/Interrupt), a plain error is wrapped as `Cause.fail`. The coarse `recordError("error")` path is no longer used at the edge. New helpers: `isClientCausedModuleHealthEscape`, `moduleHealthCauseForEscape`.
2. 4xx EXCLUSION: a client-caused 4xx escape (numeric `statusCode` 400–499) is dropped before classification, so it cannot increment module-failure counts; a genuine failure still records `cause.fail`.
3. CALIBRATION GATE: `diagnostics.enabled === true` alone is no longer sufficient — a `diagnostics.calibration.approved === true` approval must accompany it, otherwise the composition is undefined (default-off unchanged; no silent default-on).
4. ONE REPORT OWNER: the listener still reports exactly once per rejected handler (s366 listener test: one record per rejected request; s10c unchanged).

## Evidence
- RED `s366-red.log`: EXIT_CODE=1, 3/4 failed pre-implementation (calibration gate, cause codes, 4xx exclusion).
- GREEN `s366-green.log`: 4 files / 24 tests passed (s366 4 + s10b 2 + s10c 5 + module-health-writer 13); tsc exit 0.
- Tests: "requires enabled AND calibration approval (no silent default-on)"; "records Fail/Die/Interrupt as cause classifications, not the coarse error code"; "excludes client-caused 4xx escapes from module-failure counts while a genuine failure counts"; "reports each rejected handler exactly once at the listener edge".
- Hashes: index B527BD0A..., s366 test FCB1F71A..., s10b F2B9BF37....
- Lint: s366 clean (0), s10b clean (0).
## S367 lint repair (final)

- s366: `Record<string, unknown>` replaced with a named `DiagnosticsProbe` type (no-unsafe-dictionary removed); the second listener call now has its own adjacent SAFETY comment (both require-safety findings resolved).
- s10b: recordCodes body typed `{ readonly records?: unknown }` and records read via one SAFETY-commented typed cast with `code === undefined` narrowing — removes no-unsafe-dictionary, both no-runtime-typeof findings and the require-safety cast.
- Final lint: both files CLEAN (0 findings). GREEN: 4 files / 24 tests (s366 4 + s10b 2 + s10c 5 + module-health-writer 13); tsc exit 0 (s366-green2.log).
- Hashes: index B527BD0A..., s366 AB8E1553..., s10b 59FB73D6....
