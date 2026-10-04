# Run 105 Phase 3.5 — Final Consolidated Requirements + Design Review

Snapshot (fixed): public `83308e29c7e9505054a0885f56da378330e76e5e` tree `d391ec69`; private `4d78ce60cfbf34734e286b34b878291617266261` tree `914efc31`.
Build divergence (controller-recorded): the FINAL private build pair is `da40a115237432b248f6b5282a4ac42f8fb90179` tree `148cbe9d`
(exe `ffc3f58a…`, private manifest `463d29a0…`); `4d78ce60` is its direct ancestor. Only ONE finding is affected
(mixed-policy admission, see R2/divergence D-1) and it is RESOLVED at `da40a115`.
User boundary: runtime verification/QA on dev :3458 ONLY; :3457 untouched (addendum-10). No runtime probes were made by this review.
Verification: source call-chain audit against both final trees + targeted static test runs (no ports, no providers) in clean build worktrees
`E:/tmp/run105-full-public` (HEAD 83308e29) and `E:/tmp/run105-full-private` (HEAD da40a115, clean).

## Executive verdict

NO BLOCKING product findings. All six original 03.5 blockers are repaired with evidence; R1–R15 implemented and tested; C1–C14 constraints
addressed in source. Remaining UNVERIFIED items are live-only (Phase 5) and are honestly bounded, not hidden.

## Blocking-finding ledger (original 03.5 → disposition)

| # | Original 03.5 blocker | Disposition | Evidence |
|---|---|---|---|
| 1 | R2/R3/R9: foldLadder/rankEndpoints had test-only callers; no evidence-driven materialization | RESOLVED | public cli.ts:6321 materializeDerivedLadders → operations.materializeRouteLadders → index.ts POST /operator/learning/materialize-route-ladders → track-b-operations.ts → runtime-operations-server.mjs (private) → shared/route-learning/route-ladder-materialization.mjs (Effect host op). Private worker answers host_adapter_required (knowledge-worker/index.mjs). Private tests: run105-production-materialization.test.mjs (resume/CAS/regression/removal). |
| 2 | R1/R5: cli.ts publisher invoked source per scope without role/task → always unavailable | RESOLVED | cli.ts:3724 startDurableRouteAdvisoryRefresh keyset-pages knowledge:list-route-ladders (limit 200, cursor, 2000 budget) and reads/publishes each exact (scope, role, task); serialized via refreshing flag. Test run105-review-live-advisory-publisher PASS (incl. >64-pair paging, no-overlap). |
| 3 | Controlled activation: fabricated confidence=1/cohortPercent=100, no age/safety | RESOLVED | route-advisory-source.ts:163-337: knowledge:read-route-ladder + content-addressed route_ladder_evidence doc (sha256 digest match), measured confidence = min(per-endpoint mean) (L319), freshness from persisted evidenceAtMs, cohort from rollout-state+policy stage, kill switch + sustained-guardrail suppressors re-checked, rolledBack refusal. |
| 4 | R10/R12: UI toggle route did not match backend | RESOLVED | learning.tsx:1714 toggleLadder → learning-api.ts rollbackLearningLadder → existing POST /operator/learning/rollback-pack {scopeId,roleId,taskTypeId,rolledBack,reason} → runtime-operations-server.mjs:2993 dual dispatch (composite key → knowledge:land-route-ladder-rollback; else legacy rollbackPack byte-identical). Private roundtrip tests: run105-e5-ladder-rollback-roundtrip, run105-r10-route-ladder-rollback-store. |
| 5 | PROCESS: D/E active after Phase 3 lock; premature acceptance claims | RESOLVED-as-process | 03-implementation-summary claims withdrawn in addendum-03; addenda 05–08 preserve scope with explicit FAIL gates; no historical PASS invented. This report is the current-phase closure evidence. |
| 6 | PROCESS: canonical verify-locks missing gate results; stale plan prerequisite path | RESOLVED-as-process | workflow-integrity-audit.md (evidence, FAIL declared); addendum-06 records effective diff bases; no receipt edited silently. |

## Requirements audit (R1–R15)

Statuses: PASS (source call chain + tests), FAIL (counterexample), UNVERIFIED (no permitted evidence).

