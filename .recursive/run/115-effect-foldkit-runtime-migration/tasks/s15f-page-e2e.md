# S15f end-to-end page mount over the real client (public, R21)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The page has an injected-reader seam and a real fetch client, but nothing connects them: the shell's default reader is deliberately not the client. Close that gap without performing network I/O in tests.

## Read first
1. `role-model-router/apps/runtime-ui-next/src/diagnostics-client.ts`, `mount.ts`, `app.ts` and `test/mount.test.ts`.
2. The read contract in `role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts`.

## Required work
1. An embedding entry (for example `mountWithDiagnostics(container, options)`) that wires the shell to the real client, with the client's fetch injectable so tests pass a stub. The shell's existing default stays as it is for the no-host tests - state how the two entries differ.
2. An end-to-end test that mounts through that entry with a stubbed fetch returning each server state (ok, empty, disabled, stale, dropped, 401, 403, transport failure) and asserts the RENDERED page matches - not just that the client returned a body.
3. Prove the wiring: removing the client injection or returning a fabricated body must fail the test.
4. State plainly that this is not a real HTTP test and what would still need a live server.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s15f-*` and `evidence/other/s15f-tdd.json`

No host changes, no wrappers, packages/ui, root, lockfile, vendor, or private repo.

## Strict TDD
One behavioural RED per state through the real mount. Report: the entry shape, the fetch injection, RED/GREEN, counts, typecheck, and what remains unproven.