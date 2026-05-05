# role-model — Next Implementation Requirement (Post-Repo Review)

## Purpose

This document defines the **next required implementation work** for the `role-model` repository based on the current inspected repo state.

This requirement is intentionally limited to the next baseline-hardening block and focuses on:

- **M1 — Core protocol schema freeze**
- **M2 — Routing contract and conformance**
- **M3 — Observability linkage and empirical profile semantics**

This requirement explicitly **defers**:

- **M6 — Native router hosts**
- **M7 — Memory/package integration**
- **M8 — Browser/runtime-web expansion**

It also limits M4 and M5 work to only the minimum required to support M1–M3 validation.

---

## Implementation objective

The repository must move from a **strong structural scaffold** to a **stable protocol baseline**.

At the end of this requirement, the repo must have:

1. a **frozen, non-ambiguous protocol schema layer**,
2. a **deterministic, explainable routing reference implementation**,
3. a **real role/task-aware routing model**,
4. a **stable observability linkage model** connecting routing, traces, usage, and observed performance,
5. a **repeatable smoke validation path** that proves those layers work together.

This work must be completed **before** expanding native hosts, memory backends, package/model-pack loading, or browser/local inference integrations.

---

## Scope

### In scope

- auditing and hardening canonical schemas under `protocol/schemas/`
- expanding fixture coverage under `protocol/fixtures/`
- regenerating and enforcing canonical generated protocol types
- refactoring the TypeScript router core into a protocol-grade reference implementation
- implementing role/task/binding-aware routing
- implementing deterministic routing conformance via fixture-driven tests
- implementing multi-sample observed-performance aggregation semantics
- implementing trace/usage/profile linkage validation
- upgrading the smoke app to validate emitted artifacts against schemas

### Out of scope

The following must **not** be implemented in this requirement unless strictly necessary to validate M1–M3:

- native Rust router hosts
- desktop runtime host
- Pi daemon host
- native provider implementations
- EdgeHDF5 or other memory backend work
- package/model-pack loading/install/update flows
- real WebLLM integrations
- real MediaPipe integrations
- real LiteRT / LiteRT-LM integrations
- full benchmark runner implementation beyond the minimum required sample/profile flow
- full ACP/MCP/CLI discovery beyond the existing stub support needed for smoke validation

---

## Repo areas to modify

The implementation work in this requirement is expected to touch at least:

- `protocol/schemas/`
- `protocol/fixtures/`
- `docs/protocol/`
- `packages/protocol-types/`
- `packages/schema-tools/`
- `packages/conformance/`
- `role-model-router/packages/core/`
- `role-model-router/packages/trace/`
- `role-model-router/packages/usage/`
- `role-model-router/packages/profile-aggregator/`
- `role-model-router/packages/roles/`
- `role-model-router/packages/tasks/`
- `role-model-router/apps/gateway-smoke/`

---

# M1 — Core protocol schema freeze

## Objective

The protocol schema layer must become **hard**, **canonical**, and **non-ambiguous**.

Schemas already exist. This requirement is to ensure they are:

- internally consistent,
- sufficient for routing and observability,
- validated in CI/test,
- reflected exactly in generated types,
- backed by valid and invalid fixtures.

## Required schema set

The following schema files must exist and remain canonical:

- `protocol/schemas/capability-taxonomy.schema.json`
- `protocol/schemas/endpoint-identity.schema.json`
- `protocol/schemas/routing-policy.schema.json`
- `protocol/schemas/declared-capability-profile.schema.json`
- `protocol/schemas/observed-performance-profile.schema.json`
- `protocol/schemas/usage-event.schema.json`
- `protocol/schemas/trace-event.schema.json`
- `protocol/schemas/trace-span.schema.json`
- `protocol/schemas/router-decision.schema.json`
- `protocol/schemas/benchmark-suite.schema.json`
- `protocol/schemas/benchmark-run.schema.json`
- `protocol/schemas/judge-score.schema.json`
- `protocol/schemas/role-definition.schema.json`
- `protocol/schemas/task-definition.schema.json`
- `protocol/schemas/role-binding.schema.json`
- `protocol/schemas/task-execution-profile.schema.json`
- `protocol/schemas/planspec.schema.json`
- `protocol/schemas/package-manifest.schema.json`
- `protocol/schemas/model-pack-manifest.schema.json`

## Required M1 work

### M1.1 Schema audit

The implementer must audit all existing schemas and ensure:

- field naming is consistent across related objects
- enums use one canonical vocabulary
- required vs optional fields match current protocol docs
- no schema contains placeholder or contradictory semantics
- schemas are sufficient for current router and observability needs

