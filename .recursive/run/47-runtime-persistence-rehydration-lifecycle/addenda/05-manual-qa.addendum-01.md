Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `05 Manual QA`
Addendum: `01`
Status: `LOCKED`
LockedAt: `2026-06-16T03:06:54Z`
LockHash: `0859427b46b041e314840e3f4fe53899ea21f6e209e9a8fa846a8398fc2d3e3f`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/05-manual-qa.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md` (LOCKED)
- Operator manual QA feedback (2026-06-16) on overview, router, observe, and session surfaces
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.addendum-01.md`
Scope note: Post-lock operator QA findings for packaged/runtime-host surfaces adjacent to run 47. Records the observed issues, traces each UI surface to its current data source, and identifies likely fault boundaries without editing the locked Phase 5 receipt.

## TODO

- [x] Capture operator manual QA findings
- [x] Trace each affected UI surface to its current backend/API source
- [x] Record likely fault boundaries and follow-up targets
- [x] Reconcile findings with the locked Phase 5 receipt
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `05-manual-qa.md` (LOCKED): packaged-runtime receipt and scoped fixture verification
- `dashboard.tsx`: `/app` overview surface wiring
- `router.tsx`: `/app/router` alias inventory surface wiring
- `observe-activity.tsx`: `/app/observe/activity` host-activity surface wiring
- `session-readiness.tsx`: `/app/system/session-readiness` drift-warning surface wiring
- `runtime-api.ts`: runtime-ui fetch helpers for telemetry, snapshot, router, and activity endpoints
- `view-models.ts`: telemetry summary, request rows, alias readiness, and alias drift presentation logic
- `apps/runtime-host-bridge/src/index.ts`: telemetry summary/rows/requests, routable inventory, and alias drift summary publication
- `apps/runtime-host-bridge/src/cli.ts`: packaged CLI/server wiring
- `packages/sqlite-memory/src/index.ts`: persisted telemetry query and summary behavior

## Reconciliation with locked `05-manual-qa.md`

The locked Phase 5 artifact focused on run-47 requirements around runtime persistence, lifecycle authority, stale-state archival, reconnect/update-key repair flows, and cross-surface readiness agreement for the explicit `L1/O1/K1/S1` fixture matrix.

The operator feedback below identifies additional UI/data-quality issues on adjacent packaged-runtime surfaces. These findings do not invalidate the locked run-47 requirement receipt directly, but they do show follow-up gaps in inherited telemetry, overview, alias-inventory, and host-activity surfaces that were observable during manual QA after lock.

## Operator Manual QA Findings (2026-06-16)

### F1 — `/app` overview uses telemetry-window data, not comprehensive current runtime state

**Observed**

- The overview page `Endpoint comparison` section is not displaying up-to-date or comprehensive current-state information.
- The top-level `Requests` and `Failures` cards also appear incorrect for the current runtime posture.

**Current data source**

- `apps/runtime-ui/app/routes/dashboard.tsx`
  - loads `fetchTelemetryDashboard()`
  - renders `buildTelemetryComparisonCards(dashboard.rows)`
  - renders `summarizeTelemetryStats(dashboard.summary)`
- `apps/runtime-ui/app/lib/runtime-api.ts`
  - `fetchTelemetryDashboard()` calls:
    - `/api/role-model/telemetry/summary`
    - `/api/role-model/telemetry/rows`
    - `/api/role-model/telemetry/requests`
- `apps/runtime-host-bridge/src/index.ts`
  - `normalizeTelemetryQuery()` defaults to:
    - `windowMs = 24h`
    - `limit = 50`
- `packages/sqlite-memory/src/index.ts`
  - telemetry summary and row APIs are computed from persisted `runtime_telemetry_records`
  - ordered by `created_at_ms DESC`
  - limited to the active window/query

**Likely issue**

- The `/app` overview is effectively a **recent telemetry dashboard**, not a **current runtime state** overview.
- The `Endpoint comparison` rows only show endpoints that appear in recent telemetry records; configured endpoints with no recent traffic are absent.
- The `Requests` and `Failures` cards summarize the same bounded telemetry window, so benchmark traffic, historical activity inside the last 24 hours, and non-interactive/system traffic can dominate the numbers even when they do not represent the current operator session.

**Primary fault boundary**

- IA/data-contract mismatch between what `/app` appears to promise ("current state") and what it actually renders (windowed telemetry summary).

### F2 — `/app` latest-requests list is fed by the same bounded telemetry ledger and is not filtered to live operator traffic

**Observed**

- The `Latest requests` section often updates only the first row with the newest host-bridge request.
- After that, older benchmark requests remain fixed in the second and third slots instead of being displaced by a broader live request view.

