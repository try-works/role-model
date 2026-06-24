# Git Push and Merge Workflow

Status: `CURRENT`
Created: `2026-06-24`
Last Validated: `2026-06-24`
Validated By: `260624-clever-seal`

## Correct Workflow

```
1. git checkout -b feature-branch     (create branch in worktree)
2. ...implement, test, verify...
3. git add -A && git commit           (commit all changes to branch)
4. git push origin feature-branch     (push branch to remote)
5. Open PR on GitHub                  (CI runs, review happens)
6. Merge via PR                       (GitHub UI or API)
```

## NEVER DO THIS

- **Never merge locally and push directly to main.** Always go through a PR.
- **Never `git checkout main && git merge feature-branch && git push origin main`.** This bypasses CI, review, and branch protection.
- **Never force push to main.** Main is protected for a reason.

## Why

- PR workflow ensures CI runs against the merged result
- Branch protection rules (CLA checks, required status checks) are enforced on PRs but not on direct pushes
- Review history is preserved in the PR
- Reverting a PR merge is straightforward; reverting a direct push is blocked by branch protection

## What Happened (Session 260624-clever-seal)

Run 57 was merged via `git checkout main && git merge recursive/57-... && git push origin main`. This bypassed the PR workflow. The merge is live but cannot be reverted because main is force-push protected. This is recorded as an anti-pattern.

## Recovery

If a direct main push happens:
1. The code is permanently on main (cannot force push to revert)
2. A PR can still be opened retroactively from the branch for documentation/discussion
3. Future merges MUST use the PR workflow
