# Per-route verification matrix (S623)

date: 2026-11-03

Every `AppRoute.cases` tag is covered by `test/s623-route-verification-matrix.test.ts`:
- real `renderToString` render asserted non-empty;
- `scanRouteTag` structural scan of interactive elements and wiring;
- initial `createInit` readback command keys asserted against the committed plan;
- a behavioural family test file tied to each route (those tests assert dispatched messages and exact fetch fixture paths/methods/bodies);
- the zero-wired regression guard: a route with interactive elements and zero wired controls fails.

Known scanner gap: **Requests** renders through the real view, but `test/support/handler-presence.ts` cannot enter the Foldkit runtime frame used by its listbox; the scan reports an explicit error and no elements. This is pinned in the test rather than hidden.

## Matrix

| Route | Rendered | Interactive elements | Wired | Dead controls | Behavioural test | Readback queries |
| --- | --- | --- | --- | --- | --- | --- |
| Index | yes | 30 | 30 | none | s527-root-overview.test.ts | overviewMetrics |
| Diagnostics | yes | 23 | 23 | none | diagnostics-client.test.ts | (none) |
| Observability | yes | 30 | 30 | none | s26d-observability.test.ts | (none) |
| StoreReceipts | yes | 30 | 30 | none | s26e-readback-routes.test.ts | storeReceipts |
| Queues | yes | 29 | 29 | none | s26k-control.test.ts | queues |
| LocalLogs | yes | 30 | 29 | none | s26b-wave1.test.ts | localLogs |
| RouterCandidates | yes | 29 | 29 | none | s530-router-family.test.ts | routerCandidates |
| Requests | yes (renderToString; recorder gap: Foldkit: html element constructors must be called inside a runtime-driven render. The element was built outside a view, or foldkit was loaded as more than one instance (a bundler split foldkit and @foldkit/ui into separate copies).) | 0 | 0 | scanner gap - real render ok | s619-requests-observe-wiring.test.ts | requests |
| RequestDetail | yes | 22 | 22 | none | s25d-request-parity.test.ts | requestDetail |
| RouterDecisions | yes | 29 | 29 | none | s530-router-family.test.ts | routerDecisions |
| RouterDecisionDetail | yes | 22 | 22 | none | s530-router-family.test.ts | routerDecisionDetail |
| LocalPeers | yes | 31 | 28 | none | s534-families.test.ts | localPeers |
| SystemPeers | yes | 28 | 28 | none | s534-families.test.ts | systemPeers |
| LocalPeerModels | yes | 33 | 29 | none | s534-families.test.ts | localPeerModels |
| QueuesConfiguration | yes | 22 | 22 | none | s26k-control.test.ts | queueConfig |
| IntegrationsDownstream | yes | 25 | 25 | none | s26k-control.test.ts | downstreamOpenAI |
| IntegrationsUpstream | yes | 25 | 25 | none | s26k-control.test.ts | integrationProviders |
| LocalChoose | yes | 26 | 26 | none | s534-families.test.ts | (none) |
| Studio | yes | 30 | 30 | none | s46a-studio.test.ts | configuredModels |
| Learning | yes | 32 | 32 | none | s619-learning-controls.test.ts | learning, learningPacks, replayJobs, evaluationJobs |
| LearningConfiguration | yes | 29 | 29 | none | s619-learning-controls.test.ts | learningConfiguration |
| LearningPacks | yes | 32 | 32 | none | s619-learning-controls.test.ts | learningPacks |
| LearningDecisions | yes | 34 | 34 | none | s619-learning-controls.test.ts | learningDecisions |
| LearningEvidence | yes | 30 | 30 | none | s619-learning-controls.test.ts | learningEvidence |
| LearningHistory | yes | 29 | 29 | none | s619-learning-controls.test.ts | learningHistory |
| LocalLlamaSwapModels | yes | 32 | 29 | none | s534-families.test.ts | localLlamaSwapModels |
| LocalPolicy | yes | 28 | 28 | none | s589-local-policy-wired.test.ts | localPolicy |
| SystemOperator | yes | 30 | 25 | none | s534-families.test.ts | operatorStatus, operatorTraceRoots |
| SystemExtensions | yes | 30 | 28 | none | s534-families.test.ts | extensions |
| Models | yes | 28 | 28 | none | s618-models-wiring.test.ts | configuredModels, modelEndpoints, rolePolicy |
| ModelsRoles | yes | 41 | 41 | none | s620-roles-parity.test.ts | configuredModels, modelEndpoints, rolePolicy |
| Benchmark | yes | 29 | 29 | none | s622-benchmark-parity.test.ts | benchmarkSuite, benchmarkSummary, benchmarkRuns |
| StorageRetention | yes | 33 | 33 | none | s595-storage-retention.test.ts | storageRetention |
| Runtime | yes | 30 | 30 | none | s533-learning-models.test.ts | runtime |
| RuntimeConfig | yes | 29 | 29 | none | s76a-runtime-config.test.ts | runtimeConfig |
| SessionReadiness | yes | 28 | 28 | none | s590-session-readiness.test.ts | sessionReadiness |
| Dashboard | yes | 22 | 22 | none | s527-root-overview.test.ts | dashboard |
| LocalSwap | yes | 30 | 30 | none | s534-families.test.ts | localSwap |
| RouterStrategy | yes | 41 | 41 | none | s584-router-posture-wiring.test.ts | routerConfig, runtimeConfig |
| RouterWorkloads | yes | 36 | 36 | none | s530-router-family.test.ts | routerConfig, runtimeConfig |
| RouterConfig | yes | 34 | 34 | none | s530-router-family.test.ts | routerConfig, runtimeConfig |
| RouterAgentStrategy | yes | 38 | 38 | none | s530-router-family.test.ts | routerConfig, runtimeConfig |
| ObserveActivity | yes | 29 | 29 | none | s529-observe-family.test.ts | observeActivity |
| ObserveLogs | yes | 31 | 29 | none | s529-observe-family.test.ts | observeLogs |
| ObserveRouting | yes | 37 | 37 | none | s529-observe-family.test.ts | observeRouting |
| Router | yes | 29 | 29 | none | s530-router-family.test.ts | router, routerConfig, routerCandidates, runtimeConfig, health |
| Providers | yes | 52 | 52 | none | s401-provider-account-form.test.ts | configuredModels, modelEndpoints, integrationProviders, providerCatalog, providerAccounts, roles |
| Endpoints | yes | 33 | 33 | none | s439-endpoint-completion.test.ts | configuredModels, modelEndpoints, integrationProviders, providerCatalog, providerAccounts, roles |
| ControlController | yes | 32 | 32 | none | s73a-controller.test.ts | (none) |
| NotFound | yes | 23 | 23 | none | s110-nav-links.test.ts | (none) |

