# S21a closed shared-leaf composition DAG, first slice (public, R27)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R27 requires a closed shared-leaf Layer DAG owning CLI/backend/server/bootstrap/refresh/drains/benchmarks, with bounded permits/waiters and cache identity, and provider permits process-owned with separate bounded waiters. This slice builds the SHAPE and proves closure; it does not rewire behaviour yet.

## Read first
1. `00-requirements.md` R27 (lines 246-252).
2. `evidence/other/effect-4.0.6-api-notes.md` and the vendored `Layer`, `Context`, `Semaphore` sources - cite file:line for every API you use.
3. `role-model-router/apps/runtime-host-bridge/src/index.ts` for how services are constructed today (the composition region), and `src/module-health-writer.ts` for a small existing service shape.

## Required work
1. A new composition module that declares the shared leaves as `Context.Service` + `Layer` and composes them into ONE closed graph. Closure means: building the whole graph requires no ambient service, and a missing provider is a type error, not a runtime undefined.
2. Memoisation proof: two consumers of the same leaf receive the SAME instance (for example an Effect `Ref` identity or a captured object identity). A mutation that rebuilds the layer per consumer must fail a test.
3. Bounded ownership where the requirement names it: provider permits are process-owned with separate bounded waiters. Implement the shape for ONE service as a pilot - a bounded permit plus a waiter queue with an explicit bound - and test that exceeding the bound waits rather than growing without limit. State which service you chose and why.
4. Do not change the host's current behaviour: the new module must be additive, and the existing index.ts construction must keep working untouched. State explicitly that nothing is rewired this slice.

## Files you may write
- one new module under `role-model-router/apps/runtime-host-bridge/src/` and one new test file under its `test/`
- `evidence/logs/s21a-*` and `evidence/other/s21a-tdd.json`

Do not edit index.ts, the queue runtime, diagnostics, transport, client, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
One behavioural RED per numbered item. Report: the services in the DAG, the closure argument (why it is typed and cannot be ambient), the memoisation test, the bounded-waiter test, the API citations, and what R27 still needs (CLI/backend/server/bootstrap/refresh/drains/benchmarks ownership, cache identity keys, and the actual rewiring).