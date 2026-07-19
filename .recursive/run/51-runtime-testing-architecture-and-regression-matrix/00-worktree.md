Run: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
Phase: `00 Worktree`
Status: `LOCKED`
LockedAt: `2026-06-20T07:51:37Z`
LockHash: `ebe5ad07a428e08c677e76a26d6bd2a6a092843cd8c12cecf406906fb877c93b`
Inputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
- Current git repository state on `main`
Outputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`
Scope note: This document records the Phase 0 worktree context and the executable diff basis that all later audited phases must reuse.

## TODO

- [x] Confirm the selected worktree location and isolation approach
- [x] Confirm the base branch and worktree branch values
- [x] Run setup and verify the clean or explicitly acknowledged test baseline
- [x] Confirm the diff basis fields still match live git state
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Directory Selection

- Repository root: `D:\DEV\role-model`
- Preferred worktree location from the draft: `.worktrees/51-runtime-testing-architecture-and-regression-matrix/`
- Attempted repo-local worktree path: `D:\DEV\role-model\.worktrees\51-runtime-testing-architecture-and-regression-matrix`
- Selected worktree location: `D:\wt\rm51`
- Repository-relative worktree path: external to the repo root
- Ignore verification: not required because the selected worktree lives outside the repository tree
- Selection rationale:
  - the repo-local `.worktrees/...` attempt failed on Windows path-length limits while checking out tracked recursive evidence under run `47`
  - the shorter external path preserves worktree isolation without shortening or mutating tracked repository paths
- All later phase work for run `51` must execute from `D:\wt\rm51`, not from the dirty source checkout.

## Safety Verification

- Source repository branch before worktree creation: `main`
- Source repository state before worktree creation:
  - tracked local residue existed outside run `51` in `role-model-router/apps/runtime-host-bridge/src/benchmark-progress.ts`, `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`, and `skills-lock.json`
  - untracked local residue also existed outside run `51`, including `.agents/skills/e2e-testing-patterns/`, `role-model-router/apps/runtime-ui/build/`, `role-model-router/vendor/llama-swap/dist-assets/`, and the source-checkout draft for `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
- Isolation result:
  - work moved to feature branch `recursive/51-runtime-testing-architecture-and-regression-matrix` in the external worktree `D:\wt\rm51`
  - the run `51` recursive artifacts were copied into the worktree because the source-checkout run folder is untracked and later phases must anchor to the isolated worktree copy

## Worktree Creation

- First attempt (failed due Windows filename length during checkout of tracked recursive evidence):

  `git worktree add '.worktrees/51-runtime-testing-architecture-and-regression-matrix' -b 'recursive/51-runtime-testing-architecture-and-regression-matrix' 'fa4dca31b4df9b788987652e1646e85ceeab82d0'`

- Successful fallback command:

  `git worktree add 'D:\wt\rm51' 'recursive/51-runtime-testing-architecture-and-regression-matrix'`

- Run-artifact sync command:

  `Copy-Item -Recurse -Force 'D:\DEV\role-model\.recursive\run\51-runtime-testing-architecture-and-regression-matrix' 'D:\wt\rm51\.recursive\run\'`

- Result: success
- Resulting phase-start status:
  - the external worktree checked out successfully at the run baseline commit
  - `git status --short --branch` in `D:\wt\rm51` shows only the intentional untracked run `51` recursive artifacts

## Main Branch Protection

- Base branch source of truth: `main`
- Worktree branch: `recursive/51-runtime-testing-architecture-and-regression-matrix`
- Base commit copied into the worktree: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- `origin/main` matches the local base commit at worktree creation time
- No exception to isolated worktree execution was taken

## Project Setup

- Setup command:

  `corepack pnpm install --frozen-lockfile`

- Result: success
- Notes:
  - pnpm reported the pre-existing cyclic workspace dependency warning between `adapter-execution` and `provider-anthropic`
  - pnpm reported ignored dependency build scripts for `@biomejs/biome`, `esbuild`, `sharp`, and `workerd`
  - installation itself completed successfully in the isolated worktree

## Test Baseline Verification

| Command | Result |
| --- | --- |
| `corepack pnpm --filter @role-model-router/runtime-ui test` | PASS, `15/15` files and `172/172` tests green |
| `corepack pnpm run runtime:validate-ui` | PASS, deterministic runtime-host + runtime-ui validator completed with routed-request proof and telemetry readback |

- Baseline state: focused green
- Baseline meaning:
  - the isolated worktree can already run both the package-level runtime UI suite and the repo-owned runtime UI validator
  - later phases may expand the testing architecture, but regressions against these existing baseline layers count as run `51` regressions unless the run explicitly re-baselines them

## Worktree Context

- Repository root for later phases: `D:\wt\rm51`
- Base branch: `main`
- Worktree branch: `recursive/51-runtime-testing-architecture-and-regression-matrix`
- Base commit: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Subsequent phases execute from this worktree only

## Diff Basis For Later Audits

- Baseline type: `local commit`
- Baseline reference: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Comparison reference: `working-tree`
- Normalized baseline: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Base branch: `main`
- Worktree branch: `recursive/51-runtime-testing-architecture-and-regression-matrix`
- Diff basis notes:
  - the normalized diff command currently returns no tracked file changes in the fresh worktree baseline
  - the intentional run `51` recursive artifacts are currently untracked and therefore sit outside the tracked diff until later phases decide how to stage them

## Traceability

- Recursive workflow safety -> Phase 0 creates an isolated feature-branch worktree before AS-IS analysis or planning.
- Windows compatibility -> the shorter external worktree path avoids path-length checkout failure without weakening diff-basis traceability.
- Baseline fidelity -> the selected baseline commands prove both existing package-level runtime UI coverage and the current runtime UI validator path before the testing-architecture changes begin.
- Main-branch safety -> known source-checkout residue is acknowledged and fenced off rather than silently inherited.

## Coverage Gate

- [x] Worktree location and branch context are recorded
- [x] Setup and clean or explicitly acknowledged baseline verification are recorded
- [x] Diff basis fields are executable against live git state

Coverage: PASS

## Approval Gate

- [x] Phase 0 context is ready for downstream audited phases
- [x] No unresolved setup or diff-basis inconsistencies remain
- [x] Known source-checkout residue is explicitly isolated from the worktree baseline

Approval: PASS