Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `00 Worktree`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- Current `origin/dev` worktree state
Outputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-worktree.md`
Scope note: This artifact records the isolated workspace and executable diff basis for all later audited phases.

## TODO

- [x] Confirm the selected worktree location and isolation approach.
- [x] Confirm base and worktree branch values.
- [ ] Run dependency setup and record a clean test baseline before Phase 1.
- [x] Confirm diff-basis fields match the current worktree.
- [ ] Complete final Phase 0 coverage and approval gates after baseline testing.

## Directory Selection

- Repository root: `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity`
- Selected isolated worktree: `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity`
- The ordinary `D:\DEV\role-model` checkout is not used because it contains unrelated user changes.

## Safety Verification

- The worktree was created from `origin/dev` with no inherited working-tree modifications.
- User runtime state, credentials, and Stage-RC state are prohibited as fixtures.
- Package/isolated-runtime evidence must stay in this run's evidence tree or a declared D: temporary directory.

## Worktree Creation

- Worktree branch: `recursive/93-variant-admission-model-pool-integrity`
- Base ref: `origin/dev`
- Base commit: `1aab0512ce23aacc50cea66c2926e374be1e249e`

## Main Branch Protection

- This run changes neither `dev`, `stage`, nor `main` directly.
- Promotion and release publication are out of scope until separately authorized.

## Project Setup

- `recursive-init.py` created the run scaffold.
- Its optional training-loader subprocess emitted a Windows CP1252 encoding error while printing an arrow character; scaffold creation succeeded. This is a non-blocking skill-output issue, not verified training output.

## Test Baseline Verification

- Pending: record dependency setup and an appropriate clean baseline command before Phase 1.

## Worktree Context

- Base branch: `origin/dev`
- Worktree branch: `recursive/93-variant-admission-model-pool-integrity`
- Base commit: `1aab0512ce23aacc50cea66c2926e374be1e249e`

## Diff Basis For Later Audits

- Baseline type: `remote ref`
- Baseline reference: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Comparison reference: `working-tree`
- Normalized baseline: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 1aab0512ce23aacc50cea66c2926e374be1e249e`
- Diff basis notes: Preserve this basis for all Run 93 audits unless a later locked artifact records a reviewed base update.

## Traceability

- R1-R6 -> isolated implementation and later audited diffs use this exact baseline.
- R7-R8 -> fresh-state package and rebuilt-runtime evidence must not reuse developer state.

## Coverage Gate

- [x] Worktree location and branch context are recorded.
- [ ] Setup and clean baseline verification are recorded.
- [x] Diff basis is executable against the live worktree.
Coverage: FAIL

## Approval Gate

- [x] Phase 0 context is ready for requirement review.
- [ ] No unresolved setup or baseline verification remains.
Approval: FAIL
