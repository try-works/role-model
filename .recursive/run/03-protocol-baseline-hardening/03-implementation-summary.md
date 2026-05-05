Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `03 Implementation`
Status: `LOCKED`
LockedAt: `2026-05-05T00:44:58Z`
LockHash: `bce1a85cc42e422b6471138b82797b316ca1f99d34386fb974290123cf178356`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`
Outputs:
- `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
Scope note: This artifact records the strict-TDD implementation of the M1-M3 protocol hardening run, including schema and fixture expansion, router-contract hardening, observability linkage helpers, and the fixture-driven smoke harness.

## TODO

- [x] Re-read the locked Phase 2 plan before editing code
- [x] Capture RED evidence for the routing-contract slice
- [x] Capture RED evidence for the observability slice
- [x] Harden the canonical schemas, fixtures, docs, and generated types
- [x] Harden the router core and fixture-driven conformance layer
- [x] Harden the profile, trace, usage, and smoke observability path
- [x] Capture GREEN evidence for schema, router, observability, and root validation
- [x] Complete the implementation audit sections and gates

## Changes Applied

- `protocol/schemas/router-decision.schema.json`: required `app_id` and stable `org_id`, expanded exclusion and selection vocabularies, richer `scored_candidates[*]`, and explicit metric-entry plus tie-break structure.
- `protocol/schemas/observed-performance-profile.schema.json`: replaced `sample_window` with `measurement_window`, required `endpoint_version`, tightened `sources`, and aligned the public aggregate profile to the preserved requirement.
- `protocol/schemas/role-binding.schema.json`: replaced the old `candidate` vocabulary with `active|inactive|disabled`.
- `protocol/fixtures/router-golden/`, `profile-golden/`, `trace-golden/`, `usage-golden/`, and `role-task-golden/`: expanded coverage to valid, invalid, minimal, and edge fixtures and added the missing router golden cases required for the hardened contract.
- `packages/schema-tools/src/validate-schemas.ts` and `packages/schema-tools/test/validate-schemas.test.ts`: replaced the old 12-fixture assumption with an explicit validation manifest, validated invalid fixtures as intentional failures, and proved family/category coverage in tests.
- `packages/protocol-types/src/generated.ts`: regenerated the canonical protocol type layer from the hardened schemas.
- `packages/conformance/src/*.test.ts`: strengthened router, schema, observability, and smoke conformance so the test layer asserts the hardened public contract rather than the older run-01 surface.
- `role-model-router/packages/core/src/types.ts`, `reason-codes.ts`, and `router.ts`: aligned router helper types to canonical generated protocol types, added the required exclusion/selection vocabulary, enforced role/task/binding-effective restrictions, and emitted full scored-candidate diagnostics.
- `role-model-router/packages/profile-aggregator/src/index.ts`: migrated the sample model to `source_type`/`timestamp_ms`, emitted `measurement_window` plus `endpoint_version`, and added runtime profile-consistency validation.
- `role-model-router/packages/trace/src/index.ts` and `role-model-router/packages/usage/src/index.ts`: added read helpers, linkage validators, and usage summarization helpers.
- `role-model-router/apps/gateway-smoke/src/index.ts`: switched to a fixture-driven router input, validated emitted artifacts against canonical schemas, re-read persisted trace and usage artifacts, and failed on broken linkage.
- `docs/protocol/*.md`: refreshed the public protocol docs so the hardened schema, routing, trace, usage, and benchmark semantics are described in prose rather than only in tests.

## Sub-phase Implementation Summary

- `SP1`:
  - hardened the router-decision, observed-performance, and role-binding schemas
  - expanded fixture families and added manifest-driven schema validation for valid and invalid fixtures
  - regenerated the canonical protocol types and refreshed the directly coupled protocol docs
- `SP2`:
  - hardened router helper types and reason-code vocabulary
  - enforced role, task, and binding-effective restrictions in the deterministic router
  - widened fixture-driven router conformance to the stronger router-decision surface
- `SP3`:
  - migrated observed-profile aggregation to the canonical sample vocabulary
  - added trace and usage linkage helpers plus usage summaries
  - validated the observability model through direct helper tests and smoke assertions
- `SP4`:
  - made `gateway-smoke` load a fixture-driven routing case
  - validated router, trace, usage, and observed-performance outputs against schemas and linkage helpers before exit

## Plan Deviations

