# Agent Strategy And Scoring Strategy

Status: design. Not implemented. This document is the implementation reference for making the scoring
strategies real, splitting them from the runtime routing mode, and adding agent-strategy and workload postures.

Scope: the packaged runtime router - `role-model-router/apps/runtime-host-bridge`,
`role-model-router/packages/core`, `role-model-router/apps/runtime-ui`, and the runtime config contract.

Related documents:

- `docs/architecture/06-router-runtime-architecture-lock.md`
- `docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `docs/architecture/09-runtime-routing-strategy-interactions.md`
- `docs/architecture/15-effect-mq-queue-rebuild.md` (the Effect-phase-0 prerequisite this document depends on)
- `apps/docs-site/content/docs/router/routing-modes-locality-and-execution.mdx`
- `apps/docs-site/content/docs/router/strategy-modes-and-tradeoffs.mdx`
- `.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md` (the canonical strategy weights)

## 1. Why this document exists

The runtime persists a routing strategy string and displays it to operators, but the string never reaches the
scorer. Every request is ranked with the `balanced` weight set unless the difficulty classifier or the
controller happens to override it. The four canonical strategies exist, are specified with exact weights, and
are covered by conformance fixtures - they simply have no path from the saved config into the routing request.

| Claim | Evidence |
| --- | --- |
| The persisted strategy is only consumed as a mode and alias label | `unified-runtime-config.ts` `normalizeRoutingStrategyForAlias` (l.1464), `deriveUnifiedRuntimeRoutingAliasId` (l.1521); `index.ts` `normalizeConfiguredRoutingMode` (l.5345) |
| The canonical four strategies and their weights exist and are tested | `packages/core/src/router.ts` `STRATEGY_WEIGHTS` (l.183), `toPolicyStrategy` (l.374); baseline requirements §7.8; `protocol/fixtures/router-golden/cases/cost-strategy-lower-cost-wins.json`, `.../quality-strategy-measured-vs-declared.json` |
| The bridge never sets a strategy from config | `index.ts` `maybeApplyDifficultyRouting` returns `strategy: "balanced"` outside difficulty/hybrid (l.2089) and `toDifficultyStrategy` maps buckets only (l.1966) |
| The public docs already describe the intended three-knob model | `docs-site` `routing-modes-locality-and-execution.mdx`, `strategy-modes-and-tradeoffs.mdx`, `runtime/routing-controls-and-decision-review.mdx` |
| The legacy spellings predate the canonical vocabulary | `git show d54d8531:role-model-router/packages/core/src/router.ts` (additive `low-cost` / `low-latency` / `high-quality` nudges); baseline requirements §5.6 "No alternate names are allowed in the canonical protocol" |
| `latency-first` came from a chart specimen, not a design | `packages/ui/src/observe-routing-specimens.tsx`; introduced in `73e0c368`, swept into the config normalizers in `654fa997` |

The consequence for operators: a saved `quality` or `cost` posture shows up on the decisions surface while the
decision itself was scored with balanced weights and records `policy_id: "balanced-policy"`. The docs tell
operators to verify `policy_snapshot.strategy` - which can never read back what they saved.

## 2. The model

Routing is three orthogonal axes plus two optional posture presets.

| Axis | Values | Answers |
| --- | --- | --- |
| Scoring strategy | `balanced`, `quality`, `latency`, `cost`, `custom` | once the eligible set is known, what should the winner optimize for? |
| Runtime routing mode | `baseline`, `difficulty`, `hybrid`, `intelligent` | which planner runs before the final endpoint is chosen? |
| Execution scope | `hybrid`, `local_only`, `remote_only`, `decision_only` | which endpoints may execute at all? |
| Agent strategy | role-bound postures (`coder`, `researcher`, ...) | what posture should a role-shaped agent alias inherit? |
| Workload | workload postures (`batch`, `embedding`, ...) | what posture should a workload-shaped alias inherit? |

Strategy never widens the eligible set. Capability, modality, tools, privacy, budget, `maxDifficulty`, role
binding and alias-slice gates all run first, exactly as today.

## 3. Vocabulary and compatibility

Canonical names, by axis:

- scoring strategy: `balanced` | `quality` | `latency` | `cost` | `custom`
- routing mode: `baseline` | `difficulty` | `hybrid` | `intelligent`
- execution scope: `hybrid` | `local_only` | `remote_only` | `decision_only`
- alias mode (per alias, public): `basic` | `difficulty` | `intelligent` | `hybrid`

`intelligent` is the canonical spelling of the mode that the UI already labels "Strategy B - Intelligent".
`controller` remains accepted everywhere it is accepted today (config and the `x-role-model-routing-mode`
header) and normalizes to `intelligent`.

Accepted legacy spellings are read-compatible and normalized on write:

| Legacy spelling | Decodes to |
| --- | --- |
| `baseline`, `basic`, `balanced` | mode `baseline`, scoring `balanced` |
| `latency`, `low-latency`, `latency-first` | mode `baseline`, scoring `latency` |
| `quality`, `high-quality` | mode `baseline`, scoring `quality` |
| `cost`, `low-cost` | mode `baseline`, scoring `cost` |
| `difficulty` | mode `difficulty`, scoring `balanced` |
| `hybrid` | mode `hybrid`, scoring `balanced` |
| `controller`, `intelligent` | mode `intelligent`, scoring `balanced` |
| `craft-ask` | mode `baseline`, scoring `balanced`, alias family `default` |
| anything else | read: normalized to `baseline`/`balanced` with a recorded degradation; write: rejected |

## 4. Configuration contract

```yaml
routing:
  mode: intelligent                 # baseline | difficulty | hybrid | intelligent (controller alias)
  scoring_strategy: custom          # balanced | quality | latency | cost | custom
  pin_weights: false                # true = nothing may replace the saved scoring strategy
  weights:                          # required iff scoring_strategy: custom
    quality: 0.35
    latency: 0.10
    throughput: 0.05
    cost: 0.35
    reliability: 0.10
    preference: 0.05
  intelligent:
    model_id: null                  # null = use controller.modelId
    timeout_ms: 15000

