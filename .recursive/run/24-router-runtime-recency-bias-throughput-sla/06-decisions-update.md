Run: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-05-11T11:43:37Z`
LockHash: `eff487d5c65a16d9c3e96629a1094a569b9fdaf29496ba84c354516d2b0e8f76`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: This artifact records the compact decisions-ledger delta for the completed adaptive observed-data run.

## TODO

- [x] Re-read the locked implementation, validation, and QA receipts
- [x] Append the run-24 entry to `/.recursive/DECISIONS.md`
- [x] Reconcile the ledger entry against the completed run scope
- [x] Complete the audited Phase 6 sections and gates

## Decisions Changes Applied

- Updated path or section: `/.recursive/DECISIONS.md#recursive-run-index`
- Structural edit: appended the run-24 entry immediately after the run-23 live observed-feedback entry
- Decision delta recorded:
  - the runtime now owns an explicit `observedData` config contract for adaptive recency and throughput-SLA policy
  - route scoring now uses freshness-decayed effective metrics instead of treating all observed samples as equally fresh
  - throughput-SLA penalties now persist in SQLite runtime state and can exclude or discount endpoints
  - request observations and runtime validators now expose effective metrics and throughput-penalty diagnostics across local and remote paths

## Rationale

- Later routing-strategy runs need a durable ledger entry that the runtime no longer only reads live observations, but now actively adapts route outcomes from those observations.
- The decisions ledger is the correct owner for the fact that adaptive recency bias and throughput-SLA enforcement are now part of the routing baseline for subsequent alias, difficulty, controller, and hybrid work.

## Resulting Decision Entry

```md
### Run `24-router-runtime-recency-bias-throughput-sla`

- Run folder: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - the runtime now owns an explicit `observedData` config contract with defaults and validation for recency weighting and throughput-SLA policy
  - adaptive routing now decays measured quality, latency, throughput, reliability, and cost toward neutral defaults as observations age
  - active throughput-SLA penalties now persist in SQLite runtime state and can either exclude or discount endpoints during routing
  - request observations and runtime validation now expose effective metrics plus throughput-penalty diagnostics for both local and remote endpoint paths
- Why:
  - to turn the run-23 live observed-feedback baseline into real adaptive route selection before later alias, difficulty, controller, and hybrid routing runs build on the same state
- How:
  - implemented with strict RED/GREEN TDD across config, SQLite, protocol-routing, and bridge diagnostics slices, validated the locked Phase 3 slice through `schemas:validate`, focused package tests, `runtime-host-bridge` tests, `runtime:validate-host`, and `runtime:validate-vendors`, and completed agent-operated readback QA over adaptive diagnostics and penalty-driven route outcomes
- What was not done:
  - no alias routing, difficulty classification, controller-guided scoring, hybrid arbitration, or runtime UI implementation shipped in this run
- Known issues / follow-ups:
  - later runs still need alias pools, easy-medium-hard difficulty routing, controller guidance, hybrid arbitration, and final integrated runtime verification on top of the new adaptive observed-data baseline
```

## Traceability

- `R1` -> `DECISIONS.md` now records the durable `observedData` config contract and its runtime ownership
- `R2` -> `DECISIONS.md` now records freshness-decayed effective metrics as current routing behavior
- `R3` -> `DECISIONS.md` now records SQLite-owned throughput-penalty persistence and exclusion/discount semantics
- `R4` -> `DECISIONS.md` now records that adaptive metrics and penalties now affect real route selection and diagnostics
- `R5` -> `DECISIONS.md` now records the local-plus-remote adaptive parity and operator-visible diagnostics
- `R6` -> `DECISIONS.md` now records the strict-TDD plus end-to-end verification discipline used in the run

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `the phase needed a concise controller-owned ledger update grounded in already locked receipts.`
- Delegation Decision Basis: `Phase 6 is a durable control-plane reconciliation step over completed locked phases rather than a new implementation surface.`
- Delegation Override Reason: `controller-owned authorship kept the ledger delta tightly aligned with the already locked Phase 3-5 artifacts.`
- Audit Inputs Provided:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
  - `/.recursive/DECISIONS.md`

## Effective Inputs Re-read

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- `03-implementation-summary.md`: confirmed the adaptive config, decayed metrics, penalty-state, diagnostics, and validation changes were the only implemented scope.
- `04-test-summary.md`: confirmed the Phase 4 validation chain passed from the locked Phase 3 baseline.
- `05-manual-qa.md`: confirmed the operator-visible adaptive diagnostics and penalty-driven route-outcome proof are explicit enough to promote into the durable ledger.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - re-read the locked Phase 3, Phase 4, and Phase 5 receipts
  - compared the ledger entry against the completed product and evidence scope
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - updated `/.recursive/DECISIONS.md`
  - authored `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/06-decisions-update.md`

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
  - `.recursive/DECISIONS.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
  - `.recursive/run/24-router-runtime-recency-bias-throughput-sla/06-decisions-update.md`
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

## Gaps Found

- none

## Repair Work Performed

- Appended the durable run-24 entry to `/.recursive/DECISIONS.md`.
- Reconciled the ledger update against the locked implementation, validation, and QA receipts before recording it.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/.recursive/DECISIONS.md`, `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- R2 | Status: verified | Changed Files: `/.recursive/DECISIONS.md`, `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/protocol-routing/src/index.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- R3 | Status: verified | Changed Files: `/.recursive/DECISIONS.md`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- R4 | Status: verified | Changed Files: `/.recursive/DECISIONS.md`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- R5 | Status: verified | Changed Files: `/.recursive/DECISIONS.md`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- R6 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase4-runtime-validate-vendors.log`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/manual-qa/phase5-readback.txt`

## Audit Verdict

- Audit summary: the decisions ledger now records that adaptive recency bias and throughput-SLA enforcement are the durable routing baseline established by run 24.
Audit: PASS

## Coverage Gate

- [x] `DECISIONS.md` now records the completed run-24 adaptive-routing decision
- [x] The ledger delta is fully grounded in locked earlier phases
- [x] No unexplained drift remains in the audited worktree scope

Coverage: PASS

## Approval Gate

- [x] The durable decisions update is specific and complete for run 24
- [x] No unresolved Phase 6 blocker remains

Approval: PASS
