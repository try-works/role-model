Run: `/.recursive/run/48-runtime-ui-design-system-apple-theme/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-17T06:00:14Z`
LockHash: `78f37fc156abc1468859ef7b6d3c2eb818dc94d1feeb21827750706ea503f141`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/02-to-be-plan.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/03-implementation-summary.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/04-test-summary.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/05-manual-qa.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/addenda/05-manual-qa.addendum-02.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Decision-ledger delta for the run-48 Apple-inspired runtime-ui design-system baseline and the packaged-runtime QA remediations required to ship it.

## TODO

- [x] Add a run-48 entry to `DECISIONS.md`
- [x] Record the durable UI and packaged-runtime decisions introduced by the run
- [x] Keep the decision entry limited to repo truths future runs must inherit

## Decisions Changes Applied

- Added a new `### Run \`48-runtime-ui-design-system-apple-theme\`` entry to `/.recursive/DECISIONS.md`
- Recorded the durable design-system decisions:
  - `DESIGN_APPLE_REFERENCE.md` is inspiration only; `DESIGN_SYSTEM.md` is the repo-owned runtime-ui authority
  - Swiss-design authority and wording are removed from the runtime-ui contract
  - only explicit `Light` and `Dark` themes ship, with system preference selecting the default at bootstrap
  - the theme toggle belongs to the sidebar shell rather than per-route page headers
  - semantic status pills keep transparent backgrounds and semantic border/text color only
- Recorded the durable packaged-runtime/UI stability decisions:
  - packaged runtime browser QA is authoritative for runtime-ui theme claims, not dev-only previews
  - repo-root runtime-ui build output must win when explicit `repoRoot` is supplied to the packaged runtime path
  - shell-header/page-action wiring is part of the runtime-ui contract because route-level header instability can break unrelated pages
  - reusable custom selects must not inherit native-select chevron gutter spacing
  - shared shell/card/disclosure divider lines are not part of the runtime-ui grammar and should stay removed globally unless a route has a specific owned reason to reintroduce them

## Recorded Run-Owned Decisions (summary)

- The runtime-ui visual baseline is now Apple-inspired rather than Swiss-authoritative.
- The shared shell owns theme switching globally from the sidebar.
- Runtime UI themes are two explicit modes, not a three-state selector.
- Packaged-runtime parity is part of the design-system acceptance contract.
- Shared controls are contract surfaces; late browser QA defects on them require RED/GREEN remediation before closeout.
- Internal header/subnavigation divider lines are now excluded from the shared runtime-ui grammar.

## Rationale

- Run 48 changed durable product behavior and UI governance, not just local styling. Future UI work needs the decision ledger to preserve:
  - which artifact is authoritative for runtime-ui styling
  - which themes are valid operator choices
  - where theme switching belongs
  - that packaged-runtime browser proof is mandatory for runtime-ui closeout

## Resulting Decision Entry

- `/.recursive/DECISIONS.md#run-48-runtime-ui-design-system-apple-theme`

## Traceability

- `R0` -> Apple-inspired runtime-ui contract recorded as durable design-system authority
- `R1` -> token and typography contract carried into the decision ledger
- `R2` -> shared type/control baseline recorded as durable product truth
- `R3` -> explicit Light/Dark theme decision recorded
- `R4` -> shell quieting and tokenized-control cleanup recorded
- `R5` -> route rollout decision preserved as broad runtime-ui ownership rather than a single-page skin
- `R6` -> sidebar theme-toggle placement and viewport containment decision recorded
- `R7` -> transparent semantic-pill decision recorded
- `R8` -> packaged-runtime route/browser QA decision recorded
- `R9` -> Swiss-authority removal recorded as durable governance
- `R10` -> packaged-runtime proof remains an explicit required decision
- `R11` -> late shared-control regression still followed RED/GREEN before closeout

## Coverage Gate

- [x] The exact run-48 decision delta is recorded
- [x] The updated run-48 heading is present in `DECISIONS.md`
- [x] The entry is limited to durable control-plane and UI-governance truths

Coverage: PASS

## Approval Gate

- [x] The decision entry reflects what run 48 actually implemented and verified
- [x] No unrelated historical decision entry was rewritten

Approval: PASS

## Effective Inputs Re-read

- `00-requirements.md`
- `02-to-be-plan.md`
- `03-implementation-summary.md`
- `04-test-summary.md`
- `05-manual-qa.md`
- `addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md`
- `addenda/05-manual-qa.addendum-02.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- The decisions delta matches the locked implementation/test receipts plus the final packaged-runtime QA artifacts.
- The late chevron fix and the final divider-removal fix do not change the decision scope; they reinforce the existing shared-control acceptance rule.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Comparison reference: `working-tree`
- Normalized diff command: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Planned or claimed changed files:
  - `/.recursive/run/48-runtime-ui-design-system-apple-theme/06-decisions-update.md`
  - `/.recursive/DECISIONS.md`

## Requirement Completion Status

- `R0` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R1` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R2` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `04-test-summary.md`, `05-manual-qa.md`
- `R3` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R4` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R5` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R6` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R7` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R8` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R9` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R10` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `05-manual-qa.md`
- `R11` | Status: verified | Verification Evidence: `/.recursive/DECISIONS.md`, `03-implementation-summary.md`, `05-manual-qa.md`

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: the active tool surface for this run still did not expose a callable recursive-subagent workflow
- Delegation Decision Basis: concise closeout ledger work is lower-risk when the controller performs the final artifact-to-ledger reconciliation directly
- Delegation Override Reason: direct reconciliation of final UI truth, packaged-runtime QA, and governance wording was required before recording the durable decision entry
- Audit Inputs Provided:
  - locked phase artifacts through Phase 5
  - current `/.recursive/DECISIONS.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: checked the final run artifacts against the new `DECISIONS.md` entry and the actual changed-file scope
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

Audit: PASS
