# S421 — diagnostic/business isolation repair

Status: verified-bounded (S422 independent PASS; wider R20/R21 remain open)
TDD Mode: strict
Current public HEAD22b3d9ab; private a86ea7a9 unchanged. Full diff authority still00-worktree original paired baselines; patch comparison HEAD22b3d9ab. S420 audit supersedes broad COMPLETE claims.

Inputs: 00-requirements.md R20/R21(190-205), source-proposal.md15.3, owner-scope-decision.md, S420 current-state/public audits and Lead probes. Only E1/E2 deferred.

## Decision and scope
Repair diagnostic/business separation WITHOUT inventing new persistence/schema. Original module-health writer already supplies a bounded owner-local ring buffer, loss identity and recordCause semantics; durable diagnostic persistence is not an acceptance contract. Use that real process-lifetime source as the canonical module-health read authority. Remove the recently added telemetry-derived BackendStorage.diagnosticRecords API and module-health writes to business telemetry. Do not pretend a telemetry table is a diagnostic store or claim process-local diagnostics survive restart.

Write scope: host src/index.ts ONLY diagnostics composition/helper region; src/composition-dag.ts ONLY diagnosticRecords import/contract/factory region (not cache); relevant s369/s374 tests and NEW test/s421-diagnostics-isolation.test.ts; run-local S421 task/evidence. No CLI/UI/private/cache edits. Preserve unrelated dirty files, no broad checkout/reset/cleanup.

## Strict RED before product changes
1. Real disposable backend SQLite: report machinery Error/Cause; readRuntimeTelemetrySummary/listRuntimeTelemetryRecords unchanged (requestCount/failureCount and business row count stay unchanged) while actual authorized handleLocalDiagnosticsRead exposes one module diagnostic.
2. Seed genuine provider/business telemetry failure and prove authorized module diagnostics omit it; business read still contains it. No fake all-zero response or unrelated filtered query.
3. Store-independent diagnostic visibility: bound business storage inaccessible/closed/degraded does not suppress writer records; no attempt to write business DB, no effect on handler error identity/outcome. Preserve client4xx exclusion, enabled+calibration gate, exact auth/caps/loss behavior.
4. Capacity overflow bounded/loss counter visible; no double report.
Run intended assertions against current product BEFORE product edit; preserve command/revision/exit in evidence/logs/s421-red.log. Missing imports/setup failures are not behavioral RED.

## Implementation and verification
Minimal isolation change using existing writer, eliminate dead dominant-code/persistence sequence helpers if no callers. Remove obsolete diagnosticRecords from BackendStorage and update earlier tests that encoded the wrong cross-contaminating store assumption; preserve their auth/caps/Cause/injected-failure assertions against the legitimate health source. Record why expectations change (R20/R21), not a green-only assertion weakening.

GREEN: new isolation suite + all touched s369/s374 + s366/s10b/s10c/module-health-writer/s341 neighboring suites; host tsc. anti_slop_lint absolute targets filesScanned>0, effect:true where relevant; no NEW diagnostics-region findings; baseline findings disclosed exactly. No product changes before behavioral RED; no commit. Report hashes, actual counts/exits, remaining R20/R21 gaps. Independent Flash reviewer (not author) required; do not label all B1 complete.
## Author execution record (deepseek-flash; verified via list_agents)

TDD chronology: NEW test/s421-diagnostics-isolation.test.ts was written and run against the current product BEFORE product edits -> evidence/logs/s421-red.log: EXIT_CODE=1, 2 failed/5 on a real disposable SQLite backend:
- 'module diagnostics do not change business request/failure counts or rows': expected 2 to be 1 (module report incremented business failureCount and rows).
- 'authorized diagnostics omit a genuine business failure and show the module Cause': expected true to be false (provider.rate_limited business row leaked).
These are behavioral assertion failures (no import/setup failure).

Product repair (minimal, diagnostics composition only):
- index.ts createModuleHealthComposition: removed the business-telemetry persistence block (persistRuntimeTelemetryFailure + moduleHealthPersistenceSequence + moduleHealthCauseCode); reportRequestFailure is now writer.recordCause(cause) only.
- index.ts source(): writer.source() only; no backendStorageRefOf/backendStorage.diagnosticRecords lookup; no telemetry-derived diagnostics.
- composition-dag.ts: removed BackendStorageContract.diagnosticRecords, its listRuntimeTelemetryRecords-based factory, and the now-unused imports. Cache/calibration untouched.

