# Runtime UI Telemetry Graph Matrix

Status: current architecture
Last updated: 2026-06-21
Scope: `role-model-router/apps/runtime-ui` telemetry graphs rendered through `TelemetryAnalyticsChartCard`.

This document is the canonical matrix for runtime UI telemetry graphs. It records which graphs exist, how each graph asks for data, where that data is stored, how the telemetry is collected, and whether the current graph contract appears to display meaningful telemetry.

## Scope Notes

Included:

- Runtime overview graphs on `DashboardRoute` (`/app/dashboard`).
- Request analytics graphs on `RequestsRoute` (`/app/observe/requests`).
- Routing analytics graphs on `ObserveRoutingRoute` (`/app/observe/routing`).
- Shared chart renderer and view models in `app/components/telemetry-charts.tsx`, `app/lib/telemetry-route-models.ts`, and `app/lib/telemetry-analytics.ts`.

Excluded:

- Generated build artifacts under `role-model-router/apps/runtime-ui/build`.
- Docs-site SVG diagrams.
- Vendored llama-swap UI graphs under `role-model-router/vendor`.

## End-to-End Data Flow

1. Frontend routes build chart definitions in `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`.
2. The frontend sends each definition's `RuntimeTelemetryAnalyticsQuery` to `POST /api/role-model/telemetry/query` through `fetchTelemetryAnalytics` in `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`.
3. The host bridge handles the endpoint in `role-model-router/apps/runtime-host-bridge/src/index.ts`.
4. Runtime requests create observation bundles through `createRuntimeObservationBundle` in `role-model-router/packages/runtime-observability/src/index.ts`.
5. Observation bundles are persisted by `persistRuntimeObservationBundle` in `role-model-router/packages/sqlite-memory/src/index.ts`.
6. Structured graph facts are stored in the sqlite table `runtime_telemetry_records`; full observation JSON is stored in `runtime_observations`; observed profile samples are stored in `observed_performance_samples` and profile snapshot tables.
7. Analytics reads `runtime_telemetry_records`, computes bucket totals, optional breakdown series, and optional ranking rows, then returns `RuntimeTelemetryAnalyticsResponse`.
8. The response includes `appliedQuery`, `metadata`, `metricSupport`, and `dimensionSupport` so the UI does not infer support from zero, null, or missing series.
9. `TelemetryAnalyticsChartCard` converts the response into a semantic chart model and renders one of: area time series, line time series, bar time series, ranking bar chart, or an explicit semantic state message.

## Shared Rendering Semantics

All included graphs use `TelemetryAnalyticsChartCard`.

