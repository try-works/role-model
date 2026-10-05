Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `1 AS-IS` (delegated draft; the controller owns and locks `01-as-is.md`)
Role: `analyst`
Task ids: `T1.1`, `T1.2a`, `T1.2b`, `T1.2c`, `T1.2d`, `T1.2e`, `T1.3`
Status: `DRAFT` (analyst output, not a locked phase artifact)
Worktree: `D:\DEV\role-model\.worktrees\103-agent-strategy-and-scoring-strategy`
Diff basis: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff` -> `working-tree` (from `00-worktree.md`)
Audit basis: every anchor below was read from this worktree at the recorded diff basis; no claim is taken from
the design document's own line numbers (see "Anchor drift" below).

## Brief provenance (why this file exists under this name)

The spawn record for `/root/analyst_t1` exists in the parent rollout, but `E:\tmp\collab\INBOX.md` has no
`analyst_t1` row and `E:\tmp\collab\briefs\analyst_t1.md` does not exist, so the documented INBOX path was
empty. The task text was recovered verbatim from the parent thread's own `spawn_agent` call record
(`sessions/2026/09/30/rollout-2026-09-30T05-00-59-01a0eef8-*.jsonl`, ordinal 2607), which is the recovery path
INBOX step 2 describes. The recovered brief carried no `RECEIPT TOKEN` line and named this artifact with an
underscore, while `00-requirements.md` names the same artifact with a hyphen. Only this file was written.

## Source Requirement Inventory

Source: `inputs/16-agent-strategy-and-scoring-strategy.md` (PR `#288`,
`docs/architecture/16-agent-strategy-and-scoring-strategy.md`, head `d6b9b22c`), 694 lines, read in full.
Dispositions are `satisfied today` | `partially` | `missing` | `out of scope`; every section maps to at least one
requirement id from `00-requirements.md`.

| Design section | Source quote (short) | Normalized obligation | Requirement(s) | Disposition |
| --- | --- | --- | --- | --- |
| §1 Why this document exists | "the string never reaches the scorer ... ranked with the `balanced` weight set" | The persisted strategy must reach the scorer; the inert-strategy claim must be testable | R1, R2, R3 | `partially` (claim confirmed, see T1.2b; nothing fixed) |
| §2 The model | "Routing is three orthogonal axes plus two optional posture presets" | Scoring strategy, routing mode and execution scope must be separable; agent-strategy and workload postures are additive | R1, R2, R5, R6 | `missing` (only mode and scope exist; scoring is fused into mode) |
| §3 Vocabulary and compatibility | "Canonical names, by axis" ... `custom`; "Accepted legacy spellings are read-compatible and normalized on write" | One canonical vocabulary per axis; legacy spellings read-compatible, normalized on write, unknown rejected on write and degraded on read | R1, R10 | `partially` (legacy spellings exist only as two hand-written mode switches; nothing is normalized on write) |
| §4 Configuration contract | "`scoring_strategy: custom` ... `pin_weights: false` ... `routing.weights` required iff `custom`" | The routing block, latency block, `agent_strategies` and `workloads` must exist with the stated validation rules | R1, R5, R6, R7 | `missing` (only `routing.strategy` and `execution_mode` persist; latency lives in the learning policy file, not the runtime config) |
| §5 Resolution order and precedence | "1. Explicit request intent ... 5. `balanced`"; "`pin_weights: true` means the saved scoring strategy ranks every request" | Five-step resolution order with recorded provenance; pin blocks difficulty and controller strategy only | R2, R4 | `missing` (no precedence ladder; difficulty and controller only) |
| §6.1 Plug-in points | "Difficulty bucket -> strategy ... Controller directive -> strategy ... Request strategy assignment" | The three plug-in points must carry the resolved strategy | R2, R8 | `partially` (all three exist; the request assignment is hard-wired to the difficulty result) |
| §6.2 Alias materialisation | "Every agent strategy and every workload materialises one alias per scope: `<name>.<scope>`"; "Pools stay honest: an empty slice reports `ALIAS_POOL_EMPTY`" | 5x4 matrix unchanged; per-posture aliases per scope; `ALIAS_POOL_EMPTY` without widening; namespace collisions are write errors | R5, R6 | `partially` (the 5x4 matrix and honest pools exist; per-posture aliases and collision checks do not) |
| §6.3 Measured-latency override | "compares the challenger's `p95LatencyMs` ... requires an improvement greater than `maxDeltaMs`"; after: `p50 + 0.25 * (p95 - p50)`, `10 000`, `5..30` | Off-by-default valve with a stable metric, a meaningful sample floor and a bounded substitution | R7 | `partially` (implemented and recorded; metric, default and bounds differ from the target) |
| §6.4 Intelligent mode | "`latency` joins `balanced`/`cost`/`quality` as a supported controller strategy"; "ignored when `pin_weights` is true" | Controller contract unchanged except the extra strategy value and the pin interaction | R4 | `partially` (contract exists; `latency` unsupported; no pin interaction) |
| §6.5 Provenance | "Every decision records `strategy_source` ... the effective weights digest, and the latency-override outcome" | Decisions must answer which strategy, who chose it, with which weights | R3 | `missing` (no `strategy_source`, no weights digest, no discarded-directive receipt; latency outcome recorded but not surfaced) |
| §7 Effect primitives and how to use them | "import `effect` by bare specifier like every other consumer and never reach into `vendor/**`"; "Effect owns the config path, not the request path" | Routing modules use the landed wrapper; Schema/TaggedEnum/Context/SynchronizedRef/Semaphore/Config/Metric as prescribed; no effect on the request path | R9 | `partially` (wrapper landed and consumed by `queue-runtime/*`; no routing module imports `effect` today) |
| §8 UI surfaces | "mode selector ... scoring selector ... six-input weights editor ... 'Pin scoring strategy' ... measured-latency override card"; "Agent strategy and Workloads pages" | Three operator pages plus decision-detail provenance, with no legacy synonym reachable | R8 | `missing` (one mode-only page; no Agent strategy, Workloads or weights surfaces) |
| §9 Delivery phases | "P0 ... tests fail for the right reason"; "P6 End-to-end: save a posture, route a live request, inspect the decision" | Sequencing only; the phase contract is owned by `00-requirements.md` R11/R12 | R11, R12 | `out of scope` for Phase 1 (process obligation, mapped in Phase 2) |
| §10 Verification | "10.1 P0 failing tests" (18 items); "10.2 Per-entry verification"; "10.3 End-to-end" | The RED set, the per-entry matrix and the end-to-end gate must be reproduced as tests | R11, R12 (with R1-R7 feeding the content) | `missing` (no test asserts any of the 18 P0 behaviours today) |
| §11 Risks, constraints and open items | "Custom weights cannot live inside `policy_snapshot` without a protocol change"; "a `runPromise` in the `/v1/chat/completions` path is a defect" | Protocol-closed schema, two distinct latency mechanisms, SEA re-verification, request-path purity | Constraints, R10, R12 | `partially` (constraint confirmed: `protocol/schemas/routing-policy.schema.json` is closed at four values) |
| §12 Audit notes | "The sketches in section 7 were executed with the repo's `tsx` ... importing the vendored source" | The API shapes verified there stay the implementation reference; deviations are recorded | R9 | `out of scope` for Phase 1 (a Phase 3 verification claim) |
| §13 References | reference list | Inputs; no independent obligation | Inputs | `satisfied today` (all referenced paths resolve in this worktree except the two noted under Open questions) |

