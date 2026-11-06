# S367 — independent review: S365a B1 calibrated module-health edge

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 4 affected files, tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `B527BD0ACB9BDECA94EA30DCECF5DB2383A0E16DAC6A28819D2F0A0F208EAD7E` | 1370797 |
| `test/s366-module-health-edge.test.ts` | `FCB1F71A013B9F4D7F995A37F12562BB8EC0C21D8876DA9C7E2468DA4D50F7B6` | 3599 |
| `test/run115-s10b-module-health-wiring.test.ts` | `F2B9BF377B885CFC65588262BE6C5093CE3C67E355933EE0FDD85E2C96A05988` | 4462 |
| `src/composition-dag.ts` | `D4DAD9C0…` | 75021 (untouched) |

All match. Affected 4 files: **24/24 pass**; tsc exit 0.

## Q1 — Cause classification: PASS

`moduleHealthCauseForEscape` returns the original `Cause` when `Cause.isCause(error)` and otherwise `Cause.fail(error)` (`index:20564-20565`); the edge calls `writer.recordCause(...)`, not `recordError` (`index:20586-20588`). The behavioral test records `Cause.fail`, `Cause.die`, `Cause.interrupt` and sees `cause.fail`, `cause.die`, `cause.interrupt` (not a coarse code) (`s366:29-36`). A plain `Error` maps to `cause.fail` (`s366:44-45`). PASS.

## Q2 — 4xx exclusion: PASS

`isClientCausedModuleHealthEscape` checks only an optional numeric `statusCode` in 400-499 (`index:20557-20561`); the edge returns before recording for 404/422 but a genuine `Error` is still counted (`s366:38-46`). The check is typed as unknown with a SAFETY cast; non-object errors return false. PASS. (The test uses plain errors, not a 4xx `Cause`; the current edge receives unwrapped handler rejections, so this matches the wiring.)

## Q3 — Calibration gate: PASS

`createModuleHealthComposition` returns undefined unless `diagnostics.enabled === true` **and** `diagnostics.calibration?.approved === true` (`index:20573-20578`). The test covers absent, enabled-only, calibration-only, disabled+approved, and both-true (`s366:20-27`); the S10b test preserves the disabled default and explicit enabled calibration decision. The production default remains off. PASS.

## Q4 — Exactly-once at the listener edge: PASS

`createBridgeRequestListener` constructs the wiring/writer once, attaches one `.catch` per rejected handler promise, and calls `wiring.reportRequestFailure(error)` once before the unhandled sink (`index:20654-20668`). The test invokes the listener twice with a rejecting handler and sees one record per request (s366:48-67). PASS.

## Q5 — Run: PASS

Affected 4 files **24/24 pass**; tsc exit 0. The real diagnostics readback test also shows the cause codes through the operator route.

## Q6 — Lint: HOLD

The lint claims do not reproduce:
- `test/s366-module-health-edge.test.ts`: 3 findings — `no-unsafe-dictionary-type` at `:12` (`Record<string, unknown>` base options), and two `require-safety-comment-for-type-assertion` at `:64` (the second listener call's `{} as never` arguments; only the first call at :61 has the SAFETY comment).
- `test/run115-s10b-module-health-wiring.test.ts`: 4 findings — `no-unsafe-dictionary-type` at `:49`, `no-runtime-typeof` at `:53,55`, `require-safety-comment-for-type-assertion` at `:54`.
- `test/run115-s10c-wiring-proofs.test.ts` is clean.

Required: add SAFETY comments/typed helpers and resolve or explicitly justify the dictionary/typeof findings; the s366 and s10b “clean” claims are false. `composition-dag.ts` is untouched.

## VERDICT: HOLD (1 lint repair)

1. **Make s366 and s10b lint-clean or explicitly justified:** fix the 3 findings in s366 (line 12 dictionary, line 64 duplicate cast comments) and the 4 in s10b (line 49 dictionary, lines 53/55 typeof, line 54 cast), or record a reviewed test-boundary justification in the task doc. The behavior and 24/24 run are otherwise sound.

No product file was modified; no commit made.

## Final lint repair verification — PASS

Final hashes verified: s366 test AB8E1553EEE6914CFECB7417B82D529A934264B22E4C5155D8D6C1F897C3A478 (3810 B); s10b test 59FB73D6210F806962EDCD87FEDBEC0CDFD133999CABA225536CF0A0D53C1C12 (4518 B); index unchanged B527BD0A... (1370797 B).

- anti_slop_lint on both files returns **0 findings** (no suppressions/residuals; DiagnosticsProbe replaces the unsafe dictionary, and both listener casts have SAFETY comments).
- The 4 affected files pass **24/24**; tsc exit 0.
- No behavior changed: Cause classification, 4xx exclusion, calibration gate and exactly-once reporting tests remain green; the only edits are test typing/comments.

## FINAL VERDICT: PASS

Both S367 lint findings are closed on the final bytes: s366 and s10b are clean, the 24/24 suite and tsc reproduce, and behavior is unchanged. No remaining numbered items. No product file was modified; no commit made.

