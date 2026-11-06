# S303 — B2/R22 gap table and completion decision (recorded BEFORE implementation)

Task-19 (rev 2, in_progress, owner s5-health-wait). Model: deepseek-flash (verified live). Scope: ONLY
`role-model-router/packages/process-supervisor/**` + `s303` evidence paths. No commit.

## R22 acceptance (00-requirements.md:207-212)

> Scope process/stdio/readiness/health/restart/exit preserving env/cwd/logs/SEA/token/loopback; hung
> health/partial startup/repeated stop/Windows grandchild/force escalation and SEA tests.

## Gap table (existing 4 test files vs R22)

| R22 criterion | Proven today | Where | Gap |
| --- | --- | --- | --- |
| readiness/health | yes | health-wait-timeout.test.ts "rejects within startupTimeoutMs when the health peer accepts and never responds", "becomes healthy when a responsive endpoint replies after about 200ms", "stops polling after a health timeout and shuts down cleanly" | — |
| hung health | yes (bounded) | same file: accept-and-never-respond bounded rejection | — |
| restart/exit | yes | index.test.ts "tracks crash callbacks when a managed vendor exits unexpectedly", "captures child logs and restarts an unexpectedly crashed vendor with backoff" | — |
| partial startup | yes | s5b-process-lifecycle.test.ts "a child that dies during startup surfaces the startup failure with stderr, not a readiness timeout" | — |
| repeated stop | yes | s5b: "repeated and concurrent stops settle once, signal once, and resolve after deletion" | — |
| force escalation | yes | index.test.ts "forces bounded shutdown when a vendor ignores the initial termination signal"; s5c repairs | — |
| env preservation | partial | index.test.ts "can run supervised vendors without inheriting provider credential variables" (negative only) | positive env/cwd/logs preservation through the scoped path |
| cwd/stdio/logs | partial | logs captured in restart test | no assertion that a scoped child's cwd + custom env + log lines survive |
| token/loopback | partial | tests use 127.0.0.1 ephemeral ports | no explicit loopback assertion / no SEA process |
| scoped resource ownership | **missing** | — | stop/finalizer ownership is a class method; no scope whose release-all runs every release even when an earlier release fails (R27 rule) |
| Windows grandchild kill tree | **missing** | taskkill /T /F is used (index.ts:335-345) | no behavioral test that a real grandchild dies with the supervised child |
| SEA test | **missing** | — | no test spawns the packaged SEA as a supervised process |

## Decision

1. Add `VendorScope` + `startScopedVendor` (scoped pattern; releases run in reverse order, every release runs
   even if an earlier one rejects, failures surfaced as AggregateError afterwards). No new dependency.
2. Add `test/s303-scoped-service.test.ts`: scope isolation; scoped env/cwd/logs preservation; Windows
   grandchild tree kill (real processes, bounded existence polls).
3. Add `test/s303-sea-leg.test.ts`: spawn the pinned sealed SEA
   `E:/role-model-run115/package-s293-public/role-model-router/dist/release/win32-x64/role-model-dev.exe`
   (0.0.20-269-g35103383, sha d2bc6231…) as the supervised process on an ephemeral loopback port with an E:
   state root, assert healthy → stop → endpoint down, record exe identity (size + sha256 + manifest version) in
   `evidence/other/s303-sea-leg.json`. If the SEA leg needs a package-sea/host change, STOP and characterize.
4. Do not touch index.ts/cli.ts or other packages (B6 serialization); preserve env/cwd/logs/SEA/token/loopback
   semantics byte-for-behavior.
## Completion outcome (GREEN)

- `VendorScope` + `startScopedVendor` added; controlled RED on a naive sequential close (s303-red.log:
  1 failed | 2 skipped) -> full suite GREEN (s303-green.log: 17 passed | 3 skipped, 6 files).
- New tests: scope release isolation; scoped env/cwd/logs preservation; Windows grandchild tree kill; SEA leg.
- SEA leg PASSED against the pinned sealed exe (sha256 d2bc6231…, version 0.0.20-269-g35103383, size
  104,880,640; healthy ~11.5 s, stop ~1.1 s; evidence/other/s303-sea-leg.json). No host/package-sea change.
- No files outside packages/process-supervisor + s303 evidence were touched; no commit.
## S305 repair (3 items)

1. `startScopedVendor` rollback on closed/racing scope (child stopped before the error is re-thrown);
   `VendorScope.close()` shares one teardown promise so concurrent closes join and never double-teardown.
2. SEA leg asserts the pinned identity (sha256 d2bc6231…, version 0.0.20-269-g35103383, size 104880640),
   enforces the E: temp drive (overridable via S303_REQUIRED_TEMP_DRIVE) and is gated win32-only.
3. R22 token/loopback proven positively through the scoped path (S303_TOKEN observed by the child; loopback
   readiness + loopback health URL). No PARTIAL omission.

RED s303-red2.log: 2 failed | 5 passed -> GREEN s303-green2.log: 20 passed | 3 skipped (23).
Final hashes: src/index.ts 25428D1D…, scoped test 7950AE3A…, SEA test 79D23F15….