### §6 and §10 obligations decomposed (same source, finer granularity)

| Item | Obligation | Requirement(s) | Disposition |
| --- | --- | --- | --- |
| §6.1 difficulty | `easy -> cost`, `hard -> quality`, `medium` falls through | R2 | `partially` (`medium` hard-codes `balanced`, `index.ts:1966-1977`) |
| §6.1 controller | directive validation against runtime-known values; accepted directives recorded | R4 | `satisfied today` (`controller-routing-contract.ts:90-96`, `index.ts:2369-2383`) |
| §6.1 request assignment | the resolved strategy must be the request's `strategy` | R2 | `missing` (`index.ts:10411`, `index.ts:10636`) |
| §6.2 scope aliases | one alias per scope per posture, posture carried on the alias | R5, R6 | `missing` (`unified-runtime-config.ts:70-78` has no posture field) |
| §6.2 honesty | empty slice reports `ALIAS_POOL_EMPTY`, never widens | R5, R6 | `partially` (the canonical pool already reports `ALIAS_POOL_EMPTY` at `index.ts:8861-8869` and on write; posture aliases do not exist, so they cannot report it) |
| §6.3 metric | effective latency `p50 + 0.25 * (p95 - p50)` | R7 | `missing` (`routing-latency-selection.ts:12`, `:84-90` compares raw p95) |
| §6.3 floor and bounds | `min_samples 5`, bounds `5..30`; `max_delta_ms 10000` | R7 | `missing` (`routing-latency-policy.ts:42`, `:55`) |
| §6.3 readback | outcome recorded and shown on the decision detail | R7, R8 | `partially` (recorded at `index.ts:27718`; no decision-detail surface) |
| §6.4 latency strategy | `latency` joins the controller set, including prompt guidance | R4 | `missing` (`controller-routing-contract.ts:52`, `:285`, `:307`, `:323`) |
| §6.4 pin | controller `strategy` ignored when pinned and recorded as discarded | R4, R3 | `missing` (no pin concept exists) |
| §6.5 provenance | `strategy_source`, weights digest, discarded directives | R3 | `missing` |
| §7.1 and §7.3 primitives | Schema/Data/Context/SynchronizedRef/Semaphore/Cache/Config/Metric used where prescribed | R9 | `missing` in the routing path (`effect` appears in 7 bridge files, none of them routing) |
| §7.4 boundary | one `ManagedRuntime` in the composition root; no effect per request | R9 | `satisfied today` for the queue path (`queue-runtime/index.ts:156`, `:276`, `:389`); not applicable to routing yet |
| §7.6 fallback | plain-TypeScript fallback with the reason recorded if bundling fails | R9 | `out of scope` for Phase 1 |
| §8 routing page | mode + scoring + weights + pin + scope + resolved posture + latency card | R8 | `missing` (`control-routing-strategy.tsx:66-103`) |
| §8 posture pages | Agent strategy and Workloads as separate pages | R8 | `missing` (no such route exists) |
| §8 decisions | effective strategy, `strategy_source`, digest, latency receipt; `strategyLabel` fallback removed | R3, R8 | `missing` (`index.ts:25442-25445`, `index.ts:25556-25559`) |
| §10.1 items 1-5 and 12-18 | the P0 RED cases for config, aliases and latency | R1-R7, R11 | `missing` (the existing `run98-a40-latency-policy.test.ts` encodes the current, different defaults) |
| §10.1 items 6-11 | the six precedence cases | R2, R4 | `missing` |
| §10.2 per-entry matrix | one verification per shipped posture entry | R5, R6, R11 | `missing` |
| §10.3 end-to-end | saved posture -> live request -> decision matches | R12 | `missing` |

