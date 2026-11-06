# S295 — independent review: S294 R14 React capture / dual-run selfcheck runner

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only review; no product file modified, no commit, no tests or runtime launched by me.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/runtime/parity-selfcheck.mjs` | `821ABF49830ED8B1C56F38347E6094B6DB0A9E1E9A6D95914E170747A6A4CF95` | 13710 |
| `scripts/runtime/parity-selfcheck.test.mjs` | `2CAD1FD580D3A9A109309CB2ACF6662347055C3F1BF94DBAAC9974D4BF4EDA44` | 5999 |
| `scripts/runtime-parity.mjs` | `95988614CE8FB960F10C4F6E09F3FA0B473DB72FF3FEE7EA4596C408BCCD352F` | 1158 |

All three hashes match the frozen values exactly. Worktree branch/status: `recursive/115-effect-foldkit-runtime-migration`, `M scripts/runtime-parity.mjs` plus the two new files; no commit. Upstream re-read: source-proposal §6.1 (518-527), §6.2 (529-538), §6.4 (549-554), §6.5 (556-561); s265 R14 row (line 20, MISSING-CAPTURE); author task/result docs; RED/GREEN/real logs; the four PNGs.

## Q1 — Predicate integrity (can PASSED occur without two captures per target?)

**Yes, in the exported `evaluateSelfcheck` contract.** Trace:
- `chromeAvailable === false` → `NOT_RUN` (runner `:77-80`), exit 2. Intended.
- any `target.available === false` → `FAILED` `target-unavailable` (`:81-84`).
- per target: `deterministic = shas.length > 0 && shas.every(sha === shas[0])` (`:85-95`). **One capture per target yields `deterministic:true`**, and there is no check for `shas.length === 2`/run count.
- kept issues → `FAILED` (`:97-100`); differing shas → `FAILED` (`:101-104`).
- `react`/`foldkit` are looked up with `find` and may both be `undefined`; `equal` is then false, the comparison is merely `different`, and the function still returns **`PASSED`** (`:105-124`). Missing React *or* Foldkit entries never fail the predicate.
- `runSelfcheck` defaults to two runs (`:127-140`), and `main` hardcodes `DEFAULT_RUN_COUNT` (`:282`), so the normal CLI path happens to produce two; but the public predicate (also the unit-test surface) does not require it. `evaluateSelfcheck({chromeAvailable:true, runs:[[capture react, capture foldkit]], targets:[react,foldkit]})` would PASS.
- A capture that returns a falsy/non-object result instead throws in `captureOf` (`:67-75`), which is Q3's no-JSON path rather than a FAILED verdict.

**Finding:** predicate too weak; it must require exactly `DEFAULT_RUN_COUNT` captures per target, both required targets, and both targets in every run. Add tests for one-capture, missing-target and missing-run cases expecting FAILED.

## Q2 — ignoredIssues are not in the emitted JSON

**The doc claim is false for the final contract.** `captureWithChrome` returns `ignoredIssues` (`:250-256`), but `evaluateSelfcheck` builds per-target entries from only `evidencePath/id/issues(kept)/shas/sha256/deterministic` (`:88-95`) and the final JSON (`:117-124`) has no `ignoredIssues` or ignored count. The real log's JSON therefore contains no favicon-ignore record even though the result doc says it is “listed in ignoredIssues” (result doc:45). Partitioning is not silent inside the module, but it is silent in the emitted evidence contract. **Required:** include per-target `ignoredIssues` (or at least counts + texts) in `targets`/JSON and the evidence doc; add a test that a partitioned issue appears in the emitted object.

## Q3 — Failure paths escape without FAILED JSON

**Material contract defect.** `main` has no try/catch around `mkdirSync`, `launchChrome`, `connectCdp`, host spawn, `waitForHealth`, or `captureWithChrome`; the `try/finally` starts only after `connectCdp` (`:272-280`). `launchChrome` (timeout/exit), `connectCdp` (WS/Cdp error), spawn failure, unhealthy host (`:298`), or capture throw all reject `main`; the dispatcher also has no catch (`runtime-parity.mjs:13-15`), so a top-level unhandled rejection exits non-JSON, and `--selfcheck` no longer honours `{status:"FAILED",...}`/exit 1. Additionally, a `connectCdp` failure after Chrome launch leaks the Chrome child because the cleanup `finally` has not been entered. **Required:** wrap the whole orchestration (from Chrome launch on) in try/catch, always kill Chrome/hosts, emit `{status:"FAILED", reason:"<diagnostic>", ...}` with exit 1; keep NOT_RUN exit 2 only for no-browser. Add a dispatcher/failure-path test.

## Q4 — Exe identity is not recorded

Result doc says only “the packaged dev executable” (result doc:10); neither the doc nor the runner JSON records the serving exe path/version/sha. The run used **`0.0.20-231-gd61c32dc`, sha256 `e3181d507a6ccd757407024dda25b1813329dd6e7895ae5d4e52b4f84c63e7a7`** (verified current worktree `role-model-router/dist/release/win32-x64/role-model-dev.exe` has exactly that sha; task statement supplies the version). This is the s284 identity lesson applied to the runner: **record exe path + version + sha in the result doc**, and preferably emit it in JSON. Note this is a worktree dev executable, not a sealed-package claim.

## Q5 — Port reuse claim is verified; it does not mask app nondeterminism for this route

- React renders its endpoint: `app/lib/sidebar-footer.ts:235-249` returns `url.host/v1` (or `window.location.host/v1` fallback). Foldkit renders its origin: `runtime-ui-next/src/view.ts:866-872` uses `window.location.origin + "/v1"`. Both real captures visibly show `127.0.0.1:56393/v1`.
- Therefore a fresh port per run changes rendered bytes for harness reasons. One port per target reused across the two runs (runner `:276-279,286-295`) is a legitimate harness constant.
- It does **not** mask app-level nondeterminism here: each run gets a fresh state root (`:287`), a fresh host process, the same fixture backend, the primitive's frozen clock/seeded random/DOM-quiet/stable-frame checks, and two fresh browser contexts. The two targets are served sequentially; the captures happen to show the same ephemeral port because `freePort()` (`:144-152`) can hand back the just-released port — harmless under sequential serving, but the port should still be recorded per target.
- Residual: the runner does not itself enforce that `freePort` never returns 3456/3457/3458; the observed run used 56393 and the code has no operator-port strings. An explicit guard is cheap insurance.

## Q6 — Favicon partition is conservative but not resource-correlated

Code (`:53-65`): the URL-less echo is ignored only when `faviconSeen` (a favicon network line is present); without that line the echo is kept. Test `:123-138` covers both cases. The real 404 network line for any *other* resource remains kept because only the exact URL-less echo matches the second rule. Residual risk: if another resource's 404 were represented only by the URL-less echo while a favicon line exists, that echo would be masked; the primitive normally surfaces the URL-bearing network line, so this is a bounded noise partition, not a general 404 suppression. Q2's emitted ignored list is the right auditability fix.

## Q7 — TDD evidence

`s294-red.log`: `COMMAND: node --test scripts/runtime/parity-selfcheck.test.mjs`, `EXIT_CODE=1`, 8 tests, 0 pass, 8 fail; every failure is an assertion mismatch (status NOT_RUN vs PASSED, `0 !== 2`, etc.), **no module/import/setup errors** (0 matches for `Cannot find module`/`ERR_MODULE_NOT_FOUND`/`SyntaxError`). `s294-green.log`: 9/9 pass. `s294-real.log`: real Chrome, exit 0, PASSED with both targets deterministic and both shas recorded. One nuance: the 9th test (favicon partition) is present in GREEN but not in the 8-test RED stage — it was added during the real-run fix, so it is a regression test, not RED-first.

## Q8 — Tests are not fully non-tautological

`evaluateSelfcheck` sets `reactVsReact.equal = react.deterministic` (`:115`), i.e. it reuses the determinism flag rather than comparing two explicit React capture shas. With two equal captures that does represent “0 differences”, but because one capture also sets `deterministic:true` (Q1), the assertion is weaker than its name and the test's true case (`:37-53`) re-derives it. The nondeterminism test (`:66-75`) checks only `status:FAILED`/reason, **not** `reactVsReact.equal === false`. **Required:** require two captures and compute the comparison from the two explicit shas; add the negative assertion and a one-capture test.

## Q9 — Privacy / safety

- Captures are written only under the run evidence dir (`main` default `:267`; real JSON paths under `evidence/other/s294-captures`); verified four PNGs, each target's run0/run1 byte-identical (`react 7E356AC3…`, `foldkit 9A4379CA…`), both 1440x900 and visibly rendered UIs.
- Serving is fixture-backed (`--fixture-root testdata/router-runtime/fixtures`, `:266,293`); no operator data; the only port observed is ephemeral 56393; no 3456/3457/3458 strings in runner or real log.
- Hosts are killed in the `finally` (`:305-319`) for failures after Chrome/CDP setup; Chrome is killed there too. **Gap:** launch/CDP failures before the `try` leak Chrome (Q3).
- **Temp root:** the code uses `os.tmpdir()` for Chrome user-data and state roots (`:273,287`); the real run set `TMP/TEMP=E:/rm-tmp` and the result doc says state/user-data under E:. I verified `E:/rm-tmp/s294-chrome-*` and `s294-state-*` dirs exist, so the observed run complies. But the code does not enforce E:; a rerun without those env vars writes to C:. **Required:** make the temp root explicit (or fail fast if `os.tmpdir()` is not on E:) and record it; do not silently depend on ambient env.

## Q10 — Wiring

`git diff scripts/runtime-parity.mjs` changes only the `--selfcheck` branch: imports `main/exitCodeFor`, calls `main({})`, prints JSON, exits `result.exitCode ?? exitCodeFor(status)` (`runtime-parity.mjs:9-15`). The `--request-selfcheck` branch is byte-unchanged (`:4-8`). Invalid-mode still emits `FAILED`/`invalid-mode` exit 1 (`:16-18`). PASSED/FAILED/NOT_RUN map 0/1/2 via `exitCodeFor` (`parity-selfcheck.mjs:42`) and main's explicit exit codes (`:268,270,304`). The Q3 uncaught paths break this mapping only on orchestrator failures.

## Q11 — anti-slop

Exact invocations (relative targets resolved to 0 files, so I used absolute paths):
```
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime/parity-selfcheck.mjs" })
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime/parity-selfcheck.test.mjs" })
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime-parity.mjs" })
```
Results: runner `findings`, 1 file scanned, 15 rules, exactly one finding: `no-runtime-typeof` at line 149 col 38; test and dispatcher `clean` (1 file, 15 rules each). The line-149 check narrows Node's typed `server.address(): string | AddressInfo | null` return to an object before reading `.port`; it is a representation check at a typed Node API boundary, not unvalidated input. The justification is sound as a boundary exception, though the rule flags it; no other anti-slop findings exist in the three files.

## Q12 — Double evaluation and first-PNG evidence

`main` calls `evaluateSelfcheck` twice in the same return expression (`:304`), once for the result and once for the status. The function is pure, so this is only avoidable inefficiency (no correctness change). `evidence.targets` records only `captures[0]?.evidencePath` (`:119`), while both `react-run0/1` and `foldkit-run0/1` exist; the JSON `targets[].shas` has both shas but the evidence index cannot point at run1. This is a minor contract/evidence gap; include both capture paths (or a captures array) and evaluate once.

## Scope / verdict

The lane is real: it builds on `parity-capture.mjs` (imports `PARITY_CAPTURE_DEFAULTS`, `captureIssues`, `captureParityScreenshot`; no re-implementation), runs real Chrome, records deterministic run0/run1 sha pairs, classifies React-vs-Foldkit as different, and the observed real gate is exit 0 PASSED. The declared single-route limit is stated honestly in task doc:78 and result doc:47; the full §6.5 matrix (§6.4 mutation too) remains a later slice, so R14 remains PARTIAL/MISSING-CAPTURE scope-wise and this run must not be read as full R14 closure.

**Verdict: HOLD**, with required repairs before acceptance:

1. Enforce exactly two captures per target and both required targets in `evaluateSelfcheck`; missing entry/run/capture must be FAILED (add one-capture, missing-react, missing-foldkit tests).
2. Surface per-target `ignoredIssues` (or counts + texts) in the emitted JSON/evidence; correct the result-doc claim; add a test.
3. Catch all orchestration failures from Chrome launch through capture in `main` (and the dispatcher), always clean up Chrome/hosts, and emit `{status:"FAILED", reason,...}` exit 1 with tests; NOT_RUN only for no browser.
4. Record the serving exe identity in the result doc (and preferably JSON): path, version `0.0.20-231-gd61c32dc`, sha256 `e3181d507a6ccd757407024dda25b1813329dd6e7895ae5d4e52b4f84c63e7a7`; state explicitly it is the worktree dev exe, not a sealed package.
5. Make the temp root explicit (E:) or fail fast if `os.tmpdir()` is not on E:, and record TMP/TEMP + state/user-data roots; captures stay under the run evidence dir.
6. Compute `reactVsReact` from two explicit React capture shas (require two) and add the negative assertion for nondeterministic/one-capture cases.
7. Include both run capture paths in `evidence.targets` (or a captures array) and call `evaluateSelfcheck` once.

No product file was modified; no commit made.

## Re-review (repair round) — new frozen hashes and findings

Verified with `Get-FileHash` before reading:

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/runtime/parity-selfcheck.mjs` | `FF2B1A752BB22DCAC68972A979BE06B88753E5D8E63D8818EDAEDFC5C572C7D0` | 17233 |
| `scripts/runtime/parity-selfcheck.test.mjs` | `E9967A5F246E675CE97CE0E97954CABD3B2421913FACDAD7EC38534221FEBCE3` | 9356 |
| `scripts/runtime-parity.mjs` | `C682467D189460049A586E67F673D68C7830CD392245081A4AF69541636482D3` | 1578 |

