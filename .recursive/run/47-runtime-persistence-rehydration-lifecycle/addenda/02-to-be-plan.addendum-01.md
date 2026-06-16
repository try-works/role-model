Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `02 To-Be Plan`
Addendum: `01`
Status: `LOCKED`
LockedAt: `2026-06-16T03:16:31Z`
LockHash: `db2906579c975e4f5eeaba6eed7de6b917aa997083395bc1aa1f8b87683a4e71`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/05-manual-qa.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.addendum-01.md` (LOCKED)
- Operator follow-up on latest-request behavior (2026-06-16)
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-01.md`
Scope note: Post-lock implementation plan for overview telemetry semantics, latest-request identity/filtering, tokens aggregation, router alias inventory, packaged observe activity, and alias-drift refresh behavior discovered during manual QA after the base run locked. Supplements locked `02-to-be-plan.md` without editing it.

## TODO

- [x] Re-read locked effective inputs and post-lock QA findings
- [x] Trace each surfaced issue to concrete frontend/backend fault boundaries
- [x] Convert findings into bounded implementation slices with TDD requirements
- [x] Define Phase 4 and Phase 5 re-verification targets for the follow-up work
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: canonical lifecycle/readiness, backend-owned truth, packaged-runtime proof, and design-system-first constraints (`R4`, `R8`, `R10`, `R15`, `R16`, `R17`)
- `02-to-be-plan.md`: locked SP47-A through SP47-F plan focused on lifecycle/readiness and credential-maintenance surfaces
- `05-manual-qa.md`: locked run-47 QA receipt
- `05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md`: prior Phase 5 compensation pattern for locked-history gaps
- `05-manual-qa.addendum-01.md`: F1-F6 findings and current fault boundaries
- `apps/runtime-ui/app/lib/design-system.ts`: `/app` is explicitly described as a telemetry-first overview
- `apps/runtime-ui/app/routes/dashboard.tsx`: overview cards, endpoint comparison, and latest-requests widget
- `apps/runtime-ui/app/routes/requests.tsx`: canonical recent-request ledger route
- `apps/runtime-ui/app/routes/router.tsx`: alias inventory consumer path
- `apps/runtime-ui/app/routes/observe-activity.tsx`: packaged host-activity consumer path
- `apps/runtime-ui/app/routes/session-readiness.tsx`: alias-drift consumer path
- `apps/runtime-ui/app/lib/runtime-api.ts`: telemetry/activity/runtime fetch helpers
- `apps/runtime-ui/app/lib/view-models.ts`: telemetry summary, request rows, and alias readiness transforms
- `apps/runtime-host-bridge/src/index.ts`: telemetry query defaults, request-id fallback, router overview data, alias drift publication, activity endpoints
- `apps/runtime-host-bridge/src/cli.ts`: packaged CLI wiring for `/api/metrics`
- `apps/runtime-host-bridge/src/routable-inventory.ts`: alias resolution and drift-warning logic
- `packages/sqlite-memory/src/index.ts`: telemetry ledger query ordering and `INSERT OR REPLACE` keyed by `request_id`

## Problem statement

The locked run-47 plan corrected lifecycle/readiness authority for the scoped persistence and restart surfaces, but packaged manual QA exposed adjacent runtime-ui surfaces that still present split truth or misleading telemetry:

1. `/app` mixes telemetry-window data with current-state expectations.
2. `Latest requests` is not a true live-operator feed and can also collapse repeated bridge requests into one row when callers omit a request id.
3. The overview `Tokens` card drops estimate-only costs from its summary.
4. `/app/router` alias inventory is still derived from config hints plus snapshot endpoints instead of the backend's resolved routable alias view.
5. `/app/observe/activity` is effectively stubbed in packaged mode.
6. `/app/system/session-readiness` alias drift can continue to show stale hint ids after the operator believes config changed.

This addendum functions as a plan amendment for the remaining follow-up work. It does not change the locked run-47 receipts retroactively.

## Root-cause refinement

### F1 — Overview semantics mismatch is partly contractual, not only a rendering bug

