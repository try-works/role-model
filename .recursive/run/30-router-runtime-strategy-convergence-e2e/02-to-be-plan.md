Run: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T20:06:08Z`
LockHash: `fc2268df62361fdd369efccbf1fc62f95acb01adc86e19f883341db82b02a5d9`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-worktree.md`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `ui-design-system` skill guidance
Outputs:
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
Scope note: Defines the implementation plan for run-30 proposal convergence by adding first-class routing-strategy operator surfaces to the design-system-owned runtime UI, exposing routing-mode control and routing receipts in the live shell, and closing the final end-to-end verification gap on top of the already-converged run-29 backend baseline.

## TODO

- [x] Plan the RED tests for the remaining routing-strategy UI and operator gaps
- [x] Plan the design-system-first route, components, and config typing changes
- [x] Plan the workbench routing-mode override control and the request-inspection receipt surfaces
- [x] Plan the final UI-aware end-to-end verification path
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - extend the runtime UI design-system document with the routing-strategy surface, its reading order, the split between structured strategy control and advanced raw JSON editing, and the primary inspection rules for routing receipts
- `/role-model-router/apps/runtime-ui/app/routes.ts`
  - add a dedicated control route for routing strategy so the strategy surface is explicit in the runtime shell instead of being buried inside raw runtime-config editing
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - define the new route metadata, navigation placement, description copy, and template classification for the routing-strategy surface while preserving the existing shell hierarchy
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - add RED coverage for the new route inventory, design-system reading order, and design-document/source assertions proving the routing-strategy surface is part of the repo-owned shell
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
  - add or extend shared UI primitives only if RED proves the current cards, fact rows, and status pills are insufficient for routing-strategy summaries and routing receipts
- `/role-model-router/apps/runtime-ui/app/components/routing-strategy-panels.tsx`
  - create a shared design-system-owned component set for routing-strategy summary cards, strategy-section panels, and routing-receipt rows so workbench and request-detail do not duplicate bespoke markup
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - widen `RuntimeConfig` typing to cover the already-supported backend strategy fields (`modelAliases`, `difficultyClassifier`, `controller`, `observedData`) and add optional routing-mode override support to the workbench submission helper
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - add RED coverage for widened runtime-config round-tripping, preserved unknown strategy fields where needed, and optional `x-role-model-routing-mode` workbench submission behavior
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - add routing-strategy summary helpers for the request ledger and request detail so `routingDecisionId`, effective mode, rewrite, difficulty, controller, and hybrid receipts become first-class display data
- `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - add RED coverage for routing-receipt extraction and summary behavior, including graceful fallback when older requests do not carry the newer diagnostics
- `/role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
  - implement the new structured routing-strategy page with summary cards for execution mode, aliases, difficulty learning, controller posture, and advanced-config handoff
- `/role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
  - keep the raw JSON editor as the advanced or escape-hatch surface, but reposition it behind the new structured strategy view rather than as the only strategy-management page
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
  - add an operator-visible routing-mode selector (`alias default`, `baseline`, `difficulty`, `controller`, `hybrid`) and surface the resulting routing receipts in the result workspace
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
  - extend ledger rows so routing decision id and effective mode are scanable without opening the raw request bundle first
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - promote routing-mode, rewrite, difficulty, controller, and hybrid receipts into the primary request inspection layout ahead of the raw observation bundle
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
  - extend the existing UI validator so it proves the runtime UI control plane can round-trip proposal-critical routing-strategy config and that request-inspection data still exposes the expected routing receipts after the UI convergence changes

## Implementation Steps

1. Write RED tests first in `design-system.test.ts`, `runtime-api.test.ts`, and `view-models.test.ts` for the routing-strategy route, structured config typing, workbench routing-mode override support, and first-class routing receipt summaries.
2. Update `DESIGN_SYSTEM.md` and `design-system.ts` so the routing-strategy surface exists as an explicit repo-owned design-system artifact before route implementation begins.
3. Add a dedicated `Control > Routing strategy` route rather than overloading the advanced raw config page. Keep `Control > Runtime config` as the advanced JSON editor and link the two surfaces together.
4. Model the structured routing-strategy page around existing backend truth rather than inventing new contracts:
   - execution mode
   - alias ids and alias routing modes
   - difficulty-classifier posture
   - observed-data difficulty-learning thresholds for recommendation and override
   - controller assignment and controller config posture
   - advanced raw-config handoff
5. Prefer shared design-system-owned panels or summary components so the strategy view, workbench results, and request detail use the same receipt presentation language.
6. Widen the runtime UI API layer so `RuntimeConfig` reflects the backend strategy fields already present in the live control plane and `submitWorkbenchChat(...)` can optionally send `x-role-model-routing-mode`.
7. Update the workbench so the operator can:
   - keep alias default behavior by sending no override header
   - explicitly send `baseline`, `difficulty`, `controller`, or `hybrid`
   - inspect the returned routing receipts without leaving the workspace
8. Update the Observe surfaces so the primary reading order includes:
   - routing decision id
   - effective routing mode and override provenance
   - rewrite applied or skipped
   - difficulty routing outcome
   - controller routing outcome
   - hybrid arbitration receipt when present
9. Keep the raw observation bundle and raw runtime-config JSON as secondary escape hatches rather than deleting them; older or more complex records must still be inspectable even when structured panels do not cover every field.
10. Extend `runtime:validate-ui` so it verifies the strategy-control surface against real control-plane data and proves the proposal-critical UI/operator paths still work on the live runtime.
11. Re-run focused runtime UI and runtime validators, then complete the implementation, validation, and manual-QA receipts only after the design-system-first UI convergence work is green.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add design-system tests that fail until the routing-strategy route exists in the runtime shell and is documented as a first-class design-system surface
  - add runtime-api tests that fail until the UI can round-trip backend strategy config and optionally send `x-role-model-routing-mode` on workbench requests
  - add view-model tests that fail until request rows and request-detail helpers surface routing decision id, routing mode, rewrite, and hybrid or controller or difficulty receipts as structured summary data
  - extend the UI validator so it fails until the runtime UI surfaces and control-plane reads prove the routing-strategy path is operable
- GREEN plan:
  - implement the routing-strategy route, shared panels, workbench control, request-inspection summaries, and validator changes only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run schemas:validate`

