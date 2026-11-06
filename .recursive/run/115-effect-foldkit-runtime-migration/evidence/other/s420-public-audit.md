# S420 — public/backend current-state audit

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only public product/test/config; no product edits, no commit. Snapshot HEAD **22b3d9ab8a41cb67a61d28c4cd3731d7a97f635b** (verified in the worktree). Inputs read: review bundle, R20/R21/R23/R27 in `00-requirements.md:190-252`, current `composition-dag.ts`/index diagnostics edge, status summary. Temporary probes used a disposable temp script and temp SQLite roots; probe file removed. No provider/operator port was started.

## Severity-ranked findings

### P0 — Diagnostic/business telemetry are the same store, in both directions (R20/R21)

Confirmed with a disposable real SQLite database and the production persistence/read functions:

- Business failure written with `persistRuntimeTelemetryFailure({requestId:"business-request-1", errorClass:"provider_explosion"})` appears in `backendStorage.diagnosticRecords()`: `[{"code":"provider_explosion","level":"error",...}]`. `diagnosticRecords` filters only `statusFamily === "failure"|"unknown"`, not a module-health origin (`composition-dag.ts:675-690`).
- A module-health-shaped row written with `requestId:"module-health-probe", errorClass:"cause.fail"` appears in `listRuntimeTelemetryRecords` for that same database: `[{requestId:"module-health-probe", statusFamily:"failure", errorClass:"cause.fail"}]`. The production edge persists module-health failures with `persistRuntimeTelemetryFailure` on the backend telemetry database (`index.ts:20599-20616`), and the analytics query reads the same records (`index.ts:26137-26145`, then computes buckets/totals at `26155-26196`). No origin/class exclusion exists.

Impact: R20's explicit "separate bounded module health/Cause attribution from business telemetry" (`00-requirements.md:194`) is not met. R21's "diagnostics cannot contaminate business/live aggregates" (`:205`) is not met: module-health rows count in telemetry aggregates, and provider/business failures render as diagnostics. This is a product/design defect, not merely missing evidence.

### P0 — Observation cache is unbounded and never invalidated; cache identity/version is absent (R23/R27)

`makeObservationStorage` calls its `capacity` argument a queue bound, but the `cache` Map is never evicted and there is no TTL/invalidation path (`composition-dag.ts:538-631`). A disposable probe with `capacity=2` sequentially hydrating six distinct keys reports all six `cached(...) === true`; the six-key cache is not bounded by 2. The existing s334 suite (9/9 pass) tests queue overflow/timeout, not cache size, TTL, or invalidation.

The key identity is also not versioned: profiles use `"profile:" + endpointId + ":" + difficultyBucket` and `"observed-profiles:" + endpointIds.join(",")` (`index.ts:26677-26698,6350-6355`), with no authority/config/version component. Lead reproduced v1 -> external v2 staying v1. A cache hit returns the old object without calling the fallback, so a configuration change cannot invalidate it. This violates R27's cache identity/bounded clauses (`00-requirements.md:250-252`) and leaves R23 observation-cache behaviour unproven.

### P1 — Same database path is not the same owned connection (R23/R27)