- `design-system.ts` already describes `/app` as a telemetry-first overview.
- `dashboard.tsx` and `fetchTelemetryDashboard()` are intentionally backed by:
  - `/api/role-model/telemetry/summary`
  - `/api/role-model/telemetry/rows`
  - `/api/role-model/telemetry/requests`
- The cards and comparison rows therefore summarize a bounded request ledger, not comprehensive runtime state.

**Planning consequence**

- The follow-up fix must choose one contract and make the page explicit:
  - either `/app` becomes a current-state overview with separate recent-activity panels,
  - or it stays telemetry-first and the UI copy/section labels stop implying comprehensive live state.
- Operator feedback indicates the first option is the correct product direction.

### F2 — Latest-request behavior has two independent faults

**Fault A: wrong query semantics for the overview widget**

- `dashboard.tsx` uses `buildTelemetryRequestRows(dashboard.requests).slice(0, 3)`.
- The backend default query is the same `24h` / `50` telemetry ledger used by the full requests page.
- Benchmark rows therefore remain in slots 2-3 until enough newer rows displace them.

**Fault B: repeated bridge traffic can overwrite itself**

- `readBridgeRequestId()` falls back to constant `req-runtime-host-bridge` when the caller omits `x-request-id` or `x-role-model-request-id`.
- SQLite telemetry and observation persistence use `INSERT OR REPLACE` keyed by `request_id`.
- Repeated host-bridge requests with no caller-supplied request id therefore replace the prior row instead of appending a distinct request.

**Planning consequence**

- The follow-up must fix both:
  - unique persisted request identity for every inbound bridge request
  - an explicit live-operator/latest-request query separate from the full telemetry ledger

### F3 — Tokens summary needs per-record effective-cost semantics, not naive actual-only totals

- `summarizeTelemetryStats()` currently renders only `summary.totalActualCostUsd`.
- Some providers record estimate-only cost.
- A correct total cannot blindly sum `totalActualCostUsd + totalEstimatedCostUsd` if any row can carry both values.

**Planning consequence**

- The backend summary contract should expose a blended/effective total computed per request:
  - use actual cost when present
  - otherwise use estimated cost
- The UI card should display that effective total and optionally note actual-vs-estimate coverage.

### F4 — Router alias inventory still uses client-side hint joins instead of canonical backend resolution

- `router.tsx` calls `buildAliasReadinessRows(config.modelAliases, snapshot.endpoints)`.
- `buildAliasReadinessRows()` only matches exact endpoint `modelId` values against alias hint `modelIds`.
- The backend routing path resolves aliases against current routable inventory via `resolveAliasAllowEndpoints()`.

**Planning consequence**

- Router overview needs a backend-published alias-resolution contract with:
  - hint model ids
  - resolved live model ids
  - allow endpoints
  - ready/degraded/unavailable status derived from current routable inventory
  - drift warnings sourced from the same resolution pass

### F5 — Packaged observe activity is stubbed at the CLI integration layer

- `createCliServerOptions()` sets `listActivityMetrics: async () => []`.
- The packaged CLI also does not pass through `readActivityCapture`, so `/api/captures/:id` cannot be satisfied there either.

**Planning consequence**

- The packaged runtime must wire both activity list and capture-detail APIs to real persisted observability data, or the route must be intentionally disabled with explicit messaging. Operator feedback indicates wiring the real data is the correct path.

### F6 — Alias drift warning is likely stale backend config state, not a stale UI-local cache

- Session readiness reads `summary.aliasDrift`.
- The backend rebuilds drift warnings from `currentUnifiedRuntimeConfig?.modelAliases` and `currentRoutableInventory`.
- The stale `moonshot/kimi-k2.6` warning therefore points to an upstream config-update/reload/invalidation problem.

**Planning consequence**

- The follow-up must trace config mutation and reload boundaries, then add tests proving alias drift clears after the hint is removed from canonical config.

## Requirement delta

