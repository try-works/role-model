# S634 - Requests analytics chart suite (nine charts) ported from :3456

## Change
- New src/features/observe/requests-charts.ts: the nine reference definitions from
  buildObserveRequestsChartDefinitions (Request volume over time, Taxonomy demand by group, Task success vs failure,
  Token usage over time, Cache efficiency trend, Effective cost over time, Latency trend, Capability leaders,
  Ranked comparison), their exact metrics/breakdowns/ranking (capability leaders = taxonomyCapabilityId; ranked
  comparison uses the page ranking metric/target), empty copy and grid classes.
- New shared src/features/observe/telemetry-chart-suite.ts (analytics -> series mapping + card grid) now backs BOTH
  Requests and Observe routing chart suites; routing-charts.ts was refactored onto it with no behaviour change.
- Real binding: a batch LoadRequestsCharts command POSTs /api/role-model/telemetry/query for all nine on Requests
  route entry, navigation, range change, filter change (source/status/breakdown) and ranking metric/target change.
  Model.requestsCharts stores the responses with last-write-token semantics. Page state mapping:
  Breakdown label -> endpointId/modelId/providerId; Source -> sourceTypes; Status family -> statusFamilies;
  Ranking metric/target -> Ranked comparison metrics/ranking; range -> windowForRange (Day hour else day).
- telemetryRequestsRoute renders requestsChartCards (nine cards) instead of the old single volume card; chart tables
  remain sr-only (no visible tables in any chart card). Requests ledger/ranking sections are untouched.

## Tests (s634)
- Nine definitions + full query payloads with defaults.
- Page-state mapping: breakdown/source/status/ranking -> every query; range Week -> windowMs 604800000 and day
  granularity; Ranked comparison metrics/ranking reflect the selected metric+target.
- Render: nine cards, real bars/lines/ranking series, in-plot empty state, zero visible chart tables, nine sr-only.
- Mounted /requests: nine POSTs, then source change re-queries (filters sourceTypes), Week range re-queries
  (windowMs 604800000), ranking metric change re-queries Ranked comparison with metrics ["totalTokens"].
- RED s634-requests-red.log (clean worktree at d953a8c7, module absent) -> GREEN s634-requests-charts.log (4/4).
- s415 updated: the ranking metric/target change now emits the ranking query + LoadRequestsCharts (2 commands).
- s628 requests series test uses a requestsCharts fixture and the new "Request volume over time" title.

## Verification vs :3456
- Seeded the isolated review state with scripts/runtime/seed-review-telemetry.mjs (320 rows), launched the packaged
  host and captured /requests: 9 cards with the reference titles, 9 analytics POSTs, real bars/areas/lines/rankings,
  0 visible chart tables, 9 sr-only chart tables.
  Evidence: s634-requests-charts-seeded-3484.png, s634-requests-charts-dom.json, s634-requests-charts-evidence.json;
  reference s629-reference-3456-requests.png.
- Full-suite status at commit time: our changes are tsc 0 and all targeted suites green, but the shared tree is
  concurrently dirty with OTHER lanes' in-flight work, which the full suite picks up:
  * s634-full-ui.log run: 109/110 files, 974/975 tests passed; the only failure was the untracked
    test/s635-router-posture-hydration.test.ts from another lane (not staged by us).
  * a later run excluding s635 still failed on untracked test/tmp-posture-untouched.test.ts and
    s622-benchmark-parity (benchmark lane's uncommitted src/features/models/routes.ts).
  The last fully green authoritative full-suite run before this change was 107 files / 967 tests at d953a8c7.
- S247: green (s634-s247.log); no new synthetic clicks in the Requests chart suite (selects/range use
  input/change events, the Week range uses the already-budgeted click from task-109).

