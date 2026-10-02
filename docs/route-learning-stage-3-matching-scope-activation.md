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
rank its pairwise results justify.

Each rung carries a STATUS: 'available' (routable, healthy) or 'unavailable' (removed from the catalog, blocked
by policy, or unhealthy - kept in the ladder for history, but not routable). Removing an endpoint does NOT
delete its rung; it flips the rung's status to 'unavailable', so the router skips it and falls through to the
next available rung. This preserves the historical rank while keeping routing honest, and it is the fallback
that answers the drift question.

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

## Ladder aggregation: pairwise comparisons -> a total order

The ladder is derived from the finalized evaluation comparison groups in a (role, task) scope. Each group
compares a source candidate against a counterfactual candidate and records a winner (or tie), per-scorer
outcomes, a scorer-disagreement flag, and a judge confidence. The aggregation turns that sparse, sometimes
disagreeing pairwise evidence into a single ranked order.

Inputs (per finalized comparison group in scope): source/counterfactual candidateRefs (the two endpoints),
outcome (candidate | source | tie) and winnerRole, scorerDisagreement (bool) and scorerOutcomes (per-scorer
winner), and the member confidence (the judge's confidence for each side).

Step 1 - normalize each comparison into a weighted pairwise verdict.

    winner beats loser by weight w, where:
      w = confidence * agreement
      confidence = the winning side's judge confidence (clamped to [0,1])
      agreement = scorerDisagreement ? (scorers-for-winner / total-scorers, clamped to [0.5,1]) : 1
    a tie contributes 0 to both sides.

A confident, unanimous win is strong evidence; a split or low-confidence win is weak. Clamping agreement at
0.5 means a 1-of-2 split still weakly favors the winner rather than erasing it.

Step 2 - accumulate a rank score per endpoint.

    rankScore(E) = sum over comparisons touching E of (+w if E won, -w if E lost, 0 if tie)

This is a weighted net pairwise (Copeland-style) score: a sparse champion-vs-challenger graph is fine, because
each comparison only updates the two endpoints it touches.

Step 3 - order by rankScore descending, with a deterministic tie-break.

For equal rankScore, break ties in order by: (1) direct head-to-head result - if the two endpoints were
compared, the winner ranks higher; (2) fewer losses, then more wins - a more decisive record; (3) higher
confidence-weighted comparison count - more evidence; (4) endpoint id - lexicographic, final and stable.

Step 4 - slot-in and removal.

Slot-in: a new endpoint runs counterfactuals against the current ladder members (one comparison per sampled
member, or a bounded sample). Its rankScore is computed from those pairwise results and it is inserted at that
position; the rest of the ladder keeps its relative order.

Removal: an endpoint that leaves the eligible set (catalog removal, policy, outage) is marked 'unavailable',
not deleted - its rung stays in the ladder with status 'unavailable', and routing falls through to the next
available rung. The rank history is preserved.

Step 5 - confidence and sample floors before an endpoint is routable.

An endpoint is only admitted to the ACTIVE ladder (as opposed to a shadow candidate) when: it has at least K
finalized, effort-comparable comparisons in scope (K is a product default, e.g. 5), and its aggregate
confidence (mean winning-side confidence) meets the promotion floor (0.7, matching the profile learner's
canPromoteProfile gate). Below the floor the endpoint stays a shadow candidate and the previous ladder remains
authoritative.

Notes and open questions:

- The graph is champion-vs-challenger, not a full round-robin, so the ladder is a best-effort total order that
  refines as more counterfactuals run; it never claims transitivity it has not measured.
- Effort comparability is a precondition: only comparisons whose arms carry effortComparability (the run-104
  goal) are combined, so a low-effort arm is not unfairly ranked below a high-effort one.
- Scorer disagreement is down-weighted, not resolved by fiat; a recalibrated scorer set re-weights (or re-runs)
  the affected comparisons rather than silently keeping stale weights.

### Pairwise replay record

Each pairwise replay is an immutable, append-only record. The evaluation core's finalized comparison group IS
that record: it already carries sourceCandidateRef, counterfactualCandidateRef, winnerRole/outcome and
confidence. It does NOT currently carry a created-at timestamp: the comparison-groups table is
(group_id, status, group_json, result_json) with no time column, and neither group_json nor result_json stores
one; the only timestamps are evaluation_holdouts.created_at and the reference attestation's issuedAtMs. The
ladder history is therefore auditable by date only if a created_at is ADDED to the comparison group (or to the
derived ladder record) - a net-new field, not something the group already has. Re-running a comparison produces
a NEW record; it does not edit the old one.

## Storage

Today a pack is JSON stored in SQLite rows (not a dedicated table, not single files):

- knowledge-worker.sqlite -> knowledge_worker_candidates.candidate_json -> packCandidates[] (the
  candidate-embedded form produced at promotion);
- knowledge-store.sqlite -> knowledge_learning_records (kind='pack') -> record_json (the durable pack, with
  scope {endpointId, roleId, taskTypeId, taxonomyVersion});
- knowledge_route_rollouts.activePackageId (a pointer to the active pack, one per scope_id).

The ladder changes this in two ways:

1. The durable pack record gains a `ladder` field - a ranked array of rungs {endpointId, rank, status} for its (role, task), replacing
   the single scope.endpointId. It stays JSON inside the existing rows (no new files), but the ladder becomes
   first-class data rather than an implied single preference.
2. A new index maps (roleId, taskTypeId) -> active ladder so the router and the dispatcher answer 'what is the
   ranked ladder for this task' in one read. One row per (role, task): ladder, completeness (ranked / total
   available endpoints), and nextEligibleAtMs. The index is a DERIVED projection, not a second source of truth
   - the ladder records are authoritative, the index is rebuilt from them.

