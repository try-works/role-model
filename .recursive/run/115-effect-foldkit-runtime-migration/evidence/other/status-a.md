# Run115 backend B0-B10 status audit (read-only)

Date: 2026-10-30. No source edits or commits. Inputs read: 00-requirements.md, 02-to-be-plan.md, 03-implementation-summary.md (historical), 00-worktree.md, source-proposal.md excerpts, owner-scope-decision.md, REASSESSMENT-AND-EXECUTION.md, S261-S263 assessments, and the cited evidence files. I did not rerun the full backend suites.

Public worktree HEAD: c6e7d0c0 (dirty UI work present; backend evidence from final7 public 50d251ab / private a6510c63). Private worktree HEAD: a6510c63.

## Per-requirement table

| ID / R | Requirement | Status | Implemented evidence (files / commits) | Verified-by (tests / reviews) | Remaining gap |
|---|---|---|---|---|---|
| B0 / R19 | Current contracts/extraction | PARTIAL | evidence/other/s298-b0-r19-public-inventory.md (137 public operations/resources), s300-r19-inventory-correction.md, s4-contracts-inventory.json, scripts/s4-contracts-inventory.test.mjs; private inventory in initializer commit 6602595f and s298 | s321-r19-body-verification.md body-verified 16 pre-existing entries; inventory test enforces unique ids/kinds/dispositions/citations | Only 16 entries body-verified; no full per-operation body disposition. Full conversion belongs to B10/R33. |
| B1 / R20 (+R21) | Diagnostics: module health, Cause attribution, diagnostics source/page | IMPLEMENTED + VERIFIED (bounded) | apps/runtime-host-bridge/src/composition-dag.ts, src/index.ts, src/module-health-writer.ts, src/local-diagnostics-read.ts; commits 6c0d47a0 (B1 production diagnostics query source), 71151644 (isolate diagnostics from business telemetry), bd1b9a52 (fresh observation reads/bounded snapshots) | test/s366-module-health-edge.test.ts, test/s369-diagnostics-query-source.test.ts, test/run115-s10b-module-health-wiring.test.ts; reviews s367 PASS, s372 PASS, s422/s423 isolation + lead acceptance | Calibration remains default-off; diagnostics page exists in UI but is not a general operator diagnostics explorer. |
| B2 / R22 | Supervisor: process/stdio/readiness/health/restart/exit, SEA/Windows tree | IMPLEMENTED + VERIFIED | packages/process-supervisor/src/index.ts (VendorScope/startScopedVendor); commit 41661308; s303-b2-scoped-process-service-result.md, s303-sea-leg.json | Package suite 6 files 17 pass / 3 platform skips; s305 HOLD then pass, s306 lead acceptance; SEA leg PASS sha d2bc6231... | None for the bounded R22 package surface; no packaged operator journey in this slice. |
| B3 / R23 (+R24) | SQL service: async Effect callers, sync facade, busy retries, transactions, maintenance drain/fence, PRAGMAs | IMPLEMENTED + VERIFIED (R23 disposition complete) | packages/sql-sqlite-node/src/service.ts; commit 24fe8bf4; public backend storage factory 5fc543af; s307-b3-maintenance-result.md, s307-lock-probe.json, s342-backend-storage-review.md, s343-backend-storage-lead-acceptance.md | S307 package suite 43/43; s308 review; s309 lead acceptance; S341/S342 19/19 + tsc 0; R23 "fully dispositioned" per S343 | R24 broader schema/migration matrix remains governed by B10; no off-thread driver claimed. |
| B4 / R25 | Routing/schema: Effect producer wraps pure scorer; parity | IMPLEMENTED + VERIFIED (legacy verification) | packages/core/src/route-decision-producer.ts, packages/protocol-routing/src/route-decision-boundary.ts; migration commit 68961c46 | packages/core/test/run115-s7-route-decision-producer.test.ts; s121-round100-milestone.md lists R25 verified | Verification evidence predates final7; no fresh independent R25 re-review in this audit. |
| B5 / R26 | Transport/SSE: AbortSignal, cleanup, typed failures, retry, stream preservation | IMPLEMENTED, VERIFICATION STALE/PARTIAL | apps/runtime-host-bridge/src/track-b-operations.ts, src/sse-transcript.ts; commit 68961c46 | test/s17b-sse-cleanup.test.ts; S121 lists R26 verified | 03-implementation-summary records "four production sweeps uncancellable" at its historical snapshot; no later closure evidence found. Treat as open until a current cancellation sweep is proven. |
| B6 / R27 | Public composition: closed shared-leaf DAG, readiness, drain/shutdown, cache/permits, benchmark | PARTIAL | apps/runtime-host-bridge/src/composition-dag.ts; commits ff234bcf early-readiness, 27e0eecd partial shutdown, fef1a3ee drain wiring, b3bb054e benchmark owner, 7f3d498c metadata cache, bd1b9a52 observation freshness | test/s310b-backend-owner.test.ts, s324-readiness.test.ts, s327-drain-shutdown.test.ts, s330-benchmark-owner.test.ts; reviews s325 HOLD, s328 PASS, s331 PASS | s311 HOLD: server does not consume the composed Backend owner in production (facade backend); s314 HOLD Q4 same. No evidence in this audit that the facade/owner wiring was fully closed. "Closed DAG" must not be read as whole R27 pass. |
| B7 / R28 | Private storage: ArtifactStore/EventLog/capture WAL/retention authority | PARTIAL | private extensions/event-log/index.mjs, shared/retention/index.mjs, capture/queue modules; commits 7c0e0136 B7 store fault matrix, a86ea7a9 B7/B8 lease/publication fences; s143-r28-prune-defect.md | tests/track-b/run115-r32-retention-manager.test.mjs 4/4 lead-verified (S135); private B7/B8 tests in a86ea7a9; S263 private audit | No full B7 fault matrix/closure claim: DELETE/FULL/FK, encryption, privacy and raw-WAL owners remain separately scoped. |
| B7 / R29 | Capture drain/postcommit | PARTIAL | private capture queue and lifecycle modules; S10 CaptureQueue close work (private-slices.md S10); commit family 7cd31ccf/a86ea7a9 | private-slices.md: queue-close 7/7, drain 4/4, event-log 9/9 after controller re-runs | Residual disclosed: in-flight request-path flush is still not joined during close; createRuntimeOperationsServer.close order. |
| B8 / R30 (+R31) | Background workflows: PersistedQueue, abort/lease/fence, contribution/learning outbox | PARTIAL | private scripts/track-b/runtime-operations-server.mjs, queue-continuity.mjs, contribution/outbox modules; commits 7cd31ccf ack-ownership worker, a86ea7a9 two-host distinct jobs | Private B10/B7/B8 tests; s135 retention slice; S473 contribution flush 49/49 + 8/8 | Multi-host distinct-job cap and full terminal/deferrable/refusal policies not proven; S10 residual; no effect-mq driver change (deliberately not proposed). |
| B9 / R32 | Private composition: closed domain Layers, authenticated DTO/readiness, scoped processes/stores, cross-repo capture/queue/projection | PARTIAL | private scripts/track-b/private-layers.mjs; commits 61912d29 storage-audit, f371ed7c evaluation host, 2f17d1be operator host, 8663774f retention, 9b98015d replay, 64b31e7c queued handoff, a14e968d replay-runner, 566034f1 package handshake, ac809d31/3d03ad78/0670a14a readiness fixes | s429 HOLD then S435 bounded PASS; s470 PASS; s473 PASS; S469/S472/S475/S478/S480 chain; final7 packaged operator routes 200 (S482/S483) | Evaluation-handshake gaps explicitly left open (S435); operator handshake PASS is bounded. Full R32 cross-process/partial-acquire/auth/projection/ledger/package acceptance not claimed. |
| B10 / R33 | Backend completion: per-operation ledger, dispositions, caller/test/rollback evidence, anti-slop | PARTIAL / OPEN | private evidence/other/s344-b10-ledger.json v2 (15 surface rollups + 66 operation rows), scripts/track-b/ledger-check.mjs; commits 75397625 ledger, 92ef134c membership, 87d62aef sync, f88d7d8d extension surface, 90e5ba27 fail-closed, a6510c63 enumerate remaining groups | s486 trace; s489 PASS bounded; s494 PASS bounded, 10/10 tests, node --check 0 | Not complete: 19 operations remain callerless/unresolved; most evidence/build/reviewer/rollback fields are not-recorded. Ledger is an honest inventory, not a closed R33. |