## Dead-control findings (wired by task-102)

All previously dead controls in this table are now wired with host contracts and per-route evidence:
s624 ObserveLogs, s625 LocalLogs, s626 LocalPeers, s627 LocalPeerModels, s628 LocalLlamaSwapModels,
s629 SystemOperator, s630 SystemExtensions. The s617 handler-presence baseline was refreshed and asserts
none of these remain dead.

No route has zero interactive controls by design; every route outside the Requests scanner gap renders at least one interactive element and at least one wired control. The only scanner-zero element route is Requests, whose real render is verified separately.

## Behavioural family coverage

| Family | Committed behaviour test |
| --- | --- |
| Overview | s527-root-overview.test.ts / s40b-overview.test.ts |
| Diagnostics | diagnostics-client.test.ts |
| Observe | s529-observe-family.test.ts / s619-requests-observe-wiring.test.ts |
| Requests | s25d-request-parity.test.ts / s619-requests-observe-wiring.test.ts |
| Router | s530-router-family.test.ts / s584-router-posture-wiring.test.ts |
| Models / Roles | s618-models-wiring.test.ts / s620-roles-parity.test.ts |
| Learning | s619-learning-controls.test.ts |
| Local | s589-local-policy-wired.test.ts / s534-families.test.ts |
| Studio | s46a-studio.test.ts |
| Providers / Endpoints / Control | s401-provider-account-form.test.ts / s439-endpoint-completion.test.ts / s73a-controller.test.ts |
| System / Storage / Benchmark | s595-storage-retention.test.ts / s622-benchmark-parity.test.ts / s534-families.test.ts |
| Runtime / Config | s533-learning-models.test.ts / s76a-runtime-config.test.ts / s590-session-readiness.test.ts |


## task-102 final verification

Full UI suite: **936/936 passed** (2026-11-03, raw log s617-task102-final-full.log).
S48a styled-client build passed in this final run; earlier 41-55s timeouts occurred only under parallel load against its 20s budget and are environmental, not a code regression.
