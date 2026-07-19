Run: `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/`
Phase: `03 Implementation Summary`
Status: `LOCKED`
LockedAt: `2026-07-11T13:25:21Z`
LockHash: `5678712265e1fed05de79fa3e9170e7dbbc51c1427b8e1b1a3aa7fec7f3525fe`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-worktree.md` (LOCKED)
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/01-as-is.md` (LOCKED)
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/02-to-be-plan.md` (LOCKED)
- prior locked implementation/test/QA conclusions reread before this reopen
Outputs:
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/03-implementation-summary.md`
Scope note: Phase 3 was reopened on `2026-07-11` after the audit found remaining `R4`/`R5` gaps. This refresh records only the repair delta needed to bring the telemetry stale-refresh behavior and request-analytics regression coverage back into alignment with the original run requirements. Earlier run-63 implementation for `R1`-`R3` and `R6`-`R7` was preserved unchanged.

## TODO

- [x] Re-read the locked requirements, plan, and prior implementation conclusions
- [x] Add RED regression coverage for the stale-refresh recovery gap
- [x] Add RED behavior-level request-analytics assertions for the under-covered request surface
- [x] Implement the minimal runtime-ui repair delta
- [x] Re-run impacted runtime-ui verification and rebuilt-runtime browser coverage
- [x] Refresh requirement dispositions for the reopened `R4`/`R5` scope

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: worktree-local routed delegation is still blocked because `/.recursive/config/recursive-router-discovered.json` is absent in this worktree and no delegated subagent was validated for this reopen.
Delegation Decision Basis: the repair delta is confined to six runtime-ui files plus run-local evidence/receipts, and the main agent directly verified the changed code, failing tests, passing tests, and rebuilt-runtime browser proof in the same worktree.
Audit Inputs Provided:
- locked run-63 requirements, worktree, AS-IS, and TO-BE plan artifacts
- current runtime-ui helper, route, and Playwright files touched by the reopen
- current RED/GREEN evidence notes under `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/`

## Effective Inputs Re-read

- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/02-to-be-plan.md`
- prior `03-implementation-summary.md`, `03.5-code-review.md`, `04-test-summary.md`, and `05-manual-qa.md` before reopen
- `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`
- `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`

## Changes Applied

### `R4` stale-refresh recovery and diagnostics

Files changed:
- `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`
- `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`

Implementation:
- added `resolveTelemetryChartRefresh()` so stale-chart reuse, current-load stale-chart titles, and degraded error resolution are handled in one shared helper instead of three hand-rolled route branches
- changed all three telemetry routes to consume the shared resolver, replace `staleCharts` per refresh cycle, and therefore clear the stale banner after a later successful refresh
- added the missing `flushStaleRefreshDiagnostics()` call to `/app/observe/requests` so stale-refresh reuse on that surface now emits the same bounded structured diagnostics as dashboard and observe-routing
- expanded the helper test suite from the earlier basic coverage to explicit recovery-path assertions:
  - initial success keeps `staleChartTitles` empty
  - initial partial failure returns chart error state without stale reuse
  - background refresh failure reuses the prior chart response and queues a diagnostic
  - a later successful refresh clears the stale-chart set
  - flush logging emits the queued diagnostic payload

### `R5` request-analytics behavior coverage hardening

Files changed:
- `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`

Implementation:
- strengthened the request-analytics browser coverage to assert the original requirement directly:
  - per-run seeded request rows use unique model ids so the QA runtime’s persistent telemetry history does not make the assertions flaky
  - `/app/observe/requests` now verifies filter changes, query-param restoration after reload, and request-list narrowing through the operator-visible `Model id` control
  - the drill-in scenario now filters to one seeded request first, clicks `Inspect`, and verifies the request-detail surface through the route URL and the `Back to request ledger` affordance
- no additional production route code was needed for `R5`; the gap was insufficient coverage rather than missing runtime behavior

## TDD Compliance Log

TDD Mode: `strict`

RED Evidence:
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/red/runtime-ui-stale-refresh-helper-red.md`

