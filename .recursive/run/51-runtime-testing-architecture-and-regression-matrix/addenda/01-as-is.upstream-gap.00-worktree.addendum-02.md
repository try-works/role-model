Run: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
Phase: `01 AS-IS`
Addendum: `upstream-gap.00-worktree.02`
Status: `LOCKED`
LockedAt: `2026-06-20T12:00:40Z`
LockHash: `df2d4aecff347adafbbb7174034f69230d001e5fe914a74d710220d1164162e6`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md` (LOCKED)
- User guidance in chat on 2026-06-20:
  - the run worktree should be inside the `role-model` folder
Outputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
Scope note: This addendum records the post-lock requirement that run 51 use an in-repo worktree location. It preserves the correction without editing the locked Phase 0 worktree artifact.

## TODO

- [x] Record the new in-repo worktree requirement from chat
- [x] Preserve the corrected active worktree path for later phases
- [x] Keep the correction in a current-phase upstream-gap addendum instead of mutating locked Phase 0 history

## Gap Summary

The locked `00-worktree.md` records an external fallback worktree path at `D:\wt\rm51`, but a later user instruction requires the active worktree to live inside the `role-model` folder.

## Discovery Evidence

- user chat on 2026-06-20 required that the run worktree be inside the `role-model` folder

## Implications For Current And Later Phases

- Later phases must treat `D:\DEV\role-model\.worktrees\51` as the active worktree path for run `51`.
- The locked Phase 0 artifact remains part of history, but this addendum is now the authoritative correction for active execution context.

## Compensation In Current Phase

- Move the registered worktree from `D:\wt\rm51` to `D:\DEV\role-model\.worktrees\51`.
- Update the live Phase 1 artifact so reproduction steps, audit context, and current execution references point at the in-repo worktree.

## Corrected Active Worktree Context

- Previous active path: `D:\wt\rm51`
- Corrected active path: `D:\DEV\role-model\.worktrees\51`
- Branch: `recursive/51-runtime-testing-architecture-and-regression-matrix`
- Correction mechanism: `git worktree move 'D:\wt\rm51' '.worktrees\51'`

## Traceability

- in-repo worktree requirement -> preserved from user chat on 2026-06-20
- current-phase compensation -> this addendum plus the Phase 1 artifact refresh

## Coverage Gate

- [x] The new worktree-location requirement is preserved in a repo document
- [x] The corrected active path is explicit for later phases
- [x] The addendum avoids editing the locked Phase 0 artifact directly

Coverage: PASS

## Approval Gate

- [x] The corrected active worktree context is specific enough for downstream reuse
- [x] The addendum preserves the user requirement without rewriting locked history

Approval: PASS
