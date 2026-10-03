# Stage 3: controlled route-package activation with matching scope

Status: design spec - a later-run architecture change. Supersedes the shadow-only v1.1 baseline. All decisions
resolved.

## What a pack is for

A pack IS a task's ladder: for a (role, task), it is the ranked list of endpoints that counterfactual evals
have proven best, best first. We continuously replay and evaluate whether we are choosing the best model for
the task, update the ladder, and use it for routing. There is no separate 'pack' and 'ladder' - one pack per
(role, task), and the pack's body is the ladder.

## Pack lifecycle and states

The stored pack record is: ladder (rungs { endpointId, rank, status }), completeness, nextEligibleAtMs, a
monotonic version, and the rollback flag rolledBack { on, reason, atMs }. 'Active' is DERIVED, never stored: a
task's ladder is active when at least one endpoint has passed the admission floor AND rolledBack.on is false.
The observable states are:

- no ladder: zero admitted endpoints - the task has no advisory and routes by baseline.
- partial: some but not all configured endpoints admitted - advisory available for the admitted rungs.
- complete: every configured endpoint admitted - the ladder idles (30 days) until refresh.
- rolled back: rolledBack.on is true - no advisory, routing by baseline, replay paused (the ladder is kept,
  not deleted, so roll-forward restores it).

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

## Advisory flow (who walks, who gates)

route-advisory-source reads the (role, task) pack and returns the ordered ladder (carrying taskTypeId /
taxonomyVersion / roleId). core/src/router.ts walks the ladder top-down, skipping unavailable and ineligible
rungs, and takes the first routable rung as the PREFERRED endpoint. That preferred endpoint then enters the
EXISTING advisory-consideration machinery (score-band, cohort, confidence) exactly where today's single
preferredRoutePackage entered - the only change is the source of the preference (a ladder walk instead of one
stored endpoint). If the gates decline, the request routes by baseline, as today. The taxonomyVersion is
carried for provenance (the advisory surface requires it); matching is (roleId, taskTypeId) exact only - a
taxonomyVersion difference does not block the advisory in this stage.

## Error behaviors (tagged errors)

- InsufficientEvidence: the task has no admitted endpoint -> the advisory source returns NO advisory; baseline
  routing.
- NoReplayableRequest: the task has no replayable capture -> the dispatcher skips it (never scheduled).
- EndpointUnavailable: a rung is unavailable -> the walk skips it and continues to the next rung.
- ScopeMismatch: no pack matches the (role, task) -> the advisory is refused (advisory_task_mismatch); baseline
  routing.

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
  complete-first, with a per-row Activate / Roll back toggle and a clear status badge wired to the backend flag.

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

  Removal: a user-removed endpoint is marked 'unavailable' (rung kept, not routable) and leaves the
  completeness denominator (denominator = currently configured endpoints); routing falls through to the next
  available rung.

Step 5 - admission floor: an endpoint is admitted to the ACTIVE ladder when it has at least K finalized
effort-comparable comparisons in scope (default 5) and mean confidence >= 0.7 (the mean over its own finalized
comparisons). Below the floor it is a shadow candidate and the previous ladder remains authoritative. A task
whose endpoints are ALL below the floor has no ladder at all and gets no advisory (baseline routing).

## Pairwise replay record

Each pairwise replay is an immutable append-only record: the finalized comparison group (sourceCandidateRef,
counterfactualCandidateRef, winnerRole/outcome, confidence). It does NOT currently carry a created-at
timestamp - the comparison-groups table has no time column - so a created_at field must be ADDED (net-new) for
the ladder history to be auditable by date. Re-running a comparison appends a new record, never edits the old.

## Storage

One pack per (role, task), stored as JSON in SQLite rows (the existing knowledge-store learning_records,
kind='pack'), keyed by a (role_id, task_type_id) UNIQUE index. The pack's body is the ladder: rungs
{ endpointId, rank, status }, plus completeness (admitted / configured endpoints, where 'admitted' means
passed the admission floor), nextEligibleAtMs, a monotonic version, and rolledBack { on, reason, atMs }. There is
no separate derived index - the pack table IS the lookup, and the (role_id, task_type_id) unique index makes
'ladder for this task' a single indexed read.

