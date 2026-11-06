# S21d wire the Server owner through the composition DAG (public, R27)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Bootstrap is wired and the remaining owners are tabulated: Backend, Server, Refresh, Drain, Benchmark, Cli, plus the four store leaves. Take Server next - or, if it cannot move without the Backend extraction, characterize precisely why and stop.

## Read first
1. `role-model-router/apps/runtime-host-bridge/src/composition-dag.ts` (the 13 services and how Bootstrap was wired in S21c).
2. The host's listener/routes/lifecycle construction in `src/index.ts`, and `test/s21c-bootstrap-owner-wiring.test.ts` as the pattern.
3. R27 at `00-requirements.md:246-252`.

## Required work
1. Decide and justify: can Server move now, or does it depend on the host's Backend/options object in a way that requires that extraction first? If it depends, say exactly which field(s) and stop - a characterization is the acceptable outcome.
2. If it can move: make the DAG layer the construction site for the listener/routes/lifecycle owner, keep the host's behaviour and start/stop order identical, and prove the host uses the DAG instance by identity.
3. Prove the migration: falling back to the legacy construction must fail a test.
4. Update the remaining-owner table with what moved or why it did not.

## Files you may write
- `composition-dag.ts`, the composition region of `index.ts` for Server, and new/extended tests
- `evidence/logs/s21d-*` and `evidence/other/s21d-tdd.json`

No other product files. No installs, no commits, no subagents, no operator ports - tests must bind ephemeral ports only.

## Strict TDD
RED first for the identity and no-fallback assertions. Report: the decision and its evidence, the wiring, RED/GREEN, the updated table, counts and typecheck.