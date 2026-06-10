Run: `/.recursive/run/35-runtime-ui-connect-declutter/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-08T11:23:17Z`
LockHash: `e9d82a8271bd2204e2dbc96d398c4309ae4d010664bf1e5645e54c0a4037317c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/00-worktree.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/02-to-be-plan.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/03-implementation-summary.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/04-test-summary.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Compact decision-ledger delta receipt for run 35 closeout.

## TODO

- [x] Record the exact decisions delta applied during closeout
- [x] Reference the updated decision ledger entry
- [x] Complete the audited decision-update gates before locking

## Decisions Changes Applied

- Added a new `### Run \`35-runtime-ui-connect-declutter\`` entry to `/.recursive/DECISIONS.md`.
- Recorded the final run-owned decisions:
  - **Connect** pillar and `/app/connect*` routes replace the old Endpoints/Integrations consumer IA; **Local → Endpoints** stays at `/app/local/endpoints`
  - legacy redirects preserve `/app/endpoints*`, `/app/control/endpoints`, and `/app/integrations/*`
  - Connect registry reframes consumer visibility and hands alias posture to Router
  - shell quieting, Overview teaser, Local Matrix → Models grid, Router Config merge into Overview
  - `DisclosureSection` for progressive disclosure; frontend QA uses browser visual verification (hybrid mode)

## Rationale

- Implementation and verification were complete through Phase 5, but the control-plane ledger stopped at run 34. Closeout needed a durable run-35 entry so later runs can retrieve Connect/de-clutter decisions from canonical history.

## Resulting Decision Entry

- `/.recursive/DECISIONS.md#run-35-runtime-ui-connect-declutter`

## Traceability

- `R0` → decision entry records design-system-first delivery across SP1–SP7
- `R1` → decision entry records Connect nav section and tab labels
- `R2` → decision entry records `/app/connect*` routes and legacy redirects
- `R3` → decision entry records Local → Endpoints preservation at `/app/local/endpoints`
- `R4` → decision entry records Connect registry reframe and Router handoff
- `R5` → decision entry records meta panel removal
- `R6` → decision entry records shell quieting and copy budgets
- `R7` → decision entry records Matrix → Local Models grid merge
- `R8` → decision entry records Overview latest-requests teaser
- `R9` → decision entry records Router Config merge into Overview
- `R10` → decision entry records credential readiness dedupe on Connect registry
- `R11` → decision entry records docs, tests, `DisclosureSection`, and `future-surface.tsx` removal
- `R12` → decision entry records test/build validation discipline
- `R13` → decision entry records progressive disclosure on request detail and model modal
- `R14` → decision entry records cross-link and qualified copy normalization

## Coverage Gate

- [x] The exact decision-ledger delta is recorded
- [x] The updated run-35 heading is present in `/.recursive/DECISIONS.md`
- [x] The ledger entry points back to the completed implementation and verification scope

Coverage: PASS

## Approval Gate

- [x] The decision delta is limited to durable control-plane truths
- [x] The new entry reflects what the run actually implemented and verified
- [x] No unrelated historical entry was rewritten

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: `task` and `recursive-subagent` available; closeout needed only a concise ledger delta grounded in locked receipts
- Delegation Decision Basis: self-audit kept the control-plane update aligned with exact controller-authored evidence
- Delegation Override Reason: single ledger entry plus matching receipt; lower-risk as direct reconciliation

## Effective Inputs Re-read

- `02-to-be-plan.md`
- `03-implementation-summary.md`
- `04-test-summary.md`
- `05-manual-qa.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- The decision delta matches audited Phases 1–5: Connect IA, de-clutter merges, disclosure primitive, and browser QA without backend scope expansion.

## Subagent Contribution Verification

- N/A

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `48503a46b138054970ba63f576d0ce454f08b5c6`
- Comparison reference: `working-tree`
- Normalized baseline: `48503a46b138054970ba63f576d0ce454f08b5c6`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 48503a46b138054970ba63f576d0ce454f08b5c6`
- Planned or claimed changed files:
  - `/.recursive/run/35-runtime-ui-connect-declutter/06-decisions-update.md`
  - `/.recursive/DECISIONS.md`
- Actual changed files reviewed:
  - `/.recursive/DECISIONS.md`
  - `role-model-router/apps/runtime-ui/**` (product scope from Phase 3; unchanged in this phase)

## Gaps Found

- None

## Repair Work Performed

- Added run-35 entry to `/.recursive/DECISIONS.md` and authored this receipt.

## Requirement Completion Status

- R0 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`
- R1 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R2 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R3 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R4 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R5 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R6 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R7 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R8 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R9 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R10 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- R11 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.md`
- R12 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.md`
- R13 | Status: partial | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md` (request-detail disclosure environment-blocked)
- R14 | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`

## Audit Verdict

- The decision ledger now contains the durable run-35 closeout entry, and the receipt accurately describes that exact control-plane delta.

Audit: PASS
