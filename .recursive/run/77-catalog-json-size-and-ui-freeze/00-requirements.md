Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `00 Requirements`
Status: `DRAFT`
Inputs:
- `role-model-router/packages/catalog/data/normalized-catalog.json` (investigation target)
- `role-model-router/packages/catalog/src/index.ts` (catalog normalization logic)
- `role-model-router/packages/catalog/src/cli.ts` (catalog export pipeline)
- `role-model-router/packages/catalog/src/refresh.ts` (catalog refresh pipeline)
- `role-model-router/packages/catalog/test/index.test.ts` (catalog tests)
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (primary catalog consumer, 43 call sites)
- `role-model-router/apps/runtime-host-bridge/src/model-capability-resolver.ts` (model profile resolution)
- `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts` (downstream discovery)
- `role-model-router/apps/runtime-host-bridge/src/provider-metadata-merge.ts` (provider metadata merge)
- `role-model-router/apps/runtime-host-bridge/src/litellm-catalog.ts` (LiteLLM catalog)
- `role-model-router/packages/adapter-execution/src/index.ts` (adapter execution)
- `role-model-router/packages/endpoint-registry/src/index.ts` (endpoint registry)
- `role-model-router/packages/provider-account/src/index.ts` (provider account validation)
- `role-model-router/packages/sqlite-memory/src/index.ts` (SQLite schema and migrations)
- `role-model-router/packages/provider-openai/src/index.ts` (provider-openai)
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx` (providers page)
- `role-model-router/apps/runtime-ui/app/routes/local-peer-models.tsx` (peer models page)
- `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx` (endpoints page)
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts` (UI view helpers)
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` (UI API client)
Outputs:
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md`
Scope note: This document defines the requirements for reducing normalized-catalog.json size and eliminating UI freezes caused by oversized catalog data loading and processing. The work proceeds in three phases within this single run: payload reduction (R1-R5), SQLite-backed catalog storage replacing the in-memory Map (R6-R9), and paginated/searchable catalog APIs with UI autocomplete (R10-R11).

## Summary

The normalized catalog JSON file at `role-model-router/packages/catalog/data/normalized-catalog.json` is **5.2MB** (199,729 lines, ~3.8MB JSON string) containing 5,270 models and 146 providers. The `runtime-host-bridge` Node.js backend loads this entire file at startup via `readJson<NormalizedCatalog>()`, parses it synchronously, builds a `Map<modelId, NormalizedCatalogModel>` in memory, and holds the full catalog for the process lifetime. The catalog is referenced at **43 call sites** across the host bridge source for lookups, model resolution, provider listing, and downstream discovery.

The investigation revealed that the UI routes fetch catalog data through REST APIs (`/api/role-model/providers`, `/api/role-model/models`) which return merged catalog/provider/model data. The JSON file itself is only read by the backend at startup — but the size and processing cost causes the freeze during backend initialization, and the large in-memory structures contribute to overall runtime memory pressure.

### Key Findings from Investigation

**Data Redundancy:**
| Field | Redundancy Rate | Notes |
|---|---|---|
| `upstreamProvenance` on models | 100% duplicated (5,270×) | Identical 147-byte object on all models (~774KB wasted) |
| `upstreamProvenance` on providers | 100% duplicated (146×) | Identical 147-byte object on all providers (~21KB wasted) |
| `experimentalModes` | 99.9% contain empty `[]` | Only 6 models have non-empty experimentalModes (0.1%) |
| `requestShapeHints` | 99.9% are `null` | Only 7 models have non-null requestShapeHints (0.1%) |
| `localNotes` | 99.9% contain empty `[]` | Only 4 models have non-empty localNotes (0.1%) |
| `extendsProvenance.chain` | 100% empty `[]` | Only 1 model has a non-empty chain |
| `extendsProvenance.baseModelId` | 100% `null` | Only 1 model has a non-null baseModelId |
| `localOverrideApplied` | 98.4% are `false` | Only 84 models have model overrides (1.6%) |
| `providerKind` on models | 5,270× redundant | Derivable from `providers[]` array by `providerId` lookup |
| `authFamily` on models | 5,270× redundant | Derivable from `providers[]` array by `providerId` lookup |

