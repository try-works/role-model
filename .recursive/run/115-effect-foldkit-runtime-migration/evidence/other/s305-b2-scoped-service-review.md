# S305 — independent review: S303 B2/R22 scoped process service + SEA/Windows closure

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the package suite and anti-slop tool as requested.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `role-model-router/packages/process-supervisor/src/index.ts` | `1F377E66AB37519BB4F3E7D3B05B717EB3946EDC9430929BEC708EFBD9AE1C30` | 23541 |
| `test/s303-scoped-service.test.ts` | `DC4CDF56FD58342406570F266FA765F0B1471129B989A9C2E127F2B0456B14B1` | 6847 |
| `test/s303-sea-leg.test.ts` | `0548DD948A4BCC3DBCEF3CE2BB839738B00CFE0F7260F37620FE19BFE47C04C7` | 4904 |

All match. `src/index.ts` diff is +51 insertions only; the pre-existing line 488 `stopPromise.catch((error: unknown))` is not in the diff. Suite: `corepack pnpm --filter @role-model-router/process-supervisor test` → **6 files, 17 passed | 3 skipped (20)**, exit 0. SEA leg ran (19.6 s), Windows grandchild test ran (1.88 s).

## Q1 — Ownership semantics: HOLD

`VendorScope.close()` does run every registered release in reverse order, catches each failure, and throws one `AggregateError` after all releases (src lines 686-703); the test at `s303-scoped-service.test.ts:81-97` proves `["third","second","first"]` and AggregateError. That part matches the R27 rule.

Two ownership gaps remain:
- **Acquire leak:** `startScopedVendor` starts the vendor first (`src:712`) and only then calls `scope.register` (`:713`). `register` throws when the scope is closed (`:680-682`); in that case the started vendor is never stopped and no handle is returned — an orphaned child, not acquireRelease-equivalent ownership. No test covers starting into a closed scope.
- **Concurrent close does not join:** `close()` sets `closed = true` and returns immediately on a second call (`src:686-690`) while the first close is still awaiting releases. A caller awaiting the second close can believe teardown finished before it has. Effect Scope close is idempotent/joined; this is not.

**Required:** on register failure after start, stop the vendor and rethrow (AggregateError if stop also fails); store an in-flight close promise so all concurrent `close()` calls await the same teardown; add closed-scope and concurrent-close tests.

## Q2 — Effect-first deviation: PASS

`packages/process-supervisor/package.json` has no dependencies at all (`package.json:1-14`); the S303 scope is package + evidence only and installs are forbidden. Importing Effect would require adding a workspace dependency (and likely install/lockfile change outside the stated scope) to a deliberately dependency-free low-level package. The result doc records the reason (`s303-b2-scoped-process-service-result.md:24-25`): plain TS scope because there is no effect dependency and installs are forbidden. The semantics implemented in `VendorScope` (reverse order, release-all, AggregateError) are the relevant Effect acquireRelease behavior; the deviation is bounded and disclosed. This satisfies the repo rule's “say why” requirement given the slice constraint; no HOLD on Effect-first grounds.

## Q3 — env/cwd/logs preservation: PASS

`s303-scoped-service.test.ts:99-133` starts a real Node child through `startScopedVendor` with custom `env` (`MARKER`, `PORT`, `S303_MARK`), `cwd: tempRoot`, checks the marker contains `env=scoped-mark` and `cwd=<tempRoot>`, waits for the captured log line, closes the scope, and observes the HTTP endpoint go down. This is a positive scoped-path assertion; the child is real and the supervisor is the same path as pre-scope.

## Q4 — Windows grandchild tree: PASS (on this Windows host)

`windowsOnly("stopping a scoped vendor kills its grandchild tree")` (`s303-scoped-service.test.ts:135-170`) spawns a Node parent which spawns a real grandchild Node process and writes its PID; it asserts both the vendor and grandchild are alive, closes the scope, then waits for both PIDs to die. The package suite ran this test on Windows and it passed. The stop implementation uses the existing `taskkill /PID <pid> /T /F` path (`src:335-337`, `src:526`), so this proves tree death, not just direct-child death. On non-Windows it is platform-skipped as designed.

## Q5 — SEA leg: HOLD (identity/pin/repeatability gaps)

The leg uses the pinned path `E:/role-model-run115/package-s293-public/.../role-model-dev.exe` (`s303-sea-leg.test.ts:20`), spawns it on an ephemeral loopback port with a state root, asserts healthy → stop → endpoint down (`:87-118`), and records size, sha256 and manifest version in `s303-sea-leg.json`. The actual evidence is correct: sha `d2bc6231f5b5751f4f0b8bc4a970a7593d27a63497b0f7bfa1e41d53beccd67b`, version `0.0.20-269-g35103383`, size 104,880,640, healthy 11,457 ms, stop 1,058 ms, E: state root.

