# S17d guard the host call sites and protocol retry (public, R26)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review proved two remaining mutations stay green: deleting the signal argument at the two index host call sites, and adding a retry on protocol violation.

## Required fixes
1. HOST-LEVEL SIGNAL GUARD: the current 'real operation boundary' test calls `operations.recordLocalRouteCapture` directly. Add a test that exercises the HOST call site (index.ts:29547 and :28636) - extract the call into a small exported helper if that is what it takes - and assert the signal reaches fetch. Deleting the argument at those lines must fail a test.
2. PROTOCOL NO-RETRY COUNT: the protocol case asserts only the final error class. Assert the fetch call count (exactly 1) and the sleep list (empty) for a protocol violation, on the direct and Effect paths, so a retry-on-protocol mutation fails.

## Files you may write
- the smallest exported seam in `role-model-router/apps/runtime-host-bridge/src/index.ts` needed to test the host call site
- `role-model-router/apps/runtime-host-bridge/test/s17a-transport-signal.test.ts` (extend)
- `evidence/logs/s17d-*` and `evidence/other/s17d-tdd.json`

Nothing else. No installs, no commits, no subagents.

## Rules
Mutation-first for both: delete the signal arguments; insert a protocol retry. Each must produce a RED before you finish. Report the seam you added, the new assertions, both mutation REDs, GREEN counts and tsc.