**Consumer patterns discovered:**
- `model.providerKind` is accessed at runtime (line 5653 of `host-bridge/src/index.ts`: `provider?.providerKind ?? model?.providerKind ?? "remote-openai-compatible"`) — removal requires consumer updates
- `provider.providerKind` and `provider.authFamily` are accessed on provider records across 10+ locations — these stay on the provider type, unaffected
- None of the consumer packages directly access `model.upstreamProvenance` outside of test factories that already use `?? source` patterns
- `currentNormalizedCatalog.models.filter/map/find` chains are used across 15+ sites to resolve models by providerId, modelId, or provider lookup — these iterate the full 5,270-entry array every time
- `currentModelsById` is a `Map<string, NormalizedCatalogModel>` rebuilt from the full model list on every `rebuildCurrentState()` call

**Current Data Flow:**
1. Startup: `runtime-host-bridge` loads 5.2MB JSON via `readJson<NormalizedCatalog>()`
2. Synchronous `JSON.parse` of all 5,270 model entries + 146 provider entries
3. Builds `Map<string, NormalizedCatalogModel>` (5,270 entries) — triggers V8 hidden-class transitions
4. Every `rebuildCurrentState()` call re-iterates the full model list (happens on state changes, not just startup)
5. `listProviders()` filters and maps over the full catalog models array to resolve provider-scoped model IDs
6. `listModels()` calls `createRuntimeModelRecords()` which iterates the full catalog for capability profiles
7. Downstream discovery iterates the full catalog for alias resolution and Pi-compatible model records
8. Catalog stays in memory for entire process lifetime
9. UI routes fetch via REST APIs — never touch the JSON file directly

**Impact:**
- **Startup freeze:** synchronous JSON parsing of 5.2MB blocks the event loop
- **Per-rebuild cost:** building the `Map` from 5,270 entries with hidden-class allocation is expensive
- **Per-query cost:** 15+ call sites iterate the full array with `.filter()` / `.find()` / `.map()` instead of indexed lookups
- **Memory pressure:** holding 3.7MB of model objects in V8 heap (larger after object allocation overhead)
- **Aggregate UI freeze:** during initial backend startup before any UI route can render

## Requirements

### Phase 1 — Strip Redundant Fields from JSON Export (R1-R5)

Phase 1 targets the highest-impact, lowest-risk change: reducing the catalog JSON payload by ~50% through field omission. This alone removes ~774KB of duplicated `upstreamProvenance`, ~400KB+ of empty arrays and `null` values, and ~100KB+ of fully-derivable `providerKind`/`authFamily` fields.

#### R1 — Strip redundant/default fields from catalog export and types

Remove fields from the normalized catalog export whose values are redundant (derivable from other data), empty, or hold their type-level default. This includes both omission from the serialized JSON and removal from the TypeScript `NormalizedCatalogModel` interface where the field is fully redundant.

**Omit from model JSON output (conditionally — only when empty/default):**
- `experimentalModes` — omit when `[]`
- `requestShapeHints` — omit when `null`
- `localNotes` — omit when `[]`
- `localOverrideApplied` — omit when `false`
- `extendsProvenance` — omit when `{ baseModelId: null, chain: [] }`

**Remove from model JSON output (unconditionally — always redundant):**
- `upstreamProvenance` — removed from model entries; consumers use `catalog.source`

**Remove from model TypeScript type entirely:**
- `providerKind` — removed from `NormalizedCatalogModel`; derivable from `providers[]` by `providerId` lookup
- `authFamily` — removed from `NormalizedCatalogModel`; derivable from `providers[]` by `providerId` lookup

**Omit from provider JSON output (conditionally):**
- `upstreamProvenance` — omit when identical to `catalog.source`

Acceptance criteria:
- [ ] The `normalizeCatalogSnapshot()` function in `packages/catalog/src/index.ts` omits/removes the fields listed above
- [ ] The `NormalizedCatalogModel` TypeScript interface no longer declares `providerKind` or `authFamily`
- [ ] The `NormalizedCatalogModel` TypeScript interface makes `upstreamProvenance`, `experimentalModes`, `requestShapeHints`, `localNotes`, `localOverrideApplied`, and `extendsProvenance` optional (they may be absent from parsed JSON)
- [ ] RED-GREEN TDD tests are written in `packages/catalog/test/index.test.ts` that:
  - Prove models with empty/default values omit those fields from serialized output
  - Prove models with non-empty values preserve those fields in serialized output
  - Prove models with `extends` produce chain/baseModelId even though 99.9% of models won't
  - Prove models with `localOverrideApplied: true` keep it even though 98.4% don't
  - Prove `upstreamProvenance` is absent from model entries
  - Prove `providerKind` and `authFamily` are absent from model entries
  - Prove round-trip: normalize(snapshot) → serialize → deserialize → produces semantically equivalent models
