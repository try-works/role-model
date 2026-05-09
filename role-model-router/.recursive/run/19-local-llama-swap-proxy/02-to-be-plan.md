Run: `/.recursive/run/19-local-llama-swap-proxy/`
Phase: `02 TO-BE Plan`
Status: `DRAFT`
Inputs:
- `/.recursive/run/19-local-llama-swap-proxy/00-requirements.md`
- `/.recursive/run/19-local-llama-swap-proxy/01-as-is.md`
Outputs:
- `/.recursive/run/19-local-llama-swap-proxy/02-to-be-plan.md`
Scope note: Define the implementation plan for wiring Run 18's stub backend methods to actual llama-swap proxy calls.

---

# Run 19: Local llama-swap Proxy — TO-BE Plan

## Implementation Sub-phases

### SP1: Extend VendorRuntime Interface

**Scope:** Add optional proxy methods to `vendor-abstraction`.

**Checklist:**
- [ ] Add `getRunningModels?()` to `VendorRuntime`
- [ ] Add `unloadModel?()` to `VendorRuntime`
- [ ] Add `getLogs?()` to `VendorRuntime`

**Tests:**
- `corepack pnpm --filter @role-model-router/vendor-abstraction exec tsc --noEmit` must pass.

**Acceptance:** Interface compiles with optional methods.

### SP2: Implement Proxy Methods in vendor-llama-swap

**Scope:** Implement the three proxy methods using HTTP calls to llama-swap.

**Checklist:**
- [ ] Implement `getRunningModels()` → `GET /running`
- [ ] Implement `unloadModel(modelId?)` → `POST /api/models/unload[:modelId]`
- [ ] Implement `getLogs(noHistory?)` → `GET /logs` or `GET /logs/stream`
- [ ] All methods must handle llama-swap not running (return empty results, not throw)
- [ ] Engine type inference from command string

**Tests:**
- `corepack pnpm --filter @role-model-router/vendor-llama-swap exec tsc --noEmit` must pass.

**Acceptance:** Package compiles with new methods.

### SP3: Wire Bridge Backend to Vendor Methods

**Scope:** Replace stub implementations with real vendor calls.

**Checklist:**
- [ ] `listLocalModels()` → call `currentLlamaSwapVendor?.getRunningModels()`
- [ ] `loadLocalModel(modelId)` → call `currentLlamaSwapVendor.execute()` with chat completion request
- [ ] `unloadLocalModel(modelId?)` → call `currentLlamaSwapVendor?.unloadModel()`

**Tests:**
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc --noEmit` must pass.
- `runtime:validate-host` must pass.
- `runtime:validate-vendors` must pass.
- Bridge unit tests must pass.

**Acceptance:** All validations green.

## Traceability

| R# | Sub-phase | Changed Files |
|---|---|---|
| R1 | SP1, SP2, SP3 | `vendor-abstraction/src/index.ts`, `vendor-llama-swap/src/index.ts`, `runtime-host-bridge/src/index.ts` |
| R2 | SP2, SP3 | `vendor-llama-swap/src/index.ts`, `runtime-host-bridge/src/index.ts` |
| R3 | SP2, SP3 | `vendor-llama-swap/src/index.ts`, `runtime-host-bridge/src/index.ts` |

## Rollback

- All changes are additive (optional interface methods, new vendor functions, bridge wiring).
- Reverting requires: removing optional methods from interface, removing proxy functions from vendor, reverting bridge implementations to stubs.

---

## TODO

- [ ] Define sub-phase checklists
- [ ] Define test commands per sub-phase
- [ ] Lock document

## Coverage Gate

- All R1–R3 requirements mapped to concrete sub-phases.
- Each sub-phase has checklist, test commands, and acceptance criteria.

**Coverage: PASS**

## Approval Gate

- Plan is concrete enough for implementation.

**Approval: PASS**

LockedAt: 2026-05-10T06:15:00+08:00
LockHash: `run19-to-be-plan-locked`