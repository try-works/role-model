# role-model — Stable Baseline Requirements

## Document purpose

This document defines the **initial implementation requirement** for the `role-model` repository. It is intended to drive the first meaningful build phase from an empty repo to a **stable baseline** that is specific enough to validate after implementation.

This is not a high-level vision note. It is a concrete requirement document for the first implementation run.

---

## 1. Goal

Build a stable baseline for the **role-model protocol** and the **role-model-router** family that does all of the following:

1. establishes the canonical repository structure and ownership boundaries,
2. defines the protocol as code and docs rather than conversation,
3. implements a deterministic routing contract with conformance tests,
4. implements the observability contract needed for future dashboards,
5. introduces the missing role/task model explicitly,
6. ships a usable lightweight router host baseline for ACP, MCP, and CLI-based routing,
7. creates the correct extension points for browser and edge runtimes such as WebLLM, MediaPipe GenAI, MediaPipe text tasks, LiteRT, and LiteRT-LM,
8. reaches a repository state where later Pi, desktop, browser, and package-backed hosts can be added **without changing the core protocol shape**.

The outcome of this phase is a **stable baseline**, not a production-complete router platform.

---

## 2. Stable baseline definition

For this document, **stable baseline** means all of the following are true:

1. the repo layout is created exactly enough that future work has clear homes,
2. the protocol is captured in versioned docs and machine-readable schemas,
3. routing behavior is deterministic, explainable, and tested,
4. traces, usage events, and observed-performance profiles are protocol entities, not TODO notes,
5. roles and tasks are explicit protocol concepts with a concrete mapping to capabilities,
6. the lightweight router host can detect configured endpoints and produce routing decisions and observability artifacts,
7. future provider families already fit the protocol model even where their concrete runtime support is not yet fully implemented.

A stable baseline does **not** mean:

- all provider runtimes are fully implemented,
- all hosts are production-ready,
- Pocketmodel integration exists,
- model packs, EdgeHDF5, or full local memory are finished,
- benchmark dashboards exist,
- the desktop runtime exists.

---

## 3. In-scope phases

This requirement covers the equivalent of the following initial phases:

- **Phase A — Repo foundations and protocol lock**
- **Phase B — Routing contract and conformance**
- **Phase C — Observability contract and empirical profile baseline**
- **Phase D — Role/task model**
- **Phase E — Lightweight role-model-router baseline host**
- **Phase F — Browser and edge runtime support scaffolding**

These phases may be implemented in one run or in several implementation passes, but the resulting repository state must satisfy the full requirement below.

---

## 4. Out of scope for this baseline

The following are explicitly out of scope and must not be presented as complete:

1. full Pi daemon host,
2. full desktop router/runtime host,
3. full localhost OpenAI gateway with long-lived process management,
4. full EdgeHDF5 memory backend,
5. package publishing and marketplace flows,
6. model pack installation,
7. judge service hosting,
8. production-grade browser inference,
9. production-grade native LiteRT-LM integration,
10. production-grade ONNX, MLX, or GGUF native providers.

Scaffolding, protocol support, and adapter interfaces for later work are in scope. Claiming those systems as complete is out of scope.


## 5. Implementation language, tooling, and dependency baseline

This baseline must lock the implementation stack before repository scaffolding begins. The implementation must not leave language, package manager, schema source-of-truth, or validation tooling ambiguous.

### R0.1. Languages must be fixed

The baseline must use the following languages and artifact formats:

- **TypeScript** for root shared packages, router-side packages, CLIs, schema tooling, protocol-type generation, lightweight host logic, and browser/runtime-web scaffolding.
- **Rust** for native router hosts, native provider crates, native stores, and native benchmark/gateway components.
- **Markdown** for protocol, architecture, and decision documents.
- **JSON Schema** for canonical machine-readable protocol contracts.

No additional primary implementation language may be introduced in this baseline. Small shell scripts for repo automation are allowed, but Python, Go, or other languages must not become part of the baseline implementation surface.

### R0.2. Node and package-management baseline must be fixed

The repository must standardize on:

- **Node.js 22 LTS**
- **pnpm 10.x** workspaces at the repo root
- a root `package.json`
- a root `pnpm-workspace.yaml`

