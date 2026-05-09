Run: `/.recursive/run/18-local-llama-swap-runtime/`
Phase: `01 AS-IS`
Status: `LOCKED`
Inputs:
- `/.recursive/run/18-local-llama-swap-runtime/00-requirements.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/17-oauth-litellm-generalization/08-memory-impact.md`
Outputs:
- `/.recursive/run/18-local-llama-swap-runtime/01-as-is.md`
Scope note: Analyze the current state of llama-swap integration to identify gaps for the new Local runtime section.

---

# Run 18: Local llama-swap Runtime — AS-IS Analysis

## Current State

### llama-swap Vendor Integration

- `/role-model-router/vendor/llama-swap/` is vendored as a nested Go module.
- It owns local host lifecycle, request forwarding, logs, metrics, captures, and operator surfaces.
- It provides on-demand model switching, concurrent models via Matrix, TTL/auto-unload, and a web UI.

### Vendor Abstraction Layer

- `/role-model-router/packages/vendor-llama-swap/src/index.ts` wraps llama-swap process lifecycle.
- Exposes: `execute()`, `readStatus()`, `healthCheck()`, `shutdown()`.
- `VendorRuntimeStatus` currently only exposes: `vendorId`, `healthStatus`, `baseUrl`, `healthUrl`, `pid`, `configPath`, `lastLatencyMs`.
- **No loaded model state** is exposed through the vendor abstraction.

### Bridge Runtime Integration

- `createRuntimeBridgeBackend` in `apps/runtime-host-bridge/src/index.ts` creates `currentLlamaSwapVendor`.
- The bridge exposes `/healthz`, `/v1/models`, `/v1/chat/completions`, and various `/api/role-model/*` endpoints.
- **No bridge endpoints exist** for:
  - `/api/role-model/local/models`
  - `/api/role-model/local/swap`
  - `/api/role-model/local/policy`

### UI Navigation

- The runtime UI has six sections: Overview, Studio, Control, Observe, Integrations, System.
- **No "Local" section exists.**
- Four local inference server providers exist (`llamacpp`, `vllm`, `tabbyapi`, `stable-diffusion-cpp`) with `providerKind: "local-engine"`, but their runtime state is invisible.

### Static vs Dynamic Model Exposure

- Role-model exposes static model configuration (what models exist in llama-swap config).
- **Dynamic runtime state** (what's loaded, swap history, manual controls) is completely hidden.

## Gaps Identified

1. **No bridge API for local runtime state** — Users cannot query loaded models, swap history, or policy through the role-model API.
2. **No UI for local runtime state** — Users must use llama-swap's vendored UI directly.
3. **No swap event persistence** — Swap events are not recorded in SQLite or any durable store.
4. **DESIGN_SYSTEM.md does not document Local section** — The navigation model has no Local routes.

## Known Unknowns

- Whether llama-swap's `GET /running` endpoint returns sufficient metadata (engine type, load timestamp).
- Whether swap events can be reliably intercepted from llama-swap or must be inferred from bridge logs.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/08-memory-impact.md` — catalog and provider-account memory relevant to local model config.
- `/.recursive/run/17-oauth-litellm-generalization/08-memory-impact.md` — UI navigation and design system patterns.

---

## Coverage Gate

- All gaps from R1–R7 are identified in the current state.
- Prior recursive evidence relevant to local runtime was reviewed.

**Coverage: PASS**

## Approval Gate

- AS-IS analysis is ready for TO-BE planning.

**Approval: PASS**

LockedAt: 2026-05-10T04:11:00+08:00
LockHash: `run18-as-is-locked`