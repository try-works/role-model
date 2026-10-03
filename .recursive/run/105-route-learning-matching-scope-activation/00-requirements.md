Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- Baseline (2026-10-03): public `origin/dev` `701b8b8fc0b0eeebdfe818b757f5702f50021488` ("Merge run-104 R22-A/B + R23 +
  R24 + stage-3 design doc into dev"), private `origin/dev` `c993b2f2ebe8e1daa8ee506a50af0ea09f61b5f9` (same). Both worktrees
  branch `recursive/105-route-learning-matching-scope-activation`.
- Operator decisions (this thread, folded from the stage-3 spec): the pack IS the task ladder; scope key
  (roleId, taskTypeId) exact match; available endpoint = every CONFIGURED endpoint; rung status means user removal
  only; new-endpoint slot-in = top-down challenge (leader first, then next rung); activation is derived (floor-based,
  no promote-then-activate); rollback is a per-task Activate/Roll back UI toggle; constants in product-defaults.json;
  scope-wide packs do not exist (queue admission requires a classification); SQLite WAL (no materialized view); the
  Packs page is the scrollable ladder index (top-3 per task, status, completeness, per-row toggle).
- Design doc: `docs/route-learning-stage-3-matching-scope-activation.md` (in the baseline via the run-104 merge;
  this run implements it).

## TODO

- [ ] Operator approves this draft (then Status -> LOCKED with LockHash)
- [x] Baseline pinned (dev @ 701b8b8f / c993b2f2; includes the R22-B role/task plumbing the design assumes)
- [x] Run id/slug: 105-route-learning-matching-scope-activation

## Goal and user outcome

Make a promoted route package actually influence routing, safely. Today the learner's advisory is inert: the
single active pack is scope-wide, the router refuses it for task-scoped requests, and activation is keyed by the
bare runtime scope. Stage 3 turns the pack into a per-(role, task) ranked endpoint ladder that the router consults
as an advisory, with an operator-visible index and per-task rollback.

Stage 3 is controlled activation: the pack's recommendation is ALLOWED to influence routing - under matching
scope, a confidence threshold, policy, receipts, and rollback - but it does not become the route itself. That last
step is stage 4 (route-package routing), which this run does not do.

The operator's definition: a pack routes a (role, task) to the endpoint counterfactual evals have proven best; it
carries a ranked ladder (best first); we continuously replay/evaluate to keep the ladder honest, and the operator
can review and roll back any task's ladder from the UI.

## Requirements

### R1 — A pack is a per-(role, task) ranked endpoint ladder
One pack per (roleId, taskTypeId), exact match only. The pack's body is the ladder. Scope-wide packs
(endpoint-only, no role/task) do not exist.
- A request with a (role, task) classification is served by the pack whose key matches exactly.
- A request with no (role, task) classification is never admitted to the replay/eval queue and gets no advisory.
- A non-matching pack is refused with advisory_task_mismatch, never selected.

### R2 — The ladder is a materialized derived snapshot of ranked rungs
Each rung is { endpointId, rank, status }. The ranking is recomputed from the append-only comparison records and
rewritten to the pack store when new evidence arrives; it is not recomputed on every read and is never manually
promoted.
- The ladder is read in one indexed lookup per (role, task).
- A new comparison that changes the rank rewrites the stored ladder.

### R3 — Pairwise-to-total-order aggregation
The ladder aggregates the evaluation core's finalized pairwise comparison groups for a scope: winner beats loser by
w = confidence * agreement (confidence = winning judge confidence clamped [0,1]; agreement = 1 if unanimous else
scorers-for-winner/total-scorers clamped [0.5,1]); a tie contributes 0. rankScore(E) = sum of +w win / -w loss / 0
tie, where 'total-scorers' = the number of scorers that returned a non-tie outcome for that comparison; order
desc, tie-broken by (1) direct head-to-head, (2) fewer losses then more wins, (3) higher confidence-weighted
count, (4) endpoint id.
- Given a fixed set of comparison records, the ladder is deterministic.
- Only effort-comparable comparisons are combined (arms carry effortComparability).
- Scorer disagreement down-weights (0.5 clamp), never resolves by fiat.

### R4 — Rung status and router eligibility are separate filters
A rung is 'available' (configured and not removed) or 'unavailable' (the USER removed the endpoint). This is
stored on the rung. The router's per-request eligibility (posture/key-tier) is applied separately at routing.
- A user-removed endpoint flips its rung to 'unavailable' and is skipped; the next available rung is used.
- An available-but-ineligible endpoint is also skipped at routing time.

### R5 — advisory_only ladder walk
The router walks the ladder and takes the highest-ranked routable rung as the advisory's PREFERRED endpoint. The
existing score-band, cohort and confidence gates still decide whether the preference is applied. A pack never
routes directly.
- The ladder changes the preferred endpoint, never the selection directly.
- A removed/unavailable/ineligible top rung falls through to the next.

### R6 — Immutable pairwise replay record with a created-at date
Each finalized comparison group is an append-only record; re-running a comparison appends a new record. A
created_at field is added (net-new) so the ladder history is auditable by date.
- The comparison group gains a created_at timestamp.
- Re-running never edits the old record.

### R7 — Ladder storage in SQLite WAL, keyed by (role_id, task_type_id)
One pack per (role, task) as JSON in SQLite (the knowledge-store learning_records kind='pack'), with a
(role_id, task_type_id) UNIQUE index, plus completeness (admitted / configured) and nextEligibleAtMs. No separate
derived index table; no view (SQLite has no materialized views).
- 'ladder for this task' is one indexed read.
- Concurrent readers + one writer (WAL).

### R8 — Depth-first replay dispatch that fills one task's ladder
Tasks are discovered from live requests (queue admission requires a (role, task) classification). The dispatcher
holds one focus task and dispatches counterfactuals (source request vs an unranked configured endpoint) until every
CONFIGURED endpoint is admitted, then advances. A complete task idles 30 days, then is eligible for a refresh
replay and its ladder is recomputed; a new configured endpoint always breaks the idle immediately and starts a
top-down challenge (leader first, then next rung).
- Only classified requests enter the queue.
- A (role, task) with no recorded request never enters the work queue.
- Completeness = admitted endpoints / configured endpoints; most-requested (last 30 days) then most-unfilled.
- A new endpoint challenges the leader then walks down until it finds its rank.

### R9 — Derived activation (no promote-then-activate)
A task's ladder is active (its advisory is used) automatically once at least one endpoint passes the floor (K
finalized effort-comparable comparisons, default 5, and mean confidence >= 0.7). No mutable active-pack pointer.
- An endpoint below the floor is a shadow candidate and is not in the active ladder.
- Two task families can each have an active ladder simultaneously (per-(role, task) isolation).