Using npm, yarn, bun, or multiple JS package managers in parallel is not allowed for this baseline.

### R0.3. TypeScript baseline must be fixed

The repository must standardize on:

- **TypeScript 5.6 or newer**
- **ESM-first** package configuration for TypeScript packages unless a package has a documented reason to emit both ESM and CJS
- one shared root `tsconfig` strategy, with package-level `tsconfig.json` files extending a root base config

The baseline must not allow package-by-package ad hoc compiler settings without a shared base config.

### R0.4. Rust baseline must be fixed

The repository must standardize on:

- **Rust stable**, pinned by `rust-toolchain.toml`
- a Cargo workspace rooted at `role-model-router/rust/`
- `cargo fmt` and `cargo clippy` as baseline Rust quality gates

The baseline must not require nightly Rust.

### R0.5. Protocol schema source-of-truth must be fixed

The canonical source of truth for protocol entities must be the JSON Schema files under `protocol/schemas/`.

This means:

- `protocol/schemas/*.schema.json` are authoritative for protocol shape
- generated TypeScript types in `packages/protocol-types/` must be derived from those schemas
- runtime validation in TypeScript must validate against those schemas
- Rust-side protocol parsing may mirror the schema definitions, but it must not redefine conflicting canonical protocol semantics

The baseline must not establish a competing second source of truth such as hand-maintained Zod models or hand-maintained TypeScript interfaces that drift from the canonical schema files.

### R0.6. TypeScript dependency baseline must be fixed

The baseline must include or standardize on the following TypeScript-side dependencies where they are relevant:

- `typescript`
- `ajv` for JSON Schema validation
- `ajv-formats` where schema formats are used
- `json-schema-to-typescript` for generated protocol types
- `vitest` for TypeScript package and router conformance tests
- `tsx` for local dev execution of TypeScript scripts and CLIs
- `@types/node`
- `commander` for Node-based CLIs unless a package documents another minimal CLI parser
- `@biomejs/biome` for formatting and TypeScript/JSON/Markdown-adjacent linting

This baseline must not introduce both Zod and Ajv as parallel primary validation systems for the protocol surface. Ajv plus canonical JSON Schema is the required baseline.

### R0.7. Rust dependency baseline must be fixed

The baseline must include or standardize on the following Rust-side dependencies where they are relevant:

- `serde`
- `serde_json`
- `thiserror`
- `anyhow`
- `tracing`
- `tracing-subscriber`
- `tokio` only for crates that actually require async runtime behavior such as gateway or host crates
- `clap` for Rust CLI entry points where applicable

Crates must not add large framework dependencies without a documented reason.

### R0.8. Runtime and adapter dependency policy must be explicit

The baseline must distinguish between:

- **core baseline dependencies**, which are required now to build the repo and protocol baseline
- **future runtime dependencies**, which are only added once the corresponding adapter/provider package is implemented beyond scaffolding

For this baseline:

- WebLLM, MediaPipe GenAI, MediaPipe text tasks, LiteRT, and LiteRT-LM must have reserved package or crate homes and documented integration targets
- those runtime libraries must **not** be added as unconditional hard dependencies at the repo root if the corresponding adapter/provider is only scaffolded
- if a scaffolded provider package does include a runtime dependency early, that package README must explain why it is already needed in the baseline

### R0.9. Quality gates and root commands must be fixed

The baseline must define and document root-level commands for at least:

- workspace install/bootstrap
- schema validation
- protocol type generation
- TypeScript tests
- Rust tests
- formatting/linting

The exact script names may vary, but they must be documented in the root `README.md` and must work from a clean checkout.


---

## 6. Required top-level repository structure

The repo **must** be created with this top-level structure:

```text
role-model/
  README.md
  LICENSE
  CLA.md
  protocol/
  docs/
  packages/
  role-model-router/
  testdata/
  .github/
```

### R1. Top-level ownership rules must be documented

The repo must contain `docs/architecture/01-repo-boundaries.md` that defines ownership boundaries for:

- `protocol/`
- `docs/`
- root `packages/`
- `role-model-router/`
- `testdata/`

This document must state clearly:

- `protocol/` is the canonical contract layer,
- root `packages/` contains shared protocol-wide infrastructure that is not router-specific,
- `role-model-router/` owns all routing capability and routing-adjacent runtime pieces,
- host-specific implementation must not redefine protocol semantics.