Tests updated (not weakened):
- s369: now asserts the writer-owned source, no `diagnosticRecords` on backend storage, writer capacity/loss bound, disabled gate, fresh writer empty.
- s374: keeps the real injected Cause, authorized read, disabled gate, 4xx exclusion, caps, and adds 401 denial; asserts business telemetry contains no cause.die module row.
- s421: afterEach awaits every storage.close() and removes temp roots even on failure; the store-independence case closes AND removes the isolated business DB root before report+read (old close-only case could not prove independence). Legitimate auth/caps/loss/Cause/4xx coverage preserved.

GREEN: evidence/logs/s421-green.log EXIT_CODE=0, 8 files / 44 tests (s421+s369+s374+s366+s10b+s10c+module-health-writer+s341). Host tsc EXIT=0.

Lint absolute effect:true: s421 test clean (0); index.ts 2539 findings vs HEAD baseline 2539; composition-dag.ts 161 vs baseline 161; diagnostics region baseline 17 findings vs current 13 (no new rule/line introduced; removed persistence-helper findings). The large file-wide findings are pre-existing baseline, disclosed rather than claimed clean.

Hashes:
- index.ts 51861883C7246100A143E070033BDACD157E3DF5F4D1CEE7762D5F25FE6FADBD (1371146 B)
- composition-dag.ts D4DAD9C08A553AC9D2F88755E3297FF22C1CB7D6FEA4FE7DD620C8E4558484BC (75021 B)
- test/s421-diagnostics-isolation.test.ts 4B5DF0EDF8F6994E7F5533E95EBEB1DCB1110A5D33C77C0EB7CE610AEA0AAC43
- test/s369-diagnostics-query-source.test.ts 4C627EF12BA00BF8457B33D98C5A2825846404C47642558562953549D585939F
- test/s374-defect-readback.test.ts 526AF84C7A1FF1237EFD6D4A15CDEE4E00BFF614835DA68F2841979DF0F26581

Remaining R20/R21 gaps (not claimed closed): durable diagnostic persistence absent by decision (process-lifetime source only); only escaped failures are observed at the request edge (handled failures translated per route never reach it); calibration approval remains an explicit enablement precondition; R21 mobile/focus/redaction/loss-readback browser proof and an independent reviewer verdict remain open. E1/E2 remain owner-deferred.
## Freeze + additional lint evidence (post-product freeze; no product edits)

Product bytes frozen for independent review: index.ts sha256 51861883C7246100A143E070033BDACD157E3DF5F4D1CEE7762D5F25FE6FADBD (1371146 B), composition-dag.ts sha256 D4DAD9C08A553AC9D2F88755E3297FF22C1CB7D6FEA4FE7DD620C8E4558484BC (75021 B). No source edit after verification.

Absolute anti-slop scans (effect:true, filesScanned>0):
- test/s421-diagnostics-isolation.test.ts: clean, 1 file, 0 findings.
- test/s369-diagnostics-query-source.test.ts: 1 file, 1 finding at 27:no-conditional-empty-object-spread (the capacity option spread). Newly authored test finding; disclosed, not edited after freeze.
- test/s374-defect-readback.test.ts: clean, 1 file, 0 findings.
- product: index.ts 2539 findings vs HEAD baseline 2539, composition-dag.ts 161 vs HEAD baseline 161; diagnostics region baseline 17 vs current 13.

CAVEAT: equal full-file lint cardinality alone does NOT prove the same findings. The changed diagnostics composition region was inspected directly (17 baseline region findings -> 13 current, removals only, no new rule/line); s9 must classify the changed-region no-additions independently. Huge pre-existing file-wide findings are baseline, not a clean-product claim.

Historical freeze evidence above is superseded by S422 independent bounded PASS (SHA256 F492F09F3A637A4FAAC2F85D26461AB1EBD025FAE3A30A1060C773A67B49135E). Lead changed only s369 test capacity spread to direct optional property; final test SHA256 1B29A4784A3DF812A351A9443147927462A18E8F77C231D9C144D7206AD396BB, absolute lint1file/0. Reviewer verified final bytes. Lead final eight-suite run44/44 and host tsc0. Initial reviewer turn failed without verdict and was resumed; not treated as success. No whole-B1/R20/R21 closure. task-35 author work completed rev3; Lead acceptance in S423.
