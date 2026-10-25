# S26h clear the stale banner on a successful refetch and harden the ties (public, R13/R12)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review found three real defects. Fix them before more routes are added.

## Defect A - stale banner survives a successful gap refetch
After revisions `1 -> 3` the gap branch sets `refresh.status = "stale"` and dispatches the read; when `ObservabilityLoaded`/`ReadbackLoaded` arrives it updates data only and never clears refresh. Failing input: mount `/observe/observability-snapshot`, emit 1 then 3, wait for fetch 3 and `data-readback-state=ok` - the shell still shows `data-refresh-state=stale`. Fix: a successful refetch for the current route clears the gap-stale state (and only that state); a failure keeps it. Add the assertion for observability AND each readback route.

## Defect B - the host tie is a substring search
`s26f` asserts the host source `includes(endpoint)`, so deleting the handler while leaving the literal in a comment keeps it green. Fix: parse the host's route registrations (the actual handler/route table, not free text) and require a registered route, or move the paths into a shared module the host also imports so there is one definition. Prove it: removing the handler registration fails even when the literal remains in a comment.

## Defect C - no token discovery and untested readback token
The legacy page read the operator token from storage; the new default entry provisions none unless passed, so an option-less default mount 401s on a token-required host. Fix: either implement the same explicit discovery the legacy client had (and test it), or make the absence explicit in the UI (a clear precondition message) - do not leave a silent 401. Also test that `readbackToken` actually reaches the readback clients.

## Also close
- cover 401/403 on the READBACK routes (the shared error formatter drops the reason);
- distinguish an invalid 200 body from an empty result: `{}` must not render as empty when the contract requires a field; add invalid-body tests per route.

## Files you may write
`apps/runtime-ui-next/src/**`, its tests, inventory/drift test if needed; `evidence/logs/s26h-*`; `evidence/other/s26h-tdd.json`.

No legacy app changes beyond reading, no host changes unless the shared path module requires one (say so), no ECharts, no packaging, no installs, no commits, no subagents.

## Strict TDD
RED for A, B and C first. Report: how stale clears, the parsed-registration tie, the token decision, RED/GREEN per defect, counts, typecheck.