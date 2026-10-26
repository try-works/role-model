# S193 The worker catalogue now runs in CI too

The gate could require a named worker (S192); the workflow could not. This round adds that second journeys invocation to the advisory R39 step.

```yaml
node scripts/runtime/verify-client-journeys.mjs `
  ... --port 5944 `
  --state-root ($stateRoot + "-workers") `
  --fixture-root "testdata/router-runtime/fixtures-workers" `
  --expect-model "deepseek-official/deepseek-flash"
if ($LASTEXITCODE -ne 0) { throw "R39 worker-catalogue journeys did not pass (exit $LASTEXITCODE)" }
```

Port choice matters: the step already used 5943 for the compare-release right side, and reusing it would have made two hosts contend. Caught by reading the file rather than by a failure.

## Gate with every option, verified end to end

```
--rendered --worker-fixtures testdata/router-runtime/fixtures-workers
--expect-model deepseek-official/deepseek-flash

PASS models: 3 models
PASS expected model deepseek-official/deepseek-flash: deepseek-official/deepseek-flash
PASS 20/20 rendered routes (focus checked)
exit=0
```

## What the gate checks now, in total

| Layer | Checks |
|---|---|
| HTTP surface | health, models, telemetry, controller, learning, replay, evaluation |
| shell assets | css (both theme blocks), bundle, theme boot (no inline palette), shell bytes |
| configuration | a named worker is served from the worker catalogue |
| rendering | 20 routes x content, invisible controls, control naming, contrast, overflow, focus |

`test/r39-scripts.test.ts` **23/23**.

## Still advisory

Both new steps hang off `vars.R39_VERIFY_BLOCKING`. Until a dispatch run is green and that variable is `true`, none of this blocks a merge - which is the only thing left that would turn the evidence into a gate.