- [ ] The exported `normalized-catalog.json` file is at least 40% smaller than the current 5.2MB (measured by `wc -c` or `stat` byte count)
- [ ] All existing catalog tests continue to pass with updated test factories
- [ ] `corepack pnpm run schemas:validate` continues to pass

#### R2 — Update all catalog consumers to handle field omissions and type changes

Audit and update all code that reads `NormalizedCatalogModel` fields affected by R1. Every consumer must handle the possibility that fields are absent from parsed JSON (optional types) and that `providerKind`/`authFamily` no longer exist on the model type.

Consumer packages in scope:
- `@role-model-router/runtime-host-bridge` (especially `src/index.ts`, `src/model-capability-resolver.ts`, `src/downstream-openai-discovery.ts`, `src/provider-metadata-merge.ts`, `src/litellm-catalog.ts`)
- `@role-model-router/catalog` (the normalizer itself + `src/refresh.ts`)
- `@role-model-router/endpoint-registry` (model capability access)
- `@role-model-router/protocol-routing`
- `@role-model-router/adapter-execution` (model/providerKind access at line 451)
- `@role-model-router/sqlite-memory` (telemetry record construction)
- `@role-model-router/provider-account` (providerKind/authFamily validation)
- `@role-model-router/provider-openai` (requestShapeHints access)
- `role-model-router/apps/runtime-ui` (any indirect consumers)

Specific code patterns that need updating:
- Line 5653 of `host-bridge/src/index.ts`: `provider?.providerKind ?? model?.providerKind ?? "remote-openai-compatible"` — after R1, `model` no longer has `providerKind`; must look up provider
- `adapter-execution/src/index.ts` line 451: `model.requestShapeHints` — already uses `??` but needs optional chaining after type becomes optional
- `endpoint-registry/src/index.ts` line 249: `model.requestShapeHints ? "openai" : "none"` — truthiness check already handles `undefined`
- Test factories in `host-bridge/test/model-capability-resolver.test.ts` — already use `??` defaults

Acceptance criteria:
- [ ] A grep of `model\.providerKind` and `model\.authFamily` across the non-test source returns zero matches
- [ ] A grep of `model\.upstreamProvenance` across the non-test source returns zero matches (or only accesses through `catalog.source`)
- [ ] All remaining field accesses (`requestShapeHints`, `experimentalModes`, `localNotes`, `localOverrideApplied`, `extendsProvenance`) use optional chaining or nullish coalescing with appropriate defaults
- [ ] RED-GREEN TDD tests prove each affected consumer handles absent fields correctly:
  - `providerKind`/`authFamily` lookups fall back to provider-lookup or safe defaults
  - `requestShapeHints` accesses don't throw when undefined
  - `experimentalModes` iterations don't throw when undefined (treat as `[]`)
- [ ] Existing tests in all affected packages pass unchanged (test factories updated where needed)
- [ ] `corepack pnpm --filter @role-model-router/catalog test` passes
- [ ] `corepack pnpm --filter @role-model-router/adapter-execution test` passes
- [ ] `corepack pnpm --filter @role-model-router/endpoint-registry test` passes
- [ ] `corepack pnpm --filter @role-model-router/provider-account test` passes
- [ ] `corepack pnpm --filter @role-model-router/runtime-host-bridge test` passes

#### R3 — Regenerate the catalog export and verify equivalence

Run the full catalog refresh/export pipeline against the updated normalizer and verify the regenerated `normalized-catalog.json` is valid, smaller, and functionally equivalent to the old catalog.

Acceptance criteria:
- [ ] `corepack pnpm run catalog:refresh` completes successfully
- [ ] `corepack pnpm run catalog:export` completes successfully
- [ ] The regenerated `normalized-catalog.json` is valid JSON and deserializes without errors
- [ ] A RED test proves the exported catalog has the same model count (5,270) and provider count (146) as the original
- [ ] A RED test proves the exported file byte count is ≤ 60% of the original file's byte count (≥40% reduction)
- [ ] A RED test proves every model from the old catalog has a matching model in the new catalog (same modelId, same semantic values, only field omissions differ)
- [ ] The regenerated vendor-version-ledger.json references the same upstream commit as before
- [ ] `corepack pnpm run schemas:validate` passes

