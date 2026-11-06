# S313 - B6/R27 Server owner: STOP characterization

Task-22 (rev 2). Model: deepseek-flash (verified live). Files byte-identical to the frozen 6ade412f bytes
(composition-dag BD2BEE01..., index ED1BC875..., cli 3C6396FE...); backups in E:/rm-tmp/s313.

## Decision: STOP (new blocker outside the allowed region)

1. The DAG cannot construct the listener/routes owner from the region: createBridgeRequestListener (index.ts:20617)
   requires the handler factory createRequestHandler (:17438) - the ~3000-line routes construction - which is outside
   the allowed listener/lifecycle region (:20507-20790). Transport injection of createServer/listen is possible; the
   missing piece is the real handler factory, not a type gap.
2. The no-fallback contract is incompatible with the current API surface inside scope: startBridgeServer(options)
   is called with plain options by 84 test call sites and validate-catalog-economics.ts:301,
   validate-restart-rehydration.ts:159, validate-ui.ts:175, validate-vendors.ts:1564 (all outside scope). Forcing a
   DAG Server owner would break them; keeping a local fallback would violate 'no silent dual path'.

## What is proven / unproven

- Ordering baseline: createBridgeRequestListener -> createServer(trace wrapper -> requestListener) -> listen ->
  {port, close(server)}; shutdown server.close-only; readiness route readback. Unchanged.
- Baseline re-run (no product changes): s21a 6/6 + s21c 2/2 + s310b 5/5 = 13/13; tsc exit 0
  (evidence/logs/s313-characterization.log).
- Unproven: DAG Server owner, identity/no-fallback. Unblock options: (a) add createRequestHandler + its route
  dependencies to scope; or (b) export a typed Server transport bundle from index (listener factory + createServer +
  listen) that the DAG consumes, plus a decision on migrating the 88 plain-options callers.
## LANDED (facade semantics, option b)

- DAG composeServerOwner: consumes composed Backend owner + typed transport + handler factory; owns listener -> createServer -> listen ordering and close via transport.
- index exports bridgeServerTransport (listener factory + createServer(trace) + listen + close) and the startBridgeServer facade composes the DAG owner; all 85 test call sites + 4 validate scripts still call startBridgeServer(options) unchanged.
- Identity: 'facade startBridgeServer composes the DAG Server owner; no local listen/lifecycle path exists' (server.serverOwner === onServerOwner capture). No-fallback: assertComposedServerOwner(legacy) throws; the facade has no local listen/close path.
- RED s313-red.log 2 failed -> GREEN s313-green.log 8 files / 35 passed; tsc exit 0.
- Lint: DAG 161 = 157 moved-cast + 2 boundary casts + 2 boundary unknown-returns; new Server region clean; test clean.
- Owner table: Server MOVED; Refresh/Drain/Benchmark/Cli blocked; early readiness/partial shutdown/cache identity named gaps.
- Hashes: composition-dag 42B099EF..., cli unchanged 3C6396FE..., index BC0DA0CC..., test 24E4BD7A.... Backups E:/rm-tmp/s313.
## S314 repair (LANDED): real BackendOwner threading

- composeBackendOwner attaches its REAL owner to its options via a non-enumerable symbol; composedBackendOwnerOf recovers it. startBridgeServer selects lifecycle.backend ?? composedBackendOwnerOf(options) ?? testSeamBackendOwner(options) — production options always carry the s310b composed owner.
- facadeBackendOwner renamed testSeamBackendOwner (TEST SEAM only: bare options that never went through composeBackendOwner). The legacy-brand bypass is gone from the production flow.
- cli.ts startServer (:5183-5232) captures the owner through createCliServerOptions' onBackendOwner and passes { backend: owner } explicitly.
- Tests: 'facade threads the real composed BackendOwner: serverOwner.backend === composedBackendOwner' and 'a plain-options owner injected as the backend is refused (legacy brand bypass gone)'.
- RED s313-red2.log 1 failed (identity) -> GREEN s313-green2.log 8 files / 37 passed; tsc exit 0. Hashes: dag AD1780F1..., cli C6AFCD73..., index 4A168BAA..., test E059AF71....
## S314 micro-repair (LANDED): production fail-closed + launcher owner threading

- startBridgeServer fails closed: bare options without a composed owner now throw unless the explicit allowTestSeamBackend flag is set (test seam only). testSeamBackendOwner is unreachable from production.
- scripts/prod-launcher.ts composes the real Backend owner (createCliServerOptions + onBackendOwner), merges Track-B options, and passes { backend: owner } to startBridgeServer.
- Test: 'bare options are refused outside the explicit test seam (production-style path)'.
- RED s313-red3.log 1 failed -> GREEN s313-green3.log 8 files / 38 passed; tsc exit 0. Hashes: dag unchanged AD1780F1..., cli unchanged C6AFCD73..., index 387DAC6E..., launcher DE5CAC9C..., test A66395C3....
## S314 regression repair (LANDED): caller sweep + launcher merge

- 86 explicit allowTestSeamBackend insertions across 29 plain-options caller files (23 test files incl. benchmark-data-clear.test.ts:117 and index.test.ts, 4 validate-*.ts, scripts/start.ts); no caller hits the fail-closed throw.
- RED s313-red4.log: benchmark-data-clear 1 failed pre-sweep. GREEN s313-green4.log: expanded 34 test files / 411 tests passed; tsc exit 0.
- Regression guard: test/s313-caller-seam.test.ts enumerates every startBridgeServer call in test/** + validate-*.ts + scripts/** and requires the explicit seam, composed options, or an explicit backend arg.
- prod-launcher: merge now copies own symbol descriptors (backend-owner ref preserved) and passes the explicit backend owner; decision recorded (explicit backend authoritative).
## S314 r4 guard repair (LANDED)

- Guard parser now splits top-level args ignoring trailing commas; isSafeCall accepts only (a) allowTestSeamBackend anywhere, (b) createCliServerOptions( first arg in plain OR namespaced form, or (c) a second argument containing 'backend'. Arg-count alone no longer passes.
- Negative fixtures: trailing-comma call and handler-only second arg are rejected. Positive fixtures: both createCliServerOptions forms + explicit backend/seam second args accepted.
- RED s313-red5.log 2 failed (old criterion) -> GREEN s313-green5.log 10 files / 44 tests passed; tsc exit 0. Guard hash 10A5B88F....
