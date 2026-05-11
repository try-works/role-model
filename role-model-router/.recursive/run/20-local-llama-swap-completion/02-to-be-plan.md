Run: `/.recursive/run/20-local-llama-swap-completion/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
Inputs:
- `/.recursive/run/20-local-llama-swap-completion/01-as-is.md`
- `/.recursive/run/20-local-llama-swap-completion/00-requirements.md`
Outputs:
- `/.recursive/run/20-local-llama-swap-completion/02-to-be-plan.md`
Scope note: Define the implementation plan for completing all deferred Run 18/19 work and previously OOS features.

---

# Run 20: Local llama-swap Completion — TO-BE Plan

## Sub-phase Overview

| SP | Scope | Requirements | Key Files |
|---|---|---|---|
| SP1 | DESIGN_SYSTEM.md update + audit | R5 | `DESIGN_SYSTEM.md` |
| SP2 | Policy persistence backend | R1 | `index.ts`, `local-policy.json` |
| SP3 | Swap history persistence backend | R2 | `index.ts`, `sqlite-memory/src/index.ts` |
| SP4 | Cleanup (dead code + docs) | R3, R4 | `vendor-abstraction`, `vendor-llama-swap` |
| SP5 | New UI pages (Logs, Matrix, Peers) + Overrides | R6, R8, R9, R7 | `local-*.tsx`, `routes.ts`, `runtime-api.ts` |
| SP6 | End-to-end verification | R10 | Bridge launch, HTTP tests, browser QA |

## SP1: DESIGN_SYSTEM.md Update + Audit

**Scope:** Update design system documentation for all new Local routes and templates.

**Implementation checklist:**
- [ ] Add `Local > Logs` route to navigation model (`dual-console` template)
- [ ] Add `Local > Matrix` route to navigation model (`matrix-grid` template)
- [ ] Add `Local > Peers` route to navigation model (`registry-detail` template)
- [ ] Document `matrix-grid` template layout definition
- [ ] Document model-level overrides UI pattern
- [ ] Update route and layout contract table
- [ ] Update live route layouts section
- [ ] Run `ui-design-system` skill audit
- [ ] Fix any audit findings

**Tests:**
- `cat DESIGN_SYSTEM.md | grep "Local > Logs"` — must find entry
- `cat DESIGN_SYSTEM.md | grep "matrix-grid"` — must find template definition

**Acceptance:** DESIGN_SYSTEM.md contains complete documentation for all new routes and templates. Audit passes.

## SP2: Policy Persistence Backend

**Scope:** Replace `readLocalPolicy` and `updateLocalPolicy` stubs with file-backed persistence.

**Implementation checklist:**
- [ ] Add `path` import for `runtimeStateRoot/local-policy.json`
- [ ] Implement `readLocalPolicy`: check file exists, read JSON, return defaults if missing
- [ ] Implement `updateLocalPolicy`: merge with existing, write JSON to file, return persisted
- [ ] Add error handling for file I/O (return `{ error: string }`)
- [ ] Add default policy constant: `{ ttl: 300, maxConcurrency: 1, autoUnload: true }`
- [ ] Write failing test: `readLocalPolicy` returns defaults when file missing → RED
- [ ] Implement → GREEN
- [ ] Write failing test: `updateLocalPolicy` persists → RED
- [ ] Implement → GREEN

**Tests:**
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test test/local-policy.test.ts`
- E2E: `curl /api/role-model/local/policy` returns defaults

**Acceptance:** Policy endpoint returns real persisted data, not `{}`.

## SP3: Swap History Persistence Backend

**Scope:** Add SQLite table for swap events and wire insertions to load/unload.

**Implementation checklist:**
- [ ] Add `llama_swap_events` table schema to `sqlite-memory/src/index.ts`
- [ ] Add `insertSwapEvent` helper to `sqlite-memory`
- [ ] Add `listSwapEvents` helper to `sqlite-memory`
- [ ] Wire `insertSwapEvent` to `loadLocalModel` in bridge
- [ ] Wire `insertSwapEvent` to `unloadLocalModel` in bridge
- [ ] Update `listSwapHistory` to query SQLite instead of returning `[]`
- [ ] Write failing test: table exists after init → RED
- [ ] Implement schema → GREEN
- [ ] Write failing test: load inserts row → RED
- [ ] Wire insertion → GREEN
- [ ] Write failing test: unload inserts row → RED
- [ ] Wire insertion → GREEN
- [ ] Write failing test: query returns rows → RED
- [ ] Implement query → GREEN

**Tests:**
- `corepack pnpm --filter @role-model-router/sqlite-memory test test/swap-history.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test test/swap-history.test.ts`
- E2E: `curl /api/role-model/local/swap` returns events after load