#### R4 — Verify runtime bridge startup, routing, and UI behavior

Prove the runtime starts with the smaller catalog and all downstream systems (routing, vendor validation, UI routes) function correctly.

Acceptance criteria:
- [ ] The runtime host bridge starts and loads the smaller catalog without TypeScript or runtime errors
- [ ] `GET /api/role-model/providers` returns valid provider data with no missing fields the UI relies on
- [ ] `GET /api/role-model/models` returns valid model data with no missing fields the UI relies on
- [ ] The providers page (`/app/remote/providers`) loads without freeze and renders all configured accounts
- [ ] The models page loads without freeze and renders all endpoint-backed models
- [ ] The endpoints page loads without freeze
- [ ] The peer models page loads without freeze
- [ ] `corepack pnpm run runtime:validate-routing` passes
- [ ] `corepack pnpm run runtime:validate-host` passes
- [ ] `corepack pnpm run runtime:validate-vendors` passes
- [ ] `corepack pnpm run runtime:validate-ui` passes
- [ ] `corepack pnpm run runtime:validate-packaging` passes

#### R5 — Rebuilt runtime packaged verification

Build the packaged SEA binary with the smaller catalog and prove complete parity with the development runtime.

Acceptance criteria:
- [ ] `corepack pnpm run runtime:package-sea` completes successfully with the new catalog
- [ ] `corepack pnpm run runtime:validate-packaging` passes against the rebuilt binary
- [ ] The rebuilt runtime starts, `/healthz` returns healthy, and all primary UI routes render without freeze
- [ ] RED tests prove the rebuilt runtime's `GET /api/role-model/providers` and `GET /api/role-model/models` return provider and model lists semantically equivalent to the development runtime

---

### Phase 2 — Store Catalog in SQLite with Indexed Queries (R6-R9)

Once the JSON payload is reduced, the next structural improvement is replacing the in-memory `Map<string, NormalizedCatalogModel>` with SQLite-backed catalog tables. The project already uses SQLite at `packages/sqlite-memory/src/index.ts` with a migration system (`migration_receipts` table, `INITIAL_MIGRATION_ID = "run06-v1-initial-schema"`, `CURRENT_SCHEMA_VERSION = 1`). The existing schema includes tables for `provider_accounts`, `runtime_endpoints`, `runtime_observations`, `runtime_telemetry_records`, etc.

The goal is to add `catalog_providers` and `catalog_models` tables, load catalog data into them at startup, and replace all 43 `currentNormalizedCatalog` / `currentModelsById` call sites with indexed SQLite queries. This eliminates the in-memory Map entirely and removes all O(n) array iteration patterns.

#### R6 — Add catalog_providers and catalog_models SQLite tables

