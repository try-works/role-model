Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-04-12T11:27:04Z`
LockHash: `3e8f477b8ca6c62dd5301ad3c9bfffaba61cd21c5f4613ed5f54a55ac4a2d2c2`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md`
Outputs:
- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
Scope note: This document preserves the full normative M1–M3 source requirement while adding the recursive-mode formatting, stable requirement identifiers, explicit out-of-scope identifiers, constraints, assumptions, and approval gates required for downstream traceability.

## TODO

- [x] Elicit requirements from user/context
- [x] Define requirement identifiers (R1, R2, ...)
- [x] Write acceptance criteria for each requirement
- [x] Document out of scope items (OOS1, OOS2, ...)
- [x] List constraints and assumptions
- [x] Preserve the full reference requirement text without narrowing or paraphrasing it away
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

- `R1`: scope and milestone boundaries, including the explicit in-scope M1–M3 milestones and the minimal allowed support work outside them
- `R2`: required repo outcomes for canonical schemas, generated types, deterministic router behavior, conformance coverage, observability linkage, aggregation, and validation commands
- `R3`, `R4`, `R5`: implementation baseline, fixed toolchain, and canonical protocol source-of-truth rules
- `R6`: required schema files, fixture directories, and package outcomes
- `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13`, `R14`, `R15`: all M1 protocol-schema requirements, including capability taxonomy, endpoint identity, declared and observed profiles, routing policy, role/task entities, router decision, and trace/usage schemas
- `R16`: M1 acceptance criteria
- `R17`, `R18`, `R19`, `R20`, `R21`, `R22`: all M2 routing contract, eligibility, scoring, tie-break, fallback, and conformance requirements
- `R23`: M2 acceptance criteria
- `R24`, `R25`, `R26`, `R27`, `R28`, `R29`: all M3 observability linkage, sample model, deterministic aggregation, freshness/confidence, emission, and conformance requirements
- `R30`: M3 acceptance criteria
- `R31`: required commands and CI expectations
- `R32`: non-goals for this requirement
- `R33`: definition of done

## Out of Scope

- `OOS1`: `M4 — Benchmark runner expansion`
- `OOS2`: `M5 — Full lightweight host usability`
- `OOS3`: `M6 — Native Rust hosts`
- `OOS4`: `M7 — Memory and package integration`
- `OOS5`: `M8 — Browser/runtime-web provider implementations`
- `OOS6`: provider integrations, package installers, publishing flows, marketplace flows, and model-pack installation outside the minimum support work needed to validate M1–M3
- `OOS7`: daemon hosts, desktop runtimes, host UIs, and long-lived localhost gateway process management
- `OOS8`: production-grade browser inference or production-grade native provider integration work

## Constraints

- The preserved reference source for this run is `/.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md`.
- The canonical recursive artifact for this run must be `/.recursive/run/01-protocol-routing-obs/00-requirements.md`.
- The source requirement remains normative; recursive formatting must not silently narrow, reinterpret, or replace it.
- The run operates under `Workflow version: recursive-mode-audit-v1`.
- Stable requirement identifiers in this artifact must remain traceable to the preserved detailed source text below.

## Assumptions

- The named source copy is intentionally retained as the detailed reference document for later phases and audits.
- The malformed `00-requirements.md.md` file was an imported duplicate rather than the intended final recursive artifact.
- The correct fix is formatting-only normalization modeled on the established run `00` requirements artifact pattern.
- The repository already contains the foundational baseline from run `00-baseline`, so this run can focus on the M1–M3 protocol, routing, and observability requirement slices.

## Detailed Requirement Specification

# role-model — M1–M3 Stable Baseline Requirements

## Document status

- **Status:** normative implementation requirement
- **Scope:** M1, M2, M3 only
- **Audience:** implementation agent working in the `role-model` repository
- **Purpose:** define the exact work required to reach a stable baseline for:
  - canonical protocol schemas,
  - routing contract and conformance,
  - observability linkage and empirical endpoint profiles.

This document is intentionally specific. It is not a roadmap, design sketch, or suggestion list. It is the implementation requirement for the next work block.

---

# 1. Scope and milestone boundaries

## 1.1 In scope

The implementation **must** complete the following milestone areas:

- **M1 — Core protocol schemas and generated types**
- **M2 — Routing contract and conformance**
- **M3 — Observability linkage and empirical profile aggregation**

