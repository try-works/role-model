Run: `/.recursive/run/20-local-llama-swap-completion/`
Phase: `00 Requirements`
Status: `LOCKED`
Inputs:
- `/.recursive/run/19-local-llama-swap-proxy/addenda/audit-runs-18-19.md`
- `/.recursive/run/18-local-llama-swap-runtime/08-memory-impact.md`
- `/.recursive/run/19-local-llama-swap-proxy/08-memory-impact.md`
- `/.recursive/run/18-local-llama-swap-runtime/00-requirements.md` (OOS items)
- `/.recursive/run/19-local-llama-swap-proxy/00-requirements.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
Outputs:
- `/.recursive/run/20-local-llama-swap-completion/00-requirements.md`
Scope note: Complete all deferred implementations from Runs 18 and 19: policy persistence, swap history persistence, dead code removal, and all previously out-of-scope Local features. Update DESIGN_SYSTEM.md before any UI changes. End-to-end verification includes browser testing.

---

# Run 20: Local llama-swap Completion — Requirements

## Context

The audit of Runs 18 and 19 (`audit-runs-18-19.md`) identified material gaps where backend methods are stubs returning empty defaults, preventing the Local section of the runtime UI from functioning end-to-end. Additionally, multiple features were explicitly deferred or declared out-of-scope in Runs 18 and 19.

Run 20 is the **completion run** that closes all deferred implementations and elevates previously out-of-scope features that are now required for a functional Local operator surface.

## Deferred Implementations from Prior Runs

### Run 18: Backend Stubs (Still Active After Run 19)

| Method | Current Behavior | Expected Behavior |
|---|---|---|
| `readLocalPolicy()` | Returns `{}` | Returns persisted policy from `runtimeStateRoot/local-policy.json` |
| `updateLocalPolicy()` | Echoes input, no persistence | Writes to `runtimeStateRoot/local-policy.json`, returns persisted data |
| `listSwapHistory()` | Returns `[]` | Returns swap events persisted in SQLite `llama_swap_events` table |

### Run 19: Explicitly Deferred

| Item | Reason Deferred |
|---|---|
| SQLite swap event persistence | Scoped out of Run 19 |
| Policy read/write to llama-swap config | Scoped out of Run 19 |
| Real-time log streaming UI | Scoped out of Run 19 |

### Run 18: Out of Scope (Now In Scope for Run 20)

| ID | Feature | Prior Status | Run 20 Status |
|---|---|---|---|
| OOS1 | Matrix solver UI | Out of scope | **In scope** — R9 |
| OOS2 | Peer passthrough | Out of scope | **In scope** — R10 |
| OOS3 | Model-level overrides | Out of scope | **In scope** — R8 |
| OOS4 | Real-time log streaming UI | Out of scope | **In scope** — R7 |

## Requirements

### R1: Persist Local Policy to JSON File

`readLocalPolicy()` and `updateLocalPolicy()` must read from and write to a JSON file at `<runtimeStateRoot>/local-policy.json`.

- **R1.1** — If the file does not exist, `readLocalPolicy()` must return a default policy:
  ```json
  {
    "ttl": 300,
    "maxConcurrency": 1,
    "autoUnload": true
  }
  ```
- **R1.2** — `updateLocalPolicy(body)` must write the merged policy to the file and return the persisted data.
- **R1.3** — The policy file must be human-readable (formatted JSON with 2-space indentation).
- **R1.4** — File I/O errors must be caught and returned as `{ error: string }` to the UI.

### R2: Persist Swap Events to SQLite

Swap events must be recorded in the SQLite runtime-state database when models are loaded or unloaded.

- **R2.1** — Add `llama_swap_events` table to the SQLite schema with columns:
  - `event_id` (TEXT PRIMARY KEY)
  - `timestamp` (TEXT, ISO 8601)
  - `old_model_id` (TEXT, nullable)
  - `new_model_id` (TEXT, nullable)
  - `reason` (TEXT)
- **R2.2** — `loadLocalModel(modelId)` must insert a swap event with `new_model_id = modelId`, `old_model_id = previousRunningModelId` (or `null` if none), `reason = "manual-load"`.
- **R2.3** — `unloadLocalModel(modelId?)` must insert a swap event with `old_model_id = modelId` (or all unloaded models if no `modelId`), `new_model_id = null`, `reason = "manual-unload"`.
- **R2.4** — `listSwapHistory()` must query the table ordered by `timestamp DESC` and return events.
- **R2.5** — If llama-swap is running and `getRunningModels` returns models, auto-detected model transitions (not triggered by our API) must also be recorded with `reason = "auto-detected"`.

### R3: Remove Dead `getLogs` Code

- **R3.1** — Remove `getLogs?` from `VendorRuntime` interface in `vendor-abstraction`.
- **R3.2** — Remove `getLogs` implementation from `vendor-llama-swap`.
- **R3.3** — Rationale: No consumer exists. If log streaming is needed later, it will be re-added with a proper requirement.

### R4: Document `loadedAt` Fabrication

- **R4.1** — Add a code comment in `vendor-llama-swap/src/index.ts` above `getRunningModels()` explaining that `loadedAt` is the current timestamp because llama-swap's `/running` endpoint does not expose load times.
- **R4.2** — Add the same note to `runtime-api.ts` where `fetchLocalModels` is documented.

### R5: Update DESIGN_SYSTEM.md Before UI Changes

Before implementing any new UI features or modifying existing Local pages, the design system must be updated and audited.

- **R5.1** — Update `DESIGN_SYSTEM.md` to document:
  - New Matrix Solver template and route (R9)
  - New Peer Passthrough template and route (R10)
  - New Model-Level Overrides UI pattern (R8)
  - New Real-Time Log Streaming template and route (R7)
  - Updated Local section with all new routes
- **R5.2** — Run `ui-design-system` skill audit against the updated `DESIGN_SYSTEM.md`:
  - Verify all new templates follow Swiss design system rules (zero radius, stone palette, IBM Plex Mono, accent red `#C8102E`)
  - Verify navigation model is consistent
  - Verify page template contracts are complete
  - Verify accessibility compliance (WCAG 2.1 AA minimum)
