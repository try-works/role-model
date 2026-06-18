Run: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
Phase: `01 AS-IS Analysis`
Status: `LOCKED`
LockedAt: `2026-06-17T08:32:22Z`
LockHash: `dfe0fe9d96441f0ca1817b329699d27a5f1bf0dbf0969a417679ccd5d3eb0182`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/TEMP-FAS-7-telemetry-analytics-plan.md`
- `/TEMP-FAS-7-route-chart-spec.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/package.json`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
Outputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/01-as-is.md`
Scope note: Captures the current telemetry persistence, backend query/API, route registry, and Apple-theme design-system state before planning the run-49 analytics foundation and chart rollout.

## TODO

- [x] Re-read run 49 requirements, worktree baseline, and prior run contracts
- [x] Inventory current telemetry persistence fields and runtime-host read surfaces
- [x] Inventory current runtime-ui design-system, route registry, and chart capability state
- [x] Record requirement-by-requirement AS-IS dispositions and blocking gaps
- [x] Record baseline verification facts that later phases must preserve or intentionally change
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: R1-R10, with backend-owned analytics, SQLite persistence, Apple-theme-first frontend sequencing, strict TDD, and rebuilt-runtime chart verification
- `00-worktree.md`: isolated worktree on `recursive/49-runtime-telemetry-analytics-charts`, baseline commit `a9162d5907019f9270510bdbcd947b0bd283bbfe`, green focused runtime-ui tests, mixed host-bridge baseline, and absent router policy/discovery files
- Prior run context:
  - run `16` established the canonical structured telemetry summary, request ledger, request-detail reads, and SSE freshness surface
  - run `45` established Observe ownership: structured telemetry is canonical, while Activity and Logs are preserved raw-host adjacency
  - run `48` established the approved Apple-theme authority, light/dark contract, and explicit removal target for Swiss-era runtime-ui rules
- Support-plan context:
  - `TEMP-FAS-7-telemetry-analytics-plan.md` expects SQLite-backed immutable request facts plus one generic analytics query surface
  - `TEMP-FAS-7-route-chart-spec.md` expects `/app` plus `/app/observe/*` chart ownership, with routing analytics moved under Observe rather than Router

## AS-IS Summary

The repository already has a usable telemetry baseline, but it is still a dashboard-and-ledger system rather than a historical analytics system:

1. **Telemetry persistence exists, but only as a flattened request ledger.**
   - `runtime_telemetry_records` stores request ids, endpoint id, tokens, latency, cache flags/tokens, tool counts, and actual/estimated cost.
   - It does **not** persist the request-time routing and operator dimensions required by run `49`, such as requested role, selected strategy, difficulty bucket, provider account, endpoint health/lifecycle at request time, or cost-savings baselines.
2. **Historical reads are partly reconstructed from live state.**
   - the host bridge enriches telemetry rows from `currentRegistry`, `runtimeEndpoints`, and `currentAccounts`
   - `sourceType` is currently written as `null` in the main observation-to-telemetry path and later filled from live endpoint metadata
   - role ids, provider id, endpoint kind, serving source, health, and lifecycle are therefore not historically frozen request-time facts today
3. **Backend telemetry APIs are summary/list endpoints, not a generic analytics query surface.**
   - the bridge exposes `GET /api/role-model/telemetry/summary`, `/rows`, `/requests`, and `/stream`
   - query semantics are limited to `windowMs`, `limit`, and `endAtMs`
   - there is no bucketed time-series query, no breakdown contract, no filters beyond the current list window, and no `POST /api/role-model/telemetry/query`
4. **Current frontend telemetry surfaces are fact-card ledgers, not charted analytics routes.**
   - `/app` shows fact cards, endpoint inventory, and latest requests
   - `/app/observe/requests` shows fact cards and the canonical request ledger
   - `/app/observe/activity` and `/app/observe/logs` already behave as evidence-oriented raw-host adjacency routes
   - there is no `/app/observe/routing` route at all
5. **The runtime UI design system is still materially Swiss-era in the checked-in files.**
   - `DESIGN_SYSTEM.md` still declares Swiss design authority, rectilinear surfaces, IBM Plex Sans, and zero-radius rules
   - `app.css` still boots IBM Plex Sans and zero-radius shell tokens
   - no chart token family, chart primitives, or chart dependency exists in `runtime-ui`

## Source Requirement Inventory

