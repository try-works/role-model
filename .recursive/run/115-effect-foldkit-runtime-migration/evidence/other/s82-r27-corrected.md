# S82 R27 update: the failure path is already handled - what is missing is the DAG and the tests

I read the CLI startup/shutdown path instead of trusting the earlier framing. Corrected facts:

## Acquisition and release already ordered

| Step | Site |
|---|---|
| server acquired | `cli.ts:5625` |
| packaged runtime acquired | `cli.ts:12387` |
| backend acquired (`packagedRuntime.backend` or `createBackend()`) | `cli.ts:12508` / `:12516` |
| failure path | `catch` at `:12520` calls **`failExtensionRuntime(error)`**, which closes the extension runtime owner/runtime **and `packagedRuntime`** (`:5583-5586`) |
| shutdown | `:5590` - `server.close()` -> `packagedRuntime.close()` / `backend.shutdown()` -> extension runtime close -> `process.exit(0)` |

So the earlier claim that a failed backend acquisition leaks the packaged runtime is **wrong**: it is released. The release ORDER in both paths is also correct (server, then runtime, then extension).

## What R27 actually still needs

1. **A closed Layer DAG** instead of imperative holders - the architectural requirement itself. The typed pair resource exists (`host-runtime-resource.ts`) but nothing in the CLI uses it.
2. **CLI-level order tests**: nothing today asserts that shutdown releases in that order or that a failed acquisition releases what was acquired. The unit tests cover the primitive, not the CLI wiring.
3. `process.exit(0)` fires inside `shutdown()` after the releases, which is correct today but has no guard against a rejected release skipping the rest - `failExtensionRuntime` swallows close errors with `.catch(() => undefined)`, so a failing finalizer is currently invisible.

## Consequence for the plan

The composition-root refactor is still the right next step, but it is now scoped to (a) replacing the imperative holders with the scoped pair, (b) making finalizer failures visible, (c) CLI-level order tests. It is **not** a leak repair.
