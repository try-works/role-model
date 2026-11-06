# S333 — R23 async observation hydration: STOP characterization (recorded before any edit)

Task-29. No product edits, no commit. Backups E:/rm-tmp/s333 (none needed; files byte-unchanged).

## Precisely identified regions (current HEAD)

- Sync SQL facade import: `src/index.ts:19` `makeSync` from @effect/sql-sqlite-node/service; construction `src/index.ts:20969`.
- Backend construction: `export async function createRuntimeBridgeBackend` at `src/index.ts:21000` (the whole observation path lives inside this 13k-line closure).
- Graph store (sync file store): `src/index.ts:21274-21280` `localGraphStore = createTrackBFileGraphStore(...)` (fixtures / non-track-B only).
- Observation bundle/telemetry functions are **imports from @role-model-router/sqlite-memory**, not host-owned closures: import list `src/index.ts:113-133` (`persistRuntimeObservationBundle`, `persistRuntimeTelemetryFailure`, `readRuntimeObservationBundle`, `readRuntimeTelemetrySummary`, `readLatestObservedProfile`, `readLatestObservedProfilesByEndpointIds`, `readLiveTaskTelemetryScoresByEndpointIds`). Current sync call sites include `21329` (persistRuntimeTelemetryFailure + graph store), `21364` (readRuntimeObservationBundle wrapper), `25783/26036` (telemetry summary type+read), `6337/6342` and `26611/26621-26627` (routing-time observed profile/live telemetry reads).

## Blocking closure/state

The observation store the DAG would own IS the sync SQL facade itself: its connection is created by `makeSync` (`index.ts:19`, `:20969`) and every read/write is a synchronous `@role-model-router/sqlite-memory` export called directly inside the backend closure. The DAG (composition-dag.ts) imports no sqlite-memory and the Backend owner carries only options/boundings (no storage lifecycle, no close). A DAG observation store would therefore need to own `makeSync`, the SQLite initialization, the graph file store (`:21274`) and all 24 caller sites — that is a Backend-internal storage-service extraction, not an observation-store composition wiring. Wiring only persist/readBundle to a new DAG store while leaving the other 21 sync callers on the same facade would create the dual store the contract forbids; a callback-wrapping DAG store would own no connection and could not provide async hydration beyond wrapping the same synchronous SQL work (no real async boundary).

## Caller table (current lines; moved/stayed = STAYED, sync-at-call-time)

| Family | Current site(s) | Status |
| --- | --- | --- |
| persist telemetry failure + graph write | index.ts:21329 | stayed (sync) |
| read observation bundle | index.ts:21364 (+ wrapper at :21362) | stayed (sync) |
| telemetry summary type/read | index.ts:25783, 26036 | stayed (sync) |
| observed profiles (routing prep) | index.ts:6337, 6342, 26621-26627 | stayed (sync) |
| live task telemetry scores | index.ts:26611 | stayed (sync) |
| graph store construction | index.ts:21274-21280 | stayed (sync) |
| remaining s9b callers (observation/telemetry read families, 26353/26396/27072/27170 etc.) | index.ts per s307 table | stayed (sync) |

## Decision: STOP (no fabrication, no parallel store)

A DAG observation store cannot honestly own the persist/read bundle or graph hydration without first extracting the Backend's sync SQL facade ownership; partial wiring would be a dual store. S21d escape hatch used.

## Unblock

Authorize a Backend-internal storage-service extraction slice: move `makeSync` construction (:20969), sqlite initialization, the graph file store (:21274-21280) and the observation bundle/telemetry helpers into a Backend-owned storage contract with a bounded Effect queue/worker for async hydration and a sync read-through facade; then migrate the 24 callers family-by-family with the updated caller table. That is a larger Backend factory split, not an observation-composition wiring, and should not be hidden inside this task.
