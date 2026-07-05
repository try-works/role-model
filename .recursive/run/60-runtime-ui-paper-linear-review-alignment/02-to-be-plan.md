Run: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/`
Phase: `02 TO-BE Plan`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-worktree.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/root.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/theme.ts`
- `role-model-router/apps/runtime-ui/app/lib/theme.test.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
- `role-model-router/apps/runtime-ui/app/components/themed-select.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `role-model-router/apps/runtime-ui/playwright.config.ts`
- `role-model-router/apps/runtime-ui/e2e/runtime-shell.spec.ts`
- `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
Outputs:
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/02-to-be-plan.md`
Scope note: This artifact defines the design-system-first execution plan for replacing the Apple-style runtime UI contract with the Paper Linear review system, then updating shipped runtime pages and verifying the rebuilt runtime through strict TDD and browser/E2E regression checks.
TDD Mode: `strict`
Status: `LOCKED`
LockedAt: `2026-07-02T12:31:14Z`
LockHash: `8d1fca13cf5098eb5c7d83db82d2eaf7c3be0f247b5862e255e5619c52074165`

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed sub-agent tooling in the current environment, but no delegation was required for this planning artifact.
Delegation Decision Basis: The Phase 2 plan can be assembled directly from the locked requirements, locked AS-IS findings, and current repo code.
Delegation Override Reason: The user approved implementation in the worktree and did not ask for delegated planning.
Audit Inputs Provided:
- locked run-60 requirements, worktree, and AS-IS artifacts
- current shared runtime-ui code inventory
- rebuilt-runtime QA harness
- current telemetry graph-matrix authority

## TODO

- [x] Convert Phase 1 findings into a design-system-first execution sequence
- [x] Map each requirement to code ownership and verification
- [x] Define strict-TDD implementation slices
- [x] Define rebuilt-runtime, E2E, and browser verification owners
- [x] Define graph-selection rules and expected Recharts ownership
- [x] Audit the plan for recursive-mode lock readiness

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed sub-agent tooling in the current environment, but no delegation was required for this planning artifact.
- Delegation Decision Basis: The Phase 2 plan can be assembled directly from the locked requirements, locked AS-IS findings, and current repo code.
- Delegation Override Reason: Sub-agent tooling was available, but the planning surface was fully local to the worktree and direct controller authorship keeps traceability simpler for this run.
- Audit Inputs Provided:
  - locked run-60 requirements, worktree, and AS-IS artifacts
  - current shared runtime-ui code inventory
  - rebuilt-runtime QA harness
  - current telemetry graph-matrix authority
- Phase purpose: turn the locked requirements and AS-IS drift inventory into a file-by-file implementation plan before any run-60 product changes begin.
- Audit method:
  - reread the locked run-60 artifacts
  - derive the mandatory design-system-first sequencing from Phase 1 findings
  - map each planned slice to tests, builds, E2E, and rebuilt-runtime browser verification
  - repair format/traceability issues before lock

## Effective Inputs Re-read

- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-worktree.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- shared runtime-ui code and test files listed under `Inputs`
- `playwright.config.ts`
- `start-for-qa.ts`
- `11-runtime-ui-telemetry-graph-matrix.md`

## Planned Outcome

Run 60 will:

1. replace the repo-owned Apple styling authority with the Paper Linear review design-system authority
2. replace the shared token, text-style, pill, shell, and control grammar in code
3. preserve the existing Recharts-based telemetry architecture while re-auditing chart choice by data semantics
4. migrate runtime pages route family by route family onto the new shared system
5. prove the rebuilt runtime still works through unit, build, Playwright, and browser verification on the actual rebuilt QA stack

## Requirement Mapping