## Replay/eval dispatch prioritization

Replay dispatch stops being live-request-driven (opportunistic) and instead fills ladder gaps. Today a replay
is enqueued for any incoming request that has a distinct counterfactual endpoint
(runTrackBReplayIntentPipeline; otherwise R14_NO_DISTINCT_COUNTERFACTUAL); stage 3 targets ladder gaps instead:

- Enumerate every (role, task) scope whose ladder is incomplete (fewer endpoints ranked than the available
  eligible set for that scope) AND that has at least one replayable request/capture. A taxonomy (role, task)
  with no recorded request has nothing to replay, so it is excluded from the work queue even if its ladder is
  empty. That constrained set is the work queue.
- Dispatch counterfactuals to fill each scope's ladder one task at a time, until every available endpoint for
  that task is ranked.
- A task whose ladder is complete (all available endpoints ranked) is marked complete and NOT replayed until
  its staleness window elapses (default 30 days). After 30 days it becomes eligible for a refresh replay with
  the same models, and its ladder is recomputed from the fresh comparisons.

The completeness + next-eligible timestamp live in the index row, so the dispatcher can select the
next task to fill without scanning every comparison.

## Effect requirement

All stage-3 ladder code - the aggregation, the ladder store/index, and the dispatch scheduler - is
implemented in Effect, using the vendored Effect v4 tree (effect@4.0.0-rc.117 at vendor/effect, re-exported
through role-model-router/packages/effect). The mapping below follows the patterns the repo already uses:
scoring-strategy.ts builds Schema contracts and Data.TaggedEnum unions; queue-runtime composes Layer services
with ManagedRuntime and Fiber, and sizes intervals with Duration.

- Data contracts -> Schema. The rung, the ladder, the index row and the pairwise replay record are Schema
  models, not hand-rolled interfaces: the rung status is Schema.Literal('available', 'unavailable'); the
  index's completeness invariant (0 <= ranked <= total available) is Schema.check; the staleness window is a
  Duration field (Duration.days(30) at the default).
- Tagged errors -> Data.TaggedError. InsufficientEvidence (below K comparisons or the 0.7 confidence floor),
  NoReplayableRequest (a (role, task) with no recorded capture), EndpointUnavailable (a rung flipped to
  unavailable), and ScopeMismatch are tagged errors, so callers match exhaustively instead of string-
  comparing messages.
- Aggregation -> a pure Effect over Chunk/Order. The weighted-net-wins fold (aggregation step 2) is an Effect
  that reduces the comparison records into a HashMap keyed by endpointId with the rank score, then sorts by a
  composed Order (score desc, then the documented tie-breaks). No mutable global state; the function is
  testable by supplying the comparison records as input.
- Persistence -> Layer + Context.Tag. The ladder store and the derived index are a service behind a
  Context.Tag, built by a Layer (mirroring queue-runtime's storeLayerForQueuePolicy). The write path updates
  completeness and nextEligibleAtMs when a rung fills, and flips a removed endpoint's rung to 'unavailable'.
- Dispatch scheduler -> Effect + Schedule + Duration + Clock + Queue. The task-by-task fill loop is a
  recurring Effect (Schedule) that reads Clock.currentTimeMillis to compare nextEligibleAtMs, enqueues only
  incomplete scopes that also have a replayable request (filtering NoReplayableRequest before enqueue), and
  treats a complete ladder as idle until its Duration.days(30) window elapses.
- Optional/partial results -> Option / Result. The ladder lookup for a (role, task) is an Option (missing vs
  present), and the per-comparison verdict is a Data.TaggedEnum (win | loss | tie) that the fold consumes.