## 1.2 Explicitly deferred

The following milestones are **not** part of this requirement and must not expand the run scope except where minimal scaffolding is required to support M1–M3 tests:

- **M4 — Benchmark runner expansion**
- **M5 — Full lightweight host usability**
- **M6 — Native Rust hosts**
- **M7 — Memory and package integration**
- **M8 — Browser/runtime-web provider implementations**

## 1.3 Minimal allowed support work outside M1–M3

The implementation may make minimal changes outside M1–M3 **only** when strictly necessary to validate M1–M3 end to end. Allowed examples:

- keep a smoke app working if it is used to validate router decision + trace + usage output,
- keep a tiny benchmark sample format working if it is used as an input source for observed performance aggregation,
- add fixture files needed by conformance tests.

The implementation must not use this clause to start provider integrations, native hosts, package installers, or memory backends.

---

# 2. Required repo outcomes

At the end of this requirement, the repository must provide all of the following:

1. a canonical, internally consistent protocol schema layer under `protocol/schemas/`,
2. generated TypeScript protocol types derived from canonical schemas,
3. a deterministic router reference implementation in TypeScript,
4. a fixture-driven routing conformance suite,
5. a protocol-real observability model linking router decisions, traces, usage events, and observed performance profiles,
6. a real multi-sample empirical aggregation path for observed endpoint performance,
7. CI commands and local commands that verify schema validity, type generation, routing conformance, and observability conformance.

---

# 3. Implementation baseline

## 3.1 Languages and tooling

The implementation must use the already chosen baseline:

- **Markdown** for docs and requirement artifacts
- **JSON Schema Draft 2020-12** for canonical protocol schemas
- **TypeScript** for schema tooling, generated protocol types, router reference implementation, conformance tests, and observability reference implementation
- **Rust** is out of scope for substantive implementation in this requirement block

## 3.2 Toolchain

- **Node.js:** 22 LTS
- **Package manager:** `pnpm`
- **TypeScript:** 5.6+
- **Schema validator:** `ajv`
- **Type generation:** `json-schema-to-typescript`
- **Test runner:** `vitest`
- **Formatting/linting:** `biome`

## 3.3 Canonical source of truth

`protocol/schemas/*.schema.json` are the **only canonical source of truth** for protocol entities.

The implementation must enforce all of the following:

- `packages/protocol-types/` is generated from canonical schemas,
- generated files are not hand-edited,
- runtime code may use generated TS types and local validation helpers, but must not redefine divergent protocol entity shapes,
- tests and fixtures must validate against canonical schemas.

---

# 4. Required files and package outcomes

## 4.1 Required schema files

The following files must exist and be valid JSON Schema Draft 2020-12 documents:

- `protocol/schemas/capability-taxonomy.schema.json`
- `protocol/schemas/endpoint-identity.schema.json`
- `protocol/schemas/routing-policy.schema.json`
- `protocol/schemas/declared-capability-profile.schema.json`
- `protocol/schemas/observed-performance-profile.schema.json`
- `protocol/schemas/usage-event.schema.json`
- `protocol/schemas/trace-event.schema.json`
- `protocol/schemas/trace-span.schema.json`
- `protocol/schemas/router-decision.schema.json`
- `protocol/schemas/role-definition.schema.json`
- `protocol/schemas/task-definition.schema.json`
- `protocol/schemas/role-binding.schema.json`
- `protocol/schemas/task-execution-profile.schema.json`
- `protocol/schemas/benchmark-suite.schema.json`
- `protocol/schemas/benchmark-run.schema.json`
- `protocol/schemas/judge-score.schema.json`

## 4.2 Required fixture directories

The following directories must exist and contain validating fixtures:

- `protocol/fixtures/router-golden/`
- `protocol/fixtures/profile-golden/`
- `protocol/fixtures/trace-golden/`
- `protocol/fixtures/usage-golden/`
- `protocol/fixtures/role-task-golden/`

## 4.3 Required package outcomes

The following packages must be working and relevant to M1–M3:

- `packages/schema-tools/`
- `packages/protocol-types/`
- `packages/conformance/`
- `role-model-router/packages/core/`
- `role-model-router/packages/trace/`
- `role-model-router/packages/usage/`
- `role-model-router/packages/profile-aggregator/`
- `role-model-router/packages/roles/`
- `role-model-router/packages/tasks/`

