# S392a — telemetry read plan with exact multiplicity (LANDED)

Region: readback.ts mapping, update.ts invalidateCurrentRoute + control branch, control.ts mapping, tests.

## Landed contract
- readbackKeyForRouteTag (readback.ts) now maps the S379c Learning children (learningConfiguration/Packs/Decisions/Evidence/History), LocalLlamaSwapModels, SystemExtensions, ModelsRoles (configuredModels primary) and SystemOperator (operatorStatus primary); no mapped route is a zero-command telemetry no-op.
- update.ts readPlanForRoute(model) is the typed READ PLAN: ModelsRoles -> configuredModels + modelEndpoints; SystemOperator -> operatorStatus + operatorTraceRoots; every other mapped route -> one entry with the existing id/query mirroring (Dashboard id=windowMs; Index overview query + id; detail requestId).
- invalidateCurrentRoute emits ONE readReadback per plan entry, assigning each key its own token+1 and loadingReadback, and returns no refresh watermark/resync change. Observability branch unchanged.
- Control branch: when no readback plan exists, controlKeyForRouteTag (control.ts) match -> ONE readControl({ key, token }) with per-control token+1 and loadingControl; no route/view rewrites.
- Stream-unavailable fallback remains explicitly remaining (no invented polling).

## Tests (test/s393-telemetry-read-plan.test.ts)
- One read per single-source route (table: LearningConfiguration/Packs/Decisions/Evidence/History, SystemExtensions, LocalLlamaSwapModels): one ReadReadback, exact key, token+1, loading, refresh unchanged.
- Multi-source: 'invalidates BOTH sources of ModelsRoles with per-key tokens'; 'invalidates BOTH sources of SystemOperator with per-key tokens'.
- Control: 'invalidates the control surface Providers/Endpoints/ControlController with ONE ReadControl' (no ReadReadback, exact key, token+1, loading).
- Zero: 'emits ZERO commands for a route without a readback or control source' (Studio).
- Multiplicity: 'keeps exact multiplicity for two telemetry events (one read each, tokens advance per event)'.
- Stream: 'registers ONE listener pair on ONE source and closes it exactly once' (telemetry + revision listeners = 1 each; closeCount 1; no message after dispose).

## Evidence
- RED s393-red.log EXIT_CODE=1 (mapped/control routes had zero commands pre-implementation); GREEN s393-green.log 4 files / 129 tests; UI tsc exit 0.
- Hashes: readback BFB075F5..., update 236755B9..., control 9E093549... (unchanged), s393 test 87551870....
- Lint: s393 clean (0).
