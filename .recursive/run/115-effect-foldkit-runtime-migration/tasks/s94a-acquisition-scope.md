# S94a R27: acquisition registers into ONE scope (public)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The release half is unified (`release-host-resources.ts`, s87). This slice moves **ownership of acquisition** into one scope so nothing can be acquired without being owned - the composition-root property R27 asks for, without an Effect Layer rewrite in one step.

## Current acquisition sites (measured)

| Resource | Site |
|---|---|
| server | `cli.ts:5625` |
| packaged runtime | `cli.ts:12387` |
| backend (packaged or `createBackend()`) | `cli.ts:12508` / `:12516` |
| extension runtime + owner | extension-runtime startup around the same region |

Today they are assigned to loose `let` holders and released by two separate code paths.

## Required work

1. New `src/host-runtime-scope.ts`:
   - `createHostRuntimeScope()` -> `{ register(kind, close), close(), registered() }`;
   - `register` records the resource and its closer; registering the same kind twice with a live resource is an error (no silent overwrite);
   - `close()` delegates to `releaseHostResources` with the documented order (server -> packaged/backend -> extension owner/runtime), is idempotent, and returns `{released, errors}`.
2. `cli.ts` uses ONE scope per process:
   - each acquisition site registers immediately after the resource exists (server, packaged runtime or backend, extension runtime owner/runtime);
   - `shutdown()` and `failExtensionRuntime()` both call `scope.close()` instead of hand-picking resources; keep `process.exit` semantics from s87 (exit 1 on release failure) and keep recording failure text in `bootstrapState`;
   - no behavioural change on the success path.
3. Tests (`test/host-runtime-scope.test.ts`): registration order does not change release order; double register of the same kind throws; close is idempotent; a throw from one closer still releases the rest and is reported; resources never registered are simply absent.
4. REDs: (a) release follows registration order instead of the documented order, (b) a duplicate register silently overwrites the first closer.

## Constraints

- NO Effect Layer conversion, no `startBridgeServer` signature change, no acquisition reordering.
- Run the new test file AND `index.test.ts` in full (218). If index goes red and cannot be fixed without changing observable behaviour, REVERT the cli.ts wiring, keep the module + tests, and say so.
- Host `tsc` 0.

## Report
The scope contract, every acquisition site that now registers, the RED logs, `index.test.ts` total, and what remains for a true Layer DAG.