Packages may be renamed only if the final structure remains equally clear and consistent with the repo’s architectural boundaries.

---

# 5. M1 — Core protocol schemas

## 5.1 General schema rules

All canonical schemas must satisfy the following:

- declare Draft 2020-12,
- set a stable `$id`,
- avoid contradictory optional/required semantics,
- avoid open-ended untyped extension bags unless explicitly justified,
- use enums where semantics must be closed,
- use `additionalProperties: false` for normative entity objects unless extensibility is intentionally required,
- include description text for non-obvious fields,
- validate all fixture examples used by tests.

## 5.2 Capability taxonomy schema

The capability taxonomy schema must define canonical capability ids and must support at minimum the following capabilities:

- `text.chat`
- `text.translation`
- `text.summarization`
- `text.rewrite`
- `text.classification`
- `text.language_detection`
- `reasoning.multi_step`
- `code.chat`
- `code.edit`
- `tools.function_calling`
- `embeddings.text`
- `json.schema_adherence`
- `multimodal.vision_text`
- `multimodal.audio_text`
- `adapter.lora_runtime`
- `decoding.constrained`

The capability taxonomy may allow additional dot-delimited ids, but the listed capabilities must exist as canonical built-ins.

## 5.3 Endpoint identity schema

The endpoint identity schema must define the concrete unit of routing and benchmarking.

### Required fields

- `endpoint_id: string`
- `endpoint_kind: enum`
- `provider_kind: enum`
- `serving_source: string`
- `model_id: string`
- `runtime_version: string`

### Optional but required-in-schema fields

The schema must include these fields as optional protocol fields:

- `package_id: string`
- `variant_id: string`
- `quantization: string`
- `precision: string`
- `host_class: string`
- `device_class: string`
- `region: string`
- `org_scope: string`
- `endpoint_version: string`

### Required enums

`endpoint_kind` must include at minimum:

- `local_engine`
- `remote_api`
- `browser_engine`
- `dispatch_adapter`

`provider_kind` must include at minimum:

- `acp`
- `mcp`
- `cli`
- `remote_openai_compat`
- `onnx`
- `mlx`
- `litertlm`
- `gguf`
- `webllm`
- `mediapipe_genai`
- `mediapipe_text`

### Validation rules

- `endpoint_id` must be stable and non-empty,
- `endpoint_kind` and `provider_kind` must both be present,
- `serving_source` must distinguish the concrete serving path and must not be blank,
- the schema must not model abstract “model-only” routing entities as endpoint identities.

## 5.4 Declared capability profile schema

This schema defines static capability and hard-limit facts.

### Required fields

- `endpoint_id: string`
- `capabilities: CapabilityId[]`
- `modalities: enum[]`
- `max_context_tokens: integer >= 1`
- `tool_calling: object`
- `supports_embeddings: boolean`

### `tool_calling` object

Required fields:

- `supported: boolean`
- `style: enum("openai", "json", "none")`

### `modalities`

Must allow at minimum:

- `text`
- `image`
- `audio`
- `video`

### Optional fields

- `platform_constraints`
- `supports_streaming`
- `supports_json_mode`
- `supports_multimodal_input`

## 5.5 Observed performance profile schema

This schema defines empirical, aggregated endpoint behavior.

### Required fields

- `endpoint_id: string`
- `measured_at_ms: integer`
- `sample_window: object`
- `sample_size: integer >= 1`
- `sources: object`
- `latency_ms_p50: number >= 0`
- `latency_ms_p95: number >= 0`
- `failure_rate: number in [0,1]`
- `freshness_score: number in [0,1]`
- `confidence_score: number in [0,1]`

### Optional fields

- `judge_score`
- `tokens_per_sec`
- `cold_start_ms`
- `error_class_rates`
- `cost_per_1k_tokens_est`
- `currency`
- `quality_score`

### `sample_window` object

Required fields:

- `started_at_ms`
- `ended_at_ms`

Validation rule:

- `ended_at_ms >= started_at_ms`

### `sources` object

Required fields:

- `live_request_samples: integer >= 0`
- `benchmark_samples: integer >= 0`

Validation rule:

- `live_request_samples + benchmark_samples >= 1`
- `sample_size` must equal `live_request_samples + benchmark_samples`