## Current behaviour by surface

### (a) Config, alias and mode path (`T1.2a`)

- The persisted routing value is one string on the runtime config: `unified-runtime-config.ts:186`
  (`readonly routingStrategy: string | null`), read at `unified-runtime-config.ts:1690`
  (`routingStrategy: normalizeRoutingStrategyInputValue(rawConfig.routing?.strategy)`) and written back at
  `unified-runtime-config.ts:1839-1843` (`document.routing = { strategy: config.routingStrategy }`).
  `normalizeRoutingStrategyInputValue` (`unified-runtime-config.ts:1494-1500`) only trims, lower-cases, and maps
  `craft-ask` to `null`; every other string is persisted verbatim. There is no `scoring_strategy`, `pin_weights`,
  `weights`, `agent_strategies` or `workloads` key in the reader or the renderer, and no schema: the block is
  hand-validated with `readNonEmptyString`-style helpers.
- Alias materialisation collapses that string to a **mode**: `normalizeRoutingStrategyForAlias`
  (`unified-runtime-config.ts:1464-1492`) maps
  `baseline|basic|balanced|latency|quality|cost|low-latency|high-quality|low-cost|latency-first` to `"baseline"`,
  `controller|intelligent` to `"controller"`, and anything unknown to a slugified string or `"default"`. So
  `quality`, `cost` and `balanced` produce the *same* alias family. `deriveUnifiedRuntimeRoutingAliasMode`
  (`:1502-1519`) returns `basic` for `baseline|default`, `intelligent` for `controller`, and the fallback otherwise.
  `deriveUnifiedRuntimeRoutingAliasId` (`:1521-1529`) returns the string `${strategy}.${executionMode}`.
- The canonical matrix is materialised at `index.ts:21075-21113` from `CANONICAL_ROUTING_ALIAS_STRATEGIES`
  (`index.ts:659-665`: `null | baseline | controller | difficulty | hybrid`) across
  `CANONICAL_ROUTING_ALIAS_EXECUTION_MODES` (`index.ts:666-671`:
  `decision_only | hybrid | local_only | remote_only`), and persisted when it differs (`index.ts:21114-21130`).
- The request path's default mode comes from the same string: `index.ts:28127-28133`
  (`defaultRoutingMode: normalizeConfiguredRoutingMode(currentUnifiedRuntimeConfig?.routingStrategy) ?? undefined`),
  repeated at `index.ts:28334`, `:28712`, `:28888`. `normalizeConfiguredRoutingMode` (`index.ts:5597-5623`) is a
  second, independent copy of the vocabulary that also maps every scoring name to `"baseline"`.
  `resolveEffectiveRoutingMode` (`index.ts:9765-9779`) prefers `x-role-model-routing-mode`
  (`parseRuntimeRoutingModeOverride`, `index.ts:5576-5583`; accepted set `index.ts:5573`), then the alias `mode`
  (`toAliasRoutingMode`, `index.ts:9706-9718`), then that default.
- `RuntimeRoutingMode` is imported into the bridge (`index.ts:70`) and is the only routing-mode type; the scoring
  vocabulary lives separately in core as `RoutingStrategy` (`packages/core/src/types.ts:12-20`, seven values
  including the legacy `low-latency|high-quality|low-cost`).

### (b) Where `RoutingRequest.strategy` is set, and the proof the saved strategy never reaches it (`T1.2b`)

- Both mappers build the request from the difficulty result and nothing else: `mapChatCompletionsRequest`
  (`index.ts:10231`) sets `strategy: difficultyRouting.strategy` at `index.ts:10411`; `mapResponsesRequest`
  (`index.ts:10471`) sets the same at `index.ts:10636`.
- `maybeApplyDifficultyRouting` (`index.ts:2065-2146`) early-returns `strategy: "balanced"` whenever the effective
  mode is not `difficulty`/`hybrid` (`index.ts:2086-2092`), and otherwise returns
  `toDifficultyStrategy(classified.difficulty)` (`index.ts:2106`). `toDifficultyStrategy` (`index.ts:1966-1977`)
  maps `easy -> cost`, `hard -> quality`, and everything else (including `medium`) to `balanced`.
- `maybeApplyControllerRouting` (`index.ts:2232-2388`) only ever replaces the strategy from controller guidance:
  `const finalStrategy = guidanceStrategy ?? input.routingRequest.strategy` (`index.ts:2332`) and
  `...(guidanceStrategy ? { strategy: guidanceStrategy } : {})` (`index.ts:2350`). `guidanceStrategy` is gated by
  `isBridgeRoutingStrategy` (`index.ts:1172-1174`) over `BRIDGE_ROUTING_STRATEGIES` (`index.ts:1152-1160`:
  `balanced|latency|quality|cost|low-latency|high-quality|low-cost`).
