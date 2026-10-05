# Run 105 Phase 1 (AS-IS) - Area A verification report

Baseline: public D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation @ 5796edb4 (701b8b8f verified as ancestor; `git diff 701b8b8f..HEAD -- role-model-router` is EMPTY, so all router/host content equals 701b8b8f); private @ c993b2f2, clean. Paths relative to role-model-router/. No files edited; no builds run. All claimed items verified; nothing left unverified.

## 1. Verified claims

### A1. router.ts: advisory codes, gate order, call sites, shape
File: packages/core/src/router.ts.
- Call-site function: line 1713 `export function routeRequest(input: RouteRequestInput): RouterDecisionRecord` - the ONLY call is at 1771, inside routeRequest. Line 1843 embeds the outcome into RouterDecisionRecord.
- `evaluateRouteAdvisoryConsideration` defined at router.ts:54; doc comment 45-53: advisory consulted only after hard eligibility and scoring; re-rank only within the configured score band.
- `advisory_task_unscoped` router.ts:126 `if (!advisoryTaskTypeId) return fallback("advisory_task_unscoped");`
- `advisory_task_mismatch` router.ts:127 `if (advisoryTaskTypeId !== requestTaskTypeId) return fallback("advisory_task_mismatch");`
- `advisory_candidate_not_eligible` router.ts:114 and 144.
- COMPLETE fallback-reason inventory in gate order:
  1. 106 `if (!advisory) return fallback("no_advisory");`
  2. 107 `if (advisory.advisoryState !== "fresh") return fallback(`advisory_${advisory.advisoryState}`);` (advisory_stale / advisory_unavailable)
  3. 108 `if (!ADVISORY_STAGES_WITH_INFLUENCE.has(advisory.stage)) return fallback("stage_below_s2");` - set at 34: Set(S2,S3,S4)
  4. 109 `if (advisory.killSwitch === true) return fallback("kill_switch_engaged");`
  5. 113-114 `if (!preferred || !input.eligibleEndpointIds.includes(preferred)) return fallback("advisory_candidate_not_eligible");`
  6. 124 `advisory_task_avoided` (avoidFor hit); 126 `advisory_task_unscoped`; 127 `advisory_task_mismatch`; 130 `advisory_taxonomy_mismatch` - all inside `if (requestTaskTypeId)` (120-132)
  7. 133 `if (confidence < advisory.minAdvisoryConfidence) return fallback("below_confidence_floor");`
  8. 138 `if (cohortPercent <= 0) return fallback("cohort_excluded");` ; 139 `if (bucket >= cohortPercent) return { ...fallback("cohort_excluded"), cohortBucket: bucket };` (FNV-1a bucket, 36-43)
  9. 144 `if (!leader || !advised) return fallback("advisory_candidate_not_eligible");`
  10. 146-147 `if (gap > band) return { ...fallback("outside_score_band"), scoreGapBefore: gap, cohortBucket: bucket };`
  11. 168 `fallbackReason: applied ? null : "advisory_matches_baseline"` (advised == leader after all gates pass)
- `RouteAdvisoryConsiderationInput` (types.ts:231-266): candidateId:string|null (233), preferredEndpointId:string|null (235), advisoryState fresh|stale|unavailable (236), confidence (237), advisoryId? (238), policyVersion? (239), stage S0-S4 (240), scoreBand (242), minAdvisoryConfidence (243), cohortPercent (245), explorationPercent? (247), killSwitch? (248), thresholdSetVersion? (249), taskTypeId?/taxonomyVersion?/preferredFor?/avoidFor? (257-260), requestTaxonomyVersion? (265).
- `RouteAdvisoryConsiderationOutcome` (types.ts:268-285): applied, explorationMode baseline|advisory_considered|advisory_exploration, selectionProbability, advisoryCandidateId, advisoryPackageId, advisoryConfidence, thresholdSetVersion, policyVersion, fallbackReason, scoreBand, scoreGapBefore, cohortBucket, advisoryTaskTypeId, requestTaskTypeId, advisoryTaxonomyVersion.
- Gated re-rank confirmed: chosen at 1788 `const chosen = advisoryPreferredIndex > 0 ? scored[advisoryPreferredIndex] : scored[0];` (index 1784-1787); exploration/propensity 148-158; 153 `const applied = preferred !== leader.endpoint_id;`.
- Wiring: input type travels as `advisoryConsideration?: RouteAdvisoryConsiderationInput` on `RouteRequestInput` (types.ts:228, comment 221-227). Passed at router.ts:1771-1783: scored list, eligibleEndpointIds, `decisionSeed: normalizedInput.request.requestId`, `advisory: normalizedInput.advisoryConsideration ?? null`, `requestTaskTypeId: normalizedInput.request.taskType ?? null`, `requestTaxonomyVersion: normalizedInput.advisoryConsideration?.requestTaxonomyVersion ?? null`.