Author evidence re-read: `s294-red2.log` (15 tests; 6 new S295 tests failed first, 9 prior pass), `s294-green2.log` (15/15), `s294-real3.log` (real Chrome exit 0 PASSED), updated result doc, four new PNGs.

### Per-finding status (closed / partial / not closed)

1. **Exact capture count + both targets — CLOSED for count/targets, PARTIAL for run provenance.** `evaluateSelfcheck` now fails `target-missing` for absent React/Foldkit (`:128-136`), `deterministic` requires `shas.length === DEFAULT_RUN_COUNT` (`:156`), and `capture-count` fails any target without exactly two captures (`:168-171`); tests `:141-162` cover one-capture and missing-target, and the real3 JSON has two captures per target. Residual: the predicate counts captures per target without checking they came from two distinct runs/one per run; `runs=[ [reactA, reactB, foldkitA, foldkitB] ]` would still pass the count/target checks. Normal `runSelfcheck`/`main` build two runs, so this is an exported-contract hardening gap, not a CLI path lie.
2. **ignoredIssues emitted — CLOSED.** Per-capture ignored lists (`:145-149`), per-target flattened list (`:152`), and top-level `ignoredCount` (`:167`); test `:164-175`; real3 JSON contains `ignoredCount:4` and per-capture/per-target favicon entries (the URL-bearing network line plus its URL-less echo).
3. **Failure containment/cleanup — PARTIAL.** The dispatcher now wraps `main` and emits `{status:"FAILED",scope:"browser-parity",reason:"runner-failure: ...",exitCode:1}` on rejection (`runtime-parity.mjs:13-21`); `main` has a try/catch/finally around launch/connect/hosts/capture (`:370-416`), and `runSelfcheck` contains injected capture failures as FAILED (`:186-207`; test `:207-219`). **Remaining leak:** `launchChrome` spawns the child then awaits its DevTools endpoint (`:276-300`); if that promise rejects (timeout or bad endpoint), `chrome` is still undefined at the `main` catch/finally, so `killAll` cannot kill the spawned Chrome. A launch timeout therefore returns FAILED JSON but can orphan Chrome. Also `mkdirSync`/`mkdtempSync` (`:351-352`) sit before the main try (the dispatcher catches CLI, but direct `main`/`isMain` has no guard).
4. **Exe identity — CLOSED.** `resolveExecutableIdentity` hashes the exe and reads the adjacent manifest version (`:64-94`); real3 JSON records path, `sha256 e3181d507a6ccd757407024dda25b1813329dd6e7895ae5d4e52b4f84c63e7a7`, version `0.0.20-231-gd61c32dc`. **Doc residue:** result doc's old "Final result (s294-real.log)" table (lines 16-28) and stale anti-slop paragraph (lines 73-75) still contradict the new real3/clean-lint state and should be removed or marked superseded.
5. **Temp root — PARTIAL.** `main` records `tempRoot` and `chromeUserDataRoot` (real3: `E:\\rm-tmp` and `E:\\rm-tmp\\s294-chrome-*`), and the E:/rm-tmp dirs exist; but it still derives them from `os.tmpdir()` (`:331,352,381`) without enforcing E: or failing fast. A rerun without `TMP/TEMP=E:/rm-tmp` writes C:. Recording satisfies the JSON evidence question but not the original fail-fast safety requirement.
6. **reactVsReact from two React shas — CLOSED.** `buildComparisons` now requires `reactShas.length === DEFAULT_RUN_COUNT` and every sha equal (`:120-124`), is emitted on capture-count/issues/nondeterministic paths as well as success, and the negative test asserts `equal:false` plus both shas on a nondeterministic FAILED result (`:177-187`).
7. **Single evaluate + both PNGs — CLOSED.** The success path calls `evaluateSelfcheck` once (`:398`), and `evidence.targets[].pngs` carries both capture paths (`:160-166`); real3 lists run0+run1 for both targets. The double evaluation is gone.

