Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-11T21:04:11Z`
LockHash: `8026f4fa83161e62a7c771a8e38efb2ebe6eee4d2c69bc2b73317eb311a7d0e2`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- merged `origin/main` at `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- GitHub Actions run `#72` (`25696978203`) on `main`
- `/.github/workflows/ci.yml`
- `/package.json`
- `/.recursive/run/15-unified-vendor-execution/evidence/logs/green/sp5-real-vendor-validation.json`
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/00-requirements.md`
Scope note: This bugfix run repairs the main-branch CI parity failure triggered after merging the routing rollout through run 30. The immediate symptom is a tracked recursive evidence file with a `.json` suffix that is not valid JSON and breaks `pnpm run ci:check` through Biome.

## TODO

- [x] Capture the merged-main CI failure as the run source requirement
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Bound the bugfix scope to CI-parity repair and durable regression protection
- [x] Document constraints and assumptions for the merged-main repair path
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Reproduce and isolate the merged-main CI parity failure

Description:
The run must capture the failing `main` behavior from the merged baseline and identify the exact tracked input that breaks the CI parity step.

Acceptance criteria:
- run-owned evidence reproduces the failure from the merged `main` baseline
- the failing file path or paths are identified precisely, not described only at the workflow level
- the run determines whether the defect is isolated to one tracked artifact or part of a broader class of malformed evidence files

### `R2` Repair the malformed tracked recursive evidence without falsifying locked history

Description:
The fix must correct the tracked malformed artifact or artifact class in a way that keeps the recursive run history honest and does not invent evidence that was never produced.

Acceptance criteria:
- the invalid tracked evidence path no longer causes Biome or `ci:check` to fail on the repaired branch
- the chosen repair is consistent with the locked run-15 artifacts and their cited evidence surface
- if the malformed file is stray residue rather than required evidence, the repair removes or reclassifies it rather than silently fabricating replacement data

### `R3` Add regression protection for this CI-parity failure mode

Description:
The repo should not silently reintroduce malformed tracked evidence that claims to be JSON but contains shell error text or other non-JSON payloads.

Acceptance criteria:
- the run adds the smallest durable protection that prevents this failure mode from re-entering the tracked baseline
- the protection is repo-owned and reproducible locally, not a one-off manual cleanup only
- the protection is validated with focused failing-then-passing evidence before any production change

### `R4` Revalidate the repaired parity path end to end

Description:
The bugfix is not complete until the repaired branch proves the CI parity path locally and in GitHub Actions.

Acceptance criteria:
- the strongest relevant local command chain for this defect is rerun after the fix and passes
- the resulting GitHub Actions CI run for the repair branch or merged fix passes the formerly failing parity surface
- the run records the post-fix validation evidence in its audited artifacts

### `R5` Follow recursive debugging and TDD discipline for the bugfix

Description:
Because this is a CI failure investigation, the run must include explicit root-cause analysis before implementation and must keep all code or tracked-artifact changes under failing-then-passing verification.

Acceptance criteria:
- the run includes `01.5-root-cause.md` with an evidence-backed root-cause finding before Phase 2 planning is locked
- any corrective change in Phase 3 is preceded by failing focused evidence
- the final run closes only after the root cause, fix, and verification path are all documented

## Out of Scope

- `OOS1`: unrelated formatting cleanup across the recursive evidence tree that does not affect the reproduced CI failure
- `OOS2`: reopening run-15 feature scope beyond the malformed tracked evidence or the minimum regression protection needed for parity
- `OOS3`: unrelated `main` worktree cleanup in `D:\DEV\role-model`

## Constraints

- the fix must start from merged `origin/main` commit `cf711d0e4882bab64ca3b4ec772b700982ad50e4`
- locked prior-phase artifacts from earlier runs must not be edited; any corrective explanation belongs to the current run
- the dirty root `main` worktree must remain untouched during implementation
- the run must use Phase `01.5` root-cause analysis before Phase `02` planning

## Assumptions

- the immediate failure is caused by tracked malformed evidence rather than a missing dependency or transient GitHub Actions outage
- the invalid `.json` artifact is not a required cited evidence file in locked run-15 receipts
- a focused local reproduction of the Biome parse error is sufficient to anchor root-cause analysis before rerunning the full parity chain

## Coverage Gate

- [x] Requirements identify the failing merged-main CI surface and the expected repaired outcome
- [x] Constraints preserve locked history and isolate the dirty root `main` worktree
- [x] Root-cause and TDD discipline are explicit for the bugfix run

Coverage: PASS

## Approval Gate

- [x] The run scope is specific enough for Phase 0, Phase 1, and Phase 1.5
- [x] The repaired outcome is verifiable locally and in GitHub Actions
- [x] No unresolved ambiguity remains about preserving locked prior-run history

Approval: PASS
