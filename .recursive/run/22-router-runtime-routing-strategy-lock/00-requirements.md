Run: `/.recursive/run/22-router-runtime-routing-strategy-lock/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-11T10:32:37Z`
LockHash: `f4788353d203470f703b46dba5a28f732ee8b8e49a5648cef566506006ee3d90`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\strategy\routing-strategy-proposals.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
Scope note: This document imports the external routing strategy proposal into the repo-local recursive run system and freezes the rollout contract for runs `23` through `30` before implementation begins.

## TODO

- [x] Consolidate the external strategy proposal into a repo-local recursive requirement contract
- [x] Define stable requirement identifiers and acceptance criteria for the strategy-lock run
- [x] Freeze the rollout sequence, run boundaries, and verification obligations for runs `23` through `30`
- [x] Define the first authoritative easy/medium/hard difficulty rubric for later classifier, controller, judge, and observed-data work
- [x] Record scope boundaries, constraints, assumptions, and targeted documentation/config surfaces
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Import the routing strategy proposal into repo-owned control-plane documentation

Description:
Run `22-router-runtime-routing-strategy-lock` must turn the external strategy proposal into repo-owned, durable requirements and architecture guidance so later recursive runs can consume repository files instead of conversational context.

Acceptance criteria:
- the repo gains one authoritative repo-local strategy handoff artifact that captures the proposal's goals, strategy modes, phased rollout order, and integration expectations
- the repo-local handoff explicitly maps proposal sections to the planned recursive runs `23` through `30`
- the repo-local handoff identifies the current codebase gaps that motivate the implementation sequence, including exact-model routing, fixture-driven observed profiles, missing alias pools, missing difficulty routing, and missing controller-guided request inference
- the handoff is specific enough that later run prompts can reference repo paths instead of repeating the proposal in chat

### `R2` Freeze the implementation program for runs `23` through `30`

Description:
The strategy lock must assign one clear responsibility boundary to each planned run so implementation work is staged, auditable, and non-overlapping.

Acceptance criteria:
- the rollout sequence is frozen as:
  - run `23`: live observed-data feedback loop
  - run `24`: recency bias and throughput SLA
  - run `25`: alias-based model-pool routing
  - run `26`: difficulty-guided routing core
  - run `27`: difficulty learning, cache, and segmented observed profiles
  - run `28`: controller-guided protocol routing
  - run `29`: request rewriter, hybrid mode, and request override
  - run `30`: full convergence, UI completion, proposal verification, and iterative end-to-end hardening
- each planned run has an explicitly stated predecessor and successor relationship
- no two runs own the same primary implementation slice
- the sequence makes observed-data correctness land before cross-model alias routing, and alias routing land before difficulty or controller routing

### `R3` Freeze the runtime configuration contract that later runs must implement

Description:
The strategy lock must define the intended runtime-owned config surfaces for alias routing, observed-data behavior, difficulty classification, controller routing, and hybrid fallback so implementation runs do not improvise incompatible config shapes.

Acceptance criteria:
- the locked contract identifies repo-owned configuration blocks for:
  - `modelAliases`
  - `observedData`
  - `difficultyClassifier`
  - `controller`
  - alias `mode`
  - request override behavior
- the contract defines the intended mode vocabulary: `basic`, `difficulty`, `intelligent`, and `hybrid`
- the contract explicitly states that every strategy mode in scope must support both local and remote endpoints/models rather than one-sided local-only or remote-only behavior
- the contract defines which settings are per-alias and which are global
- the contract identifies which configuration surfaces are required before UI implementation and which may be deferred to the convergence run

### `R4` Define an explicit easy/medium/hard difficulty rubric for classifier, controller, judge, and observability use

Description:
Difficulty routing must not rely on opaque labels alone. The strategy lock must define a durable rubric that later runs can use for prompting, evaluation, observability, and threshold tuning.

Acceptance criteria:
- the strategy lock defines `easy`, `medium`, and `hard` in terms of observable request characteristics rather than vague intuition
- the rubric includes at least the following evaluation dimensions:
  - request/input length and context size
  - instruction density and constraint count
  - reasoning depth or decomposition complexity
  - expected tool-call count or tool dependency
  - code-edit, schema-conformance, or multi-step execution burden
  - conversation-history dependency level
- the lock specifies that both the difficulty classifier and any later controller/judge or evaluation logic must reference the same rubric family so labels remain comparable across the system
- the lock identifies which request signals must be captured in diagnostics or observations when difficulty is assigned

