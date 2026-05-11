# Router Runtime Routing Strategy Lock

This document turns the external routing-strategy proposal into a repo-owned handoff for
the role-model router runtime. Later runs must consume this file and the run-local
requirements under `/.recursive/run/22-router-runtime-routing-strategy-lock/` instead of
relying on conversational context or the external proposal path.

## Frozen objective

The runtime must support routing through a client-facing masquerade alias such as
`gpt-5.4` while selecting among both local and remote endpoints without limitation.
The rollout must stay additive:

- exact-model requests keep working
- routing eligibility and capability checks stay authoritative
- responses continue to report the real chosen model
- the strategy must remain compatible with the current single-host runtime baseline

## Current starting gap

The current codebase still starts from exact-model routing and partial strategy
primitives:

- `/v1/models` currently enumerates real registry models
- request mapping still matches `body.model` against real `model_id` values
- live route scoring persists observations to SQLite, but the live bridge still seeds
  `observedProfilesByEndpointId` from fixture JSON in the validation path
- the current controller surface is a persisted global endpoint assignment, not
  request-time controller inference
- no runtime-owned alias pool, difficulty rubric, `maxDifficulty`, hybrid mode, or
  per-request strategy override exists yet

## Frozen routing-mode vocabulary

Per-alias routing mode vocabulary is locked to:

- `basic` — current deterministic routing baseline over a candidate set
- `difficulty` — strategy C, where request difficulty drives weighting and eligibility
- `intelligent` — strategy B, where a controller emits validated routing guidance
- `hybrid` — a combined strategy that reconciles deterministic rules, difficulty
  inference, controller guidance, and observed data

These modes are additive to exact-model requests. Exact-model requests remain valid
even after alias-based routing ships.

## Frozen configuration contract

Later runs must implement a repo-owned runtime config contract that includes at least:

### Global blocks

- `observedData`
  - recency bias and freshness handling
  - throughput-SLA policy
  - observed override and recommendation thresholds
- `difficultyClassifier`
  - classifier endpoint/model selection
  - timeout/fallback behavior
  - rubric version or equivalent
- `controller`
  - request-time controller endpoint/model selection
  - structured output validation settings
  - timeout/fallback behavior
- request override behavior
  - documented per-request routing-mode override surface

### Per-alias blocks

- `modelAliases`
  - alias id
  - candidate model pool
  - selected routing `mode`
  - mode-local options such as `maxDifficulty`

This contract must work for alias pools that contain:

- local-only targets
- remote-only targets
- mixed local-plus-remote targets

## Frozen difficulty rubric

Difficulty must be classified from observable request properties, not vague intuition.

| Bucket | Typical signals |
| --- | --- |
| `easy` | short input, low instruction density, little or no conversation-history dependency, no tools or at most one predictable tool call, low decomposition burden |
| `medium` | moderate context length, multiple constraints, some multi-step reasoning, tool use that is helpful but bounded, moderate history dependency |
| `hard` | long or compound context, dense constraints, strong decomposition or synthesis burden, likely multiple tool calls, code-edit or schema-conformance burden, significant conversation-history dependency |

The rubric must be grounded in these signal families:

- input length and context size
- instruction density and constraint count
- reasoning depth or decomposition complexity
- expected tool-call count or tool dependence
- code-edit, schema-conformance, or multi-step execution burden
- conversation-history dependency

Later classifier, controller, judge, and observation semantics must reuse this same
rubric family so `easy`, `medium`, and `hard` stay comparable across the runtime.

## Frozen alias compatibility policy

Masquerade aliases must remain honest:

- alias pools should be curated for broadly compatible capability envelopes
- capability gating still happens through runtime eligibility checks for tools,
  structured output, context window, modality, and related constraints
- the initial shipping strategy may be text-and-tools focused where necessary, but it
  must not overclaim unsupported behavior
- the runtime response must continue to expose the real chosen model rather than
  rewriting the response back to the alias

## Frozen proposal-to-run mapping

| Run | Primary ownership |
| --- | --- |
| `23-router-runtime-live-observed-feedback` | replace fixture-fed live observed-profile routing with runtime-owned SQLite feedback |
| `24-router-runtime-recency-bias-throughput-sla` | add recency bias, freshness/confidence handling, and throughput-SLA-aware scoring |
| `25-router-runtime-model-alias-pool` | add masquerade aliases and alias-based model-pool routing |
| `26-router-runtime-difficulty-guided-routing` | add explicit difficulty rubric use, classifier-driven mode, and `maxDifficulty` gating |
| `27-router-runtime-difficulty-learning-cache` | add conversation cache, segmented per-difficulty profiles, observed overrides, and recommendations |
| `28-router-runtime-controller-guided-routing` | add request-time controller inference with validated routing directives |
| `29-router-runtime-request-rewriter-hybrid-mode` | add request rewriting, hybrid arbitration, and per-request mode override |
| `30-router-runtime-strategy-convergence-e2e` | verify proposal conformance, integrate the full runtime, complete required UI, and iterate until end-to-end behavior works |

## Verification discipline

Every implementation run after this lock must:

- use TDD, with failing-test-first discipline for production code
- include end-to-end verification, not just unit or fixture-only proof
- validate local-plus-remote routing behavior whenever the shipped feature spans both
  execution classes
- preserve exact-model compatibility while the alias-based strategy surface grows

## UI and operator-surface rule

If UI work is needed to make the strategy operable, the first UI step is updating the
existing design system. Only after the design-system update may feature screens or
operator surfaces be implemented. The convergence run must use the repo's
`ui-design-system` guidance for accessibility, responsive behavior, and design-system
consistency.

## Scope boundary for this lock

This document freezes the contract only. It does not itself implement:

- alias routing
- observed-data feedback changes
- difficulty classification
- controller inference
- hybrid routing
- UI behavior

Those behaviors are owned by runs `23` through `30`.
