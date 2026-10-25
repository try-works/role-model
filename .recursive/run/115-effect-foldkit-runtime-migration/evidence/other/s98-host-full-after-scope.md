# S98 Full host suite after the scope wiring: 2 failed, both classified

Run: full `runtime-host-bridge` suite, 1,766 s, against the tree that includes the acquisition-scope wiring and the unified release order.

| | |
|---|---|
| Test files | **420 passed / 2 failed / 3 skipped** (425) |
| Tests | **2,619 passed / 2 failed / 5 skipped** (2,626) |

## The two failures

1. `test/run105-review-advisory-safety.test.ts` -> "refused larger admission leaves bounded prior real snapshot routable" (`expected 'written' to be 'refused'`). **Pre-existing and already classified** in s53a: it reproduces identically at baseline `24678a66` before any of this run's changes.
2. `test/index.test.ts` -> "prefers repoRoot frontend assets over packaged assets when repoRoot is explicit" (a path string comparison). **Order/parallelism-dependent, not a regression**:
   - the same file run alone after the wiring gave **218 / 218**;
   - the single test run alone now passes (**1 passed, 217 skipped**);
   - it fails only inside the full parallel suite, where inter-file state interferes.

## What this establishes

The acquisition-scope wiring did **not** break the host: every test file that exercises it passes in isolation and in the parallel run, and the only two failures are a previously classified pre-existing defect and a flake with a demonstrated passing isolation run.

The sustained claim is therefore: **host suite 2,619 / 2,626 with two classified failures**, not "green" - and the flake is a test-isolation defect worth fixing rather than evidence against the wiring.