Gaps:
- **The pinned sha/version are never asserted.** `:83` computes the sha and `:110` writes it, but no `expect(sha256).toBe("d2bc6231…")` / version assertion. A different executable at the pinned path would pass and merely record a different identity; the test name/claim says “pinned sealed SEA”.
- **E: state root is ambient, not enforced.** `:76` uses `mkdtemp(path.join(os.tmpdir(), ...))`; the observed E:\rm-tmp comes from TMP/TEMP, not from the test. Without E: ambient it writes C:.
- **Platform gate is too broad.** `:66` runs the leg on win32/linux/darwin, but `:20` is a Windows `.exe` path; on Linux/darwin the candidate is missing and the test throws rather than skip/fail-fast cleanly. Gate on win32 (or parameterize the candidate per platform).

**Required:** assert the exact pinned sha, version and size; enforce/validate the E: state root (or make it an explicit required input); gate the leg to the platform that can run that executable.

## Q6 — Regression: PASS

Ran the full package suite: 17 passed / 3 skipped. The 3 skips are the pre-existing POSIX-only tests:
- `s5b-process-lifecycle.test.ts:113` “a child that ignores graceful stop is escalated after the bound with SIGKILL”;
- `s5b-process-lifecycle.test.ts:142` “a child that exits on graceful stop is never escalated”;
- `s5c-supervisor-repairs.test.ts:54` “a prompt SIGTERM exit is never SIGKILLed across repeated short-bound stops”.
All are `posixOnly` (`process.platform === "win32" ? test.skip : test`) and pre-date this slice. 17/3 matches the author claim.

## Q7 — Lint: PASS

`anti_slop_lint`:
- `test/s303-scoped-service.test.ts`: **clean**;
- `test/s303-sea-leg.test.ts`: **clean**;
- `src/index.ts`: exactly one finding, `no-unknown-parameters` at `:488` on the existing `record.stopPromise.catch((error: unknown))`. The line is absent from the +51-line diff, so it pre-exists this slice; no new finding was introduced.

## Q8 — TDD and gap table: PARTIAL

- `s303-red.log`: controlled RED on a naive sequential close — 1 failed / 2 skipped; failure is "expected Error: second release failed to be an instance of AggregateError" (a behavioural assertion failure, not a setup error). GREEN suite 17/3. PASS for TDD.
- Gap table: the task’s table (`tasks/s303-b2-scoped-process-service.md:10-26`) matches the actual test inventory for the rows it marks yes/added. However it records **token/loopback as “partial”** (line 23: “no explicit loopback assertion / no SEA process”); the result doc’s completion table (`s303-b2-scoped-process-service-result.md:8-17`) omits that row and calls the slice R22 completion. The new SEA leg exercises loopback, but there is still no positive token-preservation/loopback assertion (the existing token test is negative-only). Either add a token/loopback assertion or keep R22 explicitly PARTIAL/named follow-on rather than “completion”.

## VERDICT: HOLD (3 required repairs)

1. **Fix scope acquire/close ownership:** roll back a started vendor when `scope.register` throws; share an in-flight close promise so concurrent `close()` calls join; add tests for starting into a closed scope and concurrent close.
2. **Harden the SEA leg:** assert the pinned sha `d2bc6231…`, version `0.0.20-269-g35103383` and size; enforce/record an E: state root instead of ambient `os.tmpdir()`; gate the leg to a platform where the pinned `.exe` actually runs (win32).
3. **Resolve the R22 token/loopback claim:** add the positive token/loopback evidence (or a narrow loopback assertion) or declare R22 PARTIAL with a named follow-on in the result doc; the gap table already says partial and the completion table omits it.

No product file was modified; no commit made.

## Re-review (S305 final) — HOLD (3 remaining)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `25428D1D9286C848CD231A3519F09E444619552C129E628B70BEFF6F38484740` | 24109 |
| `test/s303-scoped-service.test.ts` | `7950AE3A6589676CE089CC023BC28751575150DD2E3959A8C56ECD8B9F123E3F` | 8934 |
| `test/s303-sea-leg.test.ts` | `79D23F15B0B9F4A764C5E3DDA2F526FFB3ABD663C455B411E2CB53A9F65649C7` | 5999 |

Diff is +65 lines in `src/index.ts`; lint: both new tests clean, `src/index.ts` only the pre-existing `no-unknown-parameters` at `:488`.

### What is closed

