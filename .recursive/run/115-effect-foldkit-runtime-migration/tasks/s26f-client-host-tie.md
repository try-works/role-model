# S26f tie the read client to the host and refetch on gap (public, R13/R12)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The S26d review found three real defects in the first wave-2 port. Fix them before the batch continues.

## Defect A - the path constant is not tied to the host
Changing `OBSERVABILITY_CLIENT_PATH` to a bogus path, or deleting the host handler, keeps every test and the inventory 'verified' gate green while the real page 404s. Fix: source the path from a shared definition the host also uses, or add a check that the path exists in the host route table (parsed, not hardcoded twice). Prove it: a bogus path must fail.

## Defect B - a revision gap leaves the page stale with no refetch
On a gap, `update` dispatches only the diagnostics resync; the observability page keeps old rows and shows stale. A test emitting revisions `1 -> 3` on the observability route must show a REFETCH (fetch count 2) and fresh data, not just a stale banner. Prove the current behaviour fails first.

## Defect C - the default wiring never provisions a token
`createShellApp` builds the client with no token and `ShellOptions` exposes no token/baseUrl, while the legacy page read the operator token from storage. On a non-loopback or trust-off host the new page 401s where legacy rendered metrics. Fix: expose token/baseUrl on the shell options and pass them through, with a test that the DEFAULT wiring (no injected reader) sends the bearer when a token is provisioned. A test must fail if the default drops the token.

## Also close
- assert `aria-busy` in the loading state (the evidence claims it, the test does not);
- map 401 and 403 to their own phrases rather than one generic error, or state why the host makes them indistinguishable here;
- give the inventory row non-vacuous endpoint correlation (either list the endpoints it uses or extend the drift test so an empty list cannot mean 'unchecked').

## Files you may write
- `apps/runtime-ui-next/src/**`, its tests, the inventory row, and the drift test if needed
- `evidence/logs/s26f-*` and `evidence/other/s26f-tdd.json`

No legacy app changes beyond reading, no host changes unless the shared path definition requires one (say so), no ECharts, no packaging. No installs, no commits, no subagents.

## Strict TDD
RED for A, B and C first - they are failing inputs today. Report: the shared path source, the gap refetch, the default token wiring, per-mutation RED/GREEN, counts and typecheck.