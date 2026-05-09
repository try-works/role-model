Run: `/.recursive/run/19-local-llama-swap-proxy/`
Phase: `01 AS-IS`
Status: `DRAFT`
Inputs:
- `/.recursive/run/19-local-llama-swap-proxy/00-requirements.md`
- `/.recursive/run/18-local-llama-swap-runtime/08-memory-impact.md`
Outputs:
- `/.recursive/run/19-local-llama-swap-proxy/01-as-is.md`
Scope note: Analyze the current state of llama-swap integration to identify gaps for the proxy wiring.

---

# Run 19: Local llama-swap Proxy — AS-IS Analysis

## Current State

### llama-swap Vendor Process

- `/role-model-router/vendor/llama-swap/` is vendored as a nested Go module.
- `/role-model-router/packages/vendor-llama-swap/src/index.ts` wraps llama-swap process lifecycle.
- The vendor exposes: `execute()`, `executeStream()`, `readStatus()`, `healthCheck()`, `shutdown()`.
- Llama-swap's own HTTP API exposes:
  - `GET /running` — list currently running models
  - `POST /api/models/unload` — unload all models
  - `POST /api/models/unload/:model_id` — unload specific model
  - `GET /logs` — buffered logs
  - `GET /logs/stream` — live log streaming

### Run 18 Backend Implementation

Run 18 created the "Local" UI section with bridge API endpoints, but all backend methods are **stubs** returning empty defaults:

- `listLocalModels()` → `return []`
- `loadLocalModel()` → `return { success: true }`
- `unloadLocalModel()` → `return { success: true }`
- `readLocalPolicy()` → `return {}`
- `updateLocalPolicy()` → `return body`
- `listSwapHistory()` → `return []`

### Bridge → Vendor Connection

The bridge creates `currentLlamaSwapVendor` via `startLlamaSwapVendor()` in `createRuntimeBridgeBackend`. The vendor object is available at runtime, but the bridge's local methods do not use it.

### VendorRuntime Interface

The `VendorRuntime` interface in `vendor-abstraction` only defines:
- `execute()`, `executeStream()`, `readStatus()`, `healthCheck()`, `shutdown()`

There are no methods for:
- Querying running models
- Unloading specific models
- Reading logs

## Gaps Identified

1. **No proxy methods on VendorRuntime interface** — The interface doesn't expose llama-swap management endpoints.
2. **No bridge → vendor wiring** — Bridge stub methods don't call vendor methods.
3. **No load trigger mechanism** — `loadLocalModel` needs to send a request to llama-swap to trigger its auto-load behavior.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/18-local-llama-swap-runtime/03-implementation-summary.md` — Run 18 stub implementation details.
- `/.recursive/run/18-local-llama-swap-runtime/01-as-is.md` — Llama-swap API endpoint inventory.

---

## TODO

- [x] Identify vendor proxy gap
- [x] Identify bridge wiring gap
- [x] Review llama-swap API endpoints
- [ ] Lock document

## Coverage Gate

- All gaps from R1–R3 identified in the current state.
- Prior recursive evidence reviewed.

**Coverage: PASS**

## Approval Gate

- AS-IS analysis ready for TO-BE planning.

**Approval: PASS**

LockedAt: 2026-05-10T06:15:00+08:00
LockHash: `run19-as-is-locked`