### M1.2 Generated type enforcement

`packages/protocol-types/src/generated.ts` must remain **generated only**.

Requirements:
- no handwritten protocol types may duplicate canonical schema entities
- handwritten utility types may exist only if they wrap or compose generated types
- the generation path must run from the canonical schemas
- the repo must have a repeatable script to regenerate types

### M1.3 Fixture expansion

Create and/or expand fixtures under:

- `protocol/fixtures/router-golden/`
- `protocol/fixtures/trace-golden/`
- `protocol/fixtures/usage-golden/`
- `protocol/fixtures/profile-golden/`
- `protocol/fixtures/role-task-golden/`

Each fixture family must include:
- valid fixtures
- invalid fixtures
- minimal fixtures
- edge-case fixtures

### M1.4 Schema tightening requirements

The following schema requirements must be enforced.

#### `router-decision.schema.json`

Must support enough data to make routing explainable and testable.

Required fields:
- `routing_decision_id`
- `request_id`
- `app_id`
- `org_id` (nullable or optional only if not in scope)
- `policy_snapshot`
- `eligibility`
- `scored_candidates`
- `chosen_endpoint_id`
- `fallback_endpoint_ids`
- `selection_reasons`
- `used_measured`
- `used_declared`
- `scoring_version`

Each scored candidate must include:
- `endpoint_id`
- `total_score`
- `metric_breakdown`
- `tie_break`

Each eligibility entry must include:
- `endpoint_id`
- `eligible`
- `exclusions`

`metric_breakdown` must include:
- `quality`
- `latency`
- `throughput`
- `cost`
- `reliability`
- `preference`

Each metric entry must include:
- `value`
- `source`
- optional raw diagnostic values

`tie_break` must include:
- `quality`
- `latency_ms`
- `reliability`
- `endpoint_id`

#### `role-definition.schema.json`

Must require:
- `role_id`
- `name`
- `description`
- `role_kind`
- `task_types_supported`
- `required_capabilities`
- `preferred_capabilities`
- `forbidden_capabilities`
- `tool_policy`
- `routing_policy_overrides`

If a role is used in routing, these fields must be interpretable by the router.

#### `task-definition.schema.json`

Must require:
- `task_type`
- `description`
- `required_capabilities`
- `preferred_capabilities`
- `allowed_roles`
- `quality_metrics`

#### `role-binding.schema.json`

Must require:
- `binding_id`
- `role_id`
- `endpoint_id`
- `status`
- `effective_capabilities`
- `effective_task_types`

Status must at least support:
- `active`
- `inactive`
- `disabled`

#### `observed-performance-profile.schema.json`

Must require:
- `endpoint_id`
- `endpoint_version`
- `measured_at_ms`
- `measurement_window`
- `sample_size`
- `sources`
- `latency_ms_p50`
- `latency_ms_p95`
- `failure_rate`
- `freshness_score`
- `confidence_score`

`sources` must include:
- `benchmark_samples`
- `live_request_samples`

Schema-level consistency must ensure:
- `sample_size` is greater than or equal to `benchmark_samples + live_request_samples`
- both sample counts are non-negative integers

### M1.5 Docs alignment

The following docs must be updated if schema semantics change:

- `docs/protocol/profiles.md`
- `docs/protocol/roles.md`
- `docs/protocol/tasks.md`
- `docs/protocol/role-task-capability-mapping.md`
- `docs/protocol/traces.md`
- `docs/protocol/usage.md`
- `docs/protocol/benchmarks.md`

## M1 acceptance criteria

M1 is complete only if all of the following are true:

1. all canonical schemas validate successfully
2. all valid fixtures validate successfully
3. all invalid fixtures fail validation
4. protocol types regenerate successfully from schemas
5. no duplicated handwritten canonical protocol type layer exists
6. the router and observability packages build against generated protocol types
7. role/task/binding entities are present in canonical schemas and fixture coverage

---

# M2 — Routing contract and conformance

## Objective

The TypeScript router in `role-model-router/packages/core` must become the **reference implementation** of the current routing contract.

It must be:

- deterministic
- explainable
- role/task-aware
- fixture-driven
- aligned with the canonical protocol

## Required routing model

### M2.1 Canonical strategies

The router must only use these canonical strategies internally:

- `balanced`
- `cost`
- `latency`
- `quality`

If input aliases are accepted, they must be normalized at the boundary before routing logic runs.

Internal router state must not use alternate strategy names.

### M2.2 Required routing inputs

The router must support all of the following inputs:

- request-level routing policy
- endpoint identities
- declared capability profiles
- observed performance profiles
- optional role definitions
- optional task definitions
- optional role bindings
- optional request-level role selection
- optional request-level task type
- optional request-level capability overrides

