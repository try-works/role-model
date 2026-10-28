# S377 — independent review: S365c real defect readback (B1 gap 3)

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 7 affected files, tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `5EADDBB2727610D20C8FD46549C0DB5CCE8174CD35993511F17174AE973FEDFF` | 1372439 |
| `test/s374-defect-readback.test.ts` | `0A6043DCC0EECD3B7250D64557C2709A13C0B6CA5457D06F512346DE3C8C8F10` | 4509 |
| `src/composition-dag.ts` | `839ACB95…` | 76138 (untouched) |

All match. Affected 7 files: **37/37 pass**; tsc exit 0.

## Q1 — Best-effort persistence: PASS (static)

`reportRequestFailure` first records the cause in the writer, then resolves the bound storage databasePath, then wraps only the `persistRuntimeTelemetryFailure` call in try/catch (`index:20599-20616`). A store failure cannot escape the edge or change the request outcome; the writer already holds the classification. (There is no test that injects a store failure, but the path is direct.)

## Q2 — Identity: PASS

The persist databasePath comes from `backendStorageRefOf(options)?.current?.initialization?.databasePath` (`index:20603`), i.e. the same bound BackendStorage instance used by `diagnosticRecords()`; no second connection/store construction. The test binds a real composeBackendStorage and reads it back (`s374:40-71`). PASS.

## Q3 — No double-record: HOLD

The edge records the same failure **twice**: `writer.recordCause(cause)` adds the in-memory writer record, and `persistRuntimeTelemetryFailure` adds a telemetry row. `source()` then concatenates `storage.diagnosticRecords()` with `writer.source().records()` and slices, with no dedupe (`index:20617-20623`). One injected `Cause.die` therefore produces two visible diagnostics records (one persisted, one in-memory) for the same event. The end-to-end test only asserts `some` matching code/level and `length <= MAX` (`s374:74-78`), so it passes while the duplicate is present. Required: choose one source or dedupe persisted vs in-memory records (e.g. exclude writer records already represented by a persisted row, or do not merge the writer when persistence succeeded), and assert exactly one visible record for one defect.

## Q4 — 4xx exclusion: PASS

`isClientCausedModuleHealthEscape` returns before both writer and persist (`index:20600`); the end-to-end test sends 404/422 and sees both `storage.diagnosticRecords()` and the authorized read empty (`s374:82-92`). PASS.

## Q5 — Authorized read path: PASS

The test builds the composition source and calls `handleLocalDiagnosticsRead` with a bearer token plus operator channel/scope/epoch headers (`s374:19-56,74`), not a direct store read. The store leg is separately checked; the read leg is the real authorized handler. PASS.

## Q6 — Run: PASS

7 files **37/37 pass**; tsc exit 0.

## Q7 — Lint: HOLD

`anti_slop_lint(test/s374-defect-readback.test.ts)` reports **1 finding**: `require-safety-comment-for-type-assertion` at `:76` (the `(records ?? []) as ReadonlyArray<...>` cast has no SAFETY comment). The DAG is untouched; the task's “s374 clean” claim is false. Required: add SAFETY or a typed helper.

## VERDICT: HOLD (2 repairs)

1. **Eliminate the double record:** one edge report must produce one visible diagnostics record, not the same event from both the persisted store and the in-memory writer. Deduplicate/select one source in `source()`, and add an exact-count end-to-end assertion (one defect -> exactly one visible record).
2. **Fix the s374 test lint:** add SAFETY/typed handling for the cast at `:76`.

No product file was modified; no commit made.

## Final re-review after single-source/lint fixes — PASS

Final hashes: index 2FD69C22127E61CD8356D68CDA3097CAF0300B19ADF943147ED3887F7411CE18 (1372777 B); s374 test 714B1726957258892689E5959057D8025F24F5C8EA33345677C2B853CD852278 (4549 B). 7 files 37/37; tsc exit 0; anti_slop_lint s374 = 0 findings.

- **Single source:** when the backend store is bound, source() returns only backendStorage.diagnosticRecords() (sliced to MAX); the writer source is used only when no store is bound (index:20623-20628). The end-to-end test now asserts exactly one visible cause.die record and exactly one stored cause.die row (s374:68-79), so the prior double-record is behaviorally closed. Unbound fallback remains covered by the existing s366 writer-source tests.
- **Best-effort/identity/4xx/authorized read:** the persist remains try/catch around only the store write; databasePath comes from the same bound storage; 4xx returns before both; the read uses handleLocalDiagnosticsRead with bearer+operator context. All green.
- **Lint:** the :76 cast is gone/typed; test clean.

Residual non-blocking: if the store is bound but the best-effort persist throws, source() returns the empty persisted view and the in-memory writer record is not surfaced; the request outcome is unchanged, but the diagnostic record can be lost on a store failure. This is a durability/visibility tradeoff of the canonical-persisted design, not a double-record regression.

## FINAL VERDICT: PASS

Both S377 items are closed: exactly one visible/stored record per defect, fallback preserved for unbound composition, end-to-end authorized read, and the test is lint-clean. No remaining numbered items. No product file was modified; no commit made.