| Finding | Locked requirement linkage | Disposition |
| --- | --- | --- |
| `F1` overview current-state mismatch | `R4`, `R8`, `R15`, `R17` | remediate |
| `F2` latest-request semantics + request-id collapse | `R8`, `R10`, `R15`, `R17` | remediate |
| `F3` tokens summary undercount | `R8`, `R10` | remediate |
| `F4` router alias inventory split truth | `R4`, `R15`, `R17` | remediate |
| `F5` packaged observe activity stub | `R8`, `R10` | remediate |
| `F6` alias drift stale hint persistence | `R8`, `R15`, `R16`, `R17` | remediate |

## Worktree execution context

| Field | Value |
| --- | --- |
| Worktree | `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle` |
| Branch | `recursive/47-runtime-persistence-rehydration-lifecycle` |
| Run control plane | `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/` in worktree only |
| Primary product paths | `role-model-router/apps/runtime-ui/...`, `role-model-router/apps/runtime-host-bridge/...`, `role-model-router/packages/sqlite-memory/...` |

## Implementation slices

### SP47-G — `/app` overview becomes explicit current-state + recent-activity split (`F1`)

**TDD mode:** strict, with the existing design-system/docs-first exception

**Plan**

1. Update `DESIGN_SYSTEM.md` and route metadata so `/app` is no longer described as only a telemetry-first board.
2. Move top cards and `Endpoint comparison` to canonical current-state sources:
   - `RuntimeSummary`
   - `RuntimeSnapshot`
   - canonical lifecycle/inventory data already introduced by run 47
3. Keep recent request flow as a separate telemetry-derived panel with explicit recent-activity wording.
4. Ensure cards like `Requests` and `Failures` are labeled as session/window activity if they remain telemetry-based, or replace them with current-state metrics if they move to snapshot-backed semantics.

**Primary files**

- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-g-overview-contract.red.log`
- GREEN: `evidence/logs/sp47-g-overview-contract.green.log`

### SP47-H — unique bridge request identity + latest-live request query (`F2`)

**TDD mode:** strict

**Plan**

1. Replace the constant `req-runtime-host-bridge` fallback with a unique server-generated request id for every inbound bridge request that does not provide one.
2. Preserve optional caller correlation separately:
   - keep the supplied `x-request-id` or `x-role-model-request-id` as client correlation metadata when present
   - persist a distinct transport/request-ledger id even when the caller id is missing or reused
3. Extend the telemetry/request-observation contract with request classification needed by overview widgets:
   - `requestOrigin` or equivalent (`interactive`, `benchmark`, `validation`, `system`)
   - requested alias/model label when the request was alias-routed
   - selected endpoint / effective routing mode display fields
4. Keep `/app/observe/requests` as the complete telemetry ledger.
5. Change the `/app` `Latest requests` widget to query a filtered live-operator feed rather than `slice(0, 3)` over the full bounded ledger.
6. Display alias-routed traffic as request rows with meaningful routing labels rather than a single repeated bridge request id.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-h-request-identity.red.log`
- GREEN: `evidence/logs/sp47-h-request-identity.green.log`

### SP47-I — effective-cost summary for the overview tokens card (`F3`)

**TDD mode:** strict

**Plan**

1. Add a backend summary field for effective/blended cost computed per request:
   - actual cost when present
   - estimate when actual is absent
2. Optionally expose coverage counts so the UI can disclose how much of the total is actual-vs-estimate.
3. Update the tokens card to use the effective total rather than actual-only cost.

**Primary files**

- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-i-effective-cost.red.log`
- GREEN: `evidence/logs/sp47-i-effective-cost.green.log`

### SP47-J — backend-published alias inventory for `/app/router` (`F4`)

**TDD mode:** strict

**Plan**

1. Publish canonical alias inventory/resolution data from the backend/router layer, derived from:
   - configured alias hints
   - current routable inventory
   - `resolveAliasAllowEndpoints()`
2. Include enough data for the route to show:
   - alias id and mode
   - configured hint model ids
   - resolved live model ids
   - allowed endpoints
   - readiness status
   - drift warnings
3. Replace `buildAliasReadinessRows(configAliases, snapshot.endpoints)` with presentation over the backend-published alias contract.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-j-alias-inventory.red.log`
- GREEN: `evidence/logs/sp47-j-alias-inventory.green.log`

