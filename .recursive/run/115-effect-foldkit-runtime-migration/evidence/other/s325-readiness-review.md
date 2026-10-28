# S325 — independent review: S324 R27 early-readiness owner

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the affected 6 files, tsc and attempted the requested lint checks.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `58F37F2F4826BDB4141A5ADF1F2C72FDF66CF7B7C2A52BC4DA28048C56D795D9` | 62735 |
| `src/index.ts` | `51A1F69B34767C56A8215584E79BE73D74F6C86D3B72E354B180EC2C58061B1E` | 1366472 |
| `src/cli.ts` | `558AB4C6546115E49C189E120491D61FBB0A64DE9E1B3154D61FADC26CD00A61` | 593210 |
| `test/s324-readiness.test.ts` | `45AA285BC18F886FC619E9F49F7A3A29568E7B70E88EE21AFCFDE263EDECAC1F` | 5878 |

All match. Backups `E:/rm-tmp/s324` exist. Affected 6 files: **33/33 pass**; tsc exit 0.

## Q1 — Transition/gate semantics: PASS

`makeReadinessOwner` starts pending; `markFailed` and `markReady` each only transition from pending (`composition-dag:408-423`), so the first terminal state wins; failed carries `message`, and a subsequent `markReady` is ignored. The tests cover pending→ready, pending→failed with message, and failed→markReady stays failed (`test:65-80`). The Server gate reads `readiness.state()` on admission and refuses non-ready (`:1075-1098`). PASS.

## Q2 — Admission/503 parity: HOLD

The host readback gate is **byte-unchanged**: current `index:17525-17540` is identical to the pre-edit backup, including the static-UI condition and `writeJson(response, 503, ...)` call.

However, the DAG gate's 503 **is not byte-for-byte the existing response**:
1. The existing path uses `writeJson`, which ends with `response.end(JSON.stringify(body) + "\n")` (`index:11545-11557`); the DAG gate writes `res.end?.(JSON.stringify(body))` with **no trailing newline** (`composition-dag:1092-1095`).
2. For `failed`, the existing body is constructed as `{ error, status, ...(message ? { message } : {}) }` (order error,status,message); the DAG body is `{ error, message, status }` (order error,message,status) (`composition-dag:1089-1091`). JSON bytes differ.
3. An empty `message` is always present in the DAG failed body, while the host gate omits a falsy message. The shape is semantically close but not byte parity.
The tests only `JSON.parse` the body and compare objects (`test:98,120`); they do not assert exact bytes/newline/order. Required: reuse the host gate's body construction/write semantics (or a shared helper) and add an exact-byte assertion; this is a real behavior change for clients comparing response bodies.

## Q3 — Identity/no-fallback: PASS

`makeReadinessOwner` adds each owner to a module-private WeakSet; `assertComposedReadiness` rejects unbranded objects (`composition-dag:404-433`). The test passes a plain object and expects `/composed readiness owner/` (`test:127-135`). Production threading is real: `main` creates one `composeReadinessOwner()` (`cli:5116`), calls `markFailed` on extension failure (`:5137`), `markReady` after bootstrap (`:12196`), and passes the same owner through `startBridgeServer` lifecycle `{readiness}` (`:5248`, `index:20861`) to `composeServerOwner`. No parallel readiness object was found. PASS.

## Q4 — Run: PASS

Affected 6 files **33/33 pass**; tsc exit 0. The static-gate source is unchanged and the cli diff is limited to the readiness owner/threading regions.

## Q5 — Lint: verification limitation, not certified

The requested **absolute-path** `anti_slop_lint` invocation returns the documented tool serialization error `value is not lossless JSON` for the readiness test (and the full DAG), so I cannot independently certify the claimed 161/test-clean result. A repo-relative target returns `clean` with **filesScanned: 0**, which is not evidence. A DAG subset (`no-unknown-parameters`) does scan 1 file and is clean, and manual inspection shows the readiness casts carry SAFETY comments, but the full classification remains unverified due the tool bug. Flag this as a tooling limitation, not a product finding; if a full lint scan is required, provide a working target form.

## Q6 — Scope honesty: PARTIAL

The transition/gate is real and consumed by Server admission in production, so R27's early-readiness clause is structurally advanced. But the new gate does not reproduce the existing 503 bytes, and the test's static-UI claim is not positive: the failed-readiness test has no `staticRoot`, so it asserts GET `/app.js` is **503**, not that a static asset is allowed (`test:121-124`). Add a positive static-UI case to prove the exemption.

## VERDICT: HOLD (2 required repairs)

