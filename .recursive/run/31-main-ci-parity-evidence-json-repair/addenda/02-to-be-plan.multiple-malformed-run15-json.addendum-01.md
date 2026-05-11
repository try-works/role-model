Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T21:18:51Z`
LockHash: `447d9ce3f179f60849069fdcc8ca4308fedd8f372047ffd6e06a074cd6ecb388`
Addendum: `01`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.multiple-malformed-run15-json.addendum-01.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-browser-probe-normalization-check.log`
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`
Scope note: This addendum corrects the locked Phase 2 plan after the Phase 3 RED guard proved the malformed run-15 JSON class includes one file to remove and one file to normalize.

## TODO

- [x] Re-read the locked plan and the corrected RCA addendum
- [x] Update the exact tracked-artifact write surface
- [x] Preserve strict TDD while broadening the repair from one file to two
- [x] Re-state the local and GitHub validation path
- [x] Complete the audited sections and gates

## Remediation Target

The Phase 3 implementation must now complete all of the following together:

1. keep the new focused recursive-evidence RED guard as the regression harness
2. remove the stray shell-transcript `.json` artifact
3. normalize the cited browser-probe `.json` by stripping only the leading `result: ` wrapper so the existing payload becomes valid JSON
4. re-run focused and end-to-end parity validation after the two-file repair

## Planned Changes by File

- `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
  - remove the uncited shell-transcript `.json` file entirely
- `/.recursive/run/15-unified-vendor-execution/evidence/browser/run15-real-vendor-browser-probe.json`
  - normalize the existing payload to plain JSON by removing only the leading `result: ` wrapper
