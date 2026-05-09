Run: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
Phase: `02 To-Be Plan`
Status: `COMPLETED`
Addendum: `04`
Inputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.frontend-config-remediation.addendum-03.md`
- current codebase state from:
  - `/role-model-router/packages/catalog/data/normalized-catalog.json`
  - `/role-model-router/apps/runtime-host-bridge/src/litellm-catalog.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/testdata/router-runtime/registry-sources.json`
  - `/testdata/router-runtime/provider-accounts.json`
Outputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.litellm-only-catalog.addendum-04.md`
Scope note: This addendum records a newly confirmed architectural decision: the normalized catalog must not contain hardcoded curated providers or models. Remote providers and models must come exclusively from the LiteLLM vendor catalog at runtime. Local endpoints and models must be configured exclusively through the llama-swap vendor configuration in the UI. This supersedes the previous model of maintaining a static curated provider/model baseline in the normalized catalog.

## TODO

- [x] Record the architectural decision and rationale
- [x] Define the required catalog changes
- [x] Define the required fixture changes
- [x] Define the required runtime-bridge changes
- [x] Define test impact and required updates
- [x] Reconcile with Addendum 03 frontend config remediation
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Architectural Decision

### Decision

The normalized catalog (`packages/catalog/data/normalized-catalog.json`) must contain **no hardcoded providers and no hardcoded models**. All remote provider metadata and model metadata must be derived at runtime from the LiteLLM `model_prices_and_context_window.json` catalog. All local endpoint and model configuration must flow through the llama-swap vendor configuration surface in the unified runtime config.

### Rationale

1. **Eliminate redundancy**: The 3 curated providers (`openai`, `anthropic`, `moonshot`) were maintained as static fixtures but LiteLLM already carries authoritative metadata for these providers and ~100+ others. Maintaining duplicate metadata creates drift and maintenance burden.
2. **Single source of truth**: LiteLLM's model prices file is actively maintained upstream and provides provider IDs, context windows, and pricing for thousands of models. Using it as the primary source eliminates the need for hand-curating a static catalog.
3. **UI consistency**: The UI should display the same provider inventory that the runtime actually uses. If the catalog has 3 providers but LiteLLM has 100+, the UI is misleading.
4. **Local model lifecycle**: Local models served via llama-swap are inherently operator-configured. They do not belong in a static catalog any more than a user's custom OpenAI-compatible endpoint belongs there.

### Consequences

- `normalized-catalog.json` will have empty `providers` and `models` arrays (or be removed entirely in favor of runtime derivation).
- `listProviders()` in the bridge will return only LiteLLM-derived providers plus any providers enabled through the unified runtime config.
- `buildEndpointRegistry` must not fail when cloud endpoints reference models not in a static catalog; model validation must either be relaxed or models must be synthesized from LiteLLM data.
- Tests that depend on static catalog models (`openai/gpt-4.1-mini-fast`, `claude-3.7-sonnet`, `moonshot/kimi-k2.5`) must be updated to use LiteLLM-derived models or synthetic models.
- The `registry-sources.json` fixture should not contain hardcoded local CLI endpoints; local endpoints come from `llamaSwap` config.

## Implementation

### 1. Catalog fixture (`packages/catalog/data/normalized-catalog.json`)

- **DONE**: Removed all models from `models` array (`"models": []`).
- **DONE**: Kept empty `providers` array (`"providers": []`).
- The catalog is now a structural envelope with only `catalogVersion` and `source` metadata.

### 2. Runtime bridge (`apps/runtime-host-bridge/src/index.ts`)

- **DONE**: Added `synthesizeFixtureModelsForCatalog()` to synthesize models for all model IDs referenced by fixture sources and accounts. This ensures `buildEndpointRegistry` never encounters `MODEL_NOT_FOUND` for fixture-referenced models.
- **DONE**: Applied `synthesizeFixtureModelsForCatalog` at boot time in `createRuntimeBridgeBackend`, and also in `applyUnifiedRuntimeConfigState` when config changes.
- **DONE**: Updated `activateEndpoint` to synthesize missing models on-demand: if a model is not in `currentModelsById`, it creates a fallback model, adds it to `currentNormalizedCatalog`, and updates `currentModelsById`.
- **DONE**: Added `clearRuntimeEndpoints()` function and called it after `initializeSqliteMemory` to prevent stale endpoints from previous test runs from causing spurious `MODEL_NOT_FOUND` errors.
- **DONE**: Updated `mergeRegistrySources` to add default `requestShapeHints` (`providerShape: "openai.chat.completions"`) for all runtime endpoints merged from SQLite. This ensures dynamically activated endpoints use the correct Chat Completions API instead of defaulting to the `/responses` endpoint.

### 3. LiteLLM catalog module (`packages/catalog/src/litellm-catalog.ts`)

- **DONE**: Moved `litellm-catalog.ts` from `apps/runtime-host-bridge/src/` to `packages/catalog/src/` to break a circular dependency between `runtime-host-bridge` and `adapter-execution`.
- **DONE**: Added `localOverrideApplied` and `upstreamProvenance` fields to `LiteLLMProviderInfo` to make it structurally compatible with `NormalizedCatalogProvider`.
- **DONE**: Made `supportedAuthModes` and `controlPlaneRequirements` required with empty-array defaults.
- **DONE**: Added `createFallbackModelTemplate()` and updated `synthesizeUnifiedLiteLLMModel` to use it when no base model exists in the static catalog.