### R10 — Per-task rollback (Activate / Roll back)
A pack carries a rollback flag per (role, task), default OFF. ON = the advisory source returns no advisory for that
task and routing falls back to baseline; replay dispatch for that task is also paused. Reversible.
- The flag is toggled by the operator, wired to the backend and the UI.
- A rolled-back task routes by baseline and is not replayed while rolled back.
- Rollback of one task's ladder does not disturb another (per-(role, task) isolation).
- The flag is recorded with the operator's reason.

### R11 — Ladder constants in product-defaults.json
routeLearning block: minComparisons (5), minConfidence (0.7), stalenessWindowDays (30), challengeBatchSize
(how many sequential top-down challenge comparisons a new endpoint may run per dispatch).
- The runtime reads them through the existing product-defaults loader; no new hardcoded magic numbers.

### R12 — Packs page shows the ladder index
The Packs page under Learning becomes a scrollable index, one row per (role, task): the top-3 ranked endpoints, a
clear Active / Rolled back status badge, completeness, and a two-way Activate / Roll back toggle. Ordered
complete-first, then partial, then none.
- Each row shows top-3, status, completeness, and the toggle.
- The toggle flips the backend flag from R10.
- The top-3 is a projection of the ladder; the full ranking lives on a per-task detail view.

### R13 — Effect-first implementation with a pinned primitive map
All ladder code (aggregation, store/index, dispatch, activation) is implemented in Effect, using the vendored
Effect v4 tree (vendor/effect, re-exported through role-model-router/packages/effect), following the repo patterns
(scoring-strategy.ts: Schema + Data.TaggedEnum; queue-runtime: Layer + ManagedRuntime + Fiber + Duration):
- Data contracts -> Schema (rung status Schema.Literal('available','unavailable'); completeness Schema.check;
  staleness a Duration).
