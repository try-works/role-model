# S24b release a partially started runtime child (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
S24a characterized a real leak: the packaged-runtime launcher rejects on its readiness timeout without killing or releasing the child, so a partially started runtime keeps running. This slice fixes that specific defect.

## Read first
1. `scripts/track-b/launch-packaged-runtime.mjs` around the ready protocol (the timeout path and the success path).
2. The accepted S24a characterization test `tests/track-b/run115-r32-closed-domains.test.mjs` for the style of child-scope proof.
3. R32 in the public requirements for the clause wording (partial startup releases the child).

## Required work
1. On readiness timeout: terminate the child (and its tree the way the supervisor package does, not only the direct child) and release every handle before the promise rejects. On any post-acquire failure the child must be released too.
2. Keep the success path identical - a ready child must not be killed or released early.
3. The rejection must remain the same typed/observable failure the caller already handles; do not change the error shape.
4. Also bound the storage-audit child that S24a found has no timeout at all: give it a bounded wait and release on expiry, or record explicitly why it must be unbounded (and say what a hung audit child would do today).

## Files you may write
- `scripts/track-b/launch-packaged-runtime.mjs` and the storage-audit spawn site if you take item 4
- one new test under `tests/track-b/` (a fake child script is fine; do not run the real packaged runtime)
- evidence under the private run directory

No public worktree changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first: a fake child that never becomes ready must still be running after the current timeout - capture that, then fix it and prove the child is gone and the handles are released.
Report: the termination mechanism and its limits, the success-path proof, the audit-child decision with its reason, RED/GREEN, counts and the suites you re-ran.