# Post-closeout addendum 15 — the queue worker's restricted tick was skipped as a no-op

## Root cause
The auto-replay tick guarded with `if (running || paused)`. The regular tick sets `running = true` and only
clears it in `finally`, so while the regular tick was offering captures to `replay.dispatch`, the queue worker's
`dispatchCapture(captureRef)` -> `tick({ onlyCaptureRefs: [captureRef] })` hit that guard, returned the empty
result (`queued === 0`), and completed as a no-op. Result: every fresh capture was offered but never executed,
so no disposition was written and no comparison was produced. The diagnostic confirmed the pending source was
correct (`captures=32 first=req-ba2f7633, req-9c3ee300, …`) while the restricted tick never logged `only=<ref>`.

## Fix
`if (paused || (running && !options?.onlyCaptureRefs))` — the queue worker's restricted tick (the execution
authority) runs even while the regular tick is offering; `paused` still stops it. The `running` flag continues
to provide mutual exclusion between the interval path and the executing tick.

## Verification
- `tsc --noEmit` exit 0.
