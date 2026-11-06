# S119 R27: benchmark cancellation and overlap isolation - the last unmodelled behaviour

This closes the final item on R27's "not modelled" list from S21b: early readiness/partial shutdown
(S116/S117), cache identity (S115), per-run judge/throttle isolation (S118), and now benchmark
cancellation/overlap isolation.

## `src/benchmark-gate.ts`

`makeBenchmarkGate({ mode })` with two explicit modes:

- **`cancel-previous`** - `begin(run)` marks the active run cancelled and takes over. The cancelled
  run observes it through `isCancelled(run)` and stops its own loop (the test walks a 5-step loop
  and records `cancelled-at-3`, i.e. work really stops mid-run rather than being ignored).
- **`reject-overlap`** - the second `begin` returns `{ ok: false, reason: "busy", activeRunId }`
  and the first run keeps ownership. That is the mode for "a scheduled benchmark and a manual one
  must not both own the machine".

`end` is idempotent and clearing the active run does **not** mark it cancelled - being finished is
not the same as being cancelled, and the test pins that distinction.

## Tests (TDD)

RED first (`Cannot find module ../src/benchmark-gate.js`), then 4 green:

| Case | Proves |
|---|---|
| cancel-previous cancels mid-run | work observes cancellation at step 3; active becomes `run-b` |
| reject-overlap refuses the second | `{ok:false, reason:"busy", activeRunId:"run-a"}`; after `end` the next begin succeeds |
| end twice | idempotent, active is undefined |
| end is not cancellation | `isCancelled` is false after a clean end |

```
S119 (4) + S118 (4) + S117 (4) + S116 (4) + S115 (5) + S114 (2) + S21a (6) = 29 passed, tsc = 0
```

## What this does NOT do

R27 is still **not complete**, and the gap is the same one it has always been: the runtime
**acquires imperatively in `cli.ts`** and releases through `hostScope`. Five behaviours are now
modelled, tested and available; the composition has not been moved onto them.

Claiming R27 complete on the strength of these modules would be the overclaim this run exists to
refuse - so the requirement stays blocked, with its unmodelled list now empty and its rewiring
untouched.