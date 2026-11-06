# S328 — independent review: S327 B6/R27 Drain shutdown-phase wiring

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the affected 6 files, tsc and the requested lint checks.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `C1BECB52BC3310CDE4A12967FFADFCA6F93502FEFBFF7CDEBCF42E2CA419751C` | 64305 |
| `src/index.ts` | `909BB4D20E1A501C1A0A86BEF5961AC9F7C6B13066F5978C74E46DD14D6AE9D0` | 1367060 |
| `src/cli.ts` | `BE9BD07853F39D502E5727787E31FB3016941942C0B93531152E73DBB2F3C0F4` | 594293 |
| `test/s327-drain-shutdown.test.ts` | `924BBA70B2742D102DEE49FA2AC19FF3B8A8F4B31E56C622F5D43A93F291C8D3` | 3993 |

All match. Backups `E:/rm-tmp/s327` exist. Affected 6 files: **36/36 pass**; tsc exit 0.

## Q1 — Real wiring: PASS

The four queue-runtime stops are now registered shutdown drains, not fire-and-forget: `queue-runtime:replay` awaits `queueRuntime?.stop()` (`cli:8592`), evaluation (`:8620`), learner-derive (`:8675`), and learner-promote (`:8733`). Auto-replay is only the `auto-replay` drain (`:5119`), with no standalone stop. Post-observation outbox is joined and null-guarded (`:8882-8885`); the route-capture drain joins the captured `deferredRouteCaptureDrainJoin` promise (`index:20983-20989,21236-21238`) and is registered at `cli:5120`. `shutdownDrains` is passed into `startBridgeServer` (`cli:5252`). The queue stops, outbox drain and route-capture join all run inside the ordered DAG shutdown. PASS.

## Q2 — Bounds/order: PASS

`boundedDrain` defaults to 5000 ms, rejects with typed `DrainTimeoutError`, and clears its timer on settle (`composition-dag:108-137`). `ServerOwner.shutdown` places drains between the bounded join and interrupt, then transport.close and backend.close (`:1155-1175`); `runReleaseAll` catches each failure and continues. The hung-drain test runs a 15 ms drain, asserts exact order through interrupt/transport close, and verifies the AggregateError contains `DrainTimeoutError` for `hung-drain` (`test:38-53`). The failing-drain test asserts later drains/interrupt/transport still run (`test:55-65`). PASS.

## Q3 — Run: PASS

Affected 6 files **36/36 pass**; tsc exit 0. RED 3/3 is behavioral (the queue-stop drain registration fails before wiring).

## Q4 — Scope honesty: acceptable for this wiring slice

The source-wiring test checks the four queue stop strings, `drainDeferredRouteCapture`, `drains:`, and index's route-capture export (`test:67-78`); route-capture's actual join is the captured `activeDrain` promise. There is **no end-to-end test** that invokes real queue workers/outbox/route-capture and observes drain completion during shutdown, as the author notes. For a wiring slice, the captured-promise + source evidence is adequate; the end-to-end integration remains a named follow-up, not a correctness claim. PASS with that explicit limitation.

## Q5 — Lint: HOLD for test file

- DAG `effect:true`: the claimed 161/unchanged classification cannot be independently re-run because the absolute-path `anti_slop_lint` invocation still returns the documented `value is not lossless JSON` serialization bug; repo-relative returns `filesScanned:0`. Manual inspection of the new drain types/SAFETY casts shows no obvious new finding, but this is not a machine certification.
- **The new test is not lint-clean.** Manual scan of every `as` assertion finds two bare casts with no SAFETY comment: `test/s327-drain-shutdown.test.ts:17` (`emptyCatalog ... as never`) and `:18` (`emptyRegistry ... as never`). They are the same boundary pattern used elsewhere with SAFETY comments, but neither has one here. This contradicts the “test clean” claim. Required: add the SAFETY comments (or typed test helper) and re-run the repo-relative lint once the tool bug is worked around.

## VERDICT: HOLD (1 test-lint repair)

1. **Add SAFETY comments above the two bare casts** at `test/s327-drain-shutdown.test.ts:17,18` and re-run lint. The wiring, bounds, ordering, release-all and captured-promise evidence are otherwise sound; the missing end-to-end drain integration is an honest named follow-up, not a hidden pass.

No product file was modified; no commit made.

## Final comment-only verification — PASS

Verified final test hash: `D7D186C2A1AD24E9E7F4F873487B3A891D6DEA80C1F31FDBBEBA6DDA514C36CC` (4147 B); DAG/index/cli hashes unchanged. A full scan of every `as ...` assertion in `test/s327-drain-shutdown.test.ts` now finds **zero bare casts** (the `:17,18` sites have SAFETY comments). Affected 6 files **36/36 pass**; tsc exit 0. The absolute-path anti-slop tool bug remains a tooling limitation, but the test cast audit is complete and clean.

## FINAL VERDICT: PASS

Wiring, bounded drains/order, release-all, source/captured-promise scope, and the final test cast audit are all closed. The end-to-end drain integration remains the honestly named follow-up. No remaining numbered items. No product file was modified; no commit made.