### Cross-round sha change — explained, PASS

- First real invocation: React `7e356ac3…` / Foldkit `9a4379ca…`, rendered endpoint port 56393 (both prior images).
- New real3 invocation: React `5ad8d891e5bcc0c32f47625c451ecda93abbeac2a9b7b5ae2fd24cedacf45750` / Foldkit `39ab9616dc54f43df94f296e21ac3d6f672ccb548953e9bd850d74a9db1e5253`; new images visibly render ports 55787 (React) and 55788 (Foldkit). Each target's run0/run1 sha is identical within the invocation.
- The UI renders its per-invocation endpoint: React `app/lib/sidebar-footer.ts:235-249` (`url.host`/`window.location.host` + `/v1`), Foldkit `runtime-ui-next/src/view.ts:866-872` (`window.location.origin` + `/v1`). The port is a harness constant only within one invocation; across invocations the OS-assigned port changes rendered pixels.
- **Not a rebuild:** React build `index.html` 23:24:31 and Foldkit `index.html` 26-Oct 20:10:05 both predate the first real run (23:29:31) and the new run (23:50:11); the exe sha is unchanged `e3181d50…`. **Not nondeterminism:** within each invocation run0=run1; the changed bytes are the rendered port. Verdict: explained.

### anti-slop re-run

