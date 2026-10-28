# S422 — independent review: S421 diagnostic/business isolation repair

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only product/test/config; no product edits, no commit. Baseline HEAD `22b3d9ab8a41cb67a61d28c4cd3731d7a97f635b`; patch compared against that baseline. Inputs read: S421 task, S420 public/current-state audit, R20/R21 (`00-requirements.md:190-205`), source-proposal 15.3, addendum 01 and the paired 00-worktree basis. I did not use a broader checkout/reset or the private tree.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `51861883C7246100A143E070033BDACD157E3DF5F4D1CEE7762D5F25FE6FADBD` | 1371146 |
| `src/composition-dag.ts` | `D4DAD9C08A553AC9D2F88755E3297FF22C1CB7D6FEA4FE7DD620C8E4558484BC` | 75021 |
| `test/s421-diagnostics-isolation.test.ts` | `4B5DF0EDF8F6994E7F5533E95EBEB1DCB1110A5D33C77C0EB7CE610AEA0AAC43` | 6149 |
| `test/s369-diagnostics-query-source.test.ts` | `1B29A4784A3DF812A351A9443147927462A18E8F77C231D9C144D7206AD396BB` | 3186 (Lead capacity-direct lint fix) |
| `test/s374-defect-readback.test.ts` | `526AF84C7A1FF1237EFD6D4A15CDEE4E00BFF614835DA68F2841979DF0F26581` | 5497 |

All product hashes match the frozen values. The diff against 22b3d9ab is limited to `index.ts`, `composition-dag.ts`, s369/s374 and the new s421 test; no CLI/UI/private/cache edits.

## Actual product change: PASS

The diff removes the telemetry-derived diagnostic read and the module-health write to business telemetry:

- `composition-dag.ts` no longer imports `listRuntimeTelemetryRecords`/`MAX_DIAGNOSTICS_RECORDS`, no longer declares `BackendStorageContract.diagnosticRecords`, and no longer builds its failure-row reader (`composition-dag.ts:654-677`).
- `index.ts` removes `moduleHealthPersistenceSequence`, `moduleHealthCauseCode`, the `persistRuntimeTelemetryFailure` block, and the backend-source selection. `reportRequestFailure` is now `writer.recordCause(cause)` only; `source` is `writer.source()` only (`index.ts:20564-20620`).
- The writer still classifies Fail/Die/Interrupt and excludes client 4xx before recording; the writer's `recordCause` is internally try/caught and never throws (`module-health-writer.ts:160-184`), so the request outcome is unchanged and best-effort.

The source and report are the same composition-owned writer: `createModuleHealthComposition` closes over one `makeModuleHealthWriter`; `wireModuleHealth` injects `composition.source` by identity and uses `composition.reportRequestFailure`; s10c's identity/one-construction/one-report tests still pass. No backend storage ref is consulted by the module-health source now.

## Isolation: PASS on the tested evidence

The new real-SQLite s421 suite sets up a disposable backend, seeds a genuine `provider.rate_limited` business failure, reports `Cause.die`/Fail through the module composition, and verifies:

- business summary counts and record count do not change after module reports (`s421:74-87`);
- authorized diagnostics contain exactly one `cause.die` and no `provider` row (`s421:89-100`);
- with the storage closed and its root deleted, writer records remain visible (`s421:102-112`);
- capacity overflow is bounded, loss is visible, and one record is not double-reported (`s421:114-128`);
- client 4xx escapes remain excluded (`s421:130-136`).

The authorization, disabled/calibration, caps, 401 denial and pre-existing Cause/4xx assertions remain in s369/s374, not merely an empty-response assertion. s374 adds the business telemetry negative assertion `businessRows.some(errorClass contains cause.die) === false` (`s374:56-70`), and keeps 401 (`:98-110`) and caps/default-off. s369 asserts the backend no longer exposes `diagnosticRecords`, the writer ring/capacity/loss, and the gate (`s369:34-74`). This is a positive assertion shape, not a weakening to a fabricated empty response.

## TDD/run: PASS

- `s421-red.log`: **2 failed / 3 passed** (5 total), assertion-level failures: business failureCount 1 vs 2 pre-fix; business provider row leaked into diagnostics pre-fix. No setup/import failure.
- GREEN: 8 files / **44 tests passed**; host tsc exit 0 in my run. The eight-suite set is s421+s369+s374+s366+s10b+s10c+module-health-writer+s341.
- The s369 capacity change is the Lead's direct optional-property lint repair only; behavior is unchanged and the test remains positive.

## Absolute lint: PASS for scope, baseline classified

Absolute `anti_slop_lint`, filesScanned=1:
- s421 test: 0 findings.
- s369 test: 0 findings (Lead capacity-direct fix).
- s374 test: 0 findings.
- `composition-dag.ts`: 161 findings, matching the 22b3d9ab baseline 161.
- `index.ts`: 2539 findings, matching baseline 2539; the diagnostics-region lines are pre-existing rule classes (unknown params/returns, runtime typeof, conditional spreads) and the removed persistence helpers reduced rather than introduced findings.
No new diagnostics-region finding/rule/line was introduced. File-wide counts are not claimed clean; they are baseline-classified.

## Remaining R20/R21 gaps (not closed by this patch)

- Durable diagnostic persistence is intentionally absent: the source is process-lifetime and restart loses records; no durability claim.
- Only failures escaping the route handler are observed; handled route failures and acquire/finalizer/job edges are still outside the edge.
- Calibration approval remains an enablement precondition; the writer's record/byte limits are still placeholders, so concrete R20 calibration is still open.
- R21 mobile/focus/redaction/loss-readback browser proof and wider UI acceptance remain open; this review does not close B1.
- R20/R21 whole-requirement completion is **not** claimed. The S420 audit's other confirmed findings (cache freshness, etc.) are outside this patch.

## Bounded verdict: PASS for the diagnostic-isolation repair

The minimal repair works on the tested real store: diagnostics are now the writer's owner-local source, module reports no longer write business telemetry, business data no longer leaks into diagnostics, auth/caps/loss/4xx/default-off behavior is preserved, and the earlier test assertions remain positive. This is a **bounded PASS**, not B1/R20/R21 completion. No product file was modified by this review; no commit.

## Limitations

- I did not rerun the entire host/UI suite, start an operator port, or re-read every source-proposal/addendum section.
- The host suite is 44 targeted tests; the wider S420 UI failures remain separate and are not accepted here.
- The persistent-cache defect (S420) and other non-diagnostic findings remain open and out of this patch's write scope.