**Acceptance:** Swap history endpoint returns real events from SQLite.

## SP4: Cleanup (Dead Code + Documentation)

**Scope:** Remove `getLogs` and document `loadedAt` limitation.

**Implementation checklist:**
- [ ] Remove `getLogs?` from `VendorRuntime` interface
- [ ] Remove `getLogs` from `vendor-llama-swap` return object
- [ ] Remove `getLogs` function implementation
- [ ] Add comment above `getRunningModels` documenting `loadedAt` fabrication
- [ ] Add comment in `runtime-api.ts` documenting `loadedAt`
- [ ] Verify `tsc --noEmit` passes for both packages

**Tests:**
- `cd packages/vendor-abstraction && tsc --noEmit`
- `cd packages/vendor-llama-swap && tsc --noEmit`

**Acceptance:** Type-check passes. No `getLogs` references remain.

## SP5: New UI Pages

**Scope:** Implement Logs, Matrix, Peers pages and model-level overrides.

**Implementation checklist:**
- [ ] Add `local-logs.tsx` route component (`dual-console` template)
- [ ] Add `local-matrix.tsx` route component (`matrix-grid` template)
- [ ] Add `local-peers.tsx` route component (`registry-detail` template)
- [ ] Add routes to `routes.ts`
- [ ] Add navigation entries to `design-system.ts`
- [ ] Add API client methods to `runtime-api.ts` (`fetchLocalLogs`, `fetchLocalMatrix`, `fetchLocalPeers`)
- [ ] Extend `local-models.tsx` with per-model override controls
- [ ] Add `model-overrides.json` persistence backend
- [ ] Write failing UI tests for new pages → RED
- [ ] Implement → GREEN

**Tests:**
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- Browser verification: all pages render correctly

**Acceptance:** All new pages render with Swiss design compliance.

## SP6: End-to-End Verification

**Scope:** Launch bridge and verify all endpoints and pages.

**Implementation checklist:**
- [ ] Launch bridge with `cli.ts`
- [ ] `curl /api/role-model/local/policy` → verify defaults
- [ ] `PUT /api/role-model/local/policy` → verify persistence
- [ ] `POST /api/role-model/local/models/test/load` → verify swap event
- [ ] `GET /api/role-model/local/swap` → verify event present
- [ ] Open browser to `/app/local/models` → verify renders
- [ ] Open browser to `/app/local/swap` → verify events shown
- [ ] Open browser to `/app/local/policy` → verify form values
- [ ] Open browser to `/app/local/logs` → verify renders
- [ ] Open browser to `/app/local/matrix` → verify renders
- [ ] Open browser to `/app/local/peers` → verify renders
- [ ] Capture screenshots for all pages
- [ ] Run full validation suite

**Tests:**
- `runtime:validate-host`
- `runtime:validate-vendors`
- `runtime:validate-ui`
- `schemas:validate`
- `smoke`
- Bridge tests (40/40)
- UI tests (61/61 + new tests)

**Acceptance:** All validations green. Browser screenshots captured.

---

## Rollback / Recovery

- If policy file I/O fails, bridge falls back to in-memory defaults.
- If SQLite schema migration fails, swap events are silently skipped (non-critical feature).
- If UI build fails, bridge API still works (backend-first implementation).

---

## Traceability

| R# | SP | Evidence |
|---|---|---|
| R1 | SP2 | `index.ts` file I/O, `test/local-policy.test.ts` |
| R2 | SP3 | `sqlite-memory` schema, `index.ts` insertions, `test/swap-history.test.ts` |
| R3 | SP4 | `vendor-abstraction/src/index.ts`, `vendor-llama-swap/src/index.ts` |
| R4 | SP4 | Source code comments |
| R5 | SP1 | `DESIGN_SYSTEM.md`, audit addendum |
| R6 | SP5 | `local-logs.tsx`, browser screenshot |
| R7 | SP5 | `local-models.tsx` overrides, `model-overrides.json` |
| R8 | SP5 | `local-matrix.tsx`, browser screenshot |
| R9 | SP5 | `local-peers.tsx`, browser screenshot |
| R10 | SP6 | E2E script output, browser screenshots |

---

## Coverage Gate

- All R1–R10 requirements are mapped to sub-phases.
- Every sub-phase has a concrete implementation checklist.
- Every sub-phase has test commands and acceptance criteria.

**Coverage: PASS**

## Approval Gate

- Plan is concrete and executable.
- Sub-phases are ordered correctly (design system first, then backend, then frontend, then E2E).

**Approval: PASS**

LockedAt: 2026-05-10T08:10:00+08:00
LockHash: `run20-to-be-plan-locked`