| R# | Disposition | AS-IS summary |
| --- | --- | --- |
| R1 | gap | SQLite telemetry storage exists, but request-time dimensions are too narrow and do not freeze the historical routing/provider/operator facts required for analytics. |
| R2 | gap | The backend exposes summary/list reads only; there is no generic `POST /api/role-model/telemetry/query` with granularity, metric, breakdown, and filter semantics. |
| R3 | gap | Live-state enrichment is still used for historical telemetry rows, so backend and frontend are not aligned on immutable request-time truth. |
| R4 | gap | The shared runtime UI design system still encodes Swiss-era authority and has no chart foundation, chart tokens, or analytics-control contract. |
| R5 | gap | No shared Apple-theme chart palette or deterministic chart primitive exists in the current runtime-ui package. |
| R6 | gap | `/app` is still KPI-card-led and has none of the required chart bands, controls, or no-data/loading contracts. |
| R7 | gap | `/app/observe/requests` is still a thin fact-card + ledger surface with no chart analytics band, filters, or ranking/comparison controls. |
| R8 | partial | `/app/observe/activity`, `/app/observe/logs`, and request detail are already evidence-oriented, but there is no `/app/observe/routing` analytics route and no contextual mini-chart contract yet. |
| R9 | gap | Focused UI tests exist, but no run-49 failing-test slices or backend analytics persistence/query tests exist yet. |
| R10 | gap | Phase-0 baseline recorded a green runtime-ui floor, but there is no rebuilt-runtime chart verification flow and the current host-bridge validator floor is mixed/inherited. |

- R1 | Disposition: in-scope | Source Quote: ### `R1` Persist historical telemetry as immutable request-time facts in the existing SQLite runtime store | Summary: SQLite telemetry storage exists, but request-time dimensions are too narrow and do not freeze the historical routing/provider/operator facts required for analytics.
- R2 | Disposition: in-scope | Source Quote: ### `R2` Make historical analytics depend on request-time truth rather than current registry or endpoint state | Summary: Live-state enrichment is still used for historical telemetry rows, so backend and frontend are not aligned on immutable request-time truth.
- R3 | Disposition: in-scope | Source Quote: ### `R3` Add one generic backend-owned telemetry analytics query API | Summary: The backend exposes summary/list reads only; there is no generic `POST /api/role-model/telemetry/query` with granularity, metric, breakdown, and filter semantics.
- R4 | Disposition: in-scope | Source Quote: ### `R4` Preserve runtime boundary discipline while expanding telemetry analytics | Summary: The current backend/UI split still needs explicit reconciliation so analytics can expand without reviving frontend inference or boundary drift.
- R5 | Disposition: in-scope | Source Quote: ### `R5` Extend the runtime UI design system with a shared chart foundation and chart-token contract | Summary: The shared runtime UI design system still encodes Swiss-era authority and has no chart foundation, chart tokens, or analytics-control contract.
- R6 | Disposition: in-scope | Source Quote: ### `R6` Make `/app` a chart-led runtime overview | Summary: `/app` is still KPI-card-led and has none of the required chart bands, controls, or no-data/loading contracts.
- R7 | Disposition: in-scope | Source Quote: ### `R7` Make `/app/observe/requests` the primary structured telemetry analytics route | Summary: `/app/observe/requests` is still a thin fact-card + ledger surface with no chart analytics band, filters, or ranking/comparison controls.
- R8 | Disposition: in-scope | Source Quote: ### `R8` Keep the other Observe routes evidence-oriented, with only light contextual charting where it adds operator value | Summary: `/app/observe/activity`, `/app/observe/logs`, and request detail are already evidence-oriented, but there is no `/app/observe/routing` route and no contextual mini-chart contract yet.
- R9 | Disposition: in-scope | Source Quote: ### `R9` Require strict TDD for all production changes in this run | Summary: Focused UI tests exist, but no run-49 failing-test slices or backend analytics persistence/query tests exist yet.
- R10 | Disposition: in-scope | Source Quote: ### `R10` Verify the rebuilt runtime through focused automated validation and browser QA | Summary: Phase-0 baseline recorded a green runtime-ui floor, but there is no rebuilt-runtime chart verification flow and the current host-bridge validator floor is mixed/inherited.

## Current Behavior by Requirement

### `R1` Persist request-time historical telemetry dimensions in SQLite

