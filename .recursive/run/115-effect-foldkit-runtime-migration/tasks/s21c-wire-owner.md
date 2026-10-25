# S21c wire one owner through the composition DAG (public, R27)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The DAG exists and is additive; nothing is wired. This slice moves ONE owner's construction into the DAG without changing behaviour, so the graph starts carrying real weight.

## Read first
1. `role-model-router/apps/runtime-host-bridge/src/composition-dag.ts` (13 services, owner-shape only) and its test.
2. The host's current construction of the owner you pick, in `src/index.ts` (composition region).
3. R27 at `00-requirements.md:246-252` for the ownership clause.

## Required work
1. Pick the SMALLEST owner that can move without a behaviour change - Backend or Bootstrap are good candidates; explain why you picked it.
2. Construct it through the DAG (the layer is the only construction site) while the rest of the host keeps its existing paths. If the host needs an escape hatch during migration, make it explicit and temporary, and say how it is removed.
3. Prove behaviour: the existing suites for that owner pass unchanged, and a test asserts the owner instance used by the host is the one the DAG built (identity), not a second copy.
4. Prove the migration is real: removing the DAG construction (falling back to legacy) must fail a test.
5. List the remaining owners with what blocks each, so the next slice is mechanical.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/src/composition-dag.ts`, the composition region of `src/index.ts` for the owner you move, and new/extended tests
- `evidence/logs/s21c-*` and `evidence/other/s21c-tdd.json`

No other product files. No installs, no commits, no subagents, no operator ports.

## Strict TDD
RED first for both the identity assertion and the no-fallback assertion. Report: the owner chosen and why, the temporary escape hatch and its removal, RED/GREEN, the remaining-owner table, counts and typecheck.