## Packaged operator readiness (five fixes)

| Fix | Change | Commit | Evidence | Status |
|---|---|---|---|---|
| S469 | packaged /healthz derives real operator worker status instead of unobserved trace | private 0670a14a | s468-operator-readiness-trace.md, s470-operator-status-review.md (69/69 B9 tests; bounded PASS) | LANDED |
| S472 | bound contribution aggregate flush with existing 5s host cap | private b8733789 | s473-contribution-flush-review.md (49/49 + 8/8) | LANDED |
| S475 | bound packaged QA startup invokes (no unbounded host.invoke) | public 342fcd86 | s476-qa-invoke-review.md, s482 chain | LANDED |
| S478 | shared completeCliStartupReadiness after packaged/non-packaged branch; packaged markReady | public ae7f8a3e | s477-bootstrap-hang-location.md, s479-markready-review.md HOLD (test not packaged-branch; source correct), s478-green.log 14/14 | LANDED, with the S479 test-coverage limitation |
| S480 | skip Run88 identity on development packaged boot | public 3299ad00 | s481-dev-run88-review.md, s482-packaged-ready-milestone.md | LANDED |

Chain result: S482/S483 record the packaged exe serving /healthz 200, models 200, operator status 200 and learning records 200, with verify-packaged-candidate 12/12 and validate-packaging PASS on release-final4. Final7 (public 50d251ab / private a6510c63) re-ran: audit-rendered-ui 20/20, dialog a11y PASS, verify-packaged-candidate 12/12 (chat total_tokens=56), ui-parity 128/128, parity-selfcheck PASSED (reactVsFoldkit "different" pending owner delta), validate-packaging PASS (S524/S525).

