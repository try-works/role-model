Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `05 Manual QA`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-worktree.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/04-test-summary.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md` (DRAFT)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md` (DRAFT)
Outputs:
- This file.

Scope note: Records the manual QA verification steps and results for the telemetry surface integrity fix run, confirming the rebuilt-runtime browser behavior for cache-key synthesis, token provenance, chart layout contract, and dual-axis rendering.

## TODO

- [ ] Complete workflow recovery and the implementation remediation plan in addendum `02`
- [ ] Relock repaired Phase 3 and Phase 4 artifacts in order
- [ ] Rebuild the runtime from worktree sources on a non-`:3456` port
- [ ] Verify prompt-cache synthesis in request receipts
- [ ] Verify token provenance labels on request detail
- [ ] Verify chart layout contract (no negative left margin, legend aligned)
- [ ] Verify dual-axis rendering on area and bar charts
- [ ] Verify existing telemetry surfaces still populate correctly
- [ ] Record results and screenshots
- [ ] Complete user sign-off

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: No subagent CLI or model route is configured in the current worktree.
- Delegation Decision Basis: Manual QA is inherently an operator-executed phase; the scenarios are documented here for operator execution.
- Delegation Override Reason: N/A
- Audit Inputs Provided:
  - All locked phase artifacts `00-requirements.md` through `04-test-summary.md`

## Effective Inputs Re-read

- `02-to-be-plan.md` (LOCKED) defines the Manual QA Scenarios section with specific verification targets.
- `03-implementation-summary.md` (LOCKED) documents the changed files and TDD evidence paths, but audit addendum `01` identifies invalid strict-TDD and completion claims.
- `04-test-summary.md` (LOCKED) records focused package results, but audit addendum `01` identifies an unexecuted and currently failing R8 browser regression path.
- `05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md` records blocking findings `A73-01` through `A73-08`.
- `05-manual-qa.upstream-gap.02-to-be-plan.addendum-02.md` defines workflow recovery, strict-TDD repair, Phase 4 reverification, and rebuilt-runtime QA.
- R9 (rebuilt-runtime browser verification) is the primary objective of this phase.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/02-to-be-plan.md` (LOCKED): Manual QA Scenarios section
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/03-implementation-summary.md` (LOCKED): changed files and evidence
- Prior run 65: rebuilt-runtime verification discipline and non-`:3456` port requirement
- The Phase 5 audit found contradictions between Phase 3/4 completion claims and the implementation/test evidence. Both addenda are authoritative effective inputs until remediation is complete.

## Earlier Phase Reconciliation

- Phase 5 is blocked by audit findings `A73-01` through `A73-08`.
- Phase 2 must be reopened so the missing root-cause gate and amended plan can be reconciled.
- Phase 3 and Phase 4 must then be reopened, repaired, audited, and relocked in order before QA resumes.
- No Phase 5 scenario result may be recorded as passing from the failed source-based Playwright audit run.

## QA Execution Record

### Environment

- Runtime built from worktree: `D:/DEV/role-model/.worktrees/73-telemetry-surface-integrity-contract-fix/`
- Port: Non-`:3456` as required by run constraints
- Browser: Chromium-based (Playwright target)
- Runtime state root: Fresh `state/` directory or existing persisted state

### QA Execution Status

QA Execution Mode: human

**Status**: BLOCKED — rebuilt runtime has not been started, and the audit addenda require implementation and automated-test remediation before operator execution.

## QA Scenarios and Results

### Scenario 1: Prompt-cache synthesis in receipts

**Precondition**: Runtime running with Kimi (`moonshot/kimi-k2.7-code`) configured and routable.
**Steps**:
1. Send a chat request through the runtime without explicit `prompt_cache_key` but with `session_id` set.
2. Navigate to request detail for the resulting request.
3. Verify the receipt shows `promptCache` with `source: "synthesized"` and a key derived from `session_id`.
4. Send a second request with explicit `prompt_cache_key`.
5. Verify the receipt shows `source: "explicit"`.

**Expected Result**: Synthesized keys carry `source: "synthesized"`, explicit keys carry `source: "explicit"`.
**Actual Result**: PENDING
**Status**: PENDING

### Scenario 2: Token provenance on request detail

