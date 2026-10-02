# Addendum 23 — the live route advisory is inert (applied 0/6842): a scope-wide active pack plus a stalled learner promote

Status: post-closeout diagnosis. No code changed by this addendum; it records the live readback and the
causal chain the operator asked to verify.

## The operator's concern, confirmed

"Learner packs are being refused during routing decisions." Measured on the live :3457 stage runtime
(state root role-model-runtime-stage / standalone-runtime-stage, 2026-10-03):

| metric | value |
| --- | --- |
| observed | 6,842 |
| applied | **0** |
| wouldHaveChanged | 129 (all origin: shadow) |
| considered | 3,990 |
| preferredEligible | 539 |

The learner has never moved a single live decision. The 129 wouldHaveChanged entries are shadow-mode
predictions (selection: baseline_retained), not live applies.

Live fallbackReason distribution (advisory-observations.json, 5,000-entry window):

| reason | count | meaning |
| --- | --- | --- |
| advisory_candidate_not_eligible | 1,830 | pack prefers an endpoint the request cannot route to |
| advisory_unavailable | 654 | no fresh advisory |
| advisory_task_unscoped | 410 | scope-wide pack x task-scoped request |
| (no fallback) | 966 | considered, no change |

## The active pack is scope-wide

The single active package is pack-55a1cd6a75c39d608ad57b48e4ad31a3d86d5fb5f54926b6e05f6a9349db32a0,
activated 10-02 16:44:05, cohortStep 1, cohort 10%, ladder [10, 25, 50, 100]. Its scope is endpoint-only:

    endpointId = deepseek.personal.deepseek-api-key.global.deepseek-v4-pro
    roleId     = null
    taskTypeId = null

That is a legacy pack produced by the replay-intent path before the R22-B role/task plumbing. Because the
advisory carries taskTypeId null, the router refuses it for every request that declares a task family
(core/src/router.ts: if (!advisoryTaskTypeId) return fallback('advisory_task_unscoped')) — the 410 entries.

The larger refusal is advisory_candidate_not_eligible (1,830): the pack's endpointId is v4-pro, so its
advisory always prefers v4-pro, and v4-pro is in the eligible set for only 539 of 6,842 decisions. The
router is failing closed correctly — it is the pack's learned preference that does not apply.

## Why a task-scoped pack never takes over (question 1)

There are 14 validated role/task-scoped packs already in the store (researcher.web_research.current,
designer.ui.review, writer, support), and all 50 packs share scope_id = standalone-runtime-stage. They are
orphaned by two facts:

1. Activation is one-active-pack-per-scope, keyed by the runtime scope (standalone-runtime-stage), not by
   role/task. The single slot is occupied by the scope-wide pack.
2. The learner sweep only activates a pack in the same tick it promotes that candidate
   (cli.ts learner sweep -> knowledge:activate-pack). It never re-selects an already-validated pack, so the
   14 waiting packs are never reconsidered once a scope-wide pack holds the slot.

And since ~16:44 on 10-02 the promote step itself has been failing, so nothing new can be promoted or
activated at all. The runtime log repeats:

    [run101] learner promote attempt failed:shadow-... candidate_not_validatable: ... no finalized comparison was available to validate

That is the run-104 goal's own blocker: the replay/evaluation queue is not producing a finalized
comparison (with effortComparability), so the learner cannot validate or promote any candidate, and the
stale scope-wide pack stays active indefinitely.

## The v4-pro eligibility mismatch is a second-order effect, not an independent defect (question 2)

The candidate_not_eligible refusals are the scope-wide pack's endpointId (v4-pro) surfacing as its
preferredRoutePackage. The router is correct to refuse it when v4-pro is ineligible (the eligibility log
records POLICY_DENY_ENDPOINT for the non-v4-pro candidates). This is downstream of the same R22-B defect:
the pack was stamped with endpointId v4-pro and no family, so it both (a) cannot match a task-scoped request
and (b) prefers a rarely-eligible endpoint. A correctly task-scoped pack would fix (a) but would still be
refused whenever its learned endpoint is ineligible for the request — worth watching, but not a separate
eligibility bug.

## Relationship to the fixes already in flight

R22-B (commit 95db1df6) fixes the plumbing so new replay-intent packs carry role/task. It does not, by
itself, revive this runtime: the active pack predates the fix, and the learner cannot produce its
replacement until the run-104 queue yields a finalized comparison. The one-active-pack-per-scope activation
model is intentionally unchanged (see the run's scope decision); this addendum is a diagnosis, not a change.

## What the proposal says this should be (read after the above)

The original proposal (OneDrive .../proposals/crowdsourced-evals/docs) settles the framing. Route
learning is SHADOW-ONLY in v1.1 by design: TB10's non-goal is 'activate route packages in v1.1',
TB10-REQ-02 requires 'no candidate experience or route package activates in production in v1.1',
TB10-REQ-07 keeps the Knowledge Worker 'in shadow mode ... never injects unpromoted experiences', and the
cumulative scenario is DTB-SCENARIO-ROUTING-LEARNING-SHADOW-NO-ACTIVATION.

The rollout is a four-stage ladder (guidance/13_profile_learner.md, 'Post-v1 route-package attribution'):

1. attribution only - router unchanged;
2. shadow recommendation - report likely improvement WITHOUT applying it;
3. controlled activation - only promoted safe_for_prompt packs with MATCHING SCOPE, a confidence
   threshold, explicit policy, usage receipt, and rollback;
4. route-package routing - a later policy selects the full tuple after sufficient evidence.

So the applied:0 and the 129 shadow wouldHaveChanged are the intended stage-2 state, not a defect. The
machine contract also pins packCandidate.priority to `advisory_only` (a pack can never route directly, it
only advises) and makes the pack scope a multi-dimension tuple {roleId, taskTypeId, endpointId, ...}.

That reframes the fix: the live runtime's one-active-pack-per-RUNTIME-scope (scope_id =
standalone-runtime-stage) diverges from stage-3 'matching scope'. The advisory_task_unscoped refusal is
itself correct under matching-scope - a scope-wide pack must not match a task-scoped request - the defect
is that activation holds a single scope-wide slot instead of selecting per (role, task). Making packs
actually route is therefore stage-3 matching-scope activation keyed by the scope tuple, NOT turning shadow
into active, and P0 remains the finalized comparison (the validation receipt needs confidenceLower,
holdoutSampleCount and qualityDelta, which only a finalized comparison supplies).

