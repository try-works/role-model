# S118 R27: per-run throttle isolation

R27 requires "per-run judge/throttle isolation". Implemented as `src/run-throttle.ts`.

## Shape

`makeRunThrottle({ maxConcurrentPerRun })` -> `{ take(runId), give(runId), snapshot(runId), finish(runId) }`.

- **Isolation**: the count is keyed by run id, so a saturated `run-a` cannot block `run-b`.
- **Bounded within a run**: `take` waits when the run is at its limit rather than over-admitting.
- **finish(runId)** drops the run state entirely, so a later run that reuses the id starts clean and cannot inherit a stale counter.
- **snapshot** reports `{active, waiting}` so starvation is observable rather than inferred.

## Why not Effect Semaphore

My first implementation used `Semaphore.make(...)` per run. It works for isolation, but the
vendor Semaphore keeps its held count private, so `snapshot()` would have had to return an
**approximation** - a metric that lies is worse than no metric in a requirement about isolation.
I replaced it with an explicit `Ref`-tracked count, and the honest snapshot is what the tests
assert. The tradeoff is stated here rather than hidden: a hand-rolled counter instead of a
reusable primitive, because the primitive does not expose what this requirement must report.

## Tests (TDD)

RED first (`Cannot find module ../src/run-throttle.js`), then 4 green:

| Case | Proves |
|---|---|
| run-a saturated, run-b takes | **isolation** - a 50 ms race returns `took` |
| take twice on a 1-permit run | second **waits** (`blocked`), then succeeds after `give` |
| finish releases every permit | the next take succeeds; snapshot shows `active: 1` |
| snapshot of an unknown run | `{active: 0, waiting: 0}`, no throw |

```
S118 (4) + S117 (4) + S116 (4) + S115 (5) + S114 (2) + S21a (6) = 25 passed, tsc = 0
```

## R27 remaining

One unmodelled item left from the original list - **benchmark cancellation/overlap isolation** -
and the large one that has not moved: the runtime still acquires imperatively in `cli.ts`. These
services exist beside it, not under it.