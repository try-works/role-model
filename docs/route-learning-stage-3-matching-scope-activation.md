# Stage 3: controlled route-package activation with matching scope

Status: design spec - a later-run architecture change, not part of run-104 closeout. Supersedes the
shadow-only v1.1 baseline described in the proposal.

## Goal

Make a promoted route package actually influence routing, safely. Today the learner's advisory is inert
(applied 0 / 6842 on the live :3457 stage runtime, addendum 23): the single active pack is scope-wide, the
router refuses it for task-scoped requests, and activation is keyed by the bare runtime scope. Stage 3 of the
proposal's rollout ladder is 'controlled activation' - only promoted safe_for_prompt packs with MATCHING SCOPE,
a confidence threshold, explicit policy, usage receipt, and rollback. This spec implements that stage.

## Background

The proposal (guidance/13_profile_learner.md 'Post-v1 route-package attribution') defines a four-stage ladder:

1. attribution only - router unchanged;
2. shadow recommendation - report likely improvement without applying it;
3. controlled activation - matching-scope packs, confidence threshold, policy, receipt, rollback;
4. route-package routing - later policy selects the full tuple after sufficient evidence.

v1.1 (TB10) is deliberately stage 2: TB10-REQ-02 requires 'no candidate experience or route package activates
in production in v1.1', and the route-learning contract pins packCandidate.priority to `advisory_only` - a pack
can only advise, never route directly. Stage 3 keeps `advisory_only`; it widens the advisory's reach from one
scope-wide pack to a pack that MATCHES the request's scope.

## Current state (the defect)

The rollouts table (knowledge_route_rollouts) holds ONE activePackageId per scope_id, and scope_id is the
runtime scope (`standalone-runtime-stage`), not the route-package scope. route-advisory-source.ts reads that one
pack and feeds it to the router for every request. Consequence (measured live): a scope-wide active pack is
refused with `advisory_task_unscoped` for any request that declares a task family (core/src/router.ts:126), and
its learned preference (an endpoint) is refused with `advisory_candidate_not_eligible` when that endpoint is not
in the eligible set. The 14 validated role/task-scoped packs already in the store are never selected because the
sweep only activates the pack it promotes in that tick, and the single scope-wide slot is occupied.

## Target design

Activation and advisory lookup are keyed by the route-package SCOPE tuple, not the runtime scope. The scope
tuple (route-learning-contracts.schema.json, `$defs.scope`) is:

    { repoArchetype, roleId, taskTypeId, language, clientId, toolClassIds, modelFamily, endpointId, promptAdapterId }

Concretely:

1. A rollout holds one active pack per scope tuple (or per (role, taskTypeId) prefix, see the ordering
   decision below), not one per runtime. Multiple packs are active simultaneously, each for its own scope.
2. The advisory source selects the active pack whose scope matches the request's classification; a request with
   no declared family keeps the scope-wide pack (the current pre-stage-3 behavior).
3. The router gate is unchanged in spirit: a pack whose scope does not match the request is still refused
   (mismatch), but a MATCHING pack now passes the applicability check instead of being refused as unscoped.
4. Packs remain `advisory_only` - they influence the advisory, never select the route directly.

## Change list (code sites)

- knowledge-store `activatePack` (extensions/knowledge-store/index.mjs): accept a scope key derived from the
  pack's scope tuple instead of the bare runtime scopeId; write one rollout row per scope key.
- route-advisory-source.ts: read the rollout for the request's scope key (role/task), then fall back to the
  scope-wide pack; carry taskTypeId/taxonomyVersion/roleId from the matching pack.
- cli.ts learner sweep activation: pass the promoted pack's scope tuple as the activation key, and stop
  collapsing all packs into one runtime-scope slot.
- A small curation overlay (lifecycle, hosted-web-search, effort override) survives the catalog/scope layer, as
  scoped in docs/openai-codex-subscription-catalog-derivation.md and #300.

## Blocking decisions (need an answer before implementation)

1. Scope-key granularity. Key activation by the full scope tuple, or by the (roleId, taskTypeId) prefix while
   treating endpointId/modelFamily as preference dimensions? Recommended: (roleId, taskTypeId) prefix for the
   rollout key; endpointId stays inside the pack as the learned preference.
2. Matching semantics. Is a request matched by exact (role, task) only, or does a role-only pack serve every task
   under that role? Recommended: exact task match first, then role-only, then scope-wide - the same specificity
   ladder the profile learner already shrinks over.
3. Default lifecycle / hosted-web-search for auto-discovered packs. Recommended: lifecycle `supported`, hosted
   web search `true` (matching the current matrix), overridable in the curation overlay.
4. Admission on scope drift. If a request's taxonomy revision changes or a catalog refresh removes an endpoint,
   does an already-active pack stay valid? Recommended: already-active packs stay active; new activations
   re-validate.

## Acceptance criteria

- A request with a declared task family is served by an active pack whose scope matches that family, and the
  advisory is no longer refused with `advisory_task_unscoped` for matching scopes.
- `applied` (or at least `wouldHaveChanged` that survives the gate) moves off zero for a matching-scope request.
- Two different task families can each have an active pack simultaneously; a non-matching pack is refused with
  `advisory_task_mismatch`, not selected.
- Rollback of one scope's pack does not disturb another scope's active pack.
- No pack ever routes directly (`advisory_only` is preserved); the router's score band, cohort and confidence
  gates still apply.

## Risks

- Widening from one pack to N scope-keyed packs changes the advisory surface; a bug in the matching function
  could serve the wrong pack. Mitigate with a pure, unit-tested scope-match function and a fallback to the
  scope-wide pack.
- The learner's candidate scope must be complete (role/task present) for a pack to match - which is exactly the
  R22-B plumbing this runtime was missing. Packs with no family stay scope-wide only.
