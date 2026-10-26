# S183 The rendered audit is now part of the gate and of CI (advisory)

S182 built the audit; this round made it reachable from the thing people actually run.

## `verify-packaged-candidate.mjs --rendered`

After the HTTP journeys pass, the gate can spawn the audit against the same package:

```
node scripts/runtime/verify-packaged-candidate.mjs --package-dir … --rendered
```

Three outcomes, deliberately distinct:

| Situation | Gate behaviour |
|---|---|
| browser present, all routes clean | continues, exit 0 |
| **no browser** | prints `SKIP rendered: no browser available`, exit 0 |
| `--require-rendered` and no browser | prints FAIL, **exit 2** |

A missing browser must not silently look like a pass, and must not fail a runner that cannot have one - so the default is a typed skip and the strict mode exists for environments that promise a browser.

## `CHROME_PATH` is authoritative

My first implementation fell back to the *other* candidates when `CHROME_PATH` pointed at nothing, so my "no browser" test kept passing by launching the real Chrome. Now a set-but-wrong `CHROME_PATH` means **not run**; unset means search the usual locations. Without that distinction the skip path could never be exercised.

## CI step (advisory)

`build-binaries.yml` gains `Audit rendered UI (R39)` next to the two existing R39 steps, with the same policy variable:

```yaml
continue-on-error: ${{ vars.R39_VERIFY_BLOCKING != 'true' }}
```

and the same honesty rule - `exit 2` prints `NOT RUN: no Chromium-family browser on this runner` and exits 0 so the advisory step reports rather than pretends; a real failure throws.

## Verified

```
gate --rendered (browser present)        -> 20/20 routes PASS, exit 0
gate --rendered (CHROME_PATH wrong)      -> SKIP rendered, exit 0
gate --rendered --require-rendered       -> FAIL rendered, exit 2
audit alone (CHROME_PATH wrong)          -> NOT RUN, exit 2
test/r39-scripts.test.ts                 -> 21/21 (3 new)
```

## What is still not true

The step is **advisory**: until a dispatch run is green and `vars.R39_VERIFY_BLOCKING` is set to `true`, a rendered-UI regression can still merge. The workflow is the honest place to record that, and it does.