## Playwright Plan (if applicable)

- not applicable; the repo already owns non-browser runtime validators and route-render or API-level Vitest coverage, so run 30 should extend those existing surfaces instead of introducing a new browser harness

## Manual QA Scenarios

1. Open `Control > Providers`, confirm Moonshot or Kimi onboarding still works, and confirm the configured endpoint remains visible in `Control > Endpoints`.
2. Open `Control > Routing strategy` and confirm the page shows execution mode, alias routing posture, difficulty-learning thresholds, controller posture, and a link to the advanced raw runtime-config editor.
3. Open `Studio > Chat`, submit the same alias request five ways:
   - alias default (no override)
   - explicit `baseline`
   - explicit `difficulty`
   - explicit `controller`
   - explicit `hybrid`
4. Confirm the workbench result workspace surfaces the effective routing mode and the key routing receipts returned by the runtime.
5. Open `Observe > Requests` and confirm recent rows now show routing decision metadata at scan speed rather than hiding it behind raw bundles only.
6. Open a request in `Observe > Requests > detail` and confirm routing mode, rewrite applied or skipped, difficulty, controller, and hybrid receipts appear before the raw observation JSON.
7. Open `Control > Runtime config` and confirm the advanced raw editor remains available and still reflects the live config without dropping strategy fields not edited in the structured surface.

## Idempotence and Recovery

- Alias-default workbench execution must send no override header so the existing alias behavior remains additive and backward-compatible.
- Structured routing-strategy controls must round-trip through the existing runtime-config API without silently dropping unknown or currently unmodeled config fields.
- Request-ledger and request-detail summaries must degrade gracefully when older records lack `routingDecisionId`, `routingMode`, `rewrite`, or `hybridArbitration`.
- The advanced raw runtime-config page remains the explicit fallback path for fields not yet covered by the structured strategy surface.
- UI convergence must stay on top of the existing run-29 backend contract rather than inventing a parallel strategy implementation in the frontend.

## Implementation Sub-phases

### `SP1` Design-system-first routing-strategy surface

- add RED tests for the route inventory and design-system document
- update `DESIGN_SYSTEM.md`, `routes.ts`, and `design-system.ts`
- create the dedicated `Control > Routing strategy` route and shared strategy-panel components

### `SP2` Runtime API and config-shape convergence

- add RED tests for widened `RuntimeConfig` typing and workbench override submission
- update `runtime-api.ts` to expose the already-supported backend strategy config fields
- keep raw runtime-config editing available as the advanced surface

### `SP3` Workbench routing-mode control

- add RED tests for optional override-header behavior
- add the routing-mode selector and result receipts in `workbench.tsx`
- ensure alias-default sends no header while explicit modes send deterministic values

### `SP4` Request-ledger and request-detail routing receipts

- add RED view-model coverage for routing decision summaries
- update `requests.tsx` and `request-detail.tsx` so routing receipts become first-class inspection data
- preserve the raw bundle as secondary debugging context