### SP47-K — packaged observe-activity parity (`F5`)

**TDD mode:** strict

**Plan**

1. Extend the CLI bridge backend surface to pass real observability readers through packaged mode:
   - `listActivityMetrics`
   - `readActivityCapture`
2. Back `/api/metrics` and `/api/captures/:id` with the same persisted activity/capture source used elsewhere, not an empty stub.
3. Keep the route wording aligned with the actual source once parity is restored.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-k-observe-activity.red.log`
- GREEN: `evidence/logs/sp47-k-observe-activity.green.log`

### SP47-L — alias-drift config reload and invalidation repair (`F6`)

**TDD mode:** strict

**Plan**

1. Trace the canonical unified-runtime-config update path and the conditions that recompute:
   - `currentUnifiedRuntimeConfig`
   - `currentRoutableInventory`
   - `currentAliasDriftWarnings`
2. Add tests proving that removing a stale hint model id from config clears the corresponding alias-drift warning after the same update/reload flow the packaged runtime uses.
3. Ensure the packaged summary/readiness surfaces refresh from canonical post-update state rather than lingering prior drift warnings.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-l-alias-drift-refresh.red.log`
- GREEN: `evidence/logs/sp47-l-alias-drift-refresh.green.log`

## TDD compliance summary

TDD Mode: `strict`

Policy:

- Documentation-only contract updates in `DESIGN_SYSTEM.md` may precede code.
- Every production TypeScript change after that point must start from a failing test at the nearest relevant layer.
- No production code is accepted without recorded RED then GREEN evidence.

| Slice | RED required | GREEN / follow-up proof |
| --- | --- | --- |
| `SP47-G` | yes | dashboard contract tests + packaged overview verification |
| `SP47-H` | yes | bridge/sqlite request-ledger tests + live latest-request verification |
| `SP47-I` | yes | sqlite summary tests + tokens-card regression |
| `SP47-J` | yes | alias-resolution contract tests + router overview verification |
| `SP47-K` | yes | packaged activity API tests + live observe-activity verification |
| `SP47-L` | yes | config reload/drift-clearing tests + packaged readiness verification |

## Phase 4 verification floor (addendum)

Run from worktree `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle`.

| Command focus | Slice | Pass criteria |
| --- | --- | --- |
| runtime-ui dashboard/view-model tests | `SP47-G`, `SP47-H`, `SP47-I`, `SP47-J` | overview semantics, request widget, tokens card, alias inventory assertions pass |
| host-bridge targeted tests | `SP47-H`, `SP47-J`, `SP47-K`, `SP47-L` | request identity, alias contract, packaged activity wiring, alias-drift refresh pass |
| sqlite-memory targeted tests | `SP47-H`, `SP47-I` | request-ledger persistence and effective-cost aggregation pass |
| focused packaged validation harness | `SP47-G` through `SP47-L` | packaged runtime summary/requests/router/activity/session checks pass without relying on stubs |

Aggregate log:

- `evidence/logs/phase4-addendum-01-verification-floor.green.log`

## Phase 5 re-verification matrix (addendum)

All scenarios run against the rebuilt packaged runtime.

| ID | Scenario | Pass criteria | Evidence |
| --- | --- | --- | --- |
| `Q-A1` | `/app` overview current-state contract | endpoint comparison and top cards reflect canonical current state; recent-activity panels are explicitly labeled | screenshot + packaged summary log |
| `Q-A2` | Latest live requests | multiple interactive requests without caller-supplied request ids append distinct rows; benchmark rows do not pin slots 2-3 in the overview widget | request ledger log + screenshot |
| `Q-A3` | Tokens card | estimate-only provider traffic contributes to displayed cost without double counting actual-cost rows | screenshot + telemetry summary log |
| `Q-A4` | Router alias inventory | alias coverage shows configured hints plus canonical resolved coverage/endpoints from backend truth | screenshot + router JSON log |
| `Q-A5` | Observe activity packaged mode | `/app/observe/activity` shows recent activity rows and capture drill-in from the packaged runtime | screenshot + `/api/metrics` / `/api/captures/:id` log |
| `Q-A6` | Session alias drift refresh | stale `moonshot/kimi-k2.6` warning clears after canonical config update/removal and packaged reload | summary JSON log + screenshot |

