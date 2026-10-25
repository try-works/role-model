# S22a characterize trial/learning/contribution retention (public, R31)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R31 requires RETAINING current behaviour, not rebuilding it: submitted-output reuse after a score failure, provider receipts with no redispatch, sandbox/lease/holdout/provenance/floor/tie/rollback semantics, the existing Effect folds, and the no-egress sandbox plus versioned profile publication and late-ack/revocation fences.

## Read first
1. `00-requirements.md` R31 (lines 278-285).
2. Find the actual code first: search the host bridge and packages for the learning/contribution paths (evaluation scoring, candidate derivation/promotion, sandbox/lease/holdout, profile publication). Do not assume file names - report what you found.
3. `evidence/other/s4-contracts-inventory.json` for what is already mapped, and note that learning is not covered there.

## Required work
1. A retention table: for each R31 clause, the code that implements it (file:line), and a test that would FAIL if the behaviour changed. Where no such test exists, write one. Mutations are the bar: propose and apply one per clause.
2. Specifically pin: (a) a submitted output is still reusable after a score failure rather than being discarded or redispatched; (b) provider receipts are recorded and no redispatch happens; (c) tie/floor/rollback decisions are deterministic and preserved; (d) the late-ack/revocation fence rejects after revocation.
3. If a clause's code cannot be located in the public tree, say so with the search you ran - it may live in the private repo, and that is a finding, not a gap to fill.

## Files you may write
- new tests under the existing test layout of whichever package owns the behaviour
- `evidence/logs/s22a-*` and `evidence/other/s22a-tdd.json`

NO product changes: this slice characterizes. If you find a real violation, report the exact site and stop.

## Rules
No installs, no commits, no subagents, no servers or operator ports; temp dirs on E:.
Report: the retention table with mutations, what you had to write, what lives privately, counts and typecheck.