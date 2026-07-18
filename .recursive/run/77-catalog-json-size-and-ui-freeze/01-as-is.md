Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-18T00:12:03Z`
LockHash: `a2c05d623241fda11cc200ff1ee118124476a3246768511a077744c899c9eccb`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-worktree.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/requirements-investigation.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/catalog/data/normalized-catalog.json` (size only)
Outputs:
- This file
Scope note: Document the current code paths that cause the Models mutation freeze and benchmark navigation stall, the SQLite query plans, the catalog artifact state, the route audit, and every affected code surface before implementation.

## TODO

- [x] Map the Models mutation critical path: Save bindings and Eject from pool
- [x] Map the deferred Models bootstrap lifecycle and its fetchRuntimeRequests dependency
- [x] Trace listRecentRuntimeObservations to its SQLite query, index state, JSON.parse, and query plan
- [x] Map the benchmark route startup with its 7-read Promise.all
- [x] Trace readEndpointProfileData to its per-endpoint SQLite reads and query plans
- [x] Audit all route callers of fetchRuntimeRequests and fetchRuntimeSnapshot
- [x] Inspect the normalized-catalog.json artifact and catalog ser/de boundaries
- [x] Map the post-mutation core reload payloads
- [x] Record the live runtime_observations schema, columns, and indexes
- [x] Map Run 76 eject/receipt semantics that must be preserved
- [x] Complete audit and repair loop
- [x] Lock the phase

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: N/A; Phase 1 AS-IS is an analysis-only phase and no external capabilities are required.
- Delegation Decision Basis: self-audit is appropriate because the AS-IS analysis covers six readable source files with clear defect patterns and a pre-existing investigation; subagent context assembly overhead would exceed the analysis benefit.
- Delegation Override Reason: N/A (subagents unavailable)
- Audit Inputs Provided: locked 00-requirements.md, locked 00-worktree.md, evidence/requirements-investigation.md, current STATE.md/DECISIONS.md, all six targeted source files, relevant run 76 artifacts.

## Effective Inputs Re-read

- `00-requirements.md` (LOCKED): re-read in full. All 10 R# items and 6 OOS items confirmed present.
- `00-worktree.md` (LOCKED): fixes the baseline at `7094a252b7cab222f5ff12d1753e77cef83d6a22` and confines all work to the run-77 worktree.
- `evidence/requirements-investigation.md`: re-read in full. All SQLite query plans, cross-route reproduction steps, post-mutation timing data, and route audit findings confirmed.
- No addenda exist for Phase 0 Requirements or Phase 1 AS-IS.

## Earlier Phase Reconciliation