## R33 operation-ledger status

- Ledger: private evidence/other/s344-b10-ledger.json, schema v2, 15 surface rollups + 66 concrete operation rows; no pending/notYetEnumerated properties after S493.
- Checker: fail-closed on v1, missing groups, undispositioned operations, callerless without disclosure, not-converted without missingContract, converted without service/open citation, and placeholder paths.
- Verification: S489/S494 bounded PASS, 10/10 tests, node --check 0.
- Honest residual: 19 operations callerless/unresolved; many source/build/reviewer/rollback fields not-recorded; 13 not-converted rows have missing-contract rationales. This is not whole B10/R33 completion.

## Ranked open items

1. **HIGH — B10/R33 completion.** 19 callerless operations, not-recorded evidence/build/reviewer/rollback fields, 13 not-converted rows. Need concrete owner/caller evidence, RED/GREEN/CI and release review per operation, then rerun the fail-closed checker.
2. **HIGH — B6/R27 production owner wiring.** S311/S314 HOLD that the Server owner consumes a facade Backend owner, not the composed Backend owner; getRoutableInventory and anonymousLearningReads were dropped in S310b. Confirm whether later commits closed these; no evidence in this audit does.
3. **HIGH — B9/R32 evaluation handshake and full private composition.** Operator handshake is a bounded PASS (S435); evaluation handshake, cross-process/partial-acquire/auth/projection/package acceptance remain open.
4. **MEDIUM — B5/R26 cancellation sweep.** Historical summary records four production sweeps uncancellable; no current closure evidence found. Prove AbortSignal reaches I/O and cleanup for every sweep.
5. **MEDIUM — B7/R28 and B8/R30 fault/lifetime matrices.** In-flight request-path capture flush is not joined at close (S10 residual); multi-host distinct-job cap and full terminal/deferrable refusal policies are not proven. No effect-mq driver change should be inferred.
6. **MEDIUM — B0/R19 body-level dispositions.** Only 16 pre-existing entries were body-verified; the remaining inventory entries are signature-level candidates. R33 ledger should become the single source of per-operation truth.
7. **LOW — B4/R25 re-verification.** R25 is verified from pre-final7 evidence only; rerun its producer/parity tests on the final7 pair and record the current review.
8. **OWNER-GATED (not B-items):** visual-delta approval (vision quota 429), preserved v0.0.20 React artifact for compare-release, real-client R15/R16-live/R39 approvals, stage/prod Run88 identity. These block release closure, not the bounded B0-B10 slices above.

## Bottom line

B0-B10 are not all complete. B1, B2, B3 and (legacy) B4 have bounded verified surfaces; B5 has stale cancellation evidence; B0, B6, B7, B8, B9, B10 are partial with named open evidence. The five packaged readiness fixes genuinely unblocked the final7 packaged operator matrix, but that is not R33 completion. No source was edited for this audit.

## Commit crosswalk (requested commits)

| Commit | Area | What it closes |
|---|---|---|
| public 71151644 | B1/R20 | isolate module diagnostics from business telemetry |
| public bd1b9a52 | B1/R20, B6/R27 | fresh observation reads, bounded snapshots/cache freshness |
| public ff9257f1 | UI contracts | maintain exact route/readback contracts across UI slices; not a B0-B10 backend conversion |
| public 54e4e49e | UI device auth | preserve device authorization challenge/terminal status; not a B0-B10 backend conversion |
| public 1540e67c | UI endpoint activation | await all endpoint activations before completing a run; not a B0-B10 backend conversion |
| public 13cc4ed4 | UI learning | bind Learning mutations to authoritative records scope; not a B0-B10 backend conversion |
| public 835efac8 | UI local policy | local policy page + cancel pending device polls; not a B0-B10 backend conversion |
| private ac809d31 | B9/R32 | validate operator handshake before host readiness |
| private 3d03ad78 | B9/R32 | validate evaluation binding before host readiness |
| private 0670a14a | B9/R32 | packaged healthz from real operator health (S469) |
| private b8733789 | B9/R32 + B8/R30 | bound contribution aggregate flush (S472) |
| private 90e5ba27 | B10/R33 | fail closed on incomplete operation ledger |
| private a6510c63 | B10/R33 | enumerate remaining operation ledger groups |

## R-entry notes not split into separate rows

- R21 (Diagnostics API/UI) is wired in the current Foldkit diagnostics page and local read path, but this audit found no dedicated end-to-end R21 operator review; it is therefore folded into the bounded B1 result, not called independently verified.
- R24 (SQL blocking/maintenance truth) is covered by the B3 maintenance/drain work; the broader schema migration/reader matrix remains a B10/R33 governance item.
- R31 (trial/learning/contribution) is retained under B8/R30; no independent R31 closure is claimed here.
