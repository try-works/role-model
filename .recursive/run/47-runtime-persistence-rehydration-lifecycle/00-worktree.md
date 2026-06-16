Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `00 Worktree`
Status: `LOCKED`
LockedAt: `2026-06-15T15:31:48Z`
LockHash: `c19b77af7e270a587238bfe4bdfe9c904c6aeaee0cb6e4af7abcf52143431c6e`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- Current git repository state on `main` @ `dee829410458d03cef7e98fff7bda4472dec5fa9`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-worktree.md`
Scope note: This document records the isolated worktree, executable diff basis, setup command, and acknowledged baseline for run 47. All later phases must execute from this worktree branch only.

## TODO

- [x] Confirm the selected worktree location and isolation approach
- [x] Confirm the base branch and worktree branch values
- [x] Run setup and record the acknowledged baseline state
- [x] Confirm the diff basis fields still match live git state
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Directory Selection

- Selected worktree location: `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle`
- Repository-relative worktree path: `.worktrees\47-runtime-persistence-rehydration-lifecycle\`
- Ignore verification: `.worktrees` is git-ignored (`git check-ignore .worktrees`)
- Run artifacts were initially drafted in the dirty repo-root checkout, then copied into this worktree so later phases lock and evolve the branch-local copies only.
- All later phase work for this run must execute from this worktree, not from the dirty local `main` checkout.

## Safety Verification

- Source repository branch before worktree creation: `main`
- Source repository baseline commit: `dee829410458d03cef7e98fff7bda4472dec5fa9`
- Source repository state before worktree creation: committed `main` plus unrelated local dirty/untracked artifacts, including the initial untracked run-47 draft folder
- Isolation result: work moved to feature branch `recursive/47-runtime-persistence-rehydration-lifecycle` in a separate worktree so run 47 does not inherit or modify repo-root residue.

## Worktree Creation

- Creation command:

  `git worktree add .worktrees\47-runtime-persistence-rehydration-lifecycle -b recursive/47-runtime-persistence-rehydration-lifecycle`

- Result: success
- Worktree branch created at commit: `dee829410458d03cef7e98fff7bda4472dec5fa9`
- Follow-up normalization: branch-local run artifacts were copied into `.recursive\run\47-runtime-persistence-rehydration-lifecycle\` after creation so Phase 0+ receipts live on the implementation branch.

## Main Branch Protection

- Base branch source of truth: `main`
- Worktree branch: `recursive/47-runtime-persistence-rehydration-lifecycle`
- Base commit copied into the worktree: `dee829410458d03cef7e98fff7bda4472dec5fa9`
- No repo-root product or control-plane edits are allowed for this run after worktree creation.

## Project Setup

- Setup command:

  `Set-Location D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle; corepack pnpm install --frozen-lockfile`

- Result: success
- Notes:
  - workspace install completed in the isolated worktree
  - install emitted non-blocking warnings about cyclic workspace dependencies, ignored build scripts, and Node experimental SQLite usage

## Test Baseline Verification

- Baseline commands:

  `Set-Location D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle; corepack pnpm --filter ./role-model-router/packages/sqlite-memory test`

  `Set-Location D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle; corepack pnpm --filter ./role-model-router/apps/runtime-ui test`

  `Set-Location D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle; corepack pnpm --filter ./role-model-router/apps/runtime-host-bridge... build`

  `Set-Location D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle; corepack pnpm --filter ./role-model-router/apps/runtime-host-bridge test`

- Results:
  - `@role-model-router/sqlite-memory`: **PASS** (`23/23` tests)
  - `@role-model-router/runtime-ui`: **PASS** (`108/108` tests)
  - `@role-model-router/runtime-host-bridge... build`: **PASS**
  - `@role-model-router/runtime-host-bridge test`: **ACKNOWLEDGED FAIL baseline**

- Acknowledged host-bridge baseline failures after the dependency-graph build:
  - `test/executable.test.ts` fails executable validation because esbuild cannot resolve several `@role-model-router/*` package entrypoints from `dist\index.js` / `dist\benchmark-runner.js`
  - `test/benchmark-runner-compare.test.ts` times out at `5000ms`
  - `test/validate-vendors.test.ts` times out at `15000ms`

- Baseline meaning:
  - the fresh-install failure class from unresolved `test/index.test.ts` / `test/validate-restart-rehydration.test.ts` reduced after the targeted build, so those are **not** part of the final acknowledged baseline
  - later phases must treat the remaining three host-bridge failures as pre-change baseline evidence unless the run explicitly changes them with new RED/GREEN proof

## Worktree Context

- Repository root for later phases: `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle`
- Base branch: `main`
- Worktree branch: `recursive/47-runtime-persistence-rehydration-lifecycle`
- Base commit: `dee829410458d03cef7e98fff7bda4472dec5fa9`

## Diff Basis For Later Audits

- Baseline type: `local commit`
- Baseline reference: `dee829410458d03cef7e98fff7bda4472dec5fa9`
- Comparison reference: `working-tree`
- Normalized baseline: `dee829410458d03cef7e98fff7bda4472dec5fa9`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only dee829410458d03cef7e98fff7bda4472dec5fa9`
- Base branch: `main`
- Worktree branch: `recursive/47-runtime-persistence-rehydration-lifecycle`
- Diff basis notes: later audited phases must reuse this basis unless an explicit Phase 0 update changes it and revalidates the command.

## Traceability

- Recursive workflow safety -> Phase 0 creates an isolated feature-branch worktree before AS-IS analysis or implementation.
- Baseline hygiene -> Phase 0 distinguishes clean focused package baselines from acknowledged pre-existing host-bridge failures so later regression claims stay honest.

## Coverage Gate

- [x] Worktree location and branch context are recorded
- [x] Setup and baseline verification are recorded, including the acknowledged host-bridge failures
- [x] Diff basis fields are executable against live git state

Coverage: PASS

## Approval Gate

- [x] Phase 0 context is ready for downstream audited phases
- [x] No unresolved setup or diff-basis inconsistencies remain

Approval: PASS
