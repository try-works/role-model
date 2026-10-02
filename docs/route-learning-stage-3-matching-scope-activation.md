# Stage 3: controlled route-package activation with matching scope

Status: design spec - a later-run architecture change. Supersedes the shadow-only v1.1 baseline. All decisions
resolved.

## What a pack is for

A pack IS a task's ladder: for a (role, task), it is the ranked list of endpoints that counterfactual evals
have proven best, best first. We continuously replay and evaluate whether we are choosing the best model for
the task, update the ladder, and use it for routing. There is no separate 'pack' and 'ladder' - one pack per
(role, task), and the pack's body is the ladder.

## Background

The proposal (guidance/13_profile_learner.md 'Post-v1 route-package attribution') defines a four-stage ladder:
attribution only; shadow recommendation; controlled activation (matching scope, confidence threshold, policy,
receipt, rollback); route-package routing. v1.1 (TB10) is stage 2; this spec is stage 3. Packs stay
advisory_only (they advise, never select the route directly).

## Current state (the defect)

knowledge_route_rollouts holds ONE activePackageId per runtime scope_id, not per (role, task).
route-advisory-source.ts reads that one pack and feeds it to the router for every request, so a scope-wide
pack is refused with advisory_task_unscoped for any task-scoped request, and its single endpoint is refused
with advisory_candidate_not_eligible when that endpoint is not eligible. Each pack carries a single
endpointId rather than a ranked ladder, so there is no fallback.

## Target design

1. One pack per (roleId, taskTypeId), exact match only. The pack's body is a ranked endpoint ladder.
2. The ladder walk produces the advisory's PREFERRED endpoint (the highest-ranked routable rung), not a
   direct selection. The router's existing score-band, cohort and confidence gates still decide whether the
   preference is applied. A pack never routes directly.
3. A rung is routable when its status is 'available' AND the endpoint passes the router's per-request
   eligibility (posture/key-tier). The two are separate filters: status is a stored property; eligibility is
   per request.

## The endpoint ladder

The ladder aggregates the evaluation core's finalized pairwise comparison groups for a (role, task). Each rung
is { endpointId, rank, status }, where status is 'available' (the endpoint is configured and has not been
removed) or 'unavailable' (the USER removed the endpoint from the runtime). 'Unavailable' is about user
removal only - it is not the router's per-request eligibility, which is applied separately at routing time.

## Change list (code sites)

