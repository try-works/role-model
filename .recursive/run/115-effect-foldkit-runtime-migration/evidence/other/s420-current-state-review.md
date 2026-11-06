# S420 — corrective current-state audit

Date: 2026-10-28, Asia/Shanghai. User requested review, not implementation. Product/test/config source unchanged by this audit. No external provider or operator port/state touched.

## Verdict

**Substantial real bounded progress, but not reliably on track for the full original goal. Completion claims outran implementation and evidence. Hold broad feature expansion, repair confirmed defects, reconcile the complete requirements, and restore integrated validation.** Only E1/E2 are owner-approved deferrals. Named follow-ons do not waive other work.

Snapshot public22b3d9ab8a41cb67a61d28c4cd3731d7a97f635b; privatea86ea7a9b05f928425675b2fc8b0499907caefe3. Comparison authority remains publicf0d50fab/private16021cc5 from 00-worktree.md. Existing dirty pin/audit-script and private review changes preserved. Current default package manifest identifies d61c32dc /0.0.20-231, NOT current HEAD (74 commits behind); historical receipts do not validate latest code.

## Governing inputs and review method

Read source-proposal.md (5.8,15-17), 00-requirements.md, 00-worktree.md, 02-to-be-plan.md, owner-scope-decision.md, REASSESSMENT-AND-EXECUTION.md, Workspace addendum02 and current code/reviews. Audits were delegated via evidence/review-bundles/s420-current-state-audit.md. Public/backend and private reviewers verified live deepseek-flash. UI author self-check is explicitly not independent acceptance; GPT Lead independently compared originals and reproduced defects. All workers finished. Helper .recursive/scripts/recursive-review-bundle.py was absent, so the manual durable bundle records required context. See three s420 audit reports and s420-lead-probes.md for detailed scope/limitations.

## Confirmed high-priority findings

1. **Diagnostics contaminate business telemetry (R20/R21).** index.ts:20599-20616 persists module-health errors via persistRuntimeTelemetryFailure. composition-dag.ts:675-694 reads ordinary failure/unknown business rows as diagnostics. Lead real SQLite probe: ordinary requestCount/failureCount0/0 became1/1 after one machinery Error; excludedRequestCount stayed0. Independent probe also showed business provider errors appearing as module diagnostics. Direct violation of requirements194/205. Previous B1 COMPLETE is withdrawn.
2. **Observation cache freezes mutable reads and is unbounded (R23/R27).** composition-dag.ts:538-628 creates Map without TTL/eviction/invalidation. readHydrated caches a captured synchronous result and never revalidates hits. Lead v1 -> underlyingv2 probe still returnedv1; independent capacity2/six-key probe retained all6. Routing profile callers index.ts:6350-6355/26677-26704 use mutable data keys. Queue capacity is not cache capacity; an async capture of an already-sync value is not SQL/graph asynchronous hydration. Connection/maintenance ownership also remains incomplete. Previous R23 full closure is withdrawn.
3. **Device auth is not operationally complete (M8/R13).** device-auth.ts:193-205 maps host status failed to pending (real host failed replies index.ts:33266-33271/33326-33330); probe confirmed. control-view.ts:169-171 never renders the pending verification URL/code, so the user lacks the authorization step. update.ts:963-970 cancel leaves inflight=true; Start guard878 refuses restart; probe produced draft/inflighttrue/restart[]. Token fencing does not cancel pending I/O. Catalogue selection/modal/focus/check-now behavior remains unported.
4. **Multi-model admission reports saved after the first response (M8/R13).** update.ts:1158-1172 emits N commands sharing one token;1175-1183 clears pending on first success. Lead two-model probe:2 commands, first success -> saved. Duplicate submit becomes possible while other requests run; mixed success/failure order is not tracked. Previous M8 COMPLETE is withdrawn. Existing exact payload and32/33 tests are useful but insufficient.
5. **The two missing routes were wrongly called unsourceable (R11/R13).** Original local-policy.tsx calls existing GET/PUT /api/role-model/local/policy (runtime-api.ts:3815-3825; host index20284/20293). Original local-matrix.tsx:5 simply redirects to models?view=grid with replace. Both exist at frozen baseline too. Current MISSING targets legacy-redirects.ts:170-182 are unported behavior, not approved exclusions. Accounting for53 patterns is not completing53 patterns. Prior no-source rationale and F-URL COMPLETE are withdrawn.
6. **B10 ledger is incomplete (R33).** Private s344-b10-ledger.json has15 surface entries but34 pending operations plus notYetEnumerated groups (494-653), and missing required operation owner/error/cancel/transaction/lease/fence/B-M-task-R/TDD-CI/build-reviewer-rollback fields. sourceHead4c24591d is an older snapshot, not current acceptance. Citation checker green does not prove inventory completeness. Previous B10 COMPLETE is withdrawn.
7. **Private handshake/graph acceptance is partial (R32).** private-layers.mjs operator open103-118 lacks evaluation-style version/capability handshake; evaluation73-85 sets accepted ready before factory completes, checks only limited metadata, not full descriptor/capability/process readiness. Existing artifact digest validation is not alleged bypassed; this is incomplete compatibility/readiness coverage. Seven scopes are actually invoked, which is real progress, not full private-domain/process closure.
8. **Learning actions still use the wrong scope outside stage.** update.ts:1104 hardcodes standalone-runtime-stage instead of loaded scope. Provider form also retains free-text catalogue approximations/global per-model role IDs and base URL draft rather than original variant/provider-derived value (provider-account.ts:89-159). Exact synthetic payload tests do not establish original end-to-end behavior.

