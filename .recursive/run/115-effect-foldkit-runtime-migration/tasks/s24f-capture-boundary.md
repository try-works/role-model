# S24f close the capture domain boundary (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
Next ambient domain from the S24a inventory: the capture durable queue, constructed inline from the state root at the composition site.

## Read first
1. The S24a inventory and R32 at public `00-requirements.md:286-292`.
2. `shared/capture/durable-queue.mjs` and its inline construction site.
3. The retention/evaluation/artifacts/events factories as the pattern.

## Required work
1. Add an explicit factory for the durable queue taking the state root (and any other dependency it currently reaches), failing loudly when a required one is missing or blank - no path decided by the caller's omission.
2. Keep behaviour identical where the same inputs are passed: re-run the accepted capture/queue suites unchanged.
3. Prove the boundary: missing/blank root throws; two queues with different roots do not see each other's entries; the same root reopens its own; and the queue's close/drain semantics are unchanged.
4. State what R32 still needs for this domain.

## Files you may write
- `shared/capture/durable-queue.mjs` and the single construction site
- one new test under `tests/track-b/`
- evidence under the private run directory

No public changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first for each boundary proof. Report: the factory shape, behaviour-preservation counts, the boundary REDs, and what remains.