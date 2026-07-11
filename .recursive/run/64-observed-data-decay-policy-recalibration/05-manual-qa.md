Run: `/.recursive/run/64-observed-data-decay-policy-recalibration/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-11T22:49:36Z`
LockHash: `f6d8fb00caa8d755f98d66cc869fc0616f77da9d8c7b52650d40258afb43d89b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md` (LOCKED)
- `/.recursive/run/64-observed-data-decay-policy-recalibration/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md` (LOCKED)
Outputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`
Scope note: Records the agent-operated deterministic QA proof for run 64. The repaired scope is router/config behavior only, so manual QA uses focused command-level proof rather than browser-driven operator flows.

## TODO

- [x] Re-read the locked plan and test summary
- [x] Record the actual QA execution mode and evidence paths
- [x] Document deterministic config, router-core, and protocol-routing scenarios
- [x] Refresh requirement dispositions for agent-operated QA

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: no delegated QA executor was available in this worktree.
Delegation Decision Basis: the repaired scope has no UI delta and no separate packaged-runtime requirement, so deterministic agent-operated proofs on the owning suites are the truthful Phase 5 evidence.
Audit Inputs Provided:
- locked requirements and plan artifacts
- locked Phase 4 test summary
- focused Phase 5 green logs from the worktree

## Effective Inputs Re-read

- `/.recursive/run/64-observed-data-decay-policy-recalibration/02-to-be-plan.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md`

## QA Execution Record

QA Execution Mode: `agent-operated`
Agent Executor: `main agent`
Tools Used: `corepack pnpm`, focused Vitest suites, direct source/result inspection
QA Environment:
- worktree: `D:\DEV\role-model\.worktrees\64-observed-data-decay-policy-recalibration`
- runtime surface under test: host-bridge config truth, router-core scoring, protocol-routing behavior
- no browser or packaged-runtime harness was required because no UI or packaging behavior changed in this run

## QA Scenarios and Results

### Scenario 1 — Canonical config truth exposes only latency and throughput decay controls (`R1`, `R5`)

Execution:
- command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/observed-data-decay-policy.test.ts`
- evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/green/phase5-host-bridge-observed-data.log`

Observed results:
- the canonical observed-data config surface is `metricDecayPercentPerDay.latency|throughput`
- defaults are `10` and `10`
- legacy `metric_halflives` input still parses for compatibility, but canonical render emits only `metric_decay_percent_per_day`
- `quality_ms`, `reliability_ms`, and `cost_ms` no longer survive into active runtime-config truth

Verdict: `PASS`

### Scenario 2 — Router-core decays only latency and throughput on the 10%-per-day curve (`R2`, `R3`, `R5`)

Execution:
- command: `corepack pnpm --filter @role-model-router/core exec vitest run test/observed-data-decay-policy.test.ts`
- evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/green/phase5-core-observed-data.log`

Observed results:
- a `24h` latency sample retains `90%` of its deviation from neutral
- a `48h` throughput sample retains `81%` of its deviation from neutral
- fresher samples reset decay age instead of letting stale penalties linger
- benchmark-backed quality stays at its scored value even when freshness metadata is low
- measured reliability and measured cost pass through unchanged by sample age

Verdict: `PASS`

### Scenario 3 — Route-level local/remote outcomes match the repaired policy (`R2`, `R3`, `R4`)

Execution:
- command: `corepack pnpm --filter @role-model-router/protocol-routing exec vitest run test/observed-data-decay-policy.test.ts`
- evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/green/phase5-protocol-routing-observed-data.log`

Observed results:
- a fresh local endpoint now beats a faster remote endpoint when the remote latency evidence is a week old
- benchmark-only quality routing remains stable even when profile freshness metadata is low
- the repaired decay policy changes route selection only through latency/throughput aging, not by redesigning throughput-SLA or benchmark precedence

Verdict: `PASS`

## Evidence and Artifacts

- `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/green/phase5-host-bridge-observed-data.log`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/green/phase5-core-observed-data.log`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/green/phase5-protocol-routing-observed-data.log`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/03.5-code-review.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md`

## User Sign-Off

Not required. `QA Execution Mode: agent-operated`.

QA Sign-Off: `PASS`

## Traceability

- `R1` | satisfied by Scenario 1
- `R2` | satisfied by Scenarios 2 and 3
- `R3` | satisfied by Scenarios 2 and 3
- `R4` | satisfied by Scenario 3 plus the green broader verification floor retained from Phase 4
- `R5` | satisfied by Scenarios 1 and 2
- `R6` | satisfied by the Phase 4 verification floor plus the agent-operated scenario proof above

## Gaps Found

None in the repaired scope.

## Repair Work Performed

None in this phase.

## Audit Verdict

Audit: PASS

## Earlier Phase Reconciliation

- `02-to-be-plan.md` committed to agent-operated deterministic proof because the run changed router/config semantics rather than UI behavior.
- `04-test-summary.md` captured the broad automated floor; this receipt records how the focused Phase 5 scenarios satisfy the operator-proof obligation without inventing a browser-only harness.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8a5771506715251440f68a6643de30a66ac4f454`
- Comparison reference: `working-tree`
- Normalized baseline: `8a5771506715251440f68a6643de30a66ac4f454`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8a5771506715251440f68a6643de30a66ac4f454`
- Base branch: `main`
- Worktree branch: `recursive/64-observed-data-decay-policy-recalibration`

## Requirement Completion Status

- `R1` | Status: verified | Verification Evidence: Scenario 1
- `R2` | Status: verified | Verification Evidence: Scenarios 2 and 3
- `R3` | Status: verified | Verification Evidence: Scenarios 2 and 3
- `R4` | Status: verified | Verification Evidence: Scenario 3 plus retained Phase 4 suite coverage
- `R5` | Status: verified | Verification Evidence: Scenarios 1 and 2
- `R6` | Status: verified | Verification Evidence: Phase 4 plus focused Phase 5 logs

## Audit Gate

- [x] QA execution mode declared
- [x] Observed results recorded for each deterministic scenario
- [x] Evidence paths cited

Audit: PASS

## Coverage Gate

- [x] Canonical config truth proof recorded
- [x] Router-core decay-policy proof recorded
- [x] Local/remote route outcome proof recorded

Coverage: PASS

## Approval Gate

- [x] Agent-operated QA evidence is sufficient for this non-UI run
- [x] Ready for Phase 6

Approval: PASS
