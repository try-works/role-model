# Run 77 Requirements Investigation

Date: `2026-07-18`
Environment: Windows, Node.js `v24.11.0`, pnpm `10.6.5`
Repository: `D:/DEV/role-model`
Packaged runtime: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
Live runtime probed read-only at: `http://127.0.0.1:3456`

## Purpose

Determine whether `normalized-catalog.json`, runtime catalog processing, API payloads, or UI rendering explain the reported providers-page freeze before prescribing storage or migration work.

No product code or runtime state was changed. A separate packaged runtime was started against a disposable temporary state root for one isolated comparison and was stopped afterward. Its temporary state directory was removed.

Chrome DevTools MCP was unavailable, so this investigation does not claim native DevTools trace, LCP, INP, CLS, or Speed Index evidence. Browser measurements used the repository's installed Playwright/Edge stack plus `PerformanceObserver` long-task capture.

## Catalog Artifact Baseline

- `role-model-router/packages/catalog/data/normalized-catalog.json`: `5,434,995` bytes
- normalized providers: `146`
- normalized models: `5,270`
- minifying the current artifact without field removal would produce `3,777,652` bytes, a `30.49%` reduction
- simulating the proposed redundant/default-field omissions while retaining pretty JSON produced `2,709,413` bytes, a `50.15%` reduction
- isolated 50-run `JSON.parse` profile:
  - current artifact: median `32.17 ms`, p95 `36.67 ms`
  - simulated compact artifact: median `16.67 ms`, p95 `18.87 ms`
- a separate 30-run read/parse/map profile measured map construction at median `3.16 ms`

Conclusion: compact serialization is worthwhile for repository/package size and saves roughly `15 ms` of isolated parse time on this machine, but the measured parse and map costs do not explain the visible providers-page delay by themselves.

## Runtime Backend Baseline

Five fresh temporary-state `createRuntimeBridgeBackend()` runs produced:

- backend initialization: `859.1-1,140.1 ms`
- `listProviders()`: `198.9-228.0 ms`
- serialized providers payload: `657,386` bytes
- provider records: `234`
- `listModels()`: `0.2-1.2 ms`
- runtime model records in the deterministic QA configuration: `1`

The live packaged runtime produced comparable `GET /api/role-model/providers` results:

- `195.7-207.8 ms` across three direct requests
- `657,151` bytes per response
- `GET /api/role-model/models`: `1.6-4.0 ms`, `1,257` bytes
- runtime summary: about `25-26 ms`

The providers handler regenerates effective model lists on every request. Current code repeatedly filters the `5,270` normalized models by provider and repeatedly scans LiteLLM model prices for providers not supplied by the normalized catalog. The slow providers handler also delays otherwise-small parallel bootstrap responses on the single Node.js event loop.

Conclusion: request-time effective-provider catalog assembly, not `/api/role-model/models`, is the dominant measured backend catalog cost.

## Provider Payload Structure

The live providers response contained:

- providers: `234`
- provider-level model-ID references: `7,150`
- variant-level model-ID references: `7,171`
- total model-ID references: `14,321`
- unique model IDs: `7,057`
- largest provider list: `617` models
- response bytes: `657,151`
- simulated response without provider-level model IDs: `400,838` bytes
- simulated response without provider- or variant-level model IDs: `144,003` bytes
- gzip size of the current response body: `60,283` bytes
- Brotli size of the current response body: `45,282` bytes

The current runtime response did not advertise content encoding during the direct probe. The providers page therefore receives the full uncompressed JSON body over its local HTTP connection.

Conclusion: model membership is substantially duplicated in the initial provider response, and the effective runtime model universe is larger than the normalized catalog alone because it also includes LiteLLM/config/preset-derived entries.

## Browser Reproduction

Five fresh headless Edge contexts navigated to `/app/remote/providers` on the live packaged runtime.

- DOMContentLoaded: approximately `54-76 ms`
- model selector visible/usable: approximately `473-994 ms`
- no long task was observed during initial page loading in these five samples
- each navigation issued the complete primary bootstrap twice
- each bootstrap wave included runtime summary, providers, accounts, device authorization, endpoints, roles, models, and role policy
- each providers response took approximately `201-257 ms` in browser request timing and transferred `657,151` bytes
- the initial route effect depends on `applyLoadedProvidersData`; that callback depends on `providerId`; the first successful load changes `providerId`, changes the callback identity, and reruns the effect

The current E2E coverage proves that the route renders and that deferred latest-request IDs do not block it, but it does not assert that the primary providers bootstrap occurs exactly once.

Conclusion: the duplicate bootstrap is reproducible and has a concrete dependency-chain explanation in `providers.tsx`.

