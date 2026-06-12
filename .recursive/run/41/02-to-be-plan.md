Run: `/.recursive/run/41/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-06-12T04:37:13Z`
LockHash: `98c746c9860fda45af0350ef5666020d22d1d97cc083b6f2b98ed4fa45b66bf7`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/41/00-requirements.md`
- `/.recursive/run/41/00-worktree.md`
- `/.recursive/run/41/01-as-is.md`
Outputs:
- `/.recursive/run/41/02-to-be-plan.md`
Scope note: Concrete plan for changing the dashboard latency summary card display.

## TODO

- [x] Define concrete changes for each requirement
- [x] Identify files to change
- [x] Define test plan
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: R1, R2, R3. OOS1-OOS4 constrain scope to UI-only.
- `01-as-is.md`: Current latency card shows p95 as headline, average as detail.

## Requirement Mapping

- R1 | Disposition: planned | Source Quote: Dashboard summary card shows both average and p95 latency | Summary: Swap latency display prominence | Coverage: direct | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/view-models.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | QA Surface: manual dashboard verification
- R2 | Disposition: planned | Source Quote: Latency detail text remains informative | Summary: Update detail text to show both numbers | Coverage: direct | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/view-models.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | QA Surface: manual dashboard verification
- R3 | Disposition: planned | Source Quote: View-model tests reflect the new display | Summary: Update test assertion for latency card | Coverage: direct | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | QA Surface: test execution

## Planned Changes by File

### File 1: `role-model-router/apps/runtime-ui/app/lib/view-models.ts`

**Change:** In `summarizeTelemetryStats`, modify the Latency card object.

Lines 383–390 (approximate):

```typescript
// BEFORE:
{
  label: "Latency",
  value: summary.p95LatencyMs !== null ? `${summary.p95LatencyMs} ms` : "n/a",
  detail:
    summary.averageLatencyMs !== null
      ? `${summary.averageLatencyMs} ms average latency across structured telemetry`
      : "Average latency not available yet",
}

// AFTER:
{
  label: "Latency",
  value:
    summary.averageLatencyMs !== null
      ? `${summary.averageLatencyMs} ms avg`
      : "n/a",
  detail:
    summary.p95LatencyMs !== null && summary.averageLatencyMs !== null
      ? `${summary.p95LatencyMs} ms p95 / ${summary.averageLatencyMs} ms avg across structured telemetry`
      : summary.p95LatencyMs !== null
        ? `${summary.p95LatencyMs} ms p95 — average not available`
        : summary.averageLatencyMs !== null
          ? `${summary.averageLatencyMs} ms avg — p95 not available`
          : "Latency data not available yet",
}
```

### File 2: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`

**Change:** Update the test assertion for `summarizeTelemetryStats`.

Lines 1100–1104 (approximate):

```typescript
// BEFORE:
{
  label: "Latency",
  value: "880 ms",
  detail: "420 ms average latency across structured telemetry",
}

// AFTER:
{
  label: "Latency",
  value: "420 ms avg",
  detail: "880 ms p95 / 420 ms avg across structured telemetry",
}
```

## Implementation Steps

1. Edit `view-models.ts` — modify Latency card in `summarizeTelemetryStats`
2. Edit `view-models.test.ts` — update test assertion
3. Run tests to verify

## Implementation Sub-phases

- Sub-phase 1: Edit view-models.ts (single function, single object)
- Sub-phase 2: Edit view-models.test.ts (single assertion)
- Sub-phase 3: Run tests and verify

## Testing Strategy

1. Run `corepack pnpm --filter @role-model-router/runtime-ui run test`
2. Verify all 90 tests pass (22 in view-models.test.ts)
3. Verify no other test files broken

## Manual QA Scenarios

1. Start runtime host bridge
2. Open dashboard at `http://127.0.0.1:5173/app`
3. Verify Latency card shows average as headline, p95 as detail
4. Verify other cards (Requests, Failures, Tokens) unchanged

## Playwright Plan (if applicable)

Not applicable. No end-to-end browser tests planned for this UI-only change.

## Idempotence and Recovery

- Change is idempotent: running the edit twice produces the same result
- Recovery: revert the two file changes
- No database or state changes involved

## Plan Drift Check

- No plan drift expected. Scope is tightly constrained to two files.
- If tests fail unexpectedly, reassess whether backend data is correct.

## Prior Recursive Evidence Reviewed

No prior recursive runs modified this specific latency display. None — there is no relevant prior evidence because this exact value/detail split was not the subject of any previous run.

## Earlier Phase Reconciliation

- `00-requirements.md` (locked) defines R1-R3.
- `00-worktree.md` (locked) confirms worktree ready.
- `01-as-is.md` (locked) documents current p95-headline behavior.
- Plan directly addresses the AS-IS problem.

## Gaps Found

- None. Plan is straightforward.

## Repair Work Performed

- None. Planning phase.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `f4e951f0da56796863fcc90beb63cd44763c933e`
- Comparison reference: `working-tree`
- Normalized baseline: `f4e951f0da56796863fcc90beb63cd44763c933e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only f4e951f0da56796863fcc90beb63cd44763c933e`
- Result: No product changes yet.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/view-models.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | QA Surface: manual dashboard verification | Audit Note: self-audit
- R2 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/view-models.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | QA Surface: manual dashboard verification | Audit Note: self-audit
- R3 | Status: planned | Implementation Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | QA Surface: test execution | Audit Note: self-audit

## Subagent Contribution Verification

- Subagent Capability Probe: no subagent tooling invoked
- Subagent Availability: unavailable
- Delegation Decision Basis: self-audit; scope too small for delegation
- Audit Execution Mode: self-audit

## Audit Context

- Phase: 02 To-Be Plan
- Auditor: self (main agent)
- Audit Inputs Provided: `00-requirements.md`, `00-worktree.md`, `01-as-is.md`
- Audit basis: code review of planned changes
- Delegation Decision Basis: self-audit
- Subagent Capability Probe: not applicable
- Subagent Availability: unavailable
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Traceability

- R1: Planned change to `view-models.ts` — swap latency prominence
- R2: Planned change to `view-models.ts` — update detail text
- R3: Planned change to `view-models.test.ts` — update test assertion

## Coverage Gate

- [x] Each requirement has a concrete change plan
- [x] Files to change are identified
- [x] Test plan is defined
- [x] Out-of-scope items are honored

Coverage: PASS

## Approval Gate

- [x] Plan is complete enough to implement
- [x] No unresolved questions

Approval: PASS
