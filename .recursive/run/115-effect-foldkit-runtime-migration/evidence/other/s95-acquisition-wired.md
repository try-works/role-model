# S95 R27: acquisition now registers into ONE scope (wired by the lead)

The worker built the primitive twice and declined the wiring twice. I did the wiring myself, following the plan I had written.

## What changed in `cli.ts`

| Step | Detail |
|---|---|
| `hostScope` created | once per process, right after the resource holders |
| server | registered immediately after `server = await startBridgeServer(...)` |
| packaged runtime | registered after `packagedRuntime = await createPackagedProductionRuntime(...)` |
| backend | registered at both acquisition paths (`packagedRuntime.backend` and `await createBackend()`) |
| extension runtime + owner | registered at their assignments |
| `shutdown()` | releases through `hostScope.close()`; holder nulls moved **after** the close because the registered closers read the holders |
| `failExtensionRuntime()` | same, and the first release error is recorded into `bootstrapState` instead of being swallowed |

Both paths keep the s87 semantics: `process.exit(1)` when a release failed, each failing step logged.

## A real bug I caught in my own first cut

My first wiring set `server = null; ...` **before** `hostScope.close()`. Because each registered closer reads the holder (`server === null ? Promise.resolve() : server.close()`), that ordering would have made every release a silent no-op - the server would never have closed. I caught it by reading the rewired block rather than trusting a green typecheck, and moved the nulls after the close in both paths.

## Verification

- `tsc`: **0**.
- `test/host-runtime-scope.test.ts` + `test/release-host-resources.test.ts`: pass.
- **`test/index.test.ts`: 218 / 218** after the wiring.

## What this does and does not establish

Achieved: every acquired host resource is now owned by one scope, and both release paths go through it - the composition-root ownership property R27 asks for.

Not yet: this is registration, not a closed Effect **Layer** DAG. Acquisition is still imperative at the same sites; the scope records and releases. R27 therefore stays open, but the ownership half is no longer ad hoc.