## Large Model Selector Reproduction

After selecting NanoGPT, opening the current custom model selector rendered `618` options.

- click-to-open: `102 ms`
- captured browser long task: `57 ms`

Conclusion: eagerly materializing the largest provider's complete option list produces measurable main-thread jank. Bounded search/autocomplete is justified independently of backend startup.

## Models Mutation-Path Investigation

The user clarified that the actual minute-scale freeze occurs on `/app/models` after clicking `Save bindings` or `Eject from pool`, not while initially loading `/app/remote/providers`.

Both mutation handlers share the same post-mutation critical path in `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`:

1. await the account upsert or configured-model eject mutation;
2. await `loadConfiguredModelsInitialData()`, which refetches accounts, endpoints, models, controller, role policy, and router candidates;
3. call `applyConfiguredModelsInitialData()`, which marks request evidence as loading;
4. await `refreshObservedRequestEvidence()`;
5. `refreshObservedRequestEvidence()` calls `fetchRuntimeRequests()`;
6. `fetchRuntimeRequests()` calls `GET /api/role-model/requests`;
7. only after that request finishes does the handler clear `Saving…` or `Removing…`.

The backend request-list implementation calls `listRecentRuntimeObservations()`. Its SQLite query is:

```sql
SELECT request_id, routing_decision_id, endpoint_id, created_at_ms, observation_json
FROM runtime_observations
ORDER BY created_at_ms DESC, request_id DESC
LIMIT ?
```

It then parses every selected `observation_json` solely to recover `clientRequestId`.

The live standalone database measured during this investigation was `6,897,594,368` bytes and contained `5,762` `runtime_observations` rows. The table already has a dedicated `client_request_id` column, but the list query does not use it.

The only live indexes on `runtime_observations` were:

- the `request_id` primary-key index;
- `idx_obs_retain_until`.

`EXPLAIN QUERY PLAN` for the current request-list query reported:

- `SCAN runtime_observations`;
- `USE TEMP B-TREE FOR ORDER BY`.

A single read-only `GET /api/role-model/requests` probe reproduced a server-wide stall. Two subsequent `/healthz` probes, with `10`-second and `5`-second timeouts, both failed while the synchronous SQLite work remained active. The runtime later recovered without intervention. No mutation was performed.

A projection-only read using `client_request_id` instead of `observation_json`, while still lacking the ordering index, returned `20` rows in `293.1-304.7 ms` across three direct read-only SQLite samples. This demonstrates that avoiding the large JSON blob removes the minute-scale behavior even before the missing ordering index is added.

The post-mutation core reload also has a smaller secondary cost. Live read-only endpoint timings included:

- accounts: `190.6 ms`, `3,797` bytes;
- endpoints: `9.8 ms`, `2,689` bytes;
- models: `3.1 ms`, `1,257` bytes;
- controller: `6.4 ms`, `179` bytes;
- role policy: `4.3 ms`, `119,243` bytes;
- router candidates: `810.5 ms`, `1,966,867` bytes.

Router candidates and rich request evidence are advisory for completion of the account-role or eject mutation. Awaiting them keeps the button and page in a pending state after canonical mutation truth is already available.

## Corrected Root-Cause Direction For Requirements

The primary freeze requirements must target the Models mutation path:

1. remove rich request history and advisory router candidates from the mutation completion critical path;
2. make recent-request listing projection-only by reading `client_request_id` directly;
3. add an index supporting `ORDER BY created_at_ms DESC, request_id DESC LIMIT ?`;
4. prove request-history reads cannot block runtime health or unrelated APIs;
5. preserve Run 76 account/config authority, eject conflict, rollback, and reconciliation semantics while making the UI converge from mutation receipts or targeted reads.

The earlier providers-page findings remain valid but are not the user-reported minute-scale freeze. They should be deferred to a separate performance run unless Phase 1 shows a direct dependency on the Models mutation fix.

Compact `normalized-catalog.json` serialization remains useful as a separate package/startup optimization. The evidence still does not justify catalog tables or a mandatory SQLite catalog migration.

## Benchmark Route Navigation Investigation

The user additionally reported that navigating from `/app/models` to `/app/models/benchmark` takes roughly one minute.

The benchmark route starts seven reads in one blocking `Promise.all`: benchmark suite, router candidates, latest summary, summaries by mode, run history, preferences, and runtime summary. When the runtime was idle, direct read-only timings were:

- benchmark suite: `27.8 ms`, `77,271` bytes;
- router candidates: `829.7 ms`, `1,994,035` bytes;
- latest benchmark summary: `75.9 ms`, `20,079` bytes;
- summaries by mode: `348.8 ms`, `4,384` bytes;
- run history: `8.4 ms`, `708` bytes;
- preferences: `3.0 ms`, `79` bytes;
- runtime summary: `2.9 ms`, `4,384` bytes.

These idle timings do not explain a minute-long transition. The cross-route reproduction did:

1. start the same background `GET /api/role-model/requests` issued after the Models inventory becomes visible;
2. navigate conceptually by requesting benchmark startup data while the request-history read remained active;
3. the request-history call received no bytes and timed out after `90.009` seconds;
4. a concurrent `/healthz` call also received no bytes and timed out after `90.002` seconds;
5. after the server recovered, benchmark suite returned in `4.173` seconds, router candidates in `856 ms`, and benchmark summary in `14.5 ms`.

`startDeferredConfiguredModelsBootstrap()` only sets a local `disposed` flag on unmount. It does not pass an `AbortSignal` to `fetchRuntimeRequests()`. More importantly, aborting the client alone cannot interrupt synchronous SQLite work already executing on the host's Node.js event loop. The benchmark route is therefore queued behind a server-wide blocker inherited from the Models route. This is the primary explanation for the reported one-minute benchmark navigation.

The benchmark candidate path also contains a separate scaling defect. For every endpoint, `readEndpointProfileData()` opens SQLite repeatedly and performs:

- one latest-profile read;
- three latest difficulty-profile reads;
- one complete endpoint sample-history read;
- one advisory recommendation read.

The live performance tables contained `5,971` general samples, `4,752` difficulty samples, `8,313` general profile snapshots, and `6,600` difficulty profile snapshots. The four inspected endpoint/profile queries had only primary-key indexes unrelated to their filters. Every query plan reported a table scan and temporary B-tree ordering. The current runtime has only three candidates and an idle candidate response remains under one second, so this is not the confirmed minute-scale cause, but it must be bounded before endpoint and sample counts grow.

## Expanded Root-Cause Direction

Run 77 must now cover both user-visible manifestations of the same blocking defect:

1. mutation actions on `/app/models` must not await rich request history;
2. background Models request evidence must not monopolize the server or delay navigation after the route is left;
3. `/app/models/benchmark` must render its essential controls without awaiting the full router-candidate payload or every historical/advisory surface;
4. benchmark candidate/profile reads must use indexed, bounded access rather than per-endpoint full scans and unbounded sample history;
5. automated cross-route testing must hold request history open and prove benchmark navigation and health remain responsive.

## Rich Request-Endpoint Route Audit

A source, current UI build, and current win32 release-bundle audit found no additional production route that calls `GET /api/role-model/requests`.

Current source call sites are limited to `control-models.tsx`:

- deferred Models bootstrap after the primary inventory becomes visible;
- post-`Save bindings` refresh;
- post-`Eject from pool` refresh through the shared model-state refresh.

`fetchRuntimeSnapshot()` in `runtime-api.ts` also includes `fetchRuntimeRequests()`, but no production route calls `fetchRuntimeSnapshot()`. `startup-bootstrap-regression.test.ts` explicitly asserts that its listed P0 routes do not use that full-snapshot helper.

Neighboring routes use different, purpose-specific contracts:

- `/app/remote/providers` uses `GET /api/role-model/requests/latest-ids?limit=10`, which projects request IDs only;
- `/app` and `/app/observe/requests` use `/api/role-model/telemetry/requests` plus telemetry analytics;
- request detail uses `/api/role-model/requests/:requestId` only after the operator explicitly opens one request;
- benchmark routes do not directly call the rich list endpoint; their delay is inherited from the Models request already blocking the server.

The current `apps/runtime-ui/build` and `dist/release/win32-x64/build` bundles, both built on `2026-07-18`, import the rich-list helper only from the Models route bundle.

One stale artifact was found at `dist/release/package/build`, dated `2026-05-09`. Its retired `fetchRuntimeSnapshot()` still includes `/api/role-model/requests`, and the old helper is imported by numerous old route bundles including Models, controller, Connect, upstream integration, Runtime, several Studio routes, peers, and Workbench. This stale package tree is not the live win32 bundle used for the reproduction, so it does not establish current-route calls. It is nevertheless a packaging hazard: validation must prove rebuilt distributable trees do not retain or ship obsolete route bundles that reintroduce broad full-snapshot startup.

Conclusion: the current code defect has one route owner, `/app/models`, with three lifecycle triggers. Run 77 should remove rich-list startup/mutation use from that route, keep the unused full-snapshot helper from becoming a future route dependency, and require clean rebuilt release artifacts.