The diagnostics source is given only `storageRef?.current?.initialization?.databasePath` (`index.ts:20603`, `composition-dag.ts:675-679`); `persistRuntimeTelemetryFailure` and `listRuntimeTelemetryRecords` open their own handles from that path. The backend's initialized connection/service is not passed, so this is not the same-connection ownership R23 requires (`00-requirements.md:218-220`). It also means diagnostics/read and module-health persistence are outside the Backend owner's connection/fence, so backup/reset/restore and transaction/owner ordering can race. The storage ref path itself works in the current production chain (bind at `cli.ts:4487`, same `backend.options` passed by `composeServerOwner` at `composition-dag.ts:1372`; the `wireModuleHealth` handlerOptions spread does not copy the composition closure's options), but it is a WeakMap identity coupling that no guard protects.

### P1 — R20 calibration is still placeholder and the edge is incomplete

The diagnostics gate requires `enabled === true` AND `calibration.approved === true` (`index.ts:20577-20591`), but the record/byte limits are explicitly PLACEHOLDER defaults in the writer and option docs (`module-health-writer.ts:30-74`; `index.ts:3520-3541`). There is no approved concrete limit, ingress/formatting/TTL/query calibration, or evidence that the gate is calibrated. The only report edge is the transport catch (`index.ts:20547-20555`): acquire/finalizer/job edges and a reporter that observes final Exits are not covered, and only escaping route failures are seen. R20 remains blocked (`03-implementation-summary.md:1927`), not COMPLETE.

### P1 — R23/R27 whole-clause completion is not established

- Authoritative status marks both R23 and R27 **blocked** (`03-implementation-summary.md:1930,1934`); the summary lists remaining R23 multi-row `table_info`, transaction-owned cleanup, QA, rich graph hydration, backup/reset/restore owner draining and missing logical owner fence, and R27 acquisition/closed Layer DAG/early readiness/partial-shutdown gaps.
- The production observation storage is `backendStorage.observationStorage` created directly by `composeBackendStorage` (`composition-dag.ts:668-709`; `index.ts:21341`), not the DAG ObservationStorageService singleton (`composition-dag.ts:634-640`). The Layer is a parallel shape, not the actual owner on this path. R27's "closed shared-leaf Layer DAG owns ..." is therefore not established by this code.
- `composeBackendStorage` creates `graphStore` only when `useFixtures === true && trackBOperationsEndpoint === ""` (`composition-dag.ts:670-673`); production `useFixtures:false` gets no graph store and `readPersistedRuntimeObservation` falls back to compact records (`index.ts:21427-21440`), so rich graph hydration is not proven in production.

## Missing acceptance evidence / untested

- R20: no approved calibration artifact; no acquire/finalizer/job edge tests; no hostile/cyclic/nested/reused-at-edge proof beyond writer unit tests; no separation proof (the P0 contradicts it).
- R21: no browser-enforced CORS/TLS/screen-reader proof (the summary itself records this); the authorized read tests do not test isolation because the source is the business store.
- R23: no same-connection/owner-fence evidence for diagnostics/observation writes; no backup/reset/restore drain test; no real production rich graph hydration.
- R27: no actual closed Layer DAG/acquisition proof; no cache bound/TTL/invalidation test (s334 passes only queue behavior); no early-readiness/partial-shutdown test in this audit. The summary's own blocked rows are the current truth.

## Observations that did not reproduce as defects

- The production storage-ref binding is not broken by the current `wireModuleHealth` handlerOptions spread: the composition is constructed with the original options object, and the server listener receives `backend.options` unchanged. It is fragile but not a confirmed current failure.
- The diagnostics auth/limits/cursor/envelope code is bounded and tested (absolute product/test scans were not re-run as a whole; this audit is source/probe based). Relative-path scans are not evidence; only the probe/tests above are cited.

## Tests/probes executed

- Disposable tsx probe (real SQLite): observation cache sequential capacity=2 -> `[true,true,true,true,true,true]`; diagnostics rows -> module-health `cause.fail` + business `provider_explosion`; telemetry rows -> both rows. Probe exit 0; probe file removed.
- `vitest run test/s334-observation-storage.test.ts`: **9/9 passed**, exit 0. These tests do not assert cache bound/TTL/invalidation.
- No full host suite was rerun for this bounded audit; no product/test/config was modified.

## Requirement verdict

- **R20: NOT SATISFIED.** Same-store diagnostics/module-health cross-contamination; placeholder calibration; edge coverage incomplete.
- **R21: NOT SATISFIED.** Authorized read mechanics are substantially implemented/tested, but diagnostics and business telemetry are not isolated and browser/TLS/screen-reader acceptance remains missing.
- **R23: NOT SATISFIED / blocked.** Same-path-is-not-owned-connection, unbounded cache, rich graph hydration/owner fence/backup evidence missing.
- **R27: NOT SATISFIED / blocked.** Actual production observation owner is not the DAG service; cache identity/TTL/bound absent; closed Layer DAG and readiness/shutdown clauses remain open.

No COMPLETE claim for these four requirements is supported by the current code/evidence.

## Prioritized next work

1. Introduce a genuinely separate module-health store/origin (or a dedicated table/column excluded from telemetry aggregations) and enforce the boundary in both write and diagnostic read paths; add aggregate-count and diagnostics isolation tests on a real DB.
2. Bound and invalidate the observation cache (LRU capacity, TTL/version key components, explicit invalidation on config/authority changes); add a v1->v2 probe and cache-size test.
3. Give the backend owner a single connection/service handle for diagnostics/observation writes; remove databasePath-only opens and add backup/reset fence tests.
4. Complete R23/R27 blocked-clause inventory (rich graph hydration, owner fence, actual Layer acquisition, readiness/shutdown) before any completion claim.

## Limitations / not read

- This was bounded; I did not re-read every source-proposal section or both addenda in this pass, did not run the full host/UI suites, and did not start an operator port. The finding set is source/probe evidence, not a whole-run verdict.
- The UI reviewer's 556-test run and its 5 failures are separate evidence; not used as backend acceptance here.

Scope correction (lead, post-audit): the earlier UI-family claim that local policy/matrix had no source is disproved — the host exposes GET/PUT /local/policy and matrix is an original redirect grid. This backend audit did not rely on that claim; the R20/R21/R23/R27 findings above are independent of it.