### R2. Initial directory layout must exist

At minimum, the following directories must exist:

```text
protocol/
  README.md
  schemas/
  fixtures/

docs/
  architecture/
  protocol/
  decisions/

packages/
  protocol-types/
  conformance/
  schema-tools/
  store-contract/
  packaging/

role-model-router/
  README.md
  skills/
  packages/
  apps/
  rust/

testdata/
  prompts/
  eval-cases/
  traces/
  endpoint-metadata/
```

Missing any of the directories above is a failure against this requirement.

---

## 7. Required protocol documentation

The following protocol and architecture docs must be created as actual `.md` files, not stubs with one-line placeholders.

### R3. Architecture docs required

The following files must exist under `docs/architecture/`:

- `00-overview.md`
- `01-repo-boundaries.md`
- `02-router-hosts.md`
- `03-observability-model.md`
- `04-benchmark-model.md`
- `05-memory-model.md`

Minimum expectations:

- `00-overview.md` explains the repo model and stable baseline objective.
- `01-repo-boundaries.md` defines ownership and anti-drift rules.
- `02-router-hosts.md` defines the host family: skill router, Pi/plugin/daemon router, desktop router/runtime host.
- `03-observability-model.md` explains traces, usage, observed performance, and dashboard-facing data.
- `04-benchmark-model.md` explains endpoint-centric benchmarking and capability-oriented suites.
- `05-memory-model.md` explains the MemoryStore contract boundary and explicitly states what is deferred.

### R4. Protocol docs required

The following files must exist under `docs/protocol/`:

- `capability-taxonomy.md`
- `endpoint-identity.md`
- `routing-policy.md`
- `profiles.md`
- `usage.md`
- `traces.md`
- `benchmarks.md`
- `roles.md`
- `tasks.md`
- `role-task-capability-mapping.md`
- `planspec.md`
- `manifests.md`
- `openai-compat.md`
- `reason-codes.md`

These documents must define actual semantics. They must not be empty placeholders.

### R5. Decision records required

The following decision records must exist under `docs/decisions/`:

- `0001-protocol-is-canonical.md`
- `0002-router-family-layout.md`
- `0003-endpoint-is-routing-unit.md`
- `0004-observed-performance-is-first-class.md`
- `0005-roles-and-tasks-are-protocol-entities.md`

---

## 8. Required protocol schemas

The baseline must define machine-readable schemas in `protocol/schemas/` for the following entities.

### R6. Required schema files

The following schema files must exist:

- `capability-taxonomy.schema.json`
- `endpoint-identity.schema.json`
- `routing-policy.schema.json`
- `declared-capability-profile.schema.json`
- `observed-performance-profile.schema.json`
- `usage-event.schema.json`
- `trace-event.schema.json`
- `trace-span.schema.json`
- `router-decision.schema.json`
- `benchmark-suite.schema.json`
- `benchmark-run.schema.json`
- `judge-score.schema.json`
- `role-definition.schema.json`
- `task-definition.schema.json`
- `role-binding.schema.json`
- `task-execution-profile.schema.json`
- `planspec.schema.json`
- `package-manifest.schema.json`
- `model-pack-manifest.schema.json`

### R7. Schemas must not be placeholders

Each schema must:

- be valid JSON,
- have a top-level `title`,
- define required fields,
- define types for core fields,
- encode enough structure that it can be used for validation,
- reflect the semantics described in the matching docs.

Stub schemas with only `type: object` and no meaningful properties are not acceptable.

---

## 9. Core protocol entities and field requirements

### R8. EndpointIdentity must be defined

`EndpointIdentity` must be a first-class protocol entity and must include, at minimum:

- `endpoint_id`
- `endpoint_kind`
- `provider_kind`
- `serving_source`
- `model_id`
- `package_id`
- `variant_id`
- `runtime_version`
- `quantization`
- `precision`
- `host_class`
- `device_class`
- `region`
- `org_scope`

The docs and schema must make clear that routing and benchmarking operate on concrete endpoint identities, not abstract model names.

### R9. DeclaredCapabilityProfile must be defined

`DeclaredCapabilityProfile` must include, at minimum:

