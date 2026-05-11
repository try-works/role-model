Run: `/.recursive/run/26-router-runtime-difficulty-guided-routing/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-11T13:49:11Z`
LockHash: `57c7a1d56f6b90997c77425cb12d73776c79c78d8efb47cde917333ae53f5d23`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
Scope note: This run delivers the first content-aware alias-routing mode by adding a codified difficulty rubric, classifier-based difficulty assignment, strategy-weight switching, and `maxDifficulty` eligibility gates.

## TODO

- [x] Define numbered requirements and acceptance criteria for difficulty-guided routing
- [x] Record the explicit difficulty-rubric obligations requested by the user
- [x] Record local-plus-remote support, observability, and verification obligations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Codify the easy/medium/hard difficulty rubric in runtime-owned artifacts and code contracts

Description:
Difficulty routing must rely on explicit, reviewable criteria rather than a freeform label emitted by a model.

Acceptance criteria:
- the runtime gains a durable difficulty-rubric contract that defines `easy`, `medium`, and `hard`
- the rubric includes at least:
  - input length or context size
  - instruction and constraint density
  - reasoning or decomposition complexity
  - expected tool-call count
  - code-edit, schema-conformance, or multi-step task burden
  - conversation-history dependency
- classifier, diagnostics, and later evaluation/judging surfaces can reference the same rubric family rather than inventing separate difficulty meanings
- the rubric is precise enough that example requests can be classified consistently in tests

### `R2` Add classifier-driven difficulty assignment for alias mode `difficulty`

Description:
The runtime must support a lightweight classifier that reads the request and assigns a difficulty score or bucket before route scoring.

Acceptance criteria:
- alias mode `difficulty` becomes available in the runtime config contract
- the classifier can be configured against either a local or remote endpoint rather than being hardcoded to one execution class
- the classifier consumes the request features needed by the locked rubric, including relevant messages, tools, and bounded history
- invalid, missing, or timed-out classification results fall back deterministically to a safe default difficulty

### `R3` Map difficulty to routing strategy weights in the live runtime

Description:
Difficulty-guided routing must change route scoring behavior in a measurable way.

Acceptance criteria:
- `easy`, `medium`, and `hard` map to distinct strategy weights or canonical strategy profiles as locked in the proposal handoff
- the mapped strategy influences candidate scoring in the live runtime rather than only appearing in diagnostics
- the same difficulty-to-strategy behavior works for alias pools containing both local and remote endpoints
- routing diagnostics can show the assigned difficulty and the resulting strategy profile used for the decision

### `R4` Add `maxDifficulty` eligibility gating for both local and remote endpoints/models

Description:
Difficulty routing must include a first-line safety boundary that prevents underpowered endpoints from receiving requests above their configured difficulty limit.

Acceptance criteria:
- the runtime supports `maxDifficulty` or the locked equivalent for both local and remote endpoint/model sources
- a `hard` request excludes endpoints configured only for `medium` or `easy`, and a `medium` request excludes endpoints configured only for `easy`
- omitted `maxDifficulty` defaults to the broadest allowed value as locked by the strategy handoff
- eligibility gating is enforced uniformly across local and remote endpoint classes

### `R5` Persist and expose difficulty assignment and rubric signals in runtime observations

Description:
Later cache, segmented-profile, and judge/evaluation runs need difficulty labels and the supporting signals to be observable and reusable.

Acceptance criteria:
- each request observation can record the assigned difficulty or difficulty score
- the observation model can capture the relevant rubric signals or a normalized summary of them
- request or route inspection surfaces make it possible to verify how the runtime classified a request
- the persisted difficulty record works for both chat-completions and responses style requests

### `R6` Use TDD and end-to-end verification for difficulty-guided routing

Description:
Difficulty-guided routing must be proven with failing tests first and live runtime behavior across local and remote pools.

Acceptance criteria:
- production changes are introduced through failing tests before green implementation
- validation includes focused coverage for the difficulty rubric, classifier behavior, fallback defaults, strategy mapping, and `maxDifficulty` eligibility
- end-to-end verification proves that representative easy/medium/hard requests route differently across local-plus-remote pools in the live runtime
- end-to-end verification includes requests with and without tools so tool-load is part of the proof surface

## Out of Scope

- `OOS1`: conversation-level difficulty caching
- `OOS2`: segmented per-difficulty observed profiles and observed-data overrides of `maxDifficulty`
- `OOS3`: controller-guided full protocol inference or request rewriting

## Constraints

- this run builds on alias routing from run `25` and must preserve exact-model backward compatibility
- difficulty routing must work across both local and remote endpoints without limitation
- classifier behavior must be grounded in the explicit rubric from run `22`
- the first difficulty slice must not require a later controller run in order to function

## Assumptions

- the runtime can call a classifier endpoint through the existing execution infrastructure or a compatible additive path
- later runs can extend this run with cache and segmented observed profiles without replacing the rubric or alias mode contract

## Sequence Integration

- Roadmap slot: `routing strategy phase 2a - difficulty-guided routing core`
- Previous repo dependency: `25-router-runtime-model-alias-pool`
- Next repo dependency: `27-router-runtime-difficulty-learning-cache`
- Required handoff: working difficulty-guided alias routing with explicit rubric, classifier, strategy mapping, and local-plus-remote `maxDifficulty` gating

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- `role-model-router/packages/core/src/`
- `role-model-router/packages/protocol-routing/src/`
- `role-model-router/packages/runtime-observability/src/`
- `role-model-router/packages/sqlite-memory/src/`
- runtime config parsing/rendering surfaces

## Validation Expectations

- focused tests are required for the difficulty rubric, classifier contracts, gating, and routing integration
- bridge-level validation must show classifier execution, timeout/invalid fallback behavior, and diagnostics
- end-to-end validation must cover easy/medium/hard routing outcomes across both local and remote pools
- validation receipts must show the rubric features or summaries used during representative classifications

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] The explicit difficulty-rubric obligation is captured and verifiable
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements clearly separate rubric, classifier, strategy mapping, and eligibility responsibilities
- [x] No unresolved ambiguity remains about local-plus-remote support or the role of the explicit difficulty rubric

Approval: PASS
