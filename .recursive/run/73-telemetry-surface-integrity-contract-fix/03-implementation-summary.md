Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `03 Implementation Summary`
Status: `LOCKED`
LockedAt: `2026-07-16T20:51:25Z`
LockHash: `cd3a29f1d9cfeb66e7bec5afd7f87af9c5440fefa559349398e35536b8554c47`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-worktree.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md` (effective audit input)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md` (effective remediation plan)
Outputs:
- This file.

Scope note: Records the strict-TDD remediation of findings `A73-01` through `A73-08` for cache/usage truth, persistence provenance, shared chart geometry, and deterministic browser coverage.

## TODO

- [x] Implement SP1 cache-key synthesis, capability gating, and provenance
- [x] Implement SP2 Kimi wire usage request and compatible usage normalization
- [x] Implement SP3 token truth, persistence, analytics, fallback, and UI provenance
- [x] Implement SP4 one shared line/area/bar chart layout contract
- [x] Implement SP5 deterministic QA seeding and rendered browser regressions
- [x] Repair the SP7 SEA compressed-asset fallback discovered by packaged startup
- [x] Reconcile the complete worktree diff and strict RED/GREEN evidence
- [x] Complete Phase 3 audit and gates

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: no recursive router or delegated model transport is configured in this worktree.
- Delegation Decision Basis: no configured delegated-review transport was available; all changed code, tests, logs, and diff paths were inspected directly.
- Audit Inputs Provided: locked requirements, root-cause report, amended plan, both addenda, product diff, RED/GREEN logs, and verification logs.

## Effective Inputs Re-read

- `00-requirements.md` defines R1-R9 and strict TDD.
- `01.5-root-cause.md` rejects the prior Phase 3/4 claims and identifies ownership failures across ingress, final wire shaping, normalization, persistence, UI, and rendered geometry.
- `02-to-be-plan.md` plus addendum `02` define SP1-SP8; Phase 3 owns SP1-SP5 and the implementation portion of SP6.
- Addendum `01` findings `A73-01` through `A73-08` are all addressed by code or executable regression evidence below.

## Prior Recursive Evidence Reviewed

- Runs 51, 60, 63, 65, and 70 remain the ownership baseline for browser testing, UI design-system behavior, telemetry storage, prompt-cache continuity, and cache-efficiency definitions.
- The invalidated original Phase 3/4 receipts were treated only as historical audit evidence, not proof of completion.

## Changes Applied

### SP1 Prompt-cache contract

- Added deterministic cache-key synthesis precedence: explicit key, session id, conversation id, then SHA-256 of canonical ordered messages.
- Keys use `rm-prompt-sha256:<64 lowercase hex>` and never expose raw prompt text.
- Forwarding is governed by the final selected provider capability; unsupported transports receive no synthesized cache request.
- Actual final wire state determines `promptCacheRequested`, and `explicit` or `synthesized` source propagates through normalized responses, observability, SQLite dimensions, retention fallback, and request detail.

### SP2 Provider wire and usage normalization

- Added provider capability metadata for streamed usage requests and enabled `stream_options.include_usage` for Moonshot/Kimi.
- Preserved top-level, nested `choices[0].usage`, and non-streamed usage extraction, including final `tool_calls` chunks.
- Preserved supported-zero cache misses and existing cached-token fields without changing token totals.
- Asserted final Kimi-compatible wire bodies contain capability-driven cache and usage options.

### SP3 Token truth and persistence

- Added independent input/output source and availability fields to protocol schema, fixture, generated types, adapter responses, observability, SQLite records, host fallback, and request detail.
- Estimates derive from the captured outbound provider request; estimation failures and cyclic values become unavailable rather than false zero.
- Legacy and failure records default to unavailable and never infer provenance from numeric values.
- Analytics exclude unavailable rows from token aggregates and cache-hit denominators while preserving the run-70 metric definition.
- Request detail renders `measured`, `normalized`, `estimated`, and `unavailable`; genuine measured zero remains visible as zero.

### SP4 Shared chart contract

- Added exported `telemetryChartLayoutContract` with bounded `leftAxisGutter`, `rightAxisReserve`, `legendInset`, `plotMargin`, and `plotHeight` fields.
- Added width resolution from formatted tick values and applied it to shared line, area, and bar time-series charts.
- Added direct Recharts left/right axes for mixed-unit area and bar charts, removed negative margin coupling, and standardized test IDs for plot, axes, cards, and legend items.
- Updated ranking-chart plot height and documented the contract in `DESIGN_SYSTEM.md`.

### SP5 Deterministic browser fixtures