```
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime/parity-selfcheck.mjs" })
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime/parity-selfcheck.test.mjs" })
anti_slop_lint({ target: "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/scripts/runtime-parity.mjs" })
```
All three are **clean** (1 file scanned, 15 rules each). The former `no-runtime-typeof` at `:149` is gone; `freePort` now uses `"port" in Object(address)` (`:217`) instead of `typeof`; no new findings.

### Wiring and safety checks

- `git diff scripts/runtime-parity.mjs`: only the `--selfcheck` branch changes; it adds the try/catch FAILED JSON; `--request-selfcheck` lines 4-8 are byte-unchanged; invalid-mode remains FAILED/exit 1.
- `s294-real3.log` JSON: exit 0 PASSED; executable identity, `tempRoot E:\\rm-tmp`, `chromeUserDataRoot E:\\rm-tmp\\s294-chrome-Hj9feQ`, per-capture `ignoredIssues`, `ignoredCount 4`, both `pngs` per target. Captures remain under `evidence/other/s294-captures`; observed ports 55787/55788 are ephemeral, no 3456/3457/3458 strings in runner/log; E: temp dirs present.

## FINAL VERDICT: HOLD (repair round partially closes S295)

Closed: ignoredIssues/ignoredCount, exe identity (JSON), reactVsReact two-sha comparison + negative test, single evaluate + both PNGs, dispatch-level FAILED JSON, anti-slop clean. Partial: capture-count predicate lacks explicit run/one-per-run provenance; launch failure can orphan Chrome; temp root is recorded but not enforced; result doc still contains stale pre-repair result/lint text. These are bounded, addressable repairs, not a failing real lane.

