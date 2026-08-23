Run: `/.recursive/run/94-stage-manifest-commit-identity/`
Phase: `00 Worktree`
Status: `LOCKED`
LockedAt: `2026-08-23T08:46:35Z`
LockHash: `7d0672a3f5bedd8e6778b895308ae8a41b925eb8dfd16d9041b7ad089a2fc9c4`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/94-stage-manifest-commit-identity/00-requirements.md`
- `origin/dev`
Outputs:
- `/.recursive/run/94-stage-manifest-commit-identity/00-worktree.md`
Scope note: Records the isolated public worktree and executable diff basis.

## TODO

- [x] Create an isolated worktree from the public dev baseline.
- [x] Record dependency setup and baseline isolation.
- [x] Record one stable diff command for audited phases.

## Directory Selection

- Repository root: `D:\DEV\role-model\.worktrees\94-stage-manifest-commit-identity`
- The parent checkout and private repository remain outside this isolated repair.

## Safety Verification

- No user runtime state, credentials, release archives, or private source files are edited.
- The repair changes public source and workflow contracts only.

## Worktree Creation

- Created with `git worktree add ... -b fix/stage-manifest-commit-identity origin/dev`.
- Branch: `fix/stage-manifest-commit-identity`.

## Main Branch Protection

- This worktree makes no direct `dev`, `stage`, or `main` update.
- The rejected candidate remains immutable evidence; a future Stage RC needs fresh UAT.

## Project Setup

- `corepack pnpm install --frozen-lockfile` completed before test execution; output is run-local evidence only.

## Test Baseline Verification

- The prior accepted-candidate workflow rejection established the pre-repair failure: `manifest.commit` was `runtime-derived`.
- Focused RED receipts are stored under `evidence/logs/` before the source/workflow guards were added.

## Worktree Context

- Repository root: `D:\DEV\role-model\.worktrees\94-stage-manifest-commit-identity`
- Branch: `fix/stage-manifest-commit-identity`
- Baseline type: `remote ref`
- Baseline reference: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Comparison reference: `working-tree`
- Normalized baseline: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8607f5f8c149bfb8a99d3bc0e67a504076c90467`

## Diff Basis For Later Audits

- Baseline type: `remote ref`
- Baseline reference: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Comparison reference: `working-tree`
- Normalized baseline: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8607f5f8c149bfb8a99d3bc0e67a504076c90467`

## Traceability

- R1 maps to `runtime-version.ts` plus its direct regression test.
- R2 maps to `build-binaries.yml` plus static workflow contract tests.
- R3 maps to RED/GREEN logs and the focused runtime contract runner.

## Coverage Gate

- [x] The branch, worktree, and immutable baseline are recorded.
- [x] Every later diff audit uses the normalized command above.
Coverage: PASS

## Approval Gate

- [x] No untracked user runtime state or credential file is in scope.
- [x] The worktree is safe for the release-provenance repair.
Approval: PASS