- Phase 0 Requirements (LOCKED): No drift. The requirements remain authoritative for all 10 R# items.
- Phase 0 Worktree (LOCKED): Diff basis `7094a252` confirmed. Current diff shows only `00-requirements.md` copied into worktree and the Phase 0 worktree artifact — no product code changes, as expected.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`: Run 67 removed `fetchRuntimeSnapshot()` from P0 route bootstraps and added `/api/role-model/requests/latest-ids`, but did not address the mutation path's rich `fetchRuntimeRequests()` dependency or the SQLite defect.
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`: Run 76 established configured-membership authority, eject conflict, rollback, and reconciliation semantics that must be preserved.
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`: confirmed the implemented eject flow uses `removeRuntimeAccountModel()` for account-managed membership with atomic YAML replacement and structured receipts.
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`: current domain memory confirms account, endpoint, alias, and routing lifecycle ownership surfaces.
- Combined consequence: the Models mutation path's `refreshModelState()` currently re-fetches the full page data after every eject, including the blocking `fetchRuntimeRequests()`. The SQLite defect makes this minute-scale.

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: "Phase 1 and mandatory Phase 1.5 must reproduce and isolate each stage of the affected mutations and route transition before implementation planning" | Summary: Phase 1 traces the mutation path end-to-end; Phase 1.5 will revalidate. | Owner: AS-IS sections
- `R2` | Disposition: `in-scope` | Source Quote: "`listRecentRuntimeObservations()` selects `client_request_id` directly and does not select `observation_json`" | Summary: the current function selects observation_json and calls JSON.parse on every row; an ORDER BY index is missing. | Owner: sqlite-memory/src/index.ts:4081
- `R3` | Disposition: `in-scope` | Source Quote: "`Save bindings` does not call or await `fetchRuntimeRequests()` as part of mutation completion" | Summary: both saveAccountRoles and removeConfiguredModel await refreshObservedRequestEvidence → fetchRuntimeRequests. | Owner: control-models.tsx
- `R4` | Disposition: `in-scope` | Source Quote: "navigating from `/app/models` to `/app/models/benchmark` renders the benchmark page shell and essential controls within `500 ms` on the defined QA environment" | Summary: benchmark startup uses a 7-read Promise.all gated by the slowest request; cross-route block when Models request history consumes the event loop. | Owner: control-benchmark.tsx
- `R5` | Disposition: `in-scope` | Source Quote: "idempotent migrations add indexes matching endpoint/difficulty filters and timestamp/sample or measured-at/snapshot ordering" | Summary: readEndpointProfileData performs per-endpoint table scans; no filter-matching indexes exist. | Owner: index.ts (bridge), sqlite-memory
- `R6` | Disposition: `in-scope` | Source Quote: "save persists the selected account/model assignment using the existing role assignment modes and normalization rules" | Summary: current save flow uses createAccountMutationPayload and upsertRuntimeAccount; must be preserved. | Owner: control-models.tsx
- `R7` | Disposition: `in-scope` | Source Quote: "exact `{providerAccountId, modelId}` identity remains the eject target" | Summary: Run 76 eject semantics must be preserved while removing the blocking fetchRuntimeRequests. | Owner: control-models.tsx, Run 76 artifacts
- `R8` | Disposition: `in-scope` | Source Quote: "only canonical changed surfaces are reread after mutation when the mutation response does not already carry them" | Summary: current post-mutation core reload fetches accounts, endpoints, models, controller, rolePolicy, candidates, and requests — 7 endpoints, up to 1.97MB + 6.9GB scan. | Owner: control-models.tsx
- `R9` | Disposition: `in-scope` | Source Quote: "define a versioned compact serialized catalog type and canonical hydration/decoder boundary" | Summary: current artifact is 5,434,995 bytes; no compact ser/de exists yet. | Owner: catalog/data/normalized-catalog.json, catalog/src/index.ts
- `R10` | Disposition: `in-scope` | Source Quote: "affected sqlite-memory, runtime-host, runtime-ui, provider-account, endpoint-registry, catalog, and packaging suites pass" | Summary: deferred to implementation and QA phases; current baseline tests pass. | Owner: Phase 3-5

## Current Behavior by Requirement

### R2 — Recent-request summaries are not indexed or projection-only

The function `listRecentRuntimeObservations()` in `packages/sqlite-memory/src/index.ts:4081` executes:

```sql
SELECT request_id, routing_decision_id, endpoint_id, created_at_ms, observation_json
FROM runtime_observations
ORDER BY created_at_ms DESC, request_id DESC
LIMIT ?
```

Then calls `JSON.parse(row.observation_json)` on every returned row solely to extract `clientRequestId`. The `runtime_observations` table already has a dedicated `client_request_id` column but the list query does not select it.

The live database at the time of investigation was 6.90 GB with 5,762 rows in `runtime_observations`. The EXPLAIN QUERY PLAN reported: `SCAN runtime_observations` + `USE TEMP B-TREE FOR ORDER BY`.

The only existing indexes on `runtime_observations` are:
- `request_id` (implicit primary key index)
- `idx_obs_retain_until` on `retain_until_ms`

No index exists for `(created_at_ms DESC, request_id DESC)`.

A sibling function `listRecentRuntimeRequestIds()` already uses a projection-only query (`SELECT request_id` only) but does not return the full `RuntimeRequestListItem` shape.

### R3 — Advisory reads block Models mutation completion

Both mutation handlers share the same post-mutation path in `control-models.tsx`:

**Save bindings** (`saveAccountRoles`, line ~597):
1. `upsertRuntimeAccount(mutationPayload)` — canonical mutation succeeds
2. `loadConfiguredModelsInitialData()` — refetches accounts, endpoints, models, controller, rolePolicy, candidates
3. `applyConfiguredModelsInitialData()` — sets snapshot, marks requests "loading"
4. `refreshObservedRequestEvidence()` → `fetchRuntimeRequests()` → `GET /api/role-model/requests` — **BLOCKS**
5. `setSavingAccountId(null)` — button finally clears "Saving…"