Numbered remaining repairs:

1. Enforce run provenance in `evaluateSelfcheck` (exactly `DEFAULT_RUN_COUNT` runs, each required target exactly once per run) and add a test for two captures packed into one run.
2. Kill the spawned Chrome child on `launchChrome` rejection/timeout (or hold a handle before awaiting the endpoint), include `mkdirSync`/`mkdtempSync` in the guarded scope, and handle child `error` events; add a launch-failure test.
3. Make the temp root fail-fast/enforced on E: (or explicit input), not just recorded; keep the recorded values in JSON.
4. Clean the stale result-doc sections: remove/mark superseded the old `s294-real.log` final table and the outdated line-149 anti-slop paragraph; keep real3/clean-lint as the final state.

## Round-2 re-review — new frozen hashes and final status

Verified with `Get-FileHash` first:

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/runtime/parity-selfcheck.mjs` | `C72C17EF71442762D8A904D9C3D14F4415BDD98BA713D07244AB65F6962C0262` | 20007 |
| `scripts/runtime/parity-selfcheck.test.mjs` | `3180303CCF1AD95F260D4FF0EFA4E13F0CF68EF9B3B92E0A45313DADC1FC1D1F` | 11945 |
| `scripts/runtime-parity.mjs` | `C682467D189460049A586E67F673D68C7830CD392245081A4AF69541636482D3` | 1578 (unchanged from round 1) |

Evidence re-read: `s294-red3.log` (18 tests, 3 new failed first: provenance, temp drive, launch child), `s294-green3.log` (19/19), `s294-real4.log` (real Chrome, exit 0 PASSED, full JSON), updated result doc, four new PNGs.

### Per-repair status

1. **Provenance — CLOSED.** `evaluateSelfcheck` rejects `runs.length !== 2` (`:144-146`) and scans each run for exactly one capture of every available target, reporting `capture-count` (`:147-157`); tests `:224-243` cover the packed/missing-run cases. The normal `runSelfcheck`/`main` paths build exactly two runs. PASS.
2. **Chrome orphan / pre-try filesystem — CLOSED for the reported failure; one residual spawn-error path.** `launchChrome` tracks the child through `onSpawn` before awaiting the endpoint and kills it in the catch on endpoint timeout/exit (`:301-337`); tests cover endpoint timeout and injected-launch rejection. `mkdirSync`/`mkdtempSync` are now inside `main`'s try (`:423-424`), host `error`/`exit` are recorded and propagated through the health failure (`:445-449`), and `killAll` runs in `finally` (`:466-473`). **Residual:** the spawned child still has no `"error"` listener; a real `spawn` failure (e.g. EACCES after `existsSync`) emits an uncaught `error` event rather than rejecting `launchChrome`, so the dispatcher's FAILED-JSON catch does not apply. The injected tests do not exercise that path.
3. **E: temp root — CLOSED.** `DEFAULT_TEMP_DRIVE`/`enforceTempRoot` (`:43-52`) fail-fast `FAILED` when `os.tmpdir()` is not on the required drive (`:393-396`); the drive is injectable and tested for E:/Z: (`test:245-250`); real4 records `tempRoot E:\rm-tmp` and an E: chrome root. PASS.
4. **Stale result doc — NOT CLOSED.** The old final-result table is replaced by real4 shas, but the outdated anti-slop paragraph survives at `s294-r14-capture-result.md:75-77` ("carries one `no-runtime-typeof` finding at line 149"), directly contradicting the same doc's line 59 ("all clean") and the verified clean lint. The author's claim "lint paragraph corrected" is therefore false. Doc-only repair.

### quietMs / stableCount verdict

- **Legitimate documented override, not predicate weakening.** `parity-capture.mjs` validates `quietMs` as finite positive and `stableCount` as integer ≥2 (`:197-209`), and the runner keeps `deadlineMs: PARITY_CAPTURE_DEFAULTS.deadlineMs` (15000 ms, `parity-capture.mjs:26`) in `CAPTURE_OPTIONS` (`parity-selfcheck.mjs:346-351`). The override makes capture stricter (1200 ms quiet, 3 identical frames vs defaults 400/2); it cannot run forever — a page that never settles fails `capture_timeout`/`capture_unstable` at the unchanged deadline. No hang risk introduced.
- **False-PASS likelihood: materially reduced, not eliminated.** The longer quiet window gives the SPA more time to replace a loading placeholder with data, and the third identical frame raises the bar; real4 shows real data rendered, not a placeholder. But stability is still byte-identity: a placeholder that remains genuinely unchanged for >1200 ms and has no pending requests can still be captured. The code comment "a capture that still does not settle fails as capture_unstable rather than passing a placeholder" is too strong; a stable placeholder *has* settled. The task asked for materially less likely, so this passes, with that qualification. A content-level readiness assertion would be needed to make a false placeholder PASS impossible.

### Cross-round sha change — explained, PASS

- real3: React `5ad8d891…` / Foldkit `39ab9616…`; real4: React `f78306493e0eec212a03763e4e76aaec4a22c2bc5ca160d2c5c0f4da8d077ff3` / Foldkit `5d7a86f1cc2ea012d3158653600ab8c07ce7baa4dc06c52189a5d6bc86fd36eb`.
- real4 favicon URLs/images show React port 51576 and Foldkit port 59463 (per-target OS-assigned ports; the author note's single 51576 refers to React only). Both UIs render their endpoint URL (React `sidebar-footer.ts:235-249`; Foldkit `view.ts:866-872`), so every invocation renders different ports; within-run run0/run1 are identical.
- Builds predate both runs (React `index.html` 27-Oct 23:24:31, Foldkit 26-Oct 20:10:05; real3 23:50:11, real4 00:15:59), and the exe remains `e3181d50…` with the same version. Not a rebuild; not app nondeterminism. Explained by rendered per-invocation ports.

### anti-slop / wiring / safety

- Re-ran the tool on the three frozen files: all **clean**, 1 file scanned each, 15 rules. The former `no-runtime-typeof` is gone (freePort uses `"port" in Object(address)`); no new findings.
- `git diff scripts/runtime-parity.mjs`: only the `--selfcheck` branch changes (FAILED-JSON catch, exit mapping); `--request-selfcheck` remains byte-unchanged; invalid-mode remains FAILED/1.
- real4 JSON: exit 0 PASSED, executable identity `0.0.20-231-gd61c32dc`/`e3181d50…`, tempRoot/userData E:, both PNGs/target, ignoredCount 4; captures under the run evidence dir; ports 51576/59463 ephemeral; no 3456/3457/3458.

## FINAL VERDICT: HOLD (2 remaining items)

1. **Doc repair not actually closed:** remove/rewrite the stale `s294-r14-capture-result.md:75-77` anti-slop paragraph (it still claims the old line-149 finding); keep the correct clean-lint statement at line 59.
2. **Handle `launchChrome` child `"error"`:** attach an error listener that kills the tracked child and rejects, so a real spawn error becomes `main` FAILED JSON instead of an uncaught event; add the matching failure test.

Residual (not blocking for the stated requirement): the quiet/stable override materially reduces but cannot eliminate a stable loading-placeholder PASS; qualify the runner comment or add a content-readiness assertion if elimination is required.

## Round-3 re-review — final closure

Verified with `Get-FileHash` first:

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/runtime/parity-selfcheck.mjs` | `3EBC195F5F4F7B79B1B5C2B7F624F513A3038164755892E754D5D6B2177C02ED` | 20442 |
| `scripts/runtime/parity-selfcheck.test.mjs` | `D96992B26A0A1DD0E6DDD5C228FC16B21CD918FA9545A3D339DA4FF8A7CABEDC` | 12834 |
| `scripts/runtime-parity.mjs` | `C682467D189460049A586E67F673D68C7830CD392245081A4AF69541636482D3` | 1578 — unchanged from round 1 |

