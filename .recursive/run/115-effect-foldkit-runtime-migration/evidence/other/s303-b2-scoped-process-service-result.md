# S303 — B2/R22 completion result (scoped process service + SEA/Windows tree)

Task-19 (rev 2, completed). Model: deepseek-flash (verified live). Scope: ONLY
`role-model-router/packages/process-supervisor/**` + s303 evidence. No commit.

## Gap closure

| R22 criterion | Status | Evidence |
| --- | --- | --- |
| hung health (bounded) | proven before | health-wait-timeout.test.ts "rejects within startupTimeoutMs when the health peer accepts and never responds" |
| partial startup | proven before | s5b "a child that dies during startup surfaces the startup failure with stderr, not a readiness timeout" |
| repeated/concurrent stop | proven before | s5b "repeated and concurrent stops settle once, signal once, and resolve after deletion" |
| force escalation | proven before | index.test.ts "forces bounded shutdown when a vendor ignores the initial termination signal" + s5c repairs |
| scoped ownership (release-all, R27 rule) | **added** | `VendorScope` + `startScopedVendor` (src/index.ts); test "scope close runs every release in reverse order even when an earlier release rejects" |
| env/cwd/logs preservation through the scoped path | **added** | test "scoped vendor preserves env, cwd and logs, and close stops the child" (child writes env + cwd to a marker, log line captured) |
| Windows grandchild tree kill | **added** | windowsOnly test "stopping a scoped vendor kills its grandchild tree" (real parent + grandchild PIDs, both dead after close) |
| SEA supervision | **added** | test/s303-sea-leg.test.ts against the pinned sealed SEA (see identity below) |

## S303 scoped ownership

`VendorScope.close()` runs every registered release in reverse acquisition order even when an earlier release
rejects, then surfaces the combined failure as `AggregateError` — the R27 "a finalizer failure cannot skip later
releases" rule. `startScopedVendor(supervisor, scope, options)` is the acquire step and registers `vendor.stop()`
as the release. Plain-TS scoped pattern (no new dependency) because this package has no `effect` dependency and
installs are forbidden; the ownership semantics are the same as acquireRelease.

## TDD

- Controlled RED (`evidence/logs/s303-red.log`): with a naive sequential-release close (throws on the first
  failure, skipping later releases), the isolation test fails — `expected Error: second release failed to be an
  instance of AggregateError` (1 failed | 2 skipped). Robust close restored afterwards.
- GREEN (`evidence/logs/s303-green.log`): full package suite **6 files, 17 passed | 3 skipped (20)**, exit 0.
  The 3 skips are the pre-existing platform-gated tests (windowsOnly/POSIX-only), unchanged.
- The grandchild-tree test passed immediately with the existing `taskkill /T /F` path (no code change needed; the
  hazard was already handled, now behaviorally proven rather than assumed).

## SEA leg (pinned sealed package)

- candidate: `E:/role-model-run115/package-s293-public/role-model-router/dist/release/win32-x64/role-model-dev.exe`
- sha256 `d2bc6231f5b5751f4f0b8bc4a970a7593d27a63497b0f7bfa1e41d53beccd67b` (matches the reviewed pin d2bc6231…)
- size 104,880,640 bytes; manifest version `0.0.20-269-g35103383`
- spawned as the supervised process on an ephemeral loopback port with an E: state root
  (`E:\rm-tmp\s303-sea-state-*`), healthy in ~11.5 s, stopped in ~1.1 s; endpoint down after stop.
- evidence: `evidence/other/s303-sea-leg.json` (result PASSED). No package-sea or host change was needed.

## Lint

- `src/index.ts`: one pre-existing `no-unknown-parameters` finding at line 488 (the existing
  `stopPromise.catch((error: unknown))`), unchanged by this slice.
- Both new test files: clean (the shared allocatePort narrowing uses an `in` check; the manifest JSON cast has a
  SAFETY comment).

## Frozen hashes

- src/index.ts 23541 B 1F377E66AB37519BB4F3E7D3B05B717EB3946EDC9430929BEC708EFBD9AE1C30
- test/s303-scoped-service.test.ts 6847 B DC4CDF56FD58342406570F266FA765F0B1471129B989A9C2E127F2B0456B14B1
- test/s303-sea-leg.test.ts 4904 B 0548DD948A4BCC3DBCEF3CE2BB839738B00CFE0F7260F37620FE19BFE47C04C7
## S305 HOLD repair (3 items)

### 1. Acquire leak + concurrent-close join (src/index.ts)

- `startScopedVendor` now rolls the started vendor back when `scope.register` throws (closed/racing
  scope): the child is stopped before the registration error is re-thrown; a stop failure cannot mask the
  acquire reason. Red-first tests: "starting into a closed scope rolls the vendor back and kills the child"
  (previously the child stayed healthy and the endpoint kept answering) and "two concurrent closes join one
  teardown instead of returning early" (previously the second `close()` resolved in ~1 ms while the first
  teardown was still running).
- `VendorScope.close()` now stores one `closePromise` and returns it to every caller: concurrent closes join
  the single teardown, which never runs twice; the teardown sets `closed` synchronously before the first
  await so a racing `register` still throws and is rolled back by `startScopedVendor`.

### 2. SEA leg rigor (test/s303-sea-leg.test.ts)

