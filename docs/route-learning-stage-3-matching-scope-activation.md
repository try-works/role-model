# Stage 3: controlled route-package activation with matching scope

Status: design spec - a later-run architecture change, not part of run-104 closeout. Supersedes the
shadow-only v1.1 baseline described in the proposal. All four blocking decisions are now resolved (see below).

## Goal

Make a promoted route package actually influence routing, safely. Today the learner's advisory is inert
(applied 0 / 6842 on the live :3457 stage runtime, addendum 23): the single active pack is scope-wide, the
router refuses it for task-scoped requests, and activation is keyed by the bare runtime scope. Stage 3 of the
proposal's rollout ladder is 'controlled activation' - only promoted safe_for_prompt packs with MATCHING SCOPE,
a confidence threshold, explicit policy, usage receipt, and rollback. This spec implements that stage.

## What a pack is for (the operator's definition)

A pack's job is to route a (role, task) to the endpoint that counterfactual evals have proven best for it.
The pack carries that ranking - a ladder of endpoints for the task, best first - and we continuously replay
and evaluate whether we are choosing the best model, update the pack's ladder accordingly, and use the ladder
for routing. A new model endpoint is slotted into the ladder by running counterfactuals against the current
members; a removed or unavailable endpoint falls through to the next-best rung.

## Background

The proposal (guidance/13_profile_learner.md 'Post-v1 route-package attribution') defines a four-stage ladder:

1. attribution only - router unchanged;
2. shadow recommendation - report likely improvement without applying it;
3. controlled activation - matching-scope packs, confidence threshold, policy, receipt, rollback;
4. route-package routing - later policy selects the full tuple after sufficient evidence.

v1.1 (TB10) is deliberately stage 2: TB10-REQ-02 requires 'no candidate experience or route package activates
in production in v1.1', and the route-learning contract pins packCandidate.priority to `advisory_only` - a pack
can only advise, never route directly. Stage 3 keeps `advisory_only`; it widens the advisory's reach from one
scope-wide pack to a pack that MATCHES the request's scope, and from a single preferred endpoint to a ranked
ladder of endpoints for that scope.

## Current state (the defect)

The rollouts table (knowledge_route_rollouts) holds ONE activePackageId per scope_id, and scope_id is the
runtime scope (`standalone-runtime-stage`), not the route-package scope. route-advisory-source.ts reads that one
pack and feeds it to the router for every request. Consequence (measured live): a scope-wide active pack is
refused with `advisory_task_unscoped` for any request that declares a task family (core/src/router.ts:126), and
its single learned endpoint is refused with `advisory_candidate_not_eligible` when that endpoint is not in the
eligible set. The 14 validated role/task-scoped packs already in the store are never selected because the sweep
only activates the pack it promotes in that tick, and the single scope-wide slot is occupied. Each pack also
carries a single endpointId rather than a ranked ladder, so there is no fallback when that endpoint is
ineligible.

## Target design

Activation and advisory lookup are keyed by (roleId, taskTypeId), and the pack carries a ranked endpoint
ladder for that scope.

1. One active pack per (roleId, taskTypeId) scope key. Multiple packs are active simultaneously, each for its
   own role/task. (No role-only or scope-wide fallback - matching is exact.)
2. The pack's routing payload is a ranked ladder of endpoints - best first - derived from pairwise
   counterfactual comparisons in that scope, not a single preferred endpoint.
3. The advisory source selects the pack whose (roleId, taskTypeId) matches the request's classification, and
   the router walks the ladder: the highest-ranked ELIGIBLE endpoint wins; an ineligible or unavailable rung
   falls through to the next.
4. A request with no declared task family is served by the current scope-wide pack (pre-stage-3 behavior).
5. Packs remain `advisory_only` - the ladder influences the advisory, never selects the route directly; the
   router's score band, cohort and confidence gates still apply.

## The endpoint ladder

The ladder is an aggregation of the evaluation core's pairwise comparison groups for a (role, task): each
comparison names a source and a counterfactual candidate with a winner, so a total order falls out. Slotting a
new endpoint into the ladder means running counterfactuals against the current members and inserting it at the
rank its pairwise results justify. Removing an endpoint (catalog removal, policy, outage) drops that rung and
the next-best becomes the top automatically - this is the fallback that answers the drift question.

## Change list (code sites)

- knowledge-store `activatePack` (extensions/knowledge-store/index.mjs): key the rollout by (roleId,
  taskTypeId) instead of the bare runtime scopeId; write one rollout row per scope key.
- route-advisory-source.ts: read the rollout for the request's (roleId, taskTypeId), return the pack's ranked
  ladder (not a single preferredRoutePackage), and carry taskTypeId/taxonomyVersion/roleId.
- core/src/router.ts: replace the single preferred-endpoint eligibility check with a ladder walk (best eligible
  rung wins; fall through on ineligible/unavailable).
- cli.ts learner sweep activation: pass the promoted pack's (roleId, taskTypeId) as the activation key, and
  stop collapsing all packs into one runtime-scope slot.
- knowledge-worker: derive and persist the ranked ladder (aggregate pairwise comparisons per scope) alongside
  the pack, replacing the single scope.endpointId.

## Resolved decisions

1. Scope key = (roleId, taskTypeId). The endpoint is the learned preference carried inside the ladder, not a
   key dimension.
2. Matching is exact (role, task) only - no role-only or scope-wide fallback for a task-scoped request.
3. (Dropped.) 'Default lifecycle / hosted-web-search' was a conflation with the OpenAI model catalog matrix;
   route packs have no such fields.
4. Removal/admission is answered by the ladder: a removed endpoint falls through to the next-best rung, and a
   new endpoint is slotted in by counterfactuals against the current members.

## Acceptance criteria

- A request with a declared task family is served by the active pack whose (roleId, taskTypeId) matches, and
  the advisory is no longer refused with `advisory_task_unscoped` for matching scopes.
- For a matching scope, the router selects the highest-ranked ELIGIBLE endpoint; if that endpoint is removed or
  ineligible, the next rung is chosen instead (fallback works).
- Two different task families each have an active pack simultaneously; a non-matching pack is refused with
  `advisory_task_mismatch`, not selected.
- A new endpoint slots into an existing ladder at the rank its counterfactuals justify.
- Rollback of one scope's pack does not disturb another scope's active pack.
- No pack ever routes directly (`advisory_only` is preserved).

## Risks

- Widening from one pack to N scope-keyed packs changes the advisory surface; a bug in the matching function
   could serve the wrong pack. Mitigate with a pure, unit-tested scope-match function.
- The ladder walk must respect eligibility at each rung, or the fallback could promote an endpoint the request
   cannot route to. Mitigate with an eligibility filter before ranking.
- The learner's candidate scope must be complete (role/task present) for a pack to match - the R22-B plumbing
   this runtime was missing. Packs with no family stay scope-wide only.
