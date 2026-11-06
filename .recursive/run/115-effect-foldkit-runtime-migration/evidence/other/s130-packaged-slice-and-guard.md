# S130 R27 third slice (packaged runtime) + the guard that keeps the slices honest

## Guard first

`test/s130-scope-ownership-guard.test.ts` (3/3) makes the slices regression-proof at the source level:

- `hostScope.register("server"` body must call `Scope.close(serverScope` and must **not** call `server.close()` directly;
- `hostScope.register("backend"` body must call `Scope.close(backendScope` and must **not** call `backend.shutdown()`;
- at least two `Effect.acquireRelease(` sites, no bare `backend = await createBackend()`, and the server is acquired through `Effect.runPromise(`.

Without this, a later edit could quietly revert to imperative ownership and every behavioural test would still pass.

## Packaged runtime slice

`packagedRuntime = await createPackagedProductionRuntime({...})` became an `Effect.acquireRelease` provided to a `packagedScope`, with the registration closing that scope. The call spans ~150 lines, so the edit was made by **matching the call parentheses programmatically** rather than by eye - a text edit on that span is how a silent argument loss would happen.

`tsc` 0; CLI-adjacent suites 26 passed.

## What is verified, and what is not

Verified: the non-packaged branch (source smoke, PASS 4/4) and the server path.

**Not verified: the packaged branch at runtime.** `packagedProfile = readPackagedRuntimeProfile(process.execPath)` reads from the executable path, and in a source run `process.execPath` is `node.exe`, so the packaged branch is unreachable from source by construction. `packagedReleaseId` (which gates it at `cli.ts:12261`) also only exists for a packaged release.

So S130 is a **mechanical, type-checked** change to the packaged branch that no runtime test in this round executed. The only honest ways to close that gap are a SEA repackage + the packaged candidate gate, which is the next step; until then the requirement stays blocked and this note stays in the evidence.