## 5.6 Routing policy schema

This schema defines router inputs that affect eligibility and scoring.

### Required fields

- `strategy`
- `compute_preference`
- `required_capabilities`
- `required_modalities`
- `require_tools`
- `deny_endpoints`
- `allow_endpoints`
- `deny_provider_kinds`
- `allow_provider_kinds`
- `budget`
- `privacy`
- `targets`

### Allowed `strategy` values

- `balanced`
- `cost`
- `latency`
- `quality`

No alternate names are allowed in the canonical protocol.

### Allowed `compute_preference` values

- `auto`
- `local`
- `remote`
- `hybrid`

### `budget` object

Required fields:

- `enabled: boolean`
- `currency: string`

Optional fields:

- `max_cost_per_request`
- `target_cost_per_request`

### `privacy` object

Required fields:

- `allow_remote: boolean`

### `targets` object

Required fields:

- `latency_target_ms: number > 0`
- `latency_max_ms: number > 0`
- `throughput_target_tps: number > 0`

## 5.7 Role/task schemas

These schemas are mandatory and first-class. They must not remain decorative.

### `role-definition.schema.json`

Required fields:

- `role_id`
- `name`
- `description`
- `task_types_supported`
- `required_capabilities`
- `preferred_capabilities`
- `forbidden_capabilities`
- `routing_policy_overrides`

### `task-definition.schema.json`

Required fields:

- `task_type`
- `description`
- `required_capabilities`
- `preferred_capabilities`
- `allowed_roles`
- `quality_metrics`

### `role-binding.schema.json`

Required fields:

- `binding_id`
- `role_id`
- `endpoint_id`
- `status`

Allowed `status` values:

- `active`
- `disabled`
- `candidate`

### `task-execution-profile.schema.json`

Required fields:

- `task_type`
- `role_id`
- `required_capabilities`
- `preferred_capabilities`
- `routing_policy_patch`

## 5.8 Router decision schema

This schema defines the persisted routing outcome.

### Required fields

- `routing_decision_id`
- `request_id`
- `policy_snapshot`
- `eligibility`
- `scored_candidates`
- `chosen_endpoint_id`
- `fallback_endpoint_ids`
- `selection_reasons`
- `used_measured`
- `used_declared`
- `scoring_version`

### `eligibility` entries

Each entry must contain:

- `endpoint_id`
- `eligible: boolean`
- `exclusions: CandidateExclusion[]`

### `CandidateExclusion`

Required fields:

- `code`
- `detail`

Allowed exclusion codes must include at minimum:

- `CAPABILITY_MISSING`
- `MODALITY_UNSUPPORTED`
- `CONTEXT_TOO_SMALL`
- `TOOLS_UNSUPPORTED`
- `POLICY_DENY_ENDPOINT`
- `POLICY_DENY_REMOTE`
- `ENTITLEMENT_MISSING`
- `PACKAGE_NOT_INSTALLED`
- `VARIANT_INCOMPATIBLE`
- `PROVIDER_OFFLINE`
- `BUDGET_EXCEEDED`
- `REVOKED`
- `ROLE_NOT_ALLOWED`
- `TASK_NOT_SUPPORTED`
- `ROLE_BINDING_INACTIVE`

### Selection reasons

Allowed selection reason codes must include at minimum:

- `BEST_TOTAL_SCORE`
- `MEASURED_PROFILE_USED`
- `DECLARED_PROFILE_USED`
- `DEFAULT_PROFILE_USED`
- `LOCAL_PREFERENCE_APPLIED`
- `REMOTE_PREFERENCE_APPLIED`
- `BUDGET_OPTIMIZATION`
- `LOW_LATENCY_TARGET_MET`
- `HIGH_QUALITY_TARGET_MET`
- `ROLE_PREFERENCE_APPLIED`
- `TASK_REQUIREMENTS_SATISFIED`
- `FALLBACK_CHAIN_COMPUTED`

## 5.9 Trace and usage schemas

### `trace-span.schema.json`

Required fields:

- `span_id`
- `trace_id`
- `request_id`
- `routing_decision_id`
- `span_type`
- `started_at_ms`
- `ended_at_ms`
- `status`

Allowed `span_type` values must include at minimum:

- `router.eligibility`
- `router.scoring`
- `router.selection`
- `provider.load`
- `provider.queue`
- `provider.prefill`
- `provider.decode`
- `tool.execution`
- `router.fallback`
- `router.retry`
- `request.failure`

Allowed `status` values:

- `ok`
- `error`
- `cancelled`

### `trace-event.schema.json`

Required fields:

- `event_id`
- `trace_id`
- `request_id`
- `routing_decision_id`
- `timestamp_ms`
- `event_type`
- `payload`

Allowed `event_type` values must include at minimum:

- `router.decision.created`
- `trace.span.opened`
- `trace.span.closed`
- `usage.event.created`
- `profile.sample.recorded`
- `profile.updated`

### `usage-event.schema.json`

Required fields:

- `event_id`
- `timestamp_ms`
- `app_id`
- `request_id`
- `routing_decision_id`
- `endpoint_id`
- `provider_kind`
- `tokens_in`
- `tokens_out`
- `latency_ms`

Optional fields:

- `org_id`
- `model_id`
- `package_id`
- `cost_estimate`
- `currency`
- `error_class`
- `sample_source`

Allowed `sample_source` values:

- `live_request`
- `benchmark`

---

# 6. M1 acceptance criteria

M1 is complete only when all of the following are true:

1. all required schemas exist and validate under Ajv,
2. all required fixtures validate against the relevant schemas,
3. generated protocol types are produced from schemas and build cleanly,
4. no canonical protocol entity used by M1–M3 exists only as a handwritten TypeScript type without corresponding schema,
5. role/task schemas are present and fully wired into generated types,
6. canonical enums for routing strategy, compute preference, exclusion reasons, selection reasons, endpoint kind, and provider kind are stable and used consistently.

---

# 7. M2 — Routing contract and conformance

## 7.1 Required router package outcome

The TypeScript router reference implementation under `role-model-router/packages/core/` must become the canonical reference implementation for M2 semantics.

It must expose a pure function equivalent to:

```ts
route(requestContext): RouterDecision
```

The exact signature may vary, but the router must be pure relative to its explicit inputs.

## 7.2 Required router inputs

The router must accept, directly or after explicit resolution, all of the following:

- request metadata:
  - `request_id`
  - `app_id`
  - optional `org_id`
  - token estimate or equivalent sizing data when cost modeling is used
- routing policy
- endpoint identities
- declared capability profiles
- observed performance profiles
- optional role definitions
- optional task definitions
- optional role bindings
- requested role id
- requested task type

It is not acceptable for the router to ignore role/task inputs while still claiming role/task support.

## 7.3 Eligibility pipeline

Eligibility must be evaluated in this exact order:

1. endpoint availability and revocation,
2. policy allow/deny endpoint filters,
3. policy allow/deny provider-kind filters,
4. privacy rule enforcement,
5. role binding status,
6. role/task compatibility,
7. required capability matching,
8. modality support,
9. context length sufficiency,
10. tool calling requirement,
11. budget hard-cap exclusion.

The router may internally organize logic differently, but final behavior must match this precedence.

## 7.4 Role/task resolution rules

The router must resolve requirements from both role and task inputs.

### Effective required capabilities

The effective required capabilities must be the union of:

- policy `required_capabilities`
- role `required_capabilities`
- task `required_capabilities`
- task execution profile `required_capabilities` if present

### Effective preferred capabilities

The effective preferred capabilities must be the union of:

- role `preferred_capabilities`
- task `preferred_capabilities`
- task execution profile `preferred_capabilities` if present

### Forbidden capabilities

Any endpoint exposing a capability listed in role `forbidden_capabilities` must be excluded.

### Role/task compatibility

- if the requested task type is not in the role’s `task_types_supported`, the endpoint is ineligible with `TASK_NOT_SUPPORTED`,
- if the task’s `allowed_roles` does not include the requested role id, the endpoint is ineligible with `ROLE_NOT_ALLOWED`,
- if a role binding exists for the endpoint and its status is not `active`, the endpoint is ineligible with `ROLE_BINDING_INACTIVE`.

## 7.5 Metric precedence

For scoring metrics, the router must use this precedence order for each candidate metric:

1. observed performance profile,
2. declared profile-derived estimate where applicable,
3. neutral default.

The router must set `used_measured` and `used_declared` correctly based on actual metric usage.

## 7.6 Required scoring metrics

