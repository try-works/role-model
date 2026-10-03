# Post-closeout addendum 16 — auto-replay evaluation handoff now records the resume entry (R9 producer plumbing)

## Problem
The auto-replay executor (`cli.ts:7370`) called `offerEvaluationHandoff` — offer only — while the supervised
path (`cli.ts:8586`) used `offerRecordedEvaluationHandoff` + `recordEvaluationResumeEntry`. The resume entry is
what carries `counterfactualPackages`, `effortComparability` (`classifyReplayArmEffort`), `evaluationCriteria`
and `scope` into the scoped resume store. Without it the evaluation worker's `resume` was a silent no-op, so a
fresh replay that reached `awaiting_evaluation` never produced an evaluation job and the comparison never carried
`effortComparability`.

## Fix
- `startHostAutoReplayLoop` now takes an `endpointDescriptors` provider (endpointId/modelId/reasoningEffort) fed
  from `created.effectiveRegistry.endpoints`.
- The auto-replay executor, when a handoff is requested, builds the arm descriptors for the planned candidates,
  computes `classifyReplayArmEffort({ arms, sourceModelId, sourceReasoningEffort })`, and records the resume entry
  via `evaluationResumeStoreRef.current.record(...)` (counterfactual packages + effortComparability +
  evaluationCriteria/digest + scope) before `offerRecordedEvaluationHandoff`.

## Verification
- `tsc --noEmit` exit 0.
