# S307 R23 async observations / graph hydration gap

Read-only characterization (s307). No product edits, commits, builds, installs, operator ports or processes. Commands: grep/read/git only; temp under E:/rm-tmp if used.

Authority: REASSESSMENT-AND-EXECUTION.md B2/B3 row — scoped process service/SEA/Windows tree; async observations/graph hydration; sync-vs-async SQL ownership and maintenance drain/fence. Maintenance fence is in flight; this doc characterizes the async observations/graph hydration residual only. B6-serialized Lead owns cli.ts/index.ts integration; no implementation here.

Worktree/HEAD: public D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration @ 41661308.

## Shape today

The host imports the SQLite read/write facade from `@role-model-router/sqlite-memory` (sync `DatabaseSync`-backed exports) and the contract/bundle helpers from `@role-model-router/runtime-observability` (pure builders/types). SQLite service construction is `makeSync` (`index.ts:19`), and the observation/graph path runs on that sync facade.

A local file graph store is constructed synchronously at `index.ts:21175-21181` (`createTrackBFileGraphStore`, fixtures/non-track-B only). Bundles are persisted/read synchronously at request time; the post-observation extension pipeline is async and awaited, but it receives an already-hydrated observation.

## Observation callers

| # | Caller | file:line | Call shape | Hydrates / persists | Async today? |
|---|---|---|---|---|---|
| 1 | `persistRuntimeObservationBundle` | index.ts:29799 | sync facade | writes observation bundle + graph via `localGraphStore` | **sync-at-call-time — GAP** |
| 2 | `readRuntimeObservationBundle` | index.ts:21265 | sync facade | reads full observation bundle + graph artifact | **sync-at-call-time — GAP** |
| 3 | `readRuntimeObservationStorageRecord` fallback | index.ts:21272 | sync facade | storage record when graph reader missing | **sync — GAP** |
| 4 | `persistRuntimeTelemetryFailure` | index.ts:21230 | sync facade | failure telemetry + observation + graph store | **sync — GAP** |
| 5 | `readPersistedRuntimeObservation` consumers | index.ts:26353, 26396, 27072, 27170 | wrapper over #2 | observation for decision/provider/telemetry projections | **sync — GAP** |
| 6 | `listRecentRuntimeObservations` | index.ts:26390, 34064 | sync facade | recent observation rows for read routes | **sync — GAP** |
| 7 | `listRuntimeTelemetryRecords` | index.ts:25782, 25974, 34628 | sync facade | telemetry ledger rows | **sync — GAP** |
| 8 | `readRuntimeTelemetrySummary` | index.ts:25937 | sync facade | telemetry aggregate | **sync — GAP** |
| 9 | `readRuntimeTelemetrySourceSummaries` | index.ts:25932 | sync facade | per-source telemetry aggregates | **sync — GAP** |
| 10 | `listRuntimeTelemetryComparisonRows` | index.ts:25950 | sync facade | comparison rows | **sync — GAP** |
| 11 | `readObservedPerformanceSamples` | index.ts:26534 | sync facade | observed performance samples for routing | **sync — GAP** |
| 12 | `readLatestObservedProfile` / by endpoint ids | index.ts:26522, 26530 | sync facade | latest observed profile(s) | **sync — GAP** |
| 13 | `readLiveTaskTelemetryScoresByEndpointIds` | index.ts:26512, 26774, 27277 | sync facade | live task scores for candidate ranking | **sync — GAP** |
| 14 | `readEndpointLatencyBuckets` | index.ts:27391 | sync facade | latency buckets for public readback | **sync — GAP** |
| 15 | `readDifficultyClassificationCache` | index.ts:29886 | sync facade | difficulty cache read during observation build | **sync — GAP** |
| 16 | `readBenchmarkSampleRuns` | index.ts:33527 | sync facade | benchmark sample runs readback | **sync — GAP** |
| 17 | `readObservedThroughputPenaltyState` | index.ts:6373 | sync facade | throughput penalty state | **sync — GAP** |
| 18 | `readAdvisoryMaxDifficultyRecommendation` | index.ts:2318, 26555 | sync facade | advisory max-difficulty recommendation | **sync — GAP** |
| 19 | `initializeSqliteMemory` | index.ts:21088 | sync facade | opens/migrates the observation/telemetry store | **sync-at-startup — GAP for ownership, not per-request hydration** |
| 20 | `createTrackBFileGraphStore` | index.ts:21175-21181 | sync constructor | graph store used by #1/#2/#4 | **sync construction — GAP** |
| 21 | `options.trackBPostObservation` | index.ts:21254 | awaited async hook | post-observation extension processing | **async today** |
| 22 | `readExactRouteCapture` | index.ts:21166-21174 | async Promise | route capture via track-B operations | **async today** |
| 23 | `recordDirectContribution` | index.ts:21161-21165 | Promise | direct contribution write | **async today** |
| 24 | `readRuntimeMaintenancePolicy` | index.ts:4827, 5344, 29474 | sync facade | maintenance policy read | **sync — outside observation hydration; maintenance slice owns it** |

Count: **24 callers enumerated**; **21 sync-at-call-time** (18 observation/graph + startup init #19 + graph-store construction #20 + maintenance-owned #24), **3 async today** (#21-#23). Excluding maintenance (#24), **20** observation/graph callers are sync.

## Gap statement

The observation and graph path is synchronous at the call sites that matter: request finalization (`persistRuntimeObservationBundle`), observation readback (`readRuntimeObservationBundle` and its four consumers), telemetry readback, routing-time observed-profile/score hydration, and graph store construction. These calls run `DatabaseSync` and file-graph IO on the request/fiber that is serving the request. The only genuinely async edges are the track-B post-observation hook, exact route-capture read, and direct contribution write — and they still hand off/receive synchronously hydrated data.

## Named follow-on (B6-serialized Lead integration)

**Async observation hydration via a Backend-owned observation store:** move `persistRuntimeObservationBundle`, `readRuntimeObservationBundle` (+ fallback), `persistRuntimeTelemetryFailure`, the four `readPersistedRuntimeObservation` consumers, telemetry list/summary/comparison reads, and observed-profile/score/benchmark reads onto the extracted Backend owner as Effect operations (fiber/task boundary), with the local graph-store reads/writes owned by the same Backend scope. Dependency: **Backend extraction** per s21d's characterization — B6's gateway. No cli.ts/index.ts integration in this slice.

## Not read

- Bodies of the `@role-model-router/sqlite-memory` exports (sync facade implementation) were not read; the sync shape is asserted from the call sites and `makeSync` construction.
- `createTrackBFileGraphStore` internals / graph artifact reader were not read; sync-at-call-time is asserted from construction and call placement.
- Full cli.ts post-observation pipeline beyond the hook boundary (`:9205-9328`, `:10600-10615`) was skimmed, not exhaustively read.
- `runtime-observability` builder internals were not read; its imports are types + `createRuntimeObservationBundle`.
- Any call sites in files outside `index.ts`/`cli.ts` are not enumerated here.
