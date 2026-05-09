Run: `/.recursive/run/18-local-llama-swap-runtime/`
Phase: `00 Requirements`
Status: `LOCKED`
Inputs:
- User request: expose llama-swap's dynamic model-swapping functionality through the role-model runtime UI
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.local-model-config-ui.addendum-05.md`
Outputs:
- `/.recursive/run/18-local-llama-swap-runtime/00-requirements.md`
Scope note: Define requirements for a new "Local" section in the runtime UI that exposes llama-swap's on-demand model switching, concurrent models, TTL, and swap history.

---

# Run 18: Local llama-swap Runtime — Requirements

## Context

The role-model runtime currently exposes static local model configuration (what models exist in llama-swap config) but hides llama-swap's core dynamic functionality: on-demand model switching, concurrent loaded models, TTL/auto-unload, and swap history. Users cannot see what models are currently loaded, manually load/unload models, or review swap events without using llama-swap's vendored UI directly.

## Requirements

### R1: New "Local" Sidebar Section
- Add a "Local" navigation section to the runtime UI sidebar, positioned between Studio and Control.
- The section must contain three routes: Models, Swap History, and Policy.

### R2: Local Models Page (`/app/local/models`)
- Display currently loaded local inference models as cards with model ID, engine, and loaded-at timestamp.
- Provide manual Load and Unload controls per model.
- Provide an "Unload all models" quick action.
- Show an honest empty state when no models are loaded.

### R3: Swap History Page (`/app/local/swap`)
- Display a chronological log of model swap events.
- Each event must show: timestamp, old model (or "Initial load"), new model, and reason.
- Show an honest empty state when no swap events exist.

### R4: Local Policy Page (`/app/local/policy`)
- Display editable local inference runtime policy: TTL (seconds), Max concurrency, Auto-unload toggle.
- Provide Save and Reset controls.
- Show a raw policy inspector (read-only JSON view).

### R5: Bridge API for Local Runtime State
- Add `GET /api/role-model/local/models` — list loaded models.
- Add `POST /api/role-model/local/models/:modelId/load` — load a model.
- Add `POST /api/role-model/local/models/:modelId/unload` — unload a model.
- Add `POST /api/role-model/local/models/unload` — unload all models.
- Add `GET /api/role-model/local/policy` — read current policy.
- Add `PUT /api/role-model/local/policy` — update policy.
- Add `GET /api/role-model/local/swap` — read swap event history.

### R6: DESIGN_SYSTEM.md Update
- Document the new Local section, its three routes, and their layout templates in DESIGN_SYSTEM.md.

### R7: Browser Verification
- All three local pages must render correctly in the browser with Swiss design compliance (zero-radius cards, stone palette, IBM Plex Mono, accent red `#C8102E`).

## Out of Scope

- **OOS1:** Matrix solver UI (concurrent model matrix visualization) — llama-swap supports Matrix but no UI for it.
- **OOS2:** Peer passthrough — no peer llama-swap integration.
- **OOS3:** Model-level overrides (per-model TTL, context-window overrides).
- **OOS4:** Real-time log streaming from llama-swap via WebSocket.

## Constraints

- All changes must pass `runtime:validate-host`, `runtime:validate-vendors`, `runtime:validate-ui`, `schemas:validate`, and `smoke`.
- All bridge and UI unit tests must pass.
- Work must be done in isolated worktree; never on `main` directly.

## Acceptance Criteria

- [ ] User can navigate to `/app/local/models` and see loaded models (or empty state).
- [ ] User can navigate to `/app/local/swap` and see swap history (or empty state).
- [ ] User can navigate to `/app/local/policy` and edit/save policy fields.
- [ ] All bridge API endpoints return correct JSON (not HTML from SPA fallback).
- [ ] All validations green.
- [ ] Browser screenshots prove Swiss design compliance.

---

## Traceability

| R# | Where Addressed | Evidence |
|---|---|---|
| R1 | `02-to-be-plan.md` SP1, `03-implementation-summary.md` | `design-system.ts`, `app-shell.tsx`, `routes.ts` |
| R2 | `02-to-be-plan.md` SP3, `03-implementation-summary.md` | `local-models.tsx` |
| R3 | `02-to-be-plan.md` SP4, `03-implementation-summary.md` | `local-swap.tsx` |
| R4 | `02-to-be-plan.md` SP5, `03-implementation-summary.md` | `local-policy.tsx` |
| R5 | `02-to-be-plan.md` SP2, `03-implementation-summary.md` | `index.ts` (bridge), `runtime-api.ts` |
| R6 | `02-to-be-plan.md` SP1, `03-implementation-summary.md` | `DESIGN_SYSTEM.md` |
| R7 | `02-to-be-plan.md` SP6, `05-manual-qa.md` | Browser screenshots |

---

## Coverage Gate

- All R1–R7 requirements have acceptance criteria defined.
- All OOS1–OOS4 out-of-scope items are explicitly declared.
- Constraints include validation commands and worktree isolation.

**Coverage: PASS**

## Approval Gate

- Requirements are ready for AS-IS analysis and planning.

**Approval: PASS**

LockedAt: 2026-05-10T04:11:00+08:00
LockHash: `run18-requirements-locked`