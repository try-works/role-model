# Final Review — 9bbed4f1 (Run 105 Phase 3.5, LIVE Phase 5 repairs)

- **Run**: `/.recursive/run/105-route-learning-matching-scope-activation/`
- **Phase**: 03.5 Code Review (final source, LIVE Phase 5 repair delta since 7162930d)
- **Public worktree**: `D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation`
- **Public commit**: `9bbed4f1a26a43a487bd44e359f7a6613e02c6a6` (tree `10d09a5a49cc3953c721eb8ee400acc7386d1175`)
- **Private commit**: `da40a115237432b248f6b5282a4ac42f8fb90179`
- **Repairs under review**: 7d1c06ee (fresh-empty queue projection), 80ad810e (authority decoupling), 9bbed4f1 (advisory task key via classification chain); plus e26bbc83 (dispatch classified captures) which sits between 7162930d and the three repairs.
- **Method**: read-only static review of source + existing evidence. No tests, no build, no ports :3457/:3458 touched.
- **Inputs read**: 00-requirements.md (R1–R14) + R15 late source, 03.5-code-review.final-draft.md, addendum 11, evidence/phase35 final reviews, evidence/phase5/pi-intent-e2e + pi-live.

---

## VERDICT

**FAIL — one blocking finding (R1 classification-chain divergence), plus one incomplete repair.**

- Repair 1 (7d1c06ee) — **PASS**: fail-closed, minimal.
- Repair 2 (80ad810e) — **PASS**: fail-closed, minimal; no mutation path downgraded.
- Repair 3 (9bbed4f1) — **PARTIAL**: direction correct and minimal, but it does not resolve the underlying
  divergence, and its verification is a source-text assertion rather than a behavioural proof.
- **Live finding (32 captures refused `no_route_classification`; advisory observation `roleId:null`/`requestTaskTypeId:null`
  while the ladder `coder|coder.edit` is active) — BLOCKING R1 violation, not a documented residual.**

---

## Repair 1 — route-challenge-evidence.ts canonical fresh-empty replay queue projection (7d1c06ee)

File: `role-model-router/apps/runtime-host-bridge/src/route-challenge-evidence.ts` (readPendingRouteDispatches, ~L206-218).

- **Before**: `freshEmptyQueue = page?.available === false && page.reason === "queue store has no rows yet" && jobs.length === 0`.
- **After**: `freshEmptyQueue = page?.schemaVersion === "role-model.operator-queue-jobs.v1" && page.queue === "replay.dispatch" && page.available === false && Array.isArray(page.jobs) && page.jobs.length === 0`.

Assessment:
- The detection is now anchored to the canonical operator-queue projection identity (schema version + queue name + empty jobs) instead of a brittle free-text `reason` string. This is **more** fail-closed, not less: a saturated/partial projection (`available:true`, `jobs.length>=500`), a malformed page, or a genuine unavailability that lacks the canonical shape all fall through to the existing `return null` at L218 (`!page || (!freshEmptyQueue && page.available !== true) || !Array.isArray(page.jobs) || page.jobs.length >= 500`).
- The only accepted "complete empty" shape is the documented uncreated-store projection. Genuine authority failure still returns null. **Fail-closed holds.**
- Diff is 4 insertions / 3 deletions plus the matching test update — **minimal**.

**Verdict: PASS.**

---

## Repair 2 — cli.ts decouple read-only replay/queue pending reads from Evaluation Core authority (80ad810e)

File: `role-model-router/apps/runtime-host-bridge/src/cli.ts`.

- The `readPendingRouteDispatches` callback (L7202-7226) no longer calls `resolveDurableEvaluationAuthority` and no longer passes `evaluationAuthoritySecret` into `learnerSweepEnvelope` for the pending read. The shared envelope makes `evaluationAuthoritySecret` optional and only spreads it when present (L5541, L5555-5557).
- This is correct: `readPendingRouteDispatches` invokes **Replay Core only** (`replay:list-jobs`, `replay:job`) plus local capture/queue reads; it never touches Evaluation Core (verified in route-challenge-evidence.ts L170-248). Requiring the evaluation authority there made a fresh runtime with no managed evaluation key collapse to `null` before either pending plane was read.

