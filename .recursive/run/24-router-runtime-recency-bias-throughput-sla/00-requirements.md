Run: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-11T11:46:33Z`
LockHash: `3562069a9fad2b8f2e9daabae204f9b410e6ad9b031cf17509dd59420ba0f2b0`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/00-requirements.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
Scope note: This run turns live observed profiles into adaptive routing inputs by adding recency-biased effective metrics and throughput-SLA penalty behavior.

## TODO

- [x] Define numbered requirements for recency bias and throughput-SLA behavior
- [x] Record acceptance criteria for scoring, persistence, diagnostics, and local-plus-remote parity
- [x] Record scope boundaries, constraints, assumptions, targeted surfaces, and validation expectations
- [x] Make TDD and end-to-end verification explicit for this run
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Add a runtime-owned observed-data configuration contract

Description:
The runtime must expose a durable configuration surface for observed-data behavior so recency bias and throughput-SLA logic are explicit, reviewable, and operator-controlled.

Acceptance criteria:
- the runtime gains a repo-owned config surface for `observedData` with documented defaults for recency and SLA behavior
- the contract covers at least:
  - whether observed-data weighting is enabled
  - metric-specific recency halflives
  - aggregation-window thresholds
  - throughput-SLA enablement, threshold, penalty timeout, and penalty factor
- configuration behavior applies to both local and remote endpoints
- invalid observed-data config fails fast with descriptive validation errors

### `R2` Compute recency-biased effective metric values before routing

Description:
The router must stop treating all observed samples as equally fresh and instead derive effective metric values that decay toward defaults as observations age.

Acceptance criteria:
- effective values are computed for the metrics the strategy proposal calls out, including latency, throughput, failure rate, quality/judge score, and cost where data exists
- the decay behavior is deterministic and parameterized by runtime config rather than hardcoded in multiple locations
- when no observed data exists, the router still falls back to documented neutral defaults
- the effective metric path works identically for both local and remote endpoints
- route diagnostics or candidate-scoring output can show the effective value and the measured source data used to derive it

### `R3` Enforce throughput-SLA penalties as a routing eligibility and scoring input

Description:
The runtime must penalize or exclude endpoints whose observed throughput falls below the configured minimum acceptable threshold.

Acceptance criteria:
- the runtime records throughput-breach state in runtime-owned persistence with enough detail to enforce a bounded penalty window
- when the configured penalty factor is `0.0`, an endpoint under active penalty becomes ineligible for routing
- when the configured penalty factor is non-zero, the endpoint remains routable but its throughput contribution is discounted as configured
- the penalty mechanism works for both local and remote endpoints
- penalty expiration returns the endpoint to normal consideration without requiring process restart

### `R4` Integrate effective metrics and SLA penalties into route scoring and diagnostics

Description:
Recency-biased metrics and throughput-SLA state must be used during real route selection, not merely computed in isolation.

Acceptance criteria:
- routing decisions consume the effective observed metrics rather than raw profile values alone
- throughput-SLA state participates in route eligibility or candidate score computation as configured
- route diagnostics, request inspection, or endpoint inspection surfaces expose enough information to explain when recency decay or SLA penalty affected the decision
- existing exact-model routing behavior remains intact while becoming more adaptive

### `R5` Preserve local-plus-remote parity and operator control in adaptive scoring

Description:
Adaptive observed-data behavior must apply uniformly across the runtime rather than privileging only one endpoint family.

Acceptance criteria:
- recency decay and throughput-SLA handling do not assume local-only or remote-only execution
- endpoint-specific overrides, if added in this run, work for both local and remote endpoint records
- the runtime does not silently exempt one provider class from adaptive scoring without an explicit documented rule

### `R6` Use TDD and end-to-end verification for recency and throughput adaptation

Description:
This run must prove that adaptive scoring works in the live runtime, not just in isolated pure functions.

Acceptance criteria:
- production changes are introduced through failing tests before green implementation
- validation includes focused coverage for effective-metric calculation and throughput-penalty lifecycle behavior
- end-to-end verification demonstrates that two endpoints with different freshness or throughput states produce materially different routing outcomes in the live runtime
- end-to-end verification includes at least one local endpoint path and one remote endpoint path unless a locked addendum records an environmental block

## Out of Scope

- `OOS1`: alias exposure or masquerade model-pool routing
- `OOS2`: difficulty classification, `maxDifficulty`, or segmented per-difficulty profiles
- `OOS3`: controller-guided protocol routing or request rewriting

## Constraints

- this run builds on runtime-owned observed feedback from run `23` and must not reintroduce fixture-only live routing behavior
- adaptive scoring must remain explainable through diagnostics and inspection APIs
- local and remote endpoints must both be subject to recency and throughput logic when they have observed data
- the run must preserve exact-model request compatibility while improving route selection behavior

## Assumptions

- live observations from run `23` provide sufficient profile data to support recency and throughput reasoning
- later runs can reuse the same observed-data config surface for alias, difficulty, and controller-based modes

## Sequence Integration

- Roadmap slot: `routing strategy phase 0b - adaptive observed data`
- Previous repo dependency: `23-router-runtime-live-observed-feedback`
- Next repo dependency: `25-router-runtime-model-alias-pool`
- Required handoff: runtime scoring that uses recency-biased observed metrics and throughput-SLA penalties for both local and remote exact-model routing

## Targeted Package And File Inventory

- `role-model-router/packages/core/src/`
- `role-model-router/packages/protocol-routing/src/`
- `role-model-router/packages/runtime-observability/src/`
- `role-model-router/packages/sqlite-memory/src/`
- `role-model-router/apps/runtime-host-bridge/src/`
- runtime config parsing/rendering surfaces under `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` or successor config modules

## Validation Expectations

- focused tests are required for metric decay, config validation, penalty-state persistence, and route-scoring integration
- bridge-level validation must show adaptive scoring behavior through runtime APIs or emitted diagnostics
- end-to-end validation must prove that stale or underperforming local and remote endpoints are penalized or excluded as configured
- validation receipts must identify the configured halflives, thresholds, and penalty outcomes used during proof

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] The recency-bias and throughput-SLA scopes are explicit and verifiable
- [x] TDD and end-to-end local-plus-remote verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements clearly distinguish config, scoring, penalty, and diagnostic responsibilities
- [x] No unresolved ambiguity remains about exact-model compatibility or local-plus-remote parity

Approval: PASS