### A2. route-advisory-source.ts - single preferred endpoint, not a ladder
File: apps/runtime-host-bridge/src/route-advisory-source.ts.
- 145: `rolloutAnswer = await input.invoke("knowledge:rollout-state", { scopeId, limit: 1 });` (comment 140-144: 16 KiB frame cap -> bound to one receipt). Reads rollout state, not a ladder.
- 161-162: `const activePackageId = boundedText(rollout.activePackageId); if (!activePackageId) return unavailable("no active pack", cohortPercent);` - ONE activePackageId per scope.
- One pack -> one endpoint: 186-196 `const packEntry = findRecord(packAnswer, activePackageId);` then `const routePackage = boundedText(packScope?.endpointId) ?? boundedText(packScope?.routePackage) ?? boundedText(asRecord(pack.routePackageAttribution)?.routePackage);`
- Returned object (237-252): { preferredRoutePackage, advisoryState, confidence, candidateId, advisoryId: activePackageId, cohortPercent, reason, taskTypeId, taxonomyVersion, revalidationDue } - single preferredRoutePackage, NO ladder/list, NO roleId, NO preferredFor/avoidFor (only taskTypeId/taxonomyVersion, 197-200).
- Gates inside the source: killSwitchAtMs 159-160; validation receipt existence 201-204; decision !== validate 209-211; confidenceLower 212-216; evidence window 217-223; revalidation interval 224-233 -> state fresh/stale at 239.
- Type-name asymmetry: TrackBRouteAdvisorySourceResult.preferredRoutePackage (21) is mapped to RouteAdvisoryConsiderationInput.preferredEndpointId at index.ts:26475.

