Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-04-12T05:53:09Z`
LockHash: `cf0cd75b8bd500fa1aa1b6ecf755ca38df640b3c7684d544c7f02411e989f4cc`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
- `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
Outputs:
- `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `01-protocol-routing-obs` into a concrete, requirement-safe implementation plan covering only the M1-M3 schema, routing, observability, and validation work required by run 01.

## TODO

- [x] Read Phase 1 (AS-IS) and Phase 0 (Requirements) artifacts
- [x] Define sub-phases for schema, router, and observability work
- [x] Specify concrete file changes and fixture additions
- [x] Define implementation steps in sequence
- [x] Design testing strategy with new, regression, and guardrail coverage
- [x] Document Playwright applicability
- [x] Define manual QA scenarios
- [x] Review relevant prior recursive evidence for the affected area
- [x] Assemble audit context bundle
- [x] Run phase audit
- [x] Repair gaps and re-audit until `Audit: PASS`
- [x] Create traceability mapping (R# -> planned change + validation)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Changes by File

- `protocol/schemas/capability-taxonomy.schema.json`: close the built-in taxonomy contract so canonical capability identifiers are enforced instead of left as arbitrary strings.
- `protocol/schemas/endpoint-identity.schema.json`: fix required-vs-optional fields, add `endpoint_version`, and constrain `endpoint_kind` / `provider_kind`.
- `protocol/schemas/declared-capability-profile.schema.json`: replace boolean `tool_calling` with the required object shape and tighten modality/value constraints.
- `protocol/schemas/observed-performance-profile.schema.json`: replace `measurement_window` with `sample_window`, add `sources`, and realign required optionality with the run-01 contract.
- `protocol/schemas/routing-policy.schema.json`: replace the older `prefer_local` / `budget_mode` model with the required compute, budget, privacy, and target structures.
- `protocol/schemas/role-definition.schema.json`: tighten role schema fields to match the stricter role/task contract actually used by router resolution.
- `protocol/schemas/task-definition.schema.json`: align task requirements and execution-shape fields with run-01.
- `protocol/schemas/role-binding.schema.json`: replace `experimental` with `candidate` and align binding semantics to the required status model.
- `protocol/schemas/task-execution-profile.schema.json`: add `role_id` and `routing_policy_patch` plus any missing execution-policy fields required by run-01.
- `protocol/schemas/router-decision.schema.json`: replace `eligible_candidates` / `ineligible_candidates[].reasons` with the required eligibility/exclusion structure.
- `protocol/schemas/trace-span.schema.json`: add linkage ids and replace `name` with required `span_type` semantics.
- `protocol/schemas/trace-event.schema.json`: add linkage ids and replace `message` with required `payload` semantics and event types.
- `protocol/schemas/usage-event.schema.json`: fix required optionality and add `sample_source`.
- `protocol/fixtures/router-golden/`: add canonical routing golden cases covering eligibility, scoring, role/task routing, filters, and tie rules.
- `protocol/fixtures/profile-golden/`: add profile aggregation fixtures covering mixed sample sources, deterministic windows, medians/percentiles, and freshness/confidence calculations.
- `protocol/fixtures/trace-golden/`: add observability linkage fixtures for trace spans/events and usage-event expectations.
- `packages/protocol-types/src/generated.ts`: regenerate protocol types from the updated schemas.
- `packages/schema-tools/src/validate-schemas.ts`: validate the required fixture corpus in addition to schemas and keep type generation aligned to the canonical schema set.
- `packages/conformance/src/router-conformance.test.ts`: replace hand-authored inline cases with fixture-driven routing conformance.
- `docs/protocol/routing-policy.md`: update the documented policy model to the stricter compute/budget/privacy/targets contract.
- `docs/protocol/profiles.md`: update observed-profile, sample-window, aggregation, freshness, and confidence documentation.
- `docs/protocol/traces.md`: update trace-span / trace-event linkage and canonical event/span shapes.
- `docs/protocol/usage.md`: update usage-event field requirements and sample-source expectations.
- `docs/protocol/roles.md`: document the stricter role/binding semantics needed by run-01.
- `docs/protocol/tasks.md`: document the stricter task and task-execution-profile semantics needed by run-01.
- `docs/protocol/role-task-capability-mapping.md`: align the documented routing inputs with required role/task/binding resolution.
- `docs/protocol/reason-codes.md`: update exclusion/selection reason-code coverage to match the stricter router-decision contract.
- `role-model-router/packages/core/src/types.ts`: replace older router-side protocol shapes with run-01-aligned request, policy, role/task, and decision types.
- `role-model-router/packages/core/src/reason-codes.ts`: add the missing exclusion and selection reason codes required by run-01.
- `role-model-router/packages/core/src/router.ts`: implement role/task-aware eligibility, normalized scoring, epsilon tie-breaks, fallback ordering, and unknown-metric redistribution.
- `role-model-router/packages/profile-aggregator/src/index.ts`: replace the single-sample aggregator with a traceable multi-sample aggregation path and required formulas.
- `role-model-router/packages/trace/src/index.ts`: emit run-01-compliant trace spans/events with linkage ids and canonical event/span types.
- `role-model-router/packages/usage/src/index.ts`: emit run-01-compliant usage events including `sample_source` where applicable.
- `role-model-router/packages/roles/src/index.ts`: keep default role fixtures aligned with the stricter role-definition contract used by router tests.
- `role-model-router/packages/tasks/src/index.ts`: keep default task fixtures aligned with the stricter task-definition contract used by router tests.
- `role-model-router/apps/gateway-smoke/src/index.ts`: emit router decision, trace, usage, and observed-profile artifacts using the stricter linkage/event/span/profile semantics.

## Implementation Steps

1. Align the canonical schema layer first so every downstream package compiles against the corrected M1 contract rather than the older baseline shapes.
2. Add the required `router-golden`, `profile-golden`, and `trace-golden` fixture directories and extend schema tooling so fixtures become part of the validation surface.
3. Regenerate shared protocol types and then realign router-side types so the core package stops carrying incompatible protocol assumptions.
4. Rework router reason codes, request/policy inputs, eligibility ordering, normalized scoring, tie-break behavior, and fixture-driven conformance coverage together so M2 lands as one coherent contract.
5. Rework profile aggregation, trace, usage, and gateway-smoke emission together so M3 uses the same corrected schema/type vocabulary end to end.
6. Update the directly coupled protocol docs so the repository’s human-readable contract stays consistent with the implementation and canonical schemas.
7. Run the existing validation, test, and smoke commands in the planned sequence, keeping repo-wide formatting drift scoped to the known baseline issue rather than broadening run 01.

## Testing Strategy

- New behavior tests:
  - fixture-driven router conformance covering provider filters, role/task/binding resolution, normalized scoring, compute preference, budget/privacy gates, epsilon tie-breaks, and unknown-metric redistribution
  - profile aggregation tests covering mixed sample sources, deterministic `sample_window`, p50/p95, median throughput/cost, freshness, and confidence formulas
  - observability linkage tests covering canonical trace span/event shapes, required ids, and usage/profile linkage
- Regression tests:
  - existing workspace package tests via `corepack pnpm -r --if-present test`
  - existing Rust workspace tests via `cargo test --manifest-path role-model-router/rust/Cargo.toml --workspace`
- Guardrail tests:
  - schema validation plus fixture validation via `corepack pnpm run schemas:validate`
  - regenerated type output via `corepack pnpm run types:generate`
  - gateway smoke protocol emission via `corepack pnpm run smoke`
- Commands:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run types:generate`
  - `corepack pnpm -r --if-present test`
  - `cargo test --manifest-path role-model-router/rust/Cargo.toml --workspace`
  - `corepack pnpm run smoke`

