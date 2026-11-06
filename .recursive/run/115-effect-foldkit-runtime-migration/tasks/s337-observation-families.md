# S337 — R23 remaining observation families migration (LANDED; graph-store STOP)

Regions (current HEAD): second persistFailureTelemetrySafely site index.ts:28949-28954; telemetry summary read :26043 and source summaries :26038; observed-profile reads :6338 (endpoint-wide) and :6343 (difficulty bucket) in the top-level resolveObservedProfiles helper, plus :26628 (bucket) and :26636 (operational) in readEndpointProfileData; live task telemetry :26618; graph store :21274-21280.

## Migrated families (all through the single composeObservationStorage instance)
| Family | Wiring |
| --- | --- |
| second persistRuntimeTelemetryFailure site | observationStorage.persist(() => persistRuntimeTelemetryFailure(...), async () => readRuntimeObservationBundle(...), requestId) |
| telemetry summary | observationStorage.read("telemetry-summary:" + JSON.stringify(aggregateQuery), () => readRuntimeTelemetrySummary(...)) |
| telemetry source summaries | observationStorage.read("telemetry-sources:" + JSON.stringify(aggregateQuery), () => readRuntimeTelemetrySourceSummaries(...)) |
| observed profiles (endpoint-wide + difficulty) | composeObservationStorage().read("observed-profiles:" + endpointIds.join(",") [+ ":" + bucket], () => readLatestObservedProfilesByEndpointIds(...)) — singleton accessor because the helper is top-level |
| per-endpoint profiles (bucket + operational) | observationStorage.read("profile:" + endpointId + ":" + bucket, () => readLatestObservedProfile(...)); operational uses ":none" |
| live task telemetry scores | observationStorage.read("live-scores:" + endpointId, () => readLiveTaskTelemetryScoresByEndpointIds(...)) |

Read-through semantics preserved: cached hydrated value when present, else the caller's synchronous read (byte-for-byte). Persist writes synchronously then enqueues hydration. Unmigrated families keep the sync facade; no family is half-migrated.

## STOP: graph-store construction (:21274-21280)
STOPPED (S21d). Migrating createTrackBFileGraphStore requires owning the SQLite initialization and the track-b graph file store lifecycle (makeSync at :19/:20969, initializeSqliteMemory, fixtures root) — that is the next Backend factory split, not an observation-family wiring. It stays synchronous; do not force.

## Evidence
- RED s337-red.log: 2 failed (no family wiring).
- GREEN s337-green.log: 6 files / 28 tests passed (s337 3 + s334 9 + s331 2 + s330 4 + s327 3 + s324 7); tsc exit 0.
- Tests: read-family wiring; second persist site count; identity singleton.
- Lint: composition-dag 161 ({"no-unknown-returns":2,"require-safety-comment-for-type-assertion":159}); test clean.
- Hashes: index B58250FB..., composition-dag 6B66B9E2..., test 8998480D....
## S338 repair (final)

1. HALF-MIGRATION fixed: ObservationStorageContract gains readHydrated(key, read) — cache hit returns the hydrated value; a miss returns the caller's synchronous value AND enqueues a hydration job under the same key, so the cache populates. All six read families now call readHydrated with their family key. Disposition per family: persist families (both persistRuntimeTelemetryFailure sites, persistRuntimeObservationBundle) = PERSISTED (sync write + enqueue hydration keyed requestId); read families (telemetry summary, telemetry sources, observed profiles endpoint-wide + difficulty, per-endpoint bucket/operational profiles, live scores) = READ-THROUGH-WITH-HYDRATION (no write exists; the first read returns sync and hydrates the same key); graph-store = STOP (SQLite-init ownership; next Backend factory split). No silent half-migration.
2. LIVE-SCORES KEY identity: exported liveScoresObservationKey(endpointId, windowStartMs, windowEndMs, minimumSampleCount) = "live-scores:<endpoint>:<windowStart>:<windowEnd>:<minSamples>"; index computes telemetryWindowStartMs once and uses the helper for both the read and its hydration identity.
3. Behavioral tests replace source-string checks: readHydrated hydrate->cache-hit (fallback not called); different key falls back; live-scores key changes with endpoint/window/minSamples; persist writes synchronously then hydrates for later reads; identity singleton.

RED s337-red2.log: 3 failed pre-implementation; GREEN s337-green2.log: 6 files / 29 tests; tsc exit 0. Hashes: composition-dag 79313877..., index 0064D1BC..., s337 test 3F043FD4..., s334 test 00A72B14.... Lint: DAG 162 ({"require-safety-comment-for-type-assertion":160,"no-unknown-returns":2}); tests clean/clean.
