Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T21:14:08Z`
LockHash: `8859f90aeb5695c88c142c35dd6eb12dc24a147dca40bf083e9cf9474064e7b5`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-worktree.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01-as-is.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01.5-root-cause.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase1-5-malformed-json-class-scan.log`
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked CI-parity RCA into a minimal honest repair that removes the stray malformed run-15 `.json` artifact, adds focused repo-owned regression protection for tracked recursive JSON evidence, and then revalidates the parity chain locally and in GitHub Actions.

## TODO

- [x] Re-read the locked Phase 0, Phase 1, and Phase 1.5 artifacts
- [x] Define the exact tracked-artifact and test-file change surface
- [x] Define the strict-TDD red and green evidence path
- [x] Specify the local and GitHub validation commands
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Planned Changes by File

- `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
  - remove the stray malformed tracked file because it is uncited residue that contains shell-failure text rather than honest JSON evidence
- `/packages/schema-tools/test/recursive-evidence-json.test.ts`
  - add a focused repo-owned regression test that walks tracked recursive `.json` evidence files and fails if any file cannot be parsed as JSON
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/*`
  - capture strict RED evidence for the new recursive-evidence JSON guard against the current malformed run-15 file
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/*`
  - capture GREEN evidence for the guard, local parity validation, and any GitHub follow-up needed by this run

## Implementation Steps

1. Add the first failing regression in `packages/schema-tools/test/recursive-evidence-json.test.ts` so the repo has a focused automated proof of the malformed recursive-evidence failure mode before any tracked artifact changes occur.
2. Capture RED evidence from the new focused test while `sp5-real-vendor-validation.json` still exists and still contains the shell-failure transcript.
3. Remove `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json` without inventing replacement JSON, leaving the already-cited `.log` and browser JSON evidence untouched.
4. Re-run the new focused test and capture GREEN evidence proving the malformed-evidence guard now passes.
5. Re-run the strongest relevant local parity chain for this defect, centered on `corepack pnpm run ci:check`, and capture GREEN evidence once the repaired branch clears the formerly failing surface.
6. Push the repair branch and confirm GitHub Actions CI passes the previously failing parity surface.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add `packages/schema-tools/test/recursive-evidence-json.test.ts`
  - capture the failing focused run while the malformed run-15 `.json` artifact still exists
- GREEN plan:
  - remove the stray malformed `.json`
  - re-run the same focused test after the repair
  - then re-run the strongest relevant local parity chain
- New behavior tests:
  - `packages/schema-tools/test/recursive-evidence-json.test.ts` should assert that tracked recursive `.json` evidence is parseable JSON and report the offending path when it is not
- Regression tests:
  - `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`
- Guardrail tests:
  - `corepack pnpm run ci:check`
- Commands:
  - RED focused guard: `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`
  - GREEN focused guard: same command after the repair
  - Final local parity validation: `corepack pnpm run ci:check`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: the defect is a tracked evidence and CI parity issue with no browser UI surface.

## Manual QA Scenarios

1. **Tracked run-15 evidence honesty**
   - Steps:
     - inspect `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/`
     - confirm `sp5-real-vendor-validation.log` still exists
     - confirm the malformed `sp5-real-vendor-validation.json` is gone after the repair
   - Expected:
     - the run-15 evidence folder still preserves the cited `.log`
     - no fabricated replacement JSON is introduced

2. **Focused recursive-evidence guard**
   - Steps:
     - run `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`
   - Expected:
     - the focused guard fails before the repair and passes after the repair

3. **Parity revalidation**
   - Steps:
     - run `corepack pnpm run ci:check`
   - Expected:
     - the repaired branch clears the formerly failing malformed-JSON parity surface

## Idempotence and Recovery

- The new recursive-evidence test is read-only and safe to re-run repeatedly.
- Removing the stray malformed `.json` is idempotent because the file is not required by the locked run-15 receipts.
- If the focused guard finds additional malformed tracked `.json` files during Phase 3, treat them as the same failure class and repair only those newly proven paths; do not widen into unrelated recursive cleanup.
- If `ci:check` still fails after the malformed file is removed and the focused guard is green, stop and reopen root-cause analysis rather than stacking speculative fixes.

## Implementation Sub-phases

### SP1. Focused recursive-evidence guard

Scope and purpose:
Introduce the smallest repo-owned automated check that reproduces this failure mode independently of broad Biome lint.

Requirement mapping: `R1`, `R3`, `R5`

Implementation checklist:
- [ ] add a failing test at `packages/schema-tools/test/recursive-evidence-json.test.ts`
- [ ] capture RED evidence showing the current malformed run-15 `.json` path
- [ ] ensure the test reports the offending file path explicitly

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`

Sub-phase acceptance:
- the focused test fails red against the current malformed tracked artifact and names the offending path directly

### SP2. Honest tracked-artifact repair and parity revalidation

Scope and purpose:
Remove the stray malformed `.json` without rewriting locked history, then prove the repaired branch clears local and GitHub parity.

Requirement mapping: `R2`, `R4`, `R5`

Implementation checklist:
- [ ] remove `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
- [ ] capture GREEN evidence for the focused guard
- [ ] run `corepack pnpm run ci:check`
- [ ] push the repair branch and confirm GitHub Actions CI passes

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/schema-tools exec vitest run test/recursive-evidence-json.test.ts`
- `corepack pnpm run ci:check`

Sub-phase acceptance:
- the malformed tracked evidence path is gone, the focused guard is green, and the repaired branch passes the formerly failing parity surface

## Prior Recursive Evidence Reviewed

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-worktree.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01-as-is.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01.5-root-cause.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase1-5-malformed-json-class-scan.log`
- `/packages/schema-tools/test/validate-schemas.test.ts`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `delegated agents remained available, but Phase 2 needed one tightly-scoped plan that keeps the honest-history repair and the new focused guard in the same controller-owned flow.`
Delegation Decision Basis: `the implementation surface is small and coupled: one tracked artifact removal, one new focused test, and one parity validation chain.`
Delegation Override Reason: `self-audit is less error-prone than splitting a minimal two-file repair across delegated fragments.`
Audit Inputs Provided:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-worktree.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01-as-is.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01.5-root-cause.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase1-5-malformed-json-class-scan.log`
- Changed files:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- Targeted code references:
  - `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
  - `/packages/schema-tools/test/validate-schemas.test.ts`
  - `/package.json`
  - `/.github/workflows/ci.yml`

## Effective Inputs Re-read

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-worktree.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01-as-is.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/01.5-root-cause.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase1-5-malformed-json-class-scan.log`
- `/packages/schema-tools/test/validate-schemas.test.ts`
- `/package.json`
- `/.github/workflows/ci.yml`

## Earlier Phase Reconciliation

- `01-as-is.md`:
  - claim carried forward: the merged-main failure is isolated to one malformed tracked run-15 `.json` artifact.
  - current reconciliation: the plan keeps the repair limited to that proven artifact class and does not widen into unrelated recursive cleanup.
- `01.5-root-cause.md`:
  - claim carried forward: the honest fix is removal or reclassification plus a focused durable guard.
  - current reconciliation: the plan chooses removal of the stray `.json` and a focused `schema-tools` regression as the smallest concrete implementation of that direction.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-worktree.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/01-as-is.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/01.5-root-cause.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
  - `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
  - `/packages/schema-tools/test/validate-schemas.test.ts`
  - `/package.json`
  - `/.github/workflows/ci.yml`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Comparison reference: `working-tree`
- Normalized baseline: `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Diff basis used: `git diff --name-only cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `origin/main`
- Worktree branch: `recursive/31-main-ci-parity-evidence-json-repair`
- Planned or claimed changed files:
  - `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
  - `/packages/schema-tools/test/recursive-evidence-json.test.ts`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/*`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/*`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/03-implementation-summary.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/04-test-summary.md`
- Actual changed files reviewed:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-worktree.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/01-as-is.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/01.5-root-cause.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase0-install.log`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase0-biome-repro.log`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase1-5-malformed-json-class-scan.log`
- Unexplained drift:
  - none; incidental recursive-tool `__pycache__/` churn remains excluded by repo diff-audit policy

## Gaps Found

- none; the plan is concrete enough for a narrow Phase 3 implementation without reopening the RCA.

## Repair Work Performed

- narrowed the Phase 3 surface to one artifact deletion, one focused test addition, and the exact local-plus-GitHub validation chain needed for this defect

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the focused guard and final implementation are planned, but no new Phase 3 change has landed yet. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md` | Audit Note: planned across `## Planned Changes by File`, `## Implementation Steps`, and `SP1`.
- R2 | Status: blocked | Rationale: the malformed tracked artifact repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md` | Audit Note: Phase 3 will remove the stray `.json` without fabricating replacement evidence.
- R3 | Status: blocked | Rationale: the repo-owned regression guard is planned in `schema-tools` but not yet implemented. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md` | Audit Note: the focused RED/GREEN test path is now explicit.
- R4 | Status: blocked | Rationale: local and GitHub parity revalidation are planned but remain future work. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md` | Audit Note: `ci:check` and branch CI are the required downstream proof.
- R5 | Status: blocked | Rationale: the RCA prerequisite is complete, but strict TDD implementation and final verification have not happened yet. | Blocking Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md` | Audit Note: `SP1` and `SP2` preserve the required debug-then-TDD sequence.

## Audit Verdict

- Audit summary: the plan is concrete, narrow, and directly aligned to the locked RCA and honest-history constraints for `R1`-`R5`.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1`, `R3`, `R5` -> the focused recursive-evidence guard is captured in `## Planned Changes by File`, `## Testing Strategy`, and `SP1`. | Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `R2`, `R4`, `R5` -> the honest artifact removal and parity revalidation path are captured in `## Planned Changes by File`, `## Implementation Steps`, and `SP2`. | Evidence: `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-worktree.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/01-as-is.md`
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/01.5-root-cause.md`
- Requirement coverage check:
  - `R1`-`R5`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Implementation Sub-phases`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS3`: preserved; the plan does not widen into unrelated recursive cleanup, runtime changes, or dirty-root-main repair

Coverage: PASS

## Approval Gate

- [x] The implementation surface is narrow and honest
- [x] Strict RED-GREEN verification is defined before any repair
- [x] The final local and GitHub validation path is explicit
- [x] No speculative or fabricated evidence strategy is planned

Approval: PASS