Add a migration-backed schema for catalog providers and models to the existing SQLite migration system, with indexes for the query patterns used by the runtime.

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS catalog_providers (
  provider_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  npm_package TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  auth_family TEXT NOT NULL,
  adapter_family TEXT NOT NULL,
  api_base TEXT NOT NULL,
  docs_url TEXT,
  env_vars_json TEXT NOT NULL,
  supported_auth_modes_json TEXT NOT NULL,
  control_plane_requirements_json TEXT NOT NULL,
  local_override_applied INTEGER NOT NULL DEFAULT 0,
  catalog_version TEXT NOT NULL,
  catalog_commit TEXT NOT NULL,
  catalog_captured_at TEXT NOT NULL,
  catalog_schema_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_models (
  model_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  version TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  modalities_json TEXT NOT NULL,
  context_window INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL,
  pricing_input_per_1m REAL,
  pricing_output_per_1m REAL,
  pricing_currency TEXT,
  request_shape_hints_json TEXT,
  experimental_modes_json TEXT,
  extends_base_model_id TEXT,
  extends_chain_json TEXT,
  local_override_applied INTEGER NOT NULL DEFAULT 0,
  local_notes_json TEXT
);

CREATE INDEX IF NOT EXISTS catalog_models_provider_idx
  ON catalog_models(provider_id);
```

**Query patterns to support (mapped from current in-memory access patterns):**
| Current Pattern | SQLite Query |
|---|---|
| `currentModelsById.get(modelId)` | `SELECT * FROM catalog_models WHERE model_id = ?` |
| `currentNormalizedCatalog.models.filter(m => m.providerId === id)` | `SELECT * FROM catalog_models WHERE provider_id = ?` |
| `currentNormalizedCatalog.models.map(m => [m.modelId, m])` | Replaced by indexed lookups on demand |
| `currentNormalizedCatalog.providers` | `SELECT * FROM catalog_providers` |
| `currentNormalizedCatalog.source` | Row in `catalog_metadata` or returned from loader |

**Public API additions to `@role-model-router/sqlite-memory`:**
- `loadCatalogIntoDatabase(db, catalog: NormalizedCatalog): Promise<void>`
- `resolveCatalogProvider(db, providerId: string): Promise<CatalogProviderRow | null>`
- `resolveCatalogModel(db, modelId: string): Promise<CatalogModelRow | null>`
- `listCatalogModelsByProvider(db, providerId: string): Promise<CatalogModelRow[]>`
- `listCatalogProviders(db): Promise<CatalogProviderRow[]>`
- `getCatalogMetadata(db): Promise<CatalogMetadata>`

Acceptance criteria:
- [ ] A migration `run77-catalog-sqlite-v1` adds `catalog_providers` and `catalog_models` tables with indexes
- [ ] The migration is idempotent (no-op if tables already exist)
- [ ] The migration is registered in `migration_receipts` with `migration_id = "run77-catalog-sqlite-v1"` and `schema_version = 2`
- [ ] `loadCatalogIntoDatabase()` inserts all providers and models from the normalized catalog, using `INSERT OR REPLACE` for idempotency on restart
- [ ] `resolveCatalogModel(modelId)` returns null for unknown model IDs without throwing
- [ ] `listCatalogModelsByProvider(providerId)` returns empty array for unknown providers without throwing
- [ ] RED-GREEN TDD tests in `packages/sqlite-memory/test/` prove: table creation, migration idempotency, data loading, indexed lookups, empty/null handling, all six public functions
- [ ] `corepack pnpm --filter @role-model-router/sqlite-memory test` passes

#### R7 — Load catalog into SQLite at startup

Wire catalog loading into the runtime startup sequence. After reading `normalized-catalog.json`, load the catalog into SQLite tables and make it available for the rest of the process lifetime.

Acceptance criteria:
- [ ] `runtime-host-bridge` startup calls `loadCatalogIntoDatabase()` after `readJson<NormalizedCatalog>()`
- [ ] Catalog loading happens inside the existing initialization path (before `rebuildCurrentState()`)
- [ ] Catalog data is re-loaded on config change (if the underlying JSON changes)
- [ ] RED-GREEN TDD tests prove: catalog loads on startup, catalog survives restart (idempotent), unknown model returns null
- [ ] `corepack pnpm --filter @role-model-router/runtime-host-bridge test` passes with catalog-loading tests

#### R8 — Replace in-memory catalog with SQLite-backed access

Replace `currentNormalizedCatalog` and `currentModelsById` with SQLite-backed catalog access functions from R6. All 43 call sites are updated.

**Key replacement patterns:**
| Current Pattern | Replacement |
|---|---|
| `currentNormalizedCatalog.models.filter(m => m.providerId === id)` | `await db.listCatalogModelsByProvider(id)` |
| `currentModelsById.get(modelId)` | `await db.resolveCatalogModel(modelId)` |
| `currentNormalizedCatalog.providers.find(p => p.providerId === id)` | `await db.resolveCatalogProvider(id)` |
| `currentNormalizedCatalog.providers` | `await db.listCatalogProviders()` |
| `currentNormalizedCatalog.source` | `await db.getCatalogMetadata()` |
| `new Map(models.map(m => [m.modelId, m]))` | Removed — Map no longer needed |

**Functions requiring async conversion:**
- `rebuildCurrentState()` — already synchronous; catalog-access calls within become async
- `listProviders()` — already async, updated to use `db.listCatalogModelsByProvider()`
- `listModels()` — calls `createRuntimeModelRecords()` which uses `resolveModelCapabilityProfile()` → must accept async catalog access
- `createRuntimeModelRecords()` — iterates registry endpoints and resolves catalog models per endpoint
- `withRuntimeEndpointFallbackModels()` — iterates accounts/models and must use indexed catalog lookups per account

Acceptance criteria:
- [ ] `currentNormalizedCatalog` variable is removed from `runtime-host-bridge/src/index.ts`
- [ ] `currentModelsById` Map is removed from `runtime-host-bridge/src/index.ts`
- [ ] All 43 call sites compile and pass typecheck after migration to SQLite-backed access
- [ ] `rebuildCurrentState()` is async and no longer builds a Map from the full model list
- [ ] `withRuntimeEndpointFallbackModels()` uses `db.listCatalogModelsByProvider()` per account instead of iterating all models
- [ ] `resolveModelCapabilityProfile()` accepts a `CatalogModelRow` or catalog access function instead of requiring `NormalizedCatalog`
- [ ] RED-GREEN TDD tests prove: providers API returns same data, models API returns same data, routing resolves models correctly, downstream discovery produces same output, capability profiles match pre-migration values
- [ ] `corepack pnpm --filter @role-model-router/runtime-host-bridge test` passes
- [ ] `corepack pnpm run runtime:validate-routing` passes
- [ ] `corepack pnpm run runtime:validate-host` passes
- [ ] `corepack pnpm run runtime:validate-vendors` passes
- [ ] `corepack pnpm run runtime:validate-ui` passes
- [ ] `corepack pnpm run runtime:validate-packaging` passes

#### R9 — Rebuilt runtime packaged verification for Phase 2

Build the packaged SEA binary with SQLite-backed catalog access and prove complete parity.

Acceptance criteria:
- [ ] `corepack pnpm run runtime:package-sea` completes successfully with SQLite catalog
- [ ] `corepack pnpm run runtime:validate-packaging` passes against the rebuilt binary
- [ ] The rebuilt runtime starts, runs catalog migration, loads catalog into SQLite, and all primary UI routes render correctly
- [ ] RED tests prove the rebuilt runtime's catalog-backed APIs return semantically equivalent data to the Phase 1 JSON-based runtime

---

### Phase 3 — Paginated/Searchable Catalog APIs and UI Autocomplete (R10-R11)

With catalog data in SQLite, the APIs no longer need to return full lists. Adding pagination and search eliminates the remaining O(n) cost of serializing and transmitting 5,270 model entries over HTTP for every provider/models API call.

#### R10 — Add paginated model listing endpoint and provider search

Add paginated catalog endpoints backed by SQLite queries with `LIMIT/OFFSET`.

**Proposed API shape:**

```
GET /api/role-model/catalog/models?providerId=openai&limit=50&offset=0&q=gpt
GET /api/role-model/catalog/models/count?providerId=openai
GET /api/role-model/catalog/providers/search?q=open
```

Response shape:
```json
{
  "data": [ModelRecord...],
  "total": 5270,
  "offset": 0,
  "limit": 50
}
```

Acceptance criteria:
- [ ] `GET /api/role-model/catalog/models` accepts `providerId`, `limit`, `offset`, and `q` query params
- [ ] `limit` defaults to 50, capped at 200; `offset` defaults to 0
- [ ] `q` filters by model_id LIKE matching; `providerId` filters by provider
- [ ] Response includes `{ data: ModelRecord[], total: number, offset: number, limit: number }`
- [ ] `GET /api/role-model/catalog/models/count` returns fast count without loading all rows
- [ ] `GET /api/role-model/catalog/providers/search?q=` returns filtered providers by display_name LIKE matching
- [ ] Invalid query params (negative limit, invalid providerId, etc.) return 400
- [ ] The existing `GET /api/role-model/models` and `GET /api/role-model/providers` continue to work for backward compatibility (delegate to paginated endpoints internally)
- [ ] RED-GREEN TDD tests prove: pagination boundaries, empty results, invalid params (400), text search matching, count accuracy, backward compatibility
- [ ] `corepack pnpm --filter @role-model-router/runtime-host-bridge test` passes

#### R11 — Replace full model list with searchable autocomplete in UI

Replace the full `<select>` dropdown on the providers page with a searchable autocomplete input that queries the paginated catalog model endpoint. The current dropdown renders all model IDs for a selected provider — with the providers page already listed as freezing in the original issue, this replaces the O(n) DOM rendering with lazy type-ahead completion.

Acceptance criteria:
- [ ] The model selector on `/app/remote/providers` is replaced with a searchable text input
- [ ] Typing triggers a debounced query (250ms) to `GET /api/role-model/catalog/models?providerId=...&q=...&limit=20`
- [ ] Results render in a dropdown list below the input
- [ ] Selecting a result populates the model ID field and closes the dropdown
- [ ] Loading state is shown while the query is in flight
- [ ] Error state is shown if the query fails
- [ ] Empty state ("No models match your search") is shown when results are empty
- [ ] Keyboard navigation works (arrow keys, enter to select, escape to close)
- [ ] The existing model role picker and all downstream save/OAuth logic is unaffected
- [ ] RED-GREEN TDD tests prove: debounce timing, result rendering, selection binding, loading/error/empty states, keyboard navigation

---

### Out of Scope

Nothing is deferred. All three phases (payload reduction, SQLite storage, paginated APIs with UI autocomplete) are in-scope for this run.

## Constraints

- TDD discipline is mandatory for this run. Every requirement must have failing (RED) tests written before implementation (GREEN).
- The `NormalizedCatalog` TypeScript types can change — what matters is that all consumers compile and function correctly after the change. Type narrowing to remove `providerKind`/`authFamily` from models is allowed and expected.
- The existing catalog export pipeline (`catalog:refresh`, `catalog:export`) must continue to work.
- The existing verification floor (`schemas:validate`, `runtime:validate-routing`, `runtime:validate-host`, `runtime:validate-vendors`, `runtime:validate-ui`, `runtime:validate-packaging`) must pass after each phase.
- Packaged runtime verification is mandatory after each phase.
- Catalog data integrity must be preserved end-to-end: the same 5,270 models and 146 providers with the same semantic values must be accessible whether loaded from JSON, SQLite, or paginated APIs.

## TODO

- [ ] R1: Strip redundant/default fields from catalog export and types (with RED-GREEN TDD)
- [ ] R2: Update all catalog consumers to handle field omissions and type changes (with RED-GREEN TDD)
- [ ] R3: Regenerate the catalog export and verify equivalence (with RED-GREEN TDD)
- [ ] R4: Verify runtime bridge startup, routing, and UI behavior
- [ ] R5: Rebuilt runtime packaged verification (Phase 1)
- [ ] R6: Add catalog_providers and catalog_models SQLite tables
- [ ] R7: Load catalog into SQLite at startup
- [ ] R8: Replace in-memory catalog with SQLite-backed access
- [ ] R9: Rebuilt runtime packaged verification (Phase 2)
- [ ] R10: Add paginated model listing endpoint and provider search
- [ ] R11: Replace full model list with searchable autocomplete in UI

## Coverage Gate

Coverage: PASS

All investigation findings are mapped to requirements across three phases: field redundancy and type changes (R1-R2), pipeline regeneration (R3), behavioral verification (R4), rebuilt runtime proof (R5, R9), SQLite catalog tables and indexed lookups (R6-R7), in-memory Map removal and 43 call-site migration (R8), paginated APIs (R10), and UI autocomplete (R11). Each requirement has concrete acceptance criteria with checkable items, specific file paths, line numbers, and SQL schema definitions. The three-phase structure eliminates the freeze progressively: Phase 1 cuts payload by ~50%, Phase 2 removes the full in-memory array, Phase 3 eliminates O(n) API serialization.

## Approval Gate

Approval: PASS

The requirements are:
- **Systematic:** progressive phases — payload reduction → SQLite storage → paginated delivery — each building on the previous
- **Future-proof:** optional-type pattern (R1) extends to new fields; centralized SQLite access functions (R6-R7) are a stable abstraction layer; paginated API contract (R10) is documented
- **Extensible:** new catalog-access patterns go through the SQLite query functions from R6, not through ad-hoc JSON parsing or array iteration
- **Consistent:** follows TDD discipline, verification floor, and rebuilt-runtime gates as runs 62–76
- **Comprehensive:** covers models, providers, TypeScript types, JSON serialization, 12+ consumer packages, 43 host-bridge call sites, SQLite migration, 6 new catalog access functions, 2 new paginated API endpoints, UI autocomplete component, and rebuilt-runtime verification across all three phases
- **Thorough:** 200+ lines of checkable acceptance criteria with specific file paths, line numbers, SQL schema definitions, API shapes, and current-code-to-new-code replacement tables

Ready to proceed to Phase 1.
