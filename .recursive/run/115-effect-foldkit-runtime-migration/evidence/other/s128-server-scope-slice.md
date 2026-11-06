# S128 R27 first rewiring slice: the server is owned by an Effect Scope

The smoke gate from S127 made this finally executable, so I took the smallest real slice: **one resource, no behaviour change, verified end to end.**

## What changed in `cli.ts`

Before: `server = await startBridgeServer(...)` then `hostScope.register("server", () => server.close())`.

After: the same `startBridgeServer` call is the **acquire** of an `Effect.acquireRelease` provided to a `Scope`; the registered closer closes that scope, so the shutdown call chain is unchanged (`releaseHostResources` -> scope close -> finalizer -> `server.close()`).

```ts
const serverScope = Effect.runSync(Scope.make());
startedServer = await Effect.runPromise(
  Scope.provide(
    Effect.acquireRelease(
      Effect.promise(() => startServer()),
      (value) => Effect.promise(() => value.close()),
    ),
    serverScope,
  ),
);
hostScope.register("server", async () => { await Effect.runPromise(Scope.close(serverScope, Exit.void)); });
```

If acquisition fails, the scope is closed before rethrowing, so a failed bind cannot leave a scope behind.

## Verified

**Source smoke** - the host serves from the working tree after the change:

```
version=0.0.20-122-ge60d0523-dirty
PASS health / models (3) / endpoints (3) / ui shell (4945 bytes)   exit=0
```

**Tests** - new `test/s128-scope-owned-server.test.ts` pins what the CLI now relies on: the finalizer runs **exactly once** even if the scope is closed twice; a failing finalizer **surfaces** (so `releaseHostResources` can report it); a failed acquisition releases **nothing**.

With s120, release-host-resources, cli-composition-scope: **20 passed**; CLI-adjacent set (startup readiness, host-runtime-scope, graph identity, source smoke, R39 scripts) also green.

## Why an `acquireRelease` and not `managedLayer`

I tried `managedLayer` (the R27 primitive) first and it does not fit a single resource cleanly: `Context.get` wants a `Key<Service, Impl>` whose service type is the value type, which fights the `Context.Service<X, Shape>` class form. Rather than cast a tag to satisfy the compiler, I used the same mechanism the layer wraps - `Effect.acquireRelease` provided to a scope. `managedLayer` becomes the right tool when there are **several** resources to compose into a DAG; that is the next slice, not this one.

## R27 status

One of five resources is now scope-owned (server). Still imperative: `packagedRuntime`/`backend`, `extensionRuntimeOwner`, `extensionRuntime`. The remaining slices each need the same treatment plus a shutdown-order argument, and the composition is not a closed DAG yet.