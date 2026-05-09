Run: `/.recursive/run/18-local-llama-swap-runtime/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
Inputs:
- `/.recursive/run/18-local-llama-swap-runtime/00-requirements.md`
- `/.recursive/run/18-local-llama-swap-runtime/01-as-is.md`
Outputs:
- `/.recursive/run/18-local-llama-swap-runtime/02-to-be-plan.md`
Scope note: Define the implementation plan for exposing llama-swap dynamic runtime state through the role-model UI.

---

# Run 18: Local llama-swap Runtime — TO-BE Plan

## Implementation Sub-phases

### SP1: DESIGN_SYSTEM.md + Sidebar Navigation + Stub Routes

**Scope:** Add Local section to design system, sidebar, and route stubs.

**Checklist:**
- [ ] Add `localModelsRoute`, `localSwapRoute`, `localPolicyRoute` to `design-system.ts`
- [ ] Add "Local" navigation section between Studio and Control
- [ ] Add routes to `routes.ts`: `/app/local/models`, `/app/local/swap`, `/app/local/policy`
- [ ] Create stub route files: `local-models.tsx`, `local-swap.tsx`, `local-policy.tsx`
- [ ] Update `DESIGN_SYSTEM.md` navigation model

**Tests:**
- `corepack pnpm --filter @role-model-router/runtime-ui build` must pass.
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run` must pass.

**Acceptance:** Browser navigation to `/app/local/models` shows stub page with correct layout.

### SP2: Bridge API for Local Runtime State

**Scope:** Add backend methods and HTTP routes for local runtime state.

**Checklist:**
- [ ] Add `listLocalModels`, `loadLocalModel`, `unloadLocalModel`, `readLocalPolicy`, `updateLocalPolicy`, `listSwapHistory` to `RuntimeBridgeBackend` interface
- [ ] Implement stub methods in `createRuntimeBridgeBackend`
- [ ] Add HTTP routes in `createRequestHandler`
- [ ] Add methods to `StartBridgeServerOptions`
- [ ] Wire methods in `start-for-qa.ts`
- [ ] Add frontend API helpers in `runtime-api.ts`

**Tests:**
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc --noEmit` must pass.
- `corepack pnpm --filter @role-model-router/runtime-ui exec tsc --noEmit` must pass.
- `curl http://127.0.0.1:3456/api/role-model/local/models` must return `[]`.

**Acceptance:** All local API endpoints return JSON (not HTML from SPA fallback).

### SP3: Local Models Page

**Scope:** Build the loaded models page with cards and controls.

**Checklist:**
- [ ] Fetch from `/api/role-model/local/models`
- [ ] Render model cards with modelId, engine, loadedAt
- [ ] Add Reload and Unload buttons per model
- [ ] Add "Unload all models" quick action
- [ ] Add Refresh button in page header
- [ ] Empty state when no models loaded

**Tests:**
- Page renders without errors.
- Buttons trigger correct API calls.

**Acceptance:** Browser shows model cards (or empty state) with Swiss design.

### SP4: Swap History Page

**Scope:** Build the swap event ledger page.

**Checklist:**
- [ ] Fetch from `/api/role-model/local/swap`
- [ ] Render chronological event list
- [ ] Show timestamp, reason badge, old→new model transition
- [ ] Empty state when no events

**Tests:**
- Page renders without errors.

**Acceptance:** Browser shows event ledger (or empty state) with Swiss design.

### SP5: Local Policy Page

**Scope:** Build the editable policy page.

**Checklist:**
- [ ] Fetch from `/api/role-model/local/policy`
- [ ] Render TTL (seconds) input
- [ ] Render Max concurrency input
- [ ] Render Auto-unload checkbox
- [ ] Add Save and Reset buttons
- [ ] Add raw policy JSON inspector
- [ ] Empty state when no policy configured

**Tests:**
- Page renders without errors.
- Save triggers PUT to `/api/role-model/local/policy`.

**Acceptance:** Browser shows editable policy form with Swiss design.

### SP6: Browser Verification

**Scope:** Verify all three pages in browser with screenshots.

**Checklist:**
- [ ] Navigate to `/app/local/models` and screenshot
- [ ] Navigate to `/app/local/swap` and screenshot
- [ ] Navigate to `/app/local/policy` and screenshot
- [ ] Verify Swiss design compliance on all pages

**Tests:**
- All pages load without 404s.
- All API calls return correct JSON.

**Acceptance:** Screenshots prove correct rendering.

## Traceability

| R# | Sub-phase | Changed Files |
|---|---|---|
| R1 | SP1 | `design-system.ts`, `app-shell.tsx`, `routes.ts` |
| R2 | SP3 | `local-models.tsx`, `runtime-api.ts` |
| R3 | SP4 | `local-swap.tsx`, `runtime-api.ts` |
| R4 | SP5 | `local-policy.tsx`, `runtime-api.ts` |
| R5 | SP2 | `index.ts` (bridge), `start-for-qa.ts`, `runtime-api.ts` |
| R6 | SP1 | `DESIGN_SYSTEM.md` |
| R7 | SP6 | Browser screenshots |

## Rollback

- All changes are additive (new routes, new API endpoints, new pages).
- Removing the Local section requires reverting: `design-system.ts`, `routes.ts`, `app-shell.tsx`, and deleting three route files.
- Bridge API changes are backward-compatible (new optional methods).

---

## Coverage Gate

- All R1–R7 requirements are mapped to concrete sub-phases.
- Each sub-phase has a checklist, test commands, and acceptance criteria.

**Coverage: PASS**

## Approval Gate

- Plan is concrete enough for implementation.
- Sub-phases are ordered sequentially with clear acceptance criteria.

**Approval: PASS**

LockedAt: 2026-05-10T04:11:00+08:00
LockHash: `run18-to-be-plan-locked`