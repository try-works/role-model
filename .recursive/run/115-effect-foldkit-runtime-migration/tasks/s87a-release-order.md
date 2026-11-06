# S87a R27 next step: one shared release-order path with visible failures (public)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R27 is parked at the composition-root boundary. This slice is the part that can be done safely WITHOUT restructuring acquisition: extract the release order into one tested function and stop swallowing finalizer failures. It is a step toward the DAG, not the DAG - label it that way.

## Measured current behaviour (`cli.ts`)

- `shutdown()` at `:5590`: `server.close()` -> `packagedRuntime.close()` or `backend.shutdown()` -> `extensionRuntimeOwner.close()` or `extensionRuntime.close()` -> `process.exit(0)`.
- `failExtensionRuntime()` at `:5567`: closes extension runtime owner/runtime and `packagedRuntime`, and **swallows close errors with `.catch(() => undefined)`** (`:5585-5586`).
- So the order exists twice, and a failing finalizer is invisible and can skip `process.exit` accounting.

## Required work

1. New module `src/host-release-order.ts`:
   - `releaseHostResources(resources, onError?)` releases in the documented order (server, then packaged runtime or backend, then extension runtime owner or runtime);
   - every release is attempted even if an earlier one throws;
   - each failure is COLLECTED and returned (`{ released: string[], errors: { step, message }[] }`) and passed to `onError`;
   - idempotent (a second call is a no-op), and absent resources are skipped.
2. Wire it into BOTH `shutdown()` and `failExtensionRuntime()` so the order exists once. Keep `process.exit(0)` in `shutdown()` after the release completes, and make the exit code non-zero when any release failed.
3. Tests (`test/host-release-order.test.ts`): order from recorded events; a throwing server close still releases the runtime and reports the error; a throwing runtime close still attempts the extension runtime; idempotence; absent resources skipped; the returned error list names the failing step.
4. REDs: (a) an early `return` after a failed release, (b) swallowed errors.

## Constraints

- NO acquisition restructuring, no Layer wiring, no changes to `startBridgeServer`'s signature. Behaviour must be identical on the success path.
- Run `test/host-release-order.test.ts` AND `test/index.test.ts` in full (218). If index tests go red and you cannot fix without changing observable behaviour, REVERT the wiring and keep only the module plus its tests.
- Host `tsc` 0.

## Report
The order implemented, the two call sites changed, the RED logs, `index.test.ts` total, and what remains for the actual Layer DAG.