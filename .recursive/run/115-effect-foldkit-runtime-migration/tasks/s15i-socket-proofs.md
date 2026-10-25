# S15i make the live-socket proofs mutation-proof (public, R21)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The socket proofs are real but six mutations still pass. Close them.

## Fixes
1. OWNER CLAIMS: send ALL three forbidden headers (x-role-model-device-owner, x-role-model-owner, x-role-model-trusted-peer) plus an untrusted-peer variant; removing any one from the forbidden list must fail.
2. CREDENTIAL COMPARISON: use a wrong token of the SAME length as the configured one; a length-only comparison must fail.
3. CORS COVERAGE: trigger the statuses the current scan misses - a 500 (unhandled bridge error), an OPTIONS preflight, a context-mismatch 403 and a 404 - and assert no access-control header on each. Scope the claim to what is proven.
4. LISTENER LEAK: after close, assert a fetch to the closed port REFUSES (proving the listener is gone); and assert no temp dir remains after the suite. A close() that resolves without closing must fail.
5. PORT ASSERTION: assert the port option passed was 0 (or that the bound port is outside the operator set by construction), so binding a fixed port 8080 fails.
6. WORDING: the test title claiming the owner header is 'rejected before authorization' is false end to end - the generic gate authorizes the loopback request and the handler 403s. Correct the title and the evidence wording.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/test/s15h-live-socket-diagnostics.test.ts`
- `evidence/logs/s15i-*` and `evidence/other/s15i-tdd.json`

No product changes unless a 500/404/OPTIONS path genuinely cannot be triggered without one; if so, say exactly why and cover what you can.

## Rules
Mutation-first for fixes 1-5: apply the mutation, capture the RED, restore. No installs, no commits, no subagents; never bind 3456/3457/3458.
Report: per-mutation RED/GREEN, the corrected wording, counts, typecheck, and what remains unprovable.