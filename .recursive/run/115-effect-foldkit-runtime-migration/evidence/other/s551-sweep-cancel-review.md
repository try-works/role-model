# S551 — independent review: S550 sweep cancellation (B5/R26)

Reviewer: `s9b-eventlog`, actual model **deepseek-flash** (verified with `list_agents`). Read-only; no source/test edits; no commit. The only write is this evidence file.

Snapshot: public `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`; S550 is in the working tree.

## Frozen bytes verified

| Artifact | sha256 | Result |
|---|---|---|
| `src/track-b-auto-replay-runtime.ts` | `0678F28B74721D7BD4CAC267DC74A95FC94F2F837EEDE4979DB3FF4ADAB203D0` | match (153957 B) |
| `src/cli.ts` | `71CE11F044C8E7DD27202CE532B39EDF7A02DDB195CC4E62674F2B6B54363F68` | match (599780 B) |
| `test/run115-s550-sweep-cancellation.test.ts` | `4D6C31DD5074C353F06416CFA8A36CE9848AD52B9A2526B3762760983F209901` | match (3401 B) |
| `s550-red.log` | `CDED428351D986D25FD3DF9AC9350255143650AF517106BC87A55E1672C7B42D` | match (2688 B) |
| `s550-green.log` | `5FBE527FF29B412BD75980471659ABA7AD0D55DA7EA564693440A6096F222D00` | match (580 B) |
| `s550-suite.log` | `4A515F5CA40211980344D9039239C78B384B879FFD441B8421E1EE18D120C65F` | match (5944 B) |

## Verdict: **HOLD**

The main cancellation mechanism is real and the RED is genuine, but two acceptance claims fail on the frozen bytes: (1) a stop that lands while a sweep is in flight does **not** make `tick()` return `skipped`; it records a degraded sweep error. The frozen test never asserts `skipped`. (2) The new S550 test has **7 anti-slop findings**, so the “lint zero added-line” claim is false for the added test. The “five bodies reject early” wording also overstates what is tested: the bodies check the signal only at function entry, and only one wedged body is exercised.

## Verified parts

- `startAutoReplayLoop` owns one `AbortController` (`track-b-auto-replay-runtime.ts:812`); `stop()` aborts it at `:3013`.
- Five liveness calls receive `signal: sweepSignal()` and are wrapped in `withSweepAbort`: `resumePendingEvaluations` (`:1149`), `sweepFinalizationSignals` (`:1234`), `learnFromUnconsumedCandidates` (`:1297`), `deriveLearnerCandidates` (`:1324`), `recoverHandedOffEvaluations` (`:1398`).
- The five CLI bodies check `input.signal instanceof AbortSignal && input.signal.aborted` at entry: `cli.ts:5965`, `:6025`, `:6990`, `:7223`, `:7397`. They do not check the signal again inside the sweep loops.
- `withSweepAbort` races each call against the signal, so a wedged body cannot hold the tick open. The second test demonstrates this for `recoverHandedOffEvaluations`: the tick settles after stop.
- **RED genuine:** `s550-red.log` is full vitest output against pre-S550 HEAD; both tests fail (`signals.length` 0; `seen` undefined), `VITEST_EXIT=1`, and `FINAL_TEST_SHA256` matches the frozen test.
- **28/28:** I independently ran the eight files in `s550-suite.log` (seven run115 sweep files plus `s17b-sse-cleanup`); 8 files, 28 tests passed. Host `tsc --noEmit` 0; UI `tsc --noEmit` 0; `s247` 3/3.
- **Source lint:** current `track-b-auto-replay-runtime.ts` 177 findings vs HEAD 182; `cli.ts` 1035 vs HEAD 1037 — no added source finding. This does not cover the new test, which has 7.

## Findings

