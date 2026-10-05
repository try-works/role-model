# Addendum 14 — Run 105 closeout: state-ledger delta and carried-forward caveats

Run: `105-route-learning-matching-scope-activation`  
Phase: `07 State Update` (post-lock addendum; the locked `07-state-update.md` is not modified)  
Date: 2026-10-05

## Why this addendum exists

Bug 3 was root-caused, fixed, and verified after the run's phases were locked (see
`05-manual-qa.replay-no-distinct-candidate.addendum-13.md`). The verification changed the state
ledger, so the delta is recorded here rather than by editing the locked phase document.

## State Changes Applied

Appended a **"Run 105 closeout — bug 3 verified, four operational caveats carried forward"** block
directly beneath the run-105 paragraph in the first `## Current State` section of
`/.recursive/STATE.md`. The block records:

1. The verified end state — `coder/coder.edit` and `coder/coder.config` both at **4/4**, with
   `kimi-k3` (the configured controller, hence the judge) admitted as a challenger and
   `evaluation_judge_switches` showing `kimi-k3 -> deepseek-flash` from `dedupeJudgeAgainstPair`.
2. The queue state at closeout — 28 dispositions (24 `replayed`), 36/39 replay jobs `complete`,
   0 deferred-pending, 0 capture-WAL rows, 0 stuck ledger reservations.
3. The four operational caveats (see addendum 13 §6 for the full analysis): `kimi-k3` provider
   flakiness; the orphaned `awaiting_evaluation` job that stalls the dispatcher; advisory influence
   still narrow under the shadow cohort; and the managed `artifact-digest.key` not being provisioned
   by a direct launch (which presents as `route dispatch evidence unavailable`).

## Resulting State Summary

`/.recursive/STATE.md` now carries both the run-105 shipped-fix summary and the caveat block, so the
next replay-lane increment sees the open items without re-deriving them. The locked phase artefacts
(`00`–`08`) are unchanged; this addendum and addendum 13 carry the post-lock truth.

## Traceability

* Queue/disposition/job figures: live `:3458` state root `E:/tmp/run105-full2-verification-state`,
  `standalone-runtime-dev` scope — `track-b/replay-disposition.sqlite`,
  `track-b/extensions/workers/replay-core/replay-core.json`, `track-b/deferred-route-captures.sqlite`,
  `track-b/capture-queue.sqlite`, `track-b-replay-ledger.json`, `track-b/advisory-observations.json`.
* Ladder evidence: `/api/role-model/operator/learning/records` (ladder readback) and the
  `evaluation_comparison_groups` / `evaluation_judge_switches` tables.
* Fix commits: public `d797a185`, `50705bdc`, `f16d9551`, `a6a57cd4`, `07dcd9f8`, `e21eae5e`, `96f57f13`;
  private `e7eb4111`.

## Coverage Gate

- [x] The state delta is applied to `/.recursive/STATE.md`.

Coverage: PASS

## Approval Gate

- [x] The recorded caveats match the observed live evidence and the verified fixes.

Approval: PASS
