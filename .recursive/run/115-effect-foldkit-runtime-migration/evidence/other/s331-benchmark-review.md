# S331 — independent review: S330 B6/R27 Benchmark DAG owner

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the affected 6 files, tsc and the requested lint checks.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `E473F0A348AE863A295ABC3923A616D7F29BF12497EC9698FA0CA7A595D14ADB` | 64639 |
| `src/benchmark-gate.ts` | `F4224313EFB4AE3053D699DAE75C47AE3A5EC58E8DC4CE91F78D56FB3B6E0F1E` | 4774 |
| `src/benchmark-runner.ts` | `33EC87D6ADC00ED7569C88A7AD78BDC606C6CF2B3586309EF7458EC691CB6961` | 59020 |
| `src/index.ts` | `2AD79F0B2E0E878E157D8D9D254F0E6D446B48A573F8E6DD09A24DE4B38329A3` | 1367541 |
| `src/cli.ts` | `191561B0F377E40A4313C908884607883FF1225C8F5E5A3A39B753D54FCD45ED` | 594404 |
| `test/s330-benchmark-owner.test.ts` | `F209720587BD3EB051942C51223FBA5375AA6585E9A33E27B68FDCF7CA1BEBCE` | 2573 |

All match. Backups `E:/rm-tmp/s330` exist. Affected 6 files: **34/34 pass**; tsc exit 0.

## Q1 — Gate correctness: PASS

`makeBenchmarkGateOwner.begin` returns a `finish` closure; `finish(runId)` clears only the matching active run and ends the inner Ref (`benchmark-gate:35-50`). `cancel` aborts the current `AbortController`, clears the active id and ends the inner gate; a later `finish` is a no-op (`:52-60`). The route wraps `runBenchmark` in `try/finally` and always calls `benchmarkRun.finish()` (`index:19704-19712`), so success/failure/interrupt release the slot. The gate tests prove overlap refusal, release, shutdown cancel, `signal.aborted`, `running:false`, and next-run acceptance (`test:12-41`). PASS.

## Q2 — Runner cancellation: code PASS, test insufficient

The runner checks `deps.signal?.aborted` at start and at target/case/grading/final loops via `throwIfCancelled` (`benchmark-runner:1652-1653,1762-1769,1930-1931,2110-2111`) and throws `BenchmarkCancelledError`. The signal is read from deps, not stored as a mutable local. The boundaries are real for multi-case runs.

**But the only runner test is a source-string check** (`test:43-48`) for `BenchmarkCancelledError`/`signal?.aborted`; it never starts a run, aborts it, and observes the typed cancellation. A long runner is not exercised at a boundary. This does not prove “actually interrupts a long run,” as claimed.

## Q3 — Route semantics: code PASS, test insufficient

The route uses the DAG singleton `benchmarkGate` (`index:19699`), returns **409** with `{activeRunId, error:"benchmark_already_running"}` on busy, **202** on accepted, passes `signal` and `runId` to `runBenchmark`, and finishes in `finally` (`index:19693-19713`). The gate is imported from `composition-dag` (`index:284`), not copied.

**The test does not exercise the route**: it only reads index/cli source strings for `benchmarkGate.begin`, `benchmark_already_running`, `writeJson(...,202...)***` and `benchmarkGate.cancel` (`test:50-59`). No 409/202 response, body shape, signal/runId forwarding or failure-release is asserted behaviorally.

## Q4 — Shutdown wiring: code PASS, test source-only

The shutdown drains register `{name:"benchmark", run: () => { benchmarkGate.cancel("shutdown"); }}` in the same array passed to `startBridgeServer` (`cli:5118-5121,5253`); the DAG runs drains between join and interrupt inside `runReleaseAll` (`composition-dag:1171-1175`). The gate-cancel test proves the cancel behavior; the registration itself is source-string only.

## Q5 — Run/lint

Affected 6 files **34/34 pass**; tsc exit 0. The test has no `as` casts, so no test cast finding is visible; the absolute-path `anti_slop_lint` tool still returns its lossless-JSON serialization bug and repo-relative scans 0 files, so the DAG 161/test-clean claims cannot be machine-certified here. Manual inspection of the added gate code shows typed errors/brand; no obvious new DAG cast finding.

## Q6 — R27 clause: PARTIAL / HOLD

The gate-level overlap and cancellation behavior is tested, but “benchmark cancellation and overlap isolation **tested** before concurrency increases” is not fully met: cancellation is source-only at the runner, and the route's 409/202/finally semantics are source-string only. The R27 clause is only partially proven behaviorally.

## VERDICT: HOLD (2 required behavioral tests)

1. **Route test:** drive the real POST handler (or an extracted route function) for busy -> 409 body/status, accepted -> 202, `runBenchmark` receives the same signal/runId, and a thrown run releases the gate so the next POST is accepted. The current source-string assertions do not prove route semantics.
2. **Runner cancellation test:** start a run with a long/hung case (or an already-aborted signal at a named boundary), abort, and assert `BenchmarkCancelledError`/typed cancellation and that the run stops; replace the source-string-only check. This is required for the R27 “tested” clause.

No product file was modified; no commit made.

## Final behavioral re-review — HOLD (1 test-lint item)

New test file hash verified: 4C59F851354C6AA0CBB890432CF1405D4F12455F34CDA1FDF8787241F5D3C0B4 (4682 B). All product hashes remain unchanged from the S330 review (DAG E473F0A3..., gate F4224313..., runner 33EC87D6..., index 2AD79F0B..., cli 191561B0...). Affected 6 files: 31/31 pass; tsc exit 0.

- Route test is real: it calls startBridgeServer with the explicit test seam and drives fetch against the actual HTTP handler (test:35-83). It proves first run 202 with captured signal/runId, concurrent 409 body {activeRunId, error:"benchmark_already_running"}, failure 400, and next run 202 after the finally release. PASS.
- Runner test is behavioral at the start boundary: a pre-aborted signal throws BenchmarkCancelledError and upstreamCalls stays 0 (test:86-106). It does not exercise a mid-run/loop-boundary abort, but the claim was narrowed to the pre-aborted case; the code boundaries remain statically present. PASS for the stated claim.
- Remaining HOLD: the new test is not lint-clean. It has three bare type assertions with no SAFETY comment: :55 (await second.json()) as {...}, :60 (await firstResponse.json()) as {...}, and :102 } as never. Only :35 has a SAFETY comment. The absolute-path anti-slop bug remains, but manual scan matches the rule. Add SAFETY comments/typed JSON helpers at those three sites and re-run.

**FINAL VERDICT: HOLD (1 test-lint repair).** Route/runner behavior is now genuinely exercised and 31/31 passes; the new test's cast lint claim is false. No product file was modified; no commit made.

## Final comment-only verification — PASS

Verified final test hash: 2DFDA3E9D9681008AF262B9272DC2AEA8966B32F91DD33610332AEA27966C13A (4961 B); product hashes unchanged. A full scan of every 'as' assertion in test/s331-benchmark-behavior.test.ts finds zero bare casts: :35, :56, :62 and :105 each have a direct SAFETY comment. Affected 6 files: 31/31 pass; tsc exit 0. Route behavior (202/409/400/finally release) and the pre-aborted runner cancellation remain green; the runner test still exercises the start boundary only, as noted.

**FINAL VERDICT: PASS.** All S331 items are closed on the final bytes: real HTTP route behavior, typed runner cancellation/no upstream call, gate lifecycle, shutdown registration, and a clean cast audit. No remaining numbered items. No product file was modified; no commit made.

