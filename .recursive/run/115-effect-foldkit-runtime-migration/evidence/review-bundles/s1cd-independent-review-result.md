## Verdict: HOLD (S1c/d only)

Baseline confirmed: `HEAD = f0d50fab083e3fe8daf2474cd9fb08b51066c8e1` (matches stated public baseline). Tracked diff is exactly `package.json`, `pnpm-lock.yaml`, `scripts/ci-workflow.test.mjs`; the untracked additions are `scripts/runtime-parity.mjs`, `scripts/runtime-parity.test.mjs`, and `role-model-router/packages/ui-parity/**`. No addenda. Tests/builds were not run (C: low); counts 95/14/tsc 0 are accepted, not re-verified.

### Findings

**F1 — Medium (blocking): error/terminal-stream distinction is not exercised.** `selfcheck.ts:26-35` defines the eight controls, but every fixture keeps `error: null` and `terminalStream: "completed"`. `compare.ts:254-255` emits `error_mismatch`, and `compare.ts:68` declares it, yet no control can trigger it. A regression that drops or weakens error comparison still yields `status: "PASSED"`. `selfcheck.test.ts:9-19` mirrors the same eight names, so the test cannot expose the gap. This is squarely inside the requested “error distinction” scope.

**F2 — Low: bare `runtime:parity` always fails.** `scripts/runtime-parity.mjs:12-14` treats zero args as `FAILED`/`invalid-mode` exit 1, and a genuine selfcheck failure also exits 1 (`:8`). So `pnpm runtime:parity` can never succeed, and a real comparator regression is distinguishable from a typo only by stdout JSON. There is no `--help`. The intended form appears to be `pnpm runtime:parity -- --request-selfcheck`; that should be documented, or the default should be the request selfcheck.

**F3 — Low (unverified risk): wiring test is textual only.** The new `ci-workflow.test.mjs` case asserts exact script strings, the lockfile importer entry, and inclusion in `test:release-workflows` — good permanence. It does not assert that `@role-model-router/ui-parity` defines a `test` script, nor that a workflow YAML invokes `runtime:test-critical`. Since `ui-parity/package.json` was outside the read budget, I cannot confirm the `--filter … test` lane resolves; a broken filter would still satisfy this test.

### What is sound

- **Eight checks, not a hardcoded report:** `PASSED` is derived from `checks.every(...)` (`selfcheck.ts:36`), each check executes `compareRequestTraces` and asserts a specific code (body, extra/missing, method, causal order, status), and the CLI test asserts `checks.length === 8` plus `every(passed)` (`runtime-parity.test.mjs:16-17`). The exact-array assertion in vitest is a contract, not a fake pass.
- **Determinism/repeat-read:** identical-repeat compares the baseline to itself; independent-read-permutation uses `[first, second, first]` vs `[second, first, first]`; the function has no clock/random/state, and the test asserts two invocations are equal.
- **CLI modes:** `--request-selfcheck` → 0 only on `PASSED`; `--selfcheck` → `NOT_RUN`/`browser-parity` exit 2; `[]`, `--wat`, and combined modes → `FAILED` exit 1. Node tests spawn the real CLI for all four paths and deep-equal the JSON for the two fixed outcomes.
- **No network/operator calls:** the module imports only `./compare.js`; no fetch/http/provider import. No raw payload exposure: the selfcheck returns only `name`/`passed`, and the test asserts absence of `fixture-body` and `Authorization`.
- **Correct lane:** `runtime:test-parity` is prepended to `runtime:test-critical` (maintained lane), and `runtime-parity.test.mjs` is in the permanent `test:release-workflows` selector — not a temporary lane. No hidden browser or live-client claim is made; the scope string is `request-comparator-only`.

### Minimal repair (keeps exactly 8)

Fold an error assertion into an existing control rather than adding a ninth: set `error: "upstream"` (and optionally `terminalStream: "error"`) on the `changed-status` 500 fixture and require both `status_mismatch` and `error_mismatch`. Alternatively fold it into `write-read-causality`. Update the vitest contract only if a name changes. Document the `--request-selfcheck` invocation for `runtime:parity`.

### Hashes (SHA-256)

```
86749BA9…C3633  package.json
693E2DD5…09333  pnpm-lock.yaml
A4FAAC99…FF7E   scripts/ci-workflow.test.mjs
038A1904…4F5F   scripts/runtime-parity.mjs
42D5FE33…D622   scripts/runtime-parity.test.mjs
B07DE0E1…3E257  …/ui-parity/src/selfcheck.ts
1D663CDE…0606   …/ui-parity/test/selfcheck.test.ts
```

HOLD applies to S1c/d only: the command plumbing, determinism, exit-code mapping, and lane placement pass; the error-distinction control does not.