- `R0` | Coverage: `direct` | Implementation Surface: design-system-first sequence below | Verification Surface: Phase 3 TDD receipts and commit ordering
- `R1` | Coverage: `direct` | Implementation Surface: `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | Verification Surface: shared design-system tests and doc assertions
- `R2` | Coverage: `direct` | Implementation Surface: `app.css`, `root.tsx`, `app/lib/design-system.ts`, `app/lib/theme.ts`, shared tests | Verification Surface: `design-system.test.ts`, `theme.test.ts`, build
- `R3` | Coverage: `direct` | Implementation Surface: shared primitives and route consumers that currently bypass or encode stale grammar | Verification Surface: component tests and route assertions
- `R4` | Coverage: `direct` | Implementation Surface: `app-shell.tsx`, `theme-toggle.tsx`, `page-primitives.tsx`, `themed-select.tsx` | Verification Surface: shared-component tests plus rebuilt-runtime browser proof
- `R5` | Coverage: `direct` | Implementation Surface: runtime page route batches listed below | Verification Surface: route tests, Playwright, browser QA
- `R5A` | Coverage: `direct` | Implementation Surface: `telemetry-charts.tsx`, `telemetry-charts.test.tsx`, supporting shared chart config, graph-matrix doc if needed | Verification Surface: chart tests and chart-heavy browser QA
- `R6` | Coverage: `direct` | Implementation Surface: route-family adoption after shared token/primitives replacement | Verification Surface: mixed unit/E2E/browser checks per batch
- `R7` | Coverage: `direct` | Implementation Surface: route consumers plus telemetry chart/state preservation | Verification Surface: chart tests, rebuilt-runtime QA
- `R8` | Coverage: `direct` | Implementation Surface: test files, Playwright spec, browser QA receipts | Verification Surface: unit/build/E2E/browser logs and screenshots

## Planned Changes by File

- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - replace Apple contract with Paper Linear contract
- `role-model-router/apps/runtime-ui/app/app.css`
  - replace shared light/dark tokens and text-style CSS roots
- `role-model-router/apps/runtime-ui/app/root.tsx`
  - align theme bootstrap meta colors and font loading with the new authority
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - replace shared token metadata, text roles, nav/control classes, pill/button helpers, and shell constants
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - replace Apple-baseline assertions with Paper Linear assertions
- `role-model-router/apps/runtime-ui/app/lib/theme.ts`
  - align browser chrome theme colors with the new token authority
- `role-model-router/apps/runtime-ui/app/lib/theme.test.ts`
  - update expected browser theme colors
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
  - align shell hierarchy, header, and content-container behavior
- `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
  - align shared text, pill, card, and structural container grammar
- `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx`
  - replace text toggle with icon-based toggle aligned to shell content edge
- `role-model-router/apps/runtime-ui/app/components/themed-select.tsx`
  - align select styling to shared Paper token grammar
- `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx`
  - align control styling to shared token/text system
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
  - align chart styling and any chart-choice helper usage to the new system
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - assert chart semantics and shared styling behaviors
- route files under `role-model-router/apps/runtime-ui/app/routes/**`
  - adopt the new shared primitives and remove stale route-local drift
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
  - update only if chart semantics/ownership notes materially change

## Implementation Steps

1. Update the repo-owned design-system document and shared tests so the old Apple baseline fails on purpose.
2. Replace root tokens, theme helpers, and text-style authority.
3. Replace shared shell, toggle, pill, and control primitives.
4. Replace shared chart styling and re-audit graph choices.
5. Migrate runtime page families in bounded batches.
6. Expand E2E coverage and run rebuilt-runtime browser verification.

## Implementation Sub-phases

### `SP1` Shared authority and tests (`R1`, `R2`)

Goal:
Replace the active repo-owned design-system contract and make the old shared assertions fail first.

RED-first work:
- update `design-system.test.ts` and `theme.test.ts` to assert the new Paper Linear authority

Production changes:
- update `DESIGN_SYSTEM.md`
- update `design-system.ts`
- update `theme.ts`
- update `app.css`
- update `root.tsx`

Exit criteria:
- Apple-baseline tests are gone
- shared tokens and text roles reflect the new authority

### `SP2` Shared shell, toggle, pills, and controls (`R2`, `R3`, `R4`, `R6`)

Goal:
Move the shell and primitive vocabulary to the new shared system before touching route layouts.

RED-first work:
- add/update shared component assertions for:
  - icon toggle
  - solid token-backed pills
  - shell/header/content-container rules
  - text-style roles

Production changes:
- `app-shell.tsx`
- `page-primitives.tsx`
- `theme-toggle.tsx`
- `themed-select.tsx`
- `telemetry-controls.tsx`