- Extended `start-for-qa.ts` through existing adapter-validation, observability, and SQLite paths to seed measured, normalized, estimated, unavailable, genuine-zero, explicit-cache, and synthesized-cache rows.
- Replaced ambient and wrapper-only browser checks with rendered `.recharts-yAxis` bounds, tick clipping, legend inset, and balanced plot inset assertions.
- Covered Overview single-axis line, dual-axis cache efficiency, area, bar, Observe dual-axis, and exact request-detail provenance.
- Removed an unrelated fixture-specific `req-` prefix assumption from the runtime shell browser test; the API contract is non-empty request IDs, while dedicated tests assert exact QA IDs.

### SP7 Packaged runtime bootstrap repair

- Reproduced the implementation-commit SEA startup failure on isolated port `3483`.
- Added an optional SEA asset lookup that treats only `ERR_SINGLE_EXECUTABLE_APPLICATION_ASSET_NOT_FOUND` as absent, then reads and decompresses the embedded `.gz` llama-swap asset.
- Preserved fail-fast behavior for every other asset exception.

## TDD Compliance Log

TDD Mode: strict

RED Evidence:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/red/sp1-cache-hash.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/red/sp2-provider-wire-and-usage.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/red/sp3-ledger-provenance.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/red/sp4-chart-layout-contract.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/red/sp5-qa-telemetry-seed.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/red/sp7-sea-asset-fallback.log`

GREEN Evidence:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp1-cache-hash.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp2-provider-wire-and-usage.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp3-ledger-provenance.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp4-chart-design-system.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp5-browser-regressions.log`
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp7-sea-asset-fallback.log`

TDD Compliance: PASS

### SP1 RED-GREEN

- RED: `evidence/logs/red/sp1-cache-hash.log`, `sp1-cache-source.log`, `sp1-cache-source-observation.log` proved missing message-hash fallback, source propagation, and observation truth.
- GREEN: corresponding logs under `evidence/logs/green/` prove canonical hashing, capability gating, explicit authority, final-wire requested state, and persistence source.

### SP2 RED-GREEN

- RED: `evidence/logs/red/sp2-provider-wire-and-usage.log` proved missing Kimi `include_usage`, incomplete nested usage handling, and final-wire cache assertions.
- GREEN: `evidence/logs/green/sp2-provider-wire-and-usage.log` proves top-level, nested stop/tool-calls, non-streamed usage, and Kimi wire behavior.

### SP3 RED-GREEN

- RED: `evidence/logs/red/sp3-usage-schema.log`, `sp3-usage-event.log`, `sp3-request-capture-estimate.log`, `sp3-compatible-normalized-source.log`, `sp3-ledger-provenance.log`, `sp3-host-fallback-provenance.log`, `sp3-request-detail-token-truth.log`, and `sp3-analytics-token-availability.log` proved each missing contract layer before production edits.
- GREEN: matching logs under `evidence/logs/green/` prove schema, type, estimate, persistence, cleanup fallback, UI, and aggregate semantics.

### SP4 RED-GREEN

- RED: `evidence/logs/red/sp4-chart-layout-contract.log`, `sp4-ranking-plot-height.log`, and `sp4-legend-item-selector.log` proved absent shared geometry and stable rendered selectors.
- GREEN: `evidence/logs/green/sp4-chart-layout-contract.log` and `sp4-chart-design-system.log` prove shared line/area/bar layout, mixed axes, legend inset, plot height, and documentation.

### SP5 RED-GREEN

- RED: `evidence/logs/red/sp5-qa-telemetry-seed.log` proved the canonical QA runtime lacked deterministic telemetry cases.
- GREEN: `evidence/logs/green/sp5-qa-telemetry-seed.log` proves canonical persistence; `sp5-browser-regressions.log` proves rendered geometry and provenance.
- The full-suite stale request-prefix failure is retained in `evidence/logs/verification/runtime-ui-browser.log` history through the command rerun; the final log is the passing six-test run.

### SP7 RED-GREEN

- RED: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/red/sp7-sea-asset-fallback.log` proves the real Node SEA missing-asset exception bypassed the compressed fallback.
- GREEN: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp7-sea-asset-fallback.log` proves compressed extraction succeeds while unexpected errors remain fatal.

## Plan Deviations

- The remediation is intentionally broader than the invalid original Phase 3 summary because addenda `01` and `02` require end-to-end provenance through protocol, SQLite, fallback, analytics, and browser surfaces.
- Existing SQLite `dimensions_json` stores additive provenance, avoiding a migration while preserving legacy compatibility.
- Browser geometry uses DOM bounding boxes rather than screenshots as the automated invariant; screenshots remain Phase 5 evidence.

## Implementation Evidence

- R1/R4: SP1 RED/GREEN logs plus host, observability, and SQLite tests.
- R2: SP2 RED/GREEN log plus provider and adapter tests.
- R3/R4: SP3 RED/GREEN logs plus request-detail, analytics, retention, protocol, and ledger tests.
- R5/R6: SP4 RED/GREEN logs plus design-system and chart tests.
- R7/R8: all SP1-SP5 logs and executed Playwright regression log.
- R9: deferred to Phase 5 packaged-runtime QA after Phase 4 and an implementation commit.

## Gaps Found

- None.

## Earlier Phase Reconciliation

- Phase 1.5 and Phase 2 are lock-valid after workflow recovery.
- This receipt replaces the invalidated Phase 3 claims and includes both effective addenda.
- Phase 4 must be reopened and regenerated only after this artifact is locked.

## Subagent Contribution Verification

- No subagent contribution was used.
- Main-agent verification covered the complete diff, focused tests, full package suites, workspace build, and Playwright execution.

## Repair Work Performed

- Production repair spans protocol, adapter, provider, observability, SQLite, host, request-detail, design-system, and shared chart ownership layers.
- Regression repair spans owning unit/integration suites, deterministic QA seeding, and real-browser geometry/provenance assertions.
- Build-generated vendor binaries were restored to baseline and are excluded from the run diff.

## Requirement Completion Status

- R1 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`, `role-model-router/packages/adapter-execution/src/index.ts`, `role-model-router/packages/provider-openai/src/index.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp1-cache-hash.log`, `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp1-cache-source-observation.log`
- R2 | Status: implemented | Changed Files: `role-model-router/packages/adapter-execution/test/index.test.ts`, `role-model-router/packages/provider-openai/test/index.test.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp2-provider-wire-and-usage.log`
- R3 | Status: implemented | Changed Files: `packages/protocol-types/src/generated.ts`, `protocol/fixtures/example-usage-event.json`, `protocol/schemas/usage-event.schema.json`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx`, `role-model-router/packages/runtime-observability/test/index.test.ts`, `role-model-router/packages/sqlite-memory/test/index.test.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp3-usage-schema.log`, `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp3-request-detail-token-truth.log`, `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp3-ledger-provenance.log`
- R4 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp3-analytics-token-availability.log`, `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp3-host-fallback-provenance.log`
- R5 | Status: implemented | Changed Files: `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp4-chart-design-system.log`
- R6 | Status: implemented | Changed Files: `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp4-chart-layout-contract.log`
- R7 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`, `role-model-router/apps/runtime-host-bridge/src/runtime-assets.ts`, `role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp5-qa-telemetry-seed.log`, `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp7-sea-asset-fallback.log`
- R8 | Status: implemented | Changed Files: `role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts`, `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts` | Implementation Evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/sp5-browser-regressions.log`
- R9 | Status: deferred | Rationale: packaged implementation-commit QA belongs to Phase 5 | Deferred By: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md`

## Traceability

- R1 -> SP1 -> host/provider/observability/SQLite/request-detail.
- R2 -> SP2 -> adapter/provider final wire and usage normalization.
- R3/R4 -> SP3 -> protocol through persistence, fallback, analytics, and UI.
- R5/R6 -> SP4/SP5 -> shared design contract and rendered browser geometry.
- R7/R8 -> SP1-SP5 -> strict TDD and deterministic browser regression.
- R9 -> SP7 -> Phase 5 packaged-runtime browser QA.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `11461400640736ab86d9340045bc1f90c102b464`
- Comparison reference: `working-tree`
- Normalized baseline: `11461400640736ab86d9340045bc1f90c102b464`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 11461400640736ab86d9340045bc1f90c102b464`
- Planned or claimed changed files:
  - `packages/protocol-types/src/generated.ts`
  - `protocol/fixtures/example-usage-event.json`
  - `protocol/schemas/usage-event.schema.json`
  - `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/runtime-assets.ts`
  - `role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts`
  - `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `role-model-router/apps/runtime-ui/app/routes/request-detail.test.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - `role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts`
  - `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
  - `role-model-router/packages/adapter-execution/src/index.ts`
  - `role-model-router/packages/adapter-execution/test/index.test.ts`
  - `role-model-router/packages/provider-openai/src/index.ts`
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `role-model-router/packages/runtime-observability/src/index.ts`
  - `role-model-router/packages/runtime-observability/test/index.test.ts`
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - `role-model-router/packages/sqlite-memory/test/index.test.ts`
- Actual changed files reviewed: same as planned or claimed changed files.
- Unexplained drift: none.

## Audit Verdict

Audit: PASS

R1-R8 match the effective requirements and amended plan. The implementation is shared, capability-driven, provenance-preserving, persistence-safe, and protected by owning tests plus real-browser assertions.

## Coverage Gate

- [x] Every R1-R8 production change has preceding RED evidence and passing GREEN evidence.
- [x] Every changed ownership layer has regression coverage.
- [x] Browser tests execute against deterministic canonical QA data.
- [x] Worktree drift is reconciled.
- [x] R9 remains correctly deferred.

Coverage: PASS

## Approval Gate

- [x] Implementation is complete for R1-R8.
- [x] Strict TDD evidence is complete.
- [x] Audit and coverage gates pass.
- [x] Phase 4 may be reopened after this artifact locks.

Approval: PASS
