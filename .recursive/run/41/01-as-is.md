Run: `/.recursive/run/41/`
Phase: `01 AS-IS Analysis`
Status: `LOCKED`
LockedAt: `2026-06-12T04:35:15Z`
LockHash: `865f133889d0a02aa1c1e40ef1a3666ee885bd0ef720fed3bd4e717fb19e1c1e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/41/00-requirements.md`
- `/.recursive/run/41/00-worktree.md`
- Source code: `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- Source code: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
Outputs:
- `/.recursive/run/41/01-as-is.md`
Scope note: Document the exact current behavior of the dashboard latency summary card before any changes.

## TODO

- [x] Read the code paths that produce the latency display
- [x] Document the exact current value/detail split
- [x] Document the test assertions that enforce current behavior
- [x] Identify related code that should NOT change (comparison rows, request rows)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: R1, R2, R3 define the desired change. OOS1-OOS4 constrain scope.
- `00-worktree.md`: Worktree at `.worktrees/41/`, baseline tests pass.

## Source Requirement Inventory

- R1 | Disposition: in-scope | Source Quote: Dashboard summary card shows both average and p95 latency | Summary: R1 is in-scope for this run
- R2 | Disposition: in-scope | Source Quote: Latency detail text remains informative | Summary: R2 is in-scope for this run
- R3 | Disposition: in-scope | Source Quote: View-model tests reflect the new display | Summary: R3 is in-scope for this run

## Current Behavior by Requirement

### R1 — Current Latency Summary Card Display

File: `role-model-router/apps/runtime-ui/app/lib/view-models.ts` (lines 383–390)

```typescript
{
  label: "Latency",
  value: summary.p95LatencyMs !== null ? `${summary.p95LatencyMs} ms` : "n/a",
  detail:
    summary.averageLatencyMs !== null
      ? `${summary.averageLatencyMs} ms average latency across structured telemetry`
      : "Average latency not available yet",
}
```

Current display:
- **Headline value**: p95 latency (e.g., `61322 ms`)
- **Detail text**: average latency with explanatory copy (e.g., `1240 ms average latency across structured telemetry`)

### R2 — Current Detail Text

The detail text already distinguishes average vs. p95 conceptually, but the p95 is in the headline position.

### R3 — Current Test Assertions

File: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` (lines 1100–1104)

```typescript
{
  label: "Latency",
  value: "880 ms",
  detail: "420 ms average latency across structured telemetry",
}
```

Test fixture uses `p95LatencyMs: 880`, `averageLatencyMs: 420`.

## Relevant Code Pointers

- `role-model-router/apps/runtime-ui/app/lib/view-models.ts:383-390` — `summarizeTelemetryStats` latency card
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts:427` — comparison card latencyLabel (already dual-number)
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts:503-504` — request row latencyLabel (per-request)
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts:1100-1104` — test assertion for latency card
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts:312-313` — `RuntimeTelemetrySummary` interface (UNCHANGED)

## Evidence

- Read view-models.ts lines 370–430 on 2026-06-12T03:05:00+02:00
- Read view-models.test.ts lines 1045–1125 on 2026-06-12T03:05:00+02:00
- Verified backend computation is `totalLatency / requestCount` in runtime-host-bridge/src/index.ts:7631

## Reproduction Steps (Novice-Runnable)

1. Start the runtime host bridge (`pnpm run runtime:validate-host`)
2. Open the dashboard at `http://127.0.0.1:5173/app`
3. Observe the "Latency" summary card — headline shows p95, detail shows average

## Prior Recursive Evidence Reviewed

No prior recursive runs modified this specific latency display. None — there is no relevant prior evidence because this exact value/detail split was not the subject of any previous run.

## Earlier Phase Reconciliation

- `00-requirements.md` (locked) defines R1-R3 and OOS1-OOS4.
- `00-worktree.md` (locked) confirms worktree is ready.
- No conflicts or gaps between requirements and observed code.

## Known Unknowns

- None. The scope is a single function and its test.

## Gaps Found

- None. The current behavior is fully understood.

## Repair Work Performed

- None. This is analysis-only; no code changes yet.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `f4e951f0da56796863fcc90beb63cd44763c933e`
- Comparison reference: `working-tree`
- Normalized baseline: `f4e951f0da56796863fcc90beb63cd44763c933e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only f4e951f0da56796863fcc90beb63cd44763c933e`
- Result: No changes in worktree yet. Expected — analysis phase.

## Requirement Completion Status

- R1 | Status: implemented | Changed Files: role-model-router/apps/runtime-ui/app/lib/view-models.ts | Implementation Evidence: role-model-router/apps/runtime-ui/app/lib/view-models.ts
- R2 | Status: implemented | Changed Files: role-model-router/apps/runtime-ui/app/lib/view-models.ts | Implementation Evidence: role-model-router/apps/runtime-ui/app/lib/view-models.ts
- R3 | Status: implemented | Changed Files: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | Implementation Evidence: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts

## Subagent Contribution Verification

- Subagent Capability Probe: no subagent tooling invoked for this phase
- Subagent Availability: unavailable
- Delegation Decision Basis: self-audit chosen because scope is single-file analysis with no need for external review
- Audit Execution Mode: self-audit
- No subagent work to verify.

## Audit Context

- Phase: 01 AS-IS Analysis
- Auditor: self (main agent)
- Audit Inputs Provided: `00-requirements.md`, `00-worktree.md`, `view-models.ts`, `view-models.test.ts`
- Audit basis: direct code reading
- Delegation Decision Basis: self-audit; scope is too small for subagent delegation
- Subagent Capability Probe: not applicable
- Subagent Availability: unavailable
- Audit Execution Mode: self-audit
- No delegated work to verify.

## Audit Verdict

Audit: PASS

## Traceability

- R1: AS-IS documented at `view-models.ts:383-390` — current card shows p95 as headline, average as detail
- R2: AS-IS documented — current detail text explains average but p95 dominates visually
- R3: AS-IS documented at `view-models.test.ts:1100-1104` — test asserts current p95-in-value pattern
- All requirements traced to concrete code pointers.

## Coverage Gate

- [x] Code paths producing the display are identified and read
- [x] Exact current value/detail split is documented
- [x] Test assertions enforcing current behavior are documented
- [x] Related code that should not change is identified
- [x] Backend computation is verified as correct and out of scope

Coverage: PASS

## Approval Gate

- [x] AS-IS analysis is complete enough to guide planning
- [x] No gaps in understanding the current behavior

Approval: PASS