## Playwright Plan (if applicable)

- Not applicable for run 01.
- Rationale: this requirement is protocol, router, and observability focused and does not introduce a browser UI or an existing Playwright harness.

## Manual QA Scenarios

1. **Schema and fixture contract check**
   - Steps:
     - Run `corepack pnpm run schemas:validate`
     - Inspect `protocol/fixtures/router-golden/`, `profile-golden/`, and `trace-golden/`
   - Expected:
     - schemas validate successfully
     - fixture directories exist with human-readable golden cases that match the new canonical schema shapes

2. **Router conformance sanity check**
   - Steps:
     - Run `corepack pnpm -r --if-present test`
     - Inspect the fixture-driven conformance expectations for role/task routing, provider filters, and tie-break behavior
   - Expected:
     - conformance tests pass without reverting to inline-only test data
     - router decisions and reason codes align with the run-01 contract

3. **Observability smoke check**
   - Steps:
     - Run `corepack pnpm run smoke`
     - Inspect `runtime-output/gateway-smoke/` artifacts
   - Expected:
     - router decision, trace spans/events, usage event, and observed profile are linked by consistent ids
     - trace artifacts include required event/span types and the observed profile reflects the stricter aggregation shape

## Idempotence and Recovery

- Re-running `corepack pnpm run schemas:validate`, `corepack pnpm run types:generate`, `corepack pnpm -r --if-present test`, and `corepack pnpm run smoke` should be safe because generated and smoke outputs stay within existing documented/generated paths.
- If a schema or fixture change breaks generated types, repair the canonical schema or fixture first and rerun type generation rather than patching generated output by hand.
- If router behavior and conformance fixtures diverge, fix the router or the fixture expectations together; do not bypass the fixture loader or weaken assertions.
- If smoke output drifts, clear only the runtime output directory and rerun `corepack pnpm run smoke`; do not write artifacts into tracked source trees.

