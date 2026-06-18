Run: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-18T11:07:52Z`
LockHash: `6ca56f0e308a96132f89b086ac5149544edba4d9ed50e257c27da4dc65ea849e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/TEMP-FAS-7-telemetry-analytics-plan.md`
- `/TEMP-FAS-7-route-chart-spec.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `/role-model-router/apps/runtime-ui/package.json`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/app.css`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
- User guidance in chat on 2026-06-17:
  - telemetry analytics must be backend-owned and future-proof
  - historical data should persist in the existing runtime SQLite store
  - chart strategy should be specified per route before implementation starts
Outputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
Scope note: This run extends the existing unified telemetry baseline into a durable historical analytics system with persisted request-time dimensions, one generic backend query API, and chart-led runtime UI analytics surfaces. It preserves the current operator shell and evidence-oriented raw-host adjacencies while adding shared chart primitives and route-level analytics built on the existing Apple-theme runtime design system.

## TODO

- [x] Define a stable repo run id and sequence position for telemetry analytics expansion
- [x] Capture the persistence contract for historical request-time telemetry dimensions
- [x] Capture the generic backend analytics API contract
- [x] Capture the chart design-system and route ownership contract
- [x] Record exact route-level chart scope for Overview and Observe
- [x] Preserve raw-host adjacency boundaries and historical-truth constraints
- [x] Record strict TDD and rebuilt-runtime browser verification requirements
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| Run `16` requirements | canonical structured telemetry contract, persisted summary/rows/requests reads, SSE freshness baseline |
| Run `45` requirements | Observe ownership split between canonical structured telemetry and preserved raw-host adjacency |
| Run `48` requirements | current Apple-inspired light/dark design-system authority and shared theming baseline |
| `/TEMP-FAS-7-telemetry-analytics-plan.md` | backend persistence model, generic query API shape, chart-token direction, implementation order |
| `/TEMP-FAS-7-route-chart-spec.md` | exact route-level chart proposals, control model, evidence-vs-analytics page boundaries |
| current sqlite-memory / host-bridge / runtime-ui code | actual seams for persistence, APIs, routes, and stale-contract reconciliation that the run must target |
| Apple reference artifact | approved color, typography, radius, and restraint baseline the chart system must inherit |
| shadcn chart composition pattern audit | composition-first Recharts integration, repo-owned chart code, config-decoupled theming, and responsive container requirements |
| chat guidance (2026-06-17) | backend-owned analytics, extensible chart foundation, existing SQLite persistence, route-aware spec authoring |

## Contract-First Delivery Rule

Implementation for this run must follow this order:

1. requirements contract and route/chart ownership
2. SQLite persistence contract and failing tests
3. backend analytics API contract and failing tests
4. runtime UI design-system/chart contract, including reconciliation of any remaining Swiss-era runtime-ui contract drift against the Apple-theme baseline
5. update the shared runtime UI design system and theme tokens first
6. implement the updated shared design system on the frontend through chart primitives, typed runtime API helpers, and route consumers
7. rebuilt-runtime verification

Route-level chart work may not bypass the persistence, API, or design-system contracts.
Frontend route work may not introduce analytics-specific styling ahead of the shared design-system update.

## Design-System Alignment Rule

This run extends the Apple-theme runtime UI baseline established by run `48`. It may not revive Swiss-era runtime UI rules that still survive in the current checkout.

Requirements for Phase 2 and Phase 3:

1. `DESIGN_SYSTEM.md`, `app.css`, and shared design-system helpers must be reconciled to the Apple baseline before chart styling is treated as complete.
2. Chart additions must inherit the existing Apple reference direction:
   - restrained chrome
   - light and dark semantic tokens
   - `SF Pro` first, `Inter` first fallback, then system fallbacks
   - soft radii rather than rectilinear Swiss zero-radius treatment
   - quiet dividers and hairlines rather than heavy grid or frame treatments
3. Chart surfaces, tooltips, legends, and controls must use the runtime UI typography roles and semantic tokens rather than introducing an independent chart mini-theme.
4. This run may borrow the shadcn chart component pattern, but it may not widen into full shadcn CLI adoption or a broader Radix migration solely for analytics charts.
5. The shared Apple-theme chart system must expose a broader chart-specific palette than the current minimal token set so multi-series analytics charts do not overuse the same two or three colors.
6. Phase 3 implementation order on the frontend is:
    - update shared Apple-theme design-system contracts and tokens
    - implement or update shared chart primitives and analytics controls using that design system
    - apply those shared primitives and tokens to route-level frontend surfaces
7. Route-level frontend implementation may not hardcode chart styling, control styling, or theme behavior that should have been introduced in the shared Apple-theme design system first.

## Backend-Frontend Alignment Rule

The current backend only partially supports the chart scope in this draft. Existing telemetry persistence and read APIs already cover basic request counts, token totals, latency, effective cost, and cache-read observations, but they do not yet expose a chart-ready historical contract for routing analytics or other request-time dimensions that are currently only available in live observation data.

Requirements for Phase 1 and Phase 2:

1. Each required chart in this document must be mapped to concrete backend fields, derived metrics, filters, breakdown dimensions, and label metadata before implementation is treated as planned.
2. If a required chart depends on a dimension that is not yet persisted as historical request-time truth or is not queryable through the generic analytics API, this run must add that backend support as part of scope rather than expecting the frontend to infer it from current runtime state.
3. Frontend legends, breakdown labels, and filter choices for historical charts must be backed by persisted request-time identifiers and backend-returned label metadata rather than live endpoint-registry enrichment alone.
4. A chart may only ship if its required backend metric and dimension semantics are deterministic for the same historical slice being rendered.
5. If Phase 1 proves that any currently listed chart cannot be supported without a materially different backend contract, the chart must be narrowed or deferred through an approved addendum rather than silently implemented with approximate frontend logic.
6. Cost-savings charts must be backed by request-time counterfactual economics snapshots, not reconstructed later from whatever provider catalog, endpoint inventory, or routing pool happens to exist after the fact.
7. Any chart, summary, ledger, or request-detail surface that shows cost must derive from the same stored authoritative per-request calculated cost field rather than ad hoc read-time fallback logic.

## Chart Layout Matrix

Shared layout rules:

- use a 12-column content grid on desktop, 6-column grid on tablet, and single-column stacking on mobile
- chart size vocabulary:
  - `Hero`: `12` columns, `min-height: 320px`
  - `Half`: `6` columns, `min-height: 240px`
  - `Context`: `12` columns, `min-height: 160px`
  - `Mini`: contextual sparkline or compact chart block, `min-height: 72px`
- page-level analytics controls sit above the first chart row
- route-level chart sections must not create horizontal overflow or widen the shell beyond the current runtime UI layout contract

| Route / page | Chart title | Chart content / metrics | Chart controls | Chart size | Page layout |
| --- | --- | --- | --- | --- | --- |
| `/app` Overview | `Token Usage Over Time` | `inputTokens`, `outputTokens`, `totalTokens`; optional stacked breakdown by source, endpoint, or model | Date range: `Day`, `Week`, `Month`, `90 days`; Breakdown: `Total`, `By source`, `By endpoint`, `By model` | `Hero` | First row, full-width primary chart |
| `/app` Overview | `Effective Cost Over Time` | `actualCostUsd`, `estimatedCostUsd`, `effectiveCostUsd` | Date range inherited; Breakdown: `Total`, `By provider`, `By model`, `By source` | `Half` | Second row, left column |
| `/app` Overview | `Cost Avoided Over Time` | `routingCostSavingsUsd`, `cacheCostSavingsUsd`, `totalAvoidedCostUsd`; optional baseline context against `baselineMaxEligibleCostUsd` | Date range inherited; Metric selector: `Total avoided`, `Routing avoided`, `Cache avoided`; Breakdown: `Total`, `By source`, `By selected model`, `By strategy` | `Half` | Second row, right column |
| `/app` Overview | `Latency Trend` | `averageLatencyMs`, `p95LatencyMs` | Date range inherited; Breakdown: `Total`, `By source` | `Half` | Third row, left column |
| `/app` Overview | `Cache Efficiency Trend` | `cacheHitTokens`, `cacheReadTokens`, `cacheBackedRequestRate`, `cacheHitTokenRate` when supported | Date range inherited; Metric selector: `Hit tokens`, `Hit %`, `Cache-backed request %`; Breakdown: `Total`, `By source` | `Half` | Third row, right column |
| `/app` Overview | `Success vs Failure Volume` | `successCount`, `failureCount`; optional `statusFamily` grouping | Date range inherited; Optional breakdown: `By source`, `By status family` | `Half` | Fourth row, left column |
| `/app/observe/requests` Requests analytics | `Request Volume Over Time` | `requestCount` over time | Date range; Filters: source, endpoint, model, provider, operation, status family; Breakdown: `Total`, `By source`, `By endpoint`, `By model`, `By provider` | `Hero` | First chart row below analytics controls |
| `/app/observe/requests` Requests analytics | `Token Usage Over Time` | `inputTokens`, `outputTokens`, `totalTokens` | Date range inherited; Filters inherited; Breakdown: `By source`, `By endpoint`, `By model` | `Hero` | Second chart row, full width |
| `/app/observe/requests` Requests analytics | `Effective Cost Over Time` | `actualCostUsd`, `estimatedCostUsd`, `effectiveCostUsd` | Date range inherited; Filters inherited; Breakdown: `By provider`, `By model`, `By source` | `Half` | Third row, left column |
| `/app/observe/requests` Requests analytics | `Latency Trend` | `averageLatencyMs`, `p95LatencyMs` | Date range inherited; Filters inherited; Breakdown: `Total`, `By source`, `By endpoint` | `Half` | Third row, right column |
| `/app/observe/requests` Requests analytics | `Cache Efficiency Trend` | `cacheHitTokens`, `cacheReadTokens`, `cacheBackedRequestRate`, `cacheHitTokenRate` when supported | Date range inherited; Filters inherited; Metric selector: `Hit tokens`, `Hit %`, `Cache-backed request %`; Breakdown: `Total`, `By source`, `By endpoint` | `Half` | Fourth row, left column |
| `/app/observe/requests` Requests analytics | `Failure Trend` | `failureCount` over time | Date range inherited; Filters inherited; Breakdown: `By endpoint`, `By model`, `By status family` | `Half` | Fourth row, right column |
| `/app/observe/requests` Requests analytics | `Ranked Comparison` | ranked `requestCount`, `totalTokens`, `effectiveCostUsd`, `averageLatencyMs`, `p95LatencyMs`, `failureCount`, `cacheHitTokens`, `cacheHitTokenRate` when supported by endpoint, model, or provider | Date range inherited; Filters inherited; Metric selector; Ranking target selector | `Hero` | Fifth row, full width above canonical ledger |
| `/app/observe/routing` Routing analytics | `Cost Avoided By Routing` | `routingCostSavingsUsd`, `cacheCostSavingsUsd`, `totalAvoidedCostUsd`; optional baseline context against `baselineMaxEligibleCostUsd` and selected effective cost | Date range: `Day`, `Week`, `Month`, `90 days`; Filters: source, requested role, selected model, difficulty bucket, routing mode, selected strategy; Metric selector: `Total avoided`, `Routing avoided`, `Cache avoided`; Breakdown: `Total`, `By source`, `By requested role`, `By model`, `By strategy` | `Hero` | First chart row below Observe routing header and controls |
| `/app/observe/routing` Routing analytics | `Routing Decision Volume` | `requestCount` over time for routed decisions | Date range inherited; Filters inherited; Breakdown: `By source`, `By requested role`, `By model`, `By strategy` | `Hero` | Second chart row, full width |
| `/app/observe/routing` Routing analytics | `Difficulty Distribution` | count and percentage of `easy`, `medium`, `hard` request buckets | Date range inherited; Filters inherited; View selector: `Count` / `Percent` | `Half` | Third row, left column |
| `/app/observe/routing` Routing analytics | `Strategy Selection Trend` | routed decisions by `selectedStrategy` or `routingMode` over time | Date range inherited; Filters inherited; Breakdown: `By strategy`, `By mode` | `Half` | Third row, right column |
| `/app/observe/routing` Routing analytics | `Role Demand and Selection` | routed decisions by `requestedRoleId` over time or ranked | Date range inherited; Filters inherited; View selector: `Trend` / `Ranked`; Breakdown: `By role` | `Half` | Fourth row, left column |
| `/app/observe/routing` Routing analytics | `Model Selection Trend` | routed decisions by selected `modelId` over time or ranked | Date range inherited; Filters inherited; View selector: `Trend` / `Ranked`; Breakdown: `By model` | `Half` | Fourth row, right column |
| `/app/observe/activity` Activity | `Host Activity Volume` | host activity entry count per time bucket | Date range only, limited presets acceptable | `Context` | Compact chart band above the raw-host ledger |
| `/app/observe/activity` Activity | `Capture Availability Trend` | capture-backed vs non-capture activity counts | Date range inherited | `Context` | Optional second compact chart below activity volume |
| `/app/observe/logs` Logs | `Severity Distribution` | `info`, `warn`, `error` counts; optional source class split | Date range or bounded log window; optional source filter | `Context` | Optional compact top band above logs |
| `/app/observe/requests/:requestId` Request detail | `Endpoint Recent Latency` | recent endpoint `averageLatencyMs`; optional `p95LatencyMs` | fixed recent window only; no heavy filters | `Mini` | Compact contextual block near endpoint/profile evidence |
| `/app/observe/requests/:requestId` Request detail | `Endpoint Recent Failure Trend` | recent success/failure counts for same endpoint | fixed recent window only; no heavy filters | `Mini` | adjacent to or stacked with latency mini chart |

## No-Data Experience Rule

The chart system must have an explicit no-data contract for new operators, empty runtimes, and highly filtered views.

## Loading-State Rule

The chart system must also have a deterministic loading-state contract so analytics pages remain calm and trustworthy while data is being fetched or refreshed.

Rules:

1. Primary chart containers must render stable loading placeholders instead of collapsing or flashing.
2. Loading states must preserve the final chart footprint so the page does not jump when data arrives.
3. Loading states must be visually quieter than no-data and error states:
   - subdued skeleton bars, axes, or panels
   - no fake chart data lines that could be mistaken for real telemetry
4. Route-level loading behavior must distinguish:
   - initial page load
   - user-triggered control refresh such as date-range or filter changes
   - background refresh where prior data can remain visible
5. When prior valid data exists and a refresh is in progress, the preferred behavior is stale-while-refreshing:
   - keep the current chart visible
   - show a subtle refreshing indicator in chart chrome or control chrome
   - avoid replacing populated charts with full skeletons unless the query context has materially changed
6. When the query context materially changes and no prior matching chart state exists, show loading placeholders within the chart containers until the new result resolves.
7. Loading, empty, and error states must be visually and semantically distinct.

Required behavior by route:

- `/app`
  - initial load may show skeleton chart containers for the six primary charts
  - background telemetry refresh should prefer keeping current chart data visible with subtle refreshing affordance
- `/app/observe/requests`
  - analytics control changes may place the chart band into a loading state
  - the canonical ledger and the analytics charts may load independently if that yields a better operator experience
- `/app/observe/routing`
  - analytics control changes may place the routing chart band into a loading state
  - when prior routing analytics data exists, refreshing should prefer stale-while-refreshing over full skeleton replacement
- `/app/observe/activity`
  - contextual charts may show compact loading placeholders only when the chart section is actually rendered
- `/app/observe/logs`
  - optional chart loading chrome must remain subordinate to the log surface
- `/app/observe/requests/:requestId`
  - contextual mini charts may show compact skeletons only if the comparison window is being queried

Rules:

1. Chart sections that define the route's primary information architecture remain visible even when there is no data.
2. No telemetry chart may render fake placeholder series or synthetic sample data in production.
3. Empty analytics surfaces must render honest empty states inside the chart container rather than collapsing the entire page section unexpectedly.
4. Empty states must explain whether the cause is:
   - no requests have been recorded yet
   - the active filters returned no matching requests
   - the selected metric is unavailable for the chosen data slice
   - routing classifier, role, or controller semantics were not active for the selected slice
5. Empty analytics states must preserve page layout stability so inventory, latest requests, ledgers, and adjacent evidence sections do not jump unpredictably.
6. Contextual optional charts on evidence-oriented routes may be omitted entirely when they add no value, but primary analytics charts on `/app` and `/app/observe/requests` must preserve their container and show an honest empty state.

Required behavior by route:

- `/app`
  - the six primary analytics chart containers remain visible
  - each chart shows an empty-state panel when no telemetry exists yet
  - the cost-avoided chart must distinguish:
    - no telemetry yet
    - telemetry exists but no routed requests or cache savings are present yet
    - telemetry exists but request-time pricing or baseline support is unavailable for savings math
  - current endpoint inventory and latest requests still render below and may be empty independently
- `/app/observe/requests`
  - all primary analytics chart containers remain visible
  - the chart band and the canonical ledger can both show empty states at the same time for brand-new runtimes
  - when filters remove all data, empty-state copy must distinguish that from a truly unused runtime
  - cache-efficiency charts must distinguish:
    - no telemetry yet
    - telemetry exists but no cache-hit activity has been observed
    - cache-hit percentage is unavailable because denominator semantics are not trustworthy for the selected slice
- `/app/observe/activity`
  - contextual charts may render only when activity data exists; otherwise the raw-host ledger remains primary
- `/app/observe/logs`
  - optional severity chart may be omitted entirely when no useful aggregation exists
- `/app/observe/routing`
  - primary routing analytics chart containers remain visible even when no routing decisions have been recorded yet
  - difficulty and strategy charts must distinguish true no-data from unavailable classifier or controller semantics
  - role and model selection legends must remain readable even when the available routing slice is narrow or highly filtered
- `/app/observe/requests/:requestId`
  - contextual mini charts may be omitted when the recent comparison window is unavailable

## Concrete Analytics API Example

Example request payload for `POST /api/role-model/telemetry/query`:

```json
{
  "range": {
    "preset": "month",
    "startAtMs": 1717113600000,
    "endAtMs": 1719705600000,
    "granularity": "day"
  },
  "series": [
    {
      "metric": "totalTokens",
      "breakdown": "sourceType"
    },
    {
      "metric": "cacheHitTokens",
      "breakdown": "sourceType"
    },
    {
      "metric": "cacheHitTokenRate",
      "breakdown": "sourceType"
    },
    {
      "metric": "averageLatencyMs",
      "breakdown": "sourceType"
    },
    {
      "metric": "p95LatencyMs",
      "breakdown": "sourceType"
    }
  ],
  "ranking": {
    "metric": "effectiveCostUsd",
    "dimension": "providerId",
    "limit": 5,
    "sort": "desc"
  },
  "filters": {
    "requestClass": [
      "chat.completions"
    ],
    "sourceType": [
      "local",
      "remote"
    ],
    "endpointIds": [],
    "modelIds": [],
    "providerIds": [],
    "roleIds": [],
    "requestOperations": [
      "chat"
    ],
    "statusFamilies": [
      "success",
      "failure"
    ]
  }
}
```

Example response shape expectations:

- top-level query echo
- validated applied filters
- time-bucketed series arrays per requested metric or breakdown
- ranked comparison rows for the requested ranking clause
- empty arrays rather than omitted keys when a valid query returns no data
- explicit metadata for unsupported metric or breakdown combinations when the request is structurally valid but semantically unavailable

## Requirements

### `R1` Persist historical telemetry as immutable request-time facts in the existing SQLite runtime store

Description:
Historical analytics must be grounded in the existing runtime SQLite memory store rather than a separate analytics database or reconstructed frontend cache.

Acceptance criteria:
- the canonical storage location remains `<runtimeStateRoot>/<scopeId>/memory/memory.sqlite`
- `runtime_telemetry_records` remains the canonical historical fact table for request analytics
- the request write path persists request-time dimension snapshots needed for historical analytics rather than reconstructing those dimensions later from current runtime state
- persisted request-time dimensions include at minimum:
  - `provider_id`
  - `provider_account_id`
  - `source_type`
  - `endpoint_kind`
  - `serving_source`
  - `region`
  - `lifecycle_state_at_request`
  - `health_status_at_request`
  - `requested_model_id`
  - `requested_role_id`
  - `difficulty_bucket`
  - `selected_strategy`
  - `role_ids_json`
  - `selected_model_id`
  - `routing_mode`
  - `request_operation`
  - `status_family`
  - `tooling_used`
  - `cache_state`
  - `eligible_endpoint_ids_json`
  - `eligible_model_ids_json`
  - `candidate_cost_snapshot_json`
  - `selected_pricing_snapshot_json`
  - `calculated_effective_cost_usd`
  - `selected_uncached_cost_usd`
  - `baseline_max_eligible_cost_usd`
  - `routing_cost_savings_usd`
  - `cache_cost_savings_usd`
  - `total_avoided_cost_usd`
  - `cost_calculation_basis`
  - `cost_calculation_version`
  - `cost_baseline_source`
  - `cost_savings_support`
  - `dimensions_json`
- the persistence contract explicitly separates:
  - indexed first-class columns for common filter or breakdown dimensions
  - extensible JSON dimensions for less-common future analytics dimensions
- first-class indexed historical columns must cover at minimum the dimensions needed by required charts and filters on `/app`, `/app/observe/requests`, and `/app/observe/routing`, including:
  - `created_at_ms`
  - `source_type`
  - `endpoint_id`
  - `model_id` or `selected_model_id`
  - `provider_id`
  - `requested_role_id`
  - `difficulty_bucket`
  - `selected_strategy`
  - `routing_mode`
  - `request_operation`
  - `status_family`
- cost and savings facts must preserve request-time counterfactual truth:
  - every persisted request record must include one authoritative calculated effective request cost stored at write time in telemetry, even when vendor-reported actual cost is absent
  - the authoritative calculated effective request cost must be non-null for every persisted request and must be the canonical cost used by backend summaries, analytics queries, ledgers, and request detail
  - if vendor-reported actual cost is unavailable, the backend must calculate the effective request cost from request-time pricing snapshots, observed token usage, and canonical local-free or equivalent zero-cost semantics before persistence completes
  - the run defines one deterministic cost-calculation precedence order shared by write-path persistence, analytics aggregation, and verification:
    - vendor-reported actual cost when available
    - request-time pricing-snapshot calculation when actual cost is unavailable
    - canonical local-free zero-cost semantics for approved local execution paths
  - the request-time cost record must also persist its basis and version so future pricing-formula changes do not silently reinterpret historical rows
  - analytics cost metrics for this run are canonically stored and aggregated in `USD`; any source cost that cannot be normalized into `USD` at request time must be marked unsupported rather than mixed into aggregates ambiguously
  - requests that fail before downstream execution still persist an authoritative effective cost, which should normally be `0 USD` with an explicit no-execution calculation basis or an equally explicit canonical basis
  - the selected request cost remains persisted from actual vendor telemetry where available, or from the approved estimated-cost fallback path where actual cost is unavailable
  - the run persists an uncached selected-request cost basis when cache savings are meant to be charted
  - the run persists the most expensive eligible configured candidate cost for the same request-time routing pool so routing savings can be charted later without reconstructing historical catalog state
  - the run persists whether local execution was treated as `USD 0` under the existing local-free economics semantics
- failed requests and partial executions persist the same historical dimension model needed for failure analytics; the run must not make charts success-only
- existing observed-profile and performance-sample tables remain intact and available for future profile-oriented analytics

### `R2` Make historical analytics depend on request-time truth rather than current registry or endpoint state

Description:
Analytics must answer questions about what happened at request time, not what the runtime looks like now.

Acceptance criteria:
- chart queries use persisted request-time dimensions as their source of truth
- historical analytics do not depend on current endpoint health, current lifecycle state, current role bindings, or current provider ownership for grouping or filtering
- if current runtime reads continue to enrich operator list/detail surfaces from live state, that enrichment is clearly separated from historical analytics query logic
- the implementation records typed semantics for unavailable or unknown dimension values rather than silently substituting current-state values
- historical provider, endpoint, model, role, and strategy legends for charts must resolve from persisted request-time identifiers plus backend label metadata for that historical slice, not from whatever the current registry happens to say today
- the run preserves the distinction between:
  - canonical historical analytics truth
  - current inventory or health posture shown elsewhere in the operator UI

### `R3` Add one generic backend-owned telemetry analytics query API

Description:
The backend must expose one reusable analytics API that can support current and future charts without adding a new endpoint per chart.

Acceptance criteria:
- the run adds `POST /api/role-model/telemetry/query` as the generic analytics endpoint
- the run does not introduce chart-specific backend endpoints such as separate per-chart latency, cost, token, or failure routes
- the generic analytics endpoint is the only backend contract that new historical charts rely on for bucketed series and ranking views; existing summary and row endpoints may continue to exist, but they are not treated as sufficient substitutes for the new chart scope
- the query contract supports:
  - time range presets: `day`, `week`, `month`, `90d`
  - explicit `startAtMs` and `endAtMs`
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
    - `cacheHitTokens`
    - `cacheReadTokens`
    - `cacheWriteTokens`
    - `cacheBackedRequestRate`
    - `cacheHitTokenRate`
    - `actualCostUsd`
    - `estimatedCostUsd`
    - `effectiveCostUsd`
    - `selectedUncachedCostUsd`
    - `baselineMaxEligibleCostUsd`
    - `routingCostSavingsUsd`
    - `cacheCostSavingsUsd`
    - `totalAvoidedCostUsd`
    - `averageLatencyMs`
    - `p95LatencyMs`
    - `toolCallCount`
    - `toolExecutionCount`
  - breakdowns:
    - `sourceType`
    - `endpointId`
    - `modelId`
    - `providerId`
    - `requestedRoleId`
    - `difficultyBucket`
    - `selectedStrategy`
    - `routingMode`
    - `requestOperation`
    - `statusFamily`
    - `roleId`
  - filters:
    - `requestClass`
    - `sourceType`
    - `endpointIds`
    - `modelIds`
    - `providerIds`
    - `requestedRoleIds`
    - `difficultyBuckets`
    - `selectedStrategies`
    - `routingModes`
    - `roleIds`
    - `requestOperations`
    - `statusFamilies`
- the contract defines deterministic validation and response semantics for invalid ranges, empty windows, unsupported combinations, and no-data results
- every required chart in `R6`, `R7`, and `R8` must be supportable from the query contract without route-local metric derivation or live-state joins as a primary data source
- `effectiveCostUsd` in the analytics contract must resolve from the authoritative stored per-request calculated cost field, not from query-time null-coalescing across actual and estimated values
- cache-efficiency metrics must follow explicit semantics:
  - `cacheHitTokens` and `cacheReadTokens` reflect persisted cache-read token observations
  - `cacheBackedRequestRate` reflects the percentage of requests in the slice with cache-read activity or an equivalent persisted cache-hit signal
  - `cacheHitTokenRate` is only returned when the denominator is trustworthy for the selected slice; otherwise the API returns explicit unsupported or unavailable semantics rather than a misleading percentage
- cost-savings metrics must follow explicit semantics:
  - local-selected requests may be treated as `USD 0` only when the request-time routing economics contract explicitly marks them as local-free or an equivalent canonical zero-cost local execution mode
  - every request must have a trustworthy `effectiveCostUsd` regardless of whether savings metrics are supported for that request
  - `selectedUncachedCostUsd` represents the chosen request's cost without cache-hit reductions when that denominator can be trusted
  - `baselineMaxEligibleCostUsd` represents the highest-cost eligible configured candidate for the same request-time routing pool after alias, policy, capability, and routing gates have been applied
  - `routingCostSavingsUsd` equals `baselineMaxEligibleCostUsd - selectedUncachedCostUsd` when both values are trustworthy
  - `cacheCostSavingsUsd` equals `selectedUncachedCostUsd - effectiveCostUsd` when cache-adjusted and uncached selected-request semantics are both trustworthy
  - `totalAvoidedCostUsd` equals `baselineMaxEligibleCostUsd - effectiveCostUsd`, and should equal `routingCostSavingsUsd + cacheCostSavingsUsd` when all component metrics are supported
  - if the request-time candidate pool or pricing basis is incomplete, the API returns explicit unsupported or partial-support semantics rather than inventing savings numbers
- the response contract is typed and chart-agnostic rather than route-specific, with explicit structures for:
  - aggregate summary values
  - time-bucketed series data
  - breakdown series metadata
  - ranked comparison rows
  - applied filters and query echo metadata
- breakdown series metadata must include stable ids and human-readable labels for provider, endpoint, model, role, strategy, and source series so the frontend does not infer chart legends from ad hoc local lookups
- the contract defines deterministic bucket semantics including:
  - ordered bucket output
  - absolute bucket boundary fields
  - explicit zero-fill or omission behavior for empty buckets
  - deterministic handling for partial leading/trailing buckets
- the contract defines deterministic ranking semantics for comparison views, including limit or top-N behavior and tie ordering
- the API is typed end to end so runtime-ui consumers do not infer analytics result shapes from ad hoc JSON
- routing analytics support is first-class in the backend contract:
  - `requestedRoleId`, `difficultyBucket`, `selectedStrategy`, `routingMode`, and selected model dimensions are historically queryable for the same request-time slice as token, cost, and latency metrics
  - if any of those routing dimensions are only available in live observation bundles at the start of the run, the run must promote them into persisted telemetry facts or an equivalent canonical historical analytics store inside the existing SQLite database before `/app/observe/routing` charts are considered in scope
- request-time routing economics support is first-class in the backend contract:
  - the backend persists one authoritative calculated effective cost for every request row and uses that same persisted fact across all analytics consumers
  - the backend persists enough request-time information about the eligible routing pool and pricing basis to support historical cost-savings charts later
  - the backend does not recompute historical savings by looking at the current catalog after the fact
  - the backend can return cost-savings metrics grouped by source, requested role, selected model, selected strategy, and routing mode
- existing summary, comparison-row, request-ledger, request-detail, and SSE telemetry surfaces remain supported for their current responsibilities unless a later approved addendum changes them

### `R4` Preserve runtime boundary discipline while expanding telemetry analytics

Description:
This run expands analytics without collapsing the runtime architecture boundaries established by earlier telemetry and Observe runs.

Acceptance criteria:
- analytics aggregation remains backend-owned; the frontend does not calculate p95 latency, success rate, or chart-ready time buckets from raw request rows as its primary source of truth
- raw host surfaces such as `/api/metrics`, `/logs`, `/logs/stream/*`, and `/api/captures/:id` remain preserved operator adjacencies rather than being reinterpreted as the canonical analytics backend
- the analytics query endpoint lives in the role-model-owned host-bridge API surface rather than vendor or raw-host namespaces
- request detail, activity, and logs continue to preserve their current evidence-oriented roles even when small contextual charts are added
- the run does not introduce a second parallel observability model disconnected from `runtime_telemetry_records` and the existing structured telemetry baseline

### `R5` Extend the runtime UI design system with a shared chart foundation and chart-token contract

Description:
The runtime UI must gain a reusable chart system rather than route-local bespoke visualizations.

Acceptance criteria:
- `DESIGN_SYSTEM.md` documents the chart-led route ownership for `/app`, `/app/observe/requests`, and the lighter contextual chart usage on evidence-oriented Observe routes
- `DESIGN_SYSTEM.md` remains the frontend styling authority for this run, and it explicitly records the Apple-theme chart, control, typography, and token rules before route-level implementation begins
- the runtime UI adds a repo-owned chart primitive layer rather than embedding raw Recharts markup independently in each route
- the chart primitive follows the shadcn chart composition model:
  - Recharts remains directly usable in route-level chart composition
  - the repo owns copied chart primitive code
  - tooltip, legend, and container helpers are shared without hiding Recharts behind a hard-to-extend abstraction
- the frontend adds a shared chart dependency and composition model suitable for future telemetry charts
- the run does not require adopting the broader shadcn CLI/component-registry stack just to ship analytics charts
- light and dark chart styling are integrated into the current Apple-theme runtime UI token system rather than using route-local hardcoded chart colors
- shared Apple-theme token and control updates land before route-level analytics pages consume them
- the chart token family includes at minimum:
  - `--rm-chart-local`
  - `--rm-chart-remote`
  - `--rm-chart-tokens`
  - `--rm-chart-cache-hit`
  - `--rm-chart-cache-rate`
  - `--rm-chart-latency`
  - `--rm-chart-cost`
  - `--rm-chart-failure`
  - `--rm-chart-success`
  - `--rm-chart-neutral-1`
  - `--rm-chart-neutral-2`
- the updated chart palette also includes reusable chart-specific categorical and semantic color tokens derived from the approved Apple-theme reference additions, at minimum:
  - `--rm-chart-ink`: `#171717`
  - `--rm-chart-cyan`: `#50e3c2`
  - `--rm-chart-highlight-pink`: `#ff0080`
  - `--rm-chart-violet`: `#7928ca`
  - `--rm-chart-link-blue`: `#0070f3`
  - `--rm-chart-link-deep`: `#0761d1`
  - `--rm-chart-link-soft`: `#d3e5ff`
  - `--rm-chart-error`: `#ee0000`
  - `--rm-chart-error-deep`: `#c50000`
  - `--rm-chart-error-soft`: `#f7d4d6`
  - `--rm-chart-warning`: `#f5a623`
  - `--rm-chart-warning-deep`: `#ab570a`
  - `--rm-chart-warning-soft`: `#ffefcf`
- the design-system contract must explicitly distinguish:
  - semantic chart tokens for status, success, failure, warning, cache, and cost meaning
  - categorical chart tokens for multi-series comparisons where colors distinguish series identity rather than status meaning
- the shared Apple-theme chart palette must define light-mode and dark-mode calibrated usage rules for stroke, fill, and opacity so multi-series charts remain legible and consistent in both themes
- route-level charts may select from the shared chart palette, but they may not invent additional one-off series colors outside the shared Apple-theme chart token set without an approved addendum
- the chart system defines shared chart config semantics decoupled from chart data so labels, icons, and color tokens can be reused across routes
- legends for breakdown charts must display explicit human-readable series labels for endpoint, model, provider, role, strategy, and source breakdowns rather than anonymous color chips alone
- when a breakdown dimension has too many concurrent series to stay readable, the contract must define a bounded strategy such as top-N plus `Other`, searchable legend overflow, or an equivalent readability guard
- the shared chart primitives must define deterministic color-assignment rules so the same provider, model, role, strategy, or source series receives the same token across charts where feasible
- chart containers define explicit height or minimum-height behavior so responsive measurement is stable on first render and does not create layout collapse or overflow
- chart tooltips, legends, axis labels, and helper copy inherit Apple-baseline runtime typography roles such as caption, fine print, and body rather than introducing generic browser defaults
- chart grids, axis strokes, and separators use the runtime hairline and divider token family rather than heavy neutral borders or decorative effects
- the design-system contract defines shared analytics controls for:
  - time range selection
  - filters
  - metric selection where applicable
  - breakdown selection where applicable
- the design-system contract explicitly states whether `/app` remains a `summary-board` with a chart-led telemetry band and whether `/app/observe/requests`, `/app/observe/routing`, and other charted Observe pages remain `ledger-inspector`-style surfaces with analytics bands above their evidence panes, or replaces those template names with equally explicit new contracts
- charted route ownership for this run is limited to:
  - `/app`
  - `/app/observe/*`
- non-Observe control and setup routes such as `/app/router`, `/app/models`, `/app/connect`, and related admin/configuration surfaces must not become chart-led analytics routes in this run
- route implementations may not introduce one-off chart colors, one-off legends, or route-specific control behavior that bypasses the shared design system without an approved addendum
- frontend implementation sequencing for this run is mandatory:
  - first shared design-system and theme updates
  - then shared chart/control primitives
  - then route adoption

### `R6` Make `/app` a chart-led runtime overview

Description:
The top-level runtime overview must evolve from a KPI-first telemetry strip into a compact chart-led operator summary.

Acceptance criteria:
- `/app` exposes a time-range selector with `Day`, `Week`, `Month`, and `90 days`
- the primary chart surface includes:
  - `Token Usage Over Time`
  - chart type: stacked area
  - metrics: `inputTokens`, `outputTokens`, `totalTokens`
  - breakdown modes: `Total`, `By source`, `By endpoint`, `By model`
- the overview includes `Cache Efficiency Trend`
  - chart type: line or bar depending on selected metric
  - metrics: `cacheHitTokens`, `cacheReadTokens`, `cacheBackedRequestRate`, `cacheHitTokenRate` when supported
  - breakdown modes: `Total`, `By source`
- the overview also includes:
  - `Effective Cost Over Time`
  - chart type: line or filled area
  - breakdown modes: `Total`, `By provider`, `By model`, `By source`
- the overview also includes:
  - `Latency Trend`
  - chart type: dual-line
  - metrics: `averageLatencyMs`, `p95LatencyMs`
  - breakdown modes: `Total`, `By source`
- the overview also includes:
  - `Cost Avoided Over Time`
  - chart type: stacked area or grouped bar
  - metrics: `routingCostSavingsUsd`, `cacheCostSavingsUsd`, `totalAvoidedCostUsd`
  - breakdown modes: `Total`, `By source`, `By selected model`, `By strategy`
- the overview also includes:
  - `Success vs Failure Volume`
  - chart type: stacked bar
  - metrics: `successCount`, `failureCount`
  - optional breakdown modes: `By source`, `By status family`
- current endpoint inventory and latest requests remain below the chart-led posture section as drill-in and present-state context
- the route remains compact and posture-oriented rather than turning into a second full analytics workbench
- chart layout and control layout remain responsive on narrow widths; the page may stack charts and controls, but it may not create horizontal overflow or shell-width drift

### `R7` Make `/app/observe/requests` the primary structured telemetry analytics route

Description:
Observe -> Requests must become the main analytics surface for structured telemetry while preserving the canonical request ledger beneath it.

Acceptance criteria:
- the route exposes shared analytics controls for time range and filters
- the route may add route-specific comparison controls, but it must keep them within the shared design-system control model rather than inventing a second control grammar
- the route includes `Request Volume Over Time`
  - chart type: bar
  - breakdown modes: `Total`, `By source`, `By endpoint`, `By model`, `By provider`
- the route includes `Token Usage Over Time`
  - chart type: stacked area
  - breakdown modes: `By source`, `By endpoint`, `By model`
- the route includes `Cache Efficiency Trend`
  - chart type: line or bar depending on selected metric
  - metrics: `cacheHitTokens`, `cacheReadTokens`, `cacheBackedRequestRate`, `cacheHitTokenRate` when supported
  - breakdown modes: `Total`, `By source`, `By endpoint`
- the route includes `Effective Cost Over Time`
  - chart type: line or area
  - breakdown modes: `By provider`, `By model`, `By source`
- the route includes `Latency Trend`
  - chart type: dual-line
  - metrics: `averageLatencyMs`, `p95LatencyMs`
  - breakdown modes: `Total`, `By source`, `By endpoint`
- the route includes `Failure Trend`
  - chart type: bar or line
  - breakdown modes: `By endpoint`, `By model`, `By status family`
- the route includes `Ranked Comparison`
  - chart type: horizontal bar
  - metric selector includes request count, total tokens, effective cost, average latency, p95 latency, failure count, cache-hit tokens, and cache-hit token rate when supported
  - ranking target selector includes endpoints, models, and providers
- the canonical telemetry request ledger remains below the charts
- the ledger shares the active time range and relevant filters so charts and ledger stay logically aligned
- the route continues to hand off directly into `/app/observe/requests/:requestId`
- chart and ledger layout remain responsive on narrow widths and may not produce shell overflow, clipped controls, or off-screen comparison surfaces

### `R8` Keep the other Observe routes evidence-oriented, with only light contextual charting where it adds operator value

Description:
The analytics expansion must stay inside the Observe family for non-Overview analytics. Routing analytics belong under Observe, while the existing Router section remains configuration and decision-explanation oriented. Activity, Logs, and single-request detail must stay evidence-oriented.

Acceptance criteria:
- `/app/observe/routing` is the dedicated routing analytics surface for:
  - selected roles
  - selected models
  - selected strategies or modes
  - difficulty distribution such as `easy`, `medium`, and `hard`
- `/app/observe/routing` also includes a required cost-savings analytics band for:
  - routing savings relative to the most expensive eligible configured candidate in the same request-time pool
  - cache savings on the chosen request
  - total avoided cost as the combination of routing and cache savings when both are supported
- the routing analytics charts on `/app/observe/routing` must read from the same historical analytics backend contract as the other charted routes; they may not be assembled by directly mining recent request detail records or live observation bundles inside the route
- `/app/router` remains a routing configuration, policy visibility, candidate comparison, and decision-explanation surface rather than becoming a chart-led analytics page in this run
- `/app/observe/activity` remains a raw-host activity and capture surface rather than becoming the primary analytics route
- if `/app/observe/activity` gains charts, they are limited to light contextual analytics such as:
  - `Host Activity Volume`
  - `Capture Availability Trend`
- `/app/observe/logs` remains log-first; any charting is optional and compact only, such as a small severity distribution
- `/app/observe/requests/:requestId` remains detail-first; any charts are contextual-only, such as recent endpoint latency or recent endpoint success/failure sparklines
- when request detail exposes cost information for a sampled request, it must surface the stored authoritative effective cost together with enough audit metadata to explain the value, including calculation basis and version, without forcing the operator to reverse-engineer chart math
- raw evidence, correlation, captures, tooling receipts, and structured request detail remain the primary content on these routes

### `R9` Require strict TDD for all production changes in this run

Description:
The implementation phase for this run must follow strict failing-test-first discipline.

Acceptance criteria:
- `TDD Mode` for Phase 3 is `strict`
- every production code slice is preceded by a failing automated test at the closest relevant layer before production code turns green
- RED and GREEN evidence paths are recorded per implementation slice
- production code for SQLite schema changes, host-bridge analytics APIs, runtime-api helpers, view-models, chart primitives, and route consumers may not bypass failing-test-first discipline
- route ownership changes such as moving routing analytics under `/app/observe/*` must also be implemented under failing-test-first discipline rather than being treated as unverified visual cleanup
- failing tests must explicitly cover:
  - per-request authoritative effective-cost persistence when actual vendor cost is present
  - per-request authoritative effective-cost persistence when actual vendor cost is absent and pricing-snapshot calculation is required
  - local-free zero-cost handling
  - uncached selected-cost persistence for cache-savings math
  - routing baseline persistence for highest-cost eligible configured candidates
  - analytics aggregation for `effectiveCostUsd`, `routingCostSavingsUsd`, `cacheCostSavingsUsd`, and `totalAvoidedCostUsd`
- documentation-only contract work may precede code, but production code may not

### `R10` Verify the rebuilt runtime through focused automated validation and browser QA

Description:
This run is not complete when only unit tests pass. Final proof must include the rebuilt runtime operator experience in the browser.

Acceptance criteria:
- focused automated coverage proves:
  - persisted historical request-time dimensions are written correctly for success and failure telemetry records
  - the analytics query API returns deterministic bucketed results for representative metric, breakdown, and filter combinations
  - the analytics query API returns the routing dimensions needed by `/app/observe/routing` from persisted historical request-time data rather than live-state reconstruction
  - request-time routing economics facts are persisted correctly, including local-free handling, cache-adjusted request cost, and highest-cost eligible candidate baseline support
  - every persisted request row has a stored authoritative effective cost, and read paths do not silently substitute query-time fallback cost calculations for missing persisted data
  - the runtime UI typed helpers and chart view-models consume the analytics API contract correctly
  - the affected routes render analytics and empty states without regressing the operator shell
- focused builds pass for touched backend and frontend packages
- the runtime used for QA is rebuilt before manual verification
- Phase 5 manual QA and controller verification must generate or replay real request traffic so the charts receive actual runtime telemetry instead of only empty-state proof
- every primary chart on `/app`, `/app/observe/requests`, and `/app/observe/routing` must be practically verified in-app with populated data, not only by inspecting API responses or snapshot tests
- generated verification traffic must cover enough scenario variety to exercise:
  - local and remote telemetry
  - cache-hit activity where supported
  - success and failure records
  - multiple providers or models where the chart expects comparative legends
  - vendor-actual-cost requests
  - request-time pricing-snapshot fallback requests where vendor actual cost is absent
  - no-execution or pre-execution failure requests whose authoritative effective cost should persist as zero or equivalent canonical no-execution cost
  - routing role selection, model selection, strategy selection, and difficulty buckets for `/app/observe/routing`
  - routing cost savings where the chosen route is cheaper than at least one more expensive eligible configured candidate
  - local-free routing cases where selected local execution should materially increase total avoided cost
- Phase 5 verification must reconcile cost end to end:
  - inspect generated request records or request-detail evidence for selected sample requests
  - confirm the stored authoritative effective cost, calculation basis, calculation version, and savings-support fields are populated as expected
  - confirm aggregate API results for the same slice match the sum or rollup of those persisted request costs and savings
  - confirm the browser charts render those same aggregated values correctly
- if a chart does not display the generated data correctly in the app, the run must iterate on implementation and verification until the chart is visibly correct on the rebuilt runtime surface
- empty-state verification alone is insufficient for required charts; each required chart must be verified in both:
  - no-data or loading conditions as appropriate
  - populated real-data conditions produced during QA
- browser verification covers at minimum:
  - `/app`
  - `/app/observe/requests`
  - `/app/observe/routing`
  - `/app/observe/activity`
  - `/app/observe/logs`
  - at least one `/app/observe/requests/:requestId` detail path if contextual charts land there
- browser verification includes at minimum one narrow/mobile-width pass for the charted routes so responsive chart containers and controls are validated against real shell constraints
- browser verification proves both light and dark theme chart behavior on the rebuilt runtime surface
- browser verification confirms that each populated chart is driven by backend query results consistent with the requested historical slice rather than route-local approximations
- final QA confirms that analytics routes and evidence-oriented routes still communicate their distinct roles clearly to the operator

## Out of Scope

- `OOS1`: introducing a separate analytics database or non-SQLite telemetry warehouse
- `OOS2`: adding one backend endpoint per chart instead of one generic analytics query surface
- `OOS3`: replacing or deleting preserved raw-host operator surfaces such as `/api/metrics`, `/logs`, `/logs/stream/*`, or `/api/captures/:id`
- `OOS4`: broad observability redesign outside the telemetry analytics, chart foundation, and target runtime UI routes defined here
- `OOS5`: phase-1 materialized rollup tables unless a later approved addendum proves they are required
- `OOS6`: unrelated shell or information-architecture redesign beyond the route-level analytics work defined in this contract

## Constraints

- The run must consume the canonical structured telemetry baseline established by run `16`
- The run must preserve the Observe ownership split established by run `45`
- The run must inherit the Apple-theme design-system authority established by run `48`
- Historical analytics persistence remains in the existing SQLite runtime state store
- The generic analytics contract is `POST /api/role-model/telemetry/query`
- The frontend chart system must be shared and theme-aware rather than route-local
- Overview remains posture-oriented; Observe -> Requests remains the primary structured analytics route; Activity, Logs, and request detail remain evidence-oriented

## Assumptions

- the existing `runtime_telemetry_records` table and telemetry write path can be extended through migrations without requiring a new persistence engine
- the current role-model telemetry baseline exposes enough integration seams to extend persistence and querying for the required analytics without inventing a second observability domain model, even though several required routing and provider-history dimensions are not yet first-class in the current store or API
- adding a shared chart dependency to `runtime-ui` is acceptable if it remains wrapped by repo-owned primitives and tokens
- the rebuilt runtime QA path will continue to be available for browser verification during Phase 5

## Sequence Integration

- Roadmap slot: `post-run48 telemetry analytics foundation and route-level chart delivery`
- Previous repo dependencies:
  - `16-router-runtime-unified-telemetry-dashboard`
  - `45-observe-surface-realignment`
  - `48-runtime-ui-design-system-apple-theme`
- Required handoff:
  - persisted historical telemetry dimensions
  - one generic analytics query API
  - chart-ready design-system contract and shared chart primitives
  - chart-led Overview and Observe -> Requests surfaces
  - preserved evidence-oriented Observe adjacency

## Coverage Gate

- [x] persistence requirements define the historical truth model and storage location
- [x] backend requirements define one generic analytics query contract instead of chart-specific endpoints
- [x] route requirements encode the approved chart scope for `/app` and `/app/observe/requests`
- [x] evidence-oriented Observe routes remain explicitly bounded
- [x] strict TDD and rebuilt-runtime browser verification are explicit requirements

Coverage: PASS

## Approval Gate

- [x] requirements are specific enough for Phase 1 AS-IS analysis and Phase 2 planning
- [x] acceptance criteria are observable and route-specific
- [x] architecture boundaries and out-of-scope rules are explicit enough to prevent scope drift

Approval: PASS