1. **HOLD — mid-tick abort does not return `skipped`.** The only `skipped` return on the abort path is the pre-tick guard at `track-b-auto-replay-runtime.ts:1460`. If `stop()` happens after `tick()` has started, `withSweepAbort` rejects, `runLivenessSweeps` catches it and sets `error = "… sweep aborted"`, and `tick()` returns a normal/degraded result with no `skipped`. I reproduced this with a read-only probe (same wedged `recoverHandedOffEvaluations` setup): stop during the tick produced a settled result with no `skipped` field and the stderr line `sweep degraded: handed-off replay recovery failed: sweep aborted`. The frozen test only asserts that the tick settles, not that it returns `skipped`. Add an assertion for the mid-tick stop and make the abort path return the skipped result (or explicitly amend the acceptance wording to “pre-tick only”).
2. **HOLD — lint zero added-line is not true for the new test.** `anti_slop_lint` on `test/run115-s550-sweep-cancellation.test.ts` reports 7 `no-unsafe-dictionary-type` findings at lines 20, 28, 29, 30, 31, 32, and 57 (`Record<string, unknown>` in the signal/record helpers and wedged operation). The S550 green claim “lint zero added-line (loop, cli, test)” is contradicted by these added lines.
3. **Five “reject early” is not what the test proves.** Test 1 records the five signals and then calls `loop.stop()`; the bodies have already returned `{}`. The CLI checks only at function entry, so a stop that lands inside a long sweep is not observed by the body; `withSweepAbort` is what stops the loop waiting. Test 2 covers only `recoverHandedOffEvaluations`, not all five. This is a test-strength/evidence gap; the code's cooperative entry check is real, but “five sweep bodies reject early” is overstated.
4. **Honest limitation is real but only implicit.** `withSweepAbort` stops waiting; it does not hard-kill the underlying capability call. The code comments call it a “backstop” for a call that does not settle, and the existing stale-tick comment says Effect cannot cancel underlying work. The S550 green evidence does not state the hard-kill limitation explicitly. Add one line to the evidence or code comment: the call may continue after the tick settles.
5. **No-cancellation behavior** is covered by the 28/28 sweep/s17b run and no regression was observed; the five new entry checks do not fire when no signal is present.

## Acceptance status

| Claim | Result |
|---|---|
| loop owns AbortController; stop() aborts | PASS (code) |
| five sweep calls receive the signal | PASS (code + test signal collection) |
| all five bodies reject early when aborted | PARTIAL — entry check only; one wedged body tested |
| tick returns skipped when aborted | **FAIL for mid-tick abort**; PASS only for a tick invoked after stop |
| no-cancellation behavior unchanged | PASS (28/28 suite + s17b) |
| honest hard-kill limitation | implicit only; not stated in S550 evidence |
| RED genuine 2/2 | PASS (full output, final hash) |
| 28/28 + s17b | PASS (independently rerun) |
| host+UI tsc 0 | PASS |
| s247 3/3 | PASS |
| lint zero added-line | **FAIL on new test (7 findings)** |

## What would clear the HOLD

1. Make the mid-tick abort path return `{ ...emptyResult(), skipped: true }` (or adjust the task acceptance explicitly) and add a test asserting `skipped` after a stop during a wedged sweep.
2. Remove the `Record<string, unknown>` dictionary types in the new test (use the operation input shape or `unknown`/specific fields) so `anti_slop_lint` is clean, or document an approved test-only exception.
3. Add one explicit sentence in the S550 evidence/code documenting that the capability call may continue after the tick settles.
4. If “five bodies reject early” is required, wedge each of the five bodies (or add a shared per-sweep abort assertion) rather than only the recovery body.

No source or test edits; no commit. This is a bounded review of S550 only, not a whole-R26/whole-release claim.

---

## FINAL RE-REVIEW — refrozen S550 bytes

Re-reviewed 2026-10-30 after the S551 HOLD fixes. Model still **deepseek-flash** (`list_agents`). Read-only; no source/test edits; no commit.

### Frozen hashes