- Exhaustive check of `routingStrategy` in `index.ts`: `18199` (persisting the config), `21088-21094` (alias
  matrix), `25094` and `25106` (operator read-back), `25444` and `25558` (the `strategyLabel` fallback), and
  `28132`, `28334`, `28712`, `28888` (the default mode). It is **never** read to set a request strategy. Every use
  is a label, an alias id, or a mode.
- Consequence in the decision artifact: `packages/core/src/router.ts:417-421` builds
  `policy_id` as `<request strategy>-policy` and `strategy: toPolicyStrategy(input.request.strategy)`;
  `toPolicyStrategy` (`router.ts:374-390`) recognises only `cost|low-cost`, `latency|low-latency`,
  `quality|high-quality`, and defaults to `balanced`. `getRedistributedWeights(policySnapshot.strategy, ...)`
  (`router.ts:1193-1200`, called at `router.ts:1712`) selects the weight table, and `STRATEGY_WEIGHTS`
  (`router.ts:183-219`) is keyed by that four-value strategy. A saved `quality` posture on a `baseline` runtime
  therefore yields `policy_id: "balanced-policy"` and balanced weights - exactly the §1 claim, demonstrated by
  reading the path end to end rather than inferred.
- Telemetry reads the same request value: `selectedStrategy: plan.routingRequest.strategy` (`index.ts:27158`),
  surfaced and filterable (`index.ts:23226`, `:23398-23399`, `:24096`, `:24544`). The documented value set must
  therefore already include `latency` (R3) even though config cannot produce it today.

### (c) Measured-latency override: metric, defaults, bounds, gate, readback (`T1.2c`)

- Policy defaults and bounds, `routing-latency-policy.ts:40-58`: `enabled: false`, `minStage: "S2"`,
  `windowHours: 24` (bounds `1..168`), `minSamples: 5` (**bounds `3..1000`**), `maxDeltaMs: 2000` (bounds
  `0..60000`), `tokenBucketUpperBounds: [50_000, 150_000]`, `maxCandidates: 4` (bounds `1..32`). The doc comment at
  `:25` still describes the comparison in terms of "p95".
- Resolution and fail-closed behaviour: `resolveRoutingLatencySelectionPolicy` (`routing-latency-policy.ts:85-182`)
  accepts `raw` plus an `environment` map; any rejected field abandons the whole configuration back to defaults with a
  `violations` list (`:162-166`). Environment overrides may only narrow:
  `ROLE_MODEL_ROUTING_LATENCY_SELECTION_ENABLED` can only disable (`:138-149`) and `..._MAX_DELTA_MS` may only lower
  (`:150-160`). Note the env names are `ROLE_MODEL_ROUTING_LATENCY_SELECTION_*`, not the
  `ROLE_MODEL_LATENCY_SELECTION_*` spelling the design document's §7.3 sketch uses.
- Where it is authorised and fed: `index.ts:25734-25766` computes `latencySelectionAuthorized` from
  `planLearningPolicySnapshot?.latencySelection` (`enabled` plus
  `activationStageRank(stage) >= activationStageRank(minStage)`) and, only then, reads buckets through
  `readEndpointLatencyBuckets` with the policy window, bucket bounds and `minimumSampleCount: minSamples`
  (`index.ts:25750-25762`).
- The comparison itself, `routing-latency-selection.ts`: candidates are restricted to the router's eligible set
  (`:41`, `:76-80`), the metric compared is raw `p95LatencyMs` (`:12`, `:20`, `:84-90`, `:109-111`), and the gate is
  `improvementMs > maxDeltaMs` (`:144-148`) with a reason string naming p95 and the delta (`:158`).
- Substitution and recording: `index.ts:25937-25975` re-routes with every other eligible endpoint denied and stores
  the outcome; `index.ts:27713-27718` writes it to the observation as `routingDiagnostics.latencySelection`.
- Storage already carries both percentiles: `RuntimeEndpointLatencyBucket` (`sqlite-memory/src/index.ts:5458-5464`)
  has `p50LatencyMs` and `p95LatencyMs`; `readEndpointLatencyBuckets` (`:5466-5550`) withholds any bucket below
  `minimumSampleCount` (`:5534`) and derives the percentiles at `:5544-5545`. So the effective-latency change needs no
  storage change, as §6.3 states.
- Readback gap: nothing projects `latencySelection` into the decision-detail payload. In the UI the only
  `latencySelection*` strings are the generic Learning > Configuration policy-editor fields
  (`runtime-ui/app/lib/learning-api.test.ts`); there is no latency card on the routing page and no decision-detail
  receipt.

### (d) UI surfaces that display or mis-derive strategy and alias (`T1.2d`)

- The Routing strategy page is mode-only: `control-routing-strategy.tsx:66-103` builds `STRATEGY_CHOICES` from
  `ROUTING_MODE_OPTIONS` plus `unset` and `custom`; there is no scoring selector, weights editor, pin checkbox or
  latency card. `createDefaultRuntimeConfig` writes `routingStrategy: null` (`:118`), `toRoutingStrategyDraft`
  (`:133-152`) maps any non-mode string to the free-text `custom` choice, `resolveRoutingStrategyChoice` (`:154-165`)
  persists it verbatim, and the draft alias preview uses `formatDraftRoutingAlias` (`:243`). The page copy
  ("Choose how the runtime picks models for each request", `:277-280`) describes modes only.