- **R5.3** — Fix any audit findings before proceeding to frontend implementation.
- **R5.4** — Only after DESIGN_SYSTEM.md audit passes may frontend implementation begin.

### R6: Real-Time Log Streaming UI

- **R6.1** — Add `Local > Logs` route (`/app/local/logs`) using the `dual-console` template.
- **R6.2** — The page must display:
  - Live log stream from llama-swap via `GET /logs/stream` (or SSE equivalent)
  - Historical log buffer from `GET /logs`
  - Source toggle between proxy and upstream logs
  - Auto-scroll toggle
  - Clear/filter controls
- **R6.3** — Empty state when llama-swap is not running.
- **R6.4** — Swiss design compliance: zero-radius cards, stone palette, mono for log text, accent red for errors.

### R7: Model-Level Overrides UI

- **R7.1** — Extend `Local > Models` page to expose per-model override controls:
  - Per-model TTL override (number input, inherits from global policy)
  - Per-model context window override (number input)
  - Per-model concurrency limit override (number input)
- **R7.2** — Overrides must be visually distinct from global policy (use subtle border or muted panel).
- **R7.3** — Overrides must persist to `runtimeStateRoot/model-overrides.json`.
- **R7.4** — The backend must read overrides when loading/unloading models and apply them to the llama-swap request.

### R8: Matrix Solver UI

- **R8.1** — Add `Local > Matrix` route (`/app/local/matrix`) using a new `matrix-grid` template.
- **R8.2** — The page must display:
  - Grid of concurrently loaded models (from `GET /running`)
  - Each cell shows model ID, engine, memory usage, and uptime
  - Color-coded status: healthy (stone), loading (accent muted), error (accent full)
  - Add model to matrix button
  - Remove model from matrix button
- **R8.3** — Empty state when no models are loaded.
- **R8.4** — Swiss design compliance: zero-radius cards, grid layout, mono for model IDs.

### R9: Peer Passthrough UI

- **R9.1** — Add `Local > Peers` route (`/app/local/peers`) using the `registry-detail` template.
- **R9.2** — The page must display:
  - List of configured peer llama-swap instances
  - Peer health status
  - Peer model availability
  - Add peer form (URL, auth token)
  - Remove peer control
- **R9.3** — Empty state when no peers are configured.
- **R9.4** — Backend must proxy peer requests through the bridge.

### R10: End-to-End Verification

- **R10.1** — Launch the bridge via `cli.ts` with fixture root.
- **R10.2** — `GET /api/role-model/local/policy` must return the default policy (not `{}`).
- **R10.3** — `PUT /api/role-model/local/policy` with `{ ttl: 600 }` must persist and return the updated policy.
- **R10.4** — `GET /api/role-model/local/swap` after a `POST /load` must return the swap event.
- **R10.5** — The UI must render the policy form with actual values (not empty/undefined).
- **R10.6** — The UI swap history page must show the recorded event.
- **R10.7** — Browser verification: all Local pages (Models, Swap, Policy, Logs, Matrix, Peers) must render correctly with Swiss design compliance.
- **R10.8** — Browser screenshots must be captured as evidence for each new/modified page.

## Constraints

- **TDD Required:** Every requirement (R1–R10) must have a failing test before implementation.
- **E2E Required:** R10 must be verified by launching the actual bridge server and sending real HTTP requests.
- **Design System First:** R5 must be completed and audited before any frontend implementation (R6–R9).
- **Browser Verification:** R10.7–R10.8 require actual browser rendering, not just unit tests.
- All changes must pass `runtime:validate-host`, `runtime:validate-vendors`, `runtime:validate-ui`, `schemas:validate`, and `smoke`.
- All bridge and UI unit tests must pass.
- Work must be done in isolated worktree; never on `main` directly.

## Acceptance Criteria