The router must compute a normalized total score in `[0,1]` using these metrics:

- `quality`
- `latency`
- `throughput`
- `cost`
- `reliability`
- `preference`

## 7.7 Normalization rules

The following formulas are mandatory unless a mathematically equivalent formulation is used and validated by tests.

### Quality score

If `judge_score.score` exists:

- `quality = clamp(judge_score.score, 0, 1)`

Else if `quality_score` exists:

- `quality = clamp(quality_score, 0, 1)`

Else:

- `quality = 0.5`

### Latency score

Use:

- `effective_latency_ms = p50 + 0.25 * max(0, p95 - p50)`

Normalize:

- `latency_score = clamp(1 - log1p(effective_latency_ms / latency_target_ms) / log1p(latency_max_ms / latency_target_ms), 0, 1)`

If latency is unknown:

- `latency_score = 0.5`

### Throughput score

If `tokens_per_sec` exists:

- `throughput_score = clamp(log1p(tokens_per_sec) / log1p(throughput_target_tps), 0, 1)`

Else:

- `throughput_score = 0.5`

### Cost score

If `target_cost_per_request` exists and estimated request cost is known:

- `cost_score = clamp(1 - estimated_request_cost / target_cost_per_request, 0, 1)`

If cost is unknown:

- `cost_score = 0.5`

### Reliability score

If `failure_rate` exists:

- `reliability_score = clamp(1 - failure_rate, 0, 1)`

Else:

- `reliability_score = 0.7`

### Preference score

Start at `0.5`.

Apply:

- `+0.15` for local endpoints when `compute_preference = local`
- `-0.15` for remote endpoints when `compute_preference = local`
- `+0.15` for remote endpoints when `compute_preference = remote`
- `-0.15` for local endpoints when `compute_preference = remote`
- `0` net adjustment for `auto` and `hybrid`
- `+0.10` if endpoint satisfies at least one effective preferred capability beyond required ones
- `+0.10` if role binding exists and is `active` for the requested role

Clamp to `[0,1]`.

## 7.8 Strategy weights

The router must use the following default strategy weights:

### `balanced`

- quality: `0.30`
- latency: `0.20`
- throughput: `0.10`
- cost: `0.20`
- reliability: `0.15`
- preference: `0.05`

### `quality`

- quality: `0.50`
- latency: `0.10`
- throughput: `0.05`
- cost: `0.10`
- reliability: `0.20`
- preference: `0.05`

### `latency`

- quality: `0.15`
- latency: `0.45`
- throughput: `0.15`
- cost: `0.05`
- reliability: `0.15`
- preference: `0.05`

### `cost`

- quality: `0.15`
- latency: `0.10`
- throughput: `0.05`
- cost: `0.50`
- reliability: `0.15`
- preference: `0.05`

## 7.9 Unknown-metric redistribution rule

If a metric is unknown for **all eligible candidates** and the implementation uses a neutral constant for all of them, the router must redistribute that metric’s weight proportionally across the remaining metrics instead of allowing the metric to flatten the candidate comparison.

## 7.10 Tie-break rules

If `abs(total_score_a - total_score_b) <= 0.01`, the router must break ties in this order:

1. higher quality score,
2. lower effective latency,
3. higher reliability score,
4. lexicographically smaller `endpoint_id`.

## 7.11 Required fallback chain behavior

The router must return:

- a chosen endpoint,
- an ordered fallback chain of remaining eligible candidates.

Fallback order must follow the same total-score ordering after tie-break rules.

## 7.12 Required router decision content

The `RouterDecision` output must include:

- full eligibility set,
- scored candidate list,
- chosen endpoint,
- fallback chain,
- selection reasons,
- flags indicating measured/declared metric usage,
- scoring version.

## 7.13 Required conformance tests

The conformance suite must validate at minimum these cases using fixture-driven tests:

1. exclusion for missing required capability,
2. exclusion for missing required modality,
3. exclusion for insufficient context,
4. exclusion when tools are required but unsupported,
5. exclusion when remote use is forbidden by privacy policy,
6. exclusion when task is not supported by the role,
7. exclusion when role binding is inactive,
8. local preference changes selection when scores are otherwise near-equal,
9. observed measured quality beats declared-only candidates under `quality` strategy,
10. lower estimated cost wins under `cost` strategy,
11. deterministic tie-break by endpoint id,
12. preferred capabilities affect selection via preference score,
13. fallback chain ordering is deterministic,
14. unknown-metric redistribution behaves correctly.

