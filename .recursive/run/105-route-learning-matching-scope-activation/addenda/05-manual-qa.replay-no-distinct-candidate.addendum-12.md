Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `05 Manual QA`
Status: `DRAFT`
Addendum: `replay-no-distinct-candidate`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `05-manual-qa.md`
- `evidence/phase5/pi-intent-e2e/`

## Summary

Live Phase 5 follow-up: the coder.edit ladder stalled at `partial (2/4)` because the replay dispatcher refused
every remaining capture with `no_distinct_candidate_configured: no configured candidate differs from the source
candidate`. This addendum records the root cause and the fix.

## Root cause

`selectReplayCandidates` (the arm planner) returns an empty list, which `decideReplayAdmission` refuses as
`no_distinct_candidate_configured`. The dispatcher narrows the plan to the single endpoint the top-down ladder
walk chose (`planFocusDispatch`), and that endpoint is then filtered out by the arm planner because it is the
configured judge.

Two facts make the first repair (exclude the static judge only) insufficient:

1. The configured judge is resolved per tick (`resolveControllerJudge`). When the judge is the SOURCE endpoint,
   the tick substitutes an ALTERNATIVE judge (`selectAlternativeJudgeEndpoint`) and excludes THAT endpoint from
   the arms. `planFocusDispatch` did not know about the alternative, so it still picked an endpoint the arm
   planner then rejected.
2. Effort is NOT a matching requirement for counterfactual replays. `readReplayRequestRequirements` reads only
   `requiredModalities` and `requiredCapabilities`; effort is a preference (`preferEffortMatchedReplayArms`),
   never a hard filter. The capability half is satisfied by the existing `supportsCapabilityRequirement`
   `code.edit` -> `code.read`/`code.write` implication.

## Fix

`planFocusDispatch` now accepts an optional `excludedEndpointIds` list. The dispatcher resolves the judge per
tick, adds the judge to that list, and when the judge is the source also adds the ALTERNATIVE judge via
`selectAlternativeJudgeEndpoint`. The focus planner therefore skips the effective judge and selects a genuinely
available unranked endpoint.

- `role-model-router/packages/core/src/route-ladder-dispatch.ts`: `planFocusDispatch` skips
  `excludedEndpointIds`.
- `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay-runtime.ts`: resolves the judge and its
  source-dependent alternative, passing both as `excludedEndpointIds`.

## Verification plan

- Rebuild the dev runtime and relaunch on `:3458` (never `:3457`).
- Confirm coder.edit advances from `2/4` toward `4/4` as the dispatcher admits `deepseek-flash` and
  `moonshot kimi-k3`.
- Drive a second taxonomy task (e.g. `coder.review`) and confirm it also builds a ladder through replays.
- Confirm the live advisory is `fresh` and the router recalls it (recall hit), i.e. the ladder is taken up in
  routing decisions.

## Related repairs (same live session)

- `d797a185`: capture/advisory classification reads the authoritative taxonomy identity (not runtime-policy ids).
- `50705bdc`: advisory source reads the inner `route_ladder_evidence` document from the host envelope so the
  content-addressed digest matches `packId`.
- `e163db97` + this fix: exclude the effective judge from the replay focus-dispatch arm selection.
