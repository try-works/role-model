Type: `pattern`
Status: `CURRENT`
Scope: `How the main agent verifies delegated review or audit work before accepting it as lockable evidence.`
Owns-Paths:
Watch-Paths:
- `/.recursive/RECURSIVE.md`
- `/skills/recursive-subagent/SKILL.md`
- `/agents/code-reviewer.md`
- `/agents/implementer.md`
Source-Runs:
- `none (generic repository guidance)`
- `00-baseline`
- `01-protocol-routing-obs`
Validated-At-Commit: `generic-repository-guidance`
Last-Validated: `2026-04-12T10:05:59.2124550Z`
Tags:
- `skills`
- `subagent`
- `verification`
- `review-bundle`

# Delegated Verification And Refresh

Delegated work is optional helper output, not autonomous authority.

## Main-Agent Acceptance Rules

Before accepting meaningful delegated work, the main agent should verify:

- claimed file impact against the actual diff-owned file set
- claimed artifact reads or updates against files that actually exist
- review-bundle contents against the current reviewed artifact and artifact hash
- baseline `git diff --name-only <anchor>` results against `git status --short --untracked-files=all` whenever run-local artifact trees may still be untracked
- requirement, plan, addenda, and prior recursive docs that materially informed acceptance
- whether any post-review repair made the delegated context stale
- whether the delegated narrative contains stale statements about bundle existence or review scope even when the substantive verdict is still usable
- whether newly created stage-local addenda must now appear in later audited phases' effective inputs, reread sections, and reconciliation notes before those phases can relock

## Record In The Phase Artifact

When delegated work materially contributes, `## Subagent Contribution Verification` should record:

- `Reviewed Action Records`
- `Main-Agent Verification Performed`
- `Acceptance Decision`
- `Refresh Handling`
- `Repair Performed After Verification`

## Refresh Rule

If repairs materially change the reviewed artifact, changed-file scope, or evidence basis, refresh the review bundle or action record before relying on delegated work for lockable evidence.

- If a reviewed artifact is locked after the action record or review bundle was generated, treat the lock itself as a content change and refresh the delegated evidence so artifact hashes match the locked file, not the pre-lock draft.
- When no review bundle exists, omit the `Review Bundle:` line entirely; the recursive validators treat any value there as a real path and will fail on placeholders such as `none`.

## Rejection Rule

If the main agent cannot verify delegated claims against actual files, actual artifacts, and the actual diff scope, reject the delegated result and fall back to self-audit for lockable completion evidence.