### `R5` Freeze the compatibility and capability-advertisement policy for masquerade aliases

Description:
The strategy introduces a masquerade alias such as `gpt-5.4`. The lock must define how the runtime handles capability expectations and what guardrails later runs must preserve.

Acceptance criteria:
- the locked policy states that alias pools should be curated for broadly compatible capabilities and must not silently promise impossible runtime behavior
- the locked policy states that capability gating remains enforced by runtime eligibility checks for modalities, tools, context window, and structured-output support
- the locked policy records whether the first shipping slice is text/tools-focused or claims broader GPT-class compatibility, and what that means for pool curation
- the locked policy explicitly states that the runtime response must continue to report the real chosen model rather than the alias

### `R6` Freeze the verification discipline for every downstream implementation run

Description:
Every implementation run in this strategy program must use TDD and end-to-end verification rather than relying only on unit tests or fixture-only proofs.

Acceptance criteria:
- the strategy lock explicitly states that every downstream implementation run must declare `TDD Mode` and use failing-test-first discipline for production code changes
- the strategy lock explicitly states that every downstream implementation run must include end-to-end verification in addition to unit or package-level validation
- the verification contract requires local-plus-remote runtime coverage whenever the behavior under test spans routing or execution selection
- the verification contract forbids counting one-sided local-only or remote-only validation as sufficient when the shipped feature is intended to work across both classes of endpoint

## Out of Scope

- `OOS1`: implementing alias routing, observed-data feedback, classifier logic, controller routing, or UI behavior in this run
- `OOS2`: introducing a second competing strategy document outside the repo-local recursive artifacts
- `OOS3`: resolving every open question in the proposal when a choice can remain explicitly deferred to a later run without blocking the rollout sequence

## Constraints

- This run must treat `C:\Users\erikb\OneDrive\##### DEV\role-model\strategy\routing-strategy-proposals.md` as the external source proposal, but the durable contract must live in repo-owned artifacts
- The run must stay aligned with the current runtime topology described in `/.recursive/STATE.md`
- The run must preserve recursive-mode phase discipline and produce requirements specific enough for downstream AS-IS and planning work
- The locked plan must preserve support for routing across both local and remote models/endpoints without limitation in the final delivered strategy

## Assumptions

- The current runtime already has enough routing, registry, observability, and host infrastructure to implement the proposal incrementally rather than requiring a fresh architecture reset
- Later runs can add repo-local configuration, persistence, and UI surfaces without invalidating the current runtime ownership boundaries
- The strategy proposal's phased rollout order remains the intended implementation order unless a later locked addendum explicitly changes it

## Sequence Integration

- Roadmap slot: `post-run21 routing strategy rollout program`
- Previous repo dependency: `21-semantic-color-system` / current `main` baseline
- Next repo dependency: `23-router-runtime-live-observed-feedback`
- Required handoff: repo-local strategy lock covering rollout order, config contract, difficulty rubric, compatibility policy, and verification obligations

## Targeted Package And File Inventory

- Control-plane docs under `/.recursive/run/22-router-runtime-routing-strategy-lock/`
- Repo-native architecture or strategy docs under `/docs/architecture/` or equivalent repo-owned handoff location selected in later phases
- Future implementation surfaces referenced by this lock:
  - `role-model-router/apps/runtime-host-bridge/src/`
  - `role-model-router/packages/core/src/`
  - `role-model-router/packages/protocol-routing/src/`
  - `role-model-router/packages/runtime-observability/src/`
  - `role-model-router/packages/sqlite-memory/src/`
  - `role-model-router/apps/runtime-ui/app/`

## Validation Expectations

- any code or fixture change introduced by this run must still follow TDD
- the repo-local strategy lock must be cross-checked against the external proposal and the current codebase gap analysis
- the resulting requirements must be specific enough that each downstream run can derive concrete Phase 1 and Phase 2 artifacts without reopening basic scope questions
- any config examples or contract fixtures added in support of this lock must be validated end to end through the runtime surfaces they are intended to govern

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] The rollout sequence for runs `23` through `30` is explicit and non-overlapping
- [x] The difficulty rubric, compatibility policy, and verification obligations are recorded

Coverage: PASS

## Approval Gate

- [x] The requirements are specific enough for downstream AS-IS analysis and planning
- [x] The repo-local run contract no longer depends on repeating the external proposal in chat
- [x] No unresolved ambiguity remains about the intended staged implementation sequence

Approval: PASS
