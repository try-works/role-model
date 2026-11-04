# S633 - charts review HOLD repairs (part 1: non-plumbing)

## A) s628 now asserts the Requests and ObserveRouting chart surfaces too
The sr-only table regression test renders all three chart surfaces: Overview (6 cards), Requests volume (metrics
fixture) and ObserveRouting (nine routing cards). Each asserts >=1 chart table, every table has data-chart-part
"table", and zero visible tables (table:not(.sr-only)) inside chart cards.

## B) routing-charts.ts - selected breakdown + analytics filters (module layer)
- Cost avoided by routing and Routing decision volume now carry the page's selected breakdown
  (usesSelectedBreakdown, matching :3456 buildBaseQuery({ breakdown: input.breakdown })); the other seven keep
  their reference breakdowns.
- buildRoutingChartQueries(windowMs, selectedBreakdown = null, filters = {}) now threads a RoutingChartFilters
  object (sourceTypes/difficultyBuckets/taxonomyGroupIds/RoleIds/TaskTypes/TaskVariants/CapabilityIds/
  ModalityIds/ToolClassIds/selectedStrategies) into EVERY query instead of {}. Defaults keep current callers
  behaviour until the shared plumbing lands.

## C) s632 strengthened
- Asserts the FULL buildRoutingChartQueries payload for all nine (breakdown, filters, granularity, metrics,
  ranking dimension+limit+metric, windowMs) plus the exact capability empty copy.
- Asserts the selected breakdown reaches the two time-series cards and the filters object reaches every query.
- Mounted-route test asserts the nine POST bodies contain each expected full query and nine distinct bodies.

## D) capability empty copy
Now exactly :3456: "No capability-tagged telemetry is available for the current slice."

## TDD
- RED: evidence/logs/s633-charts-hold-red.log - full payload test fails on the capability copy and the filters
  test fails (selected breakdown null).
- GREEN: evidence/logs/s633-charts-hold-green.log - s628 8/8 + s632 4/4; tsc 0.

## Live wiring (task-113 confirmed landed, ba2dbbc8)
- routing-charts.ts exports routingBreakdownDimension ("Total"->null, "By endpoint variant"->endpointId,
  "By upstream model"->modelId, "By provider"->providerId) and routingChartFilters ("Local only"->sourceTypes
  ["local"], "Remote only"->["remote"], Easy/Medium/Hard only -> difficultyBuckets).
- update.ts loadRoutingChartsCommand now builds its nine queries from model.observeRoutingFilters (breakdown +
  source + difficulty) so init entry, ChangedUrl and ObserveRangeChanged all carry the selected filters/breakdown.
- ObserveFilterChanged also reloads the nine charts (filters change without a range change).
- Taxonomy/strategy/task filters are NOT available in this port's model (observeRoutingFilters has only breakdown/
  difficulty/expanded/range/source; the reference's taxonomy/strategy URL filters have no UI here), so those
  filter keys stay absent rather than invented. This is recorded, not hidden.
- s632 mapping + mounted-route live tests added (RED s633-filters-red.log -> GREEN s633-filters-green.log).
- FINAL: full UI suite 107 files / 965 tests PASS; S247 4/4 (fail 0).

## FINAL init-entry fix (review HOLD)
- src/init.ts no longer calls buildRoutingChartQueries(86400000) directly: the entry batch is built with the same
  breakdown/filter mapping as the live helper, from observeRoutingFilters restored out of the URL
  (source=local|remote, breakdown=endpointId|modelId|providerId or label, difficulty=easy|medium|hard,
  range=day|week|month|90days). A fresh entry (no query params) still uses the reference defaults (null / {}).
- The restored state is placed on the model (observeRoutingFilters) so the filter bar and later reloads agree.
- s632 new mounted test: /observe/routing?source=local&breakdown=By+upstream+model&difficulty=hard asserts all nine
  ENTRY POSTs carry {difficultyBuckets:["hard"], sourceTypes:["local"]} and bodies 0/1 use breakdown modelId
  (body 2 stays taxonomyRoleId).
- TDD RED s633-entry-filters-red.log -> GREEN s633-entry-filters-green.log: s632 7/7, tsc 0.
- FINAL TOTALS: full UI suite 107 files / 966 tests PASS; S247 4/4 (fail 0).
