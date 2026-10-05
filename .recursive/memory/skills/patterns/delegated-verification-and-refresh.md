Type: `pattern`
Status: `CURRENT`
Scope: `How the main agent verifies delegated review or audit work before accepting it as lockable evidence.`
Owns-Paths:
Watch-Paths:
- `/.recursive/RECURSIVE.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/run/`
Source-Runs:
- `105-route-learning-matching-scope-activation`
Validated-At-Commit: `generic-repository-guidance`
Last-Validated: `2026-10-03T14:00:00Z`
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
- requirement, plan, addenda, and prior recursive docs that materially informed acceptance
- whether any post-review repair made the delegated context stale

## Record In The Phase Artifact

When delegated work materially contributes, `## Subagent Contribution Verification` should record:

- `Reviewed Action Records`
- `Main-Agent Verification Performed`
- `Acceptance Decision`
- `Refresh Handling`
- `Repair Performed After Verification`

## Refresh Rule

If repairs materially change the reviewed artifact, changed-file scope, or evidence basis, refresh the review bundle or action record before relying on delegated work for lockable evidence.

## Rejection Rule

If the main agent cannot verify delegated claims against actual files, actual artifacts, and the actual diff scope, reject the delegated result and fall back to self-audit for lockable completion evidence.

## Run 105 reinforced pattern

- Never accept a delegated `COMPLETE` claim while its child is still writing; stabilize the worktree and rerun the actual suite.
- Green pure/helper tests do not prove a live caller. Trace evidence producer -> authenticated host -> durable store -> source -> cache -> router -> UI, and write at least one genuine cross-boundary test.
- Review against requirements and the referenced design independently; correct stale design text instead of forcing code to match an obsolete statement.
- Delegated model identity may be unknown. Record it as unknown; do not invent requested model labels.
- Visual QA must navigate rendered routes rather than guess URLs, and controller must inspect screenshots. The first run105 screenshots were404s; the corrected live mobile screenshot exposed a real shell defect missed by unit tests.
- When a late repair changes the exact build pair, reject stale artifacts even when executable hashes happen to match; verify source commit/tree, private manifest and full closure again.
