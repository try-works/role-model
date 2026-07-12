Run: `/.recursive/run/66-remote-providers-deferred-request-id-loading/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-12T03:57:42Z`
LockHash: `752673cc64374f84dfd3b9c0ab4f7a82d92ca10e799d855194392bc2cb23e42e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md` (LOCKED)
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-worktree.md` (LOCKED)
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/01-as-is.md` (LOCKED)
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/01.5-root-cause.md` (LOCKED)
Outputs:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/02-to-be-plan.md`
Scope note: Defines the implementation plan for removing request-history from the providers-page first-render path, adding a deferred latest-10 request-id fetch, preserving the existing rich request-ledger surfaces, and executing the run under strict TDD.

## TODO

- [x] Map `R1` through `R8` to concrete file changes
- [x] Decide the route-specific contract split for providers bootstrap versus deferred request ids
- [x] Define strict RED-first test slices before any production edits
- [x] Define the verification floor and rebuilt-runtime QA plan
- [x] Record plan drift check against the locked requirements and root-cause analysis
- [x] Audit the plan for recursive-mode readiness

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: the thread tool inventory exposes deferred multi-agent tooling through `tool_search`, but this worktree still lacks a refreshed `/.recursive/config/recursive-router-discovered.json`.
Delegation Decision Basis: Phase 2 is direct local planning against locked requirements, locked AS-IS analysis, and locked root-cause analysis. No delegated planner is required to decide the route and test boundaries.
Delegation Override Reason: subagent tooling exists in the wider session, but the worktree-local routing discovery inventory is absent and this plan can be constructed directly from the confirmed local evidence.
Audit Inputs Provided:
- locked run-66 requirements and worktree artifacts
- locked Phase 1 and Phase 1.5 artifacts
- current runtime-ui, host-bridge, and sqlite-memory sources
- current runtime-ui and backend tests

## Effective Inputs Re-read

- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-worktree.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/01-as-is.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/01.5-root-cause.md`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`

## Planned Contract Decisions

1. **Keep the current rich request-history route unchanged.**
   - `/api/role-model/requests` remains the rich recent-observation surface used for request-detail and existing debugging flows.
2. **Add a new lightweight providers-page route for recent ids.**
   - New backend route: `GET /api/role-model/requests/latest-ids?limit=10`
   - Response contract: ordered array of request ids, newest first, limited to `10`.
3. **Add a providers-specific lighter UI bootstrap helper.**
   - New runtime-ui helper: `fetchProvidersSnapshot()`
   - This helper loads only the providers-page first-render dependencies and intentionally omits request history.
4. **Fetch the latest `10` request ids after initial providers-page load.**
   - The providers route schedules a non-blocking follow-up once the initial snapshot and role policy have loaded.
   - Follow-up failure is isolated from the already-rendered page state.
5. **Keep the deferred ids in route-local state only.**
   - No new providers-page request-history UI is introduced in this run unless implementation proves a minimal existing consumer already needs the ids visibly.

## Planned Changes by File

### `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

- Add a providers-page-specific snapshot type and helper:
  - `ProvidersSnapshot` or equivalent route-local contract
  - `fetchProvidersSnapshot()`
- Add a lightweight recent-id helper:
  - `fetchRecentRequestIds(limit = 10)`
- Leave `fetchRuntimeSnapshot()` intact for current consumers that still rely on the broad contract.

### `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`

- Add RED-first tests proving:
  - `fetchProvidersSnapshot()` does not call `/api/role-model/requests`
  - `fetchRecentRequestIds(10)` targets the new latest-ids route
  - `fetchRuntimeSnapshot()` remains unchanged for current broad consumers

### `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`

- Replace `fetchRuntimeSnapshot()` with `fetchProvidersSnapshot()` inside the providers-route bootstrap.
- Add route-local state for deferred recent request ids and any non-blocking follow-up failure tracking needed for verification.
- Trigger the latest-10 request-id fetch only after the initial providers-page load has completed.
- Ensure follow-up failures do not clear or replace the already-loaded providers page state.

### `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`

- Add RED-first route-behavior tests proving:
  - initial providers-page load does not require `/api/role-model/requests`
  - the deferred latest-10 request-id fetch starts only after the initial load settles
  - follow-up failure does not clear the loaded page state

### `/role-model-router/apps/runtime-host-bridge/src/index.ts`

- Add a new HTTP route for latest request ids only:
  - `GET /api/role-model/requests/latest-ids`