Exit criteria:
- runtime shell and shared primitives match the new system
- routes can consume those primitives without local overrides

### `SP3` Shared chart styling and chart-choice audit (`R5A`, `R7`, `R8`)

Goal:
Preserve Recharts ownership while aligning chart styling and making graph selection explicitly semantically justified.

RED-first work:
- update `telemetry-charts.test.tsx` for new styling and any chart-choice helpers

Production changes:
- `telemetry-charts.tsx`
- supporting shared chart helpers if introduced
- optional graph-matrix doc update

Exit criteria:
- all changed chart surfaces remain Recharts-backed
- chart types remain fit for their data semantics

### `SP4` Overview and Models batch (`R5`, `R6`, `R7`, `R8`)

Goal:
Adopt the shared system on high-visibility pages first.

Primary files:
- `dashboard.tsx`
- `control-models.tsx`
- `control-roles.tsx`
- `control-benchmark.tsx`

Exit criteria:
- overview, configured models, roles, and benchmark pages follow the new shared system

### `SP5` Router and Observe batch (`R5`, `R5A`, `R6`, `R7`, `R8`)

Primary files:
- `router.tsx`
- `control-routing-strategy.tsx`
- `control-controller.tsx`
- `router-config.tsx`
- `router-candidates.tsx`
- `router-decisions.tsx`
- `router-decision-detail.tsx`
- `requests.tsx`
- `request-detail.tsx`
- `observe-routing.tsx`
- `observe-activity.tsx`
- `observe-logs.tsx`

Exit criteria:
- shell/content-container fixes hold on complex pages
- chart-heavy pages and ledger/detail pages align to the new system

### `SP6` Connect, System, Local, Remote, and Studio batch (`R5`, `R6`, `R8`)

Primary files:
- `endpoints.tsx`
- `integrations-downstream.tsx`
- `integrations-upstream.tsx`
- `runtime.tsx`
- `control-runtime-config.tsx`
- `session-readiness.tsx`
- `system-peers.tsx`
- local route files
- `providers.tsx`
- studio route files

Exit criteria:
- remaining route families consume the new shared tokens and text styles

## Testing Strategy

- `TDD Mode: strict`
- Every production slice must have a RED test or failing assertion first.
- Required floor:
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
  - focused RED/GREEN runs for changed unit/component files
  - `corepack pnpm --filter @role-model-router/runtime-ui test:browser`
- Focused test owners:
  - `design-system.test.ts` for shared authority and route metadata assertions
  - `theme.test.ts` for browser chrome colors
  - `page-primitives.test.tsx` for pill/text/container rules
  - `telemetry-charts.test.tsx` for Recharts/styling/semantic chart behavior
  - Playwright for rebuilt runtime route regression

## Playwright Plan (if applicable)

Playwright is applicable and mandatory because the user required rebuilt-runtime and E2E regression verification.

Base path:

- runtime-ui build via `playwright.config.ts`
- QA runtime host via `apps/runtime-host-bridge/scripts/start-for-qa.ts`
- browser base URL `http://127.0.0.1:3462`

Planned browser-critical flows:

1. shell navigation and theme toggle render and remain usable
2. configured models inspect flow still works
3. at least one chart-heavy page renders with updated shared charts
4. at least one router page and one detail/ledger page remain functional

## Manual QA Scenarios

1. Rebuild the runtime UI and launch the rebuilt QA runtime path.
2. Verify shell chrome, sidebar/header hierarchy, and theme toggle on Overview.
3. Verify one representative page from each changed route family.
4. Verify at least one chart-heavy page for graph readability and semantic fit.
5. Verify one configuration-heavy page for controls/forms/selects.
6. Verify one detail or ledger page for typography and drill-in behavior.
7. Capture screenshots from the rebuilt runtime, not a design-only preview.

## Idempotence and Recovery

- Shared token replacement must remain centralized so later route edits do not need to duplicate values.
- Chart-state semantics from the backend must remain intact even when styling changes.
- If a route family proves too unstable after a shared change, revert only that new slice in the worktree and re-enter through RED, not by bypassing the shared system.

## Earlier Phase Reconciliation