- [ ] `readLocalPolicy()` returns default policy from file instead of `{}`.
- [ ] `updateLocalPolicy()` writes to file and returns persisted data.
- [ ] `listSwapHistory()` returns swap events from SQLite instead of `[]`.
- [ ] `loadLocalModel()` records a swap event in SQLite.
- [ ] `unloadLocalModel()` records a swap event in SQLite.
- [ ] `getLogs` is removed from `VendorRuntime` and `vendor-llama-swap`.
- [ ] `loadedAt` fabrication is documented in source code.
- [ ] `DESIGN_SYSTEM.md` updated with all new routes/templates.
- [ ] `ui-design-system` skill audit passes against updated `DESIGN_SYSTEM.md`.
- [ ] `Local > Logs` page renders with live log streaming.
- [ ] `Local > Matrix` page renders with concurrent model grid.
- [ ] `Local > Peers` page renders with peer management.
- [ ] Per-model overrides persist and apply to llama-swap requests.
- [ ] Browser screenshots captured for all new/modified pages.
- [ ] All targeted validations green from the worktree.
- [ ] E2E test script passes (launches bridge, hits all local endpoints, verifies responses).

## Traceability

| R# | Sub-requirement | Test Strategy | Evidence Location |
|---|---|---|---|
| R1.1 | Default policy | Unit test: `readLocalPolicy` returns defaults when file missing | `test/local-policy.test.ts` |
| R1.2 | Write and read back | Unit test: `updateLocalPolicy` persists, `readLocalPolicy` reads back | `test/local-policy.test.ts` |
| R1.3 | Human-readable JSON | Manual inspection of file | E2E test output |
| R1.4 | Error handling | Unit test: mock file I/O error | `test/local-policy.test.ts` |
| R2.1 | Schema migration | Unit test: table exists after init | `test/swap-history.test.ts` |
| R2.2 | Load event | Unit test: `loadLocalModel` inserts row | `test/swap-history.test.ts` |
| R2.3 | Unload event | Unit test: `unloadLocalModel` inserts row | `test/swap-history.test.ts` |
| R2.4 | Query history | Unit test: `listSwapHistory` returns rows | `test/swap-history.test.ts` |
| R2.5 | Auto-detected | Unit test: background check inserts events | `test/swap-history.test.ts` |
| R3.1–3.3 | Remove getLogs | Type-check: compile without `getLogs` | `tsc --noEmit` |
| R4.1–4.2 | Document limitation | Code review: comments present | Source code inspection |
| R5.1–5.4 | DESIGN_SYSTEM.md audit | Skill audit: `ui-design-system` review | `addenda/05-design-system-audit.md` |
| R6.1–6.4 | Log streaming UI | Browser test: page renders, stream connects | Browser screenshot + E2E |
| R7.1–7.4 | Model overrides | Unit test + browser test | `test/model-overrides.test.ts` + screenshot |
| R8.1–8.4 | Matrix solver UI | Browser test: grid renders, cells update | Browser screenshot + E2E |
| R9.1–9.4 | Peer passthrough | Unit test + browser test | `test/peer-passthrough.test.ts` + screenshot |
| R10.1–10.8 | E2E verification | Script: launch bridge, curl endpoints, browser QA | `scripts/e2e-local-runtime.ts` + screenshots |

## Implementation Order

### Phase 1: Design System Update (R5)
1. Update `DESIGN_SYSTEM.md` with all new routes, templates, and layout contracts.
2. Run `ui-design-system` skill audit.
3. Fix audit findings.
4. Lock R5 before proceeding.

### Phase 2: Backend Persistence (R1–R2)
1. Write failing tests for policy persistence.
2. Implement file-backed policy read/write.
3. Write failing tests for swap history.
4. Add SQLite schema and wire insertions.
5. Refactor.

### Phase 3: Cleanup (R3–R4)
1. Remove `getLogs` from interface and implementation.
2. Add documentation comments for `loadedAt`.
3. Verify type-check passes.

### Phase 4: New UI Features (R6–R9)
1. Implement `Local > Logs` page.
2. Implement `Local > Matrix` page.
3. Implement `Local > Peers` page.
4. Implement model-level overrides in `Local > Models`.
5. Run browser verification after each page.

### Phase 5: E2E Verification (R10)
1. Launch bridge.
2. Send HTTP requests to all local endpoints.
3. Open browser and verify all pages render correctly.
4. Capture screenshots.
5. Run validation suite.

---

## Coverage Gate

- All R1–R10 requirements have acceptance criteria defined.
- All sub-requirements have test strategies defined.
- Design system audit is mandatory before frontend implementation.
- TDD sequence is explicit (RED → GREEN → REFACTOR per phase).
- E2E verification including browser testing is required (R10).

**Coverage: PASS**

## Approval Gate

- Requirements are ready for AS-IS analysis and planning.

**Approval: PASS**

LockedAt: 2026-05-10T08:00:00+08:00
LockHash: `run20-requirements-locked`