- `routing-mode.ts` holds a third copy of the vocabulary: `ROUTING_MODE_OPTIONS` (`:14-48`, four modes, labels
  "Strategy A/B/C"), `normalizeRoutingModeValue` (`:50-76`, again collapsing
  `latency|quality|cost|balanced|...` to `baseline`), `formatRoutingModeLabel` (`:78-84`) and `formatDraftRoutingAlias`
  (`:98-110`).
- The Router Overview derives the active alias from the **raw** config string: `router.tsx:118`
  (`configuredStrategy = config?.routingStrategy ?? null`) and `:121-124`
  (`${configuredStrategy ?? "default"}.${configuredExecutionMode}`), then looks that id up in
  `configuredAliasRows` and falls back to the literal `"unresolved"` (`:125-132`). A legacy spelling (`basic`,
  `low-cost`) or a custom string cannot match a canonical alias row.
- The Decisions surfaces label the row with the mode: `router-decisions.tsx:114-120` renders
  `formatRoutingModeLabel(decision.strategyLabel)` under the label "Strategy", and `router-decision-detail.tsx:118`
  does the same. The value they render is built in the bridge as
  `asStringValue(routingMode?.effectiveMode) ?? currentUnifiedRuntimeConfig?.routingStrategy ?? null`
  (`index.ts:25442-25445` and `index.ts:25556-25559`): the *effective mode* when one was recorded, otherwise the raw
  config string. It is never the effective scoring strategy, so an operator with a `quality` posture sees
  "Strategy A - Baseline" on a baseline runtime.
- No Agent strategy or Workloads route exists (the `runtime-ui/app/routes` listing contains neither), and
  `control/routing-strategy` itself was created by run 30 (`30-.../03-implementation-summary.md`, "Changes Applied").

### (e) Landed Effect wrapper, its consumers, and the packaged-SEA constraint (`T1.2e`)

- `role-model-router/packages/effect/package.json`: workspace package named `effect`, version `4.0.0-rc.117`,
  `private: true`, `"files": ["src", "dist"]`, exports `./package.json`, `.` and `./*` into `dist/` (types under
  `dist/types/`). `build.mjs` bundles `vendor/effect/packages/effect/src` with esbuild (`bundle: true`,
  `splitting: true`, `format: "esm"`, `target: "node24"`), discovers published subpaths by scanning the vendored
  Effect, `effect-mq` and `sql/sqlite-node` sources for `effect/...` specifiers, emits declarations with
  `--noCheck --emitDeclarationOnly`, rewrites `.ts` specifiers to `.js`, and fails when a declaration is missing. Its
  header states the intent: "keeps the shipped entry points plain ESM, keeps exactly one Effect runtime instance in
  the graph, and leaves the vendored bytes untouched".
- Consumers: `runtime-host-bridge/package.json:38-40` depends on `@effect/sql-sqlite-node`, `effect` and `effect-mq`
  as `workspace:*`. Seven bridge source files import `effect` by bare specifier:
  `src/queue-runtime/{evaluation,index,learner,store,queues,workers}.ts` and `src/track-b-auto-replay-runtime.ts`.
  `queue-runtime/index.ts:10` is `import { type Duration, Effect, Fiber, Layer, ManagedRuntime } from "effect";` and
  `:156`, `:276`, `:389` build one `ManagedRuntime.make(layer)` per plane - the composition-root pattern §7.4
  prescribes. No routing module imports `effect`.
- Packaged-SEA constraint: `00-worktree.md` records that a bare
  `corepack pnpm --filter @role-model-router/runtime-host-bridge build` fails on a clean checkout with
  `src/track-b-auto-replay-runtime.ts(1,34): error TS2307: Cannot find module 'effect'`, because the wrapper publishes
  `dist/` entry points and `build.mjs` must run first; the dependency-closure build is the required setup step. The SEA
  gate is root `package.json:30-31` (`runtime:package-sea`, `runtime:validate-packaging`), and run 101 R1 already
  proved the bundled SEA runs from its release directory with no `node_modules` beside it.

## Gaps vs requirements

- `R1` - No split exists. The config carries one `routing.strategy` string, decoded into a mode by two independent
  hand-written switches (`unified-runtime-config.ts:1464-1492`, `index.ts:5597-5623`), with no schema, no
  `scoring_strategy`, no `pin_weights`, no `weights`, and no write-time normalization, so any string (including
  `basic` or `latency-first`) can be persisted verbatim.
- `R2` - Nothing ranks by the saved strategy. `RoutingRequest.strategy` is `difficultyRouting.strategy`
  (`index.ts:10411`, `:10636`), which is `"balanced"` outside difficulty/hybrid (`:2089`) and
  `cost | quality | balanced` inside it (`:1966-1977`); the controller may replace it (`:2332`, `:2350`). `latency` is
  reachable only if a controller emits it (`:1152-1160`), which config cannot request. There is no precedence ladder
  and no pin semantics, and `medium` cannot inherit the saved strategy.
