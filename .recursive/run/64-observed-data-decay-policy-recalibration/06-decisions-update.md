Run: `/.recursive/run/64-observed-data-decay-policy-recalibration/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-07-11T22:50:03Z`
LockHash: `4d84d9ce8b9948ec7259de525bed28f3179ad053eda205b919d347e4ffb6edb3`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/03-implementation-summary.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/06-decisions-update.md`
Scope note: Records the durable decision-ledger entry for the repaired run-64 observed-data decay policy.

## TODO

- [x] Re-read the effective upstream artifacts through Phase 5
- [x] Update `/.recursive/DECISIONS.md` with the final run-64 entry
- [x] Record the exact decision-ledger delta in this receipt
- [x] Confirm the decision entry matches the final worktree reality

## Audit Context

This phase records the final run-64 policy decision: observed-data time decay is now limited to latency and throughput on a 10%-per-day curve, while quality, reliability, and cost remain age-invariant and diagnostics expose the distinction.

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: no delegated closeout reviewer was available for this worktree.
- Delegation Decision Basis: the decision delta is narrow and depends on exact comparison against the repaired local artifacts, so direct controller reconciliation was clearer than packaging a delegated bundle.
- Audit Inputs Provided:
  - locked run-64 requirements, implementation, test, and manual-QA artifacts
  - final `/.recursive/DECISIONS.md` diff in the active worktree
  - the run-64 diff basis from `00-worktree.md`

## Effective Inputs Re-read

- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/03-implementation-summary.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`

## Earlier Phase Reconciliation

- Phase 3 repaired the config surface, router scoring, diagnostics, and test coverage.
- Phase 4 and Phase 5 established the final verification truth for those surfaces.
- The decision entry added here reflects that repaired final state rather than the earlier broken implementation.

## Decisions Changes Applied

- Added a new top-level run entry to `/.recursive/DECISIONS.md` for `64-observed-data-decay-policy-recalibration`.
- Recorded:
  - the canonical observed-data config contract now uses `metric_decay_percent_per_day` for latency and throughput only
  - ordinary time decay now applies only to latency and throughput using a 10%-per-day retained-deviation loss curve
  - quality, reliability, and cost no longer drift toward neutral solely because samples are old
  - request-detail and routing diagnostics now distinguish time-decayed metrics from pass-through metrics
  - cross-layer host-bridge, router-core, and protocol-routing regression coverage was added to keep the policy stable

## Rationale

- The earlier run-64 implementation left the config surface, router scoring, and diagnostics semantically inconsistent with the locked requirements.
- Future routing work needs one durable ledger entry stating which observed metrics age over time, how that decay works, and which metrics explicitly do not age.

## Resulting Decision Entry

`/.recursive/DECISIONS.md` now contains a dedicated run-64 entry that states:

- observed-data time decay is a latency/throughput-only policy, not a five-metric halflife contract
- the decay shape is `10%` per day of retained deviation from neutral
- benchmark or measured quality, measured reliability, and measured cost remain age-invariant in route scoring
- diagnostics must say whether a metric was time-decayed or passed through unchanged
- throughput-SLA, benchmark precedence, and broader routing boundaries were preserved

## Traceability

- `R1` -> the decision entry records the narrowed config contract
- `R2` -> the decision entry records the 10%-per-day decay curve
- `R3` -> the decision entry records the removal of ordinary age decay from quality, reliability, and cost
- `R4` -> the decision entry records that throughput-SLA and benchmark precedence were preserved
- `R5` -> the decision entry records the new diagnostic distinction
- `R6` -> the decision entry records the new regression coverage across all required layers

## Prior Recursive Evidence Reviewed

- none. This ledger update was driven directly by the repaired run-64 artifacts and the local decision-entry delta.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: directly compared the repaired Phase 3-5 artifacts and the new `/.recursive/DECISIONS.md` entry against the active worktree
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none beyond writing the final run-64 decision entry

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8a5771506715251440f68a6643de30a66ac4f454`
- Comparison reference: `working-tree`
- Normalized baseline: `8a5771506715251440f68a6643de30a66ac4f454`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8a5771506715251440f68a6643de30a66ac4f454`
- Base branch: `main`
- Worktree branch: `recursive/64-observed-data-decay-policy-recalibration`
- Phase-6-owned changed file(s):
  - `/.recursive/DECISIONS.md`

## Gaps Found

None in the phase-owned decision-ledger update.

## Repair Work Performed

- added the missing durable run-64 decision entry after the repaired implementation and verification were complete

## Requirement Completion Status

- `R1` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/03-implementation-summary.md`, `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md`
- `R2` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/03-implementation-summary.md`, `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`
- `R3` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/03-implementation-summary.md`, `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`
- `R4` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md`, `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`
- `R5` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/03-implementation-summary.md`, `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`
- `R6` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/64-observed-data-decay-policy-recalibration/04-test-summary.md`, `/.recursive/run/64-observed-data-decay-policy-recalibration/05-manual-qa.md`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] The exact `/.recursive/DECISIONS.md` delta was recorded
- [x] The decision entry reflects the repaired final run-64 state
- [x] The narrowed config contract, decay curve, non-decay boundaries, diagnostics, and regression floor are represented in the ledger

Coverage: PASS

## Approval Gate

- [x] `/.recursive/DECISIONS.md` now reflects the final run-64 outcome
- [x] The phase-owned ledger update matches the active worktree
- [x] Phase 7 can now reconcile repository current state against this final decision entry

Approval: PASS