- Add backend method wiring such as `listRecentRequestIds(limit?: number)`.
- Preserve current `/api/role-model/requests` and `/api/role-model/requests/:id` behavior unchanged.

### `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

- Add RED-first tests proving:
  - the new latest-ids route returns ordered ids only
  - `limit=10` is enforced
  - existing `/api/role-model/requests` rich rows still include `clientRequestId` and other current fields

### `/role-model-router/packages/sqlite-memory/src/index.ts`

- Add a new read helper such as `listRecentRuntimeRequestIds({ databasePath, limit })`.
- Implement it with an ids-only query against `runtime_observations` ordered by `created_at_ms DESC, request_id DESC`.
- Do not select or parse `observation_json`.

### `/role-model-router/packages/sqlite-memory/test/index.test.ts`

- Add RED-first tests proving:
  - the helper returns ids in recency order
  - the helper enforces `limit = 10`
  - empty ledgers return an empty array
  - rows with invalid or irrelevant `observation_json` still succeed, proving the helper does not parse that column

### `/role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts` or new providers E2E spec

- Extend the rebuilt-runtime Playwright proof path to cover the providers page after the route split.
- Prove the page becomes visible with the lightweight bootstrap contract and that the deferred latest-10 follow-up does not break the loaded page.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "The initial `/app/remote/providers` route load must complete from provider/account/model/runtime readiness data only, without waiting for request-history data that is not required to make the page usable." | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: runtime-api and providers-route tests proving no `/api/role-model/requests` dependency on first render | QA Surface: rebuilt-runtime providers-page load proof
- `R2` | Coverage: direct | Source Quote: "Once the providers page has finished its initial load and visible state is in place, it should begin a separate follow-up fetch for the latest `10` request ids only." | Implementation Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: providers-route tests for deferred follow-up timing and `limit=10` | QA Surface: Playwright and rebuilt-runtime providers-page proof
- `R3` | Coverage: direct | Source Quote: "the backend must provide a lightweight way to read only the latest request ids" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: host-bridge and sqlite-memory tests for ids-only ordering/limit/no-parse behavior | QA Surface: rebuilt-runtime network proof against the latest-ids route
- `R4` | Coverage: direct | Source Quote: "The providers-page performance fix must not accidentally degrade richer request-history surfaces that exist for Observe, request detail, or runtime inspection." | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Verification Surface: runtime-api tests keeping `fetchRuntimeSnapshot()` unchanged and host-bridge tests keeping `/api/role-model/requests` rich output unchanged | QA Surface: existing rich request-detail flows remain valid after the change
- `R5` | Coverage: direct | Source Quote: "the fix must be protected by tests" | Implementation Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts` | Verification Surface: RED and GREEN evidence across runtime-ui and backend/storage tests | QA Surface: Phase 3 TDD compliance log and later browser proof
- `R6` | Coverage: direct | Source Quote: "Phase 3 for this run must use `TDD Mode: strict`" | Implementation Surface: `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts` | Verification Surface: RED logs, GREEN logs, and locked Phase 3 TDD compliance log | QA Surface: not applicable in Phase 2; carried into Phase 3
- `R7` | Coverage: direct | Source Quote: "the run must not stop at abstract coverage claims" | Implementation Surface: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/package.json`, `/role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts` | Verification Surface: exact commands recorded in Phase 4, including runtime-ui tests, host-bridge and/or sqlite-memory tests, `runtime:validate-ui`, and `runtime:test-browser` or equivalent | QA Surface: Phase 4 and Phase 5 verification receipts
- `R8` | Coverage: direct | Source Quote: "The final verification for this run must include rebuilt-runtime browser proof for `/app/remote/providers`, not only file-level tests, validator output, or a stale prior runtime process." | Implementation Surface: `/.recursive/run/66-remote-providers-deferred-request-id-loading/05-manual-qa.md`, `/role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts`, `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts` | Verification Surface: rebuilt runtime on recorded URL/port plus browser proof and route logs | QA Surface: agent-operated providers-page review on the rebuilt runtime

## Implementation Steps

1. **RED: runtime-api contract split**
   - Write failing tests for `fetchProvidersSnapshot()` and `fetchRecentRequestIds(10)`.
2. **RED: providers-route deferred behavior**
   - Write failing route tests proving first render no longer depends on request history and the latest-10 follow-up happens after load.