Each fixture case must specify:

- input request context,
- endpoint identities,
- declared profiles,
- observed profiles,
- optional role/task/binding inputs,
- expected chosen endpoint,
- expected exclusion codes,
- expected selection reasons,
- expected fallback chain.

---

# 8. M2 acceptance criteria

M2 is complete only when all of the following are true:

1. the router consumes canonical protocol-shaped inputs,
2. role/task logic materially affects eligibility and selection,
3. all required exclusion reasons are emitted correctly,
4. all required selection reasons are emitted correctly,
5. score math follows the required normalization and weight rules,
6. tie-breaks are deterministic and fixture-proven,
7. conformance tests pass from fixture inputs rather than only hand-authored inline unit cases.

---

# 9. M3 — Observability linkage and empirical profiles

## 9.1 Required observability model

M3 must make the following chain real and testable:

`RouterDecision -> TraceSpan/TraceEvent -> UsageEvent -> ObservedPerformanceProfile`

This chain must be implemented as protocol data, not ad hoc log text.

## 9.2 Required linkage fields

The following linkage rules are mandatory:

- every `TraceSpan` must reference `request_id` and `routing_decision_id`,
- every `TraceEvent` must reference `request_id` and `routing_decision_id`,
- every `UsageEvent` must reference `request_id` and `routing_decision_id`,
- every recorded profile sample must reference `endpoint_id`,
- profile aggregation must be traceable back to input samples by endpoint and sample source.

## 9.3 Required sample model

The implementation must define and use an internal sample record structure for profile aggregation.

Each sample must include at minimum:

- `endpoint_id`
- `sample_source: benchmark | live_request`
- `recorded_at_ms`
- `latency_ms`
- `tokens_per_sec?`
- `cold_start_ms?`
- `failure_class?`
- `cost_per_1k_tokens_est?`
- `judge_score?`
- `request_id?`
- `routing_decision_id?`

This sample record may be internal rather than canonical protocol surface, but it must be explicitly implemented.

## 9.4 Required aggregation rules

The profile aggregator must aggregate multiple samples, not just one sample.

### Required minimum sample count behavior

- aggregation must work with one sample,
- `confidence_score` must increase as sample count increases,
- benchmark and live-request counts must be tracked separately.

### Required profile window behavior

The aggregator must produce:

- `sample_window.started_at_ms = min(sample.recorded_at_ms)`
- `sample_window.ended_at_ms = max(sample.recorded_at_ms)`

### Required latency aggregation

- `latency_ms_p50` must be the statistical median of sample latencies,
- `latency_ms_p95` must be the 95th percentile using a deterministic percentile implementation,
- the percentile function used must be documented and consistent across tests.

### Required throughput aggregation

If at least one sample has `tokens_per_sec`, aggregate using median.

### Required cost aggregation

If at least one sample has `cost_per_1k_tokens_est`, aggregate using median.

### Required failure aggregation

- `failure_rate = failed_sample_count / total_sample_count`
- `error_class_rates[class] = class_count / total_sample_count`

A sample counts as failed if `failure_class` is present.

### Required quality aggregation

If at least one sample has a `judge_score.score`, aggregate `quality_score` as the arithmetic mean of available judge scores.

If all samples omit judge scores, omit `quality_score`.

## 9.5 Freshness and confidence rules

These rules are mandatory.

### Freshness score

Let:

- `age_ms = now_ms - sample_window.ended_at_ms`
- `freshness_half_life_ms = 7 * 24 * 60 * 60 * 1000`

Compute:

- `freshness_score = exp(-ln(2) * age_ms / freshness_half_life_ms)`

Clamp to `[0,1]`.

### Confidence score

Let:

- `n = sample_size`

Compute:

- `confidence_score = clamp(log1p(n) / log1p(50), 0, 1)`

This means confidence saturates around 50 samples.

## 9.6 Benchmark vs live-request distinction

Observed performance profiles must preserve the distinction between:

- `sources.live_request_samples`
- `sources.benchmark_samples`

The implementation must not merge the two into an undifferentiated sample count.

## 9.7 Endpoint-version invalidation rule