- Asserts the pinned identity instead of only recording it: sha256
  `d2bc6231f5b5751f4f0b8bc4a970a7593d27a63497b0f7bfa1e41d53beccd67b`, size `104880640`, manifest version
  `0.0.20-269-g35103383`.
- Enforces the temp root drive: `rootOnDrive(os.tmpdir(), REQUIRED_TEMP_DRIVE)` fails fast; default drive
  `E:`, overridable via `S303_REQUIRED_TEMP_DRIVE`; a pure test covers E:/backslash-E:/C: cases.
- Gate corrected to **win32 only** (`win32Only`) — the candidate is a Windows .exe; the previous
  win32+linux+darwin gate was wrong.

### 3. R22 token/loopback disposition (no silent omission)

Positive preservation through the scoped path: the scoped env/cwd/logs test now passes
`S303_TOKEN=token-s303` to the child and asserts the child observed `token=token-s303` in its environment,
with readiness served on `127.0.0.1` (loopback) and the health URL asserted loopback. R22 token/loopback is
therefore **proven positively**, not PARTIAL.

### S305 RED/GREEN

- RED (`s303-red2.log`): 7 tests, **2 failed | 5 passed** — closed-scope rollback leaked (endpoint still up
  after the 10 s wait) and the concurrent-close join resolved in 1 ms.
- GREEN (`s303-green2.log`): full package suite **6 files, 20 passed | 3 skipped (23)**, exit 0.

### S305 final hashes

- src/index.ts 24109 B `25428D1D9286C848CD231A3519F09E444619552C129E628B70BEFF6F38484740`
- test/s303-scoped-service.test.ts 8934 B `7950AE3A6589676CE089CC023BC28751575150DD2E3959A8C56ECD8B9F123E3F`
- test/s303-sea-leg.test.ts 5999 B `79D23F15B0B9F4A764C5E3DDA2F526FFB3ABD663C455B411E2CB53A9F65649C7`

Lint: unchanged — src/index.ts keeps the pre-existing `no-unknown-parameters` at line 488; both test files
clean.
## S305 round-2 repair (3 items)

### 1. Rollback stop failure is surfaced (src/index.ts:719-733)

`startScopedVendor` no longer swallows the rollback stop failure. When `scope.register` throws it stops the
vendor; if that stop rejects, it throws
`AggregateError([registerError, stopError], "VendorScope acquire rollback failed: register error and stop failure")`,
so a rejecting stop can never leave the child alive behind the acquire error. RED-first test: "a rejecting stop
during the rollback is surfaced, never swallowed" — on the old code the rejection was the plain register error
(not `AggregateError`); now it is an `AggregateError` with both errors and the injected stop was called.

### 2. Loopback assertion is real (test/s303-scoped-service.test.ts)

The tautological `url ?? "http://127.0.0.1:…" toBeDefined()` is gone. The scoped test now parses the health URL
and asserts `hostname === "127.0.0.1"`, membership in the loopback set, and `vendor.port === port` (the actual
port the supervisor bound). Doc claim corrected to "loopback asserted on the parsed URL/host and bound port".

### 3. Suite hermeticity (test/s303-sea-leg.test.ts)

The SEA leg no longer trips the E: fail-fast under a default TMP. It keeps the ambient root when it is on the
required drive; otherwise it creates the state root deterministically AT the required drive root
(`E:/s303-sea-state-*`). If that drive is unavailable and no `S303_REQUIRED_TEMP_DRIVE` override is set, the
test skips cleanly with a recorded `console.warn` reason naming the ambient root, the required drive and the
override. **E: prerequisite stated:** the SEA leg needs E: (or an override) for its state root.

### S305 round-2 RED/GREEN (both TMP conditions)

- RED (`s303-red3.log`, TMP/TEMP=D:\DEV\dsh-temp): 24 tests, **1 failed | 20 passed | 3 skipped** — the
  swallowed stop failure surfaced only the register error.
- GREEN (`s303-green3.log`): full suite exit 0 BOTH with TMP/TEMP=E:\rm-tmp and with
  TMP/TEMP=D:\DEV\dsh-temp (20 passed | 3 skipped + 1 skipped SEA drive case? no: same 20 passed | 3 skipped,
  the SEA leg ran on E: in both).

### Round-2 final hashes (lint-clean final bytes)

- src/index.ts 24349 B `EEA23FBA8076A9F860D205D3F3AFA67491539F3633DA39205268B5EB08B20A20`
- test/s303-scoped-service.test.ts 10419 B `4089A986897BE7ADAA292FB443BF22955358B3651360DE1E9521BCE03948CDF8`
- test/s303-sea-leg.test.ts 6672 B `16534BB621433D972E038E1D82B5BA946EE66D3FFABE245E2EEA7F884A65F0BB`

Round-2 GREEN both env conditions: full suite exit 0 with TMP/TEMP=E:\rm-tmp and with
TMP/TEMP=D:\DEV\dsh-temp, **21 passed | 3 skipped (24)** in each (the SEA leg ran on an explicit E: state root
in both). The injected stop-failure test uses an instance method override instead of a supervisor cast, so the
scoped test file is finally lint-clean; src/index.ts keeps the pre-existing `no-unknown-parameters` (line 488).

E: prerequisite: the SEA leg needs the E: drive for its explicit state root (or a S303_REQUIRED_TEMP_DRIVE
override); it skips cleanly with a recorded reason when neither is available.