**Current data source**

- `apps/runtime-ui/app/routes/dashboard.tsx`
  - `const requestRows = buildTelemetryRequestRows(dashboard.requests);`
  - renders `requestRows.slice(0, 3)`
- `apps/runtime-ui/app/lib/view-models.ts`
  - `buildTelemetryRequestRows()` sorts by `createdAtMs DESC`
- `apps/runtime-ui/app/lib/runtime-api.ts`
  - `fetchTelemetryDashboard()` pulls `/api/role-model/telemetry/requests`
- `apps/runtime-host-bridge/src/index.ts`
  - `listTelemetryRequestRecords()` defaults to the same `24h` / `50` query envelope

**Likely issue**

- The list is working as a literal "top 3 most recent records in the bounded telemetry ledger".
- Because it is not filtered by request origin, page, mode, or operator-vs-benchmark traffic, old benchmark requests can remain in slots 2-3 indefinitely until enough newer records displace them.
- This is likely not a rendering-order bug; it is a **query-scope / filtering** problem.

**Primary fault boundary**

- `/app` overview request list is using the canonical telemetry ledger directly, but without the narrower semantics the operator expects for a "latest live requests" widget.

### F3 — `/app` tokens card ignores estimated cost totals

**Observed**

- The overview `Tokens` card does not appear to include some provider costs, including DeepSeek costs.

**Current data source**

- `packages/sqlite-memory/src/index.ts`
  - `readRuntimeTelemetrySummary()` computes both:
    - `totalActualCostUsd`
    - `totalEstimatedCostUsd`
- `apps/runtime-ui/app/lib/view-models.ts`
  - `summarizeTelemetryStats()` renders the `Tokens` card detail as:
    - cached request count
    - `formatCurrency(summary.totalActualCostUsd, "actual")`

**Likely issue**

- The summary card ignores `summary.totalEstimatedCostUsd` entirely.
- Per-request and per-endpoint surfaces already fall back to estimated cost when actual cost is unavailable, but the overview summary does not.
- If DeepSeek requests are recorded with estimated-only costs, they will be absent from the overview card detail even though the underlying telemetry record contains cost data.

**Primary fault boundary**

- UI aggregation bug in `summarizeTelemetryStats()` rather than a guaranteed backend telemetry persistence bug.

### F4 — `/app/router` alias inventory uses config hints plus snapshot endpoints, not the backend’s resolved routable inventory

**Observed**

- The Router Overview `Alias inventory` component is not displaying all configured models under alias coverage and endpoint coverage.

**Current data source**

- `apps/runtime-ui/app/routes/router.tsx`
  - loads `fetchRuntimeSnapshot()`
  - loads `fetchRuntimeConfig()`
  - computes alias rows with:
    - `buildAliasReadinessRows(configRecord.config.modelAliases, snapshot.endpoints)`
- `apps/runtime-ui/app/lib/view-models.ts`
  - `buildAliasReadinessRows()`:
    - uses literal alias `modelIds`
    - matches endpoints by exact `endpoint.modelId`
    - derives readiness only from those exact matches

**Likely issue**

- The Router Overview does **not** consume the backend’s resolved routable inventory or alias-resolution fallback behavior.
- It therefore misses models/endpoints that are available through canonical inventory resolution when the alias hints are stale, broader, or resolved indirectly.
- This is materially different from the backend routing path, which can still resolve alias pools through `buildRoutableInventory()` and `resolveAliasAllowEndpoints()`.

**Primary fault boundary**

- Split-truth UI issue: Router Overview is driven by config hints plus runtime snapshot, not by the canonical alias-resolution result used by the backend/router.

### F5 — `/app/observe/activity` is not wired to current packaged-runtime telemetry

**Observed**

- The Observe → Activity page does not appear to show the latest telemetry data.

**Current data source**

- `apps/runtime-ui/app/routes/observe-activity.tsx`
  - loads `fetchActivityMetrics()`
- `apps/runtime-ui/app/lib/runtime-api.ts`
  - `fetchActivityMetrics()` calls `/api/metrics`
- `apps/runtime-host-bridge/src/cli.ts`
  - packaged CLI wiring currently sets:
    - `listActivityMetrics: async () => []`

**Likely issue**

- On the packaged/runtime CLI path, `/api/metrics` is stubbed to an empty list rather than being connected to the current telemetry/capture source.
- That means Observe → Activity is not actually reading the same persisted telemetry ledger or a live host-activity feed in packaged mode.
- This is a concrete packaged-runtime wiring gap, not just an expectation mismatch.

**Primary fault boundary**

- Packaged CLI/server wiring bug in `apps/runtime-host-bridge/src/cli.ts`.

