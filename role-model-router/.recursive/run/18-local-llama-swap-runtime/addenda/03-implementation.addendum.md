# Run 18 Addendum: Local llama-swap Runtime — Implementation

## SP1: DESIGN_SYSTEM.md + Sidebar Navigation + Stub Routes

### Changes
- **DESIGN_SYSTEM.md**: Added "Local" section to the navigation model with three routes:
  - `models` — Registry detail template, loaded model cards with load/unload
  - `swap` — Ledger inspector template, event chronology
  - `policy` — Registry detail template, editable policy form
- **routes.ts**: Added `/app/local/models`, `/app/local/swap`, `/app/local/policy`
- **app-shell.tsx**: Added "Local" navigation section (icon: `Cpu`) between Studio and Control
- **Stub routes**: Created `local-models.tsx`, `local-swap.tsx`, `local-policy.tsx` with correct imports

### Commit
`ba61fb0` — `feat(ui): add Local section navigation and stub routes (SP1)`

## SP2: Bridge API for Local Runtime State

### Changes
- **RuntimeBridgeBackend interface**: Added 6 new methods:
  - `listLocalModels()` → `readonly { modelId, loadedAt, engine }[]`
  - `loadLocalModel(modelId)` → `{ success: boolean }`
  - `unloadLocalModel(modelId?)` → `{ success: boolean }`
  - `readLocalPolicy()` → `Record<string, unknown>`
  - `updateLocalPolicy(body)` → `Record<string, unknown>`
  - `listSwapHistory()` → `readonly { timestamp, oldModel, newModel, reason }[]`
- **Bridge backend implementation**: Stub implementations in `createRuntimeBridgeBackend` return empty defaults
- **HTTP routes**: Added to `createRequestHandler`:
  - `GET /api/role-model/local/models`
  - `POST /api/role-model/local/models/:modelId/load`
  - `POST /api/role-model/local/models/:modelId/unload`
  - `POST /api/role-model/local/models/unload`
  - `GET /api/role-model/local/policy`
  - `PUT /api/role-model/local/policy`
  - `GET /api/role-model/local/swap`
- **StartBridgeServerOptions**: Added optional callbacks for all 6 methods
- **start-for-qa.ts**: Wired all new methods through to `startBridgeServer`
- **runtime-api.ts**: Added frontend helpers:
  - `fetchLocalModels()`, `loadLocalModel()`, `unloadLocalModel()`
  - `fetchLocalPolicy()`, `updateLocalPolicy()`
  - `fetchSwapHistory()`

### Commit
`ba61fb0` — `feat(bridge): add local runtime state API endpoints (SP2)`

## SP3–SP5: Local Runtime Pages

### local-models.tsx
- Loaded model cards with engine, loaded-at timestamp, status pill
- Reload and Unload buttons per model
- "Unload all models" quick action
- Refresh button in page header
- Empty state: "No models currently loaded. Send a request or load a model manually."

### local-swap.tsx
- Chronological event ledger
- Each event shows: timestamp, reason badge, oldModel → newModel transition
- Empty state: "No swap events recorded yet."

### local-policy.tsx
- Editable form: TTL (seconds), Max concurrency, Auto-unload checkbox
- Save / Reset buttons
- Raw policy inspector (read-only JSON)
- Empty state when no policy configured

### Design
- All pages follow Swiss design system:
  - Zero-radius cards (`rounded-none`)
  - Accent red (`#C8102E`) for primary actions
  - Uppercase tracking labels (`tracking-[0.24em]`)
  - Muted panels for data display
  - `PageHeader` with eyebrow/title/description pattern

### Commit
`9a10319` — `feat(ui): build local runtime pages (SP3–SP5)`

## SP6: Browser Verification

### Issue Discovered
Local API routes were added **after** the static file serving block in `createRequestHandler`. The SPA fallback (`index.html`) was catching `/api/role-model/local/*` paths and returning HTML instead of JSON.

### Fix
Moved all `/api/role-model/local/*` routes **before** the static file serving block so API paths take precedence over the SPA fallback.

### Screenshots
- **Local Models** (`/app/local/models`): Shows "Loaded models" with empty state and quick actions
- **Local Swap** (`/app/local/swap`): Shows "Swap history" with empty state
- **Local Policy** (`/app/local/policy`): Shows "Host policy" with TTL (300), Max concurrency (1), Auto-unload toggle, Save/Reset buttons

### Commit
`019052f` — `fix(bridge): move local API routes before static file serving`

## Validation Results

| Command | Result |
|---------|--------|
| `runtime:validate-host` | ✅ PASS |
| `runtime:validate-vendors` | ✅ PASS |
| `runtime:validate-ui` | ✅ PASS |
| `schemas:validate` | ✅ PASS (19 schemas, 28 fixtures) |
| `smoke` | ✅ PASS |
| Bridge tests | ✅ 45/45 passed (10 test files) |

## Out of Scope (Deferred)

As specified in requirements OOS1–OOS4:
- **Matrix solver UI**: No concurrent model matrix visualization
- **Peer passthrough**: No peer llama-swap integration
- **Model-level overrides**: No per-model TTL or context-window overrides
- **Real-time log streaming**: No WebSocket log feed from llama-swap

## Next Steps (Future Runs)

1. **Wire local API to actual llama-swap runtime**: Replace stub implementations with real proxy calls to llama-swap's `GET /running`, `POST /api/models/unload`, etc.
2. **Add SQLite persistence for swap events**: Create `llama_swap_events` table, write on model load/unload
3. **Add model load triggers**: When a user sends a chat request targeting a local model, auto-load it via the bridge
4. **Real-time model state**: Poll or WebSocket for live loaded model updates
