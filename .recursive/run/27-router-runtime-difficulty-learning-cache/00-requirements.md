Run: `/.recursive/run/27-router-runtime-difficulty-learning-cache/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
Scope note: This run makes difficulty-guided routing stateful and self-tuning by adding conversation caching, segmented per-difficulty observed profiles, observed overrides, and advisory recommendations.

## TODO

- [x] Define numbered requirements and acceptance criteria for difficulty cache and learning behavior
- [x] Record the requirement that later evaluation/judging reuses the same difficulty rubric and recorded signals
- [x] Record local-plus-remote parity, persistence, and verification obligations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Add conversation-level difficulty caching with explicit invalidation behavior

Description:
Difficulty classification should not repeat unnecessarily on every turn when the conversation remains within the same difficulty band.

Acceptance criteria:
- the runtime can cache the difficulty result per conversation or equivalent conversation key
- the cache covers both chat-completions and responses style request paths where the runtime can identify conversation continuity
- cache expiry and invalidation behavior are explicit and deterministic
- the runtime can reclassify when the conversation materially changes or when the cache expires

### `R2` Persist segmented observed profiles per difficulty bucket

Description:
The runtime must keep separate observed-performance histories for easy, medium, and hard requests so adaptive routing can learn per-difficulty behavior.

Acceptance criteria:
- runtime-owned persistence can store or derive separate easy/medium/hard profile histories for an endpoint
- after execution, the request outcome is tagged with the assigned difficulty and aggregated into the correct bucket
- segmented profiles work for both local and remote endpoints
- inspection surfaces can retrieve recent samples or profile summaries by difficulty bucket

### `R3` Let observed per-difficulty performance override configured `maxDifficulty`

Description:
Configured `maxDifficulty` is the initial boundary, but repeated poor observed behavior must be able to override it for routing safety.

Acceptance criteria:
- the runtime can exclude or down-rank an endpoint for a difficulty bucket when the observed segmented profile indicates sustained underperformance according to explicit criteria
- the override behavior applies to both local and remote endpoints
- the runtime records enough diagnostics to explain when observed data overrode configured `maxDifficulty`
- configuration-first gating remains the initial safety layer until sufficient observed data exists

### `R4` Generate advisory `maxDifficulty` recommendations from observed data

Description:
The runtime should be able to suggest a more accurate `maxDifficulty` to the operator without silently rewriting user configuration.

Acceptance criteria:
- the runtime can derive an advisory difficulty recommendation from segmented observed profiles
- recommendations are explicitly marked advisory and do not mutate config automatically
- recommendations can be read back through runtime APIs or operator-facing diagnostics
- the recommendation model works for both local and remote endpoints

### `R5` Reuse the explicit difficulty rubric in judge/evaluation and observation semantics

Description:
The easy/medium/hard definitions must remain consistent across classification, observation, and later controller/judge evaluation surfaces.

Acceptance criteria:
- the runtime records the difficulty label together with enough rubric-related evidence or summaries to support later evaluation
- any judge, evaluator, or controller-facing difficulty interpretation added in this run references the same rubric family introduced in run `26`
- the runtime does not introduce a separate hidden notion of difficulty for observed-data override logic
- inspection or diagnostics can show why a request was considered easy, medium, or hard in terms that remain consistent with the stored rubric

### `R6` Use TDD and end-to-end verification for stateful difficulty learning

Description:
The cache and learning layer must be validated through failing tests first and live runtime behavior over multiple requests or turns.

Acceptance criteria:
- production changes are introduced through failing tests before green implementation
- validation includes focused coverage for cache reuse, cache invalidation, segmented aggregation, observed override, and recommendation generation
- end-to-end verification proves multi-turn or repeated-request behavior in the live runtime, including both local and remote endpoint participation
- end-to-end verification demonstrates that observed data can change future difficulty-based routing outcomes over time

## Out of Scope

- `OOS1`: controller-guided full protocol routing
- `OOS2`: model-family request rewriting or hybrid-mode fallback
- `OOS3`: full operator UI completion beyond minimal diagnostic surfaces needed to inspect recommendations if those are required here

## Constraints

- this run builds on the explicit difficulty rubric and classifier contract from run `26`
- all learning behavior must work across both local and remote endpoints without limitation
- observed overrides must remain explainable and auditable rather than silently mutating config
- cache behavior must remain deterministic enough for repeatable testing and inspection

## Assumptions

- the runtime can identify conversation continuity or equivalent cache keys for the supported downstream request surfaces
- later convergence work can add richer UI affordances on top of the persistence and diagnostics added here without changing the learning semantics

## Sequence Integration

- Roadmap slot: `routing strategy phase 2b - difficulty cache and learning`
- Previous repo dependency: `26-router-runtime-difficulty-guided-routing`
- Next repo dependency: `28-router-runtime-controller-guided-routing`
- Required handoff: stateful difficulty routing with cache, segmented observed profiles, observed overrides, and advisory recommendations across local and remote endpoints

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- `role-model-router/packages/runtime-observability/src/`
- `role-model-router/packages/sqlite-memory/src/`
- `role-model-router/packages/profile-aggregator/src/`
- `role-model-router/packages/protocol-routing/src/`
- runtime inspection and diagnostic API surfaces

## Validation Expectations

- focused tests are required for cache semantics, segmented persistence, override thresholds, and recommendation generation
- bridge-level validation must show cached classification reuse and reclassification behavior
- end-to-end validation must exercise repeated requests or multi-turn conversations across local and remote pools
- validation receipts must show segmented observations and at least one observed-data-driven routing change over time

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] Cache, segmented-profile, override, and recommendation behaviors are explicit and verifiable
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements clearly separate cache, learning, and advisory behaviors from controller or rewriter work
- [x] No unresolved ambiguity remains about local-plus-remote support or rubric reuse in evaluation logic

Approval: PASS
