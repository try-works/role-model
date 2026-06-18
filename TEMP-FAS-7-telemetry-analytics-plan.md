# FAS-7 Telemetry Analytics Plan

## Goal

Implement a future-proof telemetry analytics foundation for runtime UI charts, with backend-owned aggregation and a repo-owned chart design system.

## Persistence Strategy

Historical telemetry should be persisted in the existing SQLite memory store, not in a separate chart-specific database.

Canonical storage location:

- `<runtimeStateRoot>/<scopeId>/memory/memory.sqlite`

Resolved today by:

- `role-model-router/packages/sqlite-memory/src/index.ts`
- `resolveSqliteMemoryLocation()`

## Storage Model

### 1. Raw immutable request facts

Use `runtime_telemetry_records` as the canonical telemetry fact table.

Keep existing fields and extend the table so request-time dimensions are persisted historically instead of being reconstructed later from current runtime state.

Persisted request-time dimensions should include:

- `provider_id`
- `provider_account_id`
- `source_type`
- `endpoint_kind`
- `serving_source`
- `region`
- `lifecycle_state_at_request`
- `health_status_at_request`
- `role_ids_json`
- `requested_model_id`
- `routing_mode`
- `request_operation`
- `status_family`
- `tooling_used`
- `cache_state`
- `dimensions_json`

Design rule:

- frequently filtered or grouped dimensions get promoted indexed columns
- less common future dimensions go into `dimensions_json`

### 2. Existing profile/sample tables

Retain and continue using:

- `observed_performance_samples`
- `observed_profile_snapshots`
- `observed_performance_samples_by_difficulty`
- `observed_profile_snapshots_by_difficulty`

These remain useful for endpoint profiling and future advanced analytics.

### 3. Rollups later, not first

Do not start with materialized aggregate tables.

Phase 1 should aggregate from the raw fact table through a generic analytics API.

If data volume later requires optimization, add hourly and daily rollup tables in the same SQLite database behind the same API contract.

Possible future tables:

- `runtime_telemetry_rollups_hourly`
- `runtime_telemetry_rollups_daily`

## Backend Contract

Do not add chart-specific endpoints.

Add one generic analytics endpoint:

- `POST /api/role-model/telemetry/query`

This endpoint should support:

- time range presets: `day`, `week`, `month`, `90d`
- custom `startAtMs` / `endAtMs`
- granularity: `hour`, `day`, `week`
- metrics:
  - `requestCount`
  - `successCount`
  - `failureCount`
  - `successRate`
  - `inputTokens`
  - `outputTokens`
  - `totalTokens`
  - `cachedRequestCount`
  - `cacheReadTokens`
  - `cacheWriteTokens`
  - `actualCostUsd`
  - `estimatedCostUsd`
  - `effectiveCostUsd`
  - `averageLatencyMs`
  - `p95LatencyMs`
  - `toolCallCount`
  - `toolExecutionCount`
- breakdowns:
  - `sourceType`
  - `endpointId`
  - `modelId`
  - `providerId`
  - `requestOperation`
  - `statusFamily`
  - `roleId`
- filters:
  - `requestClass`
  - `sourceType`
  - `endpointIds`
  - `modelIds`
  - `providerIds`
  - `roleIds`
  - `requestOperations`
  - `statusFamilies`

## Historical Truth Requirement

Current telemetry read paths in the runtime host bridge still enrich some records from live endpoint and registry state.

That is acceptable for current operator lists but not for historical analytics.

For charts, the historical source of truth must be:

- request-time dimension snapshots persisted when the request record is written

Do not rely on:

- current endpoint health
- current role bindings
- current provider ownership
- current registry source classification

for historical analytics queries.

## Frontend Contract

### Chart foundation

Add a repo-owned chart primitive built on Recharts and modeled after shadcn chart composition.

Required frontend additions:

- `recharts` dependency
- chart primitive component
- runtime chart tokens in light and dark mode
- shared telemetry chart composition helpers

### Chart token families

Recommended semantic tokens:

- `--rm-chart-local`
- `--rm-chart-remote`
- `--rm-chart-tokens`
- `--rm-chart-latency`
- `--rm-chart-cost`
- `--rm-chart-failure`
- `--rm-chart-success`
- `--rm-chart-neutral-1`
- `--rm-chart-neutral-2`

## Route Strategy

### Overview `/app`

Replace the current KPI-first telemetry strip with chart-led summary.

Recommended:

- time-range selector
- primary token-usage chart
- secondary latency chart
- secondary effective-cost chart
- success/failure chart

Keep endpoint inventory and latest requests below the charts.

### Observe `/app/observe/requests`

Make this the primary structured telemetry analytics route.

Recommended:

- time-range selector
- filter bar
- request volume chart
- token usage chart
- effective cost chart
- latency chart
- failures chart
- comparison breakdown charts by endpoint/model/source
- canonical request ledger below the charts

### Observe raw adjacencies

Keep these routes as raw-host support surfaces:

- `/app/observe/activity`
- `/app/observe/logs`

They should remain focused on:

- captures
- raw metrics
- raw logs
- host-level debugging

not the primary chart-based telemetry experience.

## Implementation Order

1. Extend telemetry persistence schema and write path
2. Add generic telemetry analytics API and tests
3. Add chart foundation and chart tokens
4. Roll out Overview charts
5. Re-architect Observe around structured analytics charts

## Files Expected To Change

Backend:

- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Frontend:

- `role-model-router/apps/runtime-ui/package.json`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/components/ui/chart.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- optionally `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`

## Why This Is Future-Proof

This design gives the product:

- one canonical historical telemetry fact store
- persisted request-time dimensions
- a reusable analytics query API
- route-agnostic chart primitives

That supports future charts without adding a new endpoint per chart.
