# S192 The worker configuration path is now a repeatable gate check, not a demo

S191 demonstrated the `deepseek-official/deepseek-flash` path by hand. A demonstration decays; this round turned it into two flags that run every time.

## `verify-client-journeys.mjs --expect-model <id>` (repeatable)

```
PASS expected model deepseek-official/deepseek-flash: deepseek-official/deepseek-flash
```

And it fails when the worker is not served:

```
FAIL expected model deepseek-official/deepseek-flash:
     model not served: deepseek-official/deepseek-flash
     (saw claude-3.7-sonnet, gpt-5.4, openai/gpt-4.1-mini-fast)
exit=1
```

That failure message names what *was* served, so a wrong expectation is distinguishable from a broken host.

## `verify-packaged-candidate.mjs --worker-fixtures <dir> [--expect-model <id>]`

The gate runs the journeys twice: once against the default catalogue (3 models) and once against the worker catalogue, requiring the named model:

```
PASS models: 3 models
worker fixtures: testdata/router-runtime/fixtures-workers (expecting deepseek-official/deepseek-flash)
PASS models: 4 models
PASS expected model deepseek-official/deepseek-flash: deepseek-official/deepseek-flash
exit=0
```

Second run uses its own state root and port, so it cannot contaminate the first.

## Tests

`test/r39-scripts.test.ts` **23/23** (2 new): the repeated `--expect-model` flags are not mistaken for missing required inputs, and both scripts still carry the worker options.

## What this changes about the claim

Before: "the worker names work, I ran it once". After: "the gate can require a named worker and fails loudly when it is absent". The fixture is still **synthetic** - the operator production configuration and a live call to that provider remain unverified, as recorded in S191.