- **Shared close / idempotence — CLOSED.** `close()` caches one `closePromise` and `runReleases` sets `closed=true` synchronously before the first await (`src:688-698`); the concurrent-close test (`test:169-186`) waits ≥100 ms, sees each release once and the reverse order. PASS.
- **Register-throw rollback (stop succeeds) — CLOSED.** `startScopedVendor` catches `register` failure, calls `vendor.stop()`, rethrows the acquire error (`src:719-729`); the closed-scope test kills the real child and observes the endpoint down (`test:137-167`). PASS for this path.
- **SEA identity/root/gate assertions — CLOSED.** The leg asserts `sha256 === d2bc6231…`, size 104,880,640, version `0.0.20-269-g35103383` (`s303-sea-leg.test.ts:22-26,128-130`); `rootOnDrive` fail-fast with `S303_REQUIRED_TEMP_DRIVE` default E: and pure E:/backslash/C: checks (`:21,28-31,80-85`); `win32Only` gate is real (`:78`). PASS on the assertions.
- **Token — CLOSED.** The child observes `S303_TOKEN=token-s303` and the marker test asserts `token=token-s303` (`test:107,120,129`).
- **Effect-first, env/cwd/logs, Windows tree, TDD RED, lint — unchanged PASS.** RED2 is behavioral (2 failed first: rollback endpoint timeout, concurrent-close early return); full suite with TMP/TEMP=E: **20 passed / 3 skipped**, matching the claim.

### Remaining HOLD items

1. **Rollback stop-failure leaks silently.** The acquire rollback uses `await vendor.stop().catch(() => undefined)` (`src:727`) and then throws only the register error. If `stop()` rejects (child still alive / taskkill denied), the failure is discarded and the child can remain orphaned; the requirement was that the rollback path cannot leak on both register-throw and stop-failure. No test exercises a rejecting stop. Required: surface a stop failure (e.g. AggregateError with both errors, or rethrow the stop failure after logging the acquire error) and add a stop-failure rollback test; do not silently swallow it.
2. **The loopback assertion is tautological.** `expect(vendor.healthCheckUrl ?? "http://127.0.0.1:" + port + "/healthz").toBeDefined()` (`test:130`) is always true: the fallback itself is a defined string, and a non-loopback `healthCheckUrl` would also pass. The result doc claims “health URL asserted loopback”, but the test does not check the URL host/loopback or the child's bind address. Required: assert the actual URL starts with `http://127.0.0.1:` (and ideally inspect the child server address), or remove the loopback completion claim.
3. **Full suite repeatability depends on the ambient temp drive.** Running `corepack pnpm --filter @role-model-router/process-supervisor test` in this environment (TMP/TEMP=D:\DEV\dsh-temp) gives **1 failed / 19 passed / 3 skipped**: the SEA leg fails at `rootOnDrive(os.tmpdir(), "E:")` with “temp root … is not on the required drive E:”. With `TMP=TEMP=E:\rm-tmp` it is 20/3. The fail-fast is intentional, but the claimed full-suite GREEN is conditional on ambient E: temp and the default command is not hermetic. Required: make the test/config set the temp root (or a CI prerequisite that sets TMP/TEMP=E: and is recorded), or skip/fail-fast cleanly without failing the whole package suite on a non-E machine; state the prerequisite with the 20/3 evidence.

**FINAL VERDICT: HOLD** pending those three items. No product file was modified; no commit made.

## Round-2 verification after hash correction — HOLD (1 remaining)

Corrected final hashes verified:

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `EEA23FBA8076A9F860D205D3F3AFA67491539F3633DA39205268B5EB08B20A20` | 24349 |
| `test/s303-scoped-service.test.ts` | `4089A986897BE7ADAA292FB443BF22955358B3651360DE1E9521BCE03948CDF8` | 10419 |
| `test/s303-sea-leg.test.ts` | `16534BB621433D972E038E1D82B5BA946EE66D3FFABE245E2EEA7F884A65F0BB` | 6672 |

The earlier `6593EF42…/10366` scoped-test value is superseded by the lint cleanup to `4089A986…/10419`; src and sea-leg are unchanged. The cleanup replaces the injected-supervisor chained cast with an instance-method override; the rejecting-stop test still asserts the behavioral contract, and both new test files are anti-slop clean.

### Closed in this round

- **Rejecting-stop rollback — CLOSED.** `startScopedVendor` now nests the rollback stop in its own try/catch and throws `AggregateError([registerError, stopError], "VendorScope acquire rollback failed…")` (`src:719-739`). The test (`test:173-203`) overrides `startVendor` at the instance boundary, makes `stop` reject, and asserts one `stop` call, an AggregateError, exactly two errors and the rollback message. Behavioral and no longer swallowed.
- **Shared close — CLOSED.** One `closePromise`; concurrent close test waits >=100 ms, each release once, reverse order. PASS.
- **SEA identity/root/gate — CLOSED.** Assertions for sha `d2bc6231…`, size 104,880,640 and version `0.0.20-269-g35103383`; `rootOnDrive` fail-fast with E: default and override; Windows-only gate. Ambient E: state root when available; explicit `E:/s303-sea-state-*` otherwise; if E: is unavailable and no override, the test warns with the exact reason and calls `context.skip()` — the result is **skipped, not passed** (verified with `S303_REQUIRED_TEMP_DRIVE=Z:`: 20 passed | 4 skipped, exit 0, warning path).
- **Suite counts — CLOSED.** `corepack pnpm --filter @role-model-router/process-supervisor test` passes with **21 passed | 3 skipped (24)** under both default TMP (D: ambient, explicit E: root) and `TMP=TEMP=E:\rm-tmp`; both runs exit 0.
- **Lint — CLOSED.** Both new tests clean; `src/index.ts` only the pre-existing `no-unknown-parameters` at `:488` (line absent from the diff).

