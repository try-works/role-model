Run: `/.recursive/run/32-router-runtime-routing-operator-surface/`
Phase: `01 AS-IS`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Audit mode: `self-audit`
Inputs:
- `/.recursive/run/32-router-runtime-routing-operator-surface/00-requirements.md`
- `/.recursive/run/32-router-runtime-routing-operator-surface/00-worktree.md`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`

## Summary

The refreshed baseline already contains meaningful routing visibility, but it is split across Control and Observe. The runtime app has no first-class Router section, no Router route family, no Router tab model, and no Router-specific frontend API contract. The backend likewise exposes runtime/config/controller/request/telemetry primitives, but no `/api/role-model/router/*` family that packages routing configuration, candidate posture, or explainable decisions into stable frontend-facing shapes.

## Current UI Surface Inventory

### Navigation and design-system state

- `app/routes.ts` registers Control, Observe, Integrations, System, Local, Studio, and Overview routes only.
- `app/lib/design-system.ts` defines the corresponding navigation groups and templates.
- The only dedicated routing page in navigation is `/app/control/routing-strategy`.
- There is no `Router` section, no `/app/router*` routes, and no section-local tab model for routing workflows.

### Existing routing-focused pages

- `/app/control/routing-strategy`
  - already gives a structured posture view for routing strategy, execution mode, controller state, and links into adjacent config surfaces
  - useful baseline material for Router overview/config
- `/app/observe/requests`
  - already surfaces recent request rows and some routing decision labels
- `/app/observe/requests/:requestId`
  - already renders rich routing diagnostics from the request observation bundle, including:
    - routing mode
    - rewrite diagnostics
    - difficulty routing
    - controller routing
    - hybrid arbitration
  - remains the deepest raw trace/capture inspection surface

### Current UI gap against requirements

- No first-class Router section (`R1`)
- No Router overview/config/candidates/decisions pages (`R1`)
- No Router-specific shared loading/empty/error states or layout contract (`R6`)
- No candidate-comparison surface spanning local and remote endpoints with observed signal posture (`R4`)
- No Router decision ledger/detail surface positioned as the primary routing explanation UX (`R5`)

## Current backend/API surface inventory

### Existing route families

`runtime-host-bridge/src/index.ts` already exposes:

- `/api/role-model/runtime/summary`
- `/api/role-model/runtime/config`
- `/api/role-model/controller`
- `/api/role-model/providers`
- `/api/role-model/roles`
- `/api/role-model/accounts`
- `/api/role-model/endpoints`
- `/api/role-model/endpoints/:endpointId/profile`
- `/api/role-model/requests`
- `/api/role-model/requests/:requestId`
- `/api/role-model/telemetry/*`

### Existing routing data already available in backend internals

- Request detail is backed by `readRequestObservation(...)` and returns the persisted observation bundle plus endpoint metadata.
- Endpoint profile detail is backed by `readEndpointProfile(...)` and already returns:
  - latest profile
  - recent samples
  - bucketed difficulty profiles
  - advisory max-difficulty recommendation
- Runtime config/controller/account/role/endpoint data is already materialized inside the bridge runtime and can be recomposed into Router-focused contracts without adding a second state store.

### Current backend gap against requirements

- No `/api/role-model/router/summary` endpoint (`R2`)
- No `/api/role-model/router/config` endpoint (`R2`, `R3`)
- No `/api/role-model/router/candidates` endpoint (`R2`, `R4`)
- No `/api/role-model/router/decisions` ledger endpoint (`R2`, `R5`)
- No `/api/role-model/router/decisions/:requestId` detail endpoint (`R2`, `R5`)
- No frontend-facing typed Router contract in `runtime-api.ts` (`R2`)

## Policy-source and provenance baseline

- The current runtime config and controller endpoints expose strategy and controller posture, but not a consolidated Router config snapshot.
- The current `roles` endpoint exposes summaries only; it does not provide the full role/task/policy-source picture needed by the new Router config page.
- Request detail already contains resolved per-request routing diagnostics, but only on a drill-in basis and only after the UI reaches the raw request-detail surface.
- The baseline therefore has the raw ingredients for provenance, but not a stable user-facing configuration narrative.

## Candidate inventory baseline

- The baseline has endpoint and account inventories plus endpoint-profile detail reads.
- Those reads are fragmented across pages and APIs; there is no single Router candidates payload that combines:
  - endpoint identity and health
  - local/remote source posture
  - role bindings
  - controller/preferred/ignored posture
  - observed metrics and provenance
- This is the main structural gap for `R4`.

## Decision explanation baseline

- Recent requests and request detail already provide the persistence anchor for decision-oriented Router pages.
- The baseline request detail page is valuable and should remain the raw inspection destination.
- The missing layer is an explainable Router ledger/detail contract that promotes routing explanation ahead of raw JSON/capture inspection.

## Reuse decisions from AS-IS

- Reuse the existing Control routing-strategy posture page as a source and cross-link target, not as the primary Router experience.
- Reuse request observation persistence as the source of truth for Router decision detail.
- Reuse endpoint profile reads for measured candidate posture.
- Preserve Observe request detail as the deeper trace/capture view.

## Requirement traceability snapshot

- `R1`: FAIL in baseline
- `R2`: FAIL in baseline
- `R3`: PARTIAL in baseline
- `R4`: FAIL in baseline
- `R5`: PARTIAL in baseline
- `R6`: FAIL in baseline
- `R7`: PARTIAL in baseline
- `R8`: N/A for AS-IS
- `R9`: N/A for AS-IS

## Coverage Gate

- [x] Existing UI routing surfaces documented
- [x] Existing backend routing-related surfaces documented
- [x] Gaps against `R1`-`R7` captured explicitly
- [x] Reuse opportunities identified to avoid duplicate state stores

Coverage: PASS

## Approval Gate

- [x] AS-IS is concrete enough to design test-first implementation slices
- [x] Existing reusable routing surfaces are identified
- [x] Missing Router API/UI seams are explicit

Approval: PASS