Index storage: a regular SQLite TABLE with WAL mode, not a view. SQLite has no materialized views (CREATE VIEW
is a stored query re-run on each read), so a plain table keyed by (role_id, task_type_id) is the right shape.
WAL supports concurrent readers plus one writer - the routing path is read-heavy and the ladder updates are
infrequent, which is exactly the access pattern WAL serves.

## Concurrency and determinism

Ladder rewrites are serialized per (role, task): the knowledge-worker folds newly finalized comparison records
into the stored ladder and rewrites it atomically, guarded by the monotonic version - a stale rewrite (an older
version) is discarded. Given the same set of finalized records, the ladder is always the same order; concurrent
evidence arrival only changes WHEN the rewrite happens, never the resulting order.

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
- A complete task idles 30 days (nextEligibleAtMs), then is eligible for a refresh replay (one comparison
  re-run) and its ladder is recomputed; the refresh is picked up on the next dispatch cycle.
- A NEW configured endpoint always breaks the idle immediately: the affected tasks' nextEligibleAtMs becomes
  now, so the dispatcher schedules their top-down challenges on the next cycle (a new endpoint never waits 30
  days). The challenge does not preempt the current focus task mid-fill.

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
recomputed), so the user's override is stable until they roll forward. The flag is stored as
rolledBack { on, reason, atMs } on the pack. Rolling forward (OFF) makes the ladder consultable again
immediately and resumes the task's replay dispatch on the next dispatch cycle; the reason is kept for the
audit trail.

## Configuration

The ladder constants live in product-defaults.json (the machine authority) under a routeLearning block:
minComparisons (K, default 5), minConfidence (default 0.7), stalenessWindowDays (default 30), and
challengeBatchSize (how many top-down challenge comparisons a new endpoint may run per dispatch; the challenge
itself is sequential - one rung per comparison). The runtime reads
them through the existing product-defaults loader.

## UI: Packs page (the ladder index)

The Packs page under Learning becomes a scrollable ladder index - one row per (role, task) the runtime has
seen. Each row shows the task's (role, task) name, its TOP 3 ranked endpoints (best first), and its
completeness (admitted / configured endpoints), plus a clear current-status badge and a per-task
Activate / Roll back toggle:

- Active: the ladder is influencing routing (the toggle reads 'Roll back');
- Rolled back: the user has overridden it and the ladder is not influencing routing (the toggle reads
  'Activate').

The toggle is a two-way control the user flips per task; the backend flag defaults to Active and the UI shows
the current state unambiguously. Rows are ordered so the most-reviewable tasks surface first:

1. fully-ranked tasks (every configured endpoint admitted) at the top;
2. then partially-ranked tasks, most-unfilled first;
3. tasks with no admitted endpoint (no ladder yet) at the bottom.

The user scrolls the index to review it and flips Activate / Roll back directly from the row. The top-3
display is a projection of the ladder; the full ranking lives on a per-task detail view.

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
- The Packs page shows the ladder index (top-3 per task, status, completeness), ordered complete-first, each row
  with a clear Active / Rolled back status and a two-way Activate / Roll back toggle that flips the backend flag.

## Scope-wide packs do not exist

Scope-wide packs (endpoint-only scope, no roleId/taskTypeId) do not exist in stage 3. A request without a
(role, task) taxonomy classification is NEVER admitted to the replay/eval queue - the queue admission requires
a classification, so there is no capture to replay and no ladder to derive. Such a request gets no advisory and
routes by the baseline strategy only. This removes the scope-wide pack entirely rather than special-casing it.

Migration: the existing scope-wide packs and the single active scope-wide rollout are NOT consulted for routing
anymore - the run clears the scope-wide activePackageId and never activates an endpoint-only pack; the old
records stay in the store for history. The knowledge_route_rollouts activation surface becomes per-(role,
task): at most one active pack per (roleId, taskTypeId).

## Risks

- The ladder walk must respect both stored status and per-request eligibility at each rung, or fallback could
  promote an endpoint the request cannot route to. Mitigate with an eligibility filter before ranking.
- The learner's candidate scope must be complete (role/task present) for a pack to match (R22-B plumbing).
- A pure, unit-tested scope-match function and a deterministic tie-break keep the N-way surface correct.
- Concurrent evidence arrival for one task must not produce a non-deterministic ladder; the per-(role, task)
  serialized rewrite with the monotonic version is the guard.