- `/packages/schema-tools/test/recursive-evidence-json.test.ts`
  - keep the focused regression test that scans tracked recursive `.json` files for parseable JSON payloads
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/*`
  - preserve the existing RED evidence from the focused guard
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/*`
  - capture GREEN evidence for normalization, the focused guard, local parity, and GitHub parity

## Implementation Steps

1. Keep `packages/schema-tools/test/recursive-evidence-json.test.ts` as the authoritative RED guard and preserve `phase3-recursive-evidence-json.red.log` as the failing baseline.
2. Remove `sp5-real-vendor-validation.json` because it is irreducible shell-failure residue, not honest JSON evidence.
3. Normalize `run15-real-vendor-browser-probe.json` by stripping only the leading `result: ` prefix and preserving the remaining payload verbatim.
4. Re-run the focused guard and capture GREEN evidence proving both malformed run-15 `.json` paths are repaired.
5. Re-run `corepack pnpm run ci:check` and capture GREEN evidence for the formerly failing parity surface.
6. Push the repair branch and confirm GitHub Actions CI passes.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve the existing failing run of `packages/schema-tools/test/recursive-evidence-json.test.ts`
- GREEN plan:
  - remove the shell-transcript `.json`
  - normalize the browser-probe `.json`
  - rerun the same focused guard
  - rerun `corepack pnpm run ci:check`
- Commands:
  - RED focused guard: `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`
  - GREEN focused guard: same command after the two-file repair
  - Final local parity validation: `corepack pnpm run ci:check`

## Manual QA Scenarios

1. **Shell transcript residue removed**
   - confirm `sp5-real-vendor-validation.json` no longer exists
   - confirm the sibling `sp5-real-vendor-validation.log` still exists
2. **Browser probe normalized honestly**
   - open `run15-real-vendor-browser-probe.json`
   - confirm it begins with `{` rather than `result: {`
   - confirm the payload still contains the existing browser probe data
3. **Focused guard and parity validation**
   - run the focused guard
   - run `corepack pnpm run ci:check`
   - confirm both are green

## Idempotence and Recovery

- Re-running the focused guard is safe and read-only.
- Deleting `sp5-real-vendor-validation.json` is idempotent.
- Reapplying the browser-probe normalization should be a no-op after the first repair because the file should already begin with `{`.
- If parity still fails after both file repairs and the focused guard is green, stop and reopen RCA rather than stacking more artifact cleanup.

## Implementation Sub-phases

### SP1. Two-file tracked JSON repair

Scope and purpose:
Repair the full malformed run-15 JSON class proven by RED without widening beyond the two identified files.

Requirement mapping: `R1`, `R2`, `R5`

Implementation checklist:
- [ ] remove `sp5-real-vendor-validation.json`
- [ ] normalize `run15-real-vendor-browser-probe.json`
- [ ] preserve the existing run-15 cited `.log` and screenshot evidence

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`

Sub-phase acceptance:
- both formerly failing run-15 `.json` paths now satisfy the focused guard honestly

### SP2. Parity revalidation

Scope and purpose:
Prove the repaired branch clears the original CI surface locally and in GitHub Actions.

Requirement mapping: `R3`, `R4`, `R5`

Implementation checklist:
- [ ] capture GREEN evidence for the focused guard
- [ ] run `corepack pnpm run ci:check`
- [ ] push the branch and confirm CI passes

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`
- `corepack pnpm run ci:check`

Sub-phase acceptance:
- focused guard green, local parity green, GitHub parity green

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.multiple-malformed-run15-json.addendum-01.md`

This addendum corrects the implementation surface and validation sequence. It does **not** widen the run beyond the original locked requirements.

## Traceability

- `R1`, `R2`, `R5` -> the two-file repair plan is captured in `## Planned Changes by File`, `## Implementation Steps`, and `SP1`
- `R3`, `R4`, `R5` -> the focused guard plus parity revalidation path is captured in `## Testing Strategy` and `SP2`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `delegated agents remained available, but the plan correction follows directly from the controller-owned RED guard and corrected RCA addendum.`
Delegation Decision Basis: `the plan change is a narrow reconciliation of one new focused test with two concrete tracked-artifact repairs.`
Delegation Override Reason: `self-audit kept the corrected implementation plan aligned with the just-locked RCA addendum.`
Audit Inputs Provided:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.multiple-malformed-run15-json.addendum-01.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-browser-probe-normalization-check.log`
- Changed files:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`
- Targeted code references:
  - `/packages/schema-tools/test/recursive-evidence-json.test.ts`
  - `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
  - `/.recursive/run/15-unified-vendor-execution/evidence/browser/run15-real-vendor-browser-probe.json`
  - `/package.json`
  - `/.github/workflows/ci.yml`

## Effective Inputs Re-read

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.multiple-malformed-run15-json.addendum-01.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-browser-probe-normalization-check.log`

## Earlier Phase Reconciliation

- `02-to-be-plan.md`:
  - claim carried forward: the run needs a focused guard plus honest artifact repair
  - current reconciliation: the focused guard remains correct, but the artifact repair expands from one file to two with distinct repair tactics

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.multiple-malformed-run15-json.addendum-01.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-browser-probe-normalization-check.log`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Comparison reference: `working-tree`
- Normalized baseline: `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Actual changed files reviewed:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`
  - `/packages/schema-tools/test/recursive-evidence-json.test.ts`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-browser-probe-normalization-check.log`
- Unexplained drift:
  - none

## Gaps Found

- none; the corrected plan is concrete enough to resume Phase 3.

## Repair Work Performed

- corrected the Phase 2 write surface so implementation now matches the broadened malformed-JSON class proven by RED

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the two-file repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md` | Audit Note: scope is now accurately bounded.
- R2 | Status: blocked | Rationale: honest deletion plus normalization are planned but not yet applied. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md` | Audit Note: one file will be removed, one normalized.
- R3 | Status: blocked | Rationale: the focused guard is red-only so far. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log` | Audit Note: GREEN evidence is still pending.
- R4 | Status: blocked | Rationale: local and GitHub parity validation remain future work. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md` | Audit Note: `ci:check` and branch CI remain required.
- R5 | Status: blocked | Rationale: strict TDD is still in progress. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-evidence-json.red.log` | Audit Note: this addendum exists because RED correctly forced a plan correction before repair.

## Coverage Gate

- [x] Corrected write surface recorded
- [x] Strict TDD path preserved
- [x] Local and GitHub validation sequence retained

Coverage: PASS

## Approval Gate

- [x] The corrected plan is concrete and minimal
- [x] The broadened defect scope is fully reflected
- [x] Phase 3 can resume without relying on the outdated one-file plan

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan is now corrected for the two-file malformed run-15 JSON class and remains narrow enough for immediate Phase 3 execution.
Audit: PASS