- `R3` - No `strategy_source`, no weights digest and no discarded-directive receipt exists in the decision or the
  observation. The readback surfaces label a *mode* as the strategy and fall back to the raw config string
  (`index.ts:25442-25445`, `:25556-25559`, `router-decisions.tsx:114-120`), and the Overview derives the alias id from
  the raw string (`router.tsx:118-132`), so legacy or custom spellings render as `unresolved`.
- `R4` - `latency` is absent from `supportedStrategies` (`controller-routing-contract.ts:52`), from the prompt's
  allowed values (`:285`) and from its rubric (`:307`, `:323`). The pin interaction does not exist, so there is no
  "ignore and record" path for a controller directive.
- `R5` - There is no `agent_strategies` block, no role binding on an alias
  (`UnifiedRuntimeModelAliasConfig`, `unified-runtime-config.ts:70-78`), no per-posture alias materialisation and no
  name collision check. The honesty mechanism itself already exists for the canonical pool - `aliasResolution.poolEmptyReason`
  is typed at `runtime-observability/src/index.ts:19` and set to `"ALIAS_POOL_EMPTY"` at `index.ts:8861-8869`, and the
  write path rejects an empty pool (`test/backend-unified-runtime-config.test.ts:264`, `:299`) - so R5 extends an
  existing behaviour rather than inventing one. Declared request intent exists (`role_model.intent`, `requestedRoleId`)
  but is never compared against an alias preset.
- `R6` - The same absence for `workloads`: no block, no `required_capabilities` pin on an alias, no `batch` or
  `embedding` examples, and no unknown-capability warning path.
- `R7` - The valve is implemented but on the wrong metric and numbers: it compares raw `p95LatencyMs`
  (`routing-latency-selection.ts:12`, `:84-90`) rather than effective latency, `maxDeltaMs` defaults to `2000` instead
  of `10000`, and `minSamples` is bounded `3..1000` instead of `5..30` (`routing-latency-policy.ts:42`, `:55`). The
  paired private registry (`role-model-internal/shared/route-learning/activation-policy.mjs:114-115`) carries the same
  old default and bounds, so both sides need the change. The UI exposes the setting only through the generic Learning
  policy editor, and the decision detail does not show the receipt.
- `R8` - The routing page is mode-only (`control-routing-strategy.tsx:66-103`); the scoring selector, weights editor,
  pin checkbox, resolved-posture line and latency card do not exist. The Agent strategy and Workloads pages do not
  exist. Legacy synonyms remain persistable through the `custom` free-text path (`:133-165`, `:243-265`).
- `R9` - The wrapper and the composition-root pattern exist and are proven for the queue path, but no routing module
  imports `effect`, and the config path is still a module-level mutable binding read at `index.ts:28126`, `:21088`,
  `:25094` (`currentUnifiedRuntimeConfig` plus its mutation lock). Nothing in R9 is satisfied for the surfaces this run
  changes.
- `R10` - The vocabulary is triplicated (`unified-runtime-config.ts:1464-1492`, `index.ts:5597-5623`,
  `runtime-ui/app/lib/routing-mode.ts:50-76`) and the core's four-value table is a fourth place
  (`packages/core/src/router.ts:374-390`, `:183-219`). There is no single owner, no exhaustive matcher, no config
  version migration and no reserved per-alias `scoring_strategy` field.
- `R11` - None of the 18 P0 cases in §10.1 is asserted today. The existing latency tests
  (`runtime-host-bridge/test/run98-a40-latency-policy.test.ts`) encode the current defaults, so they must change with
  the requirement rather than merely be extended.
- `R12` - No live pi-CLI verification exists for any of this. The Phase 5 channel (`:3458`, dev state root) and the
  `pi install ./packages/pi-role-model` step are unexercised for this change, and the SEA re-verification is a gate,
  not a proof, at this point.

## Prior recursive evidence

- `01-protocol-routing-obs` - `role-model-m1-m3-baseline-requirements.md` §5.6 fixes the canonical protocol strategy
  set to `balanced | cost | latency | quality` and states "No alternate names are allowed in the canonical protocol";
  §7.8 fixes the exact weights, which `packages/core/src/router.ts:183-219` implements value-for-value (`balanced`
  0.30/0.20/0.10/0.20/0.15/0.05, `quality` 0.50/0.10/0.05/0.10/0.20/0.05, `latency` 0.15/0.45/0.15/0.05/0.15/0.05,
  `cost` 0.15/0.10/0.05/0.50/0.15/0.05). Binding: the preset tables must be re-used from that export rather than
  re-declared, and the legacy names (`low-cost`, `high-quality`, `latency-first`, `basic`) can only ever be decode-side
  spellings.
- `22-router-runtime-routing-strategy-lock` - created `docs/architecture/07-router-runtime-routing-strategy-lock.md`,
  which freezes the routing-mode vocabulary to `baseline | difficulty | intelligent | hybrid` (aliases `basic` and
  `controller` accepted) and states the modes are "additive to exact-model requests". Binding: `intelligent` is a
  *mode* name, the alias family stays `controller`, and this run may not introduce a new alias family.
