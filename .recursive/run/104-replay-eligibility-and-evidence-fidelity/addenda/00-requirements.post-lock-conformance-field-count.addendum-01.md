Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `00 Requirements - post-lock addendum 01`
Status: `LOCKED`
LockedAt: `2026-10-01T08:08:25Z`
LockHash: `95e72a47bb7d212955237edb854bf5b8361699893f469f6313a8fed82383dd2b`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED, hash `ff9fe4a6`)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` (Phase 1 draft)
- Phase 1 analyst draft `evidence/other/as-is/learner-conformance.md` (T1.2i)
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`
Scope note: Corrects the `R11` premise after Phase 1 measured the conformance failure against the pinned private
baseline.

## TODO

- [x] State what in the locked requirement was wrong
- [x] Provide evidence for why the amendment is needed
- [x] Specify the amended acceptance criteria
- [x] State the impact on traceability
- [x] Lock this addendum

## What was wrong

`R11` states that `run99 R33` fails on "24 unconsumed activation-policy fields" and lists them. That count was
measured against the **stale private controller checkout** (`06c61411`), not against the run's pinned baseline.
`06c61411` is an ancestor of the pinned baseline `5df90b6d`; the intervening commits (the run-101 closeout series
and PR `#121`, "route-learning: align the latency-selection bounds and default with the shipped read side") wired
22 of those fields. The error is the same class this run exists to prevent: a measurement taken from the wrong
baseline.

## Evidence

- Private worktree at the pinned baseline:
  `git -C D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity rev-parse HEAD`
  -> `5df90b6d12772f70bbdaff543b183fc5d312537b`.
- `node --test tests/track-b/run99-r33-policy-consumers.test.mjs` in that worktree -> one failing assertion:
  `published policy fields with no consumer: perArmOutputEvidence, perArmOutputExclusionBound (wire them or
  remove them, and shrink KNOWN_UNWIRED)`.
- Controller verification of the older measurement:
  `git -C D:\DEV\role-model-internal merge-base --is-ancestor 06c61411 5df90b6d` -> true; the 24-field run was
  reproduced only in the controller checkout at `06c61411`.
- The ratchet semantics are unchanged at the pinned baseline: `KNOWN_UNWIRED = new Set([])` and the assertion is
  `deepEqual(unwired, [])`, so only wire-or-remove is valid.

## Amended requirement text

`R11` acceptance criteria are amended to:

- `run99 R33` fails on exactly two published activation-policy fields with no runtime consumer at the pinned
  baseline: `perArmOutputEvidence` and `perArmOutputExclusionBound`.
- Each of the two fields is either wired to a real runtime consumer (`extensions`, `shared`, `scripts`, `cloud`,
  or the public `role-model-router/apps` tree; `runtime-ui` rendering does not count) or removed from the
  published policy JSON and every reader that still names it. The `KNOWN_UNWIRED` ratchet stays empty.
- The private suite passes in a fresh worktree at the pinned baseline (the lane may still fail for other
  reasons; those must be enumerated separately with their own reproductions).

The 24-field list in `R11` is superseded; `SP8`'s scope is the two-field set plus whatever the lane reports after
the fix.

## Impact on traceability

- `R11` only. `T1.2i` (Phase 1) now records the two-field set; `SP8` implements it; the R33 command in `R11`'s
  verification is unchanged.
- No other requirement is affected; `R7`/`R8`/`R14` already read the run-101 closeout code that these two fields
  belong to, so the reduced scope does not remove coverage.

## Coverage Gate

- [x] The amended claim is observable and testable (`node --test tests/track-b/run99-r33-policy-consumers.test.mjs`)
- [x] The correction is grounded in a reproduction at the pinned baseline, not a code reading
- [x] The amendment narrows `R11` without removing any acceptance criterion

Coverage: PASS

## Approval Gate

- [x] The operator approved the run and instructed the controller to unlock and edit the requirements as needed
  (this thread, 2026-10-01); the correction is a factual repair, not a scope change

Approval: PASS