- `endpoint_id`
- `capabilities`
- `modalities`
- `max_context_tokens`
- `tool_calling`
- `supports_embeddings`
- `platform_constraints`

### R10. ObservedPerformanceProfile must be defined

`ObservedPerformanceProfile` must include, at minimum:

- `endpoint_id`
- `measured_at_ms`
- `measurement_window`
- `sample_size`
- `judge_score`
- `latency_ms_p50`
- `latency_ms_p95`
- `tokens_per_sec`
- `cold_start_ms`
- `failure_rate`
- `error_class_rates`
- `cost_per_1k_tokens_est`
- `currency`
- `freshness_score`
- `confidence_score`

The docs must explicitly state that this entity captures **real-world endpoint behavior** and is not merely a model benchmark summary.

### R11. UsageEvent must be defined

`UsageEvent` must include, at minimum:

- `event_id`
- `timestamp_ms`
- `app_id`
- `org_id`
- `request_id`
- `routing_decision_id`
- `endpoint_id`
- `model_id`
- `package_id`
- `provider_kind`
- `tokens_in`
- `tokens_out`
- `latency_ms`
- `cost_estimate`
- `currency`
- `error_class`

### R12. TraceEvent and TraceSpan must be defined

The protocol must define trace event/span types covering, at minimum:

- router eligibility,
- router scoring,
- endpoint selection,
- model load,
- queue,
- prefill,
- decode,
- tool execution,
- fallback,
- retry,
- failure.

### R13. RouterDecision must be defined

`RouterDecision` must include, at minimum:

- `routing_decision_id`
- `request_id`
- `policy_snapshot`
- `eligible_candidates`
- `ineligible_candidates`
- `scored_candidates`
- `chosen_endpoint_id`
- `fallback_endpoint_ids`
- `selection_reasons`
- `used_measured`
- `used_declared`
- `scoring_version`

---

## 10. Roles, tasks, and capability mapping

### R14. Roles must be explicit protocol entities

The protocol must define `RoleDefinition` as a distinct concept and must not bury roles inside capability profiles.

`RoleDefinition` must include, at minimum:

- `role_id`
- `name`
- `description`
- `role_kind`
- `default_system_instructions`
- `task_types_supported`
- `required_capabilities`
- `preferred_capabilities`
- `forbidden_capabilities`
- `tool_policy`
- `routing_policy_overrides`
- `output_contracts`
- `safety_policy_refs`

### R15. Tasks must be explicit protocol entities

The protocol must define `TaskDefinition` as a distinct concept.

`TaskDefinition` must include, at minimum:

- `task_type`
- `description`
- `required_inputs`
- `required_capabilities`
- `preferred_capabilities`
- `quality_metrics`
- `allowed_roles`
- `default_benchmark_suites`

### R16. RoleBinding must be defined

The protocol must define `RoleBinding` linking roles to endpoints or hosts.

`RoleBinding` must include, at minimum:

- `binding_id`
- `role_id`
- `endpoint_id`
- `status`
- `policy_overrides`
- `effective_capabilities`
- `effective_task_types`

### R17. TaskExecutionProfile must be defined

The protocol must define `TaskExecutionProfile` to capture task-level execution expectations.

At minimum it must include:

- `task_type`
- `required_capabilities`
- `preferred_capabilities`
- `required_modalities`
- `output_constraints`
- `evaluation_suites`
- `default_routing_strategy`

### R18. Role/task/capability mapping must be documented

`docs/protocol/role-task-capability-mapping.md` must define the relationship:

- role → allowed task families,
- task → required/preferred capabilities,
- endpoint profile → eligibility for task execution,
- router → final selection based on role + task + endpoint evidence.

### R19. Default role and task examples must be included

The protocol docs must include concrete examples for at least the following roles:

- `general.chat`
- `coder.patch`
- `coder.review`
- `tool.agent`
- `embedder`
- `classifier`
- `language.detector`

The protocol docs must include concrete examples for at least the following tasks:

- `text.chat`
- `code.edit`
- `tools.function_calling`
- `embeddings.text`
- `text.classification`
- `text.language_detection`
- `json.schema_adherence`

---

## 11. Capability taxonomy requirements

### R20. The capability taxonomy must be expanded beyond chat

