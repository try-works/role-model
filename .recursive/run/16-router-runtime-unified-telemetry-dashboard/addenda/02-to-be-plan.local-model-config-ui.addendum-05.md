Run: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
Phase: `02 To-Be Plan`
Status: `COMPLETED`
Addendum: `05`
Inputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.litellm-only-catalog.addendum-04.md`
- current codebase state from:
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
Outputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.local-model-config-ui.addendum-05.md`
Scope note: This addendum implements a form-based local model configuration UI in the Providers page, allowing users to add, edit, and remove llama-swap local models without touching raw JSON. Local endpoints are displayed in the Endpoints page alongside remote endpoints.

## TODO

- [x] Add local model CRUD form to Providers page when llama-swap is selected
- [x] Add runtime config fetch/load to Providers page state
- [x] Add local model endpoints to the "Configured provider connections" panel
- [x] Verify all validation commands still pass
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Implementation

### 1. Providers Page (`apps/runtime-ui/app/routes/providers.tsx`)

- **DONE**: Added imports for `fetchRuntimeConfig`, `updateRuntimeConfig`, `RuntimeConfig`, `RuntimeConfigModel`, `RuntimeConfigRecord`
- **DONE**: Added state variables:
  - `configRecord` — current runtime config from the bridge
  - `localModels` — mutable copy of `llamaSwap.models` being edited
  - `savingLocalModels` — loading state for the save action
- **DONE**: Updated `load()` to fetch both `fetchRuntimeSnapshot()` and `fetchRuntimeConfig()` in parallel, and sync `localModels` from the config
- **DONE**: Added `addLocalModel()` — appends an empty model template to the `localModels` array
- **DONE**: Added `updateLocalModel(index, field, value)` — updates a specific field of a model at the given index
- **DONE**: Added `removeLocalModel(index)` — removes a model from the array
- **DONE**: Added `onSaveLocalModels()` — validates models (modelId and path must be non-empty), calls `updateRuntimeConfig` with the modified `llamaSwap.models`, then refreshes the snapshot
- **DONE**: Replaced the llama-swap redirect panel with a full local model form:
  - Shows each model in a card with fields: modelId, path, contextWindow, command, proxyBaseUrl, checkEndpoint, useModelName
  - Each card has a Remove button
  - Bottom buttons: "Add model", "Update local models", "Advanced process config" (links to Runtime Config)
- **DONE**: Updated the "Configured provider connections" right panel to also show llama-swap endpoints (which don't have accounts) alongside provider accounts

### 2. Backend Bridge (`apps/runtime-host-bridge/src/index.ts`)

- **NO CHANGES REQUIRED**: `listProviders()` already synthesizes the `llama-swap` provider with modelIds from `currentUnifiedRuntimeConfig.llamaSwap.models`
- **NO CHANGES REQUIRED**: `createUnifiedLocalSources()` already creates endpoint registry entries from the config
- **NO CHANGES REQUIRED**: `applyUnifiedRuntimeConfigState()` already starts the llama-swap vendor and rebuilds the registry

### 3. Endpoints Page (`apps/runtime-ui/app/routes/endpoints.tsx`)

- **NO CHANGES REQUIRED**: Local endpoints already appear in the endpoint table via `buildEndpointCatalogRows`
- **NO CHANGES REQUIRED**: `buildConfiguredProviderRows` already groups endpoints by providerId, including `llama-swap`

## Validation Results

Commit: `TBD` on branch `recursive/16-router-runtime-unified-telemetry-dashboard`

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run` → **45 passed, 0 failed**
- `corepack pnpm run runtime:validate-ui` → **PASS** (providerCount: 108, endpointCount: 1)
- `corepack pnpm run runtime:validate-host` → **PASS**
- `corepack pnpm run schemas:validate` → **PASS** (19 schemas, 28 fixtures)
- `corepack pnpm run smoke` → **PASS**
- TypeScript build (`tsc --noEmit` in runtime-ui) → **Clean**

## Coverage Gate

- [x] The addendum records the architectural decision and rationale
- [x] The required UI changes are enumerated and implemented
- [x] The reconciliation with Addendum 04 is explicit (local models complement the LiteLLM-only catalog)
- [x] The scope does not widen beyond local model configuration UI

Coverage: PASS

## Approval Gate

- [x] The UX is consistent with remote provider onboarding (same page, different form)
- [x] The change surface is concrete enough to implement and verify
- [x] Test impact is acknowledged and all tests pass
- [x] The addendum can serve as an authoritative effective input for later phases

Approval: PASS