- `role-model-router/packages/sqlite-memory/src/index.ts` defines `runtime_telemetry_records` with:
  - request identity
  - `request_class`
  - `source_type`
  - `model_id`
  - `provider_kind`
  - `provider_family`
  - token, latency, cache, stream, tooling, and cost fields
- `toRuntimeTelemetryRecord()` currently writes:
  - `sourceType: null`
  - no provider id
  - no provider account id
  - no endpoint kind or serving source
  - no region
  - no lifecycle/health-at-request snapshot
  - no role ids
  - no requested model id
  - no selected strategy, routing mode, or difficulty bucket
  - no request operation or status family
  - no cost-savings or counterfactual-baseline fields
- `persistRuntimeTelemetryFailure()` writes even less context for pre-execution failures and stores no authoritative cost value beyond `unavailable`
- **Gap:** the current table is sufficient for a recent ledger, but not for chart-ready historical routing/cost analytics

### `R2` Provide one generic backend analytics query contract

- current bridge telemetry API surface:
  - `GET /api/role-model/telemetry/summary`
  - `GET /api/role-model/telemetry/rows`
  - `GET /api/role-model/telemetry/requests`
  - `GET /api/role-model/telemetry/stream`
- `readTelemetryQuery()` only accepts:
  - `windowMs`
  - `limit`
  - `endAtMs`
- `readRuntimeTelemetrySummary()` computes totals in memory from the selected record set
- `listRuntimeTelemetryComparisonRows()` only groups by endpoint/model/provider-kind combinations; it does not bucket by time or expose chart-ready breakdowns/filters
- **Gap:** the runtime owns a telemetry read layer, but not the generic historical analytics API required by run `49`

### `R3` Keep backend and frontend aligned on historical truth

- `listTelemetryRequestRecords()` in `runtime-host-bridge` enriches rows with live metadata from:
  - `currentRegistry`
  - `runtimeEndpoints`
  - `currentAccounts`
- `getTelemetryEndpointMeta()` derives:
  - `sourceType`
  - `providerId`
  - `endpointKind`
  - `servingSource`
  - `healthStatus`
  - `status`
  - `roleIds`
- request rows are therefore historically dependent on current runtime state rather than only what was true when the request executed
- **Gap:** this violates run `49`'s historical-truth rule for charts and legends

### `R4` Update the shared Apple-theme design system first

- `DESIGN_SYSTEM.md` still begins with Swiss-design authority, one accent color, no rounded structural elements, IBM Plex Sans, and Swiss red
- `app.css` still sets:
  - Swiss/stone-style light and dark surfaces
  - zero radii for shell/panel/field tokens
  - `IBM Plex Sans` as the default body/display font
- current runtime-ui package has no `recharts` dependency and no chart component directory or chart config helper
- **Gap:** the checked-in design system is not yet the Apple-theme contract approved in run `48`, and it has no chart-system extension at all

### `R5` Provide a shared chart palette and primitive layer

- `package.json` has no chart dependency
- `runtime-ui/app/components/` has no chart primitives
- `runtime-ui/app/lib/` has no chart config or analytics query helper layer
- current CSS token set contains no chart-specific palette or deterministic series assignment contract
- **Gap:** there is no reusable chart layer to consume on Overview or Observe routes

### `R6` Make `/app` a chart-led runtime overview

- `dashboard.tsx` currently:
  - fetches `fetchRuntimeSummary()`, `fetchRuntimeSnapshot()`, and `fetchTelemetryDashboard()`
  - renders `summarizeTelemetryStats()` into four `FactCard`s
  - renders endpoint inventory and latest requests below that
- there is no time-range selector
- there are no charts, chart containers, loading skeletons, no-data chart states, or chart-specific responsive rules
- **Gap:** `/app` owns posture today, but only in KPI-card form

### `R7` Make `/app/observe/requests` the primary structured analytics route

- `requests.tsx` currently:
  - fetches `fetchTelemetryDashboard()`
  - renders `summarizeTelemetryStats()` into four `FactCard`s
  - renders adjacent raw-host links
  - renders the recent telemetry request ledger
- there are no:
  - analytics controls
  - time-range presets
  - chart band
  - ranking/comparison chart
  - shared chart/ledger filter alignment
- **Gap:** the route is canonical telemetry, but it is still a ledger page rather than an analytics workbench

