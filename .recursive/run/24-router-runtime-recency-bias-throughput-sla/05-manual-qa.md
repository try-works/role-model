Run: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-11T11:41:59Z`
LockHash: `f3a2b586a9b88a7783d7231e228209a89967d4b86243122427833952b9976697`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `/role-model-router/packages/protocol-routing/test/index.test.ts`
Outputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
Scope note: This artifact records the agent-operated readback QA pass for the adaptive observed-data slice from the locked Phase 4 baseline.

## TODO

- [x] Re-read the locked implementation and test receipts
- [x] Review persisted adaptive-routing diagnostics on request observations
- [x] Review local-plus-remote parity for adaptive readback
- [x] Review the route-outcome proof for active throughput penalties
- [x] Save run-owned QA notes under the evidence directory
- [x] Complete the audited Phase 5 sections and gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Operator: `main agent`
- Agent Executor: `GitHub Copilot CLI main agent`
- Tools Used: `view`, `rg`
- Evidence Path: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`

## QA Scenarios and Results

1. **Persisted adaptive-routing request-observation readback**
   - Steps:
     - reviewed `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
     - confirmed the persisted request observation requires `routingDiagnostics.observedProfile.source = "runtime-state"`
     - confirmed the same assertion requires `readMode = "per-request"`
     - confirmed the same assertion requires `effectiveMetrics.quality`, `effectiveMetrics.latency`, and `effectiveMetrics.throughput`
     - confirmed the same assertion requires `throughputPenalty.endpointId = result.endpointId` and `active = false`
   - Result: PASS
   - Notes:
     - the persisted request-observation surface explicitly exposes the adaptive metrics and current penalty state for the chosen endpoint

2. **Local-plus-remote adaptive parity readback**
   - Steps:
     - reviewed `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
     - confirmed local and remote observations both require `routingDiagnostics.observedProfile.source = "runtime-state"`
     - confirmed local and remote observations both require `readMode = "per-request"`
     - confirmed local and remote observations both require latency and throughput `effectiveMetrics` entries with `value` and `freshnessWeight`
     - confirmed local and remote observations both require `throughputPenalty.active = false`
   - Result: PASS
   - Notes:
     - the same operator-visible adaptive contract is asserted for both local and remote endpoint paths

3. **Active throughput-penalty route-outcome proof**
   - Steps:
     - reviewed `/role-model-router/packages/protocol-routing/test/index.test.ts`
     - confirmed the scenario config sets `minTokensPerSec = 24` and `penaltyFactor = 0`
     - confirmed the penalized remote endpoint has an active penalty window and lower observed throughput than the configured minimum
     - confirmed routing chooses `local.steady.fallback` and marks `remote.penalized.fast` as `eligible: false`
   - Result: PASS
   - Notes:
     - the proof surface demonstrates the adaptive logic changes the route outcome rather than only attaching diagnostics after selection

4. **Recent endpoint-profile inspection remains available after runtime execution**
   - Steps:
     - reviewed `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-host.log`
     - confirmed the host validation output reports `structured_recent_count = 1`
     - confirmed the same output reports `structured_endpoint_id = "openai.personal.primary.us-east-1.fast"`
     - confirmed the same output reports `structured_profile_sample_size = 2`
   - Result: PASS
   - Notes:
     - the runtime still exposes recent endpoint-profile inspection after live execution, which keeps the adaptive diagnostics operator-readable

## Evidence and Artifacts

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-host.log`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `/role-model-router/packages/protocol-routing/test/index.test.ts`

## Issues Found

- none

## User Sign-Off

- Approved by: `not requested; agent-operated QA only`
- Date: `not applicable`

## Traceability

- `R1` -> verified by the persisted adaptive-routing request-observation readback and the Phase 5 evidence note
- `R2` -> verified by the persisted adaptive-routing request-observation readback and the local-plus-remote adaptive parity readback
- `R3` -> verified by the active throughput-penalty route-outcome proof and the Phase 5 evidence note
- `R4` -> verified by the persisted adaptive-routing request-observation readback and recent endpoint-profile inspection readback
- `R5` -> verified by the local-plus-remote adaptive parity readback and the Phase 5 evidence note
- `R6` -> verified by the agent-operated QA pass grounded in the locked Phase 4 evidence and run-owned readback notes

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `the remaining QA work was a controller-owned readback pass over locked artifacts, runtime logs, and adaptive-route assertions.`
- Delegation Decision Basis: `the QA question was whether the operator-visible proof surfaces clearly exposed adaptive metrics, throughput-penalty state, and route-outcome changes.`
- Delegation Override Reason: `a delegated pass would still depend on the same locked evidence and source assertions, so controller-owned review kept the QA receipt tightly grounded.`
- Audit Inputs Provided:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-host.log`

## Effective Inputs Re-read

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `/role-model-router/packages/protocol-routing/test/index.test.ts`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-host.log`

## Earlier Phase Reconciliation

- `03-implementation-summary.md`: the adaptive observed-data scoring and diagnostics were implemented as planned and locked before QA.
- `04-test-summary.md`: the focused tests and runtime validators were already green, so Phase 5 could focus on operator-visible readback clarity and route-outcome interpretability rather than re-proving execution correctness.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - re-read `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - re-read `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - re-read `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - re-read `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-host.log`
  - captured `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - authored the Phase 5 evidence note and `05-manual-qa.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Comparison reference: `working-tree`
- Normalized baseline: `b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Base branch: `recursive/23-router-runtime-live-observed-feedback`
- Worktree branch: `recursive/24-router-runtime-recency-bias-throughput-sla`
- Actual changed files reviewed:
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/red/phase3-config-red.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/red/phase3-sqlite-penalty-red.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/red/phase3-protocol-routing-red.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/red/phase3-bridge-diagnostics-red.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-config-green.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-sqlite-penalty-green.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-protocol-routing-green.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-bridge-diagnostics-green.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-validate-vendors-green.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-runtime-host-bridge-full.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-runtime-validate-vendors.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-diff-scope.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase3-status-scope.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-schemas-validate.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-sqlite-memory-test.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-protocol-routing-test.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-host-bridge-test.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-host.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-vendors.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-post-validation-status.log`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/test/index.test.ts`
- Unexplained drift:
  - none

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- R2 | Status: verified | Changed Files: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- R3 | Status: verified | Changed Files: `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/protocol-routing/test/index.test.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- R4 | Status: verified | Changed Files: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- R5 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`
- R6 | Status: verified | Changed Files: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`

## Audit Verdict

- Audit summary: the Phase 5 readback pass confirmed that adaptive metrics, throughput-penalty state, and route-outcome changes are visible and internally consistent across persisted request observations, local-plus-remote validator proof, and routing assertions.
Audit: PASS

## Coverage Gate

- [x] The QA scenarios cover persisted adaptive diagnostics, local-plus-remote parity, throughput-penalty route outcomes, and recent profile inspection
- [x] Agent-operated QA has a concrete run-owned evidence path
- [x] No unresolved Phase 5 issue remains

Coverage: PASS

## Approval Gate

- [x] The QA receipt is grounded in locked earlier phases and concrete readback evidence
- [x] No unresolved manual-QA blocker remains

Approval: PASS