**Authority is retained on every finalized/evaluation path and every mutation path** (verified):
- `readFinalizedRouteChallenge` callback — resolves authority at L7242 and passes it at L7254.
- `readRouteDispatchEvidence` callback — resolves authority at L7264 and passes it at L7276.
- `learnFromUnconsumedCandidates` (validate/promote mutation) — resolves authority, early-returns `{scanned:0,...}` when absent (L5656-5670, L5685).
- Derivation pass — resolves authority, early-returns when absent, passes it (L6356-6367, L6404).
- `sweepFinalizationSignals` — resolves authority, early-returns when absent, passes it (L6580-6591, L6615).

No mutation path is downgraded; the only authority removal is on the genuinely read-only Replay-Core pending read. The production-callback test now makes `resolveDurableEvaluationAuthority` throw and asserts the pending projection is still readable (run105-review-challenge-evidence.test.ts). **Fail-closed + minimal hold.**

**Verdict: PASS.**

---

## Repair 3 — index.ts advisory task key via buildRequestClassificationForPlan (9bbed4f1)

File: `role-model-router/apps/runtime-host-bridge/src/index.ts` (L26445).

- **Before**: `const requestTaskTypeId = plan.routingRequest.taskType ?? null;`
- **After**: `const requestTaskTypeId = buildRequestClassificationForPlan(plan)?.taskTypeId ?? null;`

Direction is correct: the task key must resolve through the same chain as the role (`requestRoleId = buildRequestClassificationForPlan(plan)?.roleId ?? null`, L26450), so an intent/identity-resolved task reaches the exact `(role, task)` advisory key. The diff is minimal (1 production line + a source-assertion test).

**But this repair is incomplete and its test is weak:**
1. The added test (run104-sp4-taxonomy-fallback.test.ts) is a **source-text assertion** — it asserts the source contains the new expression and does not contain the old one. It does not execute the classification chain against a Pi-shaped plan, so it cannot catch that `buildRequestClassificationForPlan(plan)` itself still returns `roleId:null`/`taskTypeId:null` for these requests.
2. Live evidence (below) shows the **role** side — which was already on `buildRequestClassificationForPlan` before 9bbed4f1 — still records `null`, and the task side was only fixed at the expression level, not at the chain level.

**Verdict: PARTIAL (not sufficient to close the finding).**

---

## LIVE FINDING — route-capture/advisory classification chain diverges from telemetry taxonomy derivation (BLOCKING R1)

### Evidence (decisive)

`evidence/phase5/pi-intent-e2e/final-task-key-proof.json` and `post-final-tick.json`/`bounded-ticks.json` show the same single request (`req-ad3b7f75-...`):

- **Telemetry `taxonomyDimensions`** (produced by `buildBridgeTaxonomyIdentity`): `taxonomy_role_id: "coder"`, `taxonomy_task_type: "coder.edit"`, group `engineering`.
- **Advisory observation** (`role-model.route-advisory-observation.v1`): `advisoryState: "unavailable"`, `roleId: null`, `taskTypeId: null`, `requestTaskTypeId: null`, `taxonomyVersion: null`, `toolClassIds: []`.
- **Ladder**: active for `coder|coder.edit` (two rungs), `taxonomyVersion: "1.0.0-alpha.1"`.
- **Dispatch status** (`post-final-tick.json`, `derive-coder-result.json`): `focusTaskKey: "coder\u0000coder.edit"`, `lastUnclassifiedCaptures: 32`.

So 32 captures are refused as `no_route_classification` while their telemetry taxonomy shows `coder|coder.edit`, and the advisory observation records a null request key while the `coder|coder.edit` ladder is active.

### Root cause (code-verified)

The two functions use **different inputs and different fallback/validation semantics**:

1. **`buildBridgeTaxonomyIdentity`** (index.ts L10467-10516) resolves `taskTypeId` from the raw declared intent task → local derivation → raw declared id → `"text.chat"`, and `roleId` from declared role → derived role → **`task.primaryRole`** → `"writer"`. It is **total**: it never returns null role/task. For a Pi request that sends no `role_model.intent` (the `hook-payload.jsonl` capture shows the Pi sends a bare OpenAI-compatible body), the local heuristic derivation produces `coder|coder.edit` and that lands in `plan.taxonomyIdentity`.

2. **`buildRequestClassificationForPlan` → `buildRequestClassification`** (index.ts L8313-8328, L8243-8303) resolves the task from `plan.routingRequest.taskType` (the routing-task field, which `applyRequestedRoleExecutionPolicy` can rewrite to a runtime-policy task identifier) → `plan.taxonomyIdentity.taskTypeId` → `intent.task.id`, and the role from `plan.routingRequest.requestedRoleId` (a runtime-policy role identifier) → `plan.taxonomyIdentity.roleId` → `intent.role.id`. Crucially:
   - The **task chain stops** on a non-null-but-non-taxonomy "declaration" (L8278-8286: `declaredTaskTypeId ? knownTaskTypes.has(...) ? declared : null : <identity fallback>` — the comment at L8266-8272 states "a declaration that names something unknown stops the chain").
   - The **role is a single validated value** (L8288-8289: `declaredRoleId && knownRoleIds.has(declaredRoleId) ? declaredRoleId : null`) — no `primaryRole`/default fallback, unlike `buildBridgeTaxonomyIdentity`.

Consequently, when `plan.routingRequest.taskType`/`requestedRoleId` carry runtime-policy identifiers that are absent from the shipped `canonicalTaxonomy` (the runtime policy is a distinct vocabulary from the taxonomy — cf. `inferHeuristicControllerCodeRoleTask` probing both `"coder.edit"` and `"code.edit"` at L1786-1788, and `normalizeRuntimeRoleId`/`legacyRuntimeRoleIdAliases` at L7344-7345), `buildRequestClassification` drops them and returns `roleId:null`/`taskTypeId:null`, while `buildBridgeTaxonomyIdentity` resolves the same request to `coder|coder.edit` through its derivation + `task.primaryRole` fallback.

The capture sites both use the diverging chain — the observation-bundle capture (`routeClassification = buildRequestClassificationForPlan(plan)`, L28529; `classification: routeClassification`, L28595) and the local-graph capture (`routeCaptureClassification = buildRequestClassificationForPlan(plan)`, L28625; `classification: routeCaptureClassification`, L28641) — so the capture's `classification` is null for these requests, which is exactly what the auto-replay runtime counts as `no_route_classification` (track-b-auto-replay-runtime.ts L1415-1420) and the terminal refusal code (track-b-replay-policy.ts L131-137).

### Classification: blocking R1 violation (not a documented residual)

- **R1** requires: "A request with a (role, task) classification is served by the pack whose key matches exactly." These requests **are** classified — the runtime routes, captures and evaluates them under `taxonomyDimensions = coder|coder.edit`, and the `coder|coder.edit` ladder is active — yet the capture/advisory chain records null and the advisory is never recalled (`advisoryState: unavailable`), so the matching pack is **not** served. This is a violation.
- **R8** requires: "Only classified requests enter the queue." The corollary the run relies on is that a *classified* request **does** enter; 32 classified requests are refused as unclassified. This is a violation of the intended dispatch gate, not a correct application of it.
- The divergence is **not** a documented residual: addendum 11 and the 9bbed4f1 message assert the task-key symmetry is fixed ("100 focused/adjacent tests PASS"), but the live evidence shows the underlying chain still returns null on both axes. There is no acceptance record classifying the telemetry-vs-capture vocabulary divergence as intentional.
- Severity is bounded (the refusal is fail-closed: no wrong-rung promotion, baseline routing is preserved, and the ladder can still be filled via the `coder|coder.edit` captures that *do* carry a declaration), but it defeats the core stage-3 outcome for the dominant real Pi traffic pattern (intent-less, derivation-classified requests).

