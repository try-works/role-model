# S122 R27: the pair gate is now complete - backend failure and bind failure covered

Before rewiring `cli.ts` I wanted the composition resource to answer "what happens when acquisition fails at step N" for **every** N. Two of the three cases were unproven.

## Added

| Case | Result |
|---|---|
| backend acquisition fails (first step) | **nothing acquired, nothing released** - events are exactly `["acquire:backend"]` |
| server cannot bind (port already taken) | backend released exactly once, no dangling server - `["acquire:backend", "release:backend"]` |

Both pass. The resource was already correct in both; the coverage was missing, which is the difference between "probably fine" and "proven".

## What the pair gate now proves

`host-runtime-resource.ts` (the Effect-native acquisition/release pair) is covered for:

1. server-first ordering, releasing server last;
2. real ephemeral bind, release order packaged -> server -> backend;
3. **packaged failure after bind** -> server closed once, backend released;
4. **throwing packaged finalizer** -> remaining releases still run, failure surfaces;
5. **double close** -> every release once;
6. **backend failure** -> nothing acquired, nothing released;
7. **bind failure** -> backend released, server never left listening.

That is the "fail at each step" gate step 4 of the rewiring plan asked for, for the pair.

```
cli-composition-scope (7) + cli-startup-readiness + s120 ownership guard = 16 passed, tsc = 0
```

## What is still not gated, and why it blocks the wiring

The **extension-runtime phase** is not part of this resource. The CLI acquires it much later (`:12399`, `:12481`) and releases it through `hostScope`, and a failure there must release the extension owner, then the runtime, then the server - an order this pair does not model.

So the rewiring is still a project: the pair can be wired for server+backend+packaged, but the extension phase needs the same treatment first, and moving backend acquisition earlier in `cli.ts` changes real startup behaviour. I am not going to make that change with only unit-level coverage and no CI run.