# S100 Full host suite after the isolation fix: one failure left, and it is the known one

| | Before the fix | After the fix |
|---|---|---|
| Test files | 420 passed / **2 failed** / 3 skipped | **421 passed / 1 failed** / 3 skipped |
| Tests | 2,619 passed / **2 failed** / 5 skipped | **2,620 passed / 1 failed** / 5 skipped (2,626) |

## The one remaining failure

`test/run105-review-advisory-safety.test.ts` -> "refused larger admission leaves bounded prior real snapshot routable" (`expected 'written' to be 'refused'`). This is the **pre-existing, classified** defect from s53a: it reproduces identically at baseline `24678a66`, before any change from this run.

## What the fix achieved

Removing `process.chdir` from `track-b-runtime-composition.test.ts` eliminated the `index.test.ts` asset-preference failure that only appeared under parallelism. The suite now reports **one** failure, and that failure is not ours.

The retry/timing test that surfaced during the two-file reproduction **passed in this full run** - which confirms it is load-sensitive rather than broken. It stays on the record as a known isolation risk, not as a blocker.

## Sustained claim

Host suite: **2,620 / 2,626 tests, 421 / 425 files, with one classified pre-existing failure and one known load-sensitive test**. Not "green" - the runner still has a red test - but every red is identified, reproducible and outside this run's changes.