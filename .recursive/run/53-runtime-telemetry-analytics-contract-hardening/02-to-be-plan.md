Run: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-21T18:39:25Z`
LockHash: `fb8639a2ea26181992b7271d4587e9d1c693362f101f320360767870c09ab801`
Inputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/01-as-is.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/01.5-root-cause.md`
Outputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/02-to-be-plan.md`
Scope note: This artifact records the implementation plan for the Run 53 telemetry analytics contract hardening.

## TODO

- [x] Sequence frontend work through the design system first
- [x] Define RED/GREEN slices for backend analytics and frontend semantic states
- [x] Define rebuilt-runtime verification expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: analytics metadata, support semantics, full-slice aggregation, and shared filter parsing.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`: backend RED/GREEN regression coverage.
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`: telemetry chart-state contract.
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`: shared state vocabulary.
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`: design-system regression coverage.
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`: analytics response and filter transport types.
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`: semantic chart-state model.
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`: frontend RED/GREEN regression coverage.
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`: state-aware empty/support copy.
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`: shared ledger/chart filter use.
- `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`: post-run durable documentation.

## Implementation Steps

1. Write backend RED coverage for full-slice analytics and ledger filter alignment.
2. Write frontend RED coverage for unsupported metric and sparse dimension states.
3. Implement backend contract metadata and support helpers.
4. Implement design-system telemetry state vocabulary and tests.
5. Implement frontend semantic state model and chart card consumption.
6. Align request-ledger filter transport with analytics filters.
7. Update graph matrix documentation.
8. Run targeted, critical, build, packaging, and packaged-runtime QA.

## Testing Strategy

- Targeted backend contract tests for analytics aggregation and filters.
- Targeted frontend model tests for semantic chart states.
- Design-system unit tests for shared vocabulary.
- Runtime UI critical suite.
- Runtime host TypeScript build.
- Runtime UI production build.
- Packaged runtime build and HTTP QA.

## Playwright Plan (if applicable)

No Playwright browser control was available in this session. Packaged-runtime UI routes are verified by HTTP and opened in the system browser for user-operated visual sign-off.

## Manual QA Scenarios

- Open `/app/observe/requests` in the packaged runtime.
- Open `/app/observe/routing` in the packaged runtime.
- Confirm charts show truthful empty/unsupported states in a fresh runtime state.
- Confirm shared filters do not visibly desynchronize charts and ledger.

## Idempotence and Recovery

- The work is isolated in `D:\DEV\role-model\.worktrees\53`.
- The packaged runtime uses `runtime-output/run53-qa` state and can be restarted with the same executable and state root.
- Generated packaging vendor assets are excluded from source scope and removed after packaging.

## Implementation Sub-phases

- Backend analytics contract and RED/GREEN coverage.
- Design-system telemetry states and regression coverage.
- Frontend semantic chart state and route filter consumption.
- Documentation and packaged-runtime verification.

## Plan

1. Add backend RED coverage proving analytics over more than `50` rows must aggregate the full requested slice and align with request-ledger filters.
2. Add frontend RED coverage proving unsupported metrics and sparse breakdown dimensions produce explicit semantic chart states.
3. Implement backend contract metadata:
   - `appliedQuery`
   - `metadata.scannedRowCount`
   - `metadata.matchedRowCount`
   - `metadata.aggregationRowCount`
   - `metadata.truncated`
   - `metadata.truncationReason`
   - `metricSupport`
   - `dimensionSupport`
4. Implement shared filter parsing for analytics and request-ledger reads.
5. Update frontend design-system contract first:
   - `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
   - `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
   - `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
6. Implement shared telemetry semantic chart-state model and route consumers.
7. Update `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` to post-run architecture truth.
8. Verify with targeted RED/GREEN logs, runtime UI critical tests, host build, UI build, packaged runtime build, and packaged-runtime HTTP/browser QA.

## TDD Plan

TDD Mode: strict

- Backend RED: failing test for full-slice aggregation over `65` records plus aligned remote-source ledger filters.
- Frontend RED: failing tests for unsupported metric and sparse-dimension semantic chart states.
- GREEN: implement only the minimum contract/model changes needed to pass the failing tests, then expand targeted regression and build coverage.

## Frontend Design-System-First Sequence

1. `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
2. `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
3. `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
4. shared telemetry semantic view models and chart primitives
5. route-level consumers and controls

## Traceability

- `R1`: design-system-first file sequence and tests.
- `R2`, `R3`, `R4`, `R5`, `R7`, `R8`: backend contract, aggregation, support, filter, and fact-coverage plan.
- `R6`: shared semantic chart-state model plan.
- `R9`: RED/GREEN, regression, build, packaging, and runtime QA plan.
- `R10`: graph matrix documentation plan.

## Coverage Gate

- [x] Plan covers `R1` through `R10`
- [x] Plan keeps telemetry analytics backend-owned
- [x] Plan includes strict TDD and rebuilt-runtime verification

Coverage: PASS

## Approval Gate

- [x] Plan is implementable in the existing runtime host/UI architecture
- [x] Plan avoids unrelated route or packaging redesign

Approval: PASS

## Audit Gate

- [x] Plan includes file-level changes, tests, QA, and recovery path

Audit: PASS
