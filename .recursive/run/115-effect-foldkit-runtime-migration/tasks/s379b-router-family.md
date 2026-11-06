# S379b — Router family canonical URLs + one real readback (LANDED)

Region: route/legacy-redirect/view/init/readback/runtime-endpoints + tests; no other families.

## Landed
- ONE real readback source: GET /api/role-model/router/config (host index.ts:19576 area, payload readRouterConfigData index.ts:26852-26889) exposes persisted strategy/execution mode, routing posture, role (agentStrategies) + workload posture entries, posture diagnostics, controller/guidance.
- runtime-endpoints.ts: READBACK_PATHS.routerConfig = /api/role-model/router/config.
- readback.ts: new ReadbackKey routerConfig (+ schema, state, empty, client) and parseRouterConfig mapping the payload into bounded rows (strategy, executionMode, routing.*, agentStrategy.*, workload.*, diagnostics.violation.*); invalid bodies fail honestly.
- route.ts: RouterStrategy, RouterWorkloads, RouterConfig, RouterAgentStrategy cases + /router/strategy, /router/workloads, /router/config, /router/agent-strategy routers (appRouter order after /router).
- init.ts: the four tags dispatch the ONE routerConfig readback with loadingReadback; update.ts readbackKeyForRouteTag maps them and its noop defaults include routerConfig.
- view.ts: titles, nav entries, and routerFamilyPage projections: Router strategy = strategy/executionMode/routing.*; Workloads = workload.*; Agent strategy = agentStrategy.*; Router config = strategy/executionMode/routing./diagnostics. states are honest (loading/idle -> loading, error -> error message, empty/rows empty -> empty).
- legacy-redirects.ts: CANONICAL_TARGETS for /app/router/agent-strategy, /app/router/config, /app/router/strategy, /app/router/workloads; the four MISSING entries removed (10 left). Existing map /app/control/routing-strategy -> /app/router/strategy and /app/router/config -> /app/router/strategy now resolve through ReplaceLegacyUrl with query/hash preserved.

## Counts
- MISSING: 14 -> 10 (the four router families landed). Supported originals: 38 -> 42; 42 + / + 10 = 53.
- s269 pins updated: 42 supported (40 static + 2 dynamic), 10 missing, 18 resolvable + 2 missing redirect entries.

## Tests
- test/s383-router-family.test.ts: typed parse of the four routes; canonicalisation of /app/router/*; /app/control/routing-strategy with query+hash and exactly one ReplaceLegacyUrl; MISSING count 10 with the rest NotFound; requestId detail unchanged; DOM page tests (strategy loading->ok, error honest, workloads/agent projections) mounted with a readback client fetch stub.
- RED s383-red.log EXIT_CODE=1 (pre-implementation); GREEN s383-green.log: 5 files / 126 tests; UI tsc exit 0.

## Hashes
route E8142A65..., legacy-redirects F0CCA86F..., view B1A2257D..., init 1EEDC0EE..., readback F9BEDDF1..., runtime-endpoints 445801CE..., s383 test B17A9F91..., s269 test D5BA9891...

Lint: s383 clean (0), s269 clean (0).