---

## Requirement traceability (summary)

| R# | Finding |
|----|---------|
| R1 | **BLOCKED** — capture/advisory classification chain diverges from telemetry taxonomy derivation; classified Pi requests get null advisory key and are refused capture admission. |
| R2, R7 | PASS — additive `knowledge_route_ladders` (role,task) UNIQUE, monotonic version, WAL (unchanged this delta). |
| R3 | PASS — weighted-verdict fold + deterministic total order (unchanged this delta). |
| R4, R5 | PASS — stored status vs per-request eligibility separation; gated re-rank/advisory_only preserved (unchanged). |
| R6 | PASS — created_at on comparison groups (unchanged). |
| R8 | **BLOCKED** — classified captures refused as `no_route_classification`, so the depth-first fill starves for derivation-classified traffic. |
| R9 | PASS — derived floor-based activation (ladder materialized live). |
| R10 | PASS — per-task rollback flag (unchanged). |
| R11 | PASS — product-defaults read path (unchanged). |
| R12 | PASS — Packs ladder index (unchanged this delta). |
| R13 | PASS — Effect substrate (unchanged). |
| R14 | PASS — lifecycle states (unchanged). |
| R15 | PASS — telemetry budget/preservation repairs are outside this delta and already reviewed (unchanged). |

---

## Blockers

1. **R1/R8 classification-chain divergence (BLOCKING).** `buildRequestClassificationForPlan` (route-capture/advisory) resolves the task from `plan.routingRequest.taskType` and the role from `plan.routingRequest.requestedRoleId` (runtime-policy identifiers), validating against `canonicalTaxonomy`, and returns null when those are non-taxonomy identifiers — while `buildBridgeTaxonomyIdentity` (telemetry) resolves the same request to a non-null taxonomy role/task via its local derivation and `task.primaryRole` fallback. For intent-less Pi traffic this yields `roleId:null`/`requestTaskTypeId:null` with an active `coder|coder.edit` ladder and 32 refused captures. **This must be fixed (make the capture/advisory chain fall back to `plan.taxonomyIdentity` exactly as the telemetry chain does) and verified behaviourally, before Phase 3.5 re-locks.**

2. **Repair 3 verification is a source assertion.** The 9bbed4f1 test asserts source text, not behaviour. Replace/augment with a behavioural test that feeds a derivation-classified Pi plan through `buildRequestClassificationForPlan` and asserts `roleId==="coder" && taskTypeId==="coder.edit"`.

## Recommendations

- Align `buildRequestClassificationForPlan`'s role/task resolution with `buildBridgeTaxonomyIdentity`: use `plan.taxonomyIdentity.roleId`/`plan.taxonomyIdentity.taskTypeId` as the authoritative fallback (and drop the "non-taxonomy declaration stops the chain" behaviour, or explicitly document it as intended and gate admission on `taxonomyIdentity` instead of the raw routing fields).
- Re-run the pi-intent-e2e ladder+advisory readback after the fix and confirm `requestTaskTypeId/roleId === coder/coder.edit` and `lastUnclassifiedCaptures === 0` for the same traffic.
- Re-lock Phase 3.5 only after (a) the divergence fix lands with a behavioural RED/GREEN test, and (b) the live readback shows the advisory key populated while the ladder is active.

---

## Coverage / Approval gates

- Coverage: **FAIL** — the classification-chain divergence is unverified by the current source-assertion test.
- Approval: **FAIL** — blocking R1/R8 finding outstanding; repairs 1-2 may be accepted independently.


---

## RE-REVIEW ADDENDUM — a8f1b22e (tree 6c5283fa)

- **Commit**: `a8f1b22ed9e60eb78a67c3dc596710cd5cc062b8` ("align capture classification with authoritative taxonomy identity")
- **Delta**: `index.ts` (+25/-?) `buildRequestClassificationForPlan`; `run104-sp4-taxonomy-fallback.test.ts` (source-assertion → 3 behavioural tests).
- **Method**: read-only; source + tests verified. No tests/ports run by this reviewer.

