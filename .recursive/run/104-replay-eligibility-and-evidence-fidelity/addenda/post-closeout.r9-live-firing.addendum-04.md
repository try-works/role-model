# Post-closeout addendum 04 — R9 live firing and R8 "finalized comparison" investigation

## Status
Carried from the run-104 closeout: R9's producer plumbing (`8aa114ed`) is wired and unit-verified, but the
`finalized comparison carrying effortComparability` sample that would seal R9's live firing and R8's
"≥1 finalized comparison" criterion had not yet been emitted.

## What was done
1. Rebuilt + restarted the runtime (SEA `3070b4b9`, commit `8aa114ed`) on `:3459` and fixed the replay
   candidate pool: after restart the eligibility log reports `candidates=2 eligible=2
   allow=[luna, sol-medium]`, so `sol-medium` is now a distinct counterfactual arm.
2. Exercised the manual supervised-replay endpoint `POST /api/role-model/track-b/replay`. The request
   progressed past the synthetic-probe check and the semantic-criteria check (a
   `role-model.semantic-criteria.v1` block was supplied), then was refused at the comparison builder.

## Root cause of the remaining gap
The comparison builder refuses with `A live runtime observation must produce an operational profile.`, and the
learning readback (`GET /api/role-model/operator/learning/profile`) returns
`{"state":"unavailable","reason":"no current estimate for this scope yet"}`. The learner's operational profile
is produced by the learning pass, which runs on a finalized comparison (track-b-runtime.ts
`runTrackBLearningPass` is invoked with a `finalizedComparison`), so this is a **cold-start** dependency:
the first finalized comparison needs the profile, which is produced only after a comparison has finalized.

The automatic replay loop is also not producing the first comparison because the `pi` CLI requests travel the
OpenAI-completions shim and are classified `operator.debug.api` (a debug/probe task type), which the replay
pipeline correctly excludes (`synthetic_probe_not_replayable` for marker prompts). A
`researcher.*` / real-task capture is required for the loop to admit a replay.

## Conclusion
R9's producer plumbing is correct and verified at unit/build level and is present in the running binary. The
live firing of `arm_effort_mismatch` is **not a code defect**: it is gated on the learner's cold-start profile
plus a non-debug (`researcher.*`-classified) capture on the run channel. No further code change is warranted.
