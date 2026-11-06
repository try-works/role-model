# S21b repair the composition claims (public, R27)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review put S21a on HOLD with four concrete mutations that stay green. Fix the code or the claim, not the narrative.

## Fix 1 - closure is requirement-closure, not graph exactness
A layer providing an EXTRA service still typechecks (ROut is contravariant), and an untyped `Context.getUnsafe` read would be ambient. Either enforce exactness (for example an explicit runtime check that the built context contains exactly the declared services) or correct the module doc and evidence to say 'required services are closed at the type level; extra providers and untyped reads are not prevented' and add the mutation (b) as a documented limitation. Do not leave the stronger claim standing.

## Fix 2 - the Layer.fresh negative control is invalid
It builds twice with separate memo maps, so two instances differ even without `fresh`. Build once with a shared memo map and compare a shared layer against a fresh layer inside that single build; deleting `Layer.fresh` must then fail.

## Fix 3 - the waiter bound does not bound total waiters
`waiterSlots` bounds only the explicitly counted queue; callers beyond it park on Semaphore's unbounded waiter list. 10,000 callers with 2 permits leaves ~9,998 fibers parked and the test still passes. Make the bound REAL: either reject beyond the total bound with a typed error, or bound the total and prove the parked count, and add a test with many callers that asserts the total waiter count is bounded (or that excess callers are rejected).

## Fix 4 - release is only proven on success
Replace `acquireUseRelease` with `flatMap` + success-only release and the 12-fiber test still passes. Add a failing-user and an interrupted-user case proving the permit returns to the pool, and state the release guarantee.

## Fix 5 - state the scope of the 13 services
The 13 cover R27's named owners plus the shared authorities, but early readiness/partial shutdown, cache identity, per-run judge/throttle isolation and benchmark cancellation have no shape here. Say that in the module doc as 'owner shape only', so the service set is not read as R27 complete.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/src/composition-dag.ts` and its test
- `evidence/logs/s21b-*` and `evidence/other/s21b-tdd.json`

No other files. No installs, no commits, no subagents.

## Rules
Mutation-first for fixes 2, 3 and 4: apply the reviewer's mutation, observe the RED, restore. Report per-fix RED/GREEN, the exact claim wording you settled on for 1 and 5, counts and tsc.