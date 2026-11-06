# S116 R27: early readiness is a gate, not a hope

R27 lists "early readiness/partial shutdown" among the behaviours the DAG shape did not model. Early readiness is now implemented and tested.

## `src/readiness-gate.ts`

`makeReadinessGate({ required })` returns `{ awaitReady, mark, snapshot }`:

- **Settles once**: the first moment every *required* stage is satisfied, or the first required failure. Advisory stages arriving later cannot reopen it.
- **Early**: required stages satisfied -> resolves while `vendors`, `remote-health`, `inventory` are still pending. That is the property R27 asks for; waiting for everything is the behaviour it forbids.
- **Failure is an outcome, not a hang**: a failed required stage resolves with `ready: false, failed: [...]`.
- **Advisory degraded rule matches the bootstrap summary**: `peers` degraded counts as satisfied, any other degraded stage does not - the same set `SESSION_BOOTSTRAP_ADVISORY_DEGRADED_STAGE_IDS` uses, so the gate and the reported status cannot disagree.

## Tests (TDD)

RED first: the test file failed with `Cannot find module ../src/readiness-gate.js`, then 4 cases went green:

| Case | Proves |
|---|---|
| required satisfied, advisory pending | resolves early, reports exactly the required stages |
| required still running | a 50 ms race returns `still-waiting` - **not ready** |
| required failed | resolves `ready: false`, failed list names the stage |
| `peers` degraded | treated as satisfied, matching the summary rule |

```
S116 (4) + S115 (5) + S114 (2) + S21a (6) = 17 passed, tsc = 0
```

## Two Effect v4 API corrections made while writing it

`Effect.gen` yields must be real Effects, and this vendor drop has **no `Effect.fork`/`Fiber.poll`** - it exposes `forkChild`/`forkIn`/`forkScoped`/`forkDetach`. The first version failed with "yield* ... is not iterable"; the working shape uses `Effect.race` against a sleep instead of forking a fiber, which also makes the "still waiting" assertion direct rather than an observation of a polled fiber.

## Still open on R27

Partial shutdown (a failed acquire releasing already-started owners in reverse) is already covered by `releaseHostResources`, but it is not yet modelled as a DAG behaviour. And the runtime still acquires imperatively in `cli.ts`: this gate exists, it is not yet the host's readiness source.