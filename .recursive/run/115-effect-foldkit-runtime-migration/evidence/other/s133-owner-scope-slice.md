# S133 R27 fourth slice: the extension runtime owner is scope-owned

## Change

The owner registration no longer calls `extensionRuntimeOwner.close()` directly. It closes an Effect scope whose finalizer performs that call:

```ts
const extensionOwnerScope = Effect.runSync(Scope.make());
await Effect.runPromise(Scope.addFinalizer(extensionOwnerScope, Effect.promise(async () => {
  if (extensionRuntimeOwner !== null) await extensionRuntimeOwner.close();
})));
hostScope.register("extensionRuntimeOwner", async () => {
  await Effect.runPromise(Scope.close(extensionOwnerScope, Exit.void));
});
```

`addFinalizer` rather than `acquireRelease` on purpose: the owner is created **above** this point and starts its runtime promise immediately, so moving the acquisition into the scope would reorder startup. Ownership is what R27 counts, and the close still runs exactly once because the owner memoizes its `closePromise` (S124).

An earlier attempt wrapped the creation call itself by matching parentheses textually and produced invalid code (`((` and stray `)),`). I reverted the file and used this shape instead - a smaller edit with the same ownership effect, rather than fighting a 40-line argument list.

## Guard

`s130` now also asserts the `extensionRuntimeOwner` registration body contains `Scope.close(extensionOwnerScope` and does **not** call `extensionRuntimeOwner.close(); }` directly. 19 tests pass across s130, s128, s124, s120 and release-host-resources; `tsc` 0.

## Verified / not verified

The source smoke passes (`PASS` 4/4) - but this slice lives inside the **stage-only packaged branch**, so the smoke does not execute it. It is type-checked and guarded, not runtime-verified, exactly like S130.

## R27 tally after four slices

| Resource | Ownership | Runtime verification |
|---|---|---|
| server | scope | source smoke + full suite |
| backend (non-packaged) | scope | SEA binary gate |
| packagedRuntime | scope | type-check only |
| extensionRuntimeOwner | scope | type-check only |
| extensionRuntime | delegates to owner close | type-check only |