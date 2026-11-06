# S5b process lifecycle: repeated stop, force escalation, grandchild (public, R22)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R22 requires the supervisor to preserve env/cwd/logs/SEA/token/loopback scope while handling hung health, partial startup, repeated stop, a Windows grandchild and force escalation. The bounded health wait already landed; this slice takes the damage paths.

## Read first
1. `00-requirements.md` R22 (lines 207-213).
2. `role-model-router/packages/process-supervisor/src/index.ts` and its existing `test/health-wait-timeout.test.ts`.
3. The accepted S5 evidence so you do not re-litigate the health deadline.

## Required work
1. REPEATED STOP is idempotent: stopping an already-stopped process resolves rather than throwing, and two concurrent stops settle once. Both must be tested; a second stop that re-signals or throws is a defect.
2. FORCE ESCALATION: a process that ignores a graceful stop is escalated after the bound, and the escalation is observable (which signal, after how long). A process that exits promptly on the graceful path must NOT be escalated - assert the absence of escalation, not just the presence.
3. WINDOWS GRANDCHILD: a supervised child that itself spawns a child must not leave the grandchild running after stop. On Windows this needs a real job object or an equivalent; prove it by spawning a script that starts a long-lived grandchild, stopping the supervisor, and asserting the grandchild is gone. If the current implementation cannot do this, report the gap with the exact limitation rather than writing a test that only checks the direct child.
4. PARTIAL STARTUP: a child that exits during startup must surface a startup failure with the captured stderr, not a readiness timeout. Assert the distinction between those two outcomes.

## Files you may write
- `role-model-router/packages/process-supervisor/src/index.ts` and new tests under its `test/`
- `evidence/logs/s5b-*` and `evidence/other/s5b-tdd.json`

Do not touch the host app, queue runtime, diagnostics, client, wrappers, root, lockfile, vendor, or the private repo. Do not start the operator runtime or bind 3456/3457/3458; use short-lived node scripts as children and temp dirs on E:.

## Strict TDD
One behavioural RED per numbered item. Report: the signal/escalation schedule, the grandchild mechanism you used (and its Windows limits), the partial-startup distinction, RED/GREEN, counts and typecheck.