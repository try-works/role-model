# S6e pin the pragmas, the delete boundary and the count (public, R23)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The S6d review passed the batch but listed four unpinned properties. Pin them.

## Fixes
1. PRAGMAS: assert each migrated site's effective PRAGMAs (census/challenge `query_only=ON` + `busy_timeout=1000`; dispositions, queue-admin, durable reads and the DELETE `busy_timeout=0`). Deleting the setup call must fail. If a pragma cannot be observed from outside, expose it through the same test seam style used in S6c and say so.
2. DELETE PREDICATE: the current test cannot distinguish the real predicate from a constant row filter. Add: a SECOND expired row, a row with `retain_until_ms IS NULL`, and a row exactly at the boundary. Mutating the WHERE to a constant filter, to `<=`, or to ignore NULL must each fail.
3. DELETED COUNT: pin it - a return-0 mutation or a wrong `changes()` read must fail (currently the value is ignored and unpinned).
4. PORTABILITY: replace the hardcoded `E:\role-model-run115` with `ROLE_MODEL_TEST_TEMP_ROOT` or the repo temp root, as S6c did.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/test/s6d-second-batch-migration.test.ts`
- the migrated sites only if a test seam is genuinely needed (state it)
- `evidence/logs/s6e-*` and `evidence/other/s6e-tdd.json`

No other product files. No installs, no commits, no subagents, no operator ports.

## Rules
Mutation-first for fixes 1-3: apply the mutation, capture the RED, restore. Report per-mutation RED/GREEN, counts and typecheck.