1. **Make the 503 gate byte-for-byte equal to the host gate**: reuse `writeJson` semantics (trailing newline), the host body key order, and the host's falsy-message omission; add exact-byte assertions for pending and failed.
2. **Add the positive static-UI exemption test**: with a `staticRoot` set, GET `/app.js` must be served, while `/api/*` or `/v1/*` remain 503; the current test only asserts 503 without staticRoot.

Tooling note: full anti-slop verification is blocked by the absolute-path serialization bug; repo-relative scan reported 0 files, so the 161/test-clean claim is not independently certified. No product file was modified; no commit made.

## Final re-review after byte/static fixes — HOLD (1 lint item)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `composition-dag.ts` | `25E7C1AD7DEC6BEC024E06B9B861EA3FE1079963668CAFE6F37F3ACF8C22D564` | 63055 |
| `index.ts` | `DC999129597288A05F09A07014E3B0F4877B8EBCCCEAEEA4CC0C61C3A23B042C` | 1366490 |
| `test/s324-readiness.test.ts` | `D10ADDE82C5C9EEF2BD1A1C677A2B96F8562AD25B7A4FA8DD0FCD3C4FFDC8B76` | 9337 |
| `cli.ts` | `558AB4C6546115E49C189E120491D61FBB0A64DE9E1B3154D61FADC26CD00A61` | 593210 (unchanged) |

- **503 parity — PASS:** `startupReadinessRefusalBody` builds `{error,status,message}`, deletes falsy message, and appends \n (`composition-dag:405-414`); the host gate now calls it through `writeText(...,"application/json")` (`index:17534-17537`) and the DAG gate uses the same helper (`composition-dag:1099-1104`). I compared the old host body construction/writeJson path: field order and trailing newline now match exactly. The test asserts literal pending/failed bytes and falsy-message omission (`test:138-176`). PASS.
- **Static-UI positive — PASS:** with `staticRoot` set, GET `/app.js` is served; `/api/status` and `/v1/chat` are 503 (`test:178-209`). The old failed-readiness test still covers no-staticRoot 503. PASS.
- **Run:** affected 6 files **35/35 pass**; tsc exit 0. Transition/identity/threading and host readback gate remain correct; cli unchanged.

### Remaining HOLD

- **The test file is not lint-clean.** Manual inspection of the new tests shows bare `as never`/`as Captured` assertions without SAFETY comments at `test:139,179,185,186` (and the file already has other casts). The absolute-path `anti_slop_lint` target still returns the documented `value is not lossless JSON` tool error, and repo-relative returns `filesScanned:0`, so the “test clean” claim is not supported. Required: add the same SAFETY boundary comments/typed helper used elsewhere, then re-run lint. This is a test-quality repair; the 35/35 behavior is green.

**FINAL VERDICT: HOLD (1 lint item).** Byte parity and static-UI behavior are fixed; the test lint claim is not. No product file was modified; no commit made.

## Final comment-only re-review — HOLD (1 missed cast)

Final test hash verified: `0626924589FE1F0A5B246F098143EC403891A695F14FECBACC425725F7EDCEC2` (9649 B); DAG/cli/index unchanged. Affected 6 files **35/35**, tsc exit 0.

- SAFETY comments are correctly placed above the casts at `:140,181,188,190` (the reported :139,:179,:185,:186 are pre-shift line references).
- **One cast is still uncovered:** `test/s324-readiness.test.ts:163` — `const failedCaptured = {} as Captured;` — has no SAFETY comment (previous line is `failedReadiness.markFailed("boom");`). I scanned every `as ...` in the file; this is the only remaining bare cast. The absolute-path `anti_slop_lint` tool bug still prevents a machine scan, and repo-relative reports 0 files, so the claimed clean test is not supported; `require-safety-comment-for-type-assertion` would flag this line.
- Add the same `// SAFETY: test-only cast required by the transport/composer input types.` above `:163` and re-run; behavior/tests are unchanged and green.

**FINAL VERDICT: HOLD (1 missed SAFETY cast at test:163).** No product file was modified; no commit made.

## Final comment-only verification — PASS

Verified final test hash: `689C583BF2F6CD458098526250B7633AF18830271DB18785D116F00213B1E7C5` (9727 B); DAG/cli/index hashes unchanged. I scanned every `as ...` assertion in `test/s324-readiness.test.ts`: **zero bare casts** remain; `:163` now has the SAFETY comment. Affected 6 files **35/35 pass**; tsc exit 0. The absolute-path anti-slop tool bug remains unchanged and prevents a machine scan, but the manual cast scan is complete and the file is clean by the same rule. Safe to finalize.

## FINAL VERDICT: PASS

All S325 items are closed on the final bytes: shared 503 helper byte parity, exact-byte and falsy-message tests, positive static-UI test, safe transitions/identity/threading, and a clean test cast audit. No remaining numbered items. No product file was modified; no commit made.