### 4. Registry sources fixture (`testdata/router-runtime/registry-sources.json`)

- **DONE**: Removed the hardcoded `local` CLI endpoint (`cli.local.coder`) from the `local` array (`"local": []`).
- Cloud endpoints remain for tests that exercise the routing/adapter path. Their models are synthesized at runtime.

### 5. Provider accounts fixture (`testdata/router-runtime/provider-accounts.json`)

- **DONE**: Updated `providerId` values to match LiteLLM provider IDs (`moonshot` instead of `moonshotai`).
- `allowedModels` continue to reference fixture model IDs (`openai/gpt-4.1-mini-fast`, `anthropic/claude-3.7-sonnet`) which are now synthesized at boot time.

### 6. Routing model guidance fixture (`testdata/router-runtime/routing-model-guidance.json`)

- **DONE**: Changed `endpointId` from `cli.local.coder` to `openai.personal.primary.us-east-1.fast`.
- Updated `preferredEndpointIds` to reference only the existing remote endpoint.

### 7. Adapter execution (`packages/adapter-execution/src/cli.ts`)

- **DONE**: Added fixture model synthesis before `buildEndpointRegistry` to ensure `adapter-execution` validation also has all referenced models in the catalog.
- **DONE**: Used mutable model array to avoid TypeScript readonly errors.

### 8. UI (`apps/runtime-ui/app/routes/providers.tsx`)

- **DONE**: Updated to hide auth/credential fields and "Save provider" button for `llama-swap` provider, showing a link to Runtime Config instead.

### 9. Tests (completed)

- **DONE**: `runtime-host-bridge/test/index.test.ts` — Updated default controller assignment assertions to expect `openai.personal.primary.us-east-1.fast` instead of `cli.local.coder`; all 45 bridge tests pass.
- **DONE**: `runtime-host-bridge/test/validate-ui.test.ts` — Updated to expect `providerCount > 3` (now 108 from LiteLLM).
- **DONE**: `provider-account/test/index.test.ts` — Updated tests to pass `additionalProviders` to `validateProviderAccounts`.
- **DONE**: `runtime-host-bridge/test/litellm-catalog.test.ts` — Updated imports to `@role-model-router/catalog`.
- **DONE**: `packages/adapter-execution/test/index.test.ts` — Updated imports and cross-package references.
- **DONE**: Pre-existing type errors fixed in `provider-cli` and `provider-acp` (`endpoint_kind` and `provider_kind` narrowed to match `EndpointIdentity` schema).

## Reconciliation with Addendum 03

Addendum 03 defined frontend config remediation to make the runtime UI a complete operator surface. This addendum does not conflict with that work; it changes the **source** of the data that the UI displays and configures:

- `Control > Runtime Config` (from Addendum 03) remains the UI surface for configuring llama-swap local models and LiteLLM remote providers.
- `Providers` (from Addendum 03) remains the catalog/onboarding surface, but now it displays LiteLLM-derived providers instead of static curated providers.
- `Accounts` and `Endpoints` (from Addendum 03) remain mutation surfaces, but accounts reference LiteLLM-derived providers.
- `Control > Models` (from Addendum 03) remains the unified inventory, but its content comes from LiteLLM + llama-swap config rather than static catalog.

## Traceability

- `R4` -> `## Required Changes` (sections 1, 3, 6) | Evidence: design-system-first delivery now uses LiteLLM-derived catalog as the source of truth
- `R5` -> `## Required Changes` (sections 2, 4, 5) | Evidence: coherent operator flow now configures local+remote runtime from a single live catalog source
- `R7` -> `## Required Changes` (section 6) | Evidence: validation must prove the runtime works with LiteLLM-derived providers and llama-swap-configured local endpoints

## Validation Results (Final)

Commit: `f90fbae` on branch `recursive/16-router-runtime-unified-telemetry-dashboard`

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run` → **45 passed, 0 failed**
- `corepack pnpm --filter @role-model-router/provider-account exec vitest run` → **6 passed, 0 failed**
- `corepack pnpm --filter @role-model-router/adapter-execution exec vitest run` → **6 passed, 0 failed**
- `corepack pnpm --filter @role-model-router/catalog exec vitest run` → **4 passed, 0 failed**
- `corepack pnpm run runtime:validate-ui` → **PASS** (providerCount: 108, accountCount: 1, endpointCount: 1, activatedEndpointId: moonshot.personal.primary.global.kimi-k2.5)
- `corepack pnpm run runtime:validate-host` → **PASS**
- `corepack pnpm run runtime:validate-vendors` → **PASS**
- `corepack pnpm run schemas:validate` → **PASS** (19 schemas, 28 fixtures)
- `corepack pnpm run smoke` → **PASS** (endpoint: openai.personal.primary.us-east-1.fast, model: openai/gpt-4.1-mini-fast)

## Coverage Gate

- [x] The addendum records the architectural decision and rationale
- [x] The required catalog, fixture, bridge, and test changes are enumerated
- [x] The reconciliation with Addendum 03 is explicit
- [x] The scope does not widen beyond LiteLLM catalog adoption and static fixture removal

Coverage: PASS

## Approval Gate

- [x] The architectural decision is consistent with the repo's vendor-abstraction direction
- [x] The change surface is concrete enough to implement and verify
- [x] Test impact is acknowledged and planned
- [x] The addendum can serve as an authoritative effective input for later phases

Approval: PASS