- Phase 1 proved that the shared system, not just route markup, is the real blocker.
- Phase 1 also confirmed that the rebuilt-runtime QA harness already exists, so this plan adopts that path instead of inventing a parallel preview-only workflow.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md`
- `/.recursive/memory/MEMORY.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed:
  - verified no delegated planning artifacts were created
  - performed the Phase 2 mapping directly from locked run-60 inputs
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `ee62dcf508ef47c2a1b1ac6ace8affa3caee6ae0`
- Comparison reference: `working-tree`
- Normalized baseline: `ee62dcf508ef47c2a1b1ac6ace8affa3caee6ae0`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only ee62dcf508ef47c2a1b1ac6ace8affa3caee6ae0`
- Diff basis used: `git diff --name-only ee62dcf508ef47c2a1b1ac6ace8affa3caee6ae0`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/60-runtime-ui-paper-linear-review-alignment`
- Planned or claimed changed files:
  - `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/02-to-be-plan.md`
- Actual changed files reviewed:
  - none in tracked product code for this planning phase
- Untracked run-owned files reviewed:
  - `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/02-to-be-plan.md`
- Unexplained drift:
  - none for this phase

## Gaps Found

- none; after repair, this Phase 2 artifact has no unresolved recursive-mode audit gaps blocking lock

## Repair Work Performed

- Replaced the earlier freeform plan with the recursive audited-phase structure required by the lock validator.
- No product code was changed in this phase.

## Requirement Completion Status

- R0 | Status: deferred | Rationale: this plan makes the design-system-first order explicit; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R1 | Status: deferred | Rationale: shared design authority replacement begins in `SP1`. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R2 | Status: deferred | Rationale: shared token/theme/text replacement begins in `SP1`. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R3 | Status: deferred | Rationale: shared primitive consolidation begins in `SP2`. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R4 | Status: deferred | Rationale: shell/toggle alignment begins in `SP2`. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R5 | Status: deferred | Rationale: route-family adoption begins in `SP4` through `SP6`. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R5A | Status: deferred | Rationale: shared chart-style and chart-choice work begins in `SP3`.
- R6 | Status: deferred | Rationale: stale route-local cleanup happens during route-family adoption after shared-system changes. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R7 | Status: deferred | Rationale: truthful telemetry semantics are preserved while chart/page styling is migrated in later phases. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- R8 | Status: deferred | Rationale: expanded tests, Playwright, and rebuilt-runtime browser QA happen after implementation slices land. | Deferred By: `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`

## Audit Verdict

Audit: PASS

## Traceability

- `R0` -> `## Implementation Steps`, `## Requirement Mapping`, `## Requirement Completion Status`
- `R1` -> `SP1`, `## Planned Changes by File`, `## Testing Strategy`
- `R2` -> `SP1`, `SP2`, `## Planned Changes by File`, `## Testing Strategy`
- `R3` -> `SP2`, `## Planned Changes by File`, `## Testing Strategy`
- `R4` -> `SP2`, `## Playwright Plan (if applicable)`, `## Manual QA Scenarios`
- `R5` -> `SP4`, `SP5`, `SP6`, `## Manual QA Scenarios`
- `R5A` -> `SP3`, `## Testing Strategy`, `## Manual QA Scenarios`
- `R6` -> `SP2`, `SP4`, `SP5`, `SP6`
- `R7` -> `SP3`, `SP4`, `SP5`, `## Idempotence and Recovery`
- `R8` -> `## Testing Strategy`, `## Playwright Plan (if applicable)`, `## Manual QA Scenarios`

## Coverage Gate

- Effective inputs reviewed:
  - locked run-60 requirements, worktree, and AS-IS artifacts
  - shared runtime-ui code, tests, QA harness, and graph-matrix doc listed under `Inputs`
- Requirement coverage check:
  - `R0` through `R8` are each covered in `## Requirement Mapping`, `## Requirement Completion Status`, and `## Traceability`
- Out-of-scope confirmation:
  - no product implementation started in Phase 2
  - no Paper file editing was performed

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - implementation order is concrete and design-system-first
  - strict-TDD slices are concrete
  - rebuilt-runtime, E2E, and browser verification paths are concrete
  - graph-selection rules are concrete enough to begin implementation
- Remaining blockers:
  - none for proceeding to Phase 3

Approval: PASS