### `SP5` UI-aware convergence proof

- extend `runtime:validate-ui` to exercise the routing-strategy surface and UI control-plane assumptions
- run focused UI plus runtime validators
- capture final evidence that the operator can configure, override, and inspect routing strategy through the runtime shell on top of the already-green backend

## Prior Recursive Evidence Reviewed

- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/04-test-summary.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/05-manual-qa.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 2 planning needed one coherent mapping from the locked Phase 1 findings to exact runtime-ui, UI-validator, and shared design-system changes without reopening already-solved backend routing work.`
- Delegation Override Reason: `The remaining gap is a cross-cutting operator/UI convergence slice that depends on already-read coupled runtime-ui and validator surfaces, so controller-owned planning is less error-prone than splitting the design-system, API, and inspection work across delegated fragments.`
- Audit Inputs Provided:
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-worktree.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/01-as-is.md`
  - `/.recursive/RECURSIVE.md`
  - `ui-design-system` skill guidance

## Effective Inputs Re-read

- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-worktree.md`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `ui-design-system` skill guidance

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan accepts the Phase 1 conclusion that backend proposal convergence is largely already complete and narrows Phase 3 to the remaining operator/UI and final verification gap rather than reopening run-29 backend logic.
- `00-worktree.md`: the plan stays inside the isolated run-30 worktree and the baseline captured from committed run-29 commit `1674e72b616d91c903f8f6f7fb0856d2d9fe1996`.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each remaining requirement to exact runtime-ui and validator files rather than reopening broad backend routing packages
  - kept the design-system-first step explicit by planning route, docs, and shared panel work before feature-screen behavior
  - checked that the validation set covers structured UI config, workbench override control, request-inspection receipts, and live runtime verification
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `1674e72b616d91c903f8f6f7fb0856d2d9fe1996`
- Comparison reference: `working-tree`
- Normalized baseline: `1674e72b616d91c903f8f6f7fb0856d2d9fe1996`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 1674e72b616d91c903f8f6f7fb0856d2d9fe1996`
- Base branch: `recursive/29-router-runtime-request-rewriter-hybrid-mode`
- Worktree branch: `recursive/30-router-runtime-strategy-convergence-e2e`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `/role-model-router/apps/runtime-ui/app/routes.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
  - `/role-model-router/apps/runtime-ui/app/components/routing-strategy-panels.tsx`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/03-implementation-summary.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/04-test-summary.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/05-manual-qa.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/06-decisions-update.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/07-state-update.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-worktree.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/01-as-is.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-init.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-runtime-validate-host.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-runtime-validate-ui.log`
  - `/.recursive/run/30-router-runtime-strategy-convergence-e2e/evidence/logs/green/phase0-post-baseline-status.log`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface so run 30 focuses on operator/UI convergence and final proposal proof on top of the already-implemented run-29 backend, instead of reopening broader routing-engine work

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans the explicit proposal-convergence UI and verification work; the final integrated audit and any remaining repairs still depend on Phase 3 and later validation phases. | Blocking Evidence: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans the operator-facing convergence work needed to make the already-integrated backend runtime usable and inspectable as one system. | Blocking Evidence: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: Phase 2 only plans the design-system-first routing-strategy surface, workbench override control, and request-inspection receipt panels; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: Phase 2 only plans the final convergence hardening loop and validator extensions; no run-30 repair cycle has executed yet. | Blocking Evidence: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: Phase 2 only plans the UI-aware end-to-end verification flow that ties runtime strategy control to operator-visible receipts. | Blocking Evidence: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests, implementation, and final integrated verification remain pending Phase 3 and later audited phases. | Blocking Evidence: `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, design-system-first, TDD-first, and narrow enough to close the remaining run-30 operator/UI convergence gap without reopening already-converged run-29 backend routing work.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP5`
- `R2` -> `SP2`, `SP3`, `SP4`, `SP5`
- `R3` -> `SP1`, `SP2`, `SP3`, `SP4`
- `R4` -> `SP5`
- `R5` -> `SP3`, `SP4`, `SP5`
- `R6` -> `SP1`, `SP2`, `SP3`, `SP4`, `SP5`

## Coverage Gate

- [x] Every in-scope requirement has a concrete implementation and validation plan
- [x] The plan identifies the exact RED test surfaces, runtime-ui files, validator seams, and fallback boundaries
- [x] The plan is specific enough to execute strict Phase 3 TDD without reopening run scope

Coverage: PASS

## Approval Gate

- [x] The Phase 2 plan is specific enough for implementation
- [x] No unresolved design blocker remains for starting strict Phase 3 TDD

Approval: PASS