- Time-series charts consume backend-owned `metadata`, `metricSupport`, and `dimensionSupport` before deciding whether a bucketed response is populated.
- Ranking charts are empty when `response.ranking.rows.length === 0`.
- The shared design-system state vocabulary is `loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, and `populated`.
- `unsupported`, `partial`, and `truncated` states are driven by backend analytics metadata. Route code does not infer support by checking whether a value is `0`, `null`, or a series array is missing.
- If a single-metric chart requests a breakdown and matching rows have no populated values for that dimension, the chart renders an explicit sparse/unsupported state instead of an empty Recharts shell.

## Telemetry Storage and Collection Matrix

| Layer | File or table | Responsibility | Graph relevance |
| --- | --- | --- | --- |
| Frontend routes | `app/routes/dashboard.tsx`, `app/routes/requests.tsx`, `app/routes/observe-routing.tsx` | Own page filters, build chart definitions, call analytics endpoint, subscribe to telemetry stream | Determines chart set, time window, filters, ranking target, and breakdown dimension |
| Chart definitions | `app/lib/telemetry-route-models.ts` | Maps route state to metrics, breakdown, filters, ranking, and empty message | Canonical frontend graph inventory |
| Chart models | `app/lib/telemetry-analytics.ts` | Converts analytics response into Recharts series and rows | Determines whether breakdown data becomes visible series |
| Chart renderer | `app/components/telemetry-charts.tsx` | Renders Recharts area, line, bar, ranking, and explicit semantic chart states | Determines loading/empty/unsupported/rendered states |
| Frontend API client | `app/lib/runtime-api.ts` | Posts `RuntimeTelemetryAnalyticsQuery` to `/api/role-model/telemetry/query` | Runtime contract between UI and host |
| Host bridge API | `apps/runtime-host-bridge/src/index.ts` | Validates metrics/dimensions, filters records, computes bucket totals, breakdowns, rankings, and support metadata | Computes all graph values and chart-state support metadata |
| Observation creation | `packages/runtime-observability/src/index.ts` | Builds request observation bundles from routing, execution, usage, cache, tooling, and cost data | Source of request telemetry facts |
| Persistence | `packages/sqlite-memory/src/index.ts` | Writes `runtime_observations`, `observed_performance_samples`, `observed_profile_snapshots`, and `runtime_telemetry_records` | Durable graph backing store |
| Primary graph table | `runtime_telemetry_records` | Stores request id, endpoint/model/provider metadata, source, strategy, role, difficulty, tokens, latency, cache fields, cost fields, status, and tool counts | Direct source for analytics graphs |

## Frontend Graph Matrix

### Dashboard

Route: `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`  
Builder: `buildOverviewChartDefinitions`

| Graph | Chart type | Metrics | Default breakdown | Data source | Stored fields | Display audit |
| --- | --- | --- | --- | --- | --- | --- |
| Token Usage Over Time | Area | `inputTokens`, `outputTokens`, `totalTokens` | none | `/api/role-model/telemetry/query` | `input_tokens`, `output_tokens`, `total_tokens` | Displays meaningful data on live port 3462: 45,126 total tokens in the audited week. |
| Effective Cost Over Time | Line | `actualCostUsd`, `estimatedCostUsd`, `effectiveCostUsd` | none | `/api/role-model/telemetry/query` | `actual_cost_usd`, `estimated_cost_usd`, `effective_cost_usd` | Renders, but audited live totals are all `0`; not currently showing meaningful cost telemetry. |
| Cost Avoided Over Time | Area | `routingCostSavingsUsd`, `cacheCostSavingsUsd`, `totalAvoidedCostUsd` | none | `/api/role-model/telemetry/query` | `routing_cost_savings_usd`, `cache_cost_savings_usd`, `total_avoided_cost_usd` | Renders, but audited live totals are all `0`; not currently showing meaningful avoided-cost telemetry. |
| Latency Trend | Line | `averageLatencyMs`, `p95LatencyMs` | none | `/api/role-model/telemetry/query` | `latency_ms` | Displays meaningful data on live port 3462: average 3,459 ms and p95 13,577 ms. |
| Cache Efficiency Trend | Line | `cacheHitTokens`, `cacheHitTokenRate` | none | `/api/role-model/telemetry/query` | `cache_read_tokens`, `cache_read_tokens_supported`, `prompt_cache_used` | Renders, but audited live totals are `cacheHitTokens: 0` and `cacheHitTokenRate: null`; not currently showing meaningful cache telemetry. |
| Success vs Failure Volume | Bar | `successCount`, `failureCount` | none | `/api/role-model/telemetry/query` | `error_class`, `status_family`, `status_code` | Displays meaningful data on live port 3462: 24 successes and 26 failures in the audited week. |

### Request Analytics

Route: `role-model-router/apps/runtime-ui/app/routes/requests.tsx`  
Builder: `buildObserveRequestsChartDefinitions`

| Graph | Chart type | Metrics | Default breakdown/ranking | Data source | Stored fields | Display audit |
| --- | --- | --- | --- | --- | --- | --- |
| Request Volume Over Time | Bar | `requestCount` | none | `/api/role-model/telemetry/query` | row count in `runtime_telemetry_records` | Displays meaningful data on live port 3462: 50 requests aggregated by analytics in the audited week. |
| Token Usage Over Time | Area | `inputTokens`, `outputTokens`, `totalTokens` | none | `/api/role-model/telemetry/query` | `input_tokens`, `output_tokens`, `total_tokens` | Displays meaningful token totals. |
| Effective Cost Over Time | Line | `actualCostUsd`, `estimatedCostUsd`, `effectiveCostUsd` | none | `/api/role-model/telemetry/query` | cost columns | Renders, but live audited totals are all `0`; not meaningful as cost telemetry. |
| Latency Trend | Line | `averageLatencyMs`, `p95LatencyMs` | none | `/api/role-model/telemetry/query` | `latency_ms` | Displays meaningful latency totals. |
| Cache Efficiency Trend | Line | `cacheHitTokens`, `cacheHitTokenRate` | none | `/api/role-model/telemetry/query` | cache columns | Renders, but live audited cache totals are zero/null. |
| Failure Trend | Bar | `failureCount` | none | `/api/role-model/telemetry/query` | `error_class`, `status_family`, `status_code` | Displays meaningful failure count. |
| Ranked Comparison | Ranking bar | user-selected metric, default `averageLatencyMs` | default rank by `endpointId` | `/api/role-model/telemetry/query` | selected dimension and metric columns | Displays meaningful ranking rows on live port 3462 for endpoint latency. |

Note: the request ledger below the graphs uses `GET /api/role-model/telemetry/requests` with the same shared filter shape that analytics uses. The route still keeps client-side filtering as a defensive view-model guard, but server-side ledger filtering and analytics filtering now describe the same operator slice.

### Routing Analytics

Route: `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`  
Builder: `buildObserveRoutingChartDefinitions`

| Graph | Chart type | Metrics | Default breakdown/ranking | Data source | Stored fields | Display audit |
| --- | --- | --- | --- | --- | --- | --- |
| Cost Avoided By Routing | Area | `routingCostSavingsUsd`, `cacheCostSavingsUsd`, `totalAvoidedCostUsd` | `selectedStrategy` | `/api/role-model/telemetry/query` | avoided-cost columns plus `selected_strategy` | Does not show meaningful data in the audited live slice: totals are all `0`; no selected-strategy series appears in the default analytics response. |
| Routing Decision Volume | Bar | `requestCount` | `selectedStrategy` | `/api/role-model/telemetry/query` | row count plus `selected_strategy` | Suspect: analytics reports 50 requests, but default selected-strategy breakdown has no series, so the chart card can render without visible bars. |
| Difficulty Distribution | Ranking bar | `requestCount` | rank by `difficultyBucket` | `/api/role-model/telemetry/query` | `difficulty_bucket` | Empty in the audited default week: ranking rows are `[]`. |
| Strategy Selection Trend | Bar | `requestCount` | `selectedStrategy` | `/api/role-model/telemetry/query` | `selected_strategy` | Suspect for the same reason as Routing Decision Volume: request totals exist, but no breakdown series appears in the default response. |
| Role Demand | Ranking bar | `requestCount` | rank by `requestedRoleId` | `/api/role-model/telemetry/query` | `requested_role_id` | Empty in the audited default week: ranking rows are `[]`. |
| Model Selection | Ranking bar | `requestCount` | rank by `modelId` | `/api/role-model/telemetry/query` | `model_id` | Displays meaningful ranking rows on live port 3462. |

## Current Contract Findings

1. Analytics aggregation is no longer capped by the request-ledger default.

`queryTelemetryAnalyticsData` reads `runtime_telemetry_records` for the full requested slice without applying `DEFAULT_TELEMETRY_LIMIT`. Ledger reads keep explicit limit behavior. The analytics response exposes `metadata.scannedRowCount`, `metadata.matchedRowCount`, `metadata.aggregationRowCount`, `metadata.truncated`, and `metadata.truncationReason`.

2. Time-series chart states are metadata-driven.

The backend returns `metricSupport` for requested metrics. The frontend semantic view model uses that support metadata to distinguish populated values from `empty`, `unsupported`, `partial`, and `truncated` states.

3. Sparse breakdowns are explicit.

The backend returns `dimensionSupport` for breakdown, ranking, and filtered dimensions. If totals exist but the requested breakdown dimension has no populated values, the frontend renders an explicit unsupported/sparse state instead of an empty chart shell.

4. Cost telemetry is stored, but live data may still have zero cost.

The storage schema and observation flow support `actualCostUsd`, `estimatedCostUsd`, `effectiveCostUsd`, selected uncached cost, baseline eligible cost, and avoided-cost fields. The current live audited slice has token and latency data, but cost and avoided-cost totals are zero. This suggests either the active execution path is not supplying cost facts or the current benchmark/runtime rows are not cost-bearing.

5. Cache-rate telemetry uses supported-subset semantics.

`cacheHitTokenRate` computes against the subset of matching rows that support cache-read-token telemetry and returns `metricSupport.cacheHitTokenRate.status: "partial"` when unsupported rows are present. If no matching row supports cache-read-token telemetry, the chart receives an explicit unsupported state.

6. Request-list and graph filters use the same shared filter shape.

`GET /api/role-model/telemetry/requests` now accepts the shared telemetry filter keys used by analytics queries, including source, endpoint, model, provider, role, operation, and status-family filters. The UI request analytics route sends the same filter object to both the ledger and chart queries.

## Verification Evidence

Read-only live checks against existing local runtime hosts on 2026-06-21:

- Ports 3462, 3464, and 3470 were healthy and returned the same audited one-week analytics totals.
- Default one-week analytics on port 3462 returned 50 aggregated records, 45,126 total tokens, average latency 3,459 ms, p95 latency 13,577 ms, 24 successes, and 26 failures.
- The same default slice returned zero cost, zero avoided cost, zero cache-hit tokens, and `cacheHitTokenRate: null`.
- Default routing analytics returned no `selectedStrategy` series for charts that require that breakdown.
- Current `runtime-output` sqlite samples under the repo either had no `runtime_telemetry_records` rows or an older telemetry schema, so they do not explain the live graphs.

Relevant tests:

- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts` verifies the intended graph inventory and query contracts.
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` verifies chart model behavior, including metric series, breakdown series, ranking rows, and granularity.
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts` verifies the analytics endpoint, supported metrics/dimensions, cost/savings aggregation, and cache-hit-rate null behavior.
- `role-model-router/packages/sqlite-memory/test/index.test.ts` verifies telemetry persistence fields, including cost and savings fields.

## Follow-Up Questions for a Fix Pass

- Should analytics aggregate all rows in the requested time range by default, with `limit` applying only to request ledgers and ranking rows?
- Should time-series empty detection treat all-zero/all-null totals as empty for charts whose metric intent requires non-zero values?
- Should breakdown charts fall back to totals when the requested dimension is absent, or should they show an explicit missing-dimension empty state?
- Should the routing analytics default breakdown avoid `selectedStrategy` until the latest rows reliably persist it?
- Should cache efficiency split supported and unsupported records so mixed slices can still show a meaningful supported-subset rate?
