# S5 process-supervisor health wait must be bounded (R22)

Phase3. Locked plan 02 hash f79220f7. Requirement R22, source §7.1 / §17 B5. Baseline public f0d50fab.

## Defect (controller-verified source)
`role-model-router/packages/process-supervisor/src/index.ts:106-145` — `waitForHealth` computes a deadline, then `await fetch(url)` at line 126 with no AbortSignal and no race. A peer that accepts the TCP connection and never responds makes the await unbounded, so `startupTimeoutMs` is not enforced. Deadline is only re-checked between polls.

## Required contract
1. `waitForHealth` must reject with the existing timeout error message (`did not become healthy before startup timed out`) within `startupTimeoutMs` plus at most ~250 ms of slack, even when the HTTP peer accepts and never responds.
2. The bound must NOT depend on the fetch implementation honouring cancellation: race the request against a deadline timer AND pass an `AbortSignal` so real fetch work is cancelled.
3. On timeout or early return, clear timers and abort the controller; no dangling timer, socket or unhandled rejection.
4. Preserve all existing behaviour: no `healthCheckUrl` => immediately healthy; child exitCode !== null => `exited before becoming healthy`; non-ok response => keep polling; ok => healthy with `exitCode: undefined`; `startupPending`/stop-deferral semantics unchanged.
5. Keep the public `ProcessSupervisor` API and its option shape unchanged. Do not add options.

## Files you may write (exactly)
- `role-model-router/packages/process-supervisor/src/index.ts`
- `role-model-router/packages/process-supervisor/test/health-wait-timeout.test.ts` (new)
- run evidence under `.recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s5-*.log` and `evidence/other/s5-tdd.json`

Do not touch any other file: no package.json, no tsconfig, no root/lockfile/CI, no private repo, no other package, no phase artifacts.

## Strict TDD sequence
1. Write the new test file FIRST against current source.
2. RED: run it and capture the failing log at `.recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s5-red.log`. Baseline failure must be a real hang/timeout or assertion failure on the defect, not a missing module.
3. Only then edit `src/index.ts`.
4. GREEN: same test file passes; capture `s5-green.log`.
5. Typecheck: from the package directory run `node ../../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`; capture `s5-tsc.log`.
6. Re-run the existing suite `node ../../../node_modules/vitest/vitest.mjs run` in the same package to prove no regression; capture `s5-existing.log`.

## Test design constraints
- Use a real `node:net` server that accepts connections and never writes a response (a genuinely hanging peer). No module mocks, no `vi.mock`, no monkeypatching global fetch.
- Real child process: `process.execPath` with `["-e", "setInterval(()=>{},1000)"]`, `windowsHide` behaviour left to the supervisor.
- Assert the rejection message matches `/did not become healthy before startup timed out/i` and that elapsed wall time is under `startupTimeoutMs + 1500` (generous CI slack) while the baseline hangs.
- Add a regression test that an endpoint replying ok after ~200 ms still becomes healthy with `startupTimeoutMs: 2000`.
- Add a test that after a timeout rejection, `await supervisor.shutdown()` completes and no further polling occurs (assert the net server saw no new connections for ~300 ms after shutdown).
- Clean up: close the net server and remove temp state root in `finally`/`afterEach`.

## Evidence JSON (`evidence/other/s5-tdd.json`)
Include: slice, task path, tddMode strict, red log path + exit + failure summary, green log path + exit, tsc log + exit, existing-suite log + exit + counts, changedFiles, final source/test sha256, and an honest limitations note.

## Reporting
Report: exact commands, exits, test counts, the failure message observed at RED, the bounded-duration measurement, sha256 of both files, and anything you could not verify. Do not claim R22 satisfied beyond this bounding contract, and do not claim any backend/B0-B10 completion.
