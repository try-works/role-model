Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `Post-closeout addendum` (records the specific `R9` producer-threading issue before implementation)
Status: `LOCKED`
LockedAt: `2026-10-01T22:21:25Z`
LockHash: `426593491fd179b8432e3e8074026f1157e7fd149477b889a2621d5c73175a34`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/post-closeout.r9-r8-pickup.addendum-01.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md` (LOCKED)
- `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` (SP6 `classifyReplayArmEffort` / `preferEffortMatchedReplayArms`)
- `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` (comparability builder)
- `extensions/evaluation-core/index.mjs` (consumer `normalizeArmEffortComparability`, `arm_effort_mismatch`)
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/post-closeout.r9-producer-threading.addendum-02.md`
Scope note: Records the exact `R9` producer gap and its fix. Weakens no requirement and reuses the already-tested SP6 classifier.

## TODO

- [x] State the exact producer gap
- [x] State the exact fix (reuse `classifyReplayArmEffort`)
- [x] State the RED/GREEN test
- [x] Lock this addendum

# Addendum 02 (post-closeout): R9 producer-threading issue

## Issue

The private consumer (`extensions/evaluation-core/index.mjs`) reads `comparability.effortComparability`
via `normalizeArmEffortComparability`: a bounded (<=8) list of per-arm records
`{endpointId, modelId, sourceModelId, reasoningEffort, sourceReasoningEffort, comparability}` where
`comparability` is one of `matched | mismatched | source_effort_unspecified | arm_effort_unspecified`,
and a `mismatched` arm produces the `arm_effort_mismatch` exclusion. The public producer never writes
`effortComparability`, so the exclusion cannot fire on a live comparison.

## The SP6 half that already exists

`track-b-replay-policy.ts` already exports `classifyReplayArmEffort({arms, sourceModelId, sourceReasoningEffort})`,
which returns exactly the records the consumer expects. It is used in `cli.ts` for arm SELECTION
(`preferEffortMatchedReplayArms`) but is never called in the comparability builder.

## Fix

1. Import `classifyReplayArmEffort` into `track-b-runtime.ts`.
2. In the comparability builder (the `const comparability = { ... }` block that already carries
   `judgeOrderPolicy`), add:
   `effortComparability: classifyReplayArmEffort({ arms: counterfactualRollouts, sourceModelId: sourceRollout.modelId, sourceReasoningEffort: sourceRollout.reasoningEffort })`.
3. RED/GREEN: a bridge test proving the comparability block carries `effortComparability` end to end.

## Traceability

- `R9` -> `SP6` -> `track-b-runtime.ts` (producer) and `extensions/evaluation-core/index.mjs` (consumer).

## Coverage Gate

- [x] The exact producer gap and the exact fix are stated

Coverage: PASS

## Approval Gate

- [x] Weakens no requirement; reuses the already-tested SP6 classifier

Approval: PASS