If any input sample belongs to a different `endpoint_version` than the current aggregation target, the implementation must treat it as a different profile stream. Mixed-version aggregation is forbidden.

If `endpoint_version` is absent, aggregation may proceed by `endpoint_id` only.

## 9.8 Required trace and usage emission behavior

The reference smoke path used for validation must, for each routed request, emit all of the following artifacts or records:

1. a valid `RouterDecision`,
2. at least these spans:
   - `router.eligibility`
   - `router.scoring`
   - `router.selection`
3. a valid `UsageEvent`,
4. at least one valid `TraceEvent` of type `router.decision.created`,
5. a recorded sample that can update the observed performance profile.

## 9.9 Required observability conformance tests

The conformance suite must validate at minimum these cases:

1. a routed request emits a decision, spans, usage event, and profile sample with matching linkage ids,
2. multiple live-request samples aggregate into median p50/p95 values correctly,
3. benchmark samples and live-request samples are counted separately,
4. failure rate and error-class rates aggregate correctly,
5. freshness score decays as sample age increases,
6. confidence score increases as sample count increases,
7. mixed endpoint versions do not aggregate into one profile,
8. quality score is aggregated from judge scores only when present,
9. observed profile output validates against the canonical schema.

---

# 10. M3 acceptance criteria

M3 is complete only when all of the following are true:

1. router decision, trace spans/events, usage event, and profile samples are linked by ids consistently,
2. observed performance aggregation is multi-sample and deterministic,
3. benchmark and live-request samples remain distinguishable in the resulting profile,
4. freshness and confidence semantics are implemented exactly,
5. aggregated observed profiles validate against canonical schemas,
6. the router can consume observed profiles as measured inputs in M2 tests.

---

# 11. Required commands and CI expectations

The implementation must provide working local commands and CI steps for the following:

## 11.1 Schema validation

A command equivalent to:

```bash
pnpm --filter schema-tools validate
```

This must validate all canonical schemas and all golden fixtures.

## 11.2 Type generation

A command equivalent to:

```bash
pnpm --filter protocol-types generate
```

This must regenerate `packages/protocol-types` from canonical schemas.

## 11.3 Router and observability tests

A command equivalent to:

```bash
pnpm test
```

or explicit filtered commands that run:

- routing conformance tests,
- observability conformance tests,
- schema/tooling tests.

## 11.4 CI minimum

CI must fail if:

- schemas do not validate,
- fixtures do not validate,
- generated protocol types are stale,
- routing conformance fails,
- observability conformance fails.

---

# 12. Non-goals for this requirement

The implementation must not claim completion of this requirement by doing any of the following instead of the required work:

- adding placeholder READMEs for future providers,
- adding empty Rust crates,
- adding docs without implementing runtime conformance,
- adding benchmark package scaffolding without benchmark/profile linkage,
- adding browser/runtime adapters,
- adding package installer flows,
- adding memory backends,
- adding host UIs.

This requirement is about making the **protocol, router, and observability semantics real and stable**.

---

# 13. Definition of done

This requirement is complete only when all of the following statements are true:

1. the protocol schema layer is canonical, validated, generated, and fixture-backed,
2. the router reference implementation is deterministic and protocol-aligned,
3. role/task entities are not decorative and affect routing behavior,
4. routing conformance is fixture-driven and comprehensive for the baseline contract,
5. observability linkage is implemented as structured protocol data,
6. observed endpoint performance is aggregated from real samples using deterministic rules,
7. the repository now has a stable baseline that later hosts and providers can reuse without rewriting core semantics.
## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md`
- Preservation check:
  - the full preserved source requirement is embedded below the recursive-mode framing without narrowing it to a summary-only artifact
- Requirement coverage check:
  - `R1`-`R33` map the recursive tracking IDs onto the full normative requirement text
- Out-of-scope confirmation:
  - `OOS1`-`OOS8` explicitly capture the deferred and non-goal areas separated in the source requirement

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The canonical artifact adds recursive formatting without discarding the detailed source requirement
  - [x] Stable `R#` and `OOS#` identifiers are present for downstream traceability
  - [x] The named source copy remains preserved as a separate reference document
  - [x] Constraints and assumptions are limited to recursive-mode framing rather than replacing the source requirement
  - [x] The detailed requirement specification remains present in full
- Remaining blockers:
  - none

Approval: PASS
