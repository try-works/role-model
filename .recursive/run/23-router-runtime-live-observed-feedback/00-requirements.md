Run: `/.recursive/run/23-router-runtime-live-observed-feedback/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-11T10:38:10Z`
LockHash: `e5d985bb65d664955518db113eebad35ca4ce31f6333023af826c664f54e9bd8`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/23-router-runtime-live-observed-feedback/00-requirements.md`
Scope note: This run establishes the live observed-data feedback loop required by the strategy proposal before alias-based cross-model routing is introduced.

## TODO

- [x] Derive a repo-local requirements contract for the live observed-feedback slice
- [x] Define numbered requirements and measurable acceptance criteria
- [x] Record scope boundaries, constraints, assumptions, targeted runtime surfaces, and verification expectations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Route against runtime-owned observed profiles instead of fixture-only profile maps

Description:
The runtime host bridge must stop depending on static fixture-only `observedProfilesByEndpointId` input for live request routing and instead read the active observed-profile state from the runtime-owned persistence layer.

Acceptance criteria:
- live request routing no longer requires `testdata/router-runtime/routing-observed-profiles.json` as its runtime source of observed profiles
- the bridge loads the latest available observed profile for every candidate endpoint from runtime-owned state, with deterministic fallback behavior when no live profile exists
- the same runtime path supports both local and remote endpoints without maintaining separate observed-profile loading logic per endpoint class
- validation proves that a request made after runtime observations exist can route with SQLite-backed observed data rather than fixture-only seed data

### `R2` Persist live execution outcomes in the shape required by future routing runs

Description:
Execution outcomes must be written to persistence in a form that later recency-bias, throughput-SLA, and segmented-difficulty runs can consume without redesigning the storage contract.

Acceptance criteria:
- each completed request persists live-request samples with endpoint identity, version, latency, failure state, and routing-decision linkage
- throughput or enough usage-plus-latency data is persisted so `tokens_per_sec` can be derived or updated from live execution outcomes
- persistence covers both local and remote execution paths through the same logical contract
- runtime inspection surfaces can read back the persisted samples and latest profile for a chosen endpoint

### `R3` Hot-reload observed data into routing with bounded staleness

Description:
The runtime must consume fresh observed data during live routing without requiring a process restart.

Acceptance criteria:
- the bridge or routing layer reads observed-profile state on each request or through a short-lived cache with explicit TTL
- fresh writes become visible to later route decisions without restarting the host process
- the runtime documents or exposes the staleness boundary of the read path so later runs can reason about recency behavior
- the hot-reload path behaves consistently for both local and remote endpoints

### `R4` Preserve exact-model routing correctness while changing the feedback source

Description:
This run must improve the data foundation without yet changing the externally visible routing contract from exact model ids to aliases.

Acceptance criteria:
- exact-model requests to `/v1/chat/completions` and `/v1/responses` continue to work after the feedback-loop change
- the bridge still returns the real chosen model and preserves existing routing, trace, and usage semantics
- the change does not introduce local-only or remote-only shortcuts in the exact-model path
- validation proves that observed-data loading changes did not regress existing exact-model routing behavior

### `R5` Surface the live feedback source in runtime diagnostics and inspection APIs

Description:
Operators and later integration runs need to verify that routing is reading runtime-owned observed data rather than stale fixture data.

Acceptance criteria:
- runtime diagnostics or inspection APIs make it clear whether a profile came from persisted runtime state and when it was measured
- request and endpoint inspection surfaces expose enough information to confirm which profile influenced a route decision
- the inspection model works for both local and remote endpoints

### `R6` Use TDD and end-to-end verification for the live observed-feedback slice

Description:
The feedback-loop run must prove itself with failing tests first and runtime-level verification rather than package-only assertions.

Acceptance criteria:
- production code changes in this run are introduced through failing tests before green implementation work
- validation includes focused package-level coverage for persistence, loading, and routing integration
- validation includes end-to-end runtime proof that a request writes observed data and a later request consumes runtime-owned observed profiles during routing
- end-to-end verification must exercise both at least one local endpoint path and one remote endpoint path unless a locked addendum records an environmental block

## Out of Scope

- `OOS1`: alias exposure, masquerade routing, or model-pool config
- `OOS2`: recency decay, throughput SLA penalties, or segmented per-difficulty profiles
- `OOS3`: difficulty classification or controller-guided request inference

## Constraints

- the run must preserve the current exact-model routing contract while replacing the observed-data source underneath it
- the runtime-owned feedback path must work for both local and remote endpoints without divergent semantics
- the persistence contract must remain compatible with the existing SQLite-first runtime state
- the run must not silently keep live routing fixture-driven while merely improving offline validators

## Assumptions

- the existing runtime already persists enough execution and observation state that the missing work is primarily wiring and live-consumption behavior
- later runs can extend the same persistence model with recency, penalties, or segmented profiles without rewriting this run's foundational contract

## Sequence Integration

- Roadmap slot: `routing strategy phase 0a - live observed feedback`
- Previous repo dependency: `22-router-runtime-routing-strategy-lock`
- Next repo dependency: `24-router-runtime-recency-bias-throughput-sla`
- Required handoff: runtime-owned observed-profile loading and hot-reloaded feedback for both local and remote exact-model routing

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- `role-model-router/packages/sqlite-memory/src/`
- `role-model-router/packages/runtime-observability/src/`
- `role-model-router/packages/profile-aggregator/src/`
- `role-model-router/packages/protocol-routing/src/`
- `testdata/router-runtime/` only where fixtures must be updated for non-live validation paths

## Validation Expectations

- focused tests are required for persistence read/write and runtime profile loading behavior
- bridge-level validation must prove hot-reloaded live profile consumption without restarting the host
- end-to-end validation must exercise at least one local and one remote route whose observed state can be inspected before and after execution
- validation receipts must show that fixture-only observed-profile input is no longer the live runtime source

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] The runtime-owned feedback-loop scope is separated from alias, recency, and classifier work
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements define a concrete behavioral gap closure rather than a vague observability improvement
- [x] No unresolved ambiguity remains about exact-model compatibility or live-vs-fixture behavior

Approval: PASS