### M2.3 Eligibility pipeline

The router must evaluate eligibility in a deterministic order.

Required exclusion checks:

1. endpoint availability / enabled state
2. endpoint revocation / denylist / allowlist restrictions
3. endpoint/provider policy restrictions
4. remote-forbidden restrictions
5. capability requirements
6. forbidden capability violations
7. modality requirements
8. minimum context requirements
9. tool-calling requirements
10. role-task compatibility
11. role-binding status
12. binding-effective capability restrictions
13. binding-effective task-type restrictions
14. budget hard-cap restrictions

Every ineligible candidate must produce explicit exclusion codes.

### M2.4 Required exclusion reason codes

At minimum, support:

- `CAPABILITY_MISSING`
- `FORBIDDEN_CAPABILITY_PRESENT`
- `MODALITY_UNSUPPORTED`
- `CONTEXT_TOO_SMALL`
- `TOOLS_UNSUPPORTED`
- `ROLE_NOT_ALLOWED`
- `TASK_NOT_SUPPORTED_BY_ROLE`
- `ROLE_BINDING_INACTIVE`
- `ROLE_BINDING_DISABLED`
- `ROLE_BINDING_TASK_NOT_ALLOWED`
- `ROLE_BINDING_CAPABILITY_MISSING`
- `POLICY_DENY_ENDPOINT`
- `POLICY_DENY_REMOTE`
- `ENTITLEMENT_MISSING`
- `PACKAGE_NOT_INSTALLED`
- `VARIANT_INCOMPATIBLE`
- `PROVIDER_OFFLINE`
- `BUDGET_EXCEEDED`
- `REVOKED`

If the current implementation does not use some of these yet, it must still define and support them in the reference contract where applicable.

### M2.5 Selection reason codes

At minimum, support:

- `BEST_TOTAL_SCORE`
- `MEASURED_PROFILE_USED`
- `DECLARED_PROFILE_USED`
- `DEFAULT_PROFILE_USED`
- `LOCAL_PREFERENCE_APPLIED`
- `REMOTE_PREFERENCE_APPLIED`
- `BUDGET_OPTIMIZATION`
- `LOW_LATENCY_TARGET_MET`
- `HIGH_QUALITY_TARGET_MET`
- `ROLE_POLICY_APPLIED`
- `TASK_POLICY_APPLIED`
- `FALLBACK_CHAIN_COMPUTED`

### M2.6 Metric model

Each eligible endpoint must be scored across these metrics:

- quality
- latency
- throughput
- cost
- reliability
- preference

Each metric must be normalized to `[0, 1]`.

Each metric must record a source:
- `measured`
- `declared`
- `default`

### M2.7 Metric precedence

For each metric, precedence must be:

1. measured value from `ObservedPerformanceProfile`
2. declared approximation if explicitly available
3. default neutral value

This precedence must be recorded in metric source metadata.

### M2.8 Normalization rules

The following rules must be implemented explicitly.

#### Quality
- use benchmark/judge-derived score when available
- if missing, default to `0.5`

#### Latency
- lower is better
- use p50 as primary latency
- use p95 as tail penalty input
- expose raw diagnostic latency values

#### Throughput
- higher is better
- use measured `tokens_per_sec` if available
- if missing, default to `0.5`

#### Cost
- lower is better
- use measured `cost_per_1k_tokens_est` when available
- if missing, default to `0.5`
- support hard budget and advisory cost weighting separately

#### Reliability
- higher is better
- use `1 - failure_rate`
- if missing, default to `0.7`

#### Preference
Must encode policy preference impacts such as:
- local preference
- remote preference
- role/task routing policy overrides

### M2.9 Unknown-metric redistribution

If a metric is absent for all candidates, its strategy weight must be redistributed across the remaining metrics rather than flattening all candidates to the same neutral value.

This behavior must be implemented and tested.

### M2.10 Tie-break order

If two candidates tie within the configured epsilon, tie-break must proceed in this order:

1. higher quality metric
2. lower effective latency
3. higher reliability
4. lexicographically smaller `endpoint_id`

This must be implemented exactly and tested.

### M2.11 Role/task-aware routing

Roles and tasks must become real routing inputs.

Required behavior:
- requested role resolves a `RoleDefinition`
- requested task resolves a `TaskDefinition`
- effective capability requirements are merged from:
  - request-level requirements
  - role required capabilities
  - task required capabilities
- effective preferred capabilities are merged from:
  - request-level preferred capabilities
  - role preferred capabilities
  - task preferred capabilities
