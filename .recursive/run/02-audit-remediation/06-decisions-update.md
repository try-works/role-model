Run: `/.recursive/run/02-audit-remediation/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-04-24T08:24:23Z`
LockHash: `9a599aa9c3e19ea8da215b566150b6468f67e94b79582d5e9edcc7725a16565e`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/02-audit-remediation/04-test-summary.md`
- `/.recursive/run/02-audit-remediation/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/02-audit-remediation/06-decisions-update.md`
Scope note: This document records the exact `DECISIONS.md` updates made for the completed `02-audit-remediation` run.

## TODO

- [x] Read the Phase 5 manual-QA receipt
- [x] Update `/.recursive/DECISIONS.md` with the run outcome
- [x] Record the ledger delta and rationale
- [x] Complete the audited-phase sections and gates

## Decisions Changes Applied

- Updated path or section: `/.recursive/DECISIONS.md#recursive-run-index`
- Run entry added or edited: added a new `02-audit-remediation` entry after `01-protocol-routing-obs`
- Structural edits: retained the existing run-index structure and appended the narrow remediation as its own durable run outcome

## Rationale

- Why these ledger changes were needed: the repository now has a completed remediation run that restored canonical schema source identity and the root wrapper command path after the 2026-04-24 audit.
- Why this run belongs in this section/index: it is the durable record of the first post-run-01 repair to the baseline validation and schema-source contract.

## Resulting Decision Entry

```md
### Run `02-audit-remediation`

- Run folder: `/.recursive/run/02-audit-remediation/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added stable top-level `$id` values to all committed canonical schema files under `/protocol/schemas/`
  - removed schema-id masking from `/packages/schema-tools/src/validate-schemas.ts` and `/packages/conformance/src/schema-test-helpers.ts`
  - repaired the root script command path by switching nested pnpm calls in `/package.json` to `corepack pnpm ...`
- Why:
  - to bring the repository back into conformance with the documented canonical-schema contract and restore the supported root `corepack pnpm run ...` validation path
- How:
  - implemented a strict RED/GREEN loop with a new schema-source regression, reused the failing wrapper-path conformance slice as red evidence, and revalidated via root `schemas:validate`, `test`, and `smoke`
- What was not done:
  - no unrelated protocol, router, provider, runtime, or repo-wide formatting work was widened into this remediation run
- Known issues / follow-ups:
  - unsupported-engine warnings still persist under `Node v24`
  - `packages/protocol-types/src/generated.ts` can show local CRLF-only status churn after generator-backed tests even when there is no semantic content diff
```

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `delegation remained unavailable for this run because no explicit user authorization for subagents was provided in the session.`
Delegation Decision Basis: `the global decisions ledger is short, high-impact, and best updated directly from the validated Phase 4 and Phase 5 receipts.`
Audit Inputs Provided:
- `/.recursive/run/02-audit-remediation/04-test-summary.md`
- `/.recursive/run/02-audit-remediation/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/DECISIONS.md`
  - `/.recursive/run/02-audit-remediation/06-decisions-update.md`

## Effective Inputs Re-read

- `/.recursive/run/02-audit-remediation/04-test-summary.md`
- `/.recursive/run/02-audit-remediation/05-manual-qa.md`
- `/.recursive/run/02-audit-remediation/03-implementation-summary.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- Manual QA outcome reflected: yes
- Run outcome and scope reflected: yes
- Known caveats reflected: yes

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/02-audit-remediation/06-decisions-update.md`
  - `/.recursive/run/02-audit-remediation/05-manual-qa.md`
  - `/.recursive/DECISIONS.md`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/02-audit-remediation/06-decisions-update.md`
  - `/.recursive/DECISIONS.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `50d03fd386a44957068105ce4673a5dc66a8de12`
- Comparison reference: `working-tree`
- Normalized baseline: `50d03fd386a44957068105ce4673a5dc66a8de12`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 50d03fd386a44957068105ce4673a5dc66a8de12`
- Diff basis used: `git diff --ignore-cr-at-eol --name-only`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/02-audit-remediation`
- Actual changed files reviewed:
  - `.recursive/DECISIONS.md`
  - `.recursive/STATE.md`
  - `.recursive/memory/domains/role-model-baseline.md`
  - `package.json`
  - `packages/conformance/src/schema-test-helpers.ts`
  - `packages/schema-tools/test/validate-schemas.test.ts`
  - `packages/schema-tools/src/validate-schemas.ts`
  - `protocol/schemas/benchmark-run.schema.json`
  - `protocol/schemas/benchmark-suite.schema.json`
  - `protocol/schemas/capability-taxonomy.schema.json`
  - `protocol/schemas/declared-capability-profile.schema.json`
  - `protocol/schemas/endpoint-identity.schema.json`
  - `protocol/schemas/judge-score.schema.json`
  - `protocol/schemas/model-pack-manifest.schema.json`
  - `protocol/schemas/observed-performance-profile.schema.json`
  - `protocol/schemas/package-manifest.schema.json`
  - `protocol/schemas/planspec.schema.json`
  - `protocol/schemas/role-binding.schema.json`
  - `protocol/schemas/role-definition.schema.json`
  - `protocol/schemas/router-decision.schema.json`
  - `protocol/schemas/routing-policy.schema.json`
  - `protocol/schemas/task-definition.schema.json`
  - `protocol/schemas/task-execution-profile.schema.json`
  - `protocol/schemas/trace-event.schema.json`
  - `protocol/schemas/trace-span.schema.json`
  - `protocol/schemas/usage-event.schema.json`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- added the durable run-index entry for `02-audit-remediation` and synchronized this receipt to the final ledger text

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/02-audit-remediation/05-manual-qa.md`, `/.recursive/run/02-audit-remediation/04-test-summary.md`
- R2 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/02-audit-remediation/05-manual-qa.md`, `/.recursive/run/02-audit-remediation/04-test-summary.md`
- R3 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/02-audit-remediation/05-manual-qa.md`, `/.recursive/run/02-audit-remediation/04-test-summary.md`
- R4 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/02-audit-remediation/05-manual-qa.md`, `/.recursive/run/02-audit-remediation/04-test-summary.md`
- R5 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/02-audit-remediation/05-manual-qa.md`, `/.recursive/run/02-audit-remediation/04-test-summary.md`

## Audit Verdict

- Audit summary: the global decisions ledger now accurately reflects the completed remediation run.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> the durable decisions ledger now records the repaired canonical schema source-identity contract as completed run history. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/02-audit-remediation/06-decisions-update.md`
- `R2` -> the durable decisions ledger now records removal of schema-id masking from loader/helper paths as completed run history. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/02-audit-remediation/06-decisions-update.md`
- `R3` -> the durable decisions ledger now records restoration of the root `schemas:validate` wrapper path. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/02-audit-remediation/06-decisions-update.md`
- `R4` -> the durable decisions ledger now records restoration of the root `smoke` wrapper path. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/02-audit-remediation/06-decisions-update.md`
- `R5` -> the durable decisions ledger now records the validated narrow remediation scope and its root validation posture. | Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/02-audit-remediation/05-manual-qa.md`, `/.recursive/run/02-audit-remediation/06-decisions-update.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/02-audit-remediation/04-test-summary.md`
  - `/.recursive/run/02-audit-remediation/05-manual-qa.md`
  - `/.recursive/DECISIONS.md`

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the run outcome is now discoverable in the global ledger
  - no required Phase 6 section is missing

Approval: PASS