- knowledge-store activatePack: key the rollout by (roleId, taskTypeId) instead of the runtime scopeId.
- route-advisory-source.ts: read the (role, task) pack and return its ranked ladder in place of the single
  preferredRoutePackage (the advisory's shape changes from one endpoint to an ordered list), carrying
  taskTypeId/taxonomyVersion/roleId.
- core/src/router.ts: replace the single preferred-endpoint check with a ladder walk (highest routable rung
  becomes the preferred endpoint; fall through on unavailable or ineligible rungs).
- cli.ts learner sweep: key activation by (roleId, taskTypeId).
- knowledge-worker: derive and persist the ladder (aggregate pairwise comparisons per scope), replacing the
  single scope.endpointId.
- knowledge-store: add the rollback path for a (role, task) ladder (see Rollback).
- runtime-ui (learning.tsx, Packs page): render the ladder index (top-3 per task, status, completeness), sorted
  complete-first, with a per-row rollback toggle wired to the backend flag.

## Resolved decisions

1. Scope key = (roleId, taskTypeId). The endpoint is the learned preference inside the ladder.
2. Matching is exact (role, task) only.
3. 'Available endpoint' = every endpoint CONFIGURED in the current runtime (not the whole catalog).
4. Rung status 'available'/'unavailable' means user removal only.
5. New endpoint slot-in = a top-down challenge: replay the new endpoint against the current leader, then the
   next rung, and so on until it finds its rank.
6. The pack IS the ladder (one pack per (role, task)); no separate derived index.

## Ladder aggregation: pairwise comparisons -> a total order

Each finalized comparison group compares a source and a counterfactual endpoint and records a winner (or tie),
per-scorer outcomes, a scorer-disagreement flag, and judge confidence.

Step 1 - weighted verdict: winner beats loser by w = confidence * agreement, where confidence = winning side's
judge confidence (clamped [0,1]), and agreement = 1 if unanimous else (scorers-for-winner / total-scorers,
clamped [0.5,1]). A tie contributes 0 to both. 'total-scorers' = the number of scorers that returned a non-tie
outcome for that comparison.

Step 2 - rank score: rankScore(E) = sum over E's comparisons of (+w win, -w loss, 0 tie).

Step 3 - order by rankScore desc; tie-break by (1) direct head-to-head, (2) fewer losses then more wins,
(3) higher confidence-weighted count, (4) endpoint id.

Step 4 - slot-in (top-down challenge) and removal.

  Slot-in: a new configured endpoint challenges the current leader first; if it loses, it challenges the next
  rung, and so on until it finds its rank. Each challenge is one pairwise comparison (new endpoint vs the
  challenged rung). This breaks a complete task's 30-day idle immediately - a new endpoint always triggers
  its challenge replays.

  Removal: a user-removed endpoint is marked 'unavailable' (rung kept, not routable); routing falls through to
  the next available rung.

Step 5 - admission floor: an endpoint is admitted to the ACTIVE ladder when it has at least K finalized
effort-comparable comparisons in scope (default 5) and mean confidence >= 0.7. Below the floor it is a shadow
candidate and the previous ladder remains authoritative.

## Pairwise replay record

Each pairwise replay is an immutable append-only record: the finalized comparison group (sourceCandidateRef,
counterfactualCandidateRef, winnerRole/outcome, confidence). It does NOT currently carry a created-at
timestamp - the comparison-groups table has no time column - so a created_at field must be ADDED (net-new) for
the ladder history to be auditable by date. Re-running a comparison appends a new record, never edits the old.

## Storage

One pack per (role, task), stored as JSON in SQLite rows (the existing knowledge-store learning_records,
kind='pack'), keyed by a (role_id, task_type_id) UNIQUE index. The pack's body is the ladder: rungs
{ endpointId, rank, status }, plus completeness (admitted / configured endpoints, where 'admitted' means
passed the admission floor) and nextEligibleAtMs. There is
no separate derived index - the pack table IS the lookup, and the (role_id, task_type_id) unique index makes
'ladder for this task' a single indexed read.

Index storage: a regular SQLite TABLE with WAL mode, not a view. SQLite has no materialized views (CREATE VIEW
is a stored query re-run on each read), so a plain table keyed by (role_id, task_type_id) is the right shape.
WAL supports concurrent readers plus one writer - the routing path is read-heavy and the ladder updates are
infrequent, which is exactly the access pattern WAL serves.

## Replay/eval dispatch prioritization

Tasks are discovered from live requests: the set of (role, task) scopes is whatever incoming traffic
classifies. A (role, task) with no recorded request has nothing to replay and never enters the work queue.

The dispatcher fills one task's ladder to completion before moving to the next (depth-first):

- Select the current task: the (role, task) with an incomplete ladder (fewer CONFIGURED endpoints ranked than
  the runtime has configured) and at least one replayable capture. If several qualify, pick most-requested
  first (request count over the last 30 days), then most-unfilled.
- Dispatch counterfactuals for that task until every configured endpoint is ranked; then advance. Each
  counterfactual is the task's source request replayed against an as-yet-unranked configured endpoint (the
  existing replay-intent mechanism, re-targeted by ladder gap).
- A complete task idles 30 days, then is eligible for a refresh replay and its ladder is recomputed.
- A NEW configured endpoint always breaks the idle immediately and starts its top-down challenge.

## Activation model

There is no separate promote-then-activate step and no mutable active-pack pointer. The ladder is a
MATERIALIZED DERIVED snapshot: it is recomputed from the append-only comparison records and REWRITTEN to the
pack store whenever new evidence arrives for the task - it is not recomputed on every read, and it is never
manually promoted. A task's ladder is 'active' - its advisory is used - automatically once at least one of its
endpoints has passed the admission floor (K comparisons + 0.7 confidence). Because the ranking is always
recomputed from evidence (then stored for fast reads), there is no stale pack to go out of date.

## Rollback (per-task toggle)