- role forbidden capabilities must be enforced
- `task_types_supported` must be enforced
- `allowed_roles` must be enforced
- active role binding must be enforced
- `effective_capabilities` from binding must be enforced
- `effective_task_types` from binding must be enforced
- role `routing_policy_overrides` must modify the policy snapshot applied to routing

### M2.12 Router output requirements

The returned `RouterDecision` must include:

- full eligibility array
- full scored-candidate array
- selection reasons
- fallback chain
- metric source detail
- tie-break diagnostic detail
- policy snapshot as actually applied
- whether measured data was used
- whether declared data was used

## M2 conformance requirements

### M2.13 Fixture-driven conformance

Move beyond inline tests.

Add a fixture-driven conformance harness using cases under:

- `protocol/fixtures/router-golden/cases/`

Each case must define:
- request
- routing policy
- endpoints
- declared profiles
- observed profiles
- optional role definitions
- optional task definitions
- optional role bindings
- expected decision summary

### M2.14 Required golden cases

At minimum, add cases for:
- capability missing
- insufficient context
- tools unsupported
- local preference
- remote preference
- measured profile wins over declared-only alternative
- cost strategy prefers cheaper endpoint
- latency strategy prefers faster endpoint
- quality strategy prefers better judged endpoint
- tie-break falls back to endpoint id
- role forbids a required endpoint capability
- task not allowed for role
- inactive role binding excludes endpoint
- binding capability restrictions exclude endpoint
- binding task restrictions exclude endpoint
- advisory budget vs hard budget behavior
- measured profile absent for some candidates only
- all candidates missing one metric, requiring redistribution

## M2 acceptance criteria

M2 is complete only if all of the following are true:

1. router uses only canonical internal strategies
2. router outputs are fully schema-valid
3. all rejections include explicit exclusion reasons
4. all selections include explicit selection reasons
5. metric breakdowns are exposed for every scored candidate
6. tie-break diagnostic data is exposed for every scored candidate
7. role/task/binding inputs materially affect routing
8. fixture-driven conformance tests pass
9. golden cases cover both positive and negative routing outcomes

---

# M3 — Observability linkage and empirical profile semantics

## Objective

The observability layer must become a **real protocol data model**, not just file emission.

It must support the stable linkage:

- `RouterDecision`
- `TraceSpan[]`
- `TraceEvent[]`
- `UsageEvent`
- `ObservedPerformanceProfile`

## Required data flow

Every request executed through the smoke path or router validation path must be able to produce:

1. a schema-valid `RouterDecision`
2. schema-valid trace spans
3. schema-valid trace events
4. a schema-valid `UsageEvent`
5. an aggregated `ObservedPerformanceProfile`

## M3.1 Unified sample model

Implement one internal sample shape for profile aggregation.

Each sample must include at least:
- `endpoint_id`
- `endpoint_version`
- `source_type` (`benchmark` or `live_request`)
- `timestamp_ms`
- `latency_ms`
- optional `latency_ms_p95`
- optional `tokens_per_sec`
- optional `judge_score`
- optional `cost_per_1k_tokens_est`
- optional `failure`
- optional `error_class`

The aggregator must use this sample shape consistently.

## M3.2 Source separation

Observed performance must distinguish:
- benchmark-derived samples
- live-request samples

The aggregated profile must include separate counts for each in `sources`.

### M3.3 Multi-sample aggregation

Observed performance must no longer be a one-shot sample conversion.

Implement aggregation across multiple samples with:
- `sample_size`
- benchmark/live source counts
- latency aggregation
- throughput aggregation
- failure-rate aggregation
- error-class rate aggregation
- quality aggregation

### M3.4 Aggregation rules

Required aggregation behavior:

#### Latency
- `latency_ms_p50` aggregated from all eligible samples
- `latency_ms_p95` aggregated from all eligible samples

#### Throughput
- aggregate `tokens_per_sec` only from samples that provide it
- do not force missing throughput into sample counts

#### Quality
- aggregate benchmark judge scores only from benchmark-derived samples that provide judge scores
- if no benchmark quality samples exist, quality may be absent from the profile or represented as neutral depending on current schema semantics, but behavior must be explicit and tested

#### Failure rate
- `failure_rate = failures / total_samples`

#### Error class rates
- each rate must be normalized over total samples or documented error-bearing sample count; whichever is chosen must be implemented consistently and documented

#### Cost
- aggregate cost only across samples with cost data
- absence of cost data must not force zero cost

### M3.5 Freshness semantics

Implement freshness with explicit decay.

Requirements:
- freshness must be computed from current time and the most recent sample timestamp
- freshness must monotonically decrease as data ages
- freshness must be bounded to `[0, 1]`
- the decay constant or half-life must exist as a named constant in code

