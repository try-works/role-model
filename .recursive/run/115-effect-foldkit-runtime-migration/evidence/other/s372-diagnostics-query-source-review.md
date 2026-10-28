# S372 — independent review: S365b' production diagnostics query source

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 6 affected files, tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `839ACB95D04318F2BCB8ECAEABA510B5BB0FA7E5F9F4C32B6741B930C30DBEB6` | 76138 |
| `src/index.ts` | `8A26D4CAA204B5193934A7E8D422D5F6541FF68518EF3870DB12CD95A9DA300C` | 1371393 |
| `test/s369-diagnostics-query-source.test.ts` | `D3E0DE16D192C88493AD498C40441AA524B8FCFF662259367CD764CD8D99908F` | 3826 |

All match. Affected 6 files: **34/34 pass**; tsc exit 0.

## Q1 — Identity/no second construction: PASS

`composeBackendStorage.diagnosticRecords` queries the backend-owned telemetry database (`composition-dag:675-696`). The composition source lazily resolves `backendStorageRefOf(options)?.current` and calls that instance's `diagnosticRecords()` (`index:20591-20597`); no `composeBackendStorage` call occurs in the composition root. The spy test proves one call on the bound store and same ref identity (`s369:19-43`). PASS (test uses a stub store; production call is the same backendRef).

## Q2 — Calibration gate: PASS

`createModuleHealthComposition` returns undefined unless enabled AND calibration approved (`index:20574-20579`); with no composition there is no source closure, so no backend records are read. The disabled/calibration-absent cases are tested (`s369:58-64`). PASS.

## Q3 — Caps: PASS

`MAX_DIAGNOSTICS_RECORDS = 50`; `diagnosticRecords` queries at MAX*4, filters failure/unknown and breaks at MAX (50) (`composition-dag:675-696`), and the merged source sorts newest-first and slices to MAX (`index:20594-20597`). The supplied-record test asserts the read bound (`s369:45-56`). PASS.

## Q4 — Mapping: PASS by inspection

Failure rows map to `level:"error"`, unknown rows to `level:"warn"`; the code uses `row.errorClass` when present and only a generic `telemetry.failure`/`telemetry.unknown` fallback, with no invented classification (`composition-dag:681-690`). A query error returns `[]` via the catch. The current behavioral tests do not exercise a populated real store's failure/unknown mapping (the real-store test is a fresh empty store), but the mapping code is direct and matches the claimed semantics. Note for follow-up, not a code finding.

## Q5 — Run: PASS

Affected 6 files **34/34 pass**; tsc exit 0.

## Q6 — Lint: HOLD for the s369 test

DAG `effect:true` remains the classified **161** (159 moved-boundary `require-safety` + 2 boundary `no-unknown-returns`); the new diagnostic region has no finding. But the s369 test is not clean:
- `no-known-value-widening` at `test:23` (the explicit `{ current: BackendStorageContract | undefined }` object type)
- `no-chained-type-assertions` at `test:25` (`{ diagnosticRecords: records } as unknown as BackendStorageContract`), despite the SAFETY comment.

The task's “s369 test clean” claim is false. Required: use a typed helper/single-step boundary for the fake storage and remove the widening annotation (or add an explicitly reviewed justification; the chained assertion should be fixed).

## VERDICT: HOLD (1 lint repair)

1. **Make the s369 test lint-clean:** remove the line-23 widening and the line-25 chained double assertion (typed helper or one SAFETY boundary), then re-run. Behavior/identity/caps/gate and the 34/34 run are otherwise sound; DAG 161 is unchanged.

No product file was modified; no commit made.

## Final lint repair verification — HOLD (1 remaining finding)

Final test hash F1F20F556BC501106DA73A103512AB689EBDBC55AA91AA2ED9F8E18AA29EB2B5 (4005 B); index/DAG unchanged. 6 files 34/34; tsc exit 0.

- The chained double assertion is gone: storageStub has one SAFETY-commented boundary cast.
- **One lint finding remains:** anti_slop_lint reports no-known-value-widening at test:30 on the explicit annotation const storageRef: { current: BackendStorageContract | undefined } = { current: undefined };. The task's "0 findings" claim is false; this is the same widening rule as before, moved from the fake storage to the storageRef object.
- Required: remove the explicit object annotation (infer it, or annotate only the undefined boundary with a SAFETY cast), then re-run. Behavior/34/34/tsc are green; DAG 161 unchanged.

**FINAL VERDICT: HOLD (1 lint finding at s369 test:30).** No product file was modified; no commit made.

**FINAL VERDICT: PASS** — test hash 66717F6B636133B082E9E035838EEFA66383D1C88D6051FB5E5770F7E6E9B209 (4114 B); anti_slop_lint 0 findings; 6 files 34/34; tsc exit 0; the removed annotation closes the no-known-value-widening finding. No remaining items.

