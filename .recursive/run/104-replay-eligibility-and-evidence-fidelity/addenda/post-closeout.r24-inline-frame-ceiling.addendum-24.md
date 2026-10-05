# Addendum 24 — the run-104 queue stall is the 16 KiB inline-frame ceiling (raised to 1 MiB)

Status: fixed in source (commit a2f8d0e6); live verification pending a rebuild + redeploy.

## Root cause

Driving the queue to a finalized comparison showed the *literal* goal is already met - 156 comparison groups
are `status: finalized`, 26 carry `effortComparability` - but the learner's promote stayed at `consumed: 0`
('no finalized comparison was available to validate'). The stall is one hop downstream: the post-finalization
signals sweep ([run176], cli.ts) reads each finalized comparison's replay job via `replay:job`, and that
single-job response exceeds the extension protocol's inline-frame ceiling. The live log has **9,372**
occurrences of:

    [run176] finalization signals refused comparison:supervised-replay:…: extension replay-core failed: frame exceeds inline limit; use a channel-local transfer artifact

`MAX_INLINE_BYTES` in `packages/extension-sdk/index.mjs` was `16 * 1024`. A single durable object - a replay
job, or a finalized comparison group whose `result_json` is ~40 KiB with reference-proofs repeated per member -
crosses it, so `encodeFrame` refused the answer. Because the signal reports never persisted, the learner's
candidate validation could not complete, which is the same 16 KiB class as R22-A (the evidence join) and
addendum 07 (replay-core list-jobs).

## Fix

Raise `MAX_INLINE_BYTES` from 16 KiB to **1 MiB**. This is the single source of the 'frame exceeds inline
limit' error (`encodeFrame` / `decodeFrame` both read it), so every host/worker implementation that imports
the SDK codec picks it up. 1 MiB is still bounded and far below the 64 MiB transfer-artifact cap, but large
enough that one durable object (not a whole page) travels inline. Callers must still page their own reads.

Two 16 KiB policies were deliberately **not** raised, because they are conservative policies rather than the
frame limit:

- the host's input check (`oversized inline-worker payload is prohibited`) at 16 KiB;
- the worker's output-externalization threshold (`MAX_INLINE_OUTPUT_BYTES`) at 16 KiB.

Their tests pinned 'oversized' fixtures at 20 KiB; those fixtures now sit at 2 MiB so they still exercise the
transfer-artifact path under the larger frame.

## Verification

- `packages/extension-host` suite: **21/21 pass** (the two input-transfer boundary tests and the
  large-output tests all pass against the 1 MiB ceiling).
- Consumers of `MAX_INLINE_BYTES` are exactly the SDK codec plus two boundary tests; no other caller hardcodes
  the frame limit.

## Remaining

1. Rebuild the packaged runtime (public SEA + private distribution) and relaunch on :3457 so the new ceiling
   reaches the live store, then confirm the [run176] sweep stops refusing and a candidate validates.
2. A secondary observation, now moot for single objects but worth recording: the worker's output
   externalization did not kick in for the `replay:job` path (otherwise the frame would not have overflowed).
   The 1 MiB ceiling removes the symptom; a later audit can decide whether that path should externalize on
   principle.
