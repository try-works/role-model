# S60a R27 (B6) public composition: inventory + first closed Layer subgraph

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R27 acceptance (from `00-requirements.md`): a CLOSED shared-leaf Layer DAG owning CLI/backend/server/bootstrap/refresh/drains/benchmarks, early readiness and partial shutdown; bounded permits/waiters/cache identity; per-run sequential judge/throttle isolation; shutdown stops admission then joins/drains/interrupts tasks before dependencies; finalizer failure cannot skip later releases.

This task is slice 1 of a sequence. Do NOT attempt the whole DAG.

## Slice 1 (must land)

1. **Inventory (evidence, no code)**: for `apps/runtime-host-bridge/src`, enumerate every long-lived service/acquired resource (config/registry, vendor processes, backend, server, schedulers/workers, drains), where it is created, what it needs, what owns its release, and the current shutdown path. Produce a table with file:line references and name the gaps against R27 (which leaves are unowned, which acquisition is imperative, which release can be skipped).
2. **First closed subgraph**: pick the smallest honest subgraph - the server + backend acquisition path - and express it as an Effect Layer graph with a single acquisition/release point per resource, wired so that: (a) a failed acquisition releases everything already acquired; (b) shutdown releases in reverse dependency order; (c) a throwing finalizer does not prevent later releases. Keep observable behaviour identical.
3. **Tests** (real, not shape-only): acquisition failure releases earlier resources; release order asserted from recorded events; a finalizer that throws still lets the remaining releases run; the server still starts and serves (reuse the existing host test harness). Each test must fail if the ordering/release guarantee is removed - capture the RED logs.

## Constraints

- No behavioural change to endpoints, packaging or startup semantics in this slice.
- Use the vendored Effect (`role-model-router/packages/effect`); read `.agents/skills/effect-ts/SKILL.md` and `vendor/effect/packages/effect/*.md` before writing Effect code, and say why if a plain effect is clearer for a one-off.
- Host `tsc` 0 and the touched test files green; do not run the whole 2,200 s suite unless the change reaches it.

## Report
The inventory table with gaps, the Layer graph you closed (nodes/edges/release order), the three tests with RED logs, host tsc, and the NEXT slice you recommend for R27.