**Precondition**: Runtime running. At least one request routed through an OpenAI-compatible provider.
**Steps**:
1. Navigate to `/app/requests` and select a completed request.
2. Observe the Tokens fact card.
3. Verify `source: measured` appears when provider returns usage.
4. For providers without usage data, verify `source: estimated` appears with non-zero token counts.

**Expected Result**: `source` provenance field visible in the Tokens detail section.
**Actual Result**: PENDING
**Status**: PENDING

### Scenario 3: Chart layout contract (no negative left margin)

**Precondition**: Runtime running with telemetry data from recent requests.
**Steps**:
1. Navigate to `/app/observe` and observe the telemetry charts.
2. Inspect chart container CSS to verify no `left: -18px` negative margin.
3. Verify chart legend is positioned inside the chart area (not overlapping axes).

**Expected Result**: No negative margin applied. Legend positioned within chart bounds.
**Actual Result**: PENDING
**Status**: PENDING

### Scenario 4: Dual-axis rendering on area and bar charts

**Precondition**: Runtime running with telemetry data.
**Steps**:
1. Navigate to `/app/observe` and find a split-axis chart (e.g., Cache Efficiency with absolute tokens + rate).
2. Verify both left and right Y-axes are visible.
3. Verify axis labels correspond to correct metrics.

**Expected Result**: Both Y-axes render with correct labels and scales.
**Actual Result**: PENDING
**Status**: PENDING

### Scenario 5: Existing telemetry surfaces still populate

**Precondition**: Runtime running with existing state containing telemetry data.
**Steps**:
1. Navigate to view models, router, providers, and observe routes.
2. Verify all tables populate with data.
3. Verify no console errors related to chart rendering or token parsing.

**Expected Result**: All routes load without errors. No regressions on existing surfaces.
**Actual Result**: PENDING
**Status**: PENDING

## Evidence and Artifacts

- Package test passes: `04-test-summary.md` (LOCKED)
- TDD GREEN evidence: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/evidence/logs/green/` (4 files)
- Playwright test source: `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
- Screenshots: PENDING (to be captured during rebuilt-runtime browser verification)

## User Sign-Off

- Approved by: PENDING
- Date: PENDING
- [ ] Scenario 1: Prompt-cache synthesis verified
- [ ] Scenario 2: Token provenance verified
- [ ] Scenario 3: Chart layout contract verified
- [ ] Scenario 4: Dual-axis rendering verified
- [ ] Scenario 5: Existing telemetry surfaces verified
- [ ] Overall QA passed
- [ ] Operator: ________ Date: ________

## Traceability

- Scenario 1 → R1 (prompt-cache synthesis and provenance)
- Scenario 2 → R2 (nested usage normalization), R3 (token provenance rendering), R4 (ownership preservation — truthful usage feeds cacheHitTokenRate)
- Scenario 3 → R5/R6 (shared chart layout contract and geometry)
- Scenario 4 → R5/R6 (dual-axis support)
- Scenario 5 → R7 (no existing test regression), R8 (no regression on existing surfaces)
- R9 closure → All scenarios passed

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `11461400640736ab86d9340045bc1f90c102b464`
- Comparison reference: `working-tree`
- Normalized baseline: `11461400640736ab86d9340045bc1f90c102b464`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 11461400640736ab86d9340045bc1f90c102b464`
- Planned or claimed changed files: same as prior phases
- Actual changed files reviewed: same as prior phases
- Unexplained drift: none

## Audit Verdict

Audit: FAIL

Manual verification has not been executed, and implementation findings `A73-01` through `A73-08` block Phase 5.

## Coverage Gate

- [ ] All 5 QA scenarios executed with results recorded.
- [ ] R9 is closed when all scenarios pass.
- [ ] Operator sign-off marks QA complete.

Coverage: FAIL

Implementation remediation, automated browser verification, rebuilt-runtime execution, and operator sign-off remain incomplete.

## Approval Gate

- [ ] QA execution complete.
- [ ] No regressions found.
- [ ] Operator sign-off recorded.

Approval: FAIL

Approval remains blocked pending the effective remediation plan and rebuilt-runtime QA.
- Note: Operator must rebuild runtime from worktree sources on a non-`:3456` port and execute all scenarios before signing off.
