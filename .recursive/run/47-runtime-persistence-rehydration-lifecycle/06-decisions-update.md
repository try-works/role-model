Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-16T08:14:13Z`
LockHash: `969328c31970c3985bf16d563abdcd52b8a5f8d3b7960787107575e391dd7b79`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-worktree.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/03-implementation-summary.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/04-test-summary.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/05-manual-qa.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-01.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-02.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-03.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.addendum-01.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.addendum-02.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Decision-ledger delta for run 47 base persistence/rehydration work plus the follow-up telemetry/dashboard/router remediation.

## TODO

- [x] Add a run-47 entry to `DECISIONS.md`
- [x] Record the durable decision deltas introduced by the base run and the follow-up addenda
- [x] Keep the decision entry limited to durable repo truths

## Decisions Changes Applied

- Added a new `### Run \`47-runtime-persistence-rehydration-lifecycle\`` entry to `/.recursive/DECISIONS.md`
- Recorded the durable runtime-session decision:
  - persisted provider-account and endpoint state must survive reload and restart without UI revisit
- Recorded the durable telemetry/operator follow-up decisions:
  - failed request rows must preserve caller correlation and classification in the canonical telemetry ledger
  - `/app` overview uses the telemetry summary row as the primary summary surface and treats `Latest requests` as an interaction rail, not a raw benchmark-biased canonical-row teaser
  - `/app/router` alias inventory must separate configured hints, resolved models, allowed endpoints, and readiness instead of collapsing them into one cell
  - `/app/observe/activity` preserves backend newest-first order rather than re-sorting on synthetic ids
  - alias-drift warnings must not be suppressed when they still reflect backend config truth

## Recorded Run-Owned Decisions (summary)

- Session bootstrap, operator intent, and endpoint inventory are runtime-owned persisted state, not ephemeral UI state
- Failure observability belongs in the canonical request ledger, not only in aggregate summary math
- The overview route must lead with live telemetry summary and interaction-level request context rather than duplicative status cards
- Alias inventory clarity is a route-level presentation responsibility built on backend summary truth, not a separate backend projection
- Verification-first slices may close with no production code when the canonical config path already behaves correctly

## Rationale

- Run 47 changed durable runtime/operator behavior, not only local implementation details. Future telemetry, dashboard, or router work needs the canonical decision ledger to preserve:
  - that failure rows belong in the canonical request ledger
  - that overview latest-requests is an interaction rail
  - that alias coverage and alias drift are distinct concepts

## Resulting Decision Entry

- `/.recursive/DECISIONS.md#run-47-runtime-persistence-rehydration-lifecycle`

## Traceability

- `R0` → provider/model-agnostic lifecycle and operator-surface decisions remain generic rather than provider-id specific
- `R1` → canonical durable-vs-transient ownership decision
- `R2` → startup reconciliation and stale-state sanitization decision
- `R3` → explicit account lifecycle and readiness-computation decision
- `R4` → overview and router operator-surface decisions
- `R5` → in-place remote credential maintenance decision preserved from the base run
- `R6` → explicit API-key storage mode and credential-backend normalization decision preserved from the base run
- `R7` → end-to-end restart rehydration decision
- `R8` → failure-ledger completeness decision
- `R9` → backward-compatibility and legacy-state migration decision
- `R10` → telemetry summary/ledger parity decision
- `R11` → persisted provider-account readiness semantics and restart authority decision
- `R12` → endpoint rehydration and inventory restoration decision
- `R13` → packaged-runtime lifecycle parity decision
- `R14` → validation-floor and restart drill decision
- `R15` → structured alias-inventory decision
- `R16` → verification-first alias-drift-removal decision
- `R17` → cross-surface consistency decision

## Coverage Gate

- [x] The exact decision-ledger delta is recorded
- [x] The updated run-47 heading is present in `DECISIONS.md`
- [x] The decision entry is limited to durable control-plane truths

Coverage: PASS

## Approval Gate

- [x] The decision entry reflects what run 47 actually implemented and verified
- [x] No unrelated historical decision entry was rewritten

Approval: PASS

## Effective Inputs Re-read

- `02-to-be-plan.md`
- `03-implementation-summary.md`
- `04-test-summary.md`
- `05-manual-qa.md`
- effective addenda `01` through `03` for planning plus Phase 3/4/5 follow-up receipts
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- The decisions delta matches the locked base run artifacts plus the post-lock follow-up addenda that actually shipped
- The live `moonshot/kimi-k2.6` drift warning is intentionally recorded as backend truth rather than as a UI bug

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `dee829410458d03cef7e98fff7bda4472dec5fa9`
- Comparison reference: `working-tree`
- Normalized diff command: `git diff --name-only dee829410458d03cef7e98fff7bda4472dec5fa9`
- Planned or claimed changed files:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/06-decisions-update.md`
  - `/.recursive/DECISIONS.md`

## Requirement Completion Status

- `R0` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`
- `R1` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`, `05-manual-qa.md`
- `R2` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`, `05-manual-qa.md`
- `R3` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`, `05-manual-qa.md`
- `R4` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`, `05-manual-qa.addendum-02.md`
- `R5` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`
- `R6` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`
- `R7` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R8` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.md`, `05-manual-qa.addendum-02.md`
- `R9` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`
- `R10` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.md`, `05-manual-qa.addendum-02.md`
- `R11` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`, `05-manual-qa.md`
- `R12` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`, `05-manual-qa.md`
- `R13` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.md`, `05-manual-qa.md`
- `R14` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.md`, `05-manual-qa.md`
- `R15` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.addendum-02.md`
- `R16` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `R17` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`, `05-manual-qa.addendum-02.md`

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: delegated review tooling was available, but this delta required direct comparison between the final run artifacts and the control-plane ledger
- Delegation Decision Basis: concise closeout ledger work is lower-risk when the controller performs the final artifact-to-ledger reconciliation directly
- Delegation Override Reason: direct reconciliation of the run history, addenda, and final manual-QA truth was required before recording the durable decision entry
- Audit Inputs Provided:
  - locked base phase artifacts
  - follow-up addenda for phases 2 through 5
  - `/.recursive/DECISIONS.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: checked the final run artifacts and addenda against the new `DECISIONS.md` entry and the actual changed-file scope
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

Audit: PASS
