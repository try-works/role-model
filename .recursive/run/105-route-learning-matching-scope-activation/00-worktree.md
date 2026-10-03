Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `00 Worktree`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/00-requirements.md`
- Current git repository state (public and private `origin/dev` at fork time, 2026-10-03)
Outputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/00-worktree.md`
Scope note: This document records the Phase 0 worktree context and the executable diff basis that all later audited phases must reuse.

## TODO

- [x] Confirm the selected worktree location and isolation approach
- [x] Confirm the base branch and worktree branch values
- [ ] Run setup and verify the clean test baseline
- [x] Confirm the diff basis fields still match live git state
- [ ] Complete Coverage Gate checklist
- [ ] Complete Approval Gate checklist

## Directory Selection

- Public worktree root: `D:\DEV\role-model\.worktrees\105-route-learning-matching-scope-activation`
- Private worktree root: `D:\DEV\role-model-internal\.worktrees\105-route-learning-matching-scope-activation`
- Selected location: `.worktrees/105-route-learning-matching-scope-activation/` in both repositories (existing
  `.worktrees/` convention; private worktrees must live under `role-model-internal/.worktrees/`).
- Isolation: both are separate checkouts on the run branch; the controller checkouts (`D:\DEV\role-model` and
  `D:\DEV\role-model-internal`, both on `dev`) were not modified by run setup.

## Safety Verification

- Public: `git check-ignore .worktrees` -> ignored (`.gitignore:1:.worktrees/`).
- Private: `git check-ignore .worktrees` -> ignored (`/.worktrees/`).
- Run branches are `recursive/105-route-learning-matching-scope-activation` in both repositories; neither `main`
  nor `stage` was touched, and no PR was created by run setup.
- Both `origin/dev` refs were current at fork time (public `701b8b8f`, private `c993b2f2`); the worktrees were
  created from those exact commits.
- Run number selection: no `105*` worktree or `.recursive/run/105*` directory existed in either repository before
  this run was created.

## Worktree Creation

Public command:
`git -C D:\DEV\role-model worktree add .worktrees/105-route-learning-matching-scope-activation -b recursive/105-route-learning-matching-scope-activation dev`

Private command:
`git -C D:\DEV\role-model-internal worktree add .worktrees/105-route-learning-matching-scope-activation -b recursive/105-route-learning-matching-scope-activation dev`

Result: both worktrees created clean; public HEAD `701b8b8f`, private HEAD `c993b2f2`.

## Main Branch Protection

- The run never executes on `main`/`master`/`stage`; the base is the integration branch `dev` in both repos.
- No main-branch exception is requested or recorded.

## Normalized Diff Basis

- Baseline type: integration branch `dev`
- Baseline reference: public `701b8b8fc0b0eeebdfe818b757f5702f50021488` / private `c993b2f2ebe8e1daa8ee506a50af0ea09f61b5f9`
- Comparison reference: `recursive/105-route-learning-matching-scope-activation` (worktree HEAD, equals the baseline until Phase 2 changes land)
- Normalized baseline: `git rev-parse HEAD^{tree}` on the worktree at fork time
- Normalized comparison: `git rev-parse HEAD^{tree}` on the worktree at each phase boundary
- Normalized diff command: `git diff --stat <baseline>..HEAD` from the worktree

## Setup

- Setup command (public + private): `corepack pnpm install` (to run at Phase 0 completion; the worktrees are
  fresh checkouts and do not share the controller checkouts' node_modules).
- Baseline test command: `corepack pnpm run runtime:test-critical` (public); result recorded at Phase 0 completion.
- Subsequent phases run from the worktrees, not the controller checkouts.
