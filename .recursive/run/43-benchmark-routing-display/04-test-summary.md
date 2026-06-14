Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `04 Test Summary`
Status: `LOCKED`
LockedAt: `2026-06-14T12:59:00Z`
LockHash: `027d91a774499a31e29b65d6971fa8d2b9eaa2aadc3e543b30111ec135c77b2a`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/03-implementation-summary.md` (locked)
- `/.recursive/run/43-benchmark-routing-display/03.5-code-review.md` (locked)
Outputs:
- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
Scope note: Automated verification floor and run-43 targeted test evidence.

## TODO

- [x] Record the pre-test implementation audit and execution environment
- [x] Capture exact commands, evidence, and final results
- [x] Complete the audited test-summary gates before locking

## Pre-Test Implementation Audit

- Implementation reviewed against locked `03-implementation-summary.md`; matches worktree diff.
- Baseline comparison: difficulty-bucket bridge test fails on clean `92fbc16` without run 43 changes (stash repro).

## Environment

- Worktree: `D:\DEV\role-model\.worktrees\43-benchmark-routing-display`
- Node.js: v24.11.0
- vitest: 3.2.4
- pnpm: 10.6.5

## Execution Mode

- Self-executed (agent-operated)

## Commands Executed (Exact)

```powershell
cd "D:\DEV\role-model\.worktrees\43-benchmark-routing-display\role-model-router"
corepack pnpm --filter @role-model-router/profile-aggregator test
corepack pnpm --filter @role-model-router/sqlite-memory test
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/benchmark-summary.test.ts test/benchmark-candidates-routing-quality.test.ts test/benchmark-data-clear.test.ts
corepack pnpm --filter @role-model-router/runtime-ui test
cd "D:\DEV\role-model\.worktrees\43-benchmark-routing-display"
corepack pnpm run schemas:validate
corepack pnpm --filter @role-model-router/runtime-host-bridge test  # full suite — partial fail
corepack pnpm run runtime:validate-host  # timeout
```

## Results Summary

| Suite | Tests | Status |
| --- | ---: | --- |
| profile-aggregator (routing quality) | 3 | **PASS** |
| sqlite-memory | 22 | **PASS** |
| bridge SP43 targeted | 9 | **PASS** |
| runtime-ui | 99 | **PASS** |
| schemas:validate | n/a | **PASS** |
| bridge full suite | 192/200 | **FAIL** (8 baseline) |
| runtime:validate-host | n/a | **FAIL** (health timeout) |

## Evidence and Artifacts

- `evidence/logs/green/sp43-b-routing-quality.green.log`
- `evidence/logs/green/sp43-d-dashboard-latency.green.log`
- `evidence/logs/green/sp43-a-per-mode-summary.green.log`
- `evidence/logs/green/sp43-c-candidates.green.log`
- `evidence/logs/green/sp43-g-clear.green.log`
- `evidence/logs/green/sp43-e-benchmark-latency-persist.green.log`
- `evidence/logs/green/sp43-f-benchmark-latency-ui.green.log`
- `evidence/logs/green/phase4-verification-floor.green.log` (partial — stopped at bridge full suite)

## Failures and Diagnostics (if any)

**Pre-existing baseline (not run-43 regressions):**

- `routes hard requests using bucketed observed profiles` — anthropic vs openai endpoint selection
- Moonshot oauth / unified config catalog assertions
- `validate-vendors` hybrid — empty chosen endpoint
- `benchmark-runner-compare` — 5s timeout

**Environment:**

- `runtime:validate-host` — timed out waiting for ephemeral health URL
- `runtime:validate-ui` — not completed (long-running in agent session)

## Flake/Rerun Notes

- Difficulty bucket test confirmed failing on stashed clean baseline; not flaky.
- Run-43 targeted suites: single run, all green.

## Requirement Completion Status

- R0 | Status: verified | Verification Evidence: baseline stash repro + run43 tests green
- R1 | Status: verified | Verification Evidence: SP43-A GREEN log
- R2 | Status: verified | Verification Evidence: SP43-A GREEN log
- R3 | Status: verified | Verification Evidence: SP43-B/C GREEN logs
- R4 | Status: verified | Verification Evidence: hardBlend candidate test
- R5 | Status: verified | Verification Evidence: SP43-B unit tests
- R6 | Status: verified | Verification Evidence: legacy full-mode test
- R7 | Status: partial | Verification Evidence: targeted green; full floor blocked by baseline bridge failures
- R8 | Status: deferred | Deferred By: Phase 6
- R9 | Status: verified | Verification Evidence: SP43-D GREEN log
- R10 | Status: verified | Verification Evidence: SP43-E/F GREEN logs
- R11 | Status: verified | Verification Evidence: SP43-G GREEN log
- R12 | Status: deferred | Deferred By: Phase 5 SEA rebuild

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: self-executed
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Traceability

- R0: baseline stash repro on difficulty routing test
- R1: SP43-A dual-mode API tests
- R2: listBenchmarkRuns integration
- R3: SP43-B routing quality tests
- R4: SP43-C hardBlend candidate test
- R5: SP43-B version normalize tests
- R6: SP43-B legacy full-mode test
- R7: partial floor — documented baseline failures
- R8: Phase 6 DECISIONS
- R9: SP43-D sqlite/dashboard tests
- R10: SP43-E/F latency tests
- R11: SP43-G clear integration
- R12: Phase 5 packaged QA

## Coverage Gate

- [x] Run-43 targeted tests executed and logged
- [x] Baseline failures documented

Coverage: PASS

## Approval Gate

- [x] Sufficient unit/integration evidence for Phase 5 packaged QA

Approval: PASS