- Tagged errors -> Data.TaggedError (InsufficientEvidence, NoReplayableRequest, EndpointUnavailable, ScopeMismatch).
- Aggregation -> a pure Effect over Chunk/Order, folding records into a HashMap<endpointId, rankScore>.
- Persistence -> Layer + Context.Tag (the pack/ladder store, WAL SQLite).
- Dispatch scheduler -> Effect + Schedule + Duration + Clock + Ref/Queue (hold the focus task, depth-first).
- Optional/partial -> Option for the ladder lookup, Data.TaggedEnum (win | loss | tie) for the verdict.
- New code uses vendored Effect; where not used, the reason is recorded.

## Code sites (from the design doc's change list)

- knowledge-store activatePack: key the rollout by (roleId, taskTypeId) instead of the runtime scopeId.
- route-advisory-source.ts: read the (role, task) pack and return its ranked ladder in place of the single
  preferredRoutePackage (the advisory's shape changes from one endpoint to an ordered list), carrying
  taskTypeId/taxonomyVersion/roleId.
- core/src/router.ts: replace the single preferred-endpoint check with a ladder walk (highest routable rung
  becomes the preferred endpoint; fall through on unavailable or ineligible rungs).
- cli.ts learner sweep: key activation by (roleId, taskTypeId).
- knowledge-worker: derive and persist the ladder (aggregate pairwise comparisons per scope), replacing the
  single scope.endpointId.
- knowledge-store: add the rollback path for a (role, task) ladder (R10).
- runtime-ui (learning.tsx, Packs page): render the ladder index (R12).
- evaluation-core comparison groups: add the created_at field (R6, net-new).

## Risks

- The ladder walk must respect both stored status and per-request eligibility at each rung, or fallback could
  promote an endpoint the request cannot route to. Mitigate with an eligibility filter before ranking (R4, R5).
- A pure, unit-tested scope-match function and a deterministic tie-break keep the N-way surface correct (R1, R3).

## Phases, tasks, subagents, and verification

Standing rules for every phase: the run is executed with parallel subagents under controller verification; strict
TDD (no production code without a failing test first, the recursive-tdd Iron Law); every subagent handoff is
bounded and re-verified by the controller before its output is accepted.

### Phase 0 — Requirements + worktree (this artifact, controller)
- Task: pin the baseline, fork the branch, write 00-requirements.md + 00-worktree.md.
- Verification: the draft covers every design-doc section (audit done); the operator approves, then LOCK.

### Phase 1 — AS-IS (controller + analyst subagents)
- Task: audit the code sites (the change list) in the baseline to confirm the defect claims: one
  activePackageId per runtime scope, advisory_task_unscoped / advisory_candidate_not_eligible refusals, single
  endpointId (no fallback), and the current Packs page rendering.
- Handoff: one analyst subagent per area (router + advisory source; knowledge-store/worker; runtime-ui), each
  returns findings with file:line citations; the controller re-verifies every claim before 01-as-is.md.
- Testing/verification: read-only; each claim must cite code, and the AS-IS must match the baseline commit.

### Phase 2 — To-be plan (controller + planner subagents)
- Task: map R1-R13 to the code sites, fix the implementation order and the failing tests per R#.
- Handoff: a planner subagent drafts 02-to-be-plan.md; the controller verifies it is traceable to every R#, the
  R13 primitive map, and the work packages below.
- Testing/verification: every R# has a named failing test before Phase 3 starts; no plan item without a test.

### Phase 3 — Implementation (implementer subagents, strict TDD, controller verification)
Work packages touch disjoint files (the change list), so they can run in parallel:
- Package A — ladder aggregation + replay record (R3, R6): knowledge-worker + evaluation-core.
  Sub-tasks: A1 weighted-verdict fold (confidence*agreement) RED test then code; A2 tie-break + total order;
  A3 created_at column (net-new) on the comparison group.
- Package B — ladder store + activation keying (R2, R7): knowledge-store learning_records kind='pack' with the
  (role_id, task_type_id) UNIQUE index, completeness + nextEligibleAtMs, rewrite-on-evidence; activatePack keyed
  by (roleId, taskTypeId).
- Package C — advisory + router ladder walk (R1, R4, R5): route-advisory-source returns the ordered ladder in
  place of the single preferredRoutePackage (carrying taskTypeId/taxonomyVersion/roleId); core/src/router.ts
  walks to the highest routable rung and falls through on unavailable or ineligible rungs.
- Package D — dispatch + activation + rollback (R8, R9, R10): depth-first dispatch (classification gate,
  30-day idle + refresh, top-down challenge); derived floor-based activation (no promote-then-activate);
  per-task rollback flag default OFF, backend check before serving, replay paused while ON, operator reason.
- Package E — Packs page UI (R12): ladder index rows (top-3, status badge, completeness), complete-first
  ordering, two-way Activate / Roll back toggle wired to the backend flag, per-task detail view.
- Handoff: one implementer subagent per package; each writes the failing tests FIRST, then the code, then runs
  the package suite; the controller re-runs the tests and verifies the diff before accepting.

### Phase 3.5 — Code review (code-reviewer subagents)
- Task: one review bundle per work package (recursive-review-bundle); the controller verifies every finding and
  applies the accepted fixes before 03.5-code-review.md.

### Phase 4 — Tests (tester subagents)
- Unit: the per-R# suites (aggregation determinism, tie-break, scope-match, ladder walk fallback, admission
  floor, rollback flag semantics, product-defaults wiring).
