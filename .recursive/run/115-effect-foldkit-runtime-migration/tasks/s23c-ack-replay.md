# S23c make ack pruning safe against replay (private, R31)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
The S23b gap reconciliation left one live risk: ack rows are pruned at a low watermark, so a replayed envelope can be re-enqueued after its ack evidence is gone. Fix the mechanism, not the test.

## Read first
1. The S23b gap reconciliation in the private run evidence (`s23a-r31-private-tdd.json`, `gapsReconciliation`).
2. `extensions/crowdsourced-learning` (outbox, `#ackClaim`, the pruning path) and the durable queue.
3. R31 in the public requirements for the clause wording.

## Required work
1. Reproduce the risk with a failing test: ack an envelope, prune past the watermark, replay the SAME envelope, and show it is re-enqueued (or show it is not - if the code already prevents it, say so and pin it instead).
2. If it re-enqueues, make replay safe without unbounded growth. Options: retain a compacted high-watermark/tombstone per outbox id, keep the last N acks, or store the pruned range and reject envelopes below it. Pick one, state the bound, and prove both directions: a replayed pruned envelope is refused, while a genuinely new envelope after the watermark is still accepted.
3. Keep behaviour identical for the non-replay path: re-run the accepted contribution/outbox suites unchanged.

## Files you may write
- `extensions/crowdsourced-learning/**` and any pruning helper
- one new test under `tests/track-b/`
- evidence under the private run directory

No public changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first for the replay case, then GREEN with the chosen bound. Report: the reproduction, the mechanism and its storage bound, the two-direction proof, behaviour-preservation counts, and what remains.