The capability taxonomy must include, at minimum:

- `text.chat`
- `text.translation`
- `text.instruction_following`
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
- `image.generation`
- `image.understanding`
- `audio.asr`
- `audio.tts`
- `adapter.lora_runtime`
- `decoding.constrained`

The taxonomy docs must define these as protocol-level capability identifiers rather than ad hoc strings.

---

## 12. Routing contract requirements

### R21. A deterministic routing policy must be implemented

The baseline must include a pure routing core under `role-model-router/packages/core/` that can evaluate candidates deterministically.

At minimum the routing core must support:

- hard eligibility checks,
- candidate scoring,
- deterministic tie-breaks,
- reason-code emission,
- fallback ordering.

### R22. Hard eligibility checks must exist

Eligibility checks must reject candidates for at least the following reasons:

- missing required capability,
- unsupported modality,
- insufficient context,
- tool support missing,
- provider or endpoint denied by policy,
- remote disallowed,
- budget exceeded,
- endpoint unavailable,
- package or variant incompatible,
- entitlement missing,
- endpoint revoked.

### R23. Reason codes must be defined and used

The implementation and docs must define exclusion and selection reason codes.

Minimum exclusion families:

- `CAPABILITY_MISSING`
- `MODALITY_UNSUPPORTED`
- `CONTEXT_TOO_SMALL`
- `TOOLS_UNSUPPORTED`
- `POLICY_DENY_ENDPOINT`
- `POLICY_DENY_REMOTE`
- `BUDGET_EXCEEDED`
- `PROVIDER_OFFLINE`
- `VARIANT_INCOMPATIBLE`
- `ENTITLEMENT_MISSING`
- `REVOKED`

Minimum selection families:

- `BEST_TOTAL_SCORE`
- `MEASURED_PROFILE_USED`
- `DECLARED_PROFILE_USED`
- `DEFAULT_PROFILE_USED`
- `LOCAL_PREFERENCE_APPLIED`
- `REMOTE_PREFERENCE_APPLIED`
- `BUDGET_OPTIMIZATION`
- `LOW_LATENCY_TARGET_MET`
- `HIGH_QUALITY_TARGET_MET`
- `FALLBACK_CHAIN_COMPUTED`

### R24. Routing inputs must include observed performance

The routing contract must define precedence roughly as:

1. hard constraints,
2. observed real-world performance,
3. benchmark-derived quality,
4. declared capability profile,
5. neutral defaults.

This precedence must be documented explicitly.

### R25. Tie-break behavior must be deterministic

If scores are tied within epsilon, the implementation must break ties deterministically. The tie-break sequence must be documented and covered by tests.

### R26. Routing conformance tests must exist

The repo must include golden tests for:

- capability exclusion,
- context exclusion,
- tool support exclusion,
- local preference,
- measured-profile precedence,
- cost strategy behavior,
- deterministic tie-break behavior.

At least one conformance test suite must be runnable in CI.

---

## 13. Observability and telemetry requirements

### R27. Observability is first-class

The implementation must treat traces, usage events, and observed performance as protocol-owned data, not logging leftovers.

### R28. Minimum request observability loop must be implemented

For the lightweight host path, a request must be able to produce:

1. a `RouterDecision`,
2. at least one `TraceEvent`/`TraceSpan` chain,
3. a `UsageEvent`,
4. optional observed-performance aggregation input.

### R29. Local persistence format must exist for the baseline

The baseline must implement a simple local persistence shape for observability artifacts. JSONL, structured JSON files, or equivalent local-file persistence is acceptable.

At minimum, the lightweight host must be able to write:

- traces,
- usage events,
- routing decisions.

This baseline storage must live under a clearly defined runtime output path and be documented.

### R30. Dashboard-facing observability views must be anticipated

The observability docs must define how the stored data can later power:

- endpoint leaderboard by capability,
- latency/cost/quality by serving source,
- local vs remote comparisons,
- quantization/build comparisons,
- routing decision explainability,
- per-application usage,
- regression detection,
- failure-class trends.

The dashboard does not need to be built now. The data model must support it.

---

## 14. Benchmark framework baseline requirements

### R31. Benchmarking must be endpoint-centric

The benchmark model must explicitly benchmark concrete endpoints as served, not only model families.