- E2E: the ladder lifecycle end-to-end (dispatch -> comparison -> aggregation -> activation -> rollback ->
  UI toggle).
- Regression: the existing run-104 replay/evaluation/learning suites stay green (no regressions in the
  pipeline the ladder builds on).
- Handoff: tester subagents run and report; the controller re-runs the full suite before 04-test-summary.md.

### Phase 5 — Manual QA + live verification (controller + subagent probes)
- Rebuild the runtime (paired build, dev channel) and verify the rebuilt DEV build on :3458 (healthz ready,
  no frame/identity errors).
- Verify routing via live pi requests: a task-scoped request is served by its matching pack's preferred
  endpoint; a non-matching pack is refused with advisory_task_mismatch; an unclassified request gets no
  advisory; the ladder walk falls through on unavailable/ineligible rungs; advisory_only is preserved.
- Verify the Packs page UI by inspecting it in the browser: rows ordered complete-first, top-3 + status +
  completeness shown, the toggle flips the backend flag (and a rolled-back task routes by baseline).
- Handoff: subagent probes may drive the pi requests and capture the UI; the controller inspects and records
  05-manual-qa.md with receipts.

### Phase 6-8 — Decisions, state, memory (controller)
- 06-decisions-update.md (decisions taken), 07-state-update.md (STATE.md), 08-memory-impact.md (durable
  memory extraction). No subagent handoffs; controller-authored and reviewed.

## Out of Scope

- Route-package routing (stage 4 of the proposal): the pack never OVERRIDES the router's score-based selection;
  it only supplies the preferred endpoint through the existing score-band/cohort/confidence gates. Packs stay
  advisory_only (R5).
- Production deployment; this is a dev/stage-channel implementation.
- The run-104 queue fixes (R22-A/B/R24) themselves — they are in the baseline; only the stage-3 ladder work is in
  scope.
- Any change to the activation-policy stage ladder (S0-S4) semantics.

## Constraints

- Baseline: public origin/dev @ 701b8b8f + private origin/dev @ c993b2f2 (the run-104 merge; the R22-B role/task
  plumbing the pack scope needs is IN this baseline, so no prerequisite merge remains).
- The design doc docs/route-learning-stage-3-matching-scope-activation.md is in the baseline and is the source of
  truth for the ladder semantics.
- Effect is the default substrate (RECURSIVE.md rule 6; read .agents/skills/effect-ts/SKILL.md before Effect code).
- The stage channel runtime (built from this baseline) is live on :3457 for verification; the run must rebuild it
  after changes (paired build: private build:run00-runtime with ROLE_MODEL_BUILD_CHANNEL=stage +
  ROLE_MODEL_TAXONOMY_DATA_ROOT, then public runtime:package-sea with ROLE_MODEL_BUILD_CHANNEL=stage).
