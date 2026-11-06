# S316 R27 remaining clauses — early readiness, partial shutdown, cache identity

Read-only characterization (s316). No product edits, commits, builds, installs, operator ports or processes. Commands: grep/read/git only; temp under E:/rm-tmp if used.

Worktree/HEAD: public D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration @ 693b2204.

## (a) Early readiness

**Current state.** The DAG owns no early-readiness ordering. Readiness is CLI mutable state projected into the server:

- `composition-dag.ts:25-27` states explicitly that the owner shape does not model early readiness/partial shutdown/cache identity.
- The DAG bootstrap layer only carries `pending: createPendingBootstrapState` and `run: runSessionBootstrapStages` (`composition-dag.ts:409-420`); no gate/order is expressed between Backend/Server/Cli layers.
- `composeServerOwner.start()` creates the listener and listens immediately (`composition-dag.ts:867-877`); it does not wait for Backend readiness.
- The actual readiness source is `readStartupReadiness` passed through the composed options: `composition-dag.ts:640` projects `input.readBootstrapState()` via `projectCliStartupReadiness`.
- The CLI owns that mutable state: `bootstrapState` created pending at `cli.ts:5117`, set failed at `:5123-5124`, set ready at `:12180-12181`, degraded/ready transitions in the watchdog at `:4271-4285`.
- Server enforcement is post-hoc: `index.ts:17522` reads `options.readStartupReadiness()`; `:17530-17536` answers 503 `runtime_initializing` except for potential static UI requests. Health is projected separately at `cli.ts:4380-4384` / `:4408-4412`.

**What "early readiness" would mean for the DAG.** A first-class readiness service/layer that the Server can consult before listening or before admitting API work, with an explicit ordering edge (Bootstrap readiness → Backend usable → Server admission) and a transition event rather than a callback reading a mutable CLI object. Today the server can be listening while Backend resolution still throws "runtime backend is not ready" (`composition-dag.ts:619`).

**Named follow-on:** **DAG early-readiness owner** — model Bootstrap readiness as a service with a transition/gate consumed by Server admission, replace the mutable `bootstrapState` projection, and test pending→ready plus pending→failed.

## (b) Partial shutdown

**Current state.** One CLI scope releases all host resources in a fixed order, but there is no admission→join→drain→interrupt sequencing inside the owners:

- `hostScope` is created at `cli.ts:5112`; resources registered after acquisition: server `:5261-5263`, extension owner `:11993-11995`, extension runtime `:12099-12101`, packaged runtime `:12147-12149`, backend `:12177-12179`.
- `shutdown()` stops the auto-replay loop and watchdog first (`cli.ts:5151-5154`), then calls `hostScope.close()` once (`:5155`), nulls handles, and exits with code 1 on release errors (`:5161-5167`). `failExtensionRuntime` also calls `hostScope.close()` (`:5131`).
- Release order is the global helper order: server → packagedRuntime/backend → extension owner/runtime (`shared order in release-host-resources.ts`).
- Server close is only the HTTP transport finalizer: `cli.ts:5245-5252` uses `Effect.acquireRelease(startServer, value.close)`; ServerOwner.close calls only `transport.close(server)` (`composition-dag.ts:872-874`). It does not join in-flight requests explicitly, drain queues/jobs, or interrupt provider tasks.
- BackendOwner has **no close/shutdown member** (`composition-dag.ts:531-534`); its `shutdown` is only an option function passed through (`:603`, `:634`). The DAG owners (Backend, Refresh, Drain, Benchmark, Server, Cli) are typed shapes with no close/drain contract (`composition-dag.ts:400-468`).
- The separate public-side `releaseHostResources` owns ordered release (see s87a), not partial-shutdown dependency ordering.
- Drain/Refresh/Benchmark layers name owners but expose no stop/join/interrupt methods (`composition-dag.ts:423-449`).

**Which owners lack partial-shutdown ordering.** Server (no join), Backend (no close), Refresh (no quiesce/join), Drain (no “stop new captures → finish in-flight → drain → close”), Benchmark (no cancel/interrupt), provider permits (no waiter/task interrupt), extension owner/runtime (close without task join). The current paths are the CLI scope close, ServerOwner.close and the BackendOwner option `shutdown`, none of which expresses the ordering.

**What partial shutdown would mean.** Stop admission first (server stops accepting; routes return 503), then join in-flight requests, then drain queues/captures/refreshes, then interrupt provider/benchmark tasks, then close dependencies in reverse acquisition order — with owner-scoped cancellation/failure aggregation rather than one closure list.

**Named follow-on:** **DAG partial-shutdown owner** — add close/quiesce/join/interrupt contracts to Server/Backend/Refresh/Drain/Benchmark and test stop-admission→join→drain→interrupt ordering with a failing dependency.

## (c) Cache identity

**Current state — the DAG cache exists but is not wired.**

- A metadata cache **contract/implementation already exists**: `composition-dag.ts:199-274`. Key is `authorityId + NUL + configGeneration + NUL + modelId` (`:206-214`); value/generation/storedAt (`:225-229`); capacity bound and TTL eviction (`:231-272`); `invalidateGeneration` (`:254-260`).
- It is **not a DAG service**: no `Context.Service`/`Layer`/provider for MetadataCache; grep finds only the interface/helper/make function in `composition-dag.ts`, no registration in `CompositionServices` or owner layers (`composition-dag.ts:470-479`).
- It is **not used by the host**: `index.ts` has no `makeMetadataCache`/`metadataCacheKey` call. No invalidation call exists anywhere in the host source.
- The actual live routing cache is `createRoutingPrepCache` (`routing-prep-cache.ts:40-57`, TTL + bounded entries + in-flight coalescing, invalidate API at `:31`), constructed at `index.ts:21215-21216`.
- Its live keys are tick strings plus a registry identity: `index.ts:27313-27317` builds `routingPrepRegistryIdentity:<TTL-tick>`; observed profiles add difficulty bucket (`:27319-27320`), telemetry adds `minSamples` (`:27330-27331`), benchmark capabilities (`:27379-27380`), and a fourth read at `:27444`. There is **no config-generation component and no authority component** in these keys.
- No call to `routingPrepCache.invalidate` exists in `index.ts` (grep finds only construction/read), so a configuration change cannot proactively invalidate entries; freshness is TTL-only.

**Identity missing.** The live key identifies registry/tick and some data-class dimensions, but not (i) authority/owner id, (ii) configuration generation, (iii) model identity beyond registry identity, and (iv) there is no invalidation on config change. The DAG's intended cache identity exists only as an unwired helper.

**Named follow-on:** **DAG metadata-cache owner** — register MetadataCache as a DAG service, feed it `metadataCacheKey(authority, configGeneration, model)`, wire get/set into routing preparation, and invalidate by generation on config change with TTL/cap tests.

## Not read

- Full `runSessionBootstrapStages` implementation (`session-bootstrap.ts`) — only its DAG construction call was read.
- Full health projection implementation in `cli.ts:4380-4412` beyond the pending branch.
- Full `routing-prep-cache.ts` beyond construction/invalidation API and the host key call sites.
- `index.ts` request admission beyond the startup-readiness 503 branch.
- Any test files (s5 owns them) and `composition-dag.ts` bodies outside the cited ranges.