| Artifact | sha256 | Result |
|---|---|---|
| `src/track-b-auto-replay-runtime.ts` | `D1B00A5BA8D002198DD6E2107FCDAF85D2786E82358C2951926204CD549F1C62` | match (154119 B) |
| `src/cli.ts` | `71CE11F044C8E7DD27202CE532B39EDF7A02DDB195CC4E62674F2B6B54363F68` | unchanged; match |
| `test/run115-s550-sweep-cancellation.test.ts` | `BA61B004B6B12A43140EA0C83DC52190CFDB2276AD17C57B6F997DDCA7C96FE3` | match (3560 B) |
| `s550-red.log` | `DB4256D7592E24327D15B7AA10FC731B2CC49D64160E8CCEA239281BC60C8C90` | match (2710 B) |
| `s550-green.log` | `FAD9D5996317886AD634870446EDBF5A9B5C84B4CC325C11A186C4D5265988FA` | match (585 B) |
| `s550-suite.log` | `E953CBD3F9A895AC1963E3CAB280B96B59DC08AAFE030AA0735CAC8467C6D743` | match (5946 B) |

### HOLD item resolution

| Prior s551 HOLD | Resolution | Evidence |
|---|---|---|
| Mid-tick abort did not return `skipped`; only pre-tick guard did | **Resolved in code**: `tick()` now returns `{ ...emptyResult(), skipped: true }` at the post-sweep abort check (`track-b-auto-replay-runtime.ts:2913`) and in the catch path (`:2916`); the pre-tick guard remains at `:1460` | current runtime; test |
| New test did not assert `skipped` | **Resolved**: wedged-sweep test now asserts `outcome.result.skipped === true` after `loop.stop()` | `test/run115-s550-sweep-cancellation.test.ts:78-85` |
| New test had 7 anti-slop findings | **Resolved**: `anti_slop_lint` on the test is clean (0); the `Record<string, unknown>` dictionaries were replaced by `SweepInput` with `signal?: AbortSignal` | test lines 11-13, 24, 32-36, 61 |
| Source lint added-line | **Resolved**: runtime 177 vs HEAD 182; cli 1035 vs HEAD 1037; no added source findings | anti-slop current vs HEAD |
| RED provenance / full output | **Resolved**: `s550-red.log` is full vitest output against pre-S550 HEAD; 2/2 failed; `FINAL_TEST_SHA256=BA61B004...` matches the frozen test | red log |

### Independent gates

- Eight files / **28 tests passed** (seven sweep files plus `s17b-sse-cleanup`; s550 is 2/2).
- Host `tsc --noEmit` **0**; UI `tsc --noEmit` **0**; s247 **3/3**, exit 0.
- Anti-slop test **0**; runtime and cli at or below HEAD baseline.
- Test 1 records five signals and verifies all are aborted after `stop()`; test 2 wedges `recoverHandedOffEvaluations`, stops mid-tick, and asserts both settlement and `skipped`.

### Residual caveats (non-blocking)

- The skipped assertion exercises the **catch/abort path** (wedged body). The normal `runLivenessSweeps`-completed path also returns skipped at `:2913`, verified by code inspection but not separately wedged by the test.
- A stopped-abort still emits `[track-b-auto-replay] sweep degraded: ... sweep aborted` before returning `skipped` (`:2910` precedes the abort checks; visible in `s550-suite.log`). The result is correct, but shutdown still logs a false degradation line; suppress it when `sweepAbort.signal.aborted`.
- CLI sweep bodies check `signal.aborted` at entry only; a stop inside a long body is not observed by the body. `withSweepAbort` stops the tick waiting, which is the real guarantee; the underlying capability call can continue (the documented hard-kill limitation).

### FINAL VERDICT: **bounded PASS**

For the S550 sweep-cancellation slice, both prior HOLD items are resolved: mid-tick abort returns `skipped: true` and the wedged test asserts it; the new test is lint-clean and source has no added findings. The full frozen gates pass (RED 2/2, 28/28 suites, host+UI tsc 0, s247 3/3). This is a bounded PASS for B5/R26 cancellation only, not whole-release or hard-kill cancellation. The residual log-noise and normal-path test gaps should be carried forward.
