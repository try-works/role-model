# S124 Closing the loop on S123: one runtime close, not two

S123 moved the `extensionRuntime` registration out of the QA loop. Reading the owner next showed that fix would have introduced a **double close**.

## The chain

`createCliExtensionRuntimeOwner(...)` returns `{ promise, close }`, and its `close` **already** calls `runtime.close()` behind a memoized `closePromise` (`cli.ts:3498-3508`). The registration I had moved called `runtime.close()` directly - a second, non-memoized call on the same runtime at shutdown.

`hostScope.close()` runs every registered step, so with both kinds present the runtime would be closed twice. Whether that is harmless depends on the runtime implementation - and "depends on an implementation I did not check" is exactly the reasoning that produced the origin-gate bug.

## Fix

The `extensionRuntime` registration now **delegates to the owner's memoized close**:

    hostScope.register("extensionRuntime", async () => { if (extensionRuntimeOwner !== null) await extensionRuntimeOwner.close(); });

- the five-kind ownership contract stays complete (a registration cannot be silently dropped),
- the runtime is closed exactly once, because the owner memoizes,
- and the registration stays where S123 put it: once, before the QA loop, not inside it.

## Tests

`test/s124-extension-close-once.test.ts` uses the real exported factory:

| Case | Proves |
|---|---|
| two owner closes | `runtime.close` called **once** (memoized) |
| close before resolution | a runtime that resolves later is still closed once |

12 tests across s124 (2) + s120 (3) + release-host-resources (7); the wider composition set runs 43 passed with `tsc = 0`.

## My own mistakes this round, kept honest

1. S123 moved a registration without checking what the owner already did - it would have double-closed the runtime.
2. My first version of the S123 test file used `test(...)` in a file importing only `it`/`describe`, so the suite collected nothing; `test is not defined` is what caught it.

Both were mine, and both were caught by running the thing rather than reasoning about it.