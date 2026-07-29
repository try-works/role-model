# Private feature worktrees must stay in-parent

Type: skill-issue
Status: CURRENT
Scope: recursive-mode Phase 0 worktree placement for `role-model-internal`
Owns-Paths:
Watch-Paths: .worktrees/; .agents/skills/recursive-worktree/
Source-Runs: 84-kw-ui-toggle-gated-retrieve-eval
Validated-At-Commit: working-tree run-84 Phase 8 closeout
Last-Validated: 2026-07-26
Tags: worktree, windows, max-path, recursive-mode

## Issue

Using short external paths such as `D:/DEV/.wt/<short-id>` for private feature worktrees places them outside the parent repository. Operator rule: worktrees must always live inside the parent repo (under gitignored `.worktrees/`), matching the public repo convention.

## Guidance

- Preferred private path: `D:/DEV/role-model-internal/.worktrees/<run-id>` (full run id).
- Preferred public path: `D:/DEV/role-model/.worktrees/<run-id>`.
- Do not create new run worktrees under `D:/DEV/.wt/` for MAX_PATH convenience.
- If an existing worktree is outside the parent, relocate with `git worktree move` (or filesystem move + `gitdir` repair), then record a relocation addendum without reopening locked Phase 0 unless required.
- Detached TEMP/`.tmp` clean-checkout proof trees are a different class; do not treat them as feature-run worktrees.

## Non-goals

- This shard does not require relocating historical detached clean-checkout evidence trees under `D:/TEMP/` or `D:/DEV/.tmp/` unless the operator asks.
