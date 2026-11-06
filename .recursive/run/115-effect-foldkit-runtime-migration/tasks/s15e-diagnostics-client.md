# S15e diagnostics client wiring for the page (public, R21)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The page consumes an injected reader, so the real request path (URL, credential handling, error/status mapping, abort) is unproven. Build the fetch-based reader with tests against a stub - no server.

## Read first
1. `role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts` for the response contract and states.
2. `role-model-router/apps/runtime-ui-next/src/diagnostics.ts` and `commands.ts` for how the reader is consumed and what it must return.
3. The host's authorization shape (read-credential bearer, loopback/Host/Origin rules) so the client sends what the server expects - read `authorizeOperatorRequest` in index.ts.

## Required work
1. A `diagnosticsClient` module in the client app that performs the authorized read: builds the URL, attaches the credential the server expects, sends no spoofable owner headers, forwards an AbortSignal into `fetch`, and maps HTTP status to the page's states (200 ok/empty/disabled/stale/dropped, 401 denied, 403 rejected, transport error).
2. Tests against a fetch stub: correct URL and headers, credential present, no forbidden header sent, 200 states passed through unchanged, 401 vs 403 distinguished, transport rejection surfaced, and abort propagated into the fetch call (the stub observes the signal).
3. State the origin assumption explicitly: same-origin, no CORS, and what would have to change if the page were served elsewhere.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s15e-*` and `evidence/other/s15e-tdd.json`

Do not touch the host, the read contract, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
One behavioural RED per numbered item. Report: the header/credential shape you matched, the status mapping, RED/GREEN, counts, typecheck, and the origin assumption.