# Phase 1 AS-IS — sidecar budget, traffic-class path, Effect wiring (T1.2f/g/h)

Receipt token: r104-as-sidecar-traffic-effect-9R4C

Repos: public `D:\DEV\role-model\.worktrees\104-replay-eligibility-and-evidence-fidelity` @ `84d5996c`;
private `D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity` @ `5df90b6d`.
All paths below are relative to the public worktree unless marked **private**.

## T1.2f Sidecar budget path

### f1. Where the degradation line is emitted, and the budget constant

Emitter (the only one): `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts:11844`

```ts
11835:  } catch (error) {
11836:    const cause = (error as { cause?: { code?: unknown } })?.cause;
11837:    contributionFailure = {
11838:      code: ... cause.code ... : String(error.name ?? "contribution_failed").slice(0, 64),
11842:      message: String((error as { message?: unknown })?.message ?? error).slice(0, 200),
11843:    };
11844:    console.error(
11845:      `[run98] contribution upload degraded:${requestId} ${contributionFailure.code} ${contributionFailure.message}`,
11846:    );
```

It wraps `contribution = await recordContribution({...})` (`:11822-11834`) inside
`runTrackBPostObservationWithContribution` (`:11780`). The production wiring is
`cli.ts:7542-7547`:

```ts
7542:  ? runTrackBPostObservationWithContribution(
7546:      (aggregate) => operations.recordContributionAggregate(aggregate),
```

The budget constant is `track-b-operations.ts:877`:

```ts
877: const DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS = 5_000;
```

applied at `track-b-operations.ts:1484-1490`:

```ts
1484:  // Run 98 S1 follow-up: the contribution aggregate is another sidecar call in the
1485:  // request path — bound it far below the 180 s operations default so a starved
1486:  // boundary cannot hold a request open for minutes.
1487:  const boundedContributionAggregateTimeoutMs = Math.min(
1488:    operationsTimeoutMs,
1489:    DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS,
1490:  );
```

and consumed by the upload itself at `track-b-operations.ts:2745-2753`:

```ts
2745:  async recordContributionAggregate(input: Record<string, unknown>): Promise<unknown> {
2746:    const remote = await requestPrivate(
2747:      "contribution/aggregate",
2748:      { method: "POST", body: sanitizeOperatorBody(input) },
2752:      boundedContributionAggregateTimeoutMs,
2753:    );
```

`requestPrivate` → `privateRetentionRequest` (`:1491-1499`), whose fetch carries the deadline and
whose TimeoutError becomes the observed error:

```ts
 997:      response = await fetch(url, { ...requestInit, signal: AbortSignal.timeout(timeoutMs) });
1004:      if (error instanceof Error && error.name === "TimeoutError") {
1005:        throw new TrackBPrivateOperationError(
1006:          504,
1007:          `private Track B operation timed out after ${timeoutMs}ms`,
1008:        );
```

