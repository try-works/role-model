# Post-closeout addendum 21 — capture_missing retryability reverted (superseded by addendum 19)

## Problem
Addendum 18 made `capture_missing` retryable (only `capture_not_named` permanent), which broke the three
addendum-38 tests that assert a genuinely absent capture on a completed dispatch is still a permanent eviction.
The retryability was the wrong fix: the auto-replay stall was never an eviction — the `replay:job` projection had
dropped the dispatch locators, so the resume only ever saw the derived `…-branch` name with no producer.

## Fix
- Reverted `unresolvedArmsArePermanent` to treat `capture_missing` (and `capture_not_named`) as permanent, the
  pre-addendum-18 semantics.
- The actual repair is addendum 19 (compact `dispatches` with `providerResultRef` in `jobProjection`), which lets
  the resume resolve the real arm capture instead of reaching `capture_missing`.

## Verification
- `tsc --noEmit` exit 0.
- `run101-addendum38-arm-dispatch-failure-is-not-eviction.test.ts` and `run101-resumed-arm-evidence.test.ts`
  now pass (13/13).
