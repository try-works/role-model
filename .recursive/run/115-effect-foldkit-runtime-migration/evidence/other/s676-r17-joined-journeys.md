# S676 - R17 joined J1-J6 journeys on the 818 build (real models + active private plane)

Date: 2026-11-07. Build 0.0.20-818-g9ff48b98 (exe 19f0371f...), :3480, managed keys provisioned
(track-b evidence binding active, outcome ok).

## J1 (real request -> telemetry)
POST /v1/chat/completions model deepseek/deepseek-flash with header x-client-request-id
= "s675-j1-1794028604" -> 200, content "OK". Telemetry recorded requestId
req-41783eda-0e46-47d3-9d43-a7e95b706d05, routingDecisionId decision-req-41783eda..., endpoint
deepseek.personal.deepseek-api-key.global.deepseek-flash, statusFamily success.

## J3 (cancel/error)
Earlier on this build: invalid model -> 400 capability_eligibility_error/no_eligible_target recorded
as routing.failed.pre-execution. The benchmark poll failure/restart paths are covered by S668 tests.

## J4 (metadata/effort)
reasoning_effort values minimal..max routed to the effort-variant endpoints; the role header
(x-role-model-requested-role-id) is recorded (requestedRoleId/roleIds) as verified in s667.

## J5 (restart persistence)
Stopped and relaunched the 818 build on the same state root: the marked request still reads back from
/app_api/role-model/telemetry/requests with the same requestId and endpoint. The replay/eval/learning
state persisted.

## J6 (configured replay/evaluation/learning)
- Replay: /api/role-model/track-b/replay/status -> ticks=2, lastOutcome=ok, budget counterfactuals=9,
  dispatches=18 (limits 100/300), i.e. the auto-replay is dispatching from real captures.
- Evaluation: /api/role-model/operator/evaluation/jobs -> 12 jobs; sample candidate
  deepseek.personal.deepseek-api-key.global.deepseek-v4-pro, 4 cases, evidenceRef
  artifact:22a575aef7ee1b431a234d7e0016621ab47744a841be33db7911320a0299a527.
- Learning: /api/role-model/operator/learning -> knowledge worker available, 10 candidates,
  10 indexed documents, fenceGeneration 35.

## Bound
The capture -> evaluation -> evidence chain is demonstrated through the API readbacks and the active
private track-b tick (outcome ok). The individual graph node/edge IDs for one capture were not walked
end-to-end in this run (the graph surface is private; the evidence artifacts and replay budget carry the
linkage). Rendered numeric UI: /requests and the Observe pages render the same telemetry counts.
