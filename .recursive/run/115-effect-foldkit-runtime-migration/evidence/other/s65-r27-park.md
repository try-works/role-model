# S65 R27 parked: what landed, what it needs, and why it is not done

R27 ("closed shared-leaf Layer DAG owns CLI/backend/server/bootstrap/refresh/drains/benchmarks, early readiness and partial shutdown") is **not complete**. Two slices landed scaffolding; the third hit a genuine architectural boundary.

## Landed (useful, insufficient)

- `src/r27-composition.ts` - `managedLayer(tag, {acquire, release})` on `Layer.fromBuild` + `Scope.provide(Effect.acquireRelease)`, with three toy-graph tests.
- `src/host-runtime-resource.ts` - the typed **backend+server pair**: `makeHostRuntime` (backend-first) and `makeHostRuntimeServerFirst` (server -> backend -> packagedRuntime, release the inverse), idempotent HTTP close, injectable factories, five tests on a real ephemeral port.
- `test/cli-composition-scope.test.ts` - failed acquisition after bind releases the server exactly once; close order from recorded events; throwing finalizer still releases and surfaces; double close is a no-op.
- An ownership inventory with file:line for every long-lived resource and the seven gaps vs R27.

## Why it stopped

The CLI is **server-first**: `startBridgeServer` at `cli.ts:5625`, the backend created later inside extension-runtime startup at `cli.ts:9322`, `process.exit(0)` at `:5609` before finalizers complete. Putting the pair into one scope is a **composition-root refactor**, not a narrow wiring; passing an already-bound server into the resource would create dual ownership, which the design review refused.

## What it needs next (in order)

1. Extract a CLI composition root that acquires the **server first** into the scope, then exposes a late `acquireBackend`/`acquirePackagedRuntime` into the same scope after warm-up.
2. Replace `process.exit(0)` with scope close, surfacing finalizer failures instead of swallowing them.
3. Keep the old `shutdown()` as a fallback until CLI-level order is proven.
4. Assert CLI-level early readiness: backend warming -> `/healthz` pending-503 and static UI serving (the behaviour a reorder breaks silently).
5. Only then scope refresh/drains/benchmarks, which R27 also requires.

## Honest status

R27: **open**. The primitives are real and tested; nothing in the running host uses them yet. `index.test.ts` was not run for the wiring because there was no wiring to run - and no RED logs exist for it because no behaviour changed.
