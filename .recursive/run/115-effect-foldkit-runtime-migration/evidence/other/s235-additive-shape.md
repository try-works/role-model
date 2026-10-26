# S235 Parity classification now separates compatible additions from real shape changes

S234 reported the production-vs-dev comparison as `{"shape-delta":2,"same":6,"environment-state":1}`. Both
shape deltas were **additions only** (`+runtime.release_id`, `+runtime.private_distribution_sha256`) -
compatible skew, not a change a consumer of the old shape would notice. Calling that the same as a
removal hid the judgement inside a label.

## The change

`compare-release.mjs` now classifies:

| Condition | Classification |
|---|---|
| key-set differences, all `+` (or all `-`) | **`additive-shape`** |
| key-set differences, mixed or with removals | `shape-delta` |
| no key-set difference, values differ | `different` / `environment-state` |

## Re-measured

    additive-shape  /healthz                        (+runtime.release_id, +runtime.private_distribution_sha256)
    additive-shape  /api/role-model/runtime/summary (+ same two keys)
    same            models, endpoints, router/summary, operator/learning, replay/jobs, evaluation/jobs
    environment-state telemetry/summary
    {"additive-shape":2,"same":6,"environment-state":1}   exit=0

**Still zero `different`.** The two keys are produced by the dev packaging path
(`package-sea.ts`: `release_id` from `RUN88_RELEASE_ID`, `private_distribution_sha256` from the Track B
manifest) and are optional in `runtime-version.ts`; the 0.0.20 production package simply does not carry
them.

## Falsifiability

Disabling the addition test (`onlyAdditions = false`):

    {"shape-delta":2,"same":6,"environment-state":1}

Restored -> `additive-shape`. So the label tracks the data, and the previous output is reproducible on
demand.

## Why this matters for the parity claim

"No different" was already true in S234, but a reader could not tell from `shape-delta` whether the
difference was a compatible addition or a breaking change. Now the summary says which, and the
reproduction command is in the evidence.