A pack carries a rollback flag per (role, task), default OFF. When the user turns it ON for a task (they do not
like the ladder rank and do not want the task routed by it), the advisory source returns no advisory for that
task and routing falls back to the baseline strategy. It is a plain boolean the user toggles in the UI, and the
backend supports it by checking the flag before serving the ladder: ON means the ladder does not influence
routing; OFF means it does. While ON, replay/eval dispatch for that task is also paused (the ladder is not
recomputed), so the user's override is stable until they roll forward. The flag is recorded with the operator's
reason and is reversible.

## Configuration

The ladder constants live in product-defaults.json (the machine authority) under a routeLearning block:
minComparisons (K, default 5), minConfidence (default 0.7), stalenessWindowDays (default 30), and
challengeBatchSize (how many top-down challenge comparisons a new endpoint may run per dispatch; the challenge
itself is sequential - one rung per comparison). The runtime reads
them through the existing product-defaults loader.

## UI: Packs page (the ladder index)

The Packs page under Learning becomes a scrollable ladder index - one row per (role, task) the runtime has
seen. Each row shows the task's (role, task) name, its TOP 3 ranked endpoints (best first), its status
('active' = influencing routing, or 'rolled back' = the user's override), and its completeness
(admitted / configured endpoints). Rows are ordered so the most-reviewable tasks surface first:

1. fully-ranked tasks (every configured endpoint admitted) at the top;
2. then partially-ranked tasks, most-unfilled first;
3. tasks with no admitted endpoint (no ladder yet) at the bottom.

The user scrolls the index to review it and toggles the per-task rollback flag directly from the row. The
top-3 display is a projection of the ladder; the full ranking lives on a per-task detail view.

## Effect requirement

All ladder code is implemented in Effect, using the vendored Effect v4 tree (vendor/effect, re-exported
through role-model-router/packages/effect), following the repo patterns (scoring-strategy.ts: Schema +
Data.TaggedEnum; queue-runtime: Layer + ManagedRuntime + Fiber + Duration).

- Data contracts -> Schema (rung status Schema.Literal('available','unavailable'); completeness Schema.check;
  staleness a Duration).
- Tagged errors -> Data.TaggedError (InsufficientEvidence, NoReplayableRequest, EndpointUnavailable,
  ScopeMismatch).
- Aggregation -> a pure Effect over Chunk/Order, folding records into a HashMap<endpointId, rankScore>.
- Persistence -> Layer + Context.Tag (the pack/ladder store, WAL SQLite).
- Dispatch scheduler -> Effect + Schedule + Duration + Clock + Ref/Queue (hold the focus task, depth-first).
- Optional/partial -> Option for the ladder lookup, Data.TaggedEnum (win | loss | tie) for the verdict.

## Acceptance criteria

- A task-scoped request is served by its (role, task) pack; the advisory is no longer refused with
  advisory_task_unscoped for matching scopes.
- The router takes the highest-ranked routable rung as the preferred endpoint, and falls through to the next
  when a rung is unavailable or ineligible. The existing gates still decide whether to apply it (advisory_only).
- Two task families each have an active pack; a non-matching pack is refused with advisory_task_mismatch.
- A new configured endpoint challenges the leader then walks down until it finds its rank.
- A user-removed endpoint flips to 'unavailable' and is skipped; the next available rung is used.
- Rollback of one task's ladder does not disturb another, and a rolled-back task routes by baseline.
- No pack routes directly (advisory_only preserved).
- The Packs page shows the ladder index (top-3 per task, status, completeness), ordered complete-first, and the
  per-row rollback toggle flips the backend flag.

## Scope-wide packs do not exist

Scope-wide packs (endpoint-only scope, no roleId/taskTypeId) do not exist in stage 3. A request without a
(role, task) taxonomy classification is NEVER admitted to the replay/eval queue - the queue admission requires
a classification, so there is no capture to replay and no ladder to derive. Such a request gets no advisory and
routes by the baseline strategy only. This removes the scope-wide pack entirely rather than special-casing it.

## Risks

- The ladder walk must respect both stored status and per-request eligibility at each rung, or fallback could
  promote an endpoint the request cannot route to. Mitigate with an eligibility filter before ranking.
- The learner's candidate scope must be complete (role/task present) for a pack to match (R22-B plumbing).
- A pure, unit-tested scope-match function and a deterministic tie-break keep the N-way surface correct.