3. **RED: lightweight backend path**
   - Write failing sqlite-memory tests for recency ordering, `limit=10`, empty state, and no-`observation_json` parsing.
   - Write failing host-bridge tests for the new `latest-ids` route.
4. **GREEN: backend/storage implementation**
   - Add the sqlite ids-only helper and host-bridge latest-ids route.
5. **GREEN: runtime-ui implementation**
   - Add `fetchProvidersSnapshot()` and `fetchRecentRequestIds()`.
   - Switch the providers route to the lighter bootstrap plus deferred follow-up.
6. **GREEN: preserve rich request surfaces**
   - Keep `fetchRuntimeSnapshot()`, `/api/role-model/requests`, and `/api/role-model/requests/:id` behavior unchanged and reverify.
7. **REFACTOR: browser-proof path**
   - Update the providers-page Playwright path only as needed for the new contract.
8. **Verification**
   - Run the targeted floor, then rebuilt-runtime browser proof and agent-operated QA.

## Testing Strategy

### RED tests

- `runtime-api`
  - `fetchProvidersSnapshot()` omits `/api/role-model/requests`
  - `fetchRecentRequestIds(10)` calls `/api/role-model/requests/latest-ids?limit=10`
  - `fetchRuntimeSnapshot()` still includes `/api/role-model/requests`
- `providers route`
  - page load completes without waiting for request-history fetch
  - deferred latest-10 fetch starts after initial load
  - deferred latest-10 failure does not clear loaded page state
- `sqlite-memory`
  - ids-only recency ordering
  - `limit=10`
  - empty state
  - invalid `observation_json` does not affect latest-id reads
- `runtime-host-bridge`
  - latest-ids route returns ordered ids only
  - existing rich request-history route is unchanged

### Verification floor

- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/providers.test.ts app/lib/runtime-api.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm run runtime:validate-ui`
- `corepack pnpm run runtime:test-browser` or an equivalent providers-page Playwright proof path

## Playwright Plan (if applicable)

- Extend the existing rebuilt-runtime providers-page Playwright proof to assert:
  - the providers page renders from the lighter bootstrap contract
  - a latest-10 request-id follow-up is issued after the page becomes visible
  - the already-rendered page stays usable if that follow-up fails or is delayed
- Keep the proof scoped to `/app/remote/providers`; do not widen it into a broader request-ledger UI redesign.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

Planned scenarios:

1. Rebuild the runtime from the current worktree state and start it on the recorded URL/port.
2. Open `/app/remote/providers` and confirm the existing provider/account/model controls become visible and usable without waiting on rich request-history.
3. Confirm a deferred latest-10 request-id call occurs after initial load and does not clear or replace the already-rendered page state if it fails.
4. Cross-check that `/api/role-model/requests` rich request-history behavior still works for request-detail/inspection flows after the providers-page optimization.
5. Record the rebuilt-runtime URL/port, startup command, and proof artifacts in Phase 5.

## Idempotence and Recovery

- The new latest-ids route is read-only and deterministic.
- The route-local providers follow-up is safe to rerun on refresh because it only reads the latest `10` ids and must not mutate page state outside its local cache/state.
- If later phases reopen the plan, preserve the route split:
  - providers bootstrap remains request-history-free
  - latest-ids path remains lightweight
  - rich request-history path remains unchanged

## Implementation Sub-phases

1. RED: runtime-ui API contract split
2. RED: providers-route deferred behavior
3. RED: sqlite ids-only helper
4. RED: host-bridge latest-ids route
5. GREEN: sqlite + host-bridge implementation
6. GREEN: runtime-ui helper + route implementation
7. GREEN: rich request-history preservation checks
8. REFACTOR: browser-proof updates and verification cleanup

## Plan Drift Check

- No redesign of Observe, request-detail, or runtime inspection surfaces
- No cleanup or migration of historical `runtime_observations.observation_json` rows
- No generic optimization of every `fetchRuntimeSnapshot()` consumer beyond the providers-page route split
- No packaging changes unless later code changes prove they are actually required
- No new providers-page request-history UI unless existing route behavior requires it to satisfy the locked requirement

## Known Unknowns Carried Forward

- Whether the final providers-route follow-up state needs to be visible or can remain internal-only. The current plan keeps it internal unless implementation proves otherwise.
- Whether the Playwright proof should extend the existing providers spec or create a dedicated deferred-load spec. This is an implementation detail, not a planning blocker.
- Whether the host-bridge latest-ids route should default to `10` when the query param is omitted or require the explicit limit in every caller. The plan assumes default `10` plus an explicit providers call using `limit=10`.

## Traceability

- `R1`: lighter providers bootstrap helper plus providers-route load split
- `R2`: deferred latest-10 follow-up after first render
- `R3`: latest-10 ids-only backend route and sqlite helper
- `R4`: preservation of existing rich request-history and request-detail surfaces
- `R5`: RED-first runtime-ui and backend/storage regression matrix
- `R6`: strict TDD logs and Phase 3 compliance
- `R7`: exact verification commands and providers-page browser proof
- `R8`: rebuilt-runtime providers-page QA on the current worktree build

## Gaps Found

None beyond the already-documented Phase 1 and Phase 1.5 gaps that this plan is intended to close.

## Repair Work Performed

None. This artifact defines the implementation plan only.

## Audit Verdict

Audit: PASS

## Earlier Phase Reconciliation

- `01-as-is.md` established the current blocking providers-route bootstrap, the broad shared snapshot contract, the heavyweight `/api/role-model/requests` ownership, and the current test gaps.
- `01.5-root-cause.md` reduced those findings to four root causes centered on route coupling, shared contract shape, raw-observation backend over-fetch, and missing regression proof.
- This plan addresses each confirmed root cause directly without broadening into a request-ledger redesign or a generic snapshot refactor for every route.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed:
  - planned directly from the locked requirements, locked worktree baseline, locked Phase 1 AS-IS inventory, and locked Phase 1.5 root-cause analysis in the run-66 worktree
  - did not rely on any routed or delegated implementation output
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8fa2f33dacf2b04b924532145d3dbc69555bc6fb`
- Comparison reference: `working-tree`
- Normalized baseline: `8fa2f33dacf2b04b924532145d3dbc69555bc6fb`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8fa2f33dacf2b04b924532145d3dbc69555bc6fb`
- Base branch: `main`
- Worktree branch: `recursive/66-remote-providers-deferred-request-id-loading`
- Active worktree path: `D:\DEV\role-model\.worktrees\66-remote-providers-deferred-request-id-loading\`

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: runtime-api and providers-route tests | QA Surface: rebuilt-runtime providers-page proof
- `R2` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: providers-route tests for deferred follow-up timing | QA Surface: browser-proof path and agent-operated QA
- `R3` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts` | Verification Surface: host-bridge and sqlite-memory latest-id tests | QA Surface: rebuilt-runtime latest-ids request proof
- `R4` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Verification Surface: runtime-api and host-bridge regression tests for unchanged rich surfaces | QA Surface: request-detail/inspection control checks
- `R5` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts` | Verification Surface: RED and GREEN evidence logs | QA Surface: later browser and rebuilt-runtime proof
- `R6` | Status: planned | Implementation Surface: `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts` | Verification Surface: RED logs, GREEN logs, and TDD compliance log | QA Surface: not applicable in Phase 2
- `R7` | Status: planned | Implementation Surface: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/package.json`, `/role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts` | Verification Surface: exact commands recorded in Phase 4 | QA Surface: Phase 5 verification receipts
- `R8` | Status: planned | Implementation Surface: `/.recursive/run/66-remote-providers-deferred-request-id-loading/05-manual-qa.md`, `/role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts`, `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts` | Verification Surface: Phase 5 browser proof on recorded URL/port | QA Surface: agent-operated providers-page QA

## Audit Gate

- [x] Effective upstream artifacts were re-read from disk
- [x] `## Requirement Mapping` covers all in-scope requirements `R1` through `R8`
- [x] `## Plan Drift Check` confirms the plan does not expand beyond approved scope
- [x] `## Requirement Completion Status` records all in-scope requirements `R1` through `R8`
- [x] No implementation work or later-phase verification evidence was falsely claimed in this planning artifact

Audit: PASS

## Coverage Gate

- [x] The plan defines the providers-bootstrap contract split
- [x] The plan defines the latest-10 ids-only backend path
- [x] The plan preserves the existing rich request-history surfaces
- [x] The plan defines the strict RED-first regression matrix
- [x] The plan defines the verification floor and rebuilt-runtime QA path

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to guide TDD implementation without new scope decisions
- [x] The plan maps directly back to the approved requirements and confirmed root causes
- [x] Ready for Phase 3

Approval: PASS