### Remaining-item closure

1. **Stale result-doc claim — CLOSED.** `s294-r14-capture-result.md` no longer contains `149`, any old capture sha (`7e356ac3`, `5ad8d891`, `f7830649`, etc.) or a stale finding statement; the only `no-runtime-typeof` mention is the correct line-79 "former finding replaced by an `in` narrowing". The placeholder bullet (lines 25-28) is explicitly qualified: materially less likely, not eliminated, content readiness a later slice.
2. **`launchChrome` spawn error — CLOSED.** `launchChrome` now attaches `child.on("error")`, clears the timeout, and rejects (`parity-selfcheck.mjs:327-332`); the catch kills the tracked child and rethrows (`:334-342`). The test (`parity-selfcheck.test.mjs:293-318`) injects the child/listener, invokes a spawn error, and asserts both rejection and `child.killed === true` — a behavioural assertion, not listener-presence only. The prior injected-launch FAILED-JSON test remains (`:276-291`).
3. **Placeholder/quiet claim — CLOSED as a mitigated, documented residual.** Runner comment `:346-352` now says the override makes a false placeholder PASS materially less likely but does **not** eliminate it; content readiness is later. `CAPTURE_OPTIONS` keeps `deadlineMs: PARITY_CAPTURE_DEFAULTS.deadlineMs` (15000) with `quietMs: 1200`/`stableCount: 3`; the primitive validates these options (`parity-capture.mjs:197-209`), so the lane is bounded and still fails at the deadline. No hang risk; false PASS materially less likely, not eliminated, matching the corrected doc bullet.

