Run: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-21T19:21:14Z`
LockHash: `b6bd64cfa2e6a3f85d92cb1d5474e754c8b249d397e9fd15debcf2c363ac826e`
Inputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/03-implementation-summary.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/04-test-summary.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/addenda/05-manual-qa.horizontal-ranking-legend.addendum-03.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/addenda/05-manual-qa.horizontal-ranking-plot-height.addendum-04.md`
- `/role-model-router/dist/release/win32-x64/role-model-runtime.exe`
Outputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/05-manual-qa.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/`
Scope note: This artifact records packaged-runtime QA completed by the agent, user-operated browser sign-off, and cleanup of temporary QA telemetry.

## TODO

- [x] Start rebuilt packaged runtime
- [x] Verify runtime health endpoint
- [x] Verify SPA Observe routes serve from packaged runtime
- [x] Verify analytics query contract over HTTP
- [x] Verify request-ledger filter endpoint over HTTP
- [x] Generate runtime telemetry through normal failed requests
- [x] Seed temporary QA telemetry rows for populated chart review
- [x] Repair horizontal ranking chart label placement found during browser QA
- [x] Repair horizontal ranking chart plot-height regression found during browser QA
- [x] User browser sign-off on rendered charts and states
- [x] Remove temporary QA telemetry rows
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## QA Execution Record

QA Execution Mode: hybrid

Agent-operated checks are complete against the rebuilt packaged runtime. User-operated browser visual sign-off passed on 2026-06-21. Playwright screenshot automation is not available in this workspace (`playwright` is not installed), so rendered chart review was completed by the user in the in-app browser.

## Runtime Under Test

- URL: `http://127.0.0.1:3456`
- Executable: `/role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- Runtime state root: `/runtime-output/run53-qa`
- Scope ID: `run53-qa`
- Static root: `/role-model-router/apps/runtime-ui/build/client`

## Agent-Operated QA Completed

- `GET /healthz`: PASS, runtime returned `healthy` in `decision_only` mode.
- `GET /app/observe/requests`: PASS, SPA shell served from packaged runtime.
- `GET /app/observe/routing`: PASS, SPA shell served from packaged runtime.
- `GET /assets/entry.client-*.js`: PASS, client bundle served from packaged runtime.
- `POST /api/role-model/telemetry/query`: PASS, response included `appliedQuery`, `metadata`, `metricSupport`, and `dimensionSupport`.
- `GET /api/role-model/telemetry/requests?limit=200&windowMs=604800000&sourceTypes=remote`: PASS, returned `[]` for the fresh QA state and accepted shared filter params.
- Runtime-generated request attempts: PASS, normal `/v1/chat/completions` calls generated failure telemetry rows in the QA runtime. Because the runtime has no configured endpoints, these rows do not populate strategy, difficulty, role, or cost/savings chart dimensions.
- Temporary QA seed: PASS, inserted `36` rows with `run53-qa-seed-` request IDs into `/runtime-output/run53-qa/run53-qa/memory/memory.sqlite` so routing analytics charts can be visually reviewed with populated strategy, difficulty, role, source, cost, cache, success, and failure data.
- Post-seed analytics query: PASS, `Cost Avoided By Routing` returned populated `selectedStrategy` series and `Difficulty Distribution` returned populated ranking rows.
- Horizontal ranking chart repair: PASS, Ranked Comparison now uses a bottom legend for model/endpoint labels and no Y-axis category text.
- Horizontal ranking plot-height repair: PASS, affected ranking charts on `/app/observe/requests` and `/app/observe/routing` now have a concrete `280px` Recharts plot area and nonzero bar shapes in the in-app browser.

## QA Scenarios and Results

- Fresh runtime empty-state check: PASS by API and SPA route availability.
- Normal runtime request generation: PARTIAL, produced legitimate failure telemetry but no meaningful routing-dimension coverage because the QA runtime has zero routable endpoints.
- Temporary populated chart seed: PASS, uses only the QA runtime SQLite state root and does not modify source files or durable memory.
- Browser visual review: PASS, user reported "phase 5 manual qa passed" from the in-app browser on 2026-06-21.
- Temporary QA telemetry cleanup: PASS, cleanup deleted `50` temporary rows and verification returned `remainingRows: 0`.

## Evidence and Artifacts

- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/healthz.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/observe-requests-spa.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/observe-routing-spa.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/telemetry-query-remote-source.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/telemetry-requests-remote-source.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/telemetry-query-routing-seeded.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/telemetry-query-difficulty-seeded.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/telemetry-requests-seeded.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/observe-requests-horizontal-ranking-bottom-legend.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/observe-horizontal-ranking-plot-height.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/cleanup-temporary-qa-telemetry.ps1`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/cleanup-temporary-qa-telemetry.json`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/cleanup-temporary-qa-telemetry-verify.json`

## Temporary QA Seed Cleanup

The temporary QA data is intentionally identifiable by:

- `request_id LIKE 'run53-qa-seed-%'`
- `client_request_id LIKE 'run53-qa-seed-%'`
- `client_request_id LIKE 'run53-qa-generated-%'`

Cleanup command after user sign-off:

```powershell
powershell -ExecutionPolicy Bypass -File .recursive\run\53-runtime-telemetry-analytics-contract-hardening\evidence\manual-qa\cleanup-temporary-qa-telemetry.ps1
```

Cleanup result:
- `deletedRows`: `50`
- verification `remainingRows`: `0`

## User Browser Sign-Off

Open `http://127.0.0.1:3456/app/observe/requests` and `http://127.0.0.1:3456/app/observe/routing`.

Confirmed:
- seeded chart panels render populated data where telemetry facts are present
- unsupported or partial chart states use explicit copy rather than blank shells where telemetry facts are sparse
- horizontal ranking charts show long model/endpoint labels in the bottom legend rather than the left axis
- request ledger and chart filters can be operated together without obvious disagreement
- the app remains visually coherent after refresh

## User Sign-Off

PASS. User reported on 2026-06-21: "phase 5 manual qa passed".

## Traceability

- `R2`, `R3`, `R4`, `R5`, `R7`, `R8`: packaged-runtime API proof and temporary populated telemetry seed.
- `R6`: user-operated visual review of semantic chart states.
- `R9`: rebuilt packaged-runtime QA evidence and cleanup record.
- `R10`: QA evidence ties back to the graph matrix documentation.
- Addendum `horizontal-ranking-legend.03`: browser-QA repair for long labels in horizontal ranking charts.
- Addendum `horizontal-ranking-plot-height.04`: browser-QA repair for bottom-legend charts with no visible bars.

## Coverage Gate

- [x] Packaged runtime launched and served API/UI assets
- [x] Analytics contract was verified over HTTP
- [x] Temporary populated chart telemetry is available for browser review
- [x] Horizontal ranking chart label placement repair verified in rebuilt UI
- [x] Horizontal ranking chart plot-height repair verified in rebuilt UI
- [x] Temporary QA telemetry removed after sign-off
- [x] User visual browser sign-off recorded

Coverage: PASS

## Approval Gate

- [x] Agent-operated packaged-runtime checks passed
- [x] Temporary QA seed is isolated to runtime-output state and has a cleanup command
- [x] Manual browser sign-off recorded
- [x] Temporary QA telemetry cleanup confirmed

Approval: PASS
