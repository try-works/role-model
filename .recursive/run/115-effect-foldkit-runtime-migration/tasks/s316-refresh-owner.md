# S316 — B6/R27 Refresh owner: STOP characterization (recorded before any edit)

Task-23 (rev 2). Model: deepseek-flash (verified live). Files byte-unchanged; backups E:/rm-tmp/s316.
No commit. S21d discipline: characterize first, move only if honest within scope.

## What the "Refresh owner" actually is

1. **In-flight GET sharing** (commit a01230f0 "share pending aliased reads with independent cancellation") is
   implemented in `role-model-router/apps/runtime-ui-next/src/readback-flight.ts`:
   `ReadbackFlightTransport` (:38) and `createReadbackFlightTransport` (:97); the readback consumer is
   `runtime-ui-next/src/readback.ts`. That is the **client UI app**, not the host bridge.
2. **Telemetry invalidation/refresh** (commit c88aecdf "refresh current telemetry reads without inventing
   revisions") is implemented in `runtime-ui-next/src/refresh.ts`: `REFRESH_STREAM_URL` (:29),
   `refreshRevisionStream` (:107), `makeRefreshSubscriptions` (:216), plus `update.ts`/`message.ts`.
   Again the **client UI app**.

The host has **no Refresh service**: the host-side "refresh" is the `rebuildCurrentState` closure inside
`createRuntimeBridgeBackend` (`src/index.ts:22656`, 38 reference sites). It mutates backend-local state
(`currentAccounts` :22657, `runtimeEndpoints` :22658, `currentNormalizedCatalog`, `currentModelsById`,
`currentRegistry` :22665, `initialization.databasePath`, `currentUnifiedRuntimeConfig`,
`sessionBootstrapState`) captured by the whole backend construction (`:20905`–`:35271`).

The DAG's Refresh is only the **shape** `RefreshContract { id, eventLog }` (`composition-dag.ts:146`, service
:150, layer :423, composed in `baseOwnerLayers` :479). It holds no transport/refresh behaviour.

## Does Backend/Server unblock it? No.

- The Backend/Server owners (committed 6ade412f / 693b2204) are host-side composition sites; they do not own the
  UI client's in-flight sharing or telemetry refresh, which live in `apps/runtime-ui-next` — **outside** this
  task's authorized scope (composition-dag.ts, the refresh-related host composition region, host-bridge test/**).
- Moving the host `rebuildCurrentState` into the DAG would require extracting the backend closure state listed
  above (thousands of lines inside `createRuntimeBridgeBackend`), not a discrete refresh/readback construction;
  that is outside the authorized refresh-composition region and would silently duplicate backend state.

## Decision: STOP (no fabrication, no parallel refresh)

Refresh cannot be moved into the DAG honestly within the authorized files: the real refresh semantics are
UI-layer (`apps/runtime-ui-next`), and the host's only refresh is backend-closure state. A DAG Refresh owner
built now would be a parallel, behaviourless owner.

## Unblock options

(a) Authorize `apps/runtime-ui-next/src/readback-flight.ts` + `refresh.ts` (+ their tests) as a separate
"UI Refresh owner" slice (different app; the DAG is host composition, so this would be a UI composition owner,
not the host DAG); or (b) authorize extracting the Backend's `rebuildCurrentState` + closure state as a
first-class Backend-owned Refresh service (a larger Backend-internal split, not a refresh-composition move).

## Owner table (before/after this slice — unchanged)

| Owner | Status |
| --- | --- |
| Backend | MOVED (6ade412f) |
| Server | MOVED (693b2204) |
| Refresh | **blocked** — real semantics in runtime-ui-next (outside); host refresh = backend closure state |
| Drain | blocked — shutdown/drain spans backend, supervisor, queues, vendors; early readiness/partial shutdown gaps |
| Benchmark | blocked — separate CLI/runner; cancellation/cross-process ownership not modelled |
| Cli | blocked — process entrypoint (args/SEA/startup) |

## Baseline (no product changes)

tsc exit 0; s21a 6/6 + s21c 2/2 + s313 5 + s310b 5 = 18/18
(`evidence/logs/s316-characterization.log`). Files byte-unchanged:
composition-dag.ts AD1780F1…, index.ts 387DAC6E…, cli.ts C6AFCD73….
