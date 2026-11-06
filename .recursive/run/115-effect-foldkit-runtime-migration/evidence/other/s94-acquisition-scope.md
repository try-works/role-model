# S94 R27: the acquisition scope primitive landed; the wiring plan is now file-and-line exact

## Verified (by me)

- `src/host-runtime-scope.ts`: `createHostRuntimeScope()` -> `{register(kind, close), registered(), close()}`; a duplicate registration of a live kind throws; `close()` delegates to `releaseHostResources` so the order stays server -> packaged/backend -> extension, is idempotent and returns `{released, errors}`.
- `test/host-runtime-scope.test.ts`: **5 / 5**, run by me. Host `tsc` **0**.
- REDs captured: registration-order release (`extension, backend, server`) and silent duplicate overwrite.

**Not wired.** `cli.ts` is untouched, so nothing in the running host uses it and R27 has not moved beyond primitives.

## Why wiring stopped - and the exact plan that unblocks it

The blocker is structural, and I mapped it rather than guessing: `main()` at `cli.ts:5382` contains **one** inner `createBackend` arrow function at `:9313`, which assigns the outer `packagedRuntime`/`backend` holders (`:12387`, `:12508`), and `server` is acquired in `main()` itself at `:5644`. Because `createBackend` closes over the outer scope, **the scope does not need a new parameter**:

1. `const scope = createHostRuntimeScope()` immediately after the holders are declared in `main()`.
2. `scope.register("server", () => activeServer.close())` right after `server = await startBridgeServer(...)` (`:5644`).
3. Inside `createBackend`: `scope.register("packagedRuntime", ...)` after `packagedRuntime = await createPackagedProductionRuntime(...)` (`:12387`); `scope.register("backend", ...)` at `:12508`/`:12516`.
4. Register the extension runtime owner/runtime at their assignment sites.
5. Replace the hand-picked release lists in `shutdown()` (`:5597`) and `failExtensionRuntime()` with `await scope.close()`, keeping the s87 semantics: `process.exit(1)` when the release reports errors, and `bootstrapState` carrying the failing step text.
6. Run `test/host-runtime-scope.test.ts` plus `index.test.ts` in full (218); revert the `cli.ts` wiring if any observable behaviour changes.

That is a single-file, five-site change with no signature changes and no acquisition reordering - small enough to do next, and now specified precisely instead of described vaguely. It was not done in this slice because a partial wiring would create exactly the dual ownership the design review refused.