## Tests and evidence now

- Full Foldkit UI Vitest, serial files: **551pass/5fail,556tests,55files, exit1**, evidence/logs/s420-full-ui.log. Failures: stale MISSING14/10/5 assertions in s380/s383/s386; s26e pathname-only recorder compares against a query-bearing path; s26f host/client inventory lacks newly-added paths. Mostly regression-test/inventory drift, not five confirmed runtime bugs. Nevertheless whole suite is not green.
- Targeted host four storage/diagnostics suites:22/22 exit0 (s420-host-targeted.log), despite reproduced cache/isolation defects. UI and host typechecks exit0.
- UI author recent-form/ranking checks45/45; private independent selected lifecycle/handshake/ledger checks28/28. These are bounded samples, not full private/host/package proof.
- Paired Effect vendor verification succeeded2155files each, identical SHA2567c7256252cf0b9b8aa25c1698ca1f5af171def4eb42048aedfeae9f2ee524702.
- anti_slop_lint absolute paths, filesScanned1 each: device-auth19/provider-account12/endpoint-admission9 findings. Pattern debt, not40 distinct bugs; contradicts blanket product-clean claims. Zero-file scans are not evidence.
- Strict TDD was not consistently followed: proposal5.8/plan156/R3 explicitly reject missing-module/setup failures as behavioral RED. S408 implemented-before-tests then reversed to module-missing failure; that cannot repair historical chronology. S417/S418 freshness repairs do have genuine assertion-level RED-first evidence. Preserve both facts.
- Determinism selfcheck deliberately returns PASSED even if stable React/Foldkit captures differ (parity-selfcheck.mjs:334; probe confirmed). Useful selfcheck, NOT a parity arbiter. It captures only root route, not complete route/state parity. CI step is advisory and defaults executable selection to role-model-dev.exe; current matched production/channel invocation and CI execution remain unverified.

## Corrected progress versus original requirements