### R1 — per-(role, task) ladder, exact match, no scope-wide packs — PASS
- Public router.ts:174-187: role gate added with SAME advisory_task_mismatch code (no new vocabulary); requestRoleId from index.ts:26440 buildRequestClassificationForPlan.
- Legacy scope-only path retained only when BOTH fields absent (route-advisory-source.ts:179 readLegacyScopeAdvisory; index.ts:26466).
- Migration: private knowledge-store/index.mjs one-time meta-guarded pass clears scope-wide activePackageId/cohortStep/cohortPercent.
- Tests: run105-c-router-ladder-walk (9/9 rerun PASS), run105-c-durable-advisory-role-key, run105-review-advisory-cache (exact key), run105-r01-activation-key, run105-r07-rollout-key-migration.
- A1 (taxonomyVersion provenance, gate unchanged): router.ts:128-131 taxonomy gate byte-identical; test run105-review-router-safety asserts refusal.

### R2 — materialized snapshot, version-guarded serialized rewrite — PASS
- Store: knowledge-store/index.mjs writeRouteLadder:463 (BEGIN IMMEDIATE; applyRungRewrite expectedVersion CAS; stale discard); route-ladder.mjs applyRungRewrite:119.
- Materialization: route-ladder-materialization.mjs (regression freeze, previous-ladder authority, removal keeps evidence).
- **Divergence D-1 (FAIL at 4d78ce60 → FIXED at da40a115):** at 4d78 the regression branch appended newly ranked rungs onto the preserved prior snapshot, which could mix admission policies (strict reader must refuse mixed metadata). da40a115 (materialization.mjs:99-107) freezes the ENTIRE prior ranking/proof on regression and defers new admissions; new test "safety: mixed policy regression freezes prior snapshot and defers new admissions" added. Verified by diff 4d78ce60..da40a115 (2 files, code+test only).
- Tests: run105-route-ladder-store, run105-review-store-cas, run105-production-materialization.

### R3 — pairwise-to-total-order aggregation, deterministic — PASS
- Private ladder-aggregation.mjs: weightedVerdict (w = confidence×agreement; tie = 0), rankEndpoints:395 (rankScore desc; tie-break by direct h2h within score group, fewer losses, more wins, weighted count, endpoint id), admissionFloor:502, foldLadder:545 (ScopeMismatch/InsufficientEvidence).
- Authentic shape: winner resolved via winnerTrialId→members[].candidateRef; confidence = winning MEMBER's own (no borrowing); flat legacy shape still supported.
- Determinism: dedupe by groupId (lexicographic-first canonical form), fold in groupId order.
- Tests: run105-a1-weighted-verdict, run105-a2-total-order, run105-a4-scope-join, run105-a5-admission-floor, run105-review-aggregation (private). Public host: run105-review-challenge-evidence (paired; my public-only run of this file fails to resolve extensions/evaluation-core via a stale private path — environmental, not a product defect).

### R4 — stored status vs per-request eligibility as separate filters — PASS
- route-advisory-ladder.ts:66 resolveAdvisoryRung: skips ONLY status==='unavailable' or not-in-eligible-set; NOT band-aware (A2). Rung contract Schema.Literal status in core/types.ts + private route-ladder.mjs normalizeRungs.
- Denominator: configured set; removal leaves denominator (materialization completeness; challenge-batch.mjs completionOf; store normalizeCompleteness).
- Tests: run105-c-router-ladder-walk (fall-through cases), run105-review-router-safety.

### R5 — advisory_only ladder walk; existing gates unchanged — PASS
- router.ts:199-268: walk → walked rung replaces single preference; same confidence/cohort/band/exploration math afterward; no-ladder branch byte-identical (back-compat); Starved → advisory_candidate_not_eligible (no new vocabulary). Gates unchanged (R5 regression suites green: run98-r05, run99-r33).
- A2 recorded: band is a gate not a walk filter; design doc corrected (ladder rank ≠ score rank; deeper rung CAN influence).
- Tests: run105-c-router-ladder-walk (9/9), run105-review-router-safety (31/31), run105-c-advisory-rung-observation (3/3). Rerun: core 72/72 PASS.

### R6 — immutable pairwise record + created_at — PASS
- Private evaluation-core/index.mjs:3398 finalizeComparisonGroup (+reject site): PRAGMA-guarded lazy created_at_ms column (D5; run107 positional INSERTs stay green); list-groups projects createdAtMs as row sibling, never inside digest-checked group_json/result_json; legacy rows null.
- Tests: run105-a3-created-at; run107-group-paging regression green.