**Eject from pool** (`removeConfiguredModel`, line ~621):
1. `removeRuntimeAccountModel()` or `unloadPeerModel()` — canonical mutation succeeds
2. `refreshModelState()` → same path as above
3. `setRemovingTargetKey(null)` — button finally clears "Removing…"

The button stays in pending state across the entire window including `loadConfiguredModelsInitialData` (up to ~811ms for router candidates) + `refreshObservedRequestEvidence` (up to ~60s for the SQLite scan).

### R4 — Benchmark navigation is not independently responsive

The benchmark route startup in `control-benchmark.tsx` (line ~570) fires one blocking `Promise.all` with seven reads:

```typescript
Promise.all([
  fetchBenchmarkSuite(),          // ~28ms idle
  fetchRouterCandidates(),        // ~830ms idle, 1.97MB
  fetchBenchmarkSummary(),        // ~76ms
  fetchBenchmarkSummariesByMode(),// ~349ms
  fetchBenchmarkRuns(),           // ~8ms
  fetchBenchmarkPreferences(),    // ~3ms
  fetchRuntimeSummary(),          // ~3ms
])
```

All seven must resolve before the page renders. When the Models route's `GET /api/role-model/requests` is blocking the server event loop (the cross-route scenario), this `Promise.all` receives zero bytes for up to 90 seconds.

The Models route's `startDeferredConfiguredModelsBootstrap()` only sets a local `disposed` flag on unmount. It does not pass an `AbortSignal` to `fetchRuntimeRequests()`. Even with an AbortSignal, client-side abort cannot interrupt synchronous SQLite work on the server's Node.js event loop.

### R5 — Benchmark profile enrichment is not indexed or bounded

The internal function `readEndpointProfileData()` in `runtime-host-bridge/src/index.ts:19180` opens SQLite and performs per-endpoint queries:
1. Latest general profile read
2. Three latest difficulty profile reads (easy, medium, hard)
3. Complete endpoint sample history read
4. Advisory recommendation read

The live performance tables had 5,971 general samples, 4,752 difficulty samples, 8,313 general profiles, and 6,600 difficulty profiles. All four inspected query plans reported table scans + temporary B-tree sorts. With only 3 candidates this stays under 1 second, but it scales poorly.

### R6, R7 — Mutation correctness must be preserved

The current save flow:
- Uses `createAccountMutationPayload()` which assembles binding with correct `roleAssignmentMode` semantics
- Calls `upsertRuntimeAccount()` with the full account payload
- Reports success only after canonical mutation

The current eject flow:
- Calls `removeRuntimeAccountModel(providerAccountId, modelId)` which implements Run 76 semantics:
  - Exact `{providerAccountId, modelId}` identity
  - Account-managed vs. runtime-config-managed authority separation
  - Structured conflict/rollback/receipt responses
  - Idempotent already-absent handling

Both mutation handlers then call `refreshModelState()` which includes the blocking `fetchRuntimeRequests()`. The fix must decouple the canonical mutation from the advisory refresh without changing mutation semantics.

### R8 — Post-mutation payload is excessive

`loadConfiguredModelsInitialData()` fetches all primary page data regardless of what changed:
- accounts (191ms, 3.8KB)
- endpoints (10ms, 2.7KB)
- models (3ms, 1.3KB)
- controller (6ms, 179 bytes)
- role policy (4ms, 119KB)
- router candidates (811ms, 1.97MB)
- requests (60s, blocked by SQLite defect)

Router candidates and rich request evidence are advisory for completion of the account-role or eject mutation.

### R9 — Catalog artifact is large but not the freeze cause

- File: `role-model-router/packages/catalog/data/normalized-catalog.json`
- Size: 5,434,995 bytes
- Parse time (isolated): median 32.17 ms
- No catalog persistence or migration exists yet

### R10 — Route audit confirms single route ownership

`fetchRuntimeRequests()` calls `GET /api/role-model/requests`. Current production callers:
- `control-models.tsx`: deferred bootstrap, post-Save, post-Eject (through `refreshObservedRequestEvidence` / `refreshModelState`)

No other production route calls the rich request-list endpoint. Other routes use:
- `/api/role-model/requests/latest-ids?limit=10` (providers page — projection-only)
- `/api/role-model/telemetry/requests` (observe dashboard)
- `/api/role-model/requests/:requestId` (single request drill-in)

`fetchRuntimeSnapshot()` bundles `fetchRuntimeRequests()`, but no production route calls `fetchRuntimeSnapshot()`. One stale artifact at `dist/release/package/build` (2026-05-09) still imports the old full-snapshot fanout — this is a packaging hazard.

