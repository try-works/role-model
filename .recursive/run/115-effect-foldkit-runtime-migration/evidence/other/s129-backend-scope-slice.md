# S129 R27 second rewiring slice: the non-packaged backend is scope-owned

Same shape as S128, applied to the `backend` branch of the packaged/non-packaged fork.

## Change

```ts
const backendScope = Effect.runSync(Scope.make());
try {
  backend = await Effect.runPromise(
    Scope.provide(
      Effect.acquireRelease(
        Effect.promise(() => createBackend()),
        (value) => Effect.promise(() => value.shutdown()),
      ),
      backendScope,
    ),
  );
} catch (error) {
  await Effect.runPromise(Scope.close(backendScope, Exit.void)).catch(() => undefined);
  throw error;
}
hostScope.register("backend", async () => { await Effect.runPromise(Scope.close(backendScope, Exit.void)); });
```

Shutdown chain unchanged: `releaseHostResources` -> closer -> scope close -> finalizer `backend.shutdown()` exactly once.

## Verified

**Source smoke** (exercises this branch, since the source run has no packaged distribution):

```
version=0.0.20-123-ga7639b3e-dirty
PASS health / models (3) / endpoints (3) / ui shell (4945 bytes)   exit=0
```

CLI-adjacent suites: s128 (3) + s120 (3) + release-host-resources (7) + cli-composition-scope (7) + cli-startup-readiness + s127 (4) - all green, `tsc` 0.

## Precision about what is NOT covered

The **packaged branch** (`packagedRuntime`) is still imperative: its acquisition is a 150-line call and converting it to a thunk is mechanical but error-prone with text edits, so I left it. That means the branch exercised by the packaged artifact is **unchanged**, and the branch exercised by the source smoke is the one that moved.

## R27 tally

| Resource | Ownership |
|---|---|
| server | **Effect scope** (S128) |
| backend (non-packaged) | **Effect scope** (S129) |
| packagedRuntime | imperative |
| extensionRuntimeOwner | imperative |
| extensionRuntime | imperative, delegates to owner close |

Two of five. Still not a closed DAG: the resources are scope-owned individually but there is no single composition Layer providing them together, and no test that fails if a resource reverts to imperative ownership.