### R7 — SQLite WAL, additive knowledge_route_ladders, (role_id, task_type_id) UNIQUE — PASS
- knowledge-store/index.mjs constructor: WAL + busy_timeout=5000; CREATE TABLE knowledge_route_ladders + UNIQUE INDEX role_task_key; additive migration (SCHEMA_VERSION unbumped, meta-marker idempotent).
- Single indexed read: readRouteLadder (#ladderRow by PK). C2 respected: closed ExperiencePackCandidateV1 untouched; ladder outside learning_records (design divergence from original R7 wording — resolved by plan D1, recorded in addendum-05 Source Conflict Reconciliation).
- Foreign runtime scope fails closed (scope_id match check).
- Tests: run105-route-ladder-store, run105-r02-contract-additive, run105-review-store-pagination, run105-e5-ladder-index-readback (public+private).

### R8 — depth-first dispatch, starvation fix, queue rounds, challenge — PASS
- Focus: route-ladder-dispatch.ts selectFocusTask:263 (most-requested then most-unfilled, deterministic), planFocusDispatch:332 (NoReplayableRequest), planChallenge:537 (top-down, batch-bound), challenge-batch.mjs planChallengeBatch:25.
- Starvation fix: track-b-auto-replay-runtime.ts:1325 loop — held focus only while fillable; NoReplayableRequest tasks are SKIPPED (filtered out) rather than rethrown to kill the tick; counter reported.
- Queue rounds: dispatchRoundId threaded cli.ts executor → track-b-auto-replay.ts runAutoReplayTick (idempotency key + ledger policyDigest namespaced per round) → queue-runtime/queues.ts:97 enqueueReplayDispatch (jobId = replay-round-sha256(captureRef, sorted endpointIds, policySetDigest, roundId); absent round keeps legacy capture-ref id) → worker dispatchCapture(captureRef, dispatchRoundId); stage mode releases+defers on queue offer refusal (no secret execution); rollback re-read before each sequential arm (track-b-auto-replay-runtime.ts:1572); claimed-round mismatch throws.
- Census/evidence: route-ladder-census.ts:27, route-challenge-evidence.ts:107/148 (authenticated complete walks; no verdict synthesis).
- Tests (rerun PASS): run105-r08-focus-task-selection, run105-r08-idle-refresh-and-challenge, run105-review-queue-round, run105-review-cli-round-identity, run105-review-census, run105-review-dispatch (green in controller logs).

### R9 — derived activation, no promote-then-activate — PASS
- route-ladder-dispatch.ts:454 evaluateRouteLadderActivation (floor on endpoint's OWN comparisons; admitted ∩ configured; shadow candidates; InsufficientEvidence → no advisory).
- cli.ts:6266 learner sweep NO LONGER calls knowledge:activate-pack; legacy machinery untouched for run-98/run-107 surfaces (documented in code).
- Tests: run105-r09-derived-activation (rerun 5/5 PASS), run105-review-dispatch, run107-rollout-top-of-ladder regression.

### R10 — per-task rollback toggle, reversible, replay paused — PASS
- Store: setRouteLadderRollback:532 / landRouteLadderRollback (writes ONLY the ladder row; never rollbackPack/rolledBackWithValidationReceiptId — D8); reason kept on roll-forward.
- Advisory: rolledBack.on → refuse "rolled back" (route-advisory-source.ts:203).
- Dispatch: census excludes rolledBack candidates (selectFocusTask filter), per-arm re-check.
- UI→backend round trip verified (blocker #4). Tests: run105-r10-per-task-rollback (rerun 4/4), run105-r10-rollback-flag, run105-r10-route-ladder-rollback-store, run105-e5-ladder-rollback-roundtrip (private).

### R11 — product-defaults routeLearning block + net-new read path — PASS
- product-defaults-file.ts:213 readRouteLearningDefaults: durable state → guidance copy → documented constants; NEVER throws; per-field bounded refusal. Shipped guidance block + schema added (fixtures). learning-integrity.mjs 0.7 untouched (C4/D6).
- Tests: run105-r11-product-defaults-loader (rerun PASS), run105-package-runtime-alignment (private).

### R12 — Packs page ladder index + uncertainty disclosure — PASS (live browser UI: UNVERIFIED)
- learning.tsx:917 LearningLadderRow: raw ids (A3), top-3, completeness "N / M admitted", Active/Rolled back badge (derived), detail view, two-way toggle disabled with honest reason when no ladder/unreported.
- **Uncertainty disclosure:** learning-ladder.ts normalizeLadderRows/topLadderEndpoints never fabricate ("not reported", laddersState unavailable/not_asked notes in LearningLadderIndex); compareLadderRows:163 deterministic complete-first ordering.
- Tests: learning-ladder.test.ts, learning-ladder-index.test.tsx, learning.test.tsx, run105-review-ladder-detail.test.tsx; controller: 684 UI tests.
- UNVERIFIED (live-only): browser/vision inspection of the Packs page on :3458 (Phase 5, deepseek-flash delegation — agent identity not independently verified, per audit scope).

### R13 — Effect-first with pinned primitive map; recorded exceptions — PASS (constraint)
- A: Chunk/HashMap/Option/Schema/Data.TaggedEnum/TaggedError/pure Effect foldLadder. C: Schema, TaggedEnum RungWalkOutcome, TaggedError decode. D: Schema+check, taggedEnum RouteLadderState, four TaggedError, Effect+Schedule+Duration+Clock+Ref. B/E: plain mjs/TS with reasons recorded (extension store has zero Effect imports; runtime-ui has zero Effect and no dependency). core gained effect workspace dep. Queue NOT used in D — existing replay-intent plane reused, reason recorded.

### R14 — lifecycle states, active derived — PASS
- Private route-ladder.mjs deriveLifecycleState / public route-ladder-dispatch.ts deriveRouteLadderState (no_ladder|partial|complete|rolled_back; active never stored). Store surfaces lifecycleState in state/list readbacks. Tests: run105-r14-pack-lifecycle, run105-review-store-cas, run105-a5.

### R15 — bounded telemetry, primary failure preservation, 16 KiB user-approved — PASS (recorded residuals)
- Root cause verified (addendum-04): 8 count-limited failedAttempts copied errorPreview.message verbatim; UTF-8/JSON escaping > 16 KiB; secondary persist threw before primary insert; IPC frame limit unrelated.
- Repair (public): legacy-migration.ts:1713 projectRuntimeTelemetryFailureDimensions (512 B serialized-UTF-8 JSON previews, 8 attempts, 8 KiB diagnostic aggregate, fact-first eviction, diagnostic_facts_budget honest receipt, artifactRef pointer); :1809 boundRuntimeTelemetryFailureStub (final-envelope budget, eviction order, compactTruncation metadata); index.ts:5091 persistRuntimeTelemetryFailure integrates both; 16 KiB global guard UNCHANGED.
- Bridge: failure-telemetry-persistence.ts:5 persistFailureTelemetrySafely; index.ts marks persisted/emits update only on success; fixed sanitized diagnostic.
- User-approved cap: addendum-09 + r15-cap-recommendation.md — 16 KiB SQLite inline metadata retained for footprint/latency (storage policy, not request-body limit; not a claim of optimality); 256 KiB targeted raise documented as potentially reasonable with redaction/pagination/retention.
- LIVE dev :3458 receipts: followup2/live-receipt.md (commit 2f9db9b5, exe 37ee0503…, source-bound health) — REAL routed POSTs: 120020 B ASCII / 300019 B UTF-8 messages → HTTP 422 execution_failed preserved; persisted observation 6305/6301 B, dimensions 984/983 B (original 240535 B), previews 512/511 B, messageTruncated + exact original byte counts, zero secondary-400; controller corroborated runtime log and health.
- Recorded residuals (not hidden): no artifactRef/graph pointer existed in the live routed path (graph-original preservation NOT claimed live); storage faults injected at the persistence seam, not physical fs faults (r15-bridge-repair.md discloses). In-scope per user authorization ("or artifact-backed evidence" — preview+truncation half verified).
- Tests (rerun PASS): run105-r15-primary-failure (4), run105-telemetry-failure-size-limit, run105-telemetry-failure-dimensions; private run105 suite includes backend 4/4.

## Constraints audit (C1–C14)

| C | Constraint | Disposition |
|---|---|---|
| C1 | closed ExperiencePackCandidateV1 | RESOLVED: ladder in new knowledge_route_ladders table; contract untouched. |
| C2 | recordLearning immutable | RESOLVED: new mutable table, never learning_records rewrites. |
| C3 | no (role, task) key on comparison groups | RESOLVED: join via group's OWN comparability.roleId/taskTypeId (scopeOfGroup); taskRef never consulted. |
| C4 | 0.7 integrity gate ≠ floor | RESOLVED: admissionFloor is new quantity over endpoint's own member confidences; learning-integrity.mjs untouched (D6). |
| C5 | cohort seed re-key | RESOLVED: cohortSeedScopeFor — composite seed ONLY when caller supplies classification; legacy scope seed byte-identical (knowledge-store rolloutCohort). |
| C6 | non-additive PK change | RESOLVED: additive table + additive migration; SCHEMA_VERSION unbumped. |
| C7 | taxonomyVersion uncontracted | RESOLVED: added to $defs.scope (schema + generated + v1.1-contracts); provenance only (A1). |
| C8 | two-step promote-then-activate | RESOLVED: derived activation; legacy machinery retained for historical surface (run-107 asserts it). |
| C9 | toggle vs 3 rollback paths | RESOLVED: toggle writes only ladder row (D8); guardrail auto-rollback and kill switch checked in advisory source, never write per-task flags. |
| C10 | "ladder" overloaded | RESOLVED: endpoint ladder named routeLadder/rungs everywhere (D9). |
| C11 | no roleId in advisory layer | RESOLVED: roleId through source, cache key (channel scope role task), recall, observation; byte-compat when absent. |
| C12 | single-shot swap vs walk | RESOLVED: walk chooses the ONE advised rung; swap/propensity math unchanged (A2). |
| C13 | observation records one package | RESOLVED: advisoryLadderLength/RungRank/RungWalked/RungSkipped (bounded) + ledger totals rungWalked/rungApplied. |
| C14 | field-name/vocabulary mismatches | RESOLVED: advisoryPackageEligible/eligibleEndpointCount declared on outcome; advisory_task_avoided/stage_below_s2 real strings preserved; family-filter doc comment untouched (harmless fail-closed). |

## Test truth (this review's own runs, public clean build worktree E:/tmp/run105-full-public @83308e29)

- core: run105-c-router-ladder-walk 9/9, run105-d-route-ladder-dispatch 32/32, run105-review-router-safety 31/31 → 72/72 PASS.
- host-bridge: 19 run105 files → 18 files / 159 tests PASS, 24 skipped. The one failed suite (run105-review-challenge-evidence) fails to resolve
  extensions/evaluation-core/index.mjs via a stale private-worktree path (E:\role-model-internal\.worktrees\run105-full-public) that only the paired private
  checkout provides — environmental pairing issue, not a product defect; parent's paired private suite reports 159/159.
- Pre-existing, NOT run105: run87-ci-portability single baseline failure (missing public track-b-projections.ts) reproduced on clean baseline; out of scope (documented in run memory + addenda).
- Not independently re-run here: private paired suite (parent: 159/159), UI 684 (parent), full host suite (controller log: 6 failures → 3 repaired by approved test fixes + 1 unresolved retry/quota flake candidate, remaining-host-regression-audit.md).

## Design divergences — resolved / unresolved

Resolved (design doc updated; both requirements and doc now agree):
1. Storage: learning_records kind='pack' → additive knowledge_route_ladders table (D1; addendum-05 conflict reconciliation).
2. taxonomyVersion: provenance only; router gate unchanged (A1).
3. Band-unaware walk; A2's "deeper rung always matches leader" prediction corrected — ladder rank ≠ score rank; deeper routable rung CAN influence (design doc "Production publication and safety authority").
4. Raw (roleId, taskTypeId) ids rendered, no display-name plumbing (A3).
5. R11: read path is net-new; learning-integrity 0.7 remains a different quantity (C4/D6).
6. R15 late scope: approved 16 KiB metadata budget; explicit truncation metadata; primary failure preservation (addenda 02/04/09).
7. Ladder admission regression handling: mixed-policy freeze at da40a115 (D-1, resolved in final build pair).
8. Effect exceptions recorded per package (R13).

Unresolved (recorded, non-blocking, live-only):
- Phase 5 browser/vision UI verification on :3458 and final-build live pi-request advisory walk verification not yet evidenced (dev-only boundary respected).
- R15 live path has no artifactRef/graph pointer for routed failures (graph-original preservation unclaimed); fault injection at seam not physical fs.
- Retry/quota full-suite flake in index.test.ts unresolved (not a proven regression; parent-owned investigation).
- Historical gates of phases 0–3 lack explicit PASS lines (workflow-integrity-audit); being compensated by addenda + this report.

## Blocking findings & severity

- Product code: NONE blocking. (The only FAIL at the pinned private 4d78ce60 — mixed-policy ladder admission — is fixed at final da40a115.)
- Severity LOW: R15 graph-artifact absence in live routed path (recorded residual, user-scoped).
- Severity LOW (process): 03.5-code-review.md remains DRAFT until this report is accepted; addenda 05–08 gates are FAIL by design (scope preservation, no invented PASS).
- Severity INFO: run87-ci-portability pre-existing baseline failure; NOT a run105 regression.

## Method notes / anti-false-PASS

- Every PASS above cites a source call chain (file:line) plus a test that exercises it; green helpers were not treated as live-completion evidence.
- Live claims are limited to what receipts show (R15 followup2 on :3458); no live routing/UI verification is claimed by this report.
- Model identity of delegated subagents is unverified per audit scope; external CLI unavailability was controller-supplied, not reprobed.
- No product file was written by this review; this document is a new evidence file only.