GREEN Evidence:
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/green/runtime-ui-stale-refresh-vitest-green.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/green/runtime-ui-build-green.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/green/runtime-ui-browser-requests-green.md`

### `R4` repair cycle

- RED: the new helper-based recovery tests failed before implementation with `TypeError: ... resolveTelemetryChartRefresh is not a function`
- GREEN: `resolveTelemetryChartRefresh()` was added, the three telemetry routes were moved onto it, and the full runtime-ui Vitest suite passed
- REFACTOR: route-local stale-state bookkeeping was reduced to one shared helper and one per-route ref instead of three accumulating branches

### `R5` coverage repair cycle

- RED: the strengthened request-analytics scenarios were written first and exposed that the old render-only net did not actually prove narrowing/restoration/drill-in behavior in the rebuilt-runtime harness
- GREEN: the scenarios were made deterministic with unique seeded model ids and request-detail-specific locators; the rebuilt-runtime Playwright harness then passed
- REFACTOR: coverage stayed user-visible and avoided implementation-only selectors

## Implementation Evidence

| Evidence | Result |
| --- | --- |
| `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/red/runtime-ui-stale-refresh-helper-red.md` | failing helper regression reproduced before production repair |
| `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/green/runtime-ui-stale-refresh-vitest-green.md` | full runtime-ui Vitest suite green (`311` tests) |
| `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/green/runtime-ui-build-green.md` | runtime-ui production build + typecheck green |
| `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/evidence/logs/green/runtime-ui-browser-requests-green.md` | rebuilt-runtime browser harness green (`4` Playwright tests) |

## Plan Deviations

No plan deviation. The reopen stayed inside the original `R4`/`R5` requirement boundaries and did not touch router-lane, trace/usage, CI, or docs surfaces.

## Traceability

- `R1` remained satisfied by the earlier run-63 router-lane implementation; this reopen changed no router-lane files and preserved that surface unchanged.
- `R2` remained satisfied by the earlier run-63 host-bridge/router-backend implementation; this reopen changed no backend routing files.
- `R3` remained satisfied by the earlier run-63 trace/usage package work; this reopen changed no trace/usage package files.
- `R4` required stale-data UI signal, bounded diagnostics, and route-level recovery coverage. The shared resolver, route integrations, and expanded helper tests now satisfy those specific acceptance points.
- `R5` required behavior-level coverage for filter changes, query-param restoration, request-list narrowing, and request-detail drill-in. The rebuilt-runtime Playwright scenarios now cover each of those behaviors directly.
- `R6` remained satisfied because the reopen added runtime-ui verification without replacing or weakening the broader run-63 verification floor.
- `R7` remained satisfied because the reopen did not alter the previously aligned documentation surfaces.

## Gaps Found

None remain in the reopened `R4`/`R5` scope.

## Repair Work Performed

1. Added a shared telemetry-refresh resolver and moved all three telemetry routes onto it.
2. Fixed the missing stale-refresh diagnostic flush on `/app/observe/requests`.
3. Replaced stale-banner accumulation with current-refresh stale-state replacement so the UI recovers after a successful refresh.
4. Strengthened the request-analytics Playwright scenarios to be deterministic against persisted QA telemetry state.

## Audit Verdict

Audit: PASS

The reopen changed only the files needed to close the audit findings, preserved the original run scope, and re-established direct evidence for the previously under-covered stale-refresh and request-analytics behaviors.

## Earlier Phase Reconciliation

- `00-requirements.md` required stale-refresh diagnostics and visible stale-state signaling (`R4`) plus behavior-level request-analytics coverage with drill-in (`R5`). The original run left recovery-state and request-surface coverage short; this reopen closes those exact gaps.
- `02-to-be-plan.md` explicitly planned route-level stale-refresh tests and rebuilt-runtime request-analytics behavior coverage. The repair delta now matches that plan instead of relying on partial or render-only proof.

## Prior Recursive Evidence Reviewed

- prior `03-implementation-summary.md`
- prior `03.5-code-review.md`
- prior `04-test-summary.md`
- prior `05-manual-qa.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed:
  - compared the reopened runtime-ui diff against the locked requirements and plan
  - verified the new helper/route/spec behavior against actual command output and evidence notes
  - confirmed no delegated output was used
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `fdd1c7cb052a109e4f79ada257b54b54ff7ae17e`
- Comparison reference: `working-tree`
- Normalized baseline: `fdd1c7cb052a109e4f79ada257b54b54ff7ae17e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only fdd1c7cb052a109e4f79ada257b54b54ff7ae17e`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/63-router-backend-regression-and-telemetry-surface-hardening`
- Full run changed-file inventory re-reviewed in this phase:
  - product/workflow/docs/test files:
    - `/.github/workflows/ci.yml`
    - `/docs/architecture/10-runtime-testing-architecture.md`
    - `/docs/operations/04-runtime-testing-matrix.md`
    - `/package.json`
    - `/pnpm-lock.yaml`
    - `/role-model-router/apps/runtime-host-bridge/package.json`
    - `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`
    - `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.test.ts`
    - `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
    - `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
    - `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
    - `/role-model-router/packages/trace/package.json`
    - `/role-model-router/packages/trace/src/index.ts`
    - `/role-model-router/packages/trace/test/index.test.ts`
    - `/role-model-router/packages/trace/vitest.config.ts`
    - `/role-model-router/packages/usage/package.json`
    - `/role-model-router/packages/usage/test/index.test.ts`
    - `/role-model-router/packages/usage/vitest.config.ts`
  - tracked historical evidence byproducts refreshed by the committed shared-surface browser harness:
    - `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence/runtime-batch-2026-07-04/qa-shared-models-role-bindings.png`
    - `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence/runtime-batch-2026-07-04/qa-shared-observe-requests.png`
    - `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence/runtime-batch-2026-07-04/qa-shared-remote-providers.png`