| Requirement group | Corrected assessment |
|---|---|
|R1-R3 baseline/team/process|Original baseline preserved; current Flash identities verified; historical action ledger/TDD exceptions and blanket claims need reconciliation. Not blanket PASS.|
|R4-R6 dependencies|Matching vendor payloads/wrappers are real progress; full current consumer/Node/browser/SEA closure not re-established by this audit.|
|R7-R8 provenance/components|Real primitive work; full accessible donor/facade/browser adoption not verified.|
|R9-R10 charts|Real token-tooltip/key/toggle/route-state slice; full range/numeric/status/resize/multi-instance/performance parity not accepted.|
|R11-R13 UI waves|URL/readback/form/ranking implementation progressed;2 required routes missing, generic pages not feature parity, material form bugs, refresh fallback open. NOT COMPLETE.|
|R14 parity|Maintained capture/selfcheck/mutation pieces; full current identified React/Foldkit double-run exact request/state/visual comparison missing.|
|R15-R18 live/RDC/joins/privacy|Real-client packaged correlation/restart and current R/D/C/performance/rollback receipts not complete. Provider authorization gates only live spending; not a blocker for ordinary engineering/fixture parity.|
|R19 inventory|Inventory groundwork useful; R33 census still incomplete; not every operation proven dispositioned.|
|R20-R21 diagnostics|Auth/bounds/Cause tests useful; isolation defect, placeholder calibration and incomplete reporting edges prevent closure.|
|R22-R24 supervisor/SQL|Scoped/retry/maintenance slices useful; current SEA/Windows/process/owner-fence/rich-graph acceptance remains partial. Cache defect confirmed.|
|R25-R27 routing/transport/composition|Real producer/signal/gate/readiness/shutdown slices exist. No fresh complete-path parity; production storage not acquired from parallel ObservationStorageService layer; full closed process graph not accepted. Same DB path is not same connection.|
|R28-R31 private stores/background/learning|Real-store/lease/idempotency tests useful. Distinct jobs on two object identities != complete two-process/global-concurrency proof. Ack-only worker does not satisfy trial/consent/revocation clauses; more original-path evidence needed.|
|R32-R33 private graph/ledger|Seven used scopes good; handshake incomplete and per-operation ledger explicitly pending. NOT COMPLETE.|
|R34-R35 E1/E2|Owner-approved named deferrals valid. No other scope waiver inferred.|
|R36-R39 integration/release/safety|Many maintained scripts exist; current paired package/client/CI/perf/rollback/combined-review gates open. No release approval.|

Workspace addendum02 is a required effective input. Current no feature directories/Submodel/ViewInputs/OutMessage/shared application HTTP service evidence, large flat update/view files, no Dialog/Listbox adoption, and pin decision remains INCONCLUSIVE with compile/leaf/browser checks NOT_RUN. This is substantive architecture work still open, not a cosmetic directory request. File size alone is not the defect; missing owner/draft/auth/route-instance boundaries and evidence are.

## Are we doing the right work?

The named tasks mostly address genuine requirements. The error is the acceptance unit: isolated helpers, sampled routes, generic readbacks and citation checkers were promoted to whole requirement completion. Reviews did catch real defects, but were too locally scoped and sometimes accepted unresolved product limitations as non-blocking follow-ons. The work has drifted toward countable slices instead of original feature behavior and current integrated release evidence. Hundreds of local commits are not a percentage complete.

## Corrected next order

1. **Repair correctness before more breadth:** isolate diagnostics, restore cache freshness/bounds or remove unsafe caching, device failed/cancel/link/code lifecycle, all-child endpoint completion, real learning scope. Strict behavioral RED-first and permanent integration tests for each.
2. **Restore regression health:** five full-UI failures/inventory, mock/unhandled localhost noise, real nonempty product lint scans and scoped handling. Do not weaken assertions to obtain green.
3. **Refresh clause/operation ledger:** one current completion map per original R clause; mark bounded slices separately; finish B0/B10 actual operation dispositions; no COMPLETE from surface counts. Record TDD deviations honestly.
4. **Complete original vertical workflows using Workspace ownership:** actual catalogue/auth/modal/role flows, local policy/matrix redirect, remaining Learning/local/system/Studio actions, URL range/filter/refresh semantics. Shared clients and owned child resources, not more generic JSON pages.
5. **Build a fresh matched public/private/UI pair and validate locally now:** root/host/private regression, SEA/source/served identities, React/Foldkit deterministic per-route/state/wire parity, rollback/reader checks. This is not gated by paid provider permission.
6. **Run authorized bounded ordinary-client R/D/C journeys:** J1/J2/J5 plus affectedJ3/J4/J6 with joined IDs/storage/UI/restart, approved budgets and classified deltas. Then measured perf/handles/locks, CI, independent integrated acceptance; only then cutover/removal/promotion.

## Audit limits

This is substantial sampled audit, not an exhaustive line-by-line proof of all first-party/vendor modules. No full public-host/private-workspace suite, current SEA rebuild, browser screenshot/mobile/screen-reader test, real provider or process-kill run. We can identify confirmed defects and unsupported completion, not certify that uninspected code is correct. Product implementation was intentionally paused; audit artifacts/evidence only were written.

Overall audit: **HOLD for full-goal completion and further broad claims.** Bounded implementation progress remains valuable. Earlier historical receipts remain immutable; this corrective audit supersedes their whole-goal COMPLETE interpretation.