### Remaining HOLD item

- **The loopback assertion still cannot reject a non-loopback URL.** `test/s303-scoped-service.test.ts:130-134` constructs `new URL("http://127.0.0.1:" + port + "/healthz")` from a **test literal**, then asserts that literal's hostname/membership and `vendor.port === port`. It never parses `vendor.healthCheckUrl` (or another supervisor-recorded URL), so a supervisor returning `http://0.0.0.0:<port>/healthz` or any non-loopback URL would still pass; the parsed-URL assertions are on a constant the test itself wrote. This leaves the round-2 claim “loopback now parsed-URL assertions” unproven for the actual vendor URL.
  **Required:** parse `vendor.healthCheckUrl` (or the supervisor's recorded health URL) and assert its hostname is in `["127.0.0.1","::1","localhost"]` and its port equals the bound port; add a negative test using a non-loopback health URL so the assertion is demonstrated to reject it. Then the token/loopback completion claim is genuine.

**FINAL VERDICT: HOLD (1 item).** All other round-2 items are closed; no product file was modified and no commit made.

## Final loopback verification — PASS

Verified the corrected frozen bytes:

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `EEA23FBA8076A9F860D205D3F3AFA67491539F3633DA39205268B5EB08B20A20` | 24349 (unchanged) |
| `test/s303-scoped-service.test.ts` | `2FE4CB2119A1931999EA788F5855D200E75FB1F010CF83E0C8A90885B60A1906` | 12737 |
| `test/s303-sea-leg.test.ts` | `16534BB621433D972E038E1D82B5BA946EE66D3FFABE245E2EEA7F884A65F0BB` | 6672 (unchanged) |

- **Same helper, real served value:** the positive test's child records `bind=<address>:<port>` from its own `server.address()` (`test:129`), and the test validates `reportedHealthIssue("http://" + bind + "/healthz", vendor.port)` (`:153-158`). The negative test calls the **same** `reportedHealthIssue` helper (`:76-87`) with `http://0.0.0.0:<port>`, `http://192.168.1.10:<port>`, a mismatched loopback port and `undefined` (`:248-256`), asserting `/non-loopback/`, `/port/` and `/report/` respectively. This is not a parallel assertion: the literal-built-URL weakness is gone; the positive path checks the actual bind the child served.
- **Non-loopback cannot pass:** helper rejects any hostname outside `["127.0.0.1","::1","localhost"]` and any port that differs from the bound port; the negative test proves both rejection branches.
- **Suite:** `test/s303-scoped-service.test.ts` is **7/7 pass**; full package suite is **22 passed | 3 skipped (25)** and exit 0 under both default TMP (explicit E: state root) and `TMP=TEMP=E:\rm-tmp`. The clean-skip path warns and calls `context.skip()` when the required drive is unavailable/no override, so it is counted as skipped, not PASS (verified with `S303_REQUIRED_TEMP_DRIVE=Z:`: 20 passed | 4 skipped, exit 0 before the final negative-test addition; the skip is still a skip in the final suite).
- **Lint:** both new test files clean; `src/index.ts` only the pre-existing `no-unknown-parameters` at `:488`.
- **Other items:** rejecting-stop rollback AggregateError (2 errors, stop called), shared closePromise, SEA sha/size/version/root/win32 gate, and token/env/cwd/logs are all still closed at the unchanged source/sea hashes.

Non-blocking residual (not a false PASS path): Node's `URL.hostname` for an IPv6 literal is `[::1]` (bracketed), while the helper's membership list contains `"::1"`; a legitimate IPv6-loopback health URL would be falsely rejected as `non-loopback`. This is a false-negative, not an acceptance of a non-loopback URL. If IPv6 loopback support is required, add `"[::1]"`/normalize brackets and a positive IPv6 case.

## FINAL VERDICT: PASS

The loopback item is closed on the corrected frozen bytes; both test files are lint-clean, the two unchanged files match, the scoped test passes 7/7, the full suite is 22/3 under both TMP conditions, and the non-loopback-negative path uses the same helper as the real-served positive path. Only the documented IPv6 bracket residual remains, which does not let a non-loopback URL pass and is not a HOLD item for the stated requirement.

