# S9c join the request-path capture flush during close (private repo, R30)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
This run recorded a residual: the request-path capture flush is NOT joined when the queue closes, so a post-flush metrics UPDATE can be skipped. The bulk drain join exists (`joinCaptureBacklogDrain`, accepted in S9a); this slice closes the request-path half.

## Read first
1. The private `shared/capture/` modules and `scripts/track-b/runtime-operations-server.mjs` - find the request-path flush and the existing drain join.
2. The accepted S9a/S9b evidence so you do not re-litigate the drain join or the closed-error contract.
3. R30 in the public requirements (`.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md`, the capture-queue clauses) for the exact wording.

## Required work
1. Track the in-flight request-path flush (or flushes) and JOIN them in `close()` alongside the backlog drain, with the same bounded close timeout discipline the accepted drain join uses. A close must not resolve while a request-path flush is still writing.
2. Prove it: start a request-path flush whose sink is slow, call `close()` concurrently, and assert close does not resolve before the flush commits - and that the post-flush metrics UPDATE actually lands. The RED must show the current behaviour losing that UPDATE.
3. Preserve the accepted contracts: the closed-error guards and their stable codes/messages, the drain-join bound and its behaviour on timeout, and idempotent close. Re-run the accepted suites.
4. If a flush can legitimately outlive any bounded close, say so and choose an explicit policy (join, abandon with a recorded loss, or fail close) rather than leaving it undefined.

## Files you may write
- the capture/close region of the private modules involved
- one new test under `tests/track-b/`
- evidence under the private run directory for this run (logs + a tdd JSON)

No public worktree changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first, showing the metrics UPDATE lost. Report: the join mechanism, the close timeout interaction, the policy you chose, RED/GREEN, the accepted suites you re-ran with counts, and anything still not joined.