## Implementation Sub-phases

### SP1. Canonical schemas, docs, and fixture layout

Scope and purpose:
Realign the M1 protocol surface so schemas, directly coupled protocol docs, and required fixture directories all describe the same stricter run-01 contract before implementation code is changed.
Requirement mapping: `R1`, `R2`, `R5`, `R6`, `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13`, `R14`, `R15`, `R16`, `R31`, `R32`, `R33`

Implementation checklist:
- [ ] Update the canonical schema files under `protocol/schemas/` to the run-01 field, enum, and required/optional shapes
- [ ] Create `protocol/fixtures/router-golden/`, `protocol/fixtures/profile-golden/`, and `protocol/fixtures/trace-golden/`
- [ ] Update directly coupled docs under `docs/protocol/`

Tests for this sub-phase:
- `corepack pnpm run schemas:validate`
- `corepack pnpm run types:generate`

Sub-phase acceptance:
- A human can inspect the schema files, matching docs, and fixture directories and see a single coherent M1 contract.

Rollback / recovery notes:
- If a schema/file pair disagree, fix the schema and regenerate dependent outputs instead of preserving duplicate contract definitions.

### SP2. Schema tooling and generated/shared protocol types

Scope and purpose:
Make the schema layer executable by validating the fixture corpus and regenerating shared protocol types so later router and observability code can rely on the corrected contract.
Requirement mapping: `R2`, `R3`, `R4`, `R5`, `R6`, `R16`, `R31`, `R33`

Implementation checklist:
- [ ] Extend `packages/schema-tools/src/validate-schemas.ts` to validate the required fixtures
- [ ] Regenerate `packages/protocol-types/src/generated.ts`
- [ ] Reconcile any shared router/runtime type imports that should use canonical generated shapes

Tests for this sub-phase:
- `corepack pnpm run schemas:validate`
- `corepack pnpm run types:generate`
- `corepack pnpm -r --if-present test`

Sub-phase acceptance:
- The schema tooling validates both schemas and the required fixture corpus, and generated types match the corrected protocol contract.

Rollback / recovery notes:
- If fixture validation becomes too brittle, repair the fixtures or loader rules precisely; do not remove fixture validation from the planned command surface.

### SP3. Router contract, reason codes, and fixture-driven conformance

Scope and purpose:
Implement the stricter M2 router contract as one coherent change across router-side types, reason codes, eligibility, scoring, tie-break behavior, fallback ordering, and fixture-driven conformance.
Requirement mapping: `R2`, `R12`, `R13`, `R14`, `R15`, `R17`, `R18`, `R19`, `R20`, `R21`, `R22`, `R23`, `R31`, `R33`

Implementation checklist:
- [ ] Update router-side protocol types in `role-model-router/packages/core/src/types.ts`
- [ ] Add missing exclusion/selection reason codes in `role-model-router/packages/core/src/reason-codes.ts`
- [ ] Implement role/task/binding-aware eligibility and normalized scoring in `role-model-router/packages/core/src/router.ts`
- [ ] Replace the inline router conformance cases with fixture-driven tests in `packages/conformance/src/router-conformance.test.ts`

Tests for this sub-phase:
- `corepack pnpm -r --if-present test`
- `corepack pnpm run schemas:validate`

Sub-phase acceptance:
- A human can read a fixture case, run the conformance suite, and see the router produce the expected eligibility, scoring, fallback, and reason-code results.

Rollback / recovery notes:
- If the router and fixture expectations disagree, repair the router contract or the canonical fixture expectation; do not add ad hoc test-only behavior.

### SP4. Observability linkage, aggregation, and smoke-path repair

Scope and purpose:
Implement the stricter M3 contract end to end by making aggregation multi-sample and protocol-real, and by aligning emitted trace, usage, and observed-profile artifacts with the corrected schema layer.
Requirement mapping: `R2`, `R11`, `R15`, `R24`, `R25`, `R26`, `R27`, `R28`, `R29`, `R30`, `R31`, `R33`

