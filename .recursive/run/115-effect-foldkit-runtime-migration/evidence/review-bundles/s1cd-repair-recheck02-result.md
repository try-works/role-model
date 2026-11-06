## Verdict: PASS (S1c/d only)

**F1 (blocking, prior) — repaired and verified.** `src/selfcheck.ts` now has ten controls, each calling the real `compareRequestTraces` and asserting a specific code: `changed-error` → `error_mismatch` (line 35) and `changed-stream-terminal` → `terminal_stream_mismatch` (line 36), added as two separate controls rather than folding into `changed-status`. No source requirement fixes the count at eight; ten is legitimate and the vitest contract mirrors all ten names exactly. This is not a hardcoded pass: `status` is derived from `checks.every(...)` (line 38), every `passed` value comes from a comparator call, and a dropped/weakened error comparison flips the check to false → `FAILED` → CLI exit 1 → test failure. Negative sensitivity holds for the current fixtures.

**Runtime evidence (1 test run).** `node --test scripts/runtime-parity.test.mjs` → 3/3 pass. The request-selfcheck test asserts exit 0, `status: "PASSED"`, `scope: "request-comparator-only"`, `checks.length === 10`, and `every(passed)`. Because a wrong or missing comparator code fails that assertion, this confirms `error_mismatch` and `terminal_stream_mismatch` are genuinely emitted by `compare.ts` — the exact gap F1 identified. The invalid-mode test confirms `[]`, `--wat`, and combined modes return `FAILED`/`invalid-mode` exit 1, so there is no silent fixture default.

**F2 (low) — accepted per stated resolution.** Bare/unknown invocation stays intentionally invalid; `--request-selfcheck` is the documented path and the usage addendum is pending, not blocking. Not a code defect.

**F3 (low) — accepted as stated.** Test manifest (`--filter …` lane) and existing-workflow membership were reported observed; I did not re-read `ci-workflow.test.mjs` within the 5-read budget, so this remains accepted-not-re-verified.

**Not re-run / accepted:** root command 95 tests, vitest 2/2, `tsc` 0, frozen install 10.6.5, HEAD baseline `f0d50fab`. No network or full-browser claim is made: the module imports only `./compare.js`, returns only `name`/`passed`, and the tests assert absence of `fixture-body`/`Authorization`.

**Residual risks (non-blocking):** F2 documentation addendum still to land; F3 and the 95/2/tsc counts rest on prior evidence rather than this recheck. No addenda or scope change observed.

**HOLD lifted for S1c/d only.**
