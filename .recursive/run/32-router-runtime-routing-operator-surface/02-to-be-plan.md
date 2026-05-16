Run: `/.recursive/run/32-router-runtime-routing-operator-surface/`
Phase: `02 TO-BE`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Audit mode: `self-audit`
Inputs:
- `/.recursive/run/32-router-runtime-routing-operator-surface/00-requirements.md`
- `/.recursive/run/32-router-runtime-routing-operator-surface/01-as-is.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`

## Implementation strategy

Build the Router operator surface by promoting existing routing/runtime state into a dedicated Router API family and a first-class Router navigation section. Reuse persisted request observations and endpoint-profile reads as the truth sources; do not invent a parallel routing datastore. Keep Control as the editing home and Observe as the raw inspection home, while Router becomes the explanation layer across configuration, candidates, and decisions.

## Planned Router information architecture

### Section and tabs

Add a primary `Router` section to the runtime shell with section-level tabs:

- `/app/router` -> overview
- `/app/router/config` -> configuration and provenance
- `/app/router/candidates` -> candidate inventory and observed signals
- `/app/router/decisions` -> recent explainable decision ledger
- `/app/router/decisions/:requestId` -> decision detail

### Layout intent

- Overview/config use the existing registry/detail information pattern
- Candidates use a scanable table-plus-card fallback pattern for responsive comparison
- Decisions use a ledger-plus-detail pattern aligned with Observe request workflows
- Every Router page must expose clear empty/loading/error states and preserve direct links into Control or Observe when the deeper or editable surface lives there

## Planned backend contract

Add typed backend endpoints under `/api/role-model/router/`:

1. `GET /api/role-model/router/summary`
   - compact snapshot for Router landing page
   - includes strategy/execution/controller posture and recent decision count

2. `GET /api/role-model/router/config`
   - consolidated Router config/provenance payload
   - includes:
     - runtime config routing posture
     - controller assignment
     - routing-model guidance when available
     - role/task/policy-source inputs needed by UI
     - explicit provenance/unavailable states

3. `GET /api/role-model/router/candidates`
   - unified local+remote candidate inventory
   - combines endpoint identity, health, role bindings, controller/preferred/ignored posture, and observed profile summaries

4. `GET /api/role-model/router/decisions`
   - decision ledger backed by recent request observations
   - optimized for scanability and drill-in

5. `GET /api/role-model/router/decisions/:requestId`
   - explainable decision detail view backed by request observation plus linked endpoint profile
   - includes direct link target for Observe request detail

## Planned frontend contract

In `app/lib/runtime-api.ts`, add Router-specific types and fetchers:

- `fetchRouterSummary`
- `fetchRouterConfig`
- `fetchRouterCandidates`
- `fetchRouterDecisions`
- `fetchRouterDecisionDetail`

Page components must consume these typed helpers rather than issuing bespoke inline fetches.

## Strict TDD plan

TDD Mode: `strict`

### Slice A: design-system RED

Add failing design-system tests that require:

- `Router` navigation section exists
- Router routes resolve with stable ids/templates
- design-system documentation includes the new Router route family

### Slice B: backend Router API RED

Add failing host-bridge route tests that require:

- `/api/role-model/router/summary`
- `/api/role-model/router/config`
- `/api/role-model/router/candidates`
- `/api/role-model/router/decisions`
- `/api/role-model/router/decisions/:requestId`

### Slice C: frontend runtime-api RED

Add failing runtime-api tests that require the new typed Router fetchers and payload shaping.

### Slice D: Router page RED

Add failing runtime-ui route/component tests that require:

- Router pages render with section-aware headings and linked states
- candidates and decisions pages handle empty/configured states
- decision detail links back to Observe request detail

## Planned file touch set

Backend:
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Frontend design system and API:
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`

Frontend routes/components:
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-config.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-candidates.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`
- shared Router-presentational helpers only if duplication justifies them

## Validation plan

Focused automated validation after GREEN:

- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- touched-package build(s) if required by existing scripts

Live verification:

- launch runtime host bridge in QA mode
- verify Router routes render in the running app
- verify at least one routed request appears in Router decisions and drills into Router decision detail
- verify cross-links into Observe request detail

Browser verification:

- navigate Router tabs/pages
- capture configured and unavailable/empty states
- verify responsive/scanable behavior at browser level

## Risks and controls

- Risk: duplicate routing state emerges between Router and Observe
  - Control: decision detail is request-observation-backed and links to Observe detail
- Risk: UI pages scrape raw nested JSON again
  - Control: Router API family is mandatory and page code uses typed runtime-api helpers
- Risk: local/remote candidates diverge in representation
  - Control: candidates endpoint normalizes both into one comparable shape
- Risk: inherited root `ci:check` formatter drift obscures run-owned regressions
  - Control: compare final validation against the recorded Phase 0 failure signature

## Approval to enter Phase 3

Phase 3 may begin once RED starts with the documented order:
1. design-system tests
2. backend route tests
3. runtime-api tests
4. Router page tests

## Coverage Gate

- [x] Router IA defined
- [x] Backend API family defined
- [x] Frontend API contract defined
- [x] Strict TDD slice order defined
- [x] Validation path includes focused tests and live/browser verification

Coverage: PASS

## Approval Gate

- [x] TO-BE plan is specific enough to implement without widening scope
- [x] Reuse vs. new-surface boundaries are explicit
- [x] Phase 3 entry order is test-first and auditable

Approval: PASS