### A3. Wiring into the request path
- index.ts (runtime-host-bridge), inside `routeExecutionRequest` (defined ~26395 within `toProposalWireContract`, 26097): stage gate 26423 `const advisoryConsideration = ["S2","S3","S4"].includes(learningStage) ? (() => {...})() : undefined;`
- Recall 26429-26444: `recallTrackBDurableRouteAdvisory({channel, scope: options.scopeId, taskTypeId: requestTaskTypeId, nowMs: Date.now(), maxAgeMs: learningPolicySnapshot?.effective.advisorySourceMaxAgeMs ?? 900000}) ?? recallNewestTrackBRouteAdvisory({...})` (durable wins; transient pipeline cache is fallback).
- Field mapping 26473-26502: candidateId (26474), `preferredEndpointId: cached.preferredRoutePackage` (26475), advisoryState/confidence/advisoryId, policyVersion, stage, scoreBand default 0.05 (26485-26488), minAdvisoryConfidence default 0.7 (26489-26492), cohortPercent via resolveAdvisoryCohortPercent (26467-26472; S3/S4 bound by rollout step, S2 keeps policy value - route-advisory-source.ts:63-76), explorationPercent default 0 (26494), killSwitch (26495), thresholdSetVersion, taskTypeId/taxonomyVersion (26499-26500), `requestTaxonomyVersion = taxonomyManifest.taxonomyVersion ?? null` (26422, 26501).
- Passed to routing at 26549: `...(advisoryConsideration ? { advisoryConsideration } : {}),` inside `computeRoute` -> `routeRuntimeRequest` (imported index.ts:51 from @role-model-router/protocol-routing). Forwarding confirmed: protocol-routing/src/index.ts:62 (param type) and 320-322 `...(input.advisoryConsideration ? { advisoryConsideration: input.advisoryConsideration } : {}),` into `routeInput` -> core routeRequest.
- Post-decision observation 26673-26734: outcome fields incl. advisoryPackageEligible/eligibleEndpointCount (26682-26683, 26725-26729), built via `buildLiveRouteAdvisoryObservation` (track-b-runtime.ts:7955) and appended to advisory-observations.json.
- cli.ts: `startDurableRouteAdvisoryRefresh` (3721-3801) is the publisher: skips S0/S1 (3754), calls readTrackBRouteAdvisorySourceFromRuntime (3757) -> readTrackBRouteAdvisoryFromRollout (track-b-runtime.ts:7643-7686), then rememberTrackBDurableRouteAdvisory (3771). Started at cli.ts:10606 after extension runtime boots; 15s interval default (3794).
- Durable cache: track-b-runtime.ts:7565-7597 rememberTrackBDurableRouteAdvisory keyed channel-NUL-scope (7568, MAX 128); recall 7599-7637. NOTE: recall body (7615-7616) fetches by channel/scope only despite doc-comment 7602-7605 claiming family filtering; family scoping is enforced later by the router's taskTypeId gate. `recallNewestTrackBRouteAdvisory` (7513-7538) iterates the legacy per-routePackage cache and DOES filter by taskTypeId (7529-7534). cli.ts does NOT call evaluateRouteAdvisoryConsideration or build RouteAdvisoryConsiderationInput (grep: only refresh wiring + rollout activePackageId comment at 6206-6207).

### A4. What a ladder walk replaces
Core one-pack -> one-endpoint lines:
- route-advisory-source.ts:161-162 (single rollout.activePackageId read), 186 (single pack lookup), 192-196 (single routePackage derivation), 237-252 (single preferredRoutePackage in result type 20-40).
- index.ts:26475 `preferredEndpointId: cached.preferredRoutePackage` (pack->endpoint mapping entering the request), plus 26429-26444 (recall path).
- Core consumers of the single preferred endpoint: router.ts:111 `const preferred = advisory.preferredEndpointId;`, 113-115 (eligibility), 143-147 (scored.find + band), 1784-1788 (chosen swap).
- cli.ts:3777 logs the single preferredRoutePackage.
A ladder would add: per-(roleId,taskTypeId) keyed walk in the source/recall (advisorySourceMaxAgeMs/revalidation currently scope-wide), ordered fallback semantics replacing the single find at 143, and a new chosen-selection loop replacing 1784-1788 - while keeping the gate function (54-172) unchanged.