### `R8` Keep other Observe routes evidence-oriented while adding only bounded analytics

- current evidence-oriented surfaces already exist:
  - `/app/observe/activity`
  - `/app/observe/logs`
  - `/app/observe/requests/:requestId`
- `observe-activity.tsx` is raw `/api/metrics` + capture inspection
- `observe-logs.tsx` is `/logs` + parsed rows + raw-line views
- `request-detail.tsx` is telemetry-first and reads persisted request facts plus endpoint profile
- there is **no** `/app/observe/routing` route in:
  - `routes.ts`
  - `design-system.ts`
  - navigation tests
- request detail currently shows `actualCostUsd ?? estimatedCostUsd`, but does not expose:
  - authoritative effective cost as its own field
  - calculation basis/version
  - routing-savings context
- **Gap:** evidence-oriented routes already exist, but the required Observe routing analytics surface is missing and request-detail cost audit metadata is incomplete

### `R9` Strict TDD requirement for all production slices

- Phase-0 baseline:
  - `corepack pnpm --filter @role-model-router/runtime-ui test` -> green, `126` tests
- current test inventory covers:
  - runtime API helpers
  - view-model transforms
  - route metadata
  - benchmark and provider-account UI behavior
- no current tests cover:
  - analytics query contract
  - time-bucketed telemetry aggregation
  - persisted cost-savings fields
  - Observe routing analytics route
  - Apple-theme chart tokens
- **Gap:** the repo has a focused UI floor, but nothing yet aligned to run `49`'s failing-test-first implementation slices

### `R10` Rebuilt-runtime verification with populated charts

- Phase-0 baseline recorded:
  - `runtime-ui` tests green
  - `runtime-host-bridge` suite mixed/inherited failures
  - `runtime:validate-ui` timeout
- there is no existing chart verification flow because charts do not exist yet
- current telemetry validation is request-summary oriented, not chart-population oriented
- **Gap:** the repo does not yet have a practical rebuilt-runtime verification path for historical analytics charts, narrow-width chart layout, or light/dark chart parity

## Current Route and Design-System Inventory

### Route registry state

- `routes.ts` registers:
  - `/app`
  - `/app/observe/activity`
  - `/app/observe/requests`
  - `/app/observe/requests/:requestId`
  - `/app/observe/logs`
- there is no `/app/observe/routing`
- `/app/observe` still resolves through the legacy redirect route rather than a dedicated analytics landing implementation

### Design-system metadata state

- `design-system.ts` already treats:
  - `Observe -> Requests` as canonical telemetry
  - `Observe -> Activity` and `Observe -> Logs` as preserved raw-host adjacency
- navigation tests in `design-system.test.ts` still assert the Observe section contains only:
  - `/app/observe/activity`
  - `/app/observe/requests`
  - `/app/observe/logs`
- **Implication:** adding routing analytics under Observe requires both route registration and design-system metadata/test expansion

## Relevant Code Pointers

| Area | Path | Notes |
| --- | --- | --- |
| Telemetry schema + persistence | `role-model-router/packages/sqlite-memory/src/index.ts` | current immutable fact table exists but is too narrow for routing/cost analytics |
| Telemetry API routing | `role-model-router/apps/runtime-host-bridge/src/index.ts` | summary/rows/requests/SSE endpoints exist; no generic query endpoint |
| Historical enrichment | `role-model-router/apps/runtime-host-bridge/src/index.ts` | live registry/account/runtime state still backfills historical row metadata |
| Runtime UI dependency floor | `role-model-router/apps/runtime-ui/package.json` | no chart dependency today |
| Design-system authority | `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | still Swiss-era, not Apple-theme |
| Theme token implementation | `role-model-router/apps/runtime-ui/app/app.css` | still IBM Plex + zero-radius + stone/Swiss token set |
| Route metadata | `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | Observe routing page absent; Requests/Activity/Logs metadata already exists |
| Telemetry typed helpers | `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | fetches dashboard summary/list reads only; no analytics query helper |
| View-model transforms | `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | fact-card and ledger transforms only |
| Overview route | `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx` | posture page is KPI-card-led |
| Requests route | `role-model-router/apps/runtime-ui/app/routes/requests.tsx` | ledger-first canonical telemetry page with no charts |
| Activity route | `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx` | already raw-host/evidence-oriented |
| Logs route | `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx` | already log-first/evidence-oriented |
| Request detail route | `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | telemetry-first inspector, but no authoritative effective-cost audit metadata |

## Evidence

- Locked Phase 0 baseline in `/.recursive/run/49-runtime-telemetry-analytics-charts/00-worktree.md`
- Direct code readback from:
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-ui/package.json`
  - `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `role-model-router/apps/runtime-ui/app/app.css`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - `role-model-router/apps/runtime-ui/app/routes.ts`
  - `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