### M3.6 Confidence semantics

Implement confidence with explicit rules.

Requirements:
- confidence must increase with sample count
- confidence must be bounded to `[0, 1]`
- confidence must not increase indefinitely without bound
- the governing constant(s) must exist as named constants in code

### M3.7 Endpoint-version safety

Aggregation must be version-aware.

Requirements:
- samples with different `endpoint_version` values must not be aggregated into one profile
- version mismatch must either:
  - produce a new profile, or
  - fail aggregation for that mixed set
- the chosen behavior must be explicit and tested

### M3.8 Trace semantics

`role-model-router/packages/trace` must support schema-aligned trace artifacts.

Required trace span families:
- router eligibility
- router scoring
- endpoint selection
- model load
- queue
- prefill
- decode
- tool execution
- fallback
- retry
- failure

Required trace behavior:
- spans and events must carry request-level identifiers
- spans and events must link to `routing_decision_id`
- events must reference existing spans
- invalid linkages must be detectable in tests

### M3.9 Usage semantics

`role-model-router/packages/usage` must support:
- append helpers
- read helpers
- summary reducers

Minimum summaries:
- by `app_id`
- by `endpoint_id`
- by `model_id`
- by `provider_kind`

Usage linkage requirements:
- `request_id` must match the router decision / trace artifact for the same request
- `routing_decision_id` must match the produced router decision

### M3.10 Smoke-path validation

Upgrade `role-model-router/apps/gateway-smoke` to act as a real validation harness.

It must:
- load at least one fixture-driven router case
- execute routing
- emit decision/trace/usage/profile artifacts
- validate all emitted artifacts against canonical schemas before exit
- fail if linkage is broken
- optionally consume role definitions, task definitions, and role bindings from fixtures

## M3 required tests

Add tests for:

- aggregation from multiple live samples
- aggregation from multiple benchmark samples
- mixed live + benchmark source counts
- freshness decay over time
- confidence increasing with sample count
- failure-rate aggregation
- error-class-rate aggregation
- missing throughput handling
- missing cost handling
- missing quality handling
- endpoint-version mismatch behavior
- invalid trace-event → trace-span linkage
- invalid usage-event → router-decision linkage
- smoke-path schema validation failure detection

## M3 acceptance criteria

M3 is complete only if all of the following are true:

1. decision, trace, usage, and profile artifacts are schema-valid
2. linkage between those artifact families is testable and enforced
3. observed performance is aggregated from multiple samples
4. benchmark and live-request sample counts are tracked separately
5. freshness and confidence are implemented as real formulas in code
6. endpoint-version mismatch handling is implemented and tested
7. smoke app validates emitted artifacts and fails on invalid outputs

---

# Minimal M4 and M5 support allowed in this requirement

## M4 limits

Allowed only:
- minimal benchmark sample helpers needed for observed-profile aggregation
- minimal judge-score handling needed for quality aggregation
- minimal fixture structures used by M3 tests

Not allowed:
- full benchmark orchestration system
- distributed judge integration
- broad benchmark UX work

## M5 limits

Allowed only:
- keeping ACP/MCP/CLI stubs sufficient for smoke-path validation
- using synthetic or declared endpoint metadata where necessary for M1–M3 tests

Not allowed:
- real discovery integrations
- real external endpoint orchestration
- full lightweight host implementation

---

# Deliverables

At the end of this requirement, the repo must contain all of the following:

## Deliverable D1 — Hardened protocol schema layer
- audited schemas
- expanded valid/invalid fixtures
- generated types refreshed
- no protocol-type drift

## Deliverable D2 — Protocol-grade router reference implementation
- deterministic routing
- role/task-aware eligibility
- explicit metric breakdowns
- explicit selection/exclusion reasons
- fixture-driven conformance

## Deliverable D3 — Stable observability linkage layer
- linked decision/trace/usage/profile artifacts
- multi-sample aggregation
- freshness/confidence semantics
- version-aware profile handling
- summary reducers and linkage validation

## Deliverable D4 — Validation smoke path
- fixture-driven smoke execution
- schema validation of emitted artifacts
- failure on invalid linkage or invalid outputs

---

# Final success criteria

This requirement is successful only if the resulting repo state satisfies all of the following:

1. the protocol layer is frozen enough that new hosts do not redefine it,
2. the TypeScript router acts as the reference routing implementation,
3. roles and tasks are real protocol-and-routing entities rather than documentation only,
4. observability data is structurally correct and semantically usable for later dashboards,
5. the repo has a repeatable validation path proving the core contract works end to end.

If any of the above is missing, this requirement is not complete.
