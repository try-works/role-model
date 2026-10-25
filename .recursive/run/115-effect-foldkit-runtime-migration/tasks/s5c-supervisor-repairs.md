# S5c repair the supervisor's escalation races and bounds (public, R22)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review put S5b on HOLD with three code-level defects and two evidence gaps. Fix the code; do not restate the defects as known issues.

## Fix 1 - double-signal race
`stopVendorOnce`'s escalation check reads only `child.exitCode`, which stays null until the 'exit' event is delivered. A child that exits on SIGTERM but whose event lands after the sleep wins the race records `escapedGraceful` and can send SIGKILL to an already-exited child (wrong trace, PID-reuse risk). Treat `record.exitInfo !== null` (or an equivalent exited flag set on the exit event) as exited BEFORE escalating. Add a test with `shutdownTimeoutMs` very small and a prompt child that asserts no SIGKILL is ever recorded across repeated runs.

## Fix 2 - pin the escalation bound and the prompt bound
`shutdownTimeoutMs=150` but the assertion is only `escalatedAfterMs >= 100`, so `sleep(100)` passes; and the prompt test asserts only trace fields, so 'wait the whole bound then do not escalate' passes. Assert `escalatedAfterMs >= shutdownTimeoutMs` (small timer slack allowed and stated) and, for the prompt case, assert elapsed < shutdownTimeoutMs. Keep these POSIX tests skipped on Windows but make the assertions correct for the platform where they run.

## Fix 3 - the Windows force-only stop has no bound
After `taskkill` the code awaits `record.stopDeferred` with no timeout, so a denied or failed taskkill on a live child hangs forever. Add a bounded wait with a typed rejection (or force-fail outcome) and a test that simulates taskkill failure (a stub or an injected runner) asserting the stop rejects within the bound rather than hanging.

## Evidence gaps to record, not fix here
- The escalation schedule is skipped on this Windows host; say so in the evidence as a platform-limited claim.
- R22 also names SEA tests; there is no SEA evidence in this slice. Record that explicitly as not covered.

## Files you may write
- `role-model-router/packages/process-supervisor/src/index.ts` and new/extended tests under its `test/`
- `evidence/logs/s5c-*` and `evidence/other/s5c-tdd.json`

No other files. No installs, no commits, no subagents; never bind 3456/3457/3458.

## Rules
Mutation-first for fixes 1-3 where a mutation is expressible; the double-signal test should run the prompt case enough times to be meaningful without flaking. Report per-fix RED/GREEN, the slack you allow, counts and tsc.