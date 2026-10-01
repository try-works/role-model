Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `Post-closeout addendum` (re-opens the deferred `R8` and `R9`; amends `02-to-be-plan.md` and supersedes the deferral recorded in `04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`)
Status: `LOCKED`
LockedAt: `2026-10-01T21:46:08Z`
LockHash: `8718444319f747c02df6cc183fdc44c0550b5a85846604473418cbad3e3e4344`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/post-closeout.r9-r8-pickup.addendum-01.md`
Scope note: This addendum reverses the deferral recorded for `R8` and `R9` only. It does not touch `R1`-`R7`, `R10`-`R15`, nor the already-locked implementation, QA, or closeout records for any other requirement. It weakens no requirement.

## TODO

- [x] State what was deferred and the operator decision to pick it up
- [x] Amend the plan with the `R9` producer-wiring steps
- [x] Amend the plan with the `R8` route-package and live-drain steps
- [x] State the impact on traceability and the re-lock path
- [x] Lock this addendum

# Addendum 01 (post-closeout): pick up the carried `R8` and `R9`

## What was deferred, and why

`04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` recorded two carried commitments as deferred
rather than closed:

1. `R9` producer plumbing: the private exclusion (`arm_effort_mismatch`, private `885eda30`) and the
   durable arm-effort dimension on the replay resume entry exist and are tested, but the public producer link
   (`cli.ts` -> `track-b-runtime.ts`) does not thread that resume entry into the post-observation
   comparability builder, so the exclusion cannot fire against a live comparison.
2. `R8` live disposition drain: the in-suite half is verified, but a fresh state root has no route package
   (`live advisory observation skipped: route advisory observation requires decision and route package`), so
   the live replays defer and the stuck-count drain could not be shown.

The operator decision is to pick both up inside this run rather than open a new run, because the private
consumer contract, the dimension, and the in-suite halves are already landed and locked; only the public
producer thread and the route-package seed remain.

## Amended steps - `R9` producer wiring

1. Thread the replay resume entry (which already carries the arm-effort dimension) into the post-observation
   comparability builder in `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, so the
   comparison tuple carries arm effort alongside `judgeOrderPolicy`.
2. Ensure `role-model-router/apps/runtime-host-bridge/src/cli.ts` supplies that resume entry to the builder.
3. Add a RED/GREEN bridge test proving the comparability tuple carries the arm-effort dimension end to end.
4. Re-run the private Track B exclusion suite to prove `arm_effort_mismatch` fires against the live-shaped
   comparison (not only the unit-level consumer).
5. No second comparability-key representation is introduced (per `R9` acceptance).

## Amended steps - `R8` live disposition drain

1. Provide a route package on the run channel: seed the fresh state root with a targeted slice of the stage
   artifact store (route package produced by earlier runs), so route advisory observation is no longer skipped.
2. Re-run the monitored window and record the disposition readback showing the stuck count drains (delayed /
   failed without a terminal reason -> finalized or refused/retired by name).
3. Record that `learner.promote` emits no terminal `candidate_not_validatable` in the window, and at least
   one comparison reaches `status = 'finalized'`.
4. If the seed cannot be completed (artifact store unavailable), record that as an explicit
   blocked-with-reason disposition, not a silent skip.

## Traceability

- `R9` -> `SP6` -> `role-model-router/apps/runtime-host-bridge/src/{cli.ts,track-b-runtime.ts}` (public)
  and `extensions/evaluation-core/index.mjs` (private, `885eda30`).
- `R8` -> `SP10` / `SP5` -> `scripts/track-b/runtime-operations-server.mjs` (private) plus the
  route-package seed.

## Coverage Gate

- [x] Both deferred commitments are re-stated with the exact gap and the amended steps
- [x] The re-lock path (phase order) is stated

Coverage: PASS

## Approval Gate

- [x] The addendum reverses only the two deferrals and weakens no other requirement

Approval: PASS
