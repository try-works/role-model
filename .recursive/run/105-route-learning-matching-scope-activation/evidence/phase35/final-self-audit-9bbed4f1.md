# Run 105 Final Phase 3.5 Self-Audit (final source 9bbed4f1)

Snapshot: public `9bbed4f1a26a43a487bd44e359f7a6613e02c6a6` tree `10d09a5a49cc3953c721eb8ee400acc7386d1175`; private `da40a115237432b248f6b5282a4ac42f8fb90179` tree `148cbe9d`.
Boundary: development :3458 only; :3457 never touched. Subagent reviewer was dispatched twice but failed with no artifact; this is the controller self-audit fallback (recursive-subagent skill).

## Live repairs since the previously-reviewed 7162930d
1. `route-challenge-evidence.ts` — accept the canonical fresh-empty replay queue projection `{schemaVersion:"role-model.operator-queue-jobs.v1", queue:"replay.dispatch", available:false, jobs:[]}` as a complete empty queue; all other unavailable/malformed/saturated shapes remain fail-closed. RED reproduced; GREEN. 25/25 challenge-evidence suite.
2. `cli.ts` — decouple read-only replay/queue pending reads from the Evaluation Core authority; the shared learner envelope authority field is optional and omitted there, while finalized/evaluation evidence callbacks still require it. RED (throwing authority resolver) reproduced; GREEN. 76/76 focused.
3. `index.ts` — resolve the advisory task key through `buildRequestClassificationForPlan(plan)?.taskTypeId` instead of the raw `plan.routingRequest.taskType`, so the role and task resolve through the SAME chain (R1 exact (role, task)). Source-assertion RED + live observation; GREEN. 100/100 focused + typecheck.

## Verification floor (final source)
Host bridge 2247 passed / 5 skipped, exit 0; private run105 159/159; UI 685/685; core 154/154. Exact full6 build: exe `9f4d861c…`, closure true, extension 13, 152 files, sealed clean. Final runtime healthy on :3458.

## Live end-to-end proof
Real Pi requests classify `coder|coder.edit` (telemetry taxonomy). Genuine supervised-replay groups finalized (5+). The `coder.edit` ladder materialized active v1 with rungs flash-max(1) and v4-pro(2). The durable advisory publisher refreshed `pairs=1 stage=S4`. Routing selects a ladder rung.

## Residual (documented, non-fabricated)
The auto-replay census refuses `32 capture(s)` as `no_route_classification` even though those requests' telemetry `taxonomyDimensions` show `coder|coder.edit`. This is a PRE-EXISTING divergence (present on the prior 80ad810e build, confirmed by comparing full5 vs full6 runtime logs) between the telemetry taxonomy derivation (`buildBridgeTaxonomyIdentity`) and the route-capture/advisory classification chain (`buildRequestClassificationForPlan`) for Pi-originated requests that declare no top-level task. The demonstrated ladder/advisory/routing feature is not blocked by it (the ladder was materialized from genuinely classified evidence), but automatic classified-capture admission for new Pi traffic has a known gap. Not fabricated as PASS.

## Verdict
NO BLOCKER for the demonstrated run-105 feature. Three live repairs are fail-closed and minimal; the residual is pre-existing and documented.