**Scope: per-invoke.** It is one `AbortSignal.timeout` per HTTP call to the private operations
boundary (`POST /contribution/aggregate`) — not a per-tick and not a per-outbox-drain budget. The
retry loop at `:995-1021` retries only *connection-level* failures (`:1011-1016`) and deliberately
does not retry a timeout (`:990-991`: "a timeout is not retried because the work may still be running
on the far side"), so each request's contribution upload gets exactly one 5 s window.

Note the surrounding default: `DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS = 600_000`
(`track-b-operations.ts:901`, resolved by `resolveTrackBOperationsTimeoutMs` `:903-912`,
env `ROLE_MODEL_TRACK_B_OPERATIONS_TIMEOUT_MS`). Because of the `Math.min`, the effective
contribution-upload bound is 5 s unless an operator lowers the operations bound below 5 s.

Implication for the requirement: the 5 s is a *host-side cap on the sidecar invoke*, not a property
of the cloud upload; a sidecar that needs longer than 5 s to write one aggregate degrades with no
backpressure signal beyond this log line.

### f2. Private-sidecar per-invoke/per-tick budget, and the bounded sweep

**Per-invoke budget (private).** `shared/runtime/extension-host-tuning.mjs:11-32`:

```js
11:  * All three now take one bounded, operator-tunable profile. The values are per-invoke budgets, not
12:  * concurrency limits, ...
15: export function extensionHostTuning(env = process.env) {
21:    timeoutMs: bounded(env?.ROLE_MODEL_EXTENSION_INVOKE_TIMEOUT_MS, 60_000, 100, 600_000),
22:    startupTimeoutMs: bounded(env?.ROLE_MODEL_EXTENSION_STARTUP_TIMEOUT_MS, 30_000, 100, 600_000),
23:    maxRestarts: bounded(env?.ROLE_MODEL_EXTENSION_MAX_RESTARTS, 3, 0, 20),
```

Consumers (private): `scripts/track-b/runtime-shadow-pipeline.mjs:449`, `scripts/track-b/runtime-operations-server.mjs:667`
and `:936` (each spreads `...extensionHostTuning()`), i.e. the sidecar's own evaluation/worker invokes
default to a 60 s per-invoke budget — an order of magnitude above the host's 5 s contribution cap.

**Bounded sweep (private, finalized-store work).** `extensions/evaluation-core/index.mjs:3238-3331`
`retroFinalizeComparisons({ limit = 8 })`:

```js
3239:    const boundedLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 32) : 8;
3244:        "SELECT DISTINCT holdout_id FROM evaluation_jobs WHERE holdout_id IS NOT NULL AND status IN ('failed','completed','cancelled') ORDER BY rowid DESC LIMIT 500",
3265:            "SELECT DISTINCT t.job_id FROM evaluation_trials t JOIN evaluation_jobs j ON j.job_id = t.job_id WHERE j.holdout_id = ? ORDER BY t.job_id LIMIT 8",
3330:    return { candidates: candidates.length, finalized, declined, retroCompleted };
```

Three bounds (32 per call, 500 holdouts scanned, 8 jobs per holdout), and each success path writes a
`status: "finalized"` comparison group (`:3759`, `:3782`) before `#completeDurableJob`
(`:3269-3272`, `:3313-3319`, reason `retro_finalized_comparison`).

Implication: the private side has a per-invoke budget and a bounded, resumable sweep; the host's 5 s
contribution cap is the tighter constraint on the T1.2f symptom.

### f3. Classification of the degradation lines

Source: `E:\tmp\run103-evidence\stage-3457.err.log` (live-appending stage log; LastWriteTime
`2026-10-01 15:32:42 +08:00` when measured at `15:33`).

Snapshot: **337** `contribution upload degraded` lines (760 lines total in the file). This does not
reproduce the brief's "120" (see `## Unverified` #1).

Every one of the 337 carries the same code and message:

| field | value | count |
| --- | --- | --- |
| code | `TrackBPrivateOperationError` | 337 |
| message | `private Track B operation timed out after 5000ms` | 337 |

So the degraded **operation** is a single one — the `POST /contribution/aggregate` upload (there is
no second failing operation class in this log). Classified by the id family carried in the line:

| id family | meaning | count |
| --- | --- | --- |
| `req-*` | live routed request | 264 |
| `replay-req-*` | replayed request (`replay-req-<requestId>-<arm>`) | 43 |
| `bench-*` | benchmark-run turn (`bench-…-turnN-<uuid>`) | 24 |
| `replay-judge-*` | replay judge | 6 |

Three representative raw lines:

```
L24:  [run98] contribution upload degraded:req-e6174ed0-4058-49e4-9929-99a7d6839612 TrackBPrivateOperationError private Track B operation timed out after 5000ms
L27:  [run98] contribution upload degraded:replay-req-e6174ed0-4058-49e4-9929-99a7d6839612-2fdd80564bf9b808 TrackBPrivateOperationError private Track B operation timed out after 5000ms
L136: [run98] contribution upload degraded:bench-x01-max-signal-openai.personal.openai-codex-subscription.global.gpt-5.6-sol-medium-turn1-f0f0243b-3187-4240-9720-777d6d1a9a1a TrackBPrivateOperationError private Track B operation timed out after 5000ms
```

Implication: the degradation is not replay-specific — live traffic dominates (264/337), so a fix
scoped to the replay lane alone would leave the majority of the observed failures in place.

## T1.2g Traffic-class path

### g4. Columns, backfill migration, and today's vocabulary

`runtime_observations.request_class`

- added as part of the observation metadata column set (`packages/sqlite-memory/src/index.ts:1460-1470`):

```ts
1464:    ["request_class", "TEXT"],
1467:      database.exec(`ALTER TABLE runtime_observations ADD COLUMN ${colName} ${colType}`);
```

`runtime_telemetry_records.request_class`

- table column: `packages/sqlite-memory/src/index.ts:422` (`request_class TEXT,`);
- additive metadata set for an existing table: `:1531` (`"request_class TEXT"`).

Backfill migration A (`runtime_observations`), `packages/sqlite-memory/src/index.ts:1471-1490`:

```sql
1479:          request_class = COALESCE(request_class, CASE
1480:            WHEN json_extract(observation_json, '$.observedPerformance.sample.source_type') = 'benchmark' THEN 'benchmark'
1481:            WHEN json_extract(observation_json, '$.observedPerformance.sample.source_type') = 'live_request' THEN 'live_request'
1482:            ELSE NULL END),
```

Backfill migration B (`runtime_telemetry_records`), `:1630-1644`:

```sql
1641:          request_class = COALESCE(
1642:            request_class,
1643:            (SELECT request_class FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
1644:          ),
```

Vocabulary today — exactly three values, no others:

```ts
1004:  readonly requestClass: "benchmark" | "live_request" | "unknown" | null;   // sqlite-memory
4891:  readonly requestClass?: "benchmark" | "live_request" | "unknown";          // insert input
2843:    requestClass: row.request_class === "benchmark" || ... === "live_request" || ... === "unknown" ? row.request_class : null;
```

There is no `health`, `synthetic` or `replay` value in the stored vocabulary even though the
execution path knows those traffic classes (see g5).

### g5. Hardcoded class stamps, the benchmark sample, and where the benchmark stamp stops

Hardcoded `live_request` stamps (public bridge, complete list):

```ts
apps/runtime-host-bridge/src/index.ts:20140:      requestClass: "live_request",   // persistRuntimeTelemetryFailure
apps/runtime-host-bridge/src/index.ts:27574:        requestClass: "live_request", // successful-request telemetry write
```

Absent-class defaults (the joins/readbacks, not stamps):

```ts
apps/runtime-host-bridge/src/index.ts:24645:          requestClass: record.requestClass ?? "unknown",
apps/runtime-host-bridge/src/index.ts:24736:        requestClass: record.requestClass ?? "unknown",
packages/sqlite-memory/src/index.ts:3377:    requestClass: input.requestClass ?? "unknown",   // insert default
```

Benchmark runner. `apps/runtime-host-bridge/src/benchmark-runner.ts:91,100` declares and sets the
execution traffic class for its dispatch:

```ts
91:  readonly executionTrafficClass?: "live" | "benchmark" | "health" | "synthetic";
100:    executionTrafficClass: "benchmark",
```

and its sample is written with the benchmark stamp at `benchmark-runner.ts:1486`
(`source_type: "benchmark"`), persisted through
`persistObservedBenchmarkSample` (`packages/sqlite-memory/src/index.ts:4430-4445`), which forces
`source_type: "benchmark" as const` (`:4433`) into `observed_performance_samples`.

The observation row derives its class from that JSON (`packages/sqlite-memory/src/index.ts:4726-4730`):

```ts
4726:            observation.observedPerformance?.sample?.source_type === "benchmark"
4727:              ? "benchmark"
4728:              : observation.observedPerformance?.sample?.source_type === "live_request"
4729:                ? "live_request"
4730:                : null,
```

**Where the benchmark stamp stops.** The `runtime_telemetry_records` row is not derived from the
observation: it is written by the live request path with the literal `"live_request"`
(`index.ts:27574` / `:20140`), and the only other value the writer can produce is the
`?? "unknown"` default. Nothing in the telemetry write path reads `executionTrafficClass`
(the only `trafficClass` readers are the execution circuit breaker —
`execution-circuit-breaker.ts:398-407`, `:622` — and the routing call at `index.ts:27646`,
`:27650`, `:27813`). The observation's `source_type: "benchmark"` therefore survives into
`runtime_observations` and `observed_performance_samples`, but the same request's **telemetry**
row reads `live_request`.

Implication: any class filter written as `request_class = 'live_request'` (g6) is *not* benchmark-free
for benchmark traffic that goes through the bridge's normal execution path; the only reliable
benchmark marker today is the observation/sample `source_type`.

### g6. Queries that already filter, and the class-less summary path

Already filtered (`AND request_class = 'live_request'`):

- `packages/sqlite-memory/src/index.ts:5404-5410` — taxonomy success profile
  (`FROM runtime_telemetry_records WHERE endpoint_id IN (…) AND request_class = 'live_request' AND taxonomy_task_type IS NOT NULL …`);
- `packages/sqlite-memory/src/index.ts:5501-5509` — observed latency/tokens sample
  (`… AND request_class = 'live_request' AND error_class IS NULL AND status_code >= 200 …`).

No class predicate:

```ts
5945: function telemetryWindowWhere(
5948: ): { readonly where: string; readonly parameters: readonly (number | string)[] } {
5949:   const window = telemetryWindow(input);
5950:   const clauses = ["created_at_ms < ?"];
5956:   if (sourceType) { clauses.push("source_type = ?"); ... }
5960:   return { where: clauses.join(" AND "), parameters };
5961: }
5963: function readRuntimeTelemetryAggregateFromDatabase(   // COUNT/SUM over tokens, cost, latency
5987:        FROM runtime_telemetry_records
5988:        WHERE ${where}`,
6070: export function readRuntimeTelemetrySummary(          // :6076 -> aggregate, :6085 same where
```

The only filter dimension is `source_type` (`"local" | "remote"`, `:5956-5959`) — never
`request_class`. So counts, success/failure, tokens, costs, cache counts and latency sums at
`:5971-5986` all mix live, benchmark and any other class present in the window.

### g7. Operator-facing aggregates that mix classes

Verified individually:

- **Request counts / token and cost totals / cache counts / latency totals** — the summary panel
  renders `summary.requestCount` and `summary.sourceBreakdown` from the class-less query above:
  `apps/runtime-ui/app/lib/view-models.ts:992-998`
  (`value: String(summary.requestCount)`, `detail: …local.requestCount…remote…`); the type is
  `ReturnType<typeof readRuntimeTelemetrySummary>` (`apps/runtime-host-bridge/src/index.ts:3101-3105`).
- **Latest-request cache-hit rate** — `apps/runtime-ui/app/lib/sidebar-footer.ts:164-179`
  (`cacheHitRateFromRequest(request)`), computed from whichever request row is newest, with no class
  predicate.
- **Interaction list (class-aware)** — `apps/runtime-ui/app/lib/view-models.ts:1243`:
  `const liveRows = rows.filter((row) => row.requestClass !== "benchmark");` with a fallback to all
  rows when no live row exists (`:1244`). This is the one operator surface that already prefers live
  traffic.

Not individually enumerated in the box (see `## Unverified` #4): the per-model ranking and
percentile surfaces, and every aggregate card that reads `BridgeTelemetrySummary`.

### g8. Does `filterTelemetryRequestRecords` support a class filter?

No. `apps/runtime-host-bridge/src/index.ts:24390-24420` (filter list, complete as read):

```ts
24394:    if (!filters) { return records; }
24397:    return records.filter((record) => {
24398:      if (filters.sourceTypes && !filters.sourceTypes.includes(record.sourceType)) return false;
24401:      if (filters.endpointIds && !filters.endpointIds.includes(record.endpointId)) return false;
24404:      if (filters.modelIds && !(record.modelId && filters.modelIds.includes(record.modelId))) return false;
24407:      if (filters.reasoningEfforts && !matchesTelemetryDimensionFilter(record, "reasoningEffort", …)) return false;
24413:      if (filters.effortSources && !matchesTelemetryDimensionFilter(record, "effortSource", …)) return false;
24420:      if (filters.providerIds && …
```

The dimensions are `sourceTypes`, `endpointIds`, `modelIds`, `reasoningEfforts`, `effortSources`,
`providerIds`, … — `requestClass` is a *carried field* (`:24645`, `:24736`) but is not a filter
dimension. Implication: a UI-level "hide benchmarks" toggle has no filter to call; the class must be
added to `BridgeTelemetryAnalyticsFilters` and to this function.

## T1.2h Effect wiring and primitives

### h9. Landed Effect surface

Wrapper packages (workspace entry points that re-export the vendored trees):

| path | name | note |
| --- | --- | --- |
| `role-model-router/packages/effect` | `effect` | "Workspace entry point for the vendored Effect v4 tree (vendor/effect, effect@4.0.0-rc.117). The sources are re-exported in place so a single copy of the runtime is bundled." (`package.json:6`) |
| `role-model-router/packages/effect-mq` | `effect-mq` | "Workspace entry point for the vendored effect-mq tree (vendor/effect-mq, v0.7.0)…" (`package.json:6`); `peerDependencies: { effect: workspace:* }` (`:23`) |
| `role-model-router/packages/sql-sqlite-node` | `@effect/sql-sqlite-node` | `peerDependencies: { effect: workspace:* }` |

Bridge files importing `effect` (all under `role-model-router/apps/runtime-host-bridge/src/`):

| file:line | import |
| --- | --- |
| `queue-runtime/index.ts:10` | `{ type Duration, Effect, Fiber, Layer, ManagedRuntime }` |
| `queue-runtime/evaluation.ts:10-11` | `{ Duration, Effect, Schedule, Schema }` + `PersistedQueue` |
| `queue-runtime/learner.ts:21-22` | `{ Duration, Effect, Schedule, Schema }` + `PersistedQueue` |
| `queue-runtime/queues.ts:14-15` | `{ Duration, Effect, Schedule, Schema }` + `PersistedQueue` |
| `queue-runtime/store.ts:19-20` | `{ Duration, Layer }` + `PersistedQueue` |
| `queue-runtime/workers.ts:14` | `{ Cause, Duration, Effect, Fiber }` |
| `scoring-strategy.ts:13` | `{ Data, Result, Schema }` |
| `track-b-auto-replay-runtime.ts:1` | `{ Effect, Schedule }` |
| `unified-runtime-config.ts:3` | `{ Result, Schema }` |

`ManagedRuntime` usage — one runtime per queue plane, built once and reused:

```ts
queue-runtime/index.ts:156:  const storeRuntime = ManagedRuntime.make(layer);
queue-runtime/index.ts:276:  const storeRuntime = ManagedRuntime.make(layer);   // :274-276 one per plane
queue-runtime/index.ts:389:  const storeRuntime = ManagedRuntime.make(layer);   // :388-389 one per learner plane
```
with the rationale comments at `:150-154` and `:274` ("Run 101 addendum 07 (Effect guidance D1)").

`PersistedQueue` planes:

```ts
queue-runtime/queues.ts:54:    return PersistedQueue.make({ … });
queue-runtime/learner.ts:60:  return PersistedQueue.make({ … });
queue-runtime/learner.ts:69:  return PersistedQueue.make({ … });
queue-runtime/evaluation.ts:73:  return PersistedQueue.make({ … });
queue-runtime/store.ts:114:  const store = PersistedQueue.layerStoreSql({ … });
queue-runtime/store.ts:143:  const store = PersistedQueue.layerStoreSql({ … });
queue-runtime/store.ts:211:  return PersistedQueue.layerCleanup({ … });
```

**No file imports `effect-mq` — verified.** A repo-wide search for the literal `effect-mq`
(excluding `node_modules`, `pnpm-lock.yaml`, `*.jsonl`) matches only: `AGENTS.md:28`,
`vendor/effect-mq/**` (README/PROVENANCE/VENDORED/ROADMAP/source),
`docs/architecture/15-effect-mq-queue-rebuild.md`, `docs/architecture/16-agent-strategy-and-scoring-strategy.md:243,530`,
and `role-model-router/packages/effect-mq/package.json`. No bridge source file imports it, even though
`apps/runtime-host-bridge/package.json` declares `effect-mq: workspace:*` as a dependency.

### h10. SEA packaging gate and the dependency-closure build requirement

Root scripts (`package.json:30-31`):

```json
30: "runtime:package-sea": "corepack pnpm --filter @role-model-router/runtime-ui build && corepack pnpm --filter @role-model-router/runtime-host-bridge... build && corepack pnpm --filter @role-model-router/runtime-host-bridge run package-sea",
31: "runtime:validate-packaging": "corepack pnpm run runtime:package-sea && corepack pnpm --filter @role-model-router/runtime-host-bridge run validate-packaging",
```

Bridge scripts (`apps/runtime-host-bridge/package.json`):

```json
build:              "tsc -p tsconfig.json"
package-sea:        "tsx src/package-sea.ts"
validate-packaging: "corepack pnpm build && tsx src/validate-packaging.ts"
```

The dependency-closure requirement is visible in the workspace-level scripts: the root gate builds
`@role-model-router/runtime-host-bridge...` (the `...` selects the package *and its workspace
dependencies*), and every bridge test script prefixes its own build with
`corepack pnpm --filter effect build` (`test`, `test:critical`, `test:router`). The bridge's own
`build` is a bare `tsc`, which resolves `effect` / `effect-mq` / `@effect/sql-sqlite-node` to the
workspace entry packages whose sources are re-exported from `vendor/...` — so a bare
`pnpm --filter @role-model-router/runtime-host-bridge build` in a clean checkout resolves the
workspace packages but not their built `dist` artefacts. The exact failure text was **not
reproduced** in this box (see `## Unverified` #2).

### h11. Who declares `effect` / `effect-mq`

| package | effect | effect-mq | sqlite-node |
| --- | --- | --- | --- |
| `@role-model-router/runtime-host-bridge` | `dependencies: effect: workspace:*` | `dependencies: effect-mq: workspace:*` | `dependencies: @effect/sql-sqlite-node: workspace:*` |
| `@role-model-router/core` | none | none | none |
| `@role-model-router/sqlite-memory` | none | none | none |
| `@role-model-router/runtime-observability` | none | none | none |
| `effect` (workspace entry) | no deps | — | — |
| `effect-mq` (workspace entry) | `peerDependencies: effect: workspace:*` | — | — |
| `@effect/sql-sqlite-node` (workspace entry) | `peerDependencies: effect: workspace:*` | — | — |

So the Effect surface is currently confined to `runtime-host-bridge` plus the three vendored entry
packages; `core`, `sqlite-memory` and `runtime-observability` are still Effect-free.

## Unverified

1. **The brief's "120 degradation lines" does not reproduce.** I measured 337 (then 335, then 337
   again as the live stage log grew); the stage process is still appending to
   `stage-3457.err.log`, and no filter I tried (all lines / unique request ids / by-prefix) yields
   120. The 120 may refer to an earlier window or a different log; the file is not frozen.
2. **The exact clean-checkout failure of a bare bridge build** (`pnpm --filter
   @role-model-router/runtime-host-bridge build`) — inferred from the script shapes above, not run.
3. **Runtime consumer of `executionTrafficClass` for telemetry** — I traced the literal stamps and
   the two circuit-breaker/routing readers; I did not exhaustively follow the value through
   `routeRuntimeRequest` to prove no later re-stamp exists.
4. **T1.2g check 7 is partially enumerated**: the summary path, the sidebar latest-request rate and
   `view-models.ts:1243` are verified; the per-model ranking and percentile surfaces were not read
   line by line inside the box.
5. **The private sidecar's own HTTP-side budget** for the operations boundary (the service that
   serves `/contribution/aggregate`) — only the host-side 5 s cap and the private *extension-host*
   per-invoke tuning were verified; the operations server's request budget was not read.

Receipt token: r104-as-sidecar-traffic-effect-9R4C