## Implementation order

1. `SP47-H` request identity fix first, because it changes the telemetry ledger semantics underlying both `/app` and `/app/observe/requests`.
2. `SP47-I` effective-cost summary next, because it is low-risk and isolates the tokens-card regression.
3. `SP47-J` and `SP47-L` together, because alias inventory and alias drift need the same canonical config/inventory refresh truth.
4. `SP47-K` packaged activity parity, because packaged-mode observability is currently stubbed and blocks meaningful route verification.
5. `SP47-G` overview contract update after the new backend/request/alias inputs are available, so the UI is not redesigned around the wrong data seams.
6. Rebuild the packaged runtime and execute `Q-A1` through `Q-A6`.

## Traceability

| Requirement / finding | Slice | Verification |
| --- | --- | --- |
| `R4`, `F1` | `SP47-G`, `SP47-J` | overview + router packaged verification |
| `R8`, `F1`, `F2`, `F3`, `F5`, `F6` | `SP47-G`, `SP47-H`, `SP47-I`, `SP47-K`, `SP47-L` | summary/request/activity/readiness logs |
| `R10`, `F2`, `F3`, `F5` | `SP47-H`, `SP47-I`, `SP47-K` | rebuilt packaged runtime verification |
| `R15`, `F1`, `F4`, `F6` | `SP47-G`, `SP47-J`, `SP47-L` | backend-published truth consumed by UI |
| `R16`, `F6` | `SP47-L` | config identity / drift-refresh regression tests |
| `R17`, `F1`, `F2`, `F4`, `F6` | `SP47-G`, `SP47-H`, `SP47-J`, `SP47-L` | no parallel truth remains across dashboard/router/readiness consumers |

## Out of scope

- Editing locked base run receipts outside this addendum path
- Reclassifying the full telemetry ledger as non-canonical; `/app/observe/requests` remains the complete request ledger
- New provider/model onboarding work unrelated to the surfaced follow-up defects
- Broad runtime-ui redesign outside the affected overview/router/observe/readiness surfaces

## Coverage Gate

- [x] F1-F6 are mapped to concrete implementation slices
- [x] The latest-request root cause includes both query-scope and constant-request-id failure modes
- [x] Phase 4 and Phase 5 verification targets are defined for all surfaced issues
- [x] Locked artifacts are supplemented via addendum only

Coverage: PASS

## Approval Gate

- [x] The follow-up plan is concrete enough to start strict-TDD implementation when authorized
- [x] The addendum supplements the locked Phase 2 plan without rewriting locked history
- [x] The work can proceed from this addendum as the effective plan amendment for the follow-up slices

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: `tool_search` resolved `multi_agent_v1.spawn_agent`, `wait_agent`, and related tools on 2026-06-16
- Delegation Decision Basis: audited Phase 2 addendum required only repo-document planning and fault-boundary reconciliation
- Delegation Override Reason: current subagent tool contract allows spawning only when the user explicitly requests delegation or parallel agent work; no such authorization was given in this turn
- Audit Inputs Provided:
  - `00-requirements.md`
  - `02-to-be-plan.md`
  - `05-manual-qa.md`
  - `addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md`
  - `addenda/05-manual-qa.addendum-01.md`
  - affected `runtime-ui`, `runtime-host-bridge`, and `sqlite-memory` code refs listed above

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read locked run artifacts, traced current packaged/runtime code paths, confirmed request-id fallback and telemetry replacement behavior, and reconciled the follow-up plan against locked run-47 requirements
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

Audit: PASS
