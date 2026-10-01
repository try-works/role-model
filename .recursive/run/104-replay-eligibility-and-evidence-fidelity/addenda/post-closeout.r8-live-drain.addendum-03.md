Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `Post-closeout addendum` (records the specific `R8` live-drain issue before implementation)
Status: `LOCKED`
LockedAt: `2026-10-01T22:21:25Z`
LockHash: `ff039d6e2a55a919475e5a4ae77a8bf8c75a6776ece27cbcd706b194c4b68d18`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/post-closeout.r9-r8-pickup.addendum-01.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/phase5-status.md`
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/post-closeout.r8-live-drain.addendum-03.md`
Scope note: Records the exact `R8` live-drain prerequisite and its fix. Weakens no requirement.

## TODO

- [x] State the exact live-drain prerequisite
- [x] State the exact fix (route-package seed + re-run window)
- [x] Lock this addendum

# Addendum 03 (post-closeout): R8 live-drain route-package issue

## Issue

`R8`'s live acceptance criterion ("the stuck count drains under the run's live window") could not be
shown on a fresh state root: the runtime logs `live advisory observation skipped: route advisory
observation requires decision and route package`, so the live replays defer with `replay_failed` and
never finalize. The in-suite half of `R8` is verified; only the live drain is unproven.

## Fix

1. Provide a route package on the run channel: seed the fresh state root with a targeted slice of the
   stage artifact store (the route package produced by earlier runs), so route advisory observation is
   no longer skipped.
2. Re-run the monitored window and record the disposition readback showing the stuck count drains
   (delayed / failed without a terminal reason -> finalized or refused/retired by name).
3. Record that `learner.promote` emits no terminal `candidate_not_validatable` in the window and at
   least one comparison reaches `status = 'finalized'`.
4. If the seed cannot be completed (artifact store unavailable), record that as an explicit
   blocked-with-reason disposition, not a silent skip.

## Traceability

- `R8` -> `SP10` / `SP5` -> `scripts/track-b/runtime-operations-server.mjs` (private) plus the route-package seed.

## Coverage Gate

- [x] The exact live-drain prerequisite and the exact fix are stated

Coverage: PASS

## Approval Gate

- [x] Weakens no requirement

Approval: PASS
