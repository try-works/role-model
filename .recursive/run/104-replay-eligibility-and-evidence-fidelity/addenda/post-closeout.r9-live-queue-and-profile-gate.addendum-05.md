# Post-closeout addendum 05 — live-queue verification and the "operational profile" gate

## Correction to addendum 04
Addendum 04 attributed the missing capture to the pi CLI's OpenAI shim classifying requests as a debug probe.
That is incorrect: the pi CLI's `pi-role-model` plugin classifies each request with a taxonomy before it reaches
the router, so the classification is automatic and real, not a debug-probe fallback.

## Queue verification (live pi requests)
1. Live `pi` requests deliver route captures: `deferred-route-captures.sqlite` shows 6 `delivered` receipts and
   0 pending; each receipt carries `routingDecisionId`, `endpointId` (= luna) and
   `replaySource.eligibleEndpointIds = [luna, sol-medium]`.
2. The auto-replay loop dispatches them: `replay-status` reports `counterfactuals: 1, dispatches: 1`, and the log
   shows `replay-req-…:controller` arms with `pass=replay` (each arm pinned to one endpoint).

## The actual gate: the endpoint "operational profile" is in shadow-safety mode
The replay reaches the comparison builder, which refuses with
`A live runtime observation must produce an operational profile.` The profile-learner's health probe returns
`productionActivation: false`, `probe: "profile_shadow_safety"`, `snapshotCount: 0`,
`estimateGenerationCount: 0`, and the learning rollout readback is
`{"state":"disabled","activePackageId":null}`.

The endpoint operational profile (the telemetry estimate the comparison builder needs) is only produced after the
learner's production activation, which is gated on an activated route package — i.e. on a finalized comparison
plus promotion. The first finalized comparison needs the profile, which needs an activated pack, which needs a
finalized comparison. The learner's production activation is therefore the single remaining operator-level gate.

## Conclusion
R9's plumbing is correct and verified; the queue + classification path is confirmed live. The only remaining gate
is the learner's production activation (route-package rollout), which the operator must seed/enable before the
first comparison can finalize.
