# S147 Private track-b suite: 2869/2913, and where the 38 failures come from

After the two committed R23 slices (schema helper, queue-admin refusal) I ran the whole private `tests/track-b` suite at concurrency 4:

```
ℹ tests 2913 | pass 2869 | fail 38 | skipped 6
```

## Attribution, sampled

| Failure | File | Imports our changed modules? | In isolation |
|---|---|---|---|
| `AC-R20-01 pinned Python/uv bridge` | `interop-process.test.mjs` | no | **fails** - the uv/python bridge is not installed here |
| `buildPublicRuntimeDependencies ...` (2) | `public-runtime-build.test.mjs` | no | **fails** - the dependency build is not staged in this worktree |
| `@recursive:106-vendored-wrapper-dist-stamp` | `run101-r1-vendor-resolution.test.mjs` | no | **passes** in isolation - load-flaky |
| `AC-R108-14 indeterminate dispatch refusal` | `run108-indeterminate-dispatch-terminal.test.mjs` | no | **passes** in isolation - load-flaky |

So the sampled failures split into two groups: **environment gaps** (no uv/python, no built dist) and **load flakes** under concurrency 4. None of the sampled files imports `shared/sql/*`, `durable-queue.mjs` or `queue-admin.mjs`, so the committed slices cannot be their cause.

## What this does not establish

I sampled four of the 38, not all of them. The honest statement is: the suite is **not green in this environment**, four sampled failures are explained and unrelated to the slices, and the modules the slices touch have their own green suites (capture 18/20 with the same 2 pre-existing failures at baseline; queue-admin regression 10/10; schema helper 4/4; run115 subset 85/85).

A claim that "38 failures are all environmental" would be exactly the kind of unverified generalisation this run keeps refusing - so it is not being made.

## Worker decision this round

The crowdsourced-learning sites turned out to be **already correct transactions**; the worker declined to manufacture a behavioural RED and asked for a decision. Answer: convert only the two pure-delegation sites, with a **source-invariant ownership test** (module must import the helper and must not hand-roll `BEGIN IMMEDIATE`) as the RED/GREEN, and record explicitly that no behavioural RED exists because behaviour is unchanged. `#ackClaim`'s refusal edge stays as a documented limitation - it is unreachable without stubbing a private database handle.