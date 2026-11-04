# S632 / task-112 - observe-routing chart suite (nine charts) ported

## Problem
The reference /app/observe/routing renders nine charts (cost avoided, decision volume, taxonomy-role volume,
avoided cost by task, difficulty distribution, strategy trend, capability mix, tool-class mix, model selection).
Our port rendered only one volume card.

## Change
- New src/features/observe/routing-charts.ts: the nine reference definitions (exact titles/descriptions/
  metrics/breakdowns/ranking dimensions/limits from apps/runtime-ui/app/lib/telemetry-route-models.ts),
  buildRoutingChartQueries (POST /api/role-model/telemetry/query body: metrics/breakdown/ranking/windowMs/
  granularity hour for Day else day), analytics -> ChartSeries mapping (buckets totals for area/bar, ranking rows
  for ranking cards), and routingChartCards which renders all nine telemetryChartCard cards with per-chart
  in-plot empty states.
- Plumbing: Model.routingCharts {entries,status,token}; Message RoutingChartsLoaded/Failed; commands
  createRoutingChartsClient/defineRoutingChartsCommands (batch POST, token/last-write semantics); createUpdate
  handler + ChangedUrl dispatch + ObserveRangeChanged reload; createInit dispatch on direct entry; app.ts wiring
  with routingChartsFetchImpl; observe/views.ts renders the suite (old single volume card removed).

## TDD
- s632 (3 tests): nine reference titles + exact queries (breakdown selectedStrategy/taxonomyRoleId, ranking
  modelId/taxonomyTaskType/taxonomyCapabilityId/taxonomyToolClassId/difficultyBucket, avoided-cost metrics);
  render: nine cards, real decision-volume bars + model ranking bars, cost card in-plot empty, no visible tables;
  mounted route: nine POSTs to /api/role-model/telemetry/query with the expected breakdown/ranking bodies.
- RED: evidence/logs/s632-routing-red.log - clean worktree at e06c2386 (pre-change) cannot even collect the test
  because src/features/observe/routing-charts.ts does not exist (feature absent).
- GREEN: evidence/logs/s632-routing-charts.log (3/3); targeted s632+s628+s619+s565+s534+s623+s617 green
  (s632-routing-targeted.log) after updating s628's old single-volume expectations.

## Verification vs :3456 (isolated packaged host, stopped after capture)
- /observe/routing renders all nine cards with the reference titles; 9 analytics POSTs fired; 0 visible tables.
- With the copied local state: decision volume / taxonomy-role / strategy selection draw real bars, capability and
  model selection draw real ranking bars; cost-avoided, avoided-by-task, difficulty and tool-class cards show the
  honest in-plot empty states because the local state lacks those facts (mechanism is real: the same queries feed
  the :3456 reference).
- Evidence: s632-routing-charts-3484.png, s632-routing-charts-dom.json, s632-routing-charts-evidence.json;
  reference screenshot s629-reference-3456-routing.png.
- S247 4/4 (s632-s247.log), no click changes.
- Full UI suite: 106 files / 960 tests PASS (s632-routing-full-ui.log; the first run had only s48a hit its 20s
  timeout under load, rerun alone green in 8.6s - s632-s48a-rerun.log).
