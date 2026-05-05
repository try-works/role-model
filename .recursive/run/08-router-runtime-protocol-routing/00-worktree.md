Run: `/.recursive/run/08-router-runtime-protocol-routing/`
Phase: `00 Worktree`
Status: `DRAFT`
Inputs:
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- Current git repository state
Outputs:
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
Scope note: This document records the Phase 0 worktree context and the executable diff basis that all later audited phases must reuse.

## TODO

- [ ] Confirm the selected worktree location and isolation approach
- [ ] Confirm the base branch and worktree branch values
- [ ] Run setup and verify the clean test baseline
- [ ] Confirm the diff basis fields still match live git state
- [ ] Complete Coverage Gate checklist
- [ ] Complete Approval Gate checklist

## Directory Selection

- Repository root: `D:\DEV\role-model`
- Preferred worktree location: `.worktrees/08-router-runtime-protocol-routing/`
- Update this section with the actual selected location before locking Phase 0.

## Safety Verification

- Original branch / repo state observed at init time: `main`
- Isolation still must be confirmed after the actual worktree is created.

## Worktree Creation

- Intended worktree branch: `main`
- Record the actual worktree creation command and output before locking.

## Main Branch Protection

- Base branch source of truth at init time: `main`
- Explicitly document any deviation from isolated worktree execution before locking.

## Project Setup

- Init-time note: recursive-init detected the current repository context and prefilled the Phase 0 diff basis.
- Replace this section with the actual setup commands and results during Phase 0.

## Test Baseline Verification

- Record the baseline commands and results after setup completes.

## Worktree Context

- Base branch: `main`
- Worktree branch: `main`
- Base commit: `38c3fa78167057e947390c04cb7d31aa8602a24b`

## Diff Basis For Later Audits

- Baseline type: `local commit`
- Baseline reference: `38c3fa78167057e947390c04cb7d31aa8602a24b`
- Comparison reference: `working-tree`
- Normalized baseline: `38c3fa78167057e947390c04cb7d31aa8602a24b`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 38c3fa78167057e947390c04cb7d31aa8602a24b`
- Base branch: `main`
- Worktree branch: `main`
- Diff basis notes: `recursive-init prefilled this executable diff basis from the current HEAD commit. If Phase 0 later changes the chosen baseline, update every diff-basis field and rerun lint before locking.`

## Traceability

- Recursive workflow safety -> Phase 0 records a reusable executable diff basis before audited phases begin.

## Coverage Gate

- [ ] Worktree location and branch context are recorded
- [ ] Setup and clean baseline verification are recorded
- [ ] Diff basis fields are executable against live git state

Coverage: FAIL

## Approval Gate

- [ ] Phase 0 context is ready for downstream audited phases
- [ ] No unresolved setup or diff-basis inconsistencies remain

Approval: FAIL