Implementation checklist:
- [ ] Replace the single-sample profile aggregator with deterministic multi-sample logic in `role-model-router/packages/profile-aggregator/src/index.ts`
- [ ] Align `role-model-router/packages/trace/src/index.ts` and `role-model-router/packages/usage/src/index.ts` with the stricter linkage/event shapes
- [ ] Update `role-model-router/apps/gateway-smoke/src/index.ts` to emit the required router decision, trace, usage, and observed-profile linkage contract

Tests for this sub-phase:
- `corepack pnpm -r --if-present test`
- `corepack pnpm run smoke`
- `corepack pnpm run schemas:validate`

Sub-phase acceptance:
- The smoke app emits linked protocol-real observability artifacts, and the aggregation path can be traced back to input samples by endpoint and sample source.

Rollback / recovery notes:
- If smoke-path output drifts, repair the emitting package or schema alignment; do not loosen required linkage fields or event/span names to make tests pass.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
- `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
- `/.recursive/run/01-protocol-routing-obs/evidence/review-bundles/01-as-is-phase-auditor.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `recursive-subagent` and delegated task tooling remain available in this session.
Delegation Decision Basis: `Phase 2 is an ExecPlan synthesis artifact that must stay tightly aligned to the locked Phase 1 findings and the controller's intended change ordering, so the plan was authored and audited directly against the locked upstream artifacts.`
Delegation Override Reason: `A delegated planning bundle would add overhead without improving accuracy because the controller already holds the locked requirements, locked AS-IS gap set, and exact intended write surface for the upcoming TDD implementation phase.`
Audit Inputs Provided:
- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
- `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
- Changed files:
  - `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- Targeted code references:
  - `/protocol/schemas/`
  - `/protocol/fixtures/`
  - `/packages/protocol-types/src/generated.ts`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/conformance/src/router-conformance.test.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/trace/src/index.ts`
  - `/role-model-router/packages/usage/src/index.ts`
  - `/role-model-router/packages/roles/src/index.ts`
  - `/role-model-router/packages/tasks/src/index.ts`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
- `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Earlier Phase Reconciliation

- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`:
  - each in-scope `R1`-`R33` is mapped to a planned file set, sub-phase, and validation path without widening scope into the deferred milestones
- `/.recursive/run/01-protocol-routing-obs/01-as-is.md`:
  - the blocked schema, router, observability, fixture, and command gaps now have an ordered repair plan that preserves the already-correct baseline surfaces

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
  - `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
  - `/package.json`
  - `/protocol/schemas/`
  - `/protocol/fixtures/`
  - `/packages/protocol-types/src/generated.ts`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/conformance/src/router-conformance.test.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/trace/src/index.ts`
  - `/role-model-router/packages/usage/src/index.ts`
  - `/role-model-router/packages/roles/src/index.ts`
  - `/role-model-router/packages/tasks/src/index.ts`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`