Benchmark definitions and docs must account for:

- backend/runtime,
- serving source,
- quantization,
- device class,
- cold/warm state,
- region or network path where relevant.

### R32. Benchmark schemas must be implemented

The baseline must include:

- `benchmark-suite.schema.json`
- `benchmark-run.schema.json`
- `judge-score.schema.json`

### R33. Capability-oriented benchmark fixtures must exist

The repo must include baseline fixture coverage for at least:

- `text.chat`
- `reasoning.multi_step`
- `code.chat`
- `code.edit`
- `tools.function_calling`
- `json.schema_adherence`
- `embeddings.text`

These fixtures may be small, but they must exist and be usable by a benchmark runner later.

### R34. Benchmark outputs must be designed to update observed performance

The benchmark docs and schema must define how benchmark outputs feed `ObservedPerformanceProfile` rather than existing as isolated reports.

---

## 15. Lightweight role-model-router baseline requirements

### R35. role-model-router must contain a lightweight host path

The baseline must create `role-model-router/skills/` entries and router-side packages such that a lightweight router host can be built without depending on the future desktop host.

Minimum required directories:

```text
role-model-router/
  skills/
    router/
    benchmark/
    detect-endpoints/
    export-config/
  packages/
    core/
    openai-compat/
    trace/
    usage/
    profile-aggregator/
    bench-core/
    bench-judge/
    provider-acp/
    provider-mcp/
    provider-cli/
    runtime-web/
  apps/
    bench-cli/
    router-devtools/
    gateway-smoke/
```

### R36. Endpoint detection baseline must exist

The lightweight host must include a baseline endpoint detection mechanism for ACP, MCP, and CLI-backed endpoints.

At minimum, the baseline must be able to:

- detect configured or declared candidate endpoints,
- normalize them into `EndpointIdentity` records,
- attach declared capability metadata,
- write the resulting data to a stable machine-readable format.

### R37. Config export tooling baseline must exist

The lightweight host must include a config export path for downstream apps or tools.

The exact external targets may be minimal, but the baseline must demonstrate:

- exporting selected endpoint/config metadata,
- generating a stable config artifact,
- documenting the config format.

### R38. The lightweight host must emit observability artifacts

At minimum, the lightweight host path must demonstrate:

- routing a request or synthetic request through the routing core,
- writing a routing decision,
- writing a trace artifact,
- writing a usage artifact.

The host does not need to execute a real model inference end-to-end for every provider family in this baseline, but it must exercise the protocol path end-to-end with at least synthetic or adapter-backed flows.

---

## 16. Browser and edge runtime support scaffolding

### R39. Browser and edge runtimes must fit the protocol now

The protocol and repo layout must be designed so the following runtime families are first-class citizens either natively or through adapters:

- WebLLM,
- MediaPipe GenAI / `@mediapipe/tasks-genai`,
- MediaPipe text tasks,
- LiteRT,
- LiteRT-LM.

This baseline does not need to fully implement all of them, but it must make them fit the model without protocol rewrites.

### R40. Provider kinds and endpoint kinds must already accommodate these runtimes

The protocol must include endpoint/provider kinds and documentation sufficient to model:

- browser-engine endpoints,
- native edge/embedded endpoints,
- adapter-backed endpoints,
- task-oriented endpoints such as embedder/classifier/language-detector, not only chat LLMs.

### R41. role-model-router package scaffolding must exist for these runtime families

At minimum, the following package directories must exist:

```text
role-model-router/packages/
  provider-webllm/
  provider-mediapipe-genai/
  provider-mediapipe-text/
  provider-litertlm-web/
  roles/
  tasks/
```

These may be scaffolds in the baseline, but they must include README or module-level docs stating their intended responsibility.

### R42. Native scaffolding must acknowledge future LiteRT-LM support

Under `role-model-router/rust/crates/`, the baseline must include placeholders or initial crate setup for:

- `rm_provider_litertlm/`
- `rm_provider_mediapipe_bridge/`

The implementation may be skeletal, but the repo must reserve these homes and document their purpose.

---

## 17. Root shared package requirements

### R43. protocol-types package must exist

`packages/protocol-types/` must provide generated types corresponding to the canonical protocol schemas. It must not become a second hand-maintained source of truth that can drift from `protocol/schemas/`.

