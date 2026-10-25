# S7c routing parity evidence for the producer (public, R25)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R25 is marked implemented for the producer and its single caller. Its remaining acceptance clause is parity: empty-pool, tie, role-task-effort-arm and golden parity between the Effect producer path and the pure kernel. Prove it or add the missing cases.

## Read first
1. `00-requirements.md` R25 (lines 230-236).
2. `role-model-router/packages/core/src/route-decision-producer.ts` and `router.ts`; `role-model-router/packages/protocol-routing/src/route-decision-boundary.ts`.
3. Existing coverage: the producer's equality tests and the S7b wiring test, plus any kernel golden fixtures you find (search `golden`, `fixture`, `tie` in core and protocol-routing tests).

## Required work
1. Build a parity matrix for the four named cases against the SAME inputs: (a) an empty candidate pool, (b) a tie between candidates, (c) a role/task/effort-arm request, (d) a golden fixture if one exists. For each, compare the kernel result, the producer result and the result through the wired caller, byte-for-byte (JSON equality).
2. Where a case has no fixture, create a minimal deterministic one and say so - do not invent expected outputs by hand from intuition; derive them from the kernel and assert the other two paths agree with it.
3. If a case cannot be expressed without changing the kernel, report it rather than changing behaviour.

## Files you may write
- tests under `role-model-router/packages/protocol-routing/test/` and/or `role-model-router/packages/core/test/`
- `evidence/logs/s7c-*` and `evidence/other/s7c-tdd.json`

NO product changes. No installs, no commits, no subagents.

## Strict TDD
Each parity case starts as a test that could fail - show at least one mutation (for example making the producer return a reordered result) that the matrix catches.
Report: the matrix with per-case results, the fixtures you created, the mutation RED, counts and typecheck.