### F6 — `/app/system/session-readiness` alias drift warning is backend truth sourced from stale alias config

**Observed**

- Session readiness still shows:
  - `mixed.local-remote • hint moonshot/kimi-k2.6`
  - `Alias mixed.local-remote references hint model id moonshot/kimi-k2.6 that is not in routable inventory.`

**Current data source**

- `apps/runtime-ui/app/routes/session-readiness.tsx`
  - `buildAliasDriftRows(summary)` is a direct pass-through of `summary.aliasDrift`
- `apps/runtime-host-bridge/src/index.ts`
  - `currentAliasDriftWarnings` is rebuilt from:
    - `currentUnifiedRuntimeConfig?.modelAliases ?? []`
    - `warnAliasModelIdDrift(alias, currentRoutableInventory)`
- `apps/runtime-host-bridge/src/routable-inventory.ts`
  - `warnAliasModelIdDrift()` emits a warning whenever an alias hint model id is absent from the current routable inventory model list

**Likely issue**

- This surface is probably not rendering stale UI-local cache; it is displaying backend-computed truth derived from the current unified runtime config and current routable inventory.
- If the operator believes `moonshot/kimi-k2.6` is no longer part of the intended alias configuration, the likely fault is one of:
  - the unified runtime config still contains the stale alias hint
  - the config update path did not rewrite/remove the alias hint
  - the runtime did not reload the updated config before summary generation

**Primary fault boundary**

- Backend/state drift issue around unified runtime alias configuration or config reload, not a presentation-only session-readiness bug.

## Follow-Up Targets

| Finding | Likely owner surface | Primary files |
| --- | --- | --- |
| F1 | Overview semantics and dashboard data contract | `apps/runtime-ui/app/routes/dashboard.tsx`, `apps/runtime-ui/app/lib/view-models.ts`, `apps/runtime-host-bridge/src/index.ts`, `packages/sqlite-memory/src/index.ts` |
| F2 | Overview latest-requests filtering/query scope | `apps/runtime-ui/app/routes/dashboard.tsx`, `apps/runtime-ui/app/lib/view-models.ts`, `apps/runtime-host-bridge/src/index.ts` |
| F3 | Telemetry summary cost-card fallback | `apps/runtime-ui/app/lib/view-models.ts` |
| F4 | Router alias inventory canonical-source migration | `apps/runtime-ui/app/routes/router.tsx`, `apps/runtime-ui/app/lib/view-models.ts`, backend inventory/alias-resolution contract |
| F5 | Packaged host-activity wiring | `apps/runtime-host-bridge/src/cli.ts`, `/api/metrics` backing implementation |
| F6 | Unified runtime alias config drift / reload path | `apps/runtime-host-bridge/src/index.ts`, config update/reload surfaces, unified runtime config state |

## Requirement Completion Status (addendum reconciliation)

| ID | Locked Phase 5 | Addendum disposition | Notes |
| --- | --- | --- | --- |
| R4 | verified | unchanged | Run-47 readiness consumers verified; Router Overview alias inventory issue is adjacent follow-up, not a direct contradiction of the locked scoped scenarios |
| R8 | verified | unchanged | Session-readiness lifecycle authority remains verified; alias-drift warning now has follow-up backend/config analysis |
| R10 | verified | unchanged | Packaged-runtime proof remains valid for run-47 scoped scenarios; Observe → Activity packaged gap is additional adjacent defect |
| R15 | verified | unchanged | Canonical lifecycle surfaces remain verified; overview/router dashboards still show split-truth behavior outside the strict run-47 lifecycle contract |
| R17 | verified | unchanged | Summary/health alignment remains verified; dashboard/request widgets still use telemetry-window semantics rather than "current state" semantics |

## Traceability

- F1 → `/app` overview telemetry source mismatch
- F2 → `/app` latest-requests bounded ledger behavior
- F3 → `/app` tokens card cost aggregation
- F4 → `/app/router` alias inventory split truth
- F5 → `/app/observe/activity` packaged metrics stub
- F6 → `/app/system/session-readiness` alias-drift backend/config drift

## Coverage Gate

- [x] Operator findings captured explicitly
- [x] Each finding traced to its present UI fetch path
- [x] Each finding traced to a likely backend/state fault boundary where possible
- [x] Locked Phase 5 reconciliation recorded without editing the base artifact

Coverage: PASS

## Approval Gate

- [x] Addendum records actionable follow-up analysis rather than symptom-only prose
- [x] No locked artifact was modified
- [x] Findings are ready to drive a follow-up plan or run

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: operator requested documentation/analysis addendum; tracing performed directly against current worktree code and locked run artifacts
- Delegation Override Reason: none

Audit: PASS