## Evidence

The investigation evidence at `evidence/requirements-investigation.md` establishes:
- SQLite query plans confirming full scan + temp B-tree sort
- Database size of 6.90 GB with 5,762 observation rows
- Projection-only query returning in ~293-305 ms vs. minute-scale with JSON blob
- Cross-route health timeout proving server event-loop stall (both `/healthz` and benchmark reads timed out at 90s)
- Post-mutation core reload timings (accounts 191ms, candidates 811ms, etc.)
- Route audit proving only `/app/models` calls the rich request-list endpoint
- Catalog size and parse timing

## Known Unknowns

- Whether any mutation path performs vendor restart that is legitimately long-running (investigation suggests no, but Phase 1.5 must confirm)
- Whether the `fetchRuntimeSnapshot()` dead code path could be revived by future route additions (R2 acceptance criteria require a route-source regression)
- Exact query plan shape for `readEndpointProfileData` with indexes applied (deferred to Phase 3 TDD)

## Relevant Code Pointers

| File | Lines | Affected by |
|---|---|---|
| `packages/sqlite-memory/src/index.ts` | 4081-4118 | R2: listRecentRuntimeObservations query and JSON.parse |
| `packages/sqlite-memory/src/index.ts` | 4120-4133 | R2: listRecentRuntimeRequestIds (existing projection-only) |
| `apps/runtime-host-bridge/src/index.ts` | 14859-14867 | R2: GET /api/role-model/requests handler |
| `apps/runtime-ui/app/routes/control-models.tsx` | 111-140 | R3: startDeferredConfiguredModelsBootstrap |
| `apps/runtime-ui/app/routes/control-models.tsx` | 399-445 | R3: useEffect calling bootstrap |
| `apps/runtime-ui/app/routes/control-models.tsx` | 545-561 | R3/R8: loadConfiguredModelsInitialData |
| `apps/runtime-ui/app/routes/control-models.tsx` | 578-587 | R3: refreshObservedRequestEvidence |
| `apps/runtime-ui/app/routes/control-models.tsx` | 597-612 | R3/R6: saveAccountRoles |
| `apps/runtime-ui/app/routes/control-models.tsx` | 615-619 | R3/R7: refreshModelState |
| `apps/runtime-ui/app/routes/control-models.tsx` | 621-663 | R3/R7: removeConfiguredModel |
| `apps/runtime-ui/app/routes/control-benchmark.tsx` | 570-612 | R4: 7-read Promise.all startup |
| `apps/runtime-ui/app/lib/runtime-api.ts` | ~950-960 | R3: fetchRuntimeRequests |
| `apps/runtime-ui/app/lib/runtime-api.ts` | ~970-990 | R2: fetchRuntimeSnapshot (dead code) |
| `apps/runtime-host-bridge/src/index.ts` | 19180-19350 | R5: readEndpointProfileData |
| `packages/catalog/data/normalized-catalog.json` | (whole file) | R9: catalog artifact |

## Reproduction Steps (Novice-Runnable)

### Reproduce the Models mutation freeze
1. Start the packaged runtime: `role-model-runtime.exe`
2. Open `http://127.0.0.1:3456/app/models` in a browser
3. Wait for the model inventory to load
4. Select a configured model with a backing provider account
5. Click "Save bindings" — observe "Saving…" state
6. In a separate terminal, `curl http://127.0.0.1:3456/healthz` — observe timeout
7. The "Saving…" state persists until `GET /api/role-model/requests` completes

### Reproduce cross-route benchmark navigation block
1. With the runtime running, navigate to `/app/models`
2. Immediately (while the deferred `fetchRuntimeRequests()` is still in flight) navigate to `/app/models/benchmark`
3. Observe that the benchmark page stays blank until the Models request history read completes or times out

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Comparison reference: `working-tree`
- Normalized baseline: `7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 7094a252b7cab222f5ff12d1753e77cef83d6a22`
- Tracked product diff: empty; no production or test source changed in Phase 1.
- Phase-owned untracked artifacts: `00-requirements.md` (copied from controller), `00-worktree.md`, `01-as-is.md`.
- Unexplained drift: none after distinguishing product diff from run-local untracked control artifacts.

## Subagent Contribution Verification

- Reviewed Action Records: none; self-audit, no subagent used.
- Main-Agent Verification Performed: N/A.
- Acceptance Decision: N/A.