### R44. conformance package must exist

`packages/conformance/` must contain or coordinate router conformance/golden tests.

### R45. schema-tools package must exist

`packages/schema-tools/` must include utilities or scripts for schema validation, generation, or checking.

### R46. store-contract package must exist

`packages/store-contract/` must define the storage interface boundary for future MemoryStore work, even if concrete backends are deferred.

### R47. packaging package must exist

`packages/packaging/` must hold shared manifest/package tooling for future package and model-pack work.

---

## 18. CI and validation requirements

### R48. CI baseline must exist

The repo must include GitHub workflow files that can run at least:

- lint or validation for schemas/docs where feasible,
- router conformance tests,
- basic package/app test execution for the baseline.

### R49. Validation commands must be documented

The repo root README or dedicated docs must document how to run:

- schema validation,
- routing conformance tests,
- lightweight host smoke tests,
- benchmark fixture validation if implemented.

---

## 19. README requirements

### R50. Root README must explain the actual repo

The root `README.md` must explain:

- what role-model is,
- what the protocol is,
- what `role-model-router` is,
- what the stable baseline includes,
- what is intentionally deferred,
- how to navigate the repo.

### R51. role-model-router README must explain the router family

`role-model-router/README.md` must explain:

- the host family,
- the purpose of the skills, packages, apps, and rust sections,
- what the lightweight baseline host can do,
- what later Pi and desktop hosts will add.

---

## 20. Minimum acceptance tests

Implementation is accepted only if all of the following are true.

### A. Repository and docs

- required top-level directories exist,
- required protocol docs exist,
- required architecture docs exist,
- required decision records exist,
- required README files exist.

### B. Schemas

- all required schema files exist,
- schemas are valid JSON,
- schemas define required fields meaningfully,
- roles/tasks schemas exist and are wired into docs.

### C. Routing

- pure routing logic exists,
- reason codes are emitted,
- tie-break behavior is deterministic,
- conformance tests exist and pass.

### D. Observability

- routing decisions can be persisted,
- traces can be emitted,
- usage events can be emitted,
- observed-performance semantics are documented.

### E. Lightweight host

- ACP/MCP/CLI endpoint detection baseline exists,
- endpoint identities can be emitted,
- synthetic or real route execution can emit artifacts,
- config export baseline exists.

### F. Future runtime support

- WebLLM, MediaPipe GenAI, MediaPipe text tasks, LiteRT, and LiteRT-LM all have protocol-level homes,
- the repo contains the required package/crate scaffolding for their future support,
- nothing in the baseline architecture blocks them.

---

## 21. Implementation order requirement

The implementation should proceed in this order unless a repository-local constraint forces a small variation:

1. initialize the root Node/pnpm workspace and the Rust toolchain/workspace,
2. create repo skeleton,
3. write architecture boundary docs,
4. write protocol docs,
5. create schemas,
6. implement protocol types and schema tooling,
7. implement pure routing core,
8. add conformance tests,
9. implement observability artifact emission,
10. add role/task packages and schemas,
11. add lightweight host scaffolding,
12. add browser/edge provider scaffolding,
13. wire CI.

The implementation must not begin with host-specific code before the protocol and routing contracts are defined.

---

## 22. Non-goal enforcement

The implementation must not do any of the following during this baseline in a way that confuses scope:

- claim full provider support for ONNX, MLX, LiteRT-LM, GGUF, WebLLM, or MediaPipe if only scaffolding exists,
- introduce Pocketmodel-specific product logic into the protocol,
- let a host implementation silently redefine protocol entities,
- skip the role/task layer and try to recover it later from prompts or profiles,
- treat logs as sufficient in place of trace/usage protocol artifacts.

---

## 23. Definition of success

This requirement is satisfied only when the repository has reached a state where:

1. the protocol is explicit, versionable, and testable,
2. the router contract is deterministic and explainable,
3. observability data is captured in protocol-shaped artifacts,
4. roles and tasks are first-class and connected to capability-based routing,
5. the lightweight router host path is real enough to exercise the protocol,
6. future native, browser, and edge runtime families have clean extension points,
7. later phases can build on this baseline without changing the core conceptual model.

