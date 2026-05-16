# Run: `32-router-runtime-routing-operator-surface`

## Phase: `03 Implementation Summary`

Status: `COMPLETE`

## Summary

- Implemented a first-class `Router` section in the runtime shell navigation and route family:
  - `/app/router`
  - `/app/router/config`
  - `/app/router/candidates`
  - `/app/router/decisions`
  - `/app/router/decisions/:requestId`
- Extended the repo-owned runtime design system and route metadata so Router is planned as a primary section with shared tabs, page templates, and loading/error/empty states before page implementation.
- Added structured backend Router APIs under `/api/role-model/router/` for summary, config, candidates, decisions, and decision detail so the frontend no longer scrapes raw request bundles inline.
- Added typed frontend runtime API client fetchers and route modules for Router overview, config, candidates, decisions, and decision-detail surfaces.
- Preserved ownership boundaries:
  - `Control` remains the editing/configuration surface.
  - `Observe` remains the raw telemetry and request-trace surface.
  - `Router` now owns routing explanation, provenance, candidate comparison, and decision interpretation.

## Implementation slices

### 1. Design-system-first Router contract

- Updated `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- Updated `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- Updated `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- Added Router navigation metadata, route definitions, and dynamic decision-detail route matching before page implementation.

### 2. Backend Router API family

- Updated `role-model-router/apps/runtime-host-bridge/src/index.ts`
- Updated `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- Added:
  - `GET /api/role-model/router/summary`
  - `GET /api/role-model/router/config`
  - `GET /api/role-model/router/candidates`
  - `GET /api/role-model/router/decisions`
  - `GET /api/role-model/router/decisions/:requestId`
- Reused existing runtime state and observability sources for guidance, candidates, request observations, endpoint profiles, and decision diagnostics instead of creating a parallel decision store.

### 3. Frontend Router client and pages

- Updated `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- Updated `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- Updated `role-model-router/apps/runtime-ui/app/routes.ts`
- Added:
  - `role-model-router/apps/runtime-ui/app/routes/router.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-config.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`

### 4. Live-QA integration hardening

- Updated `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- Extended `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- Refactored the QA launcher into testable helpers, switched its fixture root to `testdata/router-runtime/fixtures`, and passed the Router API readers into `startBridgeServer`.
- This fixed the live-QA gap where the runtime came up without populated registry fixtures and without the Router API family exposed through the QA bootstrap.

### 5. Post-review hardening

- Updated `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`
- Fixed a stale-response race so late fetch completions from a previous `requestId` can no longer overwrite the active decision-detail page after fast navigation.

## Requirement coverage

- `R1`: satisfied by the primary Router section, route family, and section tabs.
- `R2`: satisfied by the backend `/api/role-model/router/*` APIs plus typed frontend fetchers.
- `R3`: satisfied by the Router config/provenance surface and honest unavailable handling.
- `R4`: satisfied by the unified local-plus-remote candidate inventory with guidance posture and observed-signal slots.
- `R5`: satisfied by the Router decision ledger, detail drill-in, selection reasoning, diagnostics, and Observe handoff.
- `R6`: satisfied by the design-system-first update and Router route metadata/tests before page implementation.
- `R7`: satisfied by preserving Control and Observe while adding Router as the explanation surface.
- `R8`: satisfied by targeted RED/GREEN coverage plus focused package validation and baseline-aware root verification.
- `R9`: satisfied by launching the live runtime, seeding a routed request, and proving the Router pages in the browser.
