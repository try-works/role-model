# Run 20: Decisions Update

## New Decisions

### D20-1: Policy Persistence Format
- **Decision**: Store local policy as formatted JSON (`local-policy.json`) in `runtimeStateRoot`
- **Rationale**: Human-readable, easy to inspect/edit outside the UI, simple merge semantics
- **Consequence**: No schema migration needed; defaults are hardcoded in `readLocalPolicy()`

### D20-2: SQLite for Swap Events (Not JSON)
- **Decision**: Store swap events in SQLite (`llama_swap_events` table) rather than JSON
- **Rationale**: Swap events are append-only time-series data; SQLite provides efficient querying, ordering, and future aggregation
- **Consequence**: Requires `node:sqlite` (experimental); events are tied to the runtime scope

### D20-3: `getLogs` Removed (Not Deprecated)
- **Decision**: Remove `getLogs` entirely from `VendorRuntime` and `vendor-llama-swap` rather than deprecating
- **Rationale**: No consumers existed; dead code creates maintenance burden; can be re-added with proper requirements if needed
- **Consequence**: Log streaming UI calls bridge endpoint which proxies to llama-swap directly

### D20-4: `loadedAt` Fabrication Documented
- **Decision**: Document the `loadedAt` timestamp as fabricated rather than attempting to infer from process data
- **Rationale**: llama-swap `/running` endpoint does not expose load times; process start time inference is unreliable
- **Consequence**: Users see "now" as load time; acceptable for operator visibility

### D20-5: Log Streaming via Bridge Proxy
- **Decision**: Add `GET /api/role-model/local/logs` bridge endpoint that proxies to llama-swap `/logs`
- **Rationale**: UI should not know llama-swap port directly; consistent with other local API endpoints
- **Consequence**: Bridge depends on `currentLlamaSwapVendor.readStatus().baseUrl` for proxy URL

## Deferred Decisions

### D20-D1: Model-Level Overrides
- **Status**: Deferred to future run
- **Open questions**: 
  - Should overrides be stored in `model-overrides.json` or merged into `local-policy.json`?
  - How should overrides be applied to llama-swap requests (query params, headers, body)?
  - Should overrides be per-model or per-model+endpoint?
