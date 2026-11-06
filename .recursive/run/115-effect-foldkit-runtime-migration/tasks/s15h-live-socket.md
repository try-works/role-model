# S15h live-socket diagnostics proof (public, R21)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Every diagnostics test so far runs against a stub. R21's biggest remaining gap is that no real socket has exercised `authorizeOperatorRequest`, the read route, or the CORS refusal. Prove it on an EPHEMERAL loopback port in-process.

## Read first
1. `role-model-router/apps/runtime-host-bridge/src/index.ts` around `startBridgeServer` for the options that control host/port/state root and whether port 0 is supported.
2. `src/local-diagnostics-read.ts` and the diagnostics route region.
3. The existing tests that already start an ephemeral server in-process (search for `port: 0` or `listen(0)`) - reuse that pattern if it exists.

## Required work
1. Start the bridge in-process on 127.0.0.1 with port 0 (ephemeral) and a temp state root under E: or the repo test-temp override. NEVER bind 3456/3457/3458 and never touch operator state.
2. Prove over the socket: (a) a token-less loopback read returns the disabled state when no writer is enabled; (b) a read with a wrong/missing credential from a non-loopback path is refused (or, if loopback makes that impossible, say so and prove the credential path instead); (c) no `access-control-*` header is present on the response, including on an error status; (d) a spoofed owner-claim header is rejected.
3. If any of these cannot be proven on a real socket without changing product code, report exactly which and why - do not simulate it and call it proven.

## Files you may write
- one new test file under the host-bridge test directory
- `evidence/logs/s15h-*` and `evidence/other/s15h-tdd.json`

NO product changes unless a test-only option is genuinely missing; if you add one, it must be inert in production and you must say so.

## Rules
No installs, no commits, no subagents. Every server must be closed and every temp dir removed; a leaked listener or dir fails the slice.
Report: the exact bind, the four proofs, any refusal, counts, typecheck, and what this still cannot prove (CORS in a real browser, TLS, deployed assets).