- Phase-0 verification receipts:
  - `corepack pnpm install --frozen-lockfile` passed
  - `corepack pnpm --filter @role-model-router/runtime-ui test` passed with `126` tests
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test` failed with inherited baseline issues
  - `corepack pnpm run runtime:validate-ui` timed out in baseline

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\.worktrees\49-runtime-telemetry-analytics-charts`
2. Re-read:
   - `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
   - `/.recursive/run/49-runtime-telemetry-analytics-charts/00-worktree.md`
3. Open `role-model-router/packages/sqlite-memory/src/index.ts` and confirm `runtime_telemetry_records` is a request-ledger schema without the full request-time routing/provider/cost-savings dimensions required by run 49.
4. Open `role-model-router/apps/runtime-host-bridge/src/index.ts` and confirm:
   - `toRuntimeTelemetryRecord()` writes `sourceType: null`
   - telemetry API reads stop at summary/list/SSE surfaces
   - historical telemetry rows are enriched from live registry/account/runtime state
5. Open the runtime UI telemetry routes and helpers:
   - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
   - `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
   - `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
   - `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
   - `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
   - `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
   - `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
6. Open `role-model-router/apps/runtime-ui/app/routes.ts`, `app/lib/design-system.ts`, and `app/lib/design-system.test.ts` and confirm there is no `/app/observe/routing` route or Observe nav/test coverage for routing analytics.
7. Open `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`, `role-model-router/apps/runtime-ui/app/app.css`, and `role-model-router/apps/runtime-ui/package.json` and confirm Swiss-era authority remains, Apple-theme chart tokens are absent, and no chart dependency is present.

## Baseline Verification Facts

- `corepack pnpm install --frozen-lockfile` passed in the worktree
- `corepack pnpm --filter @role-model-router/runtime-ui test` passed with `126` tests
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test` failed in the baseline with:
  - one Windows OAuth temp-file `EPERM`
  - one restart-rehydration timeout
  - one vendor-validation timeout
  - one executable-build failure from missing package `dist/index.js` runtime exports
- `corepack pnpm run runtime:validate-ui` timed out after `244040ms`
- **Planning implication:** later run-49 verification must distinguish intentional analytics regressions from these inherited baseline issues

## Known Unknowns

- Whether the current bridge-side routing diagnostics bundle already contains enough request-time data to populate all new historical columns, or whether selected fields must be derived earlier in the request pipeline before persistence
- Whether cost-savings baselines should be persisted entirely on the telemetry row or partially normalized into a companion JSON field while the schema remains evolution-friendly
- Whether `runtime:validate-ui` is inherently too broad/slow for phase-local analytics verification or simply reflects current host-bridge baseline drift

## Prior Recursive Evidence Reviewed

- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/TEMP-FAS-7-telemetry-analytics-plan.md`
- `/TEMP-FAS-7-route-chart-spec.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`

## Audit Context

- Phase: `01 AS-IS Analysis`
- Auditor: self (main agent)
- Audit Inputs Provided:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/00-worktree.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - prior run requirements and approved planning/reference docs listed in `## Prior Recursive Evidence Reviewed`
  - telemetry schema/API files plus runtime-ui design-system/API/route files listed in `## Evidence`
- Diff Basis: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Worktree: `D:\DEV\role-model\.worktrees\49-runtime-telemetry-analytics-charts`
- Subagent Availability: unavailable
- Subagent Capability Probe: `tool_search` exposed `multi_agent_v1`, but active policy only permits spawning subagents when the user explicitly requests delegation or parallel agent work.
- Delegation Decision Basis: self-audit; this phase required controller-owned synthesis across the telemetry backend, runtime-ui design system, prior approved chart plan, and locked requirements before Phase 2 planning.
- Audit Execution Mode: self-audit

## Earlier Phase Reconciliation