- Acceptance Decision: `rejected`
- Refresh Handling: `no delegated planning record was relied on; the Phase 2 plan is controller-authored and self-audited against the locked requirements and AS-IS artifacts`
- Repair Performed After Verification: `none`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Comparison reference: `working-tree`
- Normalized baseline: `c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Planned or claimed changed files:
  - `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- Actual changed files reviewed:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
  - `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- Unexplained drift:
  - none; the run folder is still untracked, so `git status --short --untracked-files=all` remains the meaningful source for run-local artifact scope

## Gaps Found

- none; the locked Phase 1 product gaps are intentionally carried into this plan as planned work rather than remaining phase-audit defects.

## Repair Work Performed

- none

## Requirement Completion Status

- R1 | Status: blocked | Rationale: scope and milestone boundaries are planned but not yet enforced through implementation. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned across SP1-SP4 with explicit scope discipline.
- R2 | Status: blocked | Rationale: the required repo outcomes are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned across SP1-SP4.
- R3 | Status: blocked | Rationale: the implementation baseline is preserved, but the run-01-specific work is only planned in Phase 2. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned across SP2-SP4.
- R4 | Status: blocked | Rationale: the fixed toolchain and validation command usage are planned but not yet updated for run-01 coverage. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned across SP2-SP4 and `## Testing Strategy`.
- R5 | Status: blocked | Rationale: canonical source-of-truth cleanup is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1-SP3.
- R6 | Status: blocked | Rationale: the required schema files, fixture directories, and package outcomes are planned but not yet updated to the run-01 contract. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1-SP4.
- R7 | Status: blocked | Rationale: schema strictness and enum closure work is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R8 | Status: blocked | Rationale: capability taxonomy tightening is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R9 | Status: blocked | Rationale: endpoint identity repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R10 | Status: blocked | Rationale: declared capability profile repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R11 | Status: blocked | Rationale: observed-performance-profile repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP4.
- R12 | Status: blocked | Rationale: routing-policy repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP3.
- R13 | Status: blocked | Rationale: role/task/binding/profile schema repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP3.
- R14 | Status: blocked | Rationale: router-decision schema repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP3.
- R15 | Status: blocked | Rationale: trace/usage schema and reason-code repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP1, SP3, and SP4.
- R16 | Status: blocked | Rationale: M1 acceptance is planned but not yet reached. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned across SP1-SP2 plus `## Testing Strategy`.
- R17 | Status: blocked | Rationale: the routing contract update is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R18 | Status: blocked | Rationale: role/task/binding input support is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R19 | Status: blocked | Rationale: exact eligibility ordering is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R20 | Status: blocked | Rationale: normalized scoring and strategy behavior are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R21 | Status: blocked | Rationale: tie-break and fallback behavior repair is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R22 | Status: blocked | Rationale: fixture-driven conformance is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R23 | Status: blocked | Rationale: M2 acceptance is planned but not yet reached. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP3 plus `## Testing Strategy`.
- R24 | Status: blocked | Rationale: protocol-real observability linkage is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R25 | Status: blocked | Rationale: multi-sample profile aggregation is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R26 | Status: blocked | Rationale: deterministic aggregation rules are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R27 | Status: blocked | Rationale: freshness/confidence computation and invalidation are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R28 | Status: blocked | Rationale: trace/usage emission repair and observability conformance are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP4 and `## Manual QA Scenarios`.
- R29 | Status: blocked | Rationale: M3 acceptance is planned but not yet reached. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP4 plus `## Testing Strategy`.
- R30 | Status: blocked | Rationale: the M3 validation surface is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned in SP4 plus `## Testing Strategy`.
- R31 | Status: blocked | Rationale: command and CI coverage for the stricter contract is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned across SP1-SP4 and `## Testing Strategy`.
- R32 | Status: blocked | Rationale: non-goal discipline is planned but not yet proven through implementation. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Preserved in `## Planned Changes by File`, `## Implementation Steps`, and `## Idempotence and Recovery`.
- R33 | Status: blocked | Rationale: the run-01 definition of done is planned but not yet reached. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md` | Audit Note: Planned across SP1-SP4 and the validation/QA sections.

## Audit Verdict

- Audit summary: the plan is concrete, ordered, and narrow enough to repair the full run-01 M1-M3 gap surface without widening into the explicitly deferred milestones.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13`, `R14`, `R15`, `R16` -> planned schema, fixture, shared-type, tooling, and directly coupled protocol-doc work is captured in `## Planned Changes by File`, `## Implementation Steps`, and `## Implementation Sub-phases` SP1 and SP2. | Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- `R17`, `R18`, `R19`, `R20`, `R21`, `R22`, `R23` -> planned router, reason-code, eligibility, scoring, fallback, and fixture-driven conformance work is captured in SP3 plus `## Testing Strategy`. | Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- `R24`, `R25`, `R26`, `R27`, `R28`, `R29`, `R30` -> planned observability linkage, aggregation, smoke-path repair, and validation work is captured in SP4 plus `## Testing Strategy` and `## Manual QA Scenarios`. | Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- `R31`, `R32`, `R33` -> planned command coverage, non-goal discipline, and definition-of-done closure are captured in `## Implementation Steps`, `## Testing Strategy`, `## Idempotence and Recovery`, and `## Implementation Sub-phases`. | Evidence: `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
- Requirement coverage check:
  - `R1`-`R33`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS8`: preserved; the plan does not expand into benchmark-runner expansion, full host usability, native hosts, memory/package integration, or production browser/native provider work beyond the minimum support needed to validate M1-M3

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the plan translates every locked Phase 1 gap cluster into concrete file changes and validation paths
  - the implementation order keeps schemas and fixtures ahead of router/runtime behavior changes
  - the testing and smoke commands already exist in the repo and are named exactly
  - no required Phase 2 section is missing
- Remaining blockers:
  - none

Approval: PASS
