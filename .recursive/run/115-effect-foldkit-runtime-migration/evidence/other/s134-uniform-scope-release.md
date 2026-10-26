# S134 R27 fifth slice: the release path is now uniformly scope-based

## Change

The `extensionRuntime` registration closes the **owner scope** rather than calling `extensionRuntimeOwner.close()`:

```ts
hostScope.register("extensionRuntime", async () => {
  await Effect.runPromise(Scope.close(extensionOwnerScope, Exit.void));
});
```

Both registrations now target the same scope; `Scope.close` is idempotent, so the owner's memoized close still runs exactly once (the S124 property, unchanged).

## The property this buys

Every host resource is now released the same way:

```
releaseHostResources -> hostScope registration -> Scope.close -> acquireRelease/addFinalizer finalizer
```

`test/s134-all-resources-scope-closed.test.ts` pins it: the five contracted kinds are registered, **every** registration body contains `Scope.close(`, and **none** calls `server.close()` / `backend.shutdown()` / `packagedRuntime.close()` / `extensionRuntime.close()` directly.

That is the difference between "five edits that happen to look alike" and "one release mechanism with five participants" - the second is what R27 asks for, and it is now enforced.

## Verified

- `tsc` 0
- s130 (5) + s128 (3) + s124 (2) + s120 (3) = **13 passed**; s134 **2 passed**
- source smoke **PASS 4/4** (`0.0.20-129-gacb6d918-dirty`)

## What R27 still lacks

The resources share a release mechanism and each is scope-owned, but they are still **acquired imperatively in one long function** rather than composed by a Layer that provides them together. The "closed shared-leaf Layer DAG" is the part that remains, and it is a structural rewrite of `cli.ts`, not another slice.

Runtime verification still covers only the server and non-packaged backend slices; the packaged and extension slices live behind the stage-only `packagedReleaseId` branch.