- `00-worktree.md` remains the source of truth for:
  - isolated worktree path `D:\DEV\role-model\.worktrees\49-runtime-telemetry-analytics-charts`
  - branch `recursive/49-runtime-telemetry-analytics-charts`
  - baseline commit `a9162d5907019f9270510bdbcd947b0bd283bbfe`
  - acknowledged baseline test floor and inherited failures/timeouts
- `00-requirements.md` remains the source of truth for `R1`-`R10`, including:
  - backend-owned analytics contract
  - Apple-theme-first design-system sequencing
  - strict TDD
  - rebuilt-runtime Phase 5 chart verification with generated request data
- No conflicts were found between the approved run-49 requirements and the observed baseline code; the only defects repaired in this artifact were recursive-lock formatting omissions.

## Traceability

| R# | AS-IS gap recorded | Primary evidence |
| --- | --- | --- |
| R1 | telemetry fact table too narrow for historical analytics | `sqlite-memory/src/index.ts` schema + `toRuntimeTelemetryRecord()` |
| R2 | no generic analytics query API | `runtime-host-bridge/src/index.ts` telemetry endpoints + `readTelemetryQuery()` |
| R3 | live-state enrichment still shapes historical rows | `listTelemetryRequestRecords()` + `getTelemetryEndpointMeta()` |
| R4 | design-system authority and tokens still Swiss-era | `DESIGN_SYSTEM.md`, `app.css` |
| R5 | no chart dependency, tokens, or primitives | `runtime-ui/package.json`, component/lib inventory |
| R6 | `/app` is KPI cards, not charts | `dashboard.tsx` |
| R7 | `/app/observe/requests` is ledger-first without analytics controls | `requests.tsx`, `runtime-api.ts`, `view-models.ts` |
| R8 | evidence routes exist, but Observe routing analytics route is missing | `routes.ts`, `design-system.ts`, `request-detail.tsx` |
| R9 | no run-49 TDD slices yet | Phase-0 baseline + current test inventory |
| R10 | no rebuilt-runtime chart QA path yet | Phase-0 baseline + current route inventory |

## Gaps Found

- None beyond the intentional repository gaps already captured in `## Current Behavior by Requirement`, `## Known Unknowns`, and `## Requirement Completion Status`; the lock-script failures were artifact-shape defects rather than missing AS-IS analysis.

## Repair Work Performed

- Added the canonical audited section headings required by the recursive lock validator:
  - `## Evidence`
  - `## Reproduction Steps (Novice-Runnable)`
  - `## Prior Recursive Evidence Reviewed`
  - `## Audit Context`
  - `## Earlier Phase Reconciliation`
  - `## Gaps Found`
  - `## Repair Work Performed`
  - `## Worktree Diff Audit`
- Added parser-friendly `R# | Disposition:` entries under `## Source Requirement Inventory`.
- Replaced the table-only completion summary with parser-friendly `R# | Status:` lines while preserving the detailed evidence.
- Reconciled the worktree diff basis to the exact Phase-0 baseline fields, including normalized baseline/comparison values.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Comparison reference: `working-tree`
- Normalized baseline: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Result: artifact/support-document additions only; no product-code ownership claimed in Phase 1.

## Requirement Completion Status

- R1 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the missing request-time telemetry dimensions only.
- R2 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the current live-state historical-truth gap only.
- R3 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the absence of the generic analytics query API only.
- R4 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the current boundary and reconciliation gaps only.
- R5 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the missing Apple-theme chart foundation only.
- R6 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the current non-chart Overview surface only.
- R7 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the current ledger-first Observe Requests surface only.
- R8 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the missing Observe routing route and bounded-context chart gaps only.
- R9 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the missing analytics-specific failing-test slices only.
- R10 | Status: out-of-scope | Rationale: planning-only Phase 1; implementation and verification land later in this run. | Scope Decision: `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md` | Audit Note: Phase 1 documented the absent rebuilt-runtime chart QA flow and inherited baseline drift only.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct code and artifact readback only
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every in-scope requirement has an AS-IS disposition
- [x] Backend persistence, query/API, and historical-truth gaps are recorded
- [x] Frontend design-system, route-registry, and chart-foundation gaps are recorded
- [x] Baseline verification facts that constrain later phases are recorded

Coverage: PASS

## Approval Gate

- [x] The AS-IS artifact is specific enough to drive Phase 2 planning
- [x] No blocking unknown prevents bounded planning for backend, design-system, and route work

Approval: PASS
