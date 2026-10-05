# Post-closeout addendum 18 — capture_missing is retryable, not permanent

## Problem
The first auto-replay attempt's branch ids (…-8d131f858464a713-branch etc.) had zero rows in both the
deferred capture receipt store and the observations store — the captures were never written for that attempt
(the provider dispatch failed before recordLocalRouteCapture). The re-dispatch then wrote the captures under a
fresh nonce. `unresolvedArmsArePermanent` classed `capture_missing` as permanent, so the handoff was
terminalized as `evidence_outside_retention_window` before the re-dispatch landed, and the comparison never
finalized.

## Fix
- `unresolvedArmsArePermanent` now treats only `capture_not_named` as permanent; `capture_missing` is
  retryable (the worker throws, the evaluation queue retries within its attempt budget, and the next resume
  reads the re-dispatch's capture under the new nonce).

## Verification
- `tsc --noEmit` exit 0.