- Runs `23`-`26` - observed feedback, recency and throughput bias, the alias pool (`modelAliases` with `mode`,
  `maxDifficulty`, `modelIds`) and difficulty-guided routing with `maxDifficulty` gating. Binding: eligibility and the
  difficulty bucket keep their current meaning; this run may not re-open them.
- Runs `27`-`28` - difficulty learning cache and request-time controller guidance with validated directives.
  Binding: the controller contract (`requestedRoleId`, `taskType`, required and preferred capabilities, `strategy`,
  `preferLocal`, `preferredEndpointIds`) is fixed and only gains `latency` plus the pin interaction.
- Run `29` - request rewriter and hybrid mode, including the per-request `x-role-model-routing-mode` override.
  Binding: the per-request override stays mode-only (OOS2).
- `30-router-runtime-strategy-convergence-e2e` - integrated the strategy surface and created the operator page
  `control/routing-strategy` plus its route and design-system entries. Binding: R8 changes that page in place rather
  than adding a competing one.
- `101-effect-mq-queue-rebuild` - its artifacts live at
  `D:\DEV\role-model-internal\.worktrees\101-effect-mq-queue-rebuild\.recursive\run\101-effect-mq-queue-rebuild\` and
  are not in this worktree's run folder. R1, "Vendored Effect and effect-mq are consumable by both bundle pipelines",
  requires one resolvable specifier per vendored upstream for both the public SEA bundle and the private distribution
  bundles, "Exactly one Effect instance per bundle", and a packaged executable that runs from its release directory
  with no `node_modules`. Its constraints record the accepted `effect@4.0.0-rc.111`/`rc.117` unalignment and the rule
  that both bundles resolve Effect from `vendor/effect` only. Binding: §7 is a *verification* obligation for this run
  (re-prove the SEA still carries Effect), and routing modules must import the bare specifier.
- `98-shadow-to-active-routing-graduation` (via the code and the learning policy file) - owns the measured-latency
  valve: `routing-latency-policy.ts`, `routing-latency-selection.ts`, the bucket reader, and the `latencySelection`
  block of `shared/route-learning-activation-policy.json`. Binding: R7 amends that mechanism and must not build a
  second one.
- Memory `runtime-routing-and-provider-capabilities.md` (Status `CURRENT`) records that "the runtime owns a canonical
  strategy x execution-mode routing matrix" and that the legacy `craft-ask` strategy and alias ids "should not
  reappear in config materialization, `/v1/models`, or operator documentation". Binding: extend the 5x4 matrix with
  posture aliases rather than replace it, and `craft-ask` read-compat must not write the name back.

## Commands run

| Command | One-line result |
| --- | --- |
| `Get-ChildItem E:\tmp\collab\briefs` plus an `analyst` search under `E:\tmp` | No `analyst_t1` brief row or file; the task was recovered from the parent rollout record instead |
| `Select-String 'analyst_t1' <parent rollout 01a0eef8...>` | Found the `spawn_agent` record carrying the verbatim brief (ordinal 2607) |
| Read `00-requirements.md`, `00-worktree.md`, `inputs/16-agent-strategy-and-scoring-strategy.md` | Requirements and the 694-line design document read in full (one 199-token middle chunk re-read directly) |
| `git rev-parse HEAD`, `branch --show-current`, `status --porcelain` in the worktree | `c41111d8`, `recursive/103-agent-strategy-and-scoring-strategy`, only `?? .recursive/run/103.../inputs/` untracked |
| `rg -n "routingStrategy" index.ts` | 12 hits: persist, alias matrix, two read-backs, two `strategyLabel`s, four default-mode call sites; never a scoring strategy |
| `rg -n "normalizeRoutingStrategyForAlias\|deriveUnifiedRuntimeRoutingAliasMode\|deriveUnifiedRuntimeRoutingAliasId" unified-runtime-config.ts` | `:1464`, `:1502`, `:1521`, used at `:1555-1556`, `:1690`, `:1839-1842` |
| `rg -n "STRATEGY_WEIGHTS\|toPolicyStrategy\|getRedistributedWeights" packages/core/src/router.ts` | `:183-219`, `:374-390`, `:1193-1200`, call site `:1712` |
| `rg -n "supportedStrategies" controller-routing-contract.ts` | `:52` (three values), `:95`, prompt allowed values `:285` with rubric text `:307`, `:323` |
| `rg -n "latencySelection\|readEndpointLatencyBuckets" index.ts` | gate and read `:25734-25766`, substitution `:25937-25975`, receipt `:27718` |
| Read `routing-latency-policy.ts` | Defaults and bounds `:40-58`; env narrowing `:138-160` |
| `rg -n "p95\|maxDeltaMs\|minSamples" routing-latency-selection.ts` | Metric and gate at `:12`, `:84-90`, `:144-158` |
| `rg -n "RuntimeEndpointLatencyBucket\|readEndpointLatencyBuckets" sqlite-memory/src/index.ts` | `:5458-5464` (p50 and p95 both present), reader `:5466-5550` |
| `rg -n "strategyLabel" runtime-ui/app` | `runtime-api.ts:1407`, `:1442`; `router-decisions.tsx:114-120`; `router-decision-detail.tsx:118` |
| Read `routing-mode.ts`, `control-routing-strategy.tsx`, `router.tsx` | Mode-only page; the Overview derives its alias id from the raw config string with an `unresolved` fallback |
| `rg -n "latencySelection" runtime-ui/app` | Only generic Learning policy-editor fields; no routing-page card, no decision-detail receipt |
| Read `packages/effect/package.json` and `packages/effect/build.mjs` | Workspace package `effect@4.0.0-rc.117`; esbuild bundle with code splitting for one runtime instance |
| `rg -l 'from "effect"' runtime-host-bridge/src` | 7 files: `queue-runtime/*` plus `track-b-auto-replay-runtime.ts`; no routing module |
| `rg -n "agent_strategies\|agentStrategies\|workloads" runtime-host-bridge` | No matches (one unrelated vendored Effect text hit) |
| Read `01-.../role-model-m1-m3-baseline-requirements.md` sections 5.6 and 7.8 | Canonical four-value strategy set and the exact weight table |
| Read `22-.../03-implementation-summary.md` and `30-.../03-implementation-summary.md` | Mode vocabulary lock; run 30 created the routing-strategy page |
| Read `101-.../00-requirements.md` in the private worktree | Run-101 R1 bundling acceptance and constraints (single Effect instance, release-directory execution) |
| Read `memory/domains/runtime-routing-and-provider-capabilities.md` | Canonical strategy x execution-mode matrix; legacy `craft-ask` must not reappear |
| `rg -n "latencySelection" D:\DEV\role-model-internal\shared\route-learning\activation-policy.mjs` | Private registry pairs with the current public defaults (`minSamples` `3..1000`, `maxDeltaMs` `2000`) |

No file was created or modified other than this artifact. No build, test suite, package command or runtime was started,
and nothing was committed.

## Anchor drift (the design document versus live code)

The design document's `index.ts` anchors match exactly for the early region - `toDifficultyStrategy` l.1966,
`maybeApplyDifficultyRouting` l.2065, `maybeApplyControllerRouting` l.2232, `supportedStrategies` l.52 - but are stale
further down: `normalizeConfiguredRoutingMode` 5345 -> 5597, `resolveEffectiveRoutingMode` 9497 -> 9765,
`materializeCanonicalRoutingAliasMatrix` 20527 -> 21075, `selectedStrategy` 26541 -> 27158, `strategyLabel`
24896 -> 25442 and 25556, `routingDiagnostics.latencySelection` 27082 -> 27718. In `unified-runtime-config.ts`,
1464, 1502 and 1521 are exact and the renderer moved 1836 -> 1833. Every anchor recorded in this artifact is the live
one read at the Phase 0 diff basis.

## Open questions (for Phase 2 to resolve explicitly; none invalidates the AS-IS)

1. `craft-ask` - §3 lists it as read-compatible, while the memory durable truth says it must not reappear, and today
   the code drops it (`unified-runtime-config.ts:1494-1500`) and rewrites `craft-ask.<scope>` to `default.<scope>`
   (`:1567-1574`). The consistent reading is "decode, never write", but Phase 2 should state it.
2. Latency-policy config home - §4 shows a `latency_selection` block in the runtime config, while the implementation
   reads the same values from `shared/route-learning-activation-policy.json` via
   `learning-policy-file.ts:783-830`. Which file is the write path for the R7 defaults is unresolved by the document.
3. Env variable names - §7.3 documents `ROLE_MODEL_LATENCY_SELECTION_*`; the implementation reads
   `ROLE_MODEL_ROUTING_LATENCY_SELECTION_*` (`routing-latency-policy.ts:138`, `:150`). Phase 2 should decide whether
   the Effect `Config`/`ConfigProvider` work renames the variables (a breaking change for operators) or keeps them.
4. `policy_snapshot.strategy` for `custom` - §7.3 says a custom profile records the base preset (`balanced`) in
   `policy_snapshot.strategy` and carries weights plus digest in `routingDiagnostics`.
   `protocol/schemas/routing-policy.schema.json:23-25` confirms the closed four-value enum, so the runtime diagnostics
   surface, not the protocol, must carry the weights.
5. Where the effective weights digest is stored - R3 requires a digest whenever the weights are not a preset, and no
   destination field exists today in the observation, the decision record or the operator API. Phase 2 must name the
   field and its schema before Phase 3 writes it.
6. Artifact naming - `00-requirements.md` names this file `subagents/analyst-t1.md`; the brief named
   `subagents/analyst_t1.md` and only that file was written.

## Verdict

`ready for Phase 2`.

The design document is indexed section by section, the inert-strategy claim is confirmed end to end from the config
read down to `policy_id`, and every surface this run touches has a live `file:line` anchor recorded against the Phase 0
diff basis. The gaps are unambiguous and consistent with `R1`-`R12`.

Blockers Phase 2 must close (none of which invalidates this AS-IS):

1. the vocabulary duplication in four places that `R10` requires to be collapsed to one owner;
2. the `medium` difficulty hard-code to `balanced` (`index.ts:1974-1975`), which contradicts "`medium` uses the saved
   scoring strategy";
3. the missing weights-digest and `strategy_source` destinations (R3), because they are new contract fields that must
   exist before Phase 3 writes any of them;
4. the latency-policy config home and env-variable naming (Open questions 2-3), which determine whether R7 is a
   default-only change or a migration;
5. the artifact-name mismatch (Open question 6), for the controller to reconcile when it records the delegation row.
