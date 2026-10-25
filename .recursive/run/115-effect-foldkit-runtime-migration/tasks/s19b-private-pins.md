# S19b make the private R28 pins mutation-proof (private repo)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
The review put S19a on HOLD with one green mutation per weak test. Fix the tests; do not weaken the invariants.

## Fixes
1. TEST 1 (PRAGMAs): several expected values are SQLite/node defaults, so removing the PRAGMA statements still passes. Either (a) demote the claim to 'effective values, defaults included' and pin ownership only where a mutation is observable (WAL on EventLog/capture, busy_timeout on capture, and any other non-default setting), or (b) add a mutation-sensitive observable for FULL/FK/DELETE. Choose and state which.
2. TEST 2 (EventLog): the raw-field check is a denylist probed with too few keys. Add probes for the keys the review named (output, body, prompt, transcript) plus at least one nested shape; corrupt a stored row and assert verify() rejects it; and pin the metadata cap near its actual bound (a row just over 4096 must be refused) rather than asserting on a small row.
3. TEST 5 (replay job): assert the job actually carries candidatePackages, budget and the policy/evaluation references - the title claims candidate packages and the test never checks them.
4. TEST 3 (label finding): add an explicit post-flush assertion so the transience claim stands alone rather than depending on test 4: capture_wal rows for the flushed capture are gone after the fenced sink commit, and the raw markers are absent from the queue at that point.
5. INVARIANTS TABLE: add explicit rows for the capture-queue close contract (stable closed code/message, distinct closed-during-flush cause, idempotent close, recordDegradation asymmetry) and the drain/close join, which the table currently omits.

## Files you may write
- `tests/track-b/run115-r28-storage-preservation.test.mjs`
- `evidence/other/s19b-tdd.json` and `evidence/logs/s19b-*` in the private run directory

NO product changes. No commits, no installs, no subagents, no servers or ports; temp files on E:.

## Rules
For each fix, apply the reviewer's mutation first and show the RED, then restore. Report the per-mutation RED/GREEN, the final counts, and any invariant you still cannot pin.