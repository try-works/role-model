Run: `/.recursive/run/115-effect-foldkit-runtime-migration/`
Phase: `00 Worktree`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `00-requirements.md` and `source-proposal.md`
- Refreshed paired Git state, baseline setup/check receipts
Outputs:
- `00-worktree.md`
Scope note: Isolated public Phase0 draft; no downstream phase or product code authorized by an incomplete gate.

## TODO

- [x] Create isolated ignored feature worktree from fetched origin/dev.
- [x] Record immutable baseline and normalized diff command.
- [x] Install frozen dependencies without scripts using run-scoped E: storage.
- [ ] Complete full affected baseline and independently review requirements.
- [ ] Resolve exact team route and E1/E2 scope decisions.
- [ ] Complete gates and supported lock; do not advance early.

## Directory Selection

Repository root: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`.
Actual selected implementation tree is .worktrees/115-effect-foldkit-runtime-migration in the owning original repository.
Paired public/private tree suffix is identical; never resolve private from an arbitrary parent path.
Original dirty checkouts and proposal worktree preserved; no clean/reset/stash/protected-branch changes.

## Safety Verification

Both original repositories fetched origin; local origin/dev matched git ls-remote refs/heads/dev.
Git check-ignore confirmed implementation tree path ignored before creation.
Source tree started with zero porcelain entries before recursive-init; only run artifacts are intended source changes now.
Current public source HEAD:f0d50fab083e3fe8daf2474cd9fb08b51066c8e1; tree:b3d5cf91435faad39d11a0dc1d65f54d8668cc2e.

## Worktree Creation

From each original repo: git worktree add -b recursive/115-effect-foldkit-runtime-migration .worktrees/115-effect-foldkit-runtime-migration origin/dev.
Both creation jobs exited0 (public pwsh-ee7e7e4fb9654ab6, private pwsh-87c6c78f032d47e3; collected).
Supported recursive-init.py created paired00 templates. Public memory-loader encoding warning was repaired by
process-scoped PYTHONIOENCODING=utf-8 and rerun exit0; no workflow/helper source changed.

## Main Branch Protection

Base source is origin/dev at exact pinned commit below, not the original checkout's feature branch.
Implementation branch recursive/115-effect-foldkit-runtime-migration; no operation targets dev/stage/main writes.
Promotion remains reviewed PR->dev then reviewed stage/main, not part of baseline setup.

## Project Setup

Node24.11.0, corepack pnpm10.6.5, Python3.14.0 observed.
Frozen install used --ignore-scripts --store-dir E:/role-model-run115/pnpm-store
--virtual-store-dir E:/role-model-run115/public-virtual-store. Exit0; no lockfile/manifests changed.
Large package contents remain E:, project-local links remain inside actual Windows worktree (not subst alias).
No lifecycle scripts executed automatically. Actual esbuild, Vitest3.2.4, TypeScript5.9.3 work in public tree.
Private Effect/SQL/effect-mq wrappers built directly exit0; public Effect direct build exit0 after cached build
warning was investigated. Source-only vendor base-tsconfig warnings recorded, not hidden.
Nested ambient pnpm scripts selected11.x and attempted a no-TTY modules purge; do not trust that cached wrapper
run as fresh build evidence. Use pinned runner or direct installed Node entries and explicit package cwd.
C:/D: low disk preflight about1.7/2.1GB, E: about481GB; no deletion of user files to make space.

## Test Baseline Verification

Initial checks repeated in implementation trees: public release-workflows57/57, private source-seal1/1.
Round1 focused baseline: public supervisor6/6; private queue store/identity8/8; corrected public sqlite-memory
package-cwd suite140/140 (25files). Wrong root-cwd SQLite invocation failed1/140 because the existing registry
test derives ../.. from cwd; rerun from actual package passed without source/test change. This was a harness
invocation failure, not product TDD RED. Frontend critical6files/150tests passed (pwsh-c77a0a682a624681, collected).
Full workspace/host/private/package/browser/live suites not complete; not a clean-test-baseline certification.
Public receipt: .recursive/run/115-effect-foldkit-runtime-migration/evidence/other/phase00-baseline-round01.json.
Private receipt will reference safe shared result summary and private logs without exposing data.

## Worktree Context

- Base branch: `origin/dev`
- Worktree branch: `recursive/115-effect-foldkit-runtime-migration`
- Base commit: `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`
- Baseline tree: `b3d5cf91435faad39d11a0dc1d65f54d8668cc2e`

## Diff Basis For Later Audits

- Baseline type: `local commit`
- Baseline reference: `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`
- Comparison reference: `working-tree`
- Normalized baseline: `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`
- Base branch: `origin/dev`
- Worktree branch: `recursive/115-effect-foldkit-runtime-migration`
- Diff basis notes: exact fetched dev base; inventory untracked run files via git status in addition to diff.

## Traceability

R1 isolation/source authority and R2 team-model gate; R3 recursive/TDD discipline; R38 safe storage/setup.
All implementation/verification R requirements remain planned/unimplemented; this receipt proves no conversion.

## Coverage Gate

- [x] Actual worktree path/branch/base/diff recorded.
- [x] Frozen setup and observed baseline results/limitations recorded.
- [ ] Full clean baseline and requirement/team prerequisites satisfied.

Coverage: FAIL

## Approval Gate

- [ ] Requirements ready/locked and all Phase0 TODOs satisfied.
- [ ] Exact deepseek/deepseek-flash route and E1/E2 scope resolved.
- [ ] Independent review and supported lock completed.

Approval: FAIL
