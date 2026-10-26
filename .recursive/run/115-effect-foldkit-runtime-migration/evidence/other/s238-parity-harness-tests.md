# S238 The parity harness now has tests - and writing them found a real crash path

S235 (additive-shape classification) and S237 (identity flags) both changed `compare-release.mjs` with no
test behind them. `--left`/`--right` accept URLs, so two tiny HTTP servers stand in for the two releases:

| Test | Asserts |
|---|---|
| identical releases | `same /healthz`, no `different`, exit 0 |
| an added key | `additive-shape /healthz`, `{"additive-shape":2,…}`, exit 0 |
| a changed value | `different …/router/summary`, `value-diff … strategy ("balanced" -> "cost")`, **exit 1** |
| a wrong expected version | `FAIL identity: left is …, expected …`, **exit 2** |
| matching expected versions | `identity left=… right=…`, exit 0 |

## What the tests caught

1. **`process.exit(2)` in the identity path crashed with `0xC0000409`.** The script already documents
   this (S171): exiting while fetch sockets are still closing trips a libuv assertion on Windows, and the
   run reports a crash for a comparison that completed. My new failure path used `process.exit`. Fixed by
   skipping the comparison (`endpoints.splice(0)`) and setting `process.exitCode` at the end, where the
   script already computes it.
2. **My own expectation was wrong twice**: adding `release_id` to the `runtime` object appears in BOTH
   `/healthz` and `/runtime/summary` (2 additive-shape, not 1), and a genuine value difference exits **1**
   - which is correct, because a difference must fail a parity run.

## Wired into CI

`test:release-workflows` now includes the file: **73/73**.

## Why this matters more than the count

The harness that certifies release parity was itself unverified. Three of its behaviours changed this
round and each was checked only by reading the code. Now the classifier, the identity assertion and the
exit-code contract are pinned by tests that use the same HTTP surface the real comparison uses.