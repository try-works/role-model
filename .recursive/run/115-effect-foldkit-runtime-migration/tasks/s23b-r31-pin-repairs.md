# S23b make the private R31 pins mutation-proof (private repo)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
The review put the R31 private characterization on HOLD with one surviving mutation per doubtful row. Tighten the tests; do not weaken the claims.

## Fixes
1. ROW 1 (retry claim): assert the claim path does not write a fresh execution/attempt marker - a claim that clears execution state while still returning the persisted result must fail. Move the 'nothing is redispatched' claim to the row that actually proves it.
2. ROW 3 (lease boundary): add the exact expiry boundary (`now == lease_expires_at_ms`) so `<=` vs `<` is distinguishable.
3. ROW 4 (sandbox enforcement): the row currently pins the argument list and receipt. Exercise the real CLI path (a fake docker executable that records argv, as the S24a style did) and assert the enforcement flags reach the spawned process; and add a cleanup-failure case proving it fails closed. Correct the row title from 'enforces' to what is actually proven (Docker daemon is the trust boundary).
4. ROW 5 (late ack): add a POSITIVE durable-ack test - a current ack for the live lease completes and records the ack with its fence identity - and assert the fence identity in the stale case. A blanket-reject mutation must fail.
5. ROW 6 (profile atomicity): add the direct-write mutation bar - a product that writes the final path directly (no temp/fsync/rename) must fail a test. Add the two-process same-path case and record what happens (last rename wins) as a pinned limitation or a failure, whichever is true.
6. ROW 2/4 coverage: add an assertion for the retry-score batch fencing at the code site the evidence only cites (`evaluation-core/index.mjs:3015`).
7. GAPS: the evidence lists six notProven entries; reconcile the count. Re-check the allowlist-by-command-name finding - the reviewer argues it is NOT reachable because the image is digest-pinned, PATH is fixed and /work is read-only; if so, reclassify it as defence-in-depth rather than a live gap.

## Files you may write
- `tests/track-b/run115-r31-private-characterization.test.mjs`
- evidence under the private run directory

NO product changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Rules
For each fix, apply the reviewer's mutation first and capture the RED, then make it fail and restore. Report per-fix RED/GREEN, the corrected claims, counts and exits.