### Round-3 evidence

- `s294-red4.log`: 20 tests, the single new spawn-error test failed first (behavioural).
- `s294-green4.log`: 20/20 pass.
- `s294-real5.log`: real Chrome, exit 0 PASSED; React `4cf7b45cc545062b35a7925d2352ef66d710662b3e4f6b7fec98f2b6ec12059e`, Foldkit `9415dd97969c42ccb09414eddaf95e4a78c97baba3256baeb1baaa4817dc35d6`, both deterministic across run0/run1; `ignoredCount 4`; exe `0.0.20-231-gd61c32dc` sha `e3181d50…`; `tempRoot E:\rm-tmp`; both PNGs per target under the run evidence dir.
- Cross-round shas remain explained by per-invocation rendered endpoint ports: real5 React port 53731 and Foldkit port 53732 (per-target OS-assigned); images/log favicon URLs show them; builds predate the runs and the exe identity is unchanged, so this is neither a rebuild nor app nondeterminism.
- Anti-slop: re-ran on all three files — **clean**, 1 file each, 15 rules, no findings (the former `no-runtime-typeof` is gone).
- `git diff scripts/runtime-parity.mjs`: only the `--selfcheck` FAILED-JSON branch; `--request-selfcheck` remains byte-unchanged; invalid-mode unchanged. No 3456/3457/3458 strings in runner/real5 log; observed ports are ephemeral 53731/53732.

## FINAL VERDICT: PASS

All round-2 HOLD items are closed, the non-blocking placeholder note is correctly qualified, the TDD/real evidence is present, lint is clean, and wiring/safety hold for this S294 R14 runner slice. The previously stated scope limit remains: one route `/`, no full §6.5 scenario matrix or §6.4 mutation check; that is documented as a later slice, not a defect of this repair round.

No remaining numbered items. No product edits or commit by this reviewer.

