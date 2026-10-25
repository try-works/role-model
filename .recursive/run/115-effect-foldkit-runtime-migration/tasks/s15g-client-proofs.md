# S15g close the diagnostics client proof gaps (public, R21)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review put S15e/S15f on HOLD with four concrete bypasses. Fix them; do not restate them as documented assumptions.

## Fix 1 - the e2e does not prove the real client is used
Replace `createDiagnosticsClient(...)` inside `mountWithDiagnostics` with an inline fetch reader and the e2e still passes 8/8. Assert the real construction: spy on `createDiagnosticsClient` (or expose the reader identity) and assert it is called with the injected `fetchImpl`/`baseUrl`/`token`, and that the mounted reader is that instance. The bypass must fail.

## Fix 2 - the abort test is object-shape only
It awaits an already-resolved stub and then aborts. Add a fetch stub that settles ONLY on abort, run the read under `Effect.timeout`, and assert the in-flight fetch observes the abort - the same proof shape accepted for the SSE and transport work. A client that forwards the signal without tying it to the fetch lifecycle must fail.

## Fix 3 - the origin claim is untested
Either prove the same-origin assumption or demote it. Concretely: the tests use `baseUrl` http://127.0.0.1:3458 while the happy-dom page origin differs, so the request is cross-origin in browser terms and a stub cannot see it. Add an explicit refusal or warning when a token-less client is asked to read a non-loopback or non-same-origin base URL, and test it; and record the CORS/preflight behaviour as unproven-by-this-suite rather than implied.

## Fix 4 - the token-less default breaks when loopback trust is unavailable
With `host: 0.0.0.0` or device-owner trust off, a token-less same-origin read returns 401. Make that explicit in the client contract (an error/warning path or a documented precondition the tests assert), rather than letting it fail opaquely.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s15g-*` and `evidence/other/s15g-tdd.json`

No host changes, no wrappers, packages/ui, root, lockfile, vendor, or private repo.

## Rules
Mutation-first for fixes 1 and 2. No installs, no commits, no subagents.
Report: each fix with its failing input, RED/GREEN, counts, typecheck, and the exact wording you settled on for the origin and precondition claims.