latency_selection:
  enabled: false
  min_stage: S2
  window_hours: 24
  min_samples: 5
  max_delta_ms: 10000
  token_bucket_upper_bounds: [50000, 150000]
  max_candidates: 4

agent_strategies:
  coder:
    role_id: coder
    scoring_strategy: quality
    routing_mode: difficulty         # optional; defaults to routing.mode
  researcher:
    role_id: researcher
    scoring_strategy: balanced

workloads:
  batch:
    scoring_strategy: cost
  embedding:
    required_capabilities: [embeddings.text]
    scoring_strategy: cost
```

Validation rules:

| Field | Rule |
| --- | --- |
| `routing.mode` | enum; default `baseline` |
| `routing.scoring_strategy` | enum; default `balanced` |
| `routing.pin_weights` | boolean; default `false` |
| `routing.weights` | required for `custom`; six keys exactly; each `0..1`; sum `1.0 +- 0.001`; rejected otherwise (the UI offers an explicit normalize action) |
| `routing.intelligent.model_id` | `null` = inherit `controller.modelId`; otherwise a known endpoint/model |
| `latency_selection.min_samples` | integer `5..30` |
| `latency_selection.max_delta_ms` | number `0..60000` |
| `latency_selection.token_bucket_upper_bounds` | 1..8 strictly increasing integers |
| `agent_strategies.<name>` | `^[a-z0-9][a-z0-9-]*$`; must not collide with another agent strategy, a workload name, or a routing family prefix (`default`, `baseline`, `controller`, `difficulty`, `hybrid`) |
| `agent_strategies.<name>.role_id` | must exist in the taxonomy role list |
| `workloads.<name>` | same naming rules as agent strategies |
| `workloads.<name>.required_capabilities` | unknown capabilities are a surfaced warning, not an error (capability taxonomies extend) |
| legacy `routing.strategy` | read via section 3; never written back |

## 5. Resolution order and precedence

Applied in order; the decision records which step produced the effective strategy.

1. Explicit request intent (`role_model.intent`, `x-role-model-requested-role-id`) - beats an agent-strategy preset.
2. Controller directives in `intelligent`/`hybrid` - role, task, capabilities, preferred endpoints always; the
   `strategy` directive only when `pin_weights` is false.
3. Difficulty bucket - `easy` -> `cost`, `hard` -> `quality`, and only when `pin_weights` is false. `medium`
   always falls through.
4. The saved scoring strategy (preset or custom weights).
5. `balanced`.

`pin_weights: true` means the saved scoring strategy ranks every request. Difficulty still gates eligibility
(`maxDifficulty`), the controller still emits its other directives, and neither may change the ranking recipe.

Worked examples:

| Posture | Request | Outcome |
| --- | --- | --- |
| `scoring_strategy: latency`, pin off | hard coding task | difficulty forces `quality`; decision records `strategy_source: difficulty` |
| `scoring_strategy: custom`, pin on | hard coding task | custom weights are used; decision records `strategy_source: operator` |
| `scoring_strategy: custom`, mode `intelligent`, pin on | controller emits `strategy: quality` | custom weights are used; the discarded directive is recorded |
| agent strategy `coder` (role `coder`), request declares `role_model.intent.role = researcher` | any | the declared role wins; the alias preset is recorded as the default it overrode |

## 6. Runtime behaviour

### 6.1 Plug-in points

| Concern | Location |
| --- | --- |
| Difficulty bucket -> strategy | `index.ts` `toDifficultyStrategy` (l.1966), `maybeApplyDifficultyRouting` (l.2065), early return at l.2089 |
| Controller directive -> strategy | `index.ts` `maybeApplyControllerRouting` (l.2232), directive validation at l.2295; `controller-routing-contract.ts` `supportedStrategies` (l.52) |
| Request strategy assignment | `index.ts` `mapChatCompletionsRequest` (l.10142), `mapResponsesRequest` (l.10367) |
| Mode resolution | `index.ts` `resolveEffectiveRoutingMode` (l.9497), `normalizeConfiguredRoutingMode` (l.5345) |
| Alias materialisation | `index.ts` `materializeCanonicalRoutingAliasMatrix` (l.20527) |
| Config decode/render | `unified-runtime-config.ts` `normalizeRoutingStrategyForAlias` (l.1464), `deriveUnifiedRuntimeRoutingAliasMode` (l.1502), renderer (l.1836) |
| Telemetry | `index.ts` `selectedStrategy: plan.routingRequest.strategy` (l.26541); `strategyLabel` fallback must stop reading the raw config string (l.24896) |

### 6.2 Alias materialisation

- The canonical matrix stays 5 families x 4 scopes: `default`, `baseline`, `controller`, `difficulty`,
  `hybrid` x `decision-only`, `local-only`, `remote-only`, `hybrid`.
- Every agent strategy and every workload materialises one alias per scope: `<name>.<scope>`
  (`coder.remote-only`, `batch.local-only`, ...), carrying the posture and its binding.
- Role-bound entries pin `role_id`, which narrows eligibility through the existing role and role-binding
  rules. Workload entries pin `required_capabilities` when declared.
- Pools stay honest: an empty slice reports `ALIAS_POOL_EMPTY` and never widens to the full inventory.
- The alias namespace is shared across the matrix, agent strategies and workloads; collisions are a write error.

### 6.3 Measured-latency override

This is not a scoring strategy. It runs after the router has chosen, and may substitute only an endpoint the
router already considered eligible.

Current behaviour (`routing-latency-selection.ts`, `routing-latency-policy.ts`): authorized when
`enabled` and the activation stage is at or above `min_stage`; reads per-endpoint latency samples from the
window, grouped by prompt-size bucket, dropping every bucket below `min_samples`; compares the challenger's
`p95LatencyMs` against the router's choice and requires an improvement greater than `maxDeltaMs`; applies the
substitution by re-routing with every other eligible endpoint denied, so eligibility still decides.

Changes:

| Field | Before | After |
| --- | --- | --- |
| `enabled` | `false` | `false` (unchanged) |
| `min_samples` | `5`, bounds `3..1000` | `5`, bounds `5..30` |
| `max_delta_ms` | `2000`, bounds `0..60000` | `10000` |
| comparison metric | `p95` | effective latency `p50 + 0.25 * (p95 - p50)`, the same construction the core scorer uses |

`RuntimeEndpointLatencyBucket` already carries `p50LatencyMs` and `p95LatencyMs`, so no storage change is
required. The p95 delta stays in the outcome receipt for visibility but is not a second gate. The outcome is
already recorded on the observation as `routingDiagnostics.latencySelection` (`index.ts` l.27082) and must be
surfaced on the decision detail page.

### 6.4 Intelligent mode

The controller directive contract is unchanged: `requestedRoleId`, `taskType`, `requiredCapabilities`,
`preferredCapabilities`, `strategy`, `preferLocal`, `preferredEndpointIds`, validated against runtime-known
values. The controller does not choose the routing mode. Two changes:

1. `latency` joins `balanced | cost | quality` as a supported controller strategy.
2. The controller's `strategy` directive is ignored when `pin_weights` is true, and the ignored directive is
   recorded on the decision.

Failure behaviour is unchanged: a missing or unreachable controller endpoint records
`controller-endpoint-unavailable`; timeout or invalid output falls back to the configured mode with
`fallbackApplied` and a reason.

### 6.5 Provenance

Every decision records `strategy_source` (`controller` | `difficulty` | `operator` | `default`), the effective
weights digest, and the latency-override outcome when it acted. `difficulty_bucket` keeps its current meaning
in difficulty mode; in controller mode it remains a derived value and that is documented rather than changed.

## 7. Effect primitives and how to use them

### 7.1 Prerequisite

The vendored tree is not consumable today: `vendor/effect/VENDORED.json` records the wiring as *"not a
workspace package and not imported by any build; a lint-ignored source drop only"*. `docs/architecture/15`
§5.1 owns the decision (workspace package re-export vs path-mapped bundling) and the SEA bundling proof. This
document depends on that decision: routing modules import `effect` by bare specifier and never import
`vendor/effect/**` by relative path.

Everything below is optional in the sense that the same module boundaries work in plain TypeScript - but where
Effect is the obvious shape, it is used, and any deviation is recorded per `AGENTS.md`.

### 7.2 Primitive map

| Concern | Primitive | Vendored source |
| --- | --- | --- |
| Config and vocabulary decoding, bounds, weight invariants | `Schema` | `packages/effect/src/Schema.ts` |
| Strategy vocabulary as a total, exhaustive value | `Data.TaggedEnum` + `Match` | `Data.ts`, `Match.ts` |
| Strategy resolution as a replaceable service | `Context.Service` + `Layer` | `Context.ts`, `Layer.ts` |
| Live config state and the config mutation lock | `SynchronizedRef` + `Semaphore` | `SynchronizedRef.ts`, `Semaphore.ts` |
| Derived-artifact caching (compiled matrix, resolved weights) | `Cache` | `Cache.ts` |
| Env narrowing for the latency policy | `Config` + `ConfigProvider` | `Config.ts`, `ConfigProvider.ts` |
| Decision provenance counters | `Metric` | `Metric.ts` |
| Structured decision logging | `Effect.logInfo` / `Effect.annotateLogs` | `Effect.ts` |

### 7.3 How to use each

**Schema - the config contract.** Decode the routing block once at the boundary; the rest of the runtime
consumes typed values and never re-parses strings.

```ts
import { Schema } from "effect"

const Unit = Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 })))

export const WeightProfile = Schema.Struct({
  quality: Unit,
  latency: Unit,
  throughput: Unit,
  cost: Unit,
  reliability: Unit,
  preference: Unit
}).pipe(
  Schema.check(
    Schema.makeFilter((weights) => {
      const sum =
        weights.quality + weights.latency + weights.throughput +
        weights.cost + weights.reliability + weights.preference
      return Math.abs(sum - 1) <= 0.001 ? undefined : `weights must sum to 1.0 (saw ${sum})`
    })
  )
)

export const RoutingBlock = Schema.Struct({
  mode: Schema.Literals(["baseline", "difficulty", "hybrid", "intelligent", "controller"]),
  scoringStrategy: Schema.Literals(["balanced", "quality", "latency", "cost", "custom"]),
  pinWeights: Schema.Boolean,
  weights: Schema.optionalKey(WeightProfile)
})

// boundary decodes
const decode = Schema.decodeUnknownEffect(RoutingBlock)
const decodeResult = Schema.decodeUnknownResult(RoutingBlock)   // for the operator write path
const encode = Schema.encodeEffect(RoutingBlock)                // for rendering the config file
```

Use `decodeUnknownResult` on the operator API so a bad write returns the exact failing path
(`weights.quality`, `weights`, `mode`) instead of a thrown string, and `decodeUnknownEffect` on the startup
read so a bad file becomes a typed failure with a degradation receipt.

**Data.TaggedEnum + Match - one total vocabulary.** Today three parallel switches
(`normalizeRoutingStrategyForAlias`, `normalizeConfiguredRoutingMode`, `toPolicyStrategy`) can drift apart.
Model the plan as a tagged enum and resolve it with an exhaustive match, so a new variant is a compile error
everywhere it is not handled.

```ts
import { Data, Match } from "effect"

type ScoringPlan = Data.TaggedEnum<{
  Balanced: {}
  Quality: {}
  Latency: {}
  Cost: {}
  Custom: { weights: typeof WeightProfile.Type }
}>
const ScoringPlan = Data.taggedEnum<ScoringPlan>()

const weightsFor = (plan: ScoringPlan) =>
  Match.value(plan).pipe(
    Match.when({ _tag: "Balanced" }, () => BALANCED_WEIGHTS),
    Match.when({ _tag: "Quality" }, () => QUALITY_WEIGHTS),
    Match.when({ _tag: "Latency" }, () => LATENCY_WEIGHTS),
    Match.when({ _tag: "Cost" }, () => COST_WEIGHTS),
    Match.when({ _tag: "Custom" }, ({ weights }) => weights),
    Match.exhaustive
  )
```

The canonical presets stay the single source of truth: the values in `packages/core/src/router.ts`
`STRATEGY_WEIGHTS` are exported and reused, not copied.

**Protocol constraint.** `protocol/schemas/routing-policy.schema.json` is a closed schema whose `strategy` is
exactly `balanced | cost | latency | quality`. Custom weights therefore are an implementation-level extension:
`policy_snapshot.strategy` records the plan's base strategy (default `balanced` for a custom profile) and the
effective weights plus digest travel in the runtime's own `routingDiagnostics`. Extending the protocol schema
with an optional `weights` object is a separate, reviewed change and is listed as an open item in section 11.

**Context.Service + Layer - the resolver.** One service owns "which weights apply to this request", so the
bridge stops threading `defaultRoutingMode` through six call sites.

```ts
import { Context, Effect, Layer } from "effect"

export const ScoringStrategyResolver = Context.Service<{
  readonly resolve: (input: {
    readonly plan: ScoringPlan
    readonly difficulty?: "easy" | "medium" | "hard"
    readonly controllerStrategy?: ScoringPlan
  }) => StrategyResolution
}>("role-model/ScoringStrategyResolver")

export const ScoringStrategyResolverLive = (state: SynchronizedRef.SynchronizedRef<RoutingState>) =>
  Layer.succeed(ScoringStrategyResolver, {
    resolve: (input) => resolveWith(SynchronizedRef.getUnsafe(state), input)
  })
```

The pure `resolveWith` carries the section 5 precedence and is unit-testable without a runtime; the layer is
the only place that knows about live config. Tests provide a `Layer.succeed` with a fixed state.

**SynchronizedRef + Semaphore - live config and the mutation lock.** Replace the module-level
`let currentUnifiedRuntimeConfig` and `withUnifiedConfigMutationLock` with a single owner:

```ts
const state = yield* SynchronizedRef.make(initialRoutingState)
const lock = yield* Semaphore.make(1)

const applyUpdate = (next: RoutingState) => lock.withPermits(1)(work(next))
// reads are lock-free:
const current = yield* SynchronizedRef.get(state)
```

Writers take the permit, decode and validate with `Schema`, then `SynchronizedRef.set` once. Readers see
either the old or the new state, never a half-applied alias matrix.

**Cache - derived artifacts, not the durable cache.** Use `Cache` for pure derived values keyed by config
revision (compiled alias matrix, resolved weights per plan, decoded config snapshot):

```ts
const matrixCache = yield* Cache.make({
  capacity: 16,
  timeToLive: Duration.minutes(15),
  lookup: (revision: string) => Effect.sync(() => compileAliasMatrix(revision))
})
```

The difficulty-classification cache stays in SQLite (`readDifficultyClassificationCache` /
`upsertDifficultyClassificationCache`) because it must survive restarts and be shared between hosts; an
in-process `Cache` may sit in front of its read path but never replaces it.

**Config + ConfigProvider - the latency policy's environment narrowing.** `routing-latency-policy.ts`
currently reads the environment inline. Replace that with a structured config so precedence (defaults <
versioned policy < environment override, where the environment may only narrow) is declared rather than
hand-coded:

```ts
const EnvOverrides = Config.unwrap({
  enabled: Config.option(Config.Boolean("ROLE_MODEL_LATENCY_SELECTION_ENABLED")),
  maxDeltaMs: Config.option(Config.Number("ROLE_MODEL_LATENCY_SELECTION_MAX_DELTA_MS"))
})
```

Provide it through `ConfigProvider.layer(...)` in the runtime composition; tests provide a literal provider.

**Metric + logs - provenance.** One counter, tagged per decision, so the aggregation question "which source
produced this strategy" is answerable without scanning receipts:

```ts
const decisions = Metric.counter("role_model_routing_strategy_decisions_total", {
  description: "Routing decisions by effective strategy and its source"
})

const record = (strategy: string, source: string) =>
  decisions.pipe(Metric.withAttributes({ strategy, source }), Metric.update(1))
```

Log the same pair with `Effect.logInfo` plus `Effect.annotateLogs` on the decision path so a single request
can be traced without querying the store.

### 7.4 What this does not rebuild

- No `effect-mq` and no `PersistedQueue`: this work has no queue, worker or retry lane. That surface belongs
  to `docs/architecture/15`.
- No rewrite of the router core: `packages/core/src/router.ts` keeps its pure `routeRequest` signature and
  receives the resolved weights as an input.
- No rewrite of the HTTP server: the bridge keeps its current handler shape; the resolver is constructed in
  the composition root and provided to the mapping functions.

### 7.5 Fallback

If the SEA bundling proof fails, the module boundaries stay identical and the resolver is implemented in plain
TypeScript, with the reason recorded in the run addendum per `AGENTS.md`. Schema-equivalent validation still
lands, expressed as hand-written decoders with the same error paths.

## 8. UI surfaces

```
Router
|- Overview
|- Routing strategy      mode - scoring strategy - custom weights - pin - execution scope - latency override
|- Agent strategy        role-bound postures
|- Workloads             workload postures
|- Controller            unchanged
|- Candidates            unchanged
|- Decisions             plus strategy source and latency-override receipt
```

- Routing strategy: mode selector (`baseline`, `difficulty`, `hybrid`, `Intelligent`), scoring selector
  (`balanced`, `quality`, `latency`, `cost`, `custom`), the six-input weights editor with a live sum check and
  reset-to-preset, a "Pin scoring strategy" checkbox (default off, described as "Prevent difficulty
  classification and Intelligent mode from overriding the saved strategy"), the execution scope selector, a
  resolved-posture line, and the measured-latency override card (on/off default off, threshold default
  10 000 ms, window, sample floor 5 with 5..30 bounds, bucket bounds, max candidates, reset to default, and
  the evidence counts behind the current setting).
- Agent strategy and Workloads pages: one row per entry with its binding, its posture, its per-scope alias
  list, candidate counts per scope, and the endpoint that currently wins.
- Decisions: effective strategy, `strategy_source`, weights digest, and the latency-override outcome when it
  acted. The existing `strategyLabel` fallback to the raw config string must be removed.

## 9. Delivery phases

| Phase | Work | Acceptance |
| --- | --- | --- |
| P0 | Vocabulary and precedence as schema + tagged enum with failing tests first; consumable vendored Effect tree and SEA bundling proof | tests fail for the right reason; an Effect import survives `runtime:package-sea` and the packaged exe serves its channel |
| P1 | Config split (`routing.mode`, `routing.scoring_strategy`, `pin_weights`, `weights`, `routing.intelligent`), latency defaults, legacy read-compat and write normalization | save/reload round-trips; the migration table in section 3 is covered by tests |
| P2 | Agent strategy and workload blocks, alias materialisation, request-intent precedence; Intelligent regression (including `latency` in the controller set) | one verification per shipped entry (section 10.2) |
| P3 | Provenance: `strategy_source`, weights digest, latency-selection outcome in telemetry and the decision readback | a decision answers "who chose this strategy, and did the latency override act" |
| P4 | UI: routing strategy page, agent strategy page, workloads page, decision detail | every control round-trips and the posture line matches the next decision |
| P5 | Vocabulary convergence: legacy spellings removed from the UI, read-compat retained, docs updated | no UI path can set a synonym; `docs-site` pages describe the shipped behaviour |
| P6 | End-to-end: save a posture, route a live request, inspect the decision | the decision's effective strategy, source and weights match what was saved |

## 10. Verification

### 10.1 P0 failing tests

Config and vocabulary:

1. `routing.mode` and `routing.scoring_strategy` round-trip through the config file and the API.
2. A custom profile with a negative weight, a weight above 1, a missing key, an extra key, or a sum outside
   tolerance is rejected with the failing path named.
3. Every legacy spelling in section 3 decodes to its documented `(mode, scoring)` pair.
4. An unknown `routing.strategy` on read produces a degradation receipt and `baseline`/`balanced`; on write it
   is rejected.
5. `Data.TaggedEnum` coverage: every scoring strategy resolves to a weight profile, and the preset values
   equal the exported `STRATEGY_WEIGHTS` entries.

Precedence:

6. Hard request, pin off, operator `latency` -> effective `quality`, `strategy_source: difficulty`.
7. Hard request, pin on, operator `latency` -> effective `latency`, `strategy_source: operator`.
8. Medium request, pin off, operator `custom` -> the custom weights are used.
9. Intelligent mode, controller emits `strategy: quality`, pin off -> effective `quality`,
   `strategy_source: controller`.
10. Intelligent mode, controller emits `strategy: quality`, pin on -> operator strategy retained and the
    discarded directive recorded.
11. A request-declared role overrides an agent strategy's `role_id`, and the decision records both.

Agent strategy and workloads:

12. `coder` materialises `coder.<scope>` aliases across the scopes with a non-empty pool, and reports
    `ALIAS_POOL_EMPTY` when the role's slice is empty instead of widening.
13. A name used in both `agent_strategies` and `workloads` is rejected on write.

Latency override:

14. Default posture: no substitution, and the decision records the disabled outcome.
15. Enabled, floor `5`: an endpoint with four samples in the bucket produces no candidates.
16. Enabled: a challenger whose effective latency beats the router's choice by more than the threshold is
    selected, and the receipt names the bucket and the delta.
17. A p95 spike with an unchanged p50 does not move the choice.
18. The substitution never selects an endpoint outside the router's eligible set.

### 10.2 Per-entry verification (P2)

For every shipped agent strategy and workload: the alias exists for each scope with a non-empty pool, the
posture reaches `policy_snapshot.strategy` and the effective weights, the same candidate set produces the
expected different winner under a different posture, the pool never widens, and one live request through the
alias shows the decision.

### 10.3 End-to-end

Save `scoring_strategy: quality` (and separately a custom profile), route a live request, and confirm the
decision's effective strategy, source, weights digest and winner match the saved posture.

## 11. Risks, constraints and open items

1. **SEA bundling.** Effect v4 inside the packaged exe is the largest unknown and is the P0 proof
   (`docs/architecture/15` §7.1).
2. **Closed protocol schema.** Custom weights cannot live inside `policy_snapshot` without a protocol change;
   this document keeps them in the runtime diagnostics. If the protocol owner wants them in the decision
   artifact, that is a separate reviewed change.
3. **Two latency mechanisms.** The `latency` scoring strategy and the measured-latency override must stay
   visibly distinct in the UI and the docs, or operators will attribute one's behaviour to the other.
4. **Telemetry distribution shift.** `selected_strategy` begins carrying `latency` and non-balanced values for
   existing installations; analytics dashboards must tolerate the new values (they already accept strings).
5. **Comparability.** `difficulty_bucket` remains a derived value in controller mode; this document documents
   that rather than changing the column.
6. **Alias namespace pressure.** Every agent strategy and workload adds one alias per scope; the alias list
   must stay paginated and searchable in the UI.

## 12. References

- Config and alias derivation: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- Bridge routing path: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- Controller contract: `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
- Latency override: `.../src/routing-latency-selection.ts`, `.../src/routing-latency-policy.ts`
- Scoring engine: `role-model-router/packages/core/src/router.ts`, `.../src/types.ts`
- Latency buckets: `role-model-router/packages/sqlite-memory/src/index.ts` (`readEndpointLatencyBuckets`, l.5454)
- Activation policy fields: `shared/route-learning/activation-policy.mjs`
- Protocol schemas: `protocol/schemas/routing-policy.schema.json`, `protocol/schemas/router-decision.schema.json`
- Vendored Effect: `vendor/effect/PROVENANCE.md`, `packages/effect/src/{Schema,Data,Match,Context,Layer,SynchronizedRef,Semaphore,Cache,Config,Metric}.ts`
