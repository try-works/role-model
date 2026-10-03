# Post-closeout addendum 14 — replay samples are valid operational observations

## Root cause
`createRuntimeObservationBundle` throws `A live runtime observation must produce an operational profile.`
whenever `aggregateOperationalPerformanceSamples` returns null, and that function returned null because it
filtered samples through `isLiveSourceType` which admitted only `live`/`live_request`. The replay arm declares
`executionTrafficClass: "replay"` (`cli.ts:8267`), so its sample's `source_type` is `replay`, it was excluded,
and the replay observation failed closed.

## Fix
Widen `isLiveSourceType` (profile-aggregator) to admit `replay`, `evaluation` and `probe` in addition to
`live`/`live_request` — those executions are real provider calls and are valid operational observations.
`benchmark` stays excluded: benchmark samples are durable input evidence, never a live projection.

## Verification
- profile-aggregator tests 14/14 (added: a `replay` sample produces a profile; a lone `benchmark` sample still yields null).
- `tsc --noEmit` exit 0.
