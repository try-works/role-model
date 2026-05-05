Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-04-24T21:09:36Z`
LockHash: `e0bcdeb28a83ae85f979ece001e61aafbd63a32abdaf54d7ae2b684e76d691ec`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- Current repo control-plane context from `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, and `/.recursive/memory/domains/role-model-baseline.md`
Outputs:
- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
Scope note: This document converts the preserved external requirement into stable run-specific requirement identifiers, acceptance criteria, and scope boundaries for the next baseline-hardening run.

## TODO

- [x] Preserve the source requirement inside the run folder as a canonical verification reference
- [x] Derive stable requirement identifiers from the preserved source requirement
- [x] Record observable acceptance criteria for the M1-M3 work block
- [x] Record explicit out-of-scope boundaries, including deferred M4/M5/M6-M8 work
- [x] Capture constraints and assumptions needed for later AS-IS analysis
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Freeze the canonical M1 schema, fixture, and generated-type contract

Description:
The canonical protocol layer under `/protocol/schemas/`, `/protocol/fixtures/`, `/packages/protocol-types/`, `/packages/schema-tools/`, and the directly coupled protocol docs must satisfy the preserved source requirement's M1 contract as one coherent baseline.

Acceptance criteria:
- the canonical schema set remains complete, internally consistent, and sufficient for the router and observability surfaces required by the preserved source requirement
- valid, invalid, minimal, and edge-case fixtures exist for the required router, trace, usage, profile, and role/task fixture families
- generated protocol types remain derived from the canonical schemas with no handwritten duplication of canonical protocol entities
- any schema-semantic changes needed for this run are reflected in the directly coupled protocol docs listed by the preserved source requirement

### `R2` Harden the TypeScript router into the reference M2 routing implementation

Description:
The router under `/role-model-router/packages/core/` must satisfy the preserved source requirement's M2 contract as the deterministic, explainable, role/task-aware reference implementation for current routing behavior.

Acceptance criteria:
- routing uses only canonical internal strategies and normalizes any accepted aliases at the boundary
- the eligibility pipeline is deterministic and emits explicit exclusion codes for every ineligible candidate
- scored candidates expose explicit metric breakdowns, tie-break diagnostics, metric source metadata, selection reasons, fallback chain, and the applied policy snapshot
- role definitions, task definitions, and role bindings materially affect routing exactly through the merged effective policy/capability model required by the preserved source requirement

### `R3` Prove the routing contract through fixture-driven conformance

Description:
The router contract must be enforced through deterministic fixture-driven conformance rather than only inline tests.

Acceptance criteria:
- the conformance harness reads routing cases from `/protocol/fixtures/router-golden/cases/`
- the required positive and negative golden cases from the preserved source requirement are present or explicitly superseded by stronger equivalent cases
- fixture-driven routing conformance passes and remains aligned with the canonical router-decision schema

### `R4` Implement stable M3 observability linkage and empirical profile semantics

Description:
The trace, usage, and profile-aggregation packages must satisfy the preserved source requirement's M3 contract so that decision, trace, usage, and observed-performance artifacts form one stable, testable protocol data model.

Acceptance criteria:
- observed-performance aggregation uses a consistent internal sample model and supports multi-sample aggregation across benchmark and live-request sources
- freshness and confidence are implemented as explicit bounded formulas in code
- endpoint-version mismatch behavior is explicit and tested
- trace and usage artifacts carry the required request-level and routing-decision linkage semantics and invalid linkage is detectable in tests

### `R5` Make the smoke path a real end-to-end validation harness

Description:
The gateway-smoke app must act as the run's stable validation harness for the M1-M3 contract rather than only emitting best-effort files.

Acceptance criteria:
- the smoke path can execute at least one fixture-driven router case using the canonical routing and observability surfaces
- emitted router-decision, trace, usage, and observed-performance artifacts are validated against the canonical schemas before the app exits
- smoke execution fails when linkage is broken or emitted artifacts are schema-invalid

## Out of Scope

- `OOS1`: native Rust router hosts, desktop runtime host, Pi daemon host, and other M6-native host expansion
- `OOS2`: memory backend, package/model-pack loading, install/update flows, or other M7 integration work
- `OOS3`: real browser-local inference integrations, runtime-web expansion, or other M8 work
- `OOS4`: benchmark orchestration, judge-service expansion, discovery integrations, or other M4/M5 work beyond the minimum support explicitly allowed by the preserved source requirement
- `OOS5`: unrelated repo-wide formatting or hygiene cleanup not required to satisfy `R1`-`R5`

## Constraints

- The preserved canonical verification reference for this run is `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`.
- Later phases must treat the preserved source requirement as the external specification and this file as the run-local stable identifier map.
- The run must stay within the M1-M3 baseline-hardening block and only allow the minimum M4/M5 support explicitly permitted by the preserved source requirement.
- Current repo truths recorded in `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, and `/.recursive/memory/domains/role-model-baseline.md` are upstream context, not proof that any new run requirement is already satisfied.

## Assumptions

- The next run will begin from the current `main` tip `bab6799` and use Phase 1 AS-IS analysis to determine which portions of the preserved requirement are already satisfied versus still missing.
- The preserved source requirement is authoritative for scope and final verification even if later implementation planning narrows the initial execution slices.
- Existing command-path reliability and in-file schema `$id` behavior from run `02-audit-remediation` remain part of the baseline rather than needing to be reintroduced by this run.

## Detailed Source Traceability

- Source reference: `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `R1` derives from `M1 — Core protocol schema freeze`, including generated type enforcement, fixture expansion, schema tightening, and docs alignment.
- `R2` derives from `M2 — Routing contract and conformance`, including canonical strategies, eligibility pipeline, exclusion/selection reason codes, metric precedence, redistribution, tie-breaks, and role/task-aware routing.
- `R3` derives from `M2.13` and `M2.14`, which require fixture-driven router conformance and the named golden cases.
- `R4` derives from `M3 — Observability linkage and empirical profile semantics`, including unified samples, source separation, multi-sample aggregation, freshness/confidence formulas, version safety, trace semantics, and usage linkage.
- `R5` derives from `M3.10`, `M3 required tests`, and `Deliverable D4`, which require gateway-smoke to act as a validation harness that fails on invalid linkage or invalid outputs.

## Coverage Gate

- [x] The preserved source requirement is stored inside the run folder as a canonical verification reference
- [x] Stable requirement identifiers and acceptance criteria were derived from the preserved source requirement
- [x] Out-of-scope boundaries, constraints, assumptions, and source traceability were recorded

Coverage: PASS

## Approval Gate

- [x] The run now has a stable, repo-local requirements document for later audited phases
- [x] The preserved source requirement and the run-local requirement map are specific enough to support Phase 0 and later verification

Approval: PASS