## 2. Discrepancies
1. `preferredRoutePackage` does NOT appear in the router (0 matches in router.ts/types.ts). The core input field is `preferredEndpointId` (types.ts:235, router.ts:111); preferredRoutePackage lives only in the host source result (route-advisory-source.ts:21, 238) and is renamed at index.ts:26475. Any doc saying the router consumes preferredRoutePackage is wrong at the core layer.
2. The doc's requested field list omits `candidateId`, `advisoryId`, `thresholdSetVersion` (types.ts:233, 238, 249) - they exist and flow through (index.ts:26474, 26478, 26496).
3. The doc's cohortPercent/stage/killSwitch wording maps to gates, but the input interface has NO weights fields; no scoring-weight application anywhere in the function - confirmed pure swap/exploration.
4. `advisory_task_avoided` is the actual code string (router.ts:124), not advisory_avoided; `stage_below_s2` is the code string (108) for any stage outside S2/S3/S4.
5. explorationPercent default in the live wiring is 0 (index.ts:26494) -> deterministic swap within band/cohort unless ROLE_MODEL_LEARNING_EXPLORATION_PERCENT is set (no policy-file default read for it).
6. recallTrackBDurableRouteAdvisory doc-comment (7602-7605) claims family filtering but body (7615-7616) does not filter - router gate does it; fails closed, but comment overstates.
7. S2 gating subtlety: cohortPercent gate applies to S2 too (router.ts:138-140); the S2 'every eligible decision' claim (route-advisory-source.ts:57-61 comment) holds only because the live path passes policy cohortPercent default 100 (index.ts:26460-26463) - behaviorally true, not structurally unconditional.
8. advisoryPackageEligible/eligibleEndpointCount are returned in the outcome object (router.ts:93-97) and consumed by the host (index.ts:26682-26683) but NOT declared in RouteAdvisoryConsiderationOutcome (types.ts:268-285) - undeclared structural excess.
9. Two caches with different keying: durable channel-NUL-scope (7568) vs legacy per-routePackage channel-NUL-scope-NUL-routePackage (7498-7500); recallNewestTrackBRouteAdvisory (7513) can return a NON-durable pipeline advisory when the durable entry is missing - only as fallback, durable (incl. its unavailable answer) wins when present (index.ts:26429-26444). This is the only path by which a non-activated advisory could reach the router; eligibility gate (router.ts:113-115) still fences it.
10. No roleId anywhere in route-advisory-source.ts or the advisory input/outcome types; role scoping is enforced only via role-definition eligibility (requestedRoleId), not via the advisory.

## 3. Matters for the stage-3 ladder (keyed by (roleId,taskTypeId))
1. The ENTIRE durable-advisory cache key is channel-NUL-scope (track-b-runtime.ts:7568, 7615-7616; one entry per scope, route-advisory-source.ts:161). A (roleId,taskTypeId)-keyed ladder must change: rollout read (145), durable cache key + eviction (7568, 7590-7595), recall signature (7599-7614), index.ts recall call (26429-26444), and the observation taskTypeId/requestTaskTypeId pair (index.ts:26694-26708, buildLiveRouteAdvisoryObservation track-b-runtime.ts:7955-8035).
2. The router gate already enforces exact taskTypeId + taxonomyVersion per request (router.ts:120-132) - the ladder source must supply a per-(roleId,taskTypeId) preferred endpoint, or multi-family traffic is refused (advisory_task_mismatch) for every non-first rung.
3. Both scope-wide knobs - advisorySourceMaxAgeMs (index.ts:26436) and revalidationIntervalMs (cli.ts:3767-3768, route-advisory-source.ts:224-233) - are checked against the single pack's validation receipt; a ladder needs per-rung age/revalidation provenance.
4. Cohort resolution resolveAdvisoryCohortPercent (route-advisory-source.ts:63-76) reads ONE rollout cohortPercent; rollout.activePackageId/cohortPercent/killSwitchAtMs (157-162) is a single-record read - the ladder must define per-rung cohort/kill-switch semantics or keep them scope-wide.
5. The decision swap is single-shot: router.ts:142-147 (scored.find === preferred) then 1784-1788 single index. A ladder walk needs ordered fallback (try rung 1, then rung 2, each against eligibility+band) or the leader swap becomes ambiguous; the exploration/propensity math (148-158) assumes one advised endpoint.
6. candidateId is derived from pack.experienceIds[0] (route-advisory-source.ts:234-235) - single candidate per pack; ladder rungs need per-rung candidateId provenance for the observation ledger.
7. The observation ledger records ONE preferredRoutePackage per decision (buildTrackBRouteAdvisoryObservation track-b-runtime.ts:7724+, append 8043) and one taskTypeId/requestTaskTypeId pair - a ladder needs to record walked rungs and the rung actually applied, or post-hoc analysis cannot distinguish 'rung 2 applied' from 'baseline retained'.
8. 'Ladder' vocabulary already exists in ONE place: cli.ts:6201-6216 (knowledge:activate-pack 'keeps the cohort ladder, refuses a re-activation of a rolled-back pack') - that is the rollout cohort ladder, NOT a route-preference ladder; also resolveAdvisoryCohortPercent comment (route-advisory-source.ts:55-61) refers to the rollout step ladder. Stage 3 must not confuse the two.