- Reopen-delta product files actually modified in this phase:
  - `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.test.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
  - `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
- Earlier run-63 product files outside the reopen delta were re-read for context and left unchanged while this phase was corrected.

## Requirement Completion Status

- `R1` | Status: implemented | Changed Files: `/package.json`, `/.github/workflows/ci.yml`, `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md`, `/role-model-router/apps/runtime-host-bridge/package.json` | Implementation Evidence: `/package.json`, `/.github/workflows/ci.yml`, `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md`, `/role-model-router/apps/runtime-host-bridge/package.json`
- `R2` | Status: implemented | Changed Files: `/role-model-router/apps/runtime-host-bridge/package.json` | Implementation Evidence: `/role-model-router/apps/runtime-host-bridge/package.json`
- `R3` | Status: implemented | Changed Files: `/pnpm-lock.yaml`, `/role-model-router/packages/trace/package.json`, `/role-model-router/packages/trace/src/index.ts`, `/role-model-router/packages/trace/test/index.test.ts`, `/role-model-router/packages/trace/vitest.config.ts`, `/role-model-router/packages/usage/package.json`, `/role-model-router/packages/usage/test/index.test.ts`, `/role-model-router/packages/usage/vitest.config.ts` | Implementation Evidence: `/pnpm-lock.yaml`, `/role-model-router/packages/trace/test/index.test.ts`, `/role-model-router/packages/usage/test/index.test.ts`, `/role-model-router/packages/trace/src/index.ts`
- `R4` | Status: implemented | Changed Files: `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`, `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx` | Implementation Evidence: `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`, `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- `R5` | Status: implemented | Changed Files: `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts` | Implementation Evidence: `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
- `R6` | Status: implemented | Changed Files: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence/runtime-batch-2026-07-04/qa-shared-models-role-bindings.png`, `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence/runtime-batch-2026-07-04/qa-shared-observe-requests.png`, `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence/runtime-batch-2026-07-04/qa-shared-remote-providers.png`, `/package.json`, `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md`, `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`, `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`, `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx` | Implementation Evidence: `/package.json`, `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md`, `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`, `/role-model-router/apps/runtime-ui/app/lib/stale-refresh-diagnostics.ts`
- `R7` | Status: implemented | Changed Files: `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md` | Implementation Evidence: `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md`

## Audit Gate

- [x] Locked upstream artifacts were re-read from disk
- [x] The reopened diff stays inside the original `R4`/`R5` scope
- [x] RED and GREEN evidence exist for the repair delta
- [x] No unrelated product files were modified during the reopen

Audit: PASS

## TDD Compliance

- [x] A failing helper regression was observed before the production repair
- [x] The minimal production change was implemented after RED
- [x] Reverification stayed green after the shared-helper refactor
- [x] Browser coverage was strengthened to prove the original request-analytics requirement directly

TDD Compliance: PASS

## Coverage Gate

- [x] `R4` stale-refresh recovery, stale-state clearing, and diagnostic flushing are now covered
- [x] `R5` filter narrowing, query-param restoration, and request-detail drill-in are now covered
- [x] Earlier unchanged run-63 requirement surfaces remain preserved

Coverage: PASS

## Approval Gate

- [x] The reopen closes the audit findings without expanding scope
- [x] Runtime-ui verification is green after the repair delta
- [x] Phase 4 can be refreshed from current evidence

Approval: PASS
