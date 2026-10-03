# Post-closeout addendum 07 — stage queue plane and the durable-replay finalization blockers

## What was verified live (stage :3457)
1. The rebuilt stage runtime (role-model-stage.exe, sha256 `3070b4b9`, commit `0aa33a13`) runs on the stage
   channel with 6 healthy + eligible endpoints after the deepseek `DEEPSEEK_API_KEY` env was restored.
2. The endpoint "operational profile" (`observed_profile_snapshots`) now covers luna and sol-medium, so the
   earlier `A live runtime observation must produce an operational profile.` refusal is resolved for new
   captures (it persists only on one pre-fix capture).

## What is still blocking a finalized comparison
The stage runtime's queue plane is `queue` (run 101 R4): the replay loop plans the counterfactuals but hands
the dispatch to a queue worker (`dispatches: 0` in the loop status). The queue worker's dispatches fail with:

- `extension replay-core failed: frame exceeds inline limit; use a channel-local transfer artifact` — the
  extension protocol inlines at most 16 KiB, and a page wider than about two full jobs cannot travel inline
  (replay-core list-jobs; the recovery pass already uses the `summary` projection, so this is a different
  caller still asking for whole jobs).
- `durable replay branch append has no host dispatch receipt` — the resumed-append recovery path (run 98
  addendum 58 §23 / run 104 R8) still refuses some captures.
- `REPLAY_DISPATCH_INDETERMINATE: an earlier replay dispatch did not record completion`.
- `durable replay state is queued` / `awaiting_evaluation` — jobs are in the queue plane's states, not yet
  terminal.

## Note on effortComparability
The 50 existing `evaluation_comparison_groups` (all `finalized`, `comparison:supervised-replay:*`) are the
operator's earlier stage comparisons and predate the R9 threading, so their `comparability` blocks have no
`effortComparability` field. No *new* comparison has finalized since the R9 change, so the live
`effortComparability` sample is still pending the queue-worker finalization.
