Run: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-08T06:26:31Z`
LockHash: `e23509f75a44a98efd6e3fad9d3aae6afc289b5ba4e13e832a0940b7d0b9cdff`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-worktree.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01-as-is.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01.5-root-cause.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.frontend-config-remediation.addendum-03.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
Outputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact converts the locked telemetry/dashboard requirements and remediation addenda into a dependency-ordered implementation and validation plan.

## TODO

- [x] Re-read the requirements, AS-IS baseline, RCA, and addenda
- [x] Choose the telemetry storage/API/design-system sequencing
- [x] Define changed-file expectations and validation order
- [x] Capture TDD, browser QA, and recovery expectations
- [x] Complete the audited sections and gates

## Planned Changes by File

- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `packages/schema-tools/src/validate-schemas.ts`
- `packages/protocol-types/src/generated.ts`

## Implementation Steps

1. Update the runtime UI design-system contract and token usage before route work.
2. Extend storage and bridge APIs so telemetry summary, request ledger, request detail, and SSE freshness read from canonical structured telemetry.
3. Repair runtime-config ownership and zero-endpoint controller handling.
4. Migrate dashboard, requests, and request detail onto the canonical telemetry reads.
5. Refresh generated runtime UI assets after the source changes land.
6. Validate focused tests, runtime validators, browser-backed proof, and honest inherited workspace failures.

## Testing Strategy

- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/validate-vendors.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model/schema-tools exec vitest run test/validate-schemas.test.ts test/generate-protocol-types.test.ts`
- `corepack pnpm run runtime:validate-ui`
- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run types:generate`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run build`
- `corepack pnpm run test`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Browser-backed verification will use the existing `browser-use` plus Edge CDP proof path recorded later under `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/05-manual-qa.md`.

## Manual QA Scenarios

- Verify runtime-config editing, accounts/OAuth, and endpoint activation.
- Verify honest zero-endpoint controller and models states.
- Verify unified telemetry dashboard, ledger, request detail, dark theme, mobile width, and SSE freshness.

## Idempotence and Recovery

- Telemetry query helpers must stay deterministic for the same database contents.
- Runtime validators must remain rerunnable from the real worktree path.
- If SSE disconnects, the bridge must release listeners cleanly and allow fresh subscriptions.
- Raw host/operator surfaces must remain preserved even if the new structured telemetry views fail.

## Implementation Sub-phases

### SP1. Canonical telemetry persistence and schema repair

- Land the flattened telemetry/query and schema-generated-type changes behind failing tests first.

### SP2. Bridge APIs, runtime-config ownership, and zero-endpoint honesty

- Land bridge routes, SSE, runtime-config apply behavior, and zero-endpoint controller behavior behind failing tests first.

### SP3. Design-system-led runtime UI migration and proof refresh

- Land telemetry UI source changes, generated assets, and browser-backed proof on top of the shared design-system work.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01-as-is.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01.5-root-cause.md`

## Traceability

- `R1` -> Planned Changes by File, Implementation Steps, SP1
- `R2` -> Implementation Steps, Testing Strategy
- `R3` -> Planned Changes by File, Implementation Steps, Testing Strategy
- `R4` -> Planned Changes by File, Implementation Steps, SP3
- `R5` -> Implementation Steps, Manual QA Scenarios
- `R6` -> `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01.5-root-cause.md`, Implementation Steps, Manual QA Scenarios
- `R7` -> Testing Strategy, Playwright Plan (if applicable), Manual QA Scenarios

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills were available in this session.
Delegation Decision Basis: `Phase 2 required one controller-owned execution narrative that reconciled requirements, RCA, addenda, TDD order, and validation scope.`
Delegation Override Reason: `Self-audit avoided fragmented planning across tightly coupled storage, bridge, UI, and proof responsibilities.`
Audit Inputs Provided:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-worktree.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01-as-is.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01.5-root-cause.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.frontend-config-remediation.addendum-03.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
Diff Basis: `git diff --name-only 04c74c3958690dfcb7912399300349e6882f4a76`
Worktree: `D:\DEV\role-model\.worktrees\16-router-runtime-unified-telemetry-dashboard`
Audit scope: `implementation planning completeness and sequencing`

## Effective Inputs Re-read

- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-worktree.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01-as-is.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01.5-root-cause.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.frontend-config-remediation.addendum-03.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`

## Earlier Phase Reconciliation

- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01-as-is.md` established the missing canonical telemetry/query/UI baseline.
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01.5-root-cause.md` made the zero-endpoint controller defect an explicit required implementation slice.
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.frontend-config-remediation.addendum-03.md`

## Subagent Contribution Verification

Reviewed Action Records: `none`
Main-Agent Verification Performed:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01-as-is.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/01.5-root-cause.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.frontend-config-remediation.addendum-03.md`
Acceptance Decision: `accepted`
Refresh Handling: `not applicable`
Repair Performed After Verification: `added the missing audited sections, explicit traceability, and the non-Playwright browser-proof plan`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `04c74c3958690dfcb7912399300349e6882f4a76`
- Comparison reference: `working-tree`
- Normalized baseline: `04c74c3958690dfcb7912399300349e6882f4a76`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 04c74c3958690dfcb7912399300349e6882f4a76`
- Planning-phase review covered the current run artifacts and the expected product/supporting path families without claiming product completion in Phase 2.

## Gaps Found

- none; all planning gaps were converted into explicit implementation steps, test expectations, and QA scenarios inside this artifact.

## Repair Work Performed

- Added the missing audited sections, exact diff-basis fields, and planning-phase requirement dispositions expected by the recursive lint profile.

## Requirement Completion Status

- R1 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification work land later in this run. | Scope Decision: `.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md` | Audit Note: Phase 2 defined the implementation path but did not yet ship code.
- R2 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification work land later in this run. | Scope Decision: `.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md` | Audit Note: Phase 2 fixed the parity scope and validation slice, not the implementation itself.
- R3 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification work land later in this run. | Scope Decision: `.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md` | Audit Note: Phase 2 specified the persistence/API/SSE work only.
- R4 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification work land later in this run. | Scope Decision: `.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md` | Audit Note: Phase 2 sequenced design-system-first delivery but did not implement it.
- R5 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification work land later in this run. | Scope Decision: `.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md` | Audit Note: Phase 2 described the unified dashboard/control flows for later implementation.
- R6 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification work land later in this run. | Scope Decision: `.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md` | Audit Note: Phase 2 carried forward the zero-endpoint fix strategy only.
- R7 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification work land later in this run. | Scope Decision: `.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md` | Audit Note: Phase 2 established the validation and QA contract for later phases.

## Coverage Gate

- [x] File-level plan, execution order, tests, and QA scenarios are recorded
- [x] Addenda and RCA were re-read and reconciled
- [x] Diff basis remains aligned with Phase 0

Coverage: PASS

## Approval Gate

- [x] Implementation can proceed without reopening the plan
- [x] Testing and browser-proof expectations are explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan is complete, reconciled with addenda, and ready to drive implementation.
Audit: PASS