- `packages/conformance/src/protocol-schema-conformance.test.ts` was updated during the final validation sweep even though it was not called out explicitly in Phase 2.
  - Reason: the root `corepack pnpm run test` chain still encoded the older `sample_window` and `candidate` expectations, so the broader conformance suite had to be aligned to the hardened baseline before Phase 4 could pass.
  - Scope impact: none beyond keeping the existing broad schema-conformance layer consistent with the intended M1 contract.

## TDD Compliance Log

**The Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

TDD Mode: strict

RED Evidence:
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`

GREEN Evidence:
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schema-tools-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/observability-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/test-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/smoke-green.log`

TDD Compliance: PASS

### Requirements `R1` and `R3` (schema, fixture, and conformance hardening)

**RED Phase:**
- Command: `corepack pnpm --filter @role-model/conformance exec vitest run src/router-fixture-conformance.test.ts src/router-conformance.test.ts src/router-role-task-eligibility.test.ts`
- Expected failure: the router-conformance layer should fail because the hardened router decision contract, router case corpus, and binding-aware exclusions were not yet implemented.
- Actual failure: the red log shows missing required router fixtures plus missing `FORBIDDEN_CAPABILITY_PRESENT`, `ROLE_BINDING_*`, and richer scored-candidate behavior.
- RED verified: PASS

**GREEN Phase:**
- Implementation: hardened router-decision and role-binding schemas, expanded the fixture corpus, updated schema-tools fixture validation, regenerated protocol types, and aligned the router conformance surface to the stronger contract.
- Commands: `corepack pnpm --filter @role-model/schema-tools exec vitest run test/validate-schemas.test.ts test/generate-protocol-types.test.ts`, `corepack pnpm --filter @role-model/conformance exec vitest run src/protocol-fixture-conformance.test.ts src/router-fixture-conformance.test.ts src/router-conformance.test.ts src/router-role-task-eligibility.test.ts`
- Result: both schema-tools and router conformance slices are green, and the root schema-validation path now reports `Validated 28 fixture file(s).`
- GREEN verified: PASS

**REFACTOR Phase:**
- replaced duplicated fixture-directory assumptions with one explicit schema-tools manifest that documents family, category, and expectation for every validated fixture

### Requirements `R2`, `R4`, and `R5` (router, observability, and smoke hardening)

**RED Phase:**
- Command: `corepack pnpm --filter @role-model/conformance exec vitest run src/profile-aggregation-deterministic.test.ts src/gateway-smoke-observability.test.ts src/observability-linkage.test.ts`
- Expected failure: the observability slice should fail because the aggregator, trace/usage helpers, and smoke harness still used the older vocabulary and lacked stable linkage validation.
- Actual failure: the red log shows missing `endpoint_version`, missing `measurement_window`, missing `validateTraceLinkage`, missing `validateUsageLinkage`, missing `summarizeUsageEvents`, and smoke output still tied to the older contract.
- RED verified: PASS

**GREEN Phase:**
- Implementation: rewrote the aggregator, trace, usage, and smoke surfaces to the hardened contract, then aligned the broad schema-conformance test to the same public vocabulary during the final root-test sweep.
- Commands: `corepack pnpm --filter @role-model/conformance exec vitest run src/profile-aggregation-deterministic.test.ts src/gateway-smoke-observability.test.ts src/observability-linkage.test.ts`, `cmd.exe /c "corepack pnpm run test"`, `cmd.exe /c "corepack pnpm run smoke"`
- Result: observability slice, root test, and root smoke are all green.
- GREEN verified: PASS

**REFACTOR Phase:**
- imported canonical generated protocol types into the router and observability packages so the handwritten layer now wraps or composes generated entities instead of duplicating them

## Implementation Evidence

- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schema-tools-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/observability-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/test-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/smoke-green.log`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`
- `/.recursive/run/02-audit-remediation/04-test-summary.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `delegation remained unavailable for this run because no explicit user authorization for subagents was provided in the session.`
Delegation Decision Basis: `Phase 3 required tightly coupled controller-owned RED/GREEN loops across schemas, router logic, observability helpers, fixtures, and the smoke harness.`
Audit Inputs Provided:
- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`
- Changed files:
  - `/docs/protocol/benchmarks.md`
  - `/docs/protocol/profiles.md`
  - `/docs/protocol/reason-codes.md`
  - `/docs/protocol/role-task-capability-mapping.md`
  - `/docs/protocol/roles.md`
  - `/docs/protocol/tasks.md`
  - `/docs/protocol/traces.md`
  - `/docs/protocol/usage.md`
  - `/packages/conformance/package.json`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`
  - `/packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `/packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `/packages/conformance/src/protocol-schema-conformance.test.ts`
  - `/packages/conformance/src/router-conformance.test.ts`
  - `/packages/conformance/src/router-fixture-conformance.test.ts`
  - `/packages/conformance/src/router-role-task-eligibility.test.ts`
  - `/packages/conformance/src/observability-linkage.test.ts`
  - `/packages/protocol-types/src/generated.ts`
  - `/packages/schema-tools/src/index.ts`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/schema-tools/test/validate-schemas.test.ts`
  - `/pnpm-lock.yaml`
  - `/protocol/fixtures/**`
  - `/protocol/schemas/observed-performance-profile.schema.json`
  - `/protocol/schemas/role-binding.schema.json`
  - `/protocol/schemas/router-decision.schema.json`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`
  - `/role-model-router/packages/core/package.json`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/profile-aggregator/package.json`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/trace/package.json`
  - `/role-model-router/packages/trace/src/index.ts`
  - `/role-model-router/packages/usage/package.json`
  - `/role-model-router/packages/usage/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`
- `/.recursive/memory/domains/role-model-baseline.md`

## Earlier Phase Reconciliation

- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`:
  - `SP1` through `SP4` were implemented on the planned schema, router, observability, and smoke surfaces
  - the only extra touched file was `packages/conformance/src/protocol-schema-conformance.test.ts`, added to align the broader suite to the hardened baseline surfaced by the root test chain
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`:
  - every blocked requirement cluster identified in Phase 1 is now addressed by concrete product or test changes rather than by scope deferral

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schema-tools-green.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/observability-green.log`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/trace/src/index.ts`
  - `/role-model-router/packages/usage/src/index.ts`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Comparison reference: `working-tree`
- Normalized baseline: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Diff basis used: `git diff --ignore-cr-at-eol --name-only`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/03-protocol-baseline-hardening`
- Actual changed files reviewed:
  - `docs/protocol/benchmarks.md`
  - `docs/protocol/profiles.md`
  - `docs/protocol/reason-codes.md`
  - `docs/protocol/role-task-capability-mapping.md`
  - `docs/protocol/roles.md`
  - `docs/protocol/tasks.md`
  - `docs/protocol/traces.md`
  - `docs/protocol/usage.md`
  - `packages/conformance/package.json`
  - `packages/conformance/src/gateway-smoke-observability.test.ts`
  - `packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `packages/conformance/src/protocol-schema-conformance.test.ts`
  - `packages/conformance/src/router-conformance.test.ts`
  - `packages/conformance/src/router-fixture-conformance.test.ts`
  - `packages/conformance/src/router-role-task-eligibility.test.ts`
  - `packages/protocol-types/src/generated.ts`
  - `packages/schema-tools/src/index.ts`
  - `packages/schema-tools/src/validate-schemas.ts`
  - `packages/schema-tools/test/validate-schemas.test.ts`
  - `pnpm-lock.yaml`
  - `protocol/fixtures/example-router-decision.json`
  - `protocol/fixtures/profile-golden/observed-performance-basic.json`
  - `protocol/fixtures/router-golden/cases/inactive-role-binding.json`
  - `protocol/fixtures/router-golden/cases/preferred-capability-selection.json`
  - `protocol/fixtures/router-golden/cases/role-task-unsupported.json`
  - `protocol/fixtures/router-golden/router-decision-basic.json`
  - `protocol/schemas/observed-performance-profile.schema.json`
  - `protocol/schemas/role-binding.schema.json`
  - `protocol/schemas/router-decision.schema.json`
  - `role-model-router/apps/gateway-smoke/src/index.ts`
  - `role-model-router/packages/core/package.json`
  - `role-model-router/packages/core/src/reason-codes.ts`
  - `role-model-router/packages/core/src/router.ts`
  - `role-model-router/packages/core/src/types.ts`
  - `role-model-router/packages/profile-aggregator/package.json`
  - `role-model-router/packages/profile-aggregator/src/index.ts`
  - `role-model-router/packages/trace/package.json`
  - `role-model-router/packages/trace/src/index.ts`
  - `role-model-router/packages/usage/package.json`
  - `role-model-router/packages/usage/src/index.ts`
- Additional untracked implementation files reviewed via `git status --short --untracked-files=all`:
  - `packages/conformance/src/observability-linkage.test.ts`
  - `protocol/fixtures/profile-golden/observed-performance-edge-error-rates.json`
  - `protocol/fixtures/profile-golden/observed-performance-invalid-missing-endpoint-version.json`
  - `protocol/fixtures/profile-golden/observed-performance-minimal.json`
  - `protocol/fixtures/role-task-golden/role-binding-invalid-status.json`
  - `protocol/fixtures/role-task-golden/role-binding-minimal.json`
  - `protocol/fixtures/role-task-golden/role-definition-minimal.json`
  - `protocol/fixtures/role-task-golden/task-definition-edge.json`
  - `protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json`
  - `protocol/fixtures/router-golden/cases/binding-capability-restriction.json`
  - `protocol/fixtures/router-golden/cases/binding-task-restriction.json`
  - `protocol/fixtures/router-golden/cases/cost-strategy-prefers-cheaper.json`
  - `protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json`
  - `protocol/fixtures/router-golden/cases/local-preference.json`
  - `protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json`
  - `protocol/fixtures/router-golden/cases/measured-profile-prefers-observed.json`
  - `protocol/fixtures/router-golden/cases/quality-strategy-prefers-better-judged.json`
  - `protocol/fixtures/router-golden/cases/remote-preference.json`
  - `protocol/fixtures/router-golden/cases/role-forbids-capability.json`
  - `protocol/fixtures/router-golden/cases/task-not-allowed-for-role.json`
  - `protocol/fixtures/router-golden/router-decision-edge-empty-selection.json`
  - `protocol/fixtures/router-golden/router-decision-invalid-missing-app-id.json`
  - `protocol/fixtures/router-golden/router-decision-minimal.json`
  - `protocol/fixtures/trace-golden/trace-event-edge-no-span.json`
  - `protocol/fixtures/trace-golden/trace-event-invalid-missing-request-id.json`
  - `protocol/fixtures/trace-golden/trace-span-minimal.json`
  - `protocol/fixtures/usage-golden/usage-event-edge-benchmark.json`
  - `protocol/fixtures/usage-golden/usage-event-invalid-missing-routing-decision.json`
  - `protocol/fixtures/usage-golden/usage-event-minimal.json`
- Excluded future-phase control-plane drift:
  - `.recursive/DECISIONS.md`
  - `.recursive/STATE.md`
  - `.recursive/memory/domains/role-model-baseline.md`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- updated `packages/conformance/src/protocol-schema-conformance.test.ts` after the first root test run so the broad schema-conformance suite no longer asserted the superseded `sample_window` and `candidate` contract

## Requirement Completion Status

- R1 | Status: implemented | Changed Files: `docs/protocol/benchmarks.md`, `docs/protocol/profiles.md`, `docs/protocol/reason-codes.md`, `docs/protocol/role-task-capability-mapping.md`, `docs/protocol/roles.md`, `docs/protocol/tasks.md`, `docs/protocol/traces.md`, `docs/protocol/usage.md`, `packages/conformance/package.json`, `packages/conformance/src/protocol-fixture-conformance.test.ts`, `packages/conformance/src/protocol-schema-conformance.test.ts`, `packages/protocol-types/src/generated.ts`, `packages/schema-tools/src/index.ts`, `packages/schema-tools/src/validate-schemas.ts`, `packages/schema-tools/test/validate-schemas.test.ts`, `pnpm-lock.yaml`, `protocol/fixtures/example-router-decision.json`, `protocol/fixtures/profile-golden/observed-performance-basic.json`, `protocol/fixtures/profile-golden/observed-performance-edge-error-rates.json`, `protocol/fixtures/profile-golden/observed-performance-invalid-missing-endpoint-version.json`, `protocol/fixtures/profile-golden/observed-performance-minimal.json`, `protocol/fixtures/role-task-golden/role-binding-invalid-status.json`, `protocol/fixtures/role-task-golden/role-binding-minimal.json`, `protocol/fixtures/role-task-golden/role-definition-minimal.json`, `protocol/fixtures/role-task-golden/task-definition-edge.json`, `protocol/fixtures/trace-golden/trace-event-edge-no-span.json`, `protocol/fixtures/trace-golden/trace-event-invalid-missing-request-id.json`, `protocol/fixtures/trace-golden/trace-span-minimal.json`, `protocol/fixtures/usage-golden/usage-event-edge-benchmark.json`, `protocol/fixtures/usage-golden/usage-event-invalid-missing-routing-decision.json`, `protocol/fixtures/usage-golden/usage-event-minimal.json`, `protocol/schemas/observed-performance-profile.schema.json`, `protocol/schemas/role-binding.schema.json`, `protocol/schemas/router-decision.schema.json` | Implementation Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schema-tools-green.log`, `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
- R2 | Status: implemented | Changed Files: `role-model-router/packages/core/package.json`, `role-model-router/packages/core/src/types.ts`, `role-model-router/packages/core/src/reason-codes.ts`, `role-model-router/packages/core/src/router.ts`, `packages/conformance/src/router-conformance.test.ts`, `packages/conformance/src/router-role-task-eligibility.test.ts` | Implementation Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`, `role-model-router/packages/core/src/router.ts`
- R3 | Status: implemented | Changed Files: `packages/conformance/src/router-fixture-conformance.test.ts`, `protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json`, `protocol/fixtures/router-golden/cases/binding-capability-restriction.json`, `protocol/fixtures/router-golden/cases/binding-task-restriction.json`, `protocol/fixtures/router-golden/cases/cost-strategy-prefers-cheaper.json`, `protocol/fixtures/router-golden/cases/inactive-role-binding.json`, `protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json`, `protocol/fixtures/router-golden/cases/local-preference.json`, `protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json`, `protocol/fixtures/router-golden/cases/measured-profile-prefers-observed.json`, `protocol/fixtures/router-golden/cases/preferred-capability-selection.json`, `protocol/fixtures/router-golden/cases/quality-strategy-prefers-better-judged.json`, `protocol/fixtures/router-golden/cases/remote-preference.json`, `protocol/fixtures/router-golden/cases/role-forbids-capability.json`, `protocol/fixtures/router-golden/cases/role-task-unsupported.json`, `protocol/fixtures/router-golden/cases/task-not-allowed-for-role.json`, `protocol/fixtures/router-golden/router-decision-basic.json`, `protocol/fixtures/router-golden/router-decision-edge-empty-selection.json`, `protocol/fixtures/router-golden/router-decision-invalid-missing-app-id.json`, `protocol/fixtures/router-golden/router-decision-minimal.json` | Implementation Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`, `packages/conformance/src/router-fixture-conformance.test.ts`
- R4 | Status: implemented | Changed Files: `role-model-router/packages/profile-aggregator/package.json`, `role-model-router/packages/profile-aggregator/src/index.ts`, `role-model-router/packages/trace/package.json`, `role-model-router/packages/trace/src/index.ts`, `role-model-router/packages/usage/package.json`, `role-model-router/packages/usage/src/index.ts`, `packages/conformance/src/profile-aggregation-deterministic.test.ts`, `packages/conformance/src/observability-linkage.test.ts` | Implementation Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/observability-green.log`, `role-model-router/packages/profile-aggregator/src/index.ts`
- R5 | Status: implemented | Changed Files: `role-model-router/apps/gateway-smoke/src/index.ts`, `packages/conformance/src/gateway-smoke-observability.test.ts`, `protocol/fixtures/router-golden/cases/measured-profile-prefers-observed.json` | Implementation Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/smoke-green.log`, `role-model-router/apps/gateway-smoke/src/index.ts`

## Audit Verdict

- Audit summary: the product implementation now matches the preserved M1-M3 baseline-hardening target, the diff audit accounts for the actual tracked worktree drift, and the strict TDD evidence is complete.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> schema, fixture, generated-type, and directly coupled doc hardening is captured in `## Changes Applied`, the first TDD slice, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schema-tools-green.log`, `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
- `R2` -> router-core hardening is captured in `## Changes Applied`, `## Sub-phase Implementation Summary`, and the second TDD slice. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`, `role-model-router/packages/core/src/router.ts`
- `R3` -> fixture-driven router conformance expansion is captured in `## Changes Applied`, the first TDD slice, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`, `packages/conformance/src/router-fixture-conformance.test.ts`
- `R4` -> observability linkage and aggregation hardening is captured in `## Changes Applied`, the second TDD slice, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/observability-green.log`, `role-model-router/packages/profile-aggregator/src/index.ts`
- `R5` -> smoke-harness hardening is captured in `## Changes Applied`, `## Sub-phase Implementation Summary`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/smoke-green.log`, `role-model-router/apps/gateway-smoke/src/index.ts`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/router-red.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/observability-red.log`
- Requirement coverage check:
  - `R1`-`R5` are covered in `## Changes Applied`, `## Sub-phase Implementation Summary`, `## TDD Compliance Log`, `## Requirement Completion Status`, and `## Traceability`
- TDD check:
  - strict red and green evidence paths are recorded for the routing and observability defect clusters and the final root validation chain

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - planned implementation slices are complete
  - the hardened contract is backed by explicit red and green evidence
  - no unaddressed implementation blockers remain before Phase 4
  - no required Phase 3 section is missing
- Remaining blockers:
  - none

Approval: PASS
