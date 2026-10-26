# S144 Private suite verified, one load-flake found and fixed

## First run: 84/85

Running all 17 `run115-*` private test files in parallel produced one failure:

```
✖ R32: a sandbox child that never becomes ready is killed by the timeout and its container is released
  AssertionError: the child must have been spawned
    at tests/track-b/run115-r32-closed-domains.test.mjs:100
```

## Diagnosis: load-flaky, not a defect

- the file alone: **3/3 pass**;
- the full suite again: **85/85 pass**.

The harness spawns a real child under a **400 ms** deadline. Under parallel file execution the child could not spawn and append its ledger line before the timer fired, so `ledger.includes("run")` was false. The behaviour under test - a child that never becomes ready is killed and its container released - does not depend on the deadline being that short.

## Fix (test-only, semantics unchanged)

`timeoutMs: 400` -> `2_000` in the harness input, with a comment recording why. Re-verified: file run three times, **3/3 each time**; full suite **85/85**.

This is the same failure class as the public `run105-review-advisory-safety` test that has been the suite's one known pre-existing red all session: a short deadline asserted under parallel load.

## Why this mattered

A flake in the private suite would surface as a red CI run attributed to whatever PR happened to trigger it - and the natural response is to re-run until green, which is how a real regression eventually gets ignored. Fixing the deadline removes the ambiguity without weakening the assertion.

## Where the private side stands

`run115-*`: **85/85**. R32 slices verified by me this session: retention manager boundary (4/4), child release (4/4), closed domains (3/3). R32 itself remains blocked - those are three of its acceptance criteria, not all of them.