## Gaps Found

None. Phase 1 identified no analysis gaps; all current-state defects are mapped above and remain implementation work for later phases. Phase 1.5 must confirm the causal chain with a minimal deterministic reproduction before Phase 2.

## Repair Work Performed

None needed. No unresolved gaps found.

## Requirement Completion Status

- `R1` | Status: `blocked` | Rationale: Phase 1.5 revalidation required before Phase 2 | Blocking Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md`
- `R2` | Status: `blocked` | Rationale: SQLite defect documented but not yet fixed | Blocking Evidence: `role-model-router/packages/sqlite-memory/src/index.ts`
- `R3` | Status: `blocked` | Rationale: mutation handlers still await `fetchRuntimeRequests` | Blocking Evidence: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `R4` | Status: `blocked` | Rationale: benchmark startup still uses 7-read `Promise.all`; cross-route block still exists | Blocking Evidence: `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `R5` | Status: `blocked` | Rationale: `readEndpointProfileData` still performs unindexed table scans | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R6` | Status: `blocked` | Rationale: save correctness must be verified after removing advisory reads | Blocking Evidence: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `R7` | Status: `blocked` | Rationale: eject semantics must be verified after removing advisory reads | Blocking Evidence: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `R8` | Status: `blocked` | Rationale: post-mutation payload is still excessive | Blocking Evidence: `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `R9` | Status: `blocked` | Rationale: compact catalog serialization not yet implemented | Blocking Evidence: `role-model-router/packages/catalog/data/normalized-catalog.json`
- `R10` | Status: `blocked` | Rationale: rebuilt-runtime verification deferred to later phases | Blocking Evidence: `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md`
- `OOS1` | Status: `deferred` | Rationale: providers-page optimization is deferred per requirements OOS1 | Scope Decision: `00-requirements.md`
- `OOS2` | Status: `deferred` | Rationale: catalog persistence migration is deferred per OOS2 | Scope Decision: `00-requirements.md`
- `OOS3` | Status: `deferred` | Rationale: telemetry redesign is deferred per OOS3 | Scope Decision: `00-requirements.md`
- `OOS4` | Status: `deferred` | Rationale: upstream catalog refresh is deferred per OOS4 | Scope Decision: `00-requirements.md`
- `OOS5` | Status: `deferred` | Rationale: breaking API removal is deferred per OOS5 | Scope Decision: `00-requirements.md`
- `OOS6` | Status: `deferred` | Rationale: broader Models-page redesign is deferred per OOS6 | Scope Decision: `00-requirements.md`

## Traceability

- R1 → AS-IS sections 1, 2, 3, 4 and investigation evidence; Phase 1.5 will revalidate root cause
- R2 → AS-IS section "R2 — Recent-request summaries are not indexed or projection-only"; sqlite-memory/src/index.ts:4081
- R3 → AS-IS section "R3 — Advisory reads block Models mutation completion"; control-models.tsx saveAccountRoles/removeConfiguredModel
- R4 → AS-IS section "R4 — Benchmark navigation is not independently responsive"; control-benchmark.tsx Promise.all
- R5 → AS-IS section "R5 — Benchmark profile enrichment is not indexed or bounded"; index.ts readEndpointProfileData
- R6 → AS-IS section "R6, R7 — Mutation correctness must be preserved"; control-models.tsx createAccountMutationPayload
- R7 → AS-IS section "R6, R7 — Mutation correctness must be preserved"; Run 76 03-implementation-summary.md
- R8 → AS-IS section "R8 — Post-mutation payload is excessive"; control-models.tsx loadConfiguredModelsInitialData
- R9 → AS-IS section "R9 — Catalog artifact is large but not the freeze cause"; catalog/data/normalized-catalog.json
- R10 → AS-IS section "R10 — Route audit confirms single route ownership"; runtime-api.ts, route files

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] R1-R10 are mapped to current code and behavior
- [x] All 6 OOS items are deferred with rationale
- [x] Prior-run design intent is reconciled (Run 67, Run 76)
- [x] Evidence from investigation is cited and grounded
- [x] Audit passes

Coverage: PASS

## Approval Gate

- [x] The AS-IS causal chain is concrete enough for Phase 1.5 revalidation
- [x] All 10 requirements have code pointers, failure mechanisms, and affected file lists
- [x] Audit passes

Approval: PASS
