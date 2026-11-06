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
- RED s634-requests-red.log is now a GENUINE behavioral RED: clean detached worktree at 9e75fc44 (parent of the
  wiring commit 252c851d), requests-charts.ts + telemetry-chart-suite.ts and ONLY the s634 test copied in, while the
  product wiring stayed pre-feature. Real assertions ran: 2 failed | 2 passed - render expected the nine titles and
  got ["Request volume"], and the mounted route dispatched none of the nine analytics queries (wait timed out).
  The earlier import-resolution transcript (zero assertions) is DISCARDED and replaced by this one.
- GREEN s634-requests-charts.log (4/4) at the wiring commit.
- s415 updated: the ranking metric/target change now emits the ranking query + LoadRequestsCharts (2 commands).
- s628 requests series test uses a requestsCharts fixture and the new "Request volume over time" title.

## Verification vs :3456
- Seeded the isolated review state with scripts/runtime/seed-review-telemetry.mjs (320 rows), launched the packaged
  host and captured /requests: 9 cards with the reference titles, 9 analytics POSTs, real bars/areas/lines/rankings,
  0 visible chart tables, 9 sr-only chart tables.
  Evidence: s634-requests-charts-seeded-3484.png, s634-requests-charts-dom.json, s634-requests-charts-evidence.json;
  reference s629-reference-3456-requests.png.
- FULL SUITE: the shared working tree is UNVERIFIED - other lanes' in-flight/untracked tests (s635/tmp-posture) and
  their uncommitted benchmark routes.ts polluted every shared-tree run, so no honest green claim is made from it.
  Clean detached worktree at 2b97493a (junctioned node_modules so workspace packages resolve through the main
  checkout): tsc 0; vitest 108 files / 976 tests PASS excluding s48a-build; node --test batch PASS (fail 0).
  s48a is excluded ONLY because its client build cannot resolve the workspace package dists through a detached
  worktree's junctioned node_modules (environment artifact); s48a itself passes in the main worktree
  (s634-s48a-standalone.log, 4.7s). Evidence: s634-clean-worktree-full-ui-excluded-build.log.
- S247 was initially red in the clean run because s634's Week-range click was unbudgeted; fixed by adding
  "s634-observe-requests-charts.test.ts": 1 with rationale, after which S247 is 4/4 (s634-s247.log).
- S247: green (s634-s247.log). The one synthetic click in the Requests chart test is the Week range switch, budgeted
  with the rationale "Week-range re-query assertion for the nine Requests analytics charts".

