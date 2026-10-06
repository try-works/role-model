Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `05 Manual QA`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/05-manual-qa.md`
- `/.recursive/run/105-route-learning-matching-scope-activation/00-requirements.md`
Outputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/addenda/05-manual-qa.live-pi-replay-startup.addendum-11.md`
Scope note: Corrects Phase 5 acceptance after authoritative analysis of real Pi CLI traffic on development :3458 only.

## TODO
- [x] Correlate real Pi requests at runtime rather than the downstream provider boundary.
- [x] Prove taxonomy and durable capture for the user's requests.
- [x] Reproduce and repair the fresh-queue replay startup blocker under RED/GREEN.
- [ ] Rebuild, restart only :3458, and prove replay/evaluation/ladder/advisory.

## Correction
The downstream mock does not receive `role_model.intent` because the role-model runtime consumes that advisory metadata. A null provider-side field is not evidence of missing Pi metadata. Runtime request details are authoritative.

## Live Finding
Twenty of twenty recent Pi requests carried exact runtime taxonomy and had readable durable captures. The busiest pair was `coder|coder.edit` with five captures. None entered replay. Auto-replay reported `route pending dispatches unavailable`, zero replay/evaluation jobs and zero queue rows.

## Root Cause
`readPendingRouteDispatches` treated the queue readback `{available:false, reason:"queue store has no rows yet", jobs:[]}` as an unavailable/incomplete authority and returned null. On a fresh runtime this is a complete empty queue. The null aborts the first tick before dispatch, permanently preventing initial ladder construction.

## TDD
RED: added `fresh queue store with no rows is a complete empty pending-dispatch projection`; received null instead of []. GREEN: accept only that exact bounded empty-store shape as complete while every other unavailable, malformed or saturated projection remains fail-closed. Focused challenge suite25/25; adjacent replay/queue suites76/76 plus typecheck PASS.

## Second Live Finding
The authoritative queue shape fix at public `7d1c06ee` still degraded because the CLI callback resolved the durable Evaluation Core authority before performing read-only Replay Core/queue inspection. The preserved state intentionally had no managed `artifact-digest.key`; the resolver threw and the callback collapsed it to null before either pending plane was read.

## Second TDD Repair
RED: the real production callback test makes `resolveDurableEvaluationAuthority` throw and requires pending replay/queue projection to remain readable; it previously returned null. GREEN: remove authority resolution from the Replay Core-only pending callback and make the shared envelope authority optional/omitted there. Evaluation/finalization callbacks retain the authority. Adjacent76/76 plus typecheck PASS.

## Third Live Finding
After genuine ladder materialization (`coder|coder.edit`, two rungs) and a post-ladder real Pi request, the advisory observation recorded `roleId: coder` but `requestTaskTypeId: null` even though the same request persisted `taxonomy_task_type: coder.edit`. Root cause: `requestTaskTypeId` read `plan.routingRequest.taskType` directly while the role beside it resolved through `buildRequestClassificationForPlan`, so an intent/identity-resolved task never reached the exact `(role, task)` advisory key.

## Third TDD Repair
RED (source assertion + live observation): `requestTaskTypeId` must use `buildRequestClassificationForPlan(plan)?.taskTypeId`, never the raw `plan.routingRequest.taskType`. GREEN: 100 focused/adjacent classification+advisory+dispatch tests plus typecheck PASS.

## Source Checkpoint
Final public `9bbed4f1a26a43a487bd44e359f7a6613e02c6a6`, tree `10d09a5a49cc3953c721eb8ee400acc7386d1175`; private remains `da40a115`.

## Traceability
R1 classified exact pair; R8 real demand/replay dispatch; R9 genuine evaluation evidence; Phase5 real Pi end-to-end acceptance.

## Coverage Gate
Coverage: FAIL (live rebuilt proof pending)
## Approval Gate
Approval: FAIL (live rebuilt proof pending)

## Residual (documented, non-fabricated)
The full pipeline is proven live: real Pi requests classify `coder|coder.edit`, genuine supervised-replay groups finalize, the ladder materializes (flash-max rank 1, v4-pro rank 2, active v1), the durable advisory publisher refreshes `pairs=1 stage=S4`, and routing selects the ladder rung. A residual remains under investigation for the re-run review: the auto-replay census refused `32 capture(s) as no_route_classification` even though those requests' telemetry `taxonomyDimensions` show `coder`/`coder.edit`, and the advisory observation records `roleId:null`/`requestTaskTypeId:null` for a post-ladder Pi request while the ladder is active. This points to a divergence between the telemetry taxonomy derivation (`buildBridgeTaxonomyIdentity`) and the capture/advisory classification chain (`buildRequestClassificationForPlan`) for Pi-originated requests that declare no top-level task. Not fabricated as PASS.


## Review Finding (R1/R8 blocker) — fixed
Independent Phase 3.5 review (final-review-9bbed4f1.md) returned FAIL with one blocking R1/R8 finding: `buildRequestClassificationForPlan` resolved role/task from the runtime-policy identifiers `plan.routingRequest.taskType` / `requestedRoleId` (not taxonomy ids), so `buildRequestClassification` stopped on a non-taxonomy declaration and returned null even though `buildBridgeTaxonomyIdentity` had already resolved a genuine `coder|coder.edit` identity. Result: telemetry showed coder/edit and the ladder was active, yet the capture/advisory classification was null and the request was refused `no_route_classification` (32 captures) with no advisory.

## Fix (a8f1b22e)
`buildRequestClassificationForPlan` now uses the authoritative resolved `plan.taxonomyIdentity` (the same source `buildBridgeTaxonomyIdentity` produces), and drops its `text.chat` task / correlated `writer` role defaults so a genuinely unclassified request stays null. Behavioural tests replaced the source-assertion (genuine coder.edit/coder resolves; text.chat/writer defaults drop to null). 38/38 focused + typecheck PASS. Full host suite re-run pending.

## Source Checkpoint (latest)
Public `a8f1b22ed9e60eb78a67c3dc596710cd5cc062b8`, tree `6c5283fa198f1b172c449f92ba4cfb9361e4dbf7`; private remains `da40a115`.

