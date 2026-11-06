# S61 R27 slice 1: inventory only (scaffolding, not wired)

## What exists now

`apps/runtime-host-bridge/src/r27-composition.ts` (844 bytes) provides `managedLayer(tag, {acquire, release})` built on `Layer.fromBuild` + `Scope.provide(Effect.acquireRelease(...))`, and `test/r27-composition.test.ts` (3/3) proves, on a TOY graph:

- reverse-order release (backend acquired before server, released after it),
- a failed server acquisition releases the backend,
- a throwing server finalizer does not skip the backend release.

**It is not wired into `startBridgeServer`**, so none of those guarantees hold for the running host yet. This slice therefore does not advance R27; it produces the inventory and a proven primitive.

The throw-continue case has no captured RED - reported as a gap by the worker, and recorded as one here.

## Inventory produced (the useful part)

| Resource | Site | Gap vs R27 |
|---|---|---|
| HTTP listener | `index.ts:20697`, listen `:20737`, close `:20741` | direct Promise close, not a Layer; **failed listen has no cleanup** |
| Request listener / telemetry edge | `index.ts:20696` | no release contract |
| Runtime bridge backend | `index.ts:20869` | caller-owned, no close exposed |
| ProcessSupervisor | `index.ts:20971`, shutdown `:34684` | not scoped; restart relies on manual shutdown |
| llama-swap vendor | `:24308`, shutdown `:24304`/`:34683` | no single acquire/release point |
| LiteLLM vendor | `:24325` | same |
| SQLite stores | `:7002-7116` | per-operation `finally`, not long-lived |

## Next slice, with a hard boundary

Wire only the listener + backend into `managedLayer` inside `startBridgeServer`, prove failed-listen cleanup, close-order and throw-continue with REDs, and run `index.test.ts` in full. **If the wiring cannot pass without changing observable behaviour, revert it and report** - a red host is worse than an unwired graph.