### Confirmation — blocker RESOLVED

The prior blocker was: `buildRequestClassificationForPlan` read `plan.routingRequest.taskType`/`requestedRoleId`
(runtime-policy identifiers) as the authoritative source, so it diverged from `buildBridgeTaxonomyIdentity` (telemetry)
and returned `null` for derivation-classified Pi traffic.

The fix (index.ts L8313-8337):
1. Reads `plan.taxonomyIdentity` (the SAME source `buildBridgeTaxonomyIdentity` populated for telemetry) as authoritative.
2. `genuineTaskTypeId` = `identity.taskTypeId` only when it is a shipped taxonomy task (validated against `canonicalTaxonomy.tasks`),
   so the `"text.chat"` capability-default and any non-taxonomy fallback are dropped rather than stopping the chain.
3. `roleId` = `identity.roleId` only when `genuineTaskTypeId` is non-null, so the correlated `"writer"` default and any
   role-only half-key are dropped; a genuinely unclassified request stays `null`/null.

For the live `coder|coder.edit` case: `identity = { taskTypeId: "coder.edit", roleId: "coder" }` → `genuineTaskTypeId = "coder.edit"`,
`roleId = "coder"` → classification `(coder.edit, coder)`. The advisory key (`requestTaskTypeId`/`requestRoleId`, L26454/L26459)
and both capture sites (L28538 observation bundle, L28634 local-graph capture) now all resolve the same genuine identity. ✅

Fail-closed is preserved: `{ taskTypeId: "text.chat", roleId: "writer" }` → `genuineTaskTypeId = null` → `roleId = null`,
and the task chain's intent fallback returns null when no genuine taxonomy task exists → `(null, null)`. Verified by the
behavioural test "buildRequestClassificationForPlan drops the text.chat/writer defaults" (run104-sp4-taxonomy-fallback.test.ts L117-124). ✅

The source-assertion is replaced by three behavioural tests (L105-136): genuine identity resolves; text.chat/writer defaults drop to
null; advisory task key equals the resolved classification task. The `buildRequestClassification` raw-function tests (L22-103) still
pin the underlying validation semantics (unknown ids dropped, intent fallback, declared-wins). ✅

### Non-blocking observations

- **Role is now gated on a genuine task.** A request with a genuine taxonomy role but no genuine taxonomy task is now recorded
  `(null, null)` instead of a role-only half-key. This is MORE correct per R1 (an exact `(roleId, taskTypeId)` pair is required,
  and a role-only key can match no ladder) — recorded as an intentional behavioural tightening, not a regression.
- **The 32 historical captures with null classification are not retroactively reclassified** (data residual from the pre-fix build).
  New traffic classifies correctly; the already-materialised `coder|coder.edit` ladder (2 rungs) is unaffected and can be filled from
  post-fix captures. Not a code blocker.
- **Verification of test results is controller-reported**, not independently re-run here (read-only mandate): focused 38/38 + typecheck
  PASS reported; full host suite re-running at review time.

### Updated verdict

- Repair 1 (7d1c06ee): **PASS** (unchanged).
- Repair 2 (80ad810e): **PASS** (unchanged; authority retained on all finalized/evaluation + mutation paths).
- Repair 3 (9bbed4f1 → a8f1b22e): **PASS** — task key now resolved through the classification chain, and the chain itself is aligned
  with the authoritative taxonomy identity.
- **R1/R8 blocker: RESOLVED.**

### Updated gates

- Coverage: **PASS** (behavioural tests replace the weak source-assertion; focused 38/38 + typecheck PASS reported).
- Approval: **PASS — conditional on the re-running full host suite landing green and, ideally, one live readback on the rebuilt
  runtime showing `requestTaskTypeId/roleId === coder/coder.edit` with `lastUnclassifiedCaptures` no longer growing for new traffic.**
  No further source changes expected.
