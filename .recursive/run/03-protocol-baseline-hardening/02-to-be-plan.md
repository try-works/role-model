Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-04-24T21:21:04Z`
LockHash: `e31299b7e78d112efdc5b042dc8e898f3a4eeed32d909d64c8f5940fa1941d2a`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
Outputs:
- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `03-protocol-baseline-hardening` into a strict-TDD implementation plan covering M1 schema hardening, M2 router-contract expansion, M3 observability linkage, and the gateway-smoke validation harness.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the preserved source requirement
- [x] Pin the canonical contract decisions needed before coding
- [x] Define the exact product, fixture, doc, and evidence change surfaces
- [x] Define a strict-TDD RED-GREEN-REFACTOR sequence for the in-scope work
- [x] Specify concrete verification commands and evidence logs
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Canonical Contract Decisions

- Observed-performance public vocabulary will move to `measurement_window`, not remain on `sample_window`.
  - Reason: the preserved requirement is the controlling verification reference for this run, and renaming now is cheaper than carrying dual public vocabularies into later hosts.
- `router-decision.schema.json` will adopt the preserved richer scored-candidate contract directly.
  - `scored_candidates[*]` will expose `endpoint_id`, `total_score`, `metric_breakdown`, and `tie_break`.
  - `metric_breakdown` will expose `quality`, `latency`, `throughput`, `cost`, `reliability`, and `preference`, each with `value`, `source`, and optional raw diagnostics.
  - `app_id` will be required; `org_id` will be present as `string | null` in emitted artifacts to keep the field stable without inventing org scope where none exists.
- Role-binding status vocabulary will adopt `active|inactive|disabled`.
  - `candidate` will be removed from the canonical protocol surface; any legacy caller would need boundary normalization outside this run's in-scope surfaces.
- Router selection reason vocabulary will adopt `ROLE_POLICY_APPLIED` and `TASK_POLICY_APPLIED`.
- Observed-performance profiles will require `endpoint_version`.
  - Aggregation will reject mixed versions and will emit the common version for a valid aggregate set.
- Sample-count consistency will be enforced in two layers:
  - schema: non-negative integer sample counts and required fields
  - runtime/package helper: explicit validation that `sample_size >= benchmark_samples + live_request_samples`

## Planned Changes by File

- `protocol/schemas/router-decision.schema.json`: add `app_id`, `org_id`, richer scored-candidate contract, expanded exclusion vocabulary, and explicit selection reason enum.
- `protocol/schemas/observed-performance-profile.schema.json`: rename `sample_window` to `measurement_window`, require `endpoint_version`, tighten `sources`, and align the profile surface to the preserved requirement.
- `protocol/schemas/role-binding.schema.json`: replace `candidate` with `inactive` and keep the binding shape aligned to router semantics.
- `protocol/schemas/trace-event.schema.json`, `trace-span.schema.json`, `usage-event.schema.json`: tighten linkage-friendly fields only as needed for stable M3 validation.
- `protocol/fixtures/router-golden/cases/*.json`: expand the router-golden corpus to cover the required positive and negative cases and richer expected decision summaries.
- `protocol/fixtures/profile-golden/`, `trace-golden/`, `usage-golden/`, `role-task-golden/`: add valid, invalid, minimal, and edge-case fixtures for each family needed by the preserved requirement.
- `docs/protocol/profiles.md`, `roles.md`, `tasks.md`, `role-task-capability-mapping.md`, `traces.md`, `usage.md`, `benchmarks.md`: update only the sections directly affected by the hardened public contract.
- `packages/schema-tools/src/validate-schemas.ts`: expand fixture validation so valid fixtures pass and invalid fixtures fail intentionally for the in-scope families.
- `packages/protocol-types/src/generated.ts`: regenerate from the canonical schemas after M1 changes.
- `packages/conformance/src/router-fixture-conformance.test.ts`: strengthen the fixture harness and required case set.
- `packages/conformance/src/router-conformance.test.ts`: add RED/GREEN assertions for richer scored-candidate output, tie-break detail, and canonical selection reasons.
- `packages/conformance/src/router-role-task-eligibility.test.ts`: add RED/GREEN assertions for forbidden capability handling, inactive vs disabled bindings, and binding-effective capability/task enforcement.
- `packages/conformance/src/profile-aggregation-deterministic.test.ts`: switch to the canonical sample vocabulary and assert `measurement_window`, endpoint-version emission, and missing-data semantics.
- `packages/conformance/src/gateway-smoke-observability.test.ts`: assert schema validation, linkage validation, and smoke failure on invalid output.
- `role-model-router/packages/core/src/types.ts`: align handwritten router input/output helper types to the hardened schema surface and remove stale vocabulary.
- `role-model-router/packages/core/src/reason-codes.ts`: add the required exclusion and selection vocabularies.
- `role-model-router/packages/core/src/router.ts`: emit full metric breakdowns, tie-break diagnostics, binding-aware exclusions, policy-applied reasons, and schema-valid router decisions.
- `role-model-router/packages/profile-aggregator/src/index.ts`: adopt the canonical sample shape, emit `measurement_window` and `endpoint_version`, and expose runtime validation helpers.
- `role-model-router/packages/trace/src/index.ts`: add read/linkage validation helpers in addition to write helpers.
- `role-model-router/packages/usage/src/index.ts`: add read helpers, summary reducers, and usage-to-decision linkage validation helpers.
- `role-model-router/apps/gateway-smoke/src/index.ts`: load at least one fixture-driven router case, validate decision/trace/usage/profile artifacts against schemas, call linkage validators, and fail on invalid output.
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/*` and `evidence/logs/green/*`: capture strict RED and GREEN evidence for the sub-phases below.

## Implementation Steps

1. Write RED tests for the public-contract deltas before modifying production code:
   - schema/fixture validation RED tests for the richer router decision and observed profile surface
   - router RED tests for scored-candidate diagnostics, new reason codes, and binding-effective restrictions
   - observability RED tests for the canonical sample vocabulary, linkage helpers, and smoke validation behavior
2. Implement M1 schema and fixture hardening first:
   - update schemas
   - add missing fixture families and invalid/minimal/edge coverage
   - extend schema-tool validation to prove valid fixtures pass and invalid fixtures fail
   - regenerate protocol types
3. Implement M2 router contract hardening:
   - align types and reason-code vocabulary
   - emit full scored-candidate diagnostics and applied policy metadata
   - enforce inactive vs disabled bindings plus effective task/capability restrictions
   - expand fixture-driven conformance to the required case set
4. Implement M3 observability hardening:
   - migrate the aggregator to the canonical sample shape
   - add trace and usage read/summary/linkage helpers
   - validate linkages in tests directly through package helpers
5. Upgrade gateway-smoke last as the integration harness:
   - load a fixture-driven router case
   - emit artifacts from the hardened router and observability packages
   - validate artifacts against schemas and linkage helpers before exit
6. Run the final validation chain only after the RED/GREEN slices are green:
   - `corepack pnpm run schemas:validate`
   - `corepack pnpm run test`
   - `corepack pnpm run smoke`

## Testing Strategy

- RED-first contract tests:
  - `corepack pnpm --filter @role-model/conformance exec vitest run src/router-fixture-conformance.test.ts`
  - `corepack pnpm --filter @role-model/conformance exec vitest run src/router-conformance.test.ts src/router-role-task-eligibility.test.ts`
  - `corepack pnpm --filter @role-model/conformance exec vitest run src/profile-aggregation-deterministic.test.ts src/gateway-smoke-observability.test.ts`
- M1 regression and generation checks:
  - `corepack pnpm --filter @role-model/schema-tools exec vitest run test/validate-schemas.test.ts test/generate-protocol-types.test.ts`
  - `corepack pnpm run schemas:validate`
- Full validation chain:
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Evidence logging:
  - save RED logs under `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/`
  - save GREEN logs under `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: the in-scope surface is protocol, router, observability, and harness behavior with no browser UI.

## Manual QA Scenarios

1. **Schema and fixture baseline**
   - Steps:
     - run `corepack pnpm run schemas:validate`
     - inspect one router-decision fixture, one observed-performance fixture, and one invalid fixture from each in-scope family
   - Expected:
     - valid fixtures pass
     - intentionally invalid fixtures are covered by the schema-tool validation flow
     - generated protocol types reflect the hardened schemas

2. **Router decision diagnostics**
   - Steps:
     - open one router-golden case with an eligible winner and at least one excluded candidate
     - inspect the resulting decision artifact or test expectation
   - Expected:
     - scored candidates expose `total_score`, `metric_breakdown`, and `tie_break`
     - selection reasons and exclusions use the canonical vocabulary

3. **Smoke harness linkage**
   - Steps:
     - run `corepack pnpm run smoke`
     - inspect `runtime-output/gateway-smoke/`
   - Expected:
     - the smoke app emits router decision, trace, usage, and observed-performance artifacts
     - smoke succeeds only if schema validation and linkage validation both pass

## Idempotence and Recovery

- Re-running the conformance slices is safe because they are read-mostly and the smoke test already recreates `runtime-output/gateway-smoke/`.
- Re-running `corepack pnpm run schemas:validate` is safe and should remain deterministic once fixture validation is in place.
- If schema changes break generated types, fix the schema first and regenerate types again; do not hand-edit `packages/protocol-types/src/generated.ts`.
- If the smoke app fails after router or observability changes, repair the underlying package contract rather than weakening smoke validation.
- If doc updates drift from final code during the implementation loop, refresh the docs at the end of the relevant sub-phase before the final validation chain.

## Implementation Sub-phases

### SP1. M1 schema, fixture, and generated-type hardening

Scope and purpose:
Make the canonical protocol layer sufficient for the preserved M1 contract and prove it with valid plus invalid fixtures.

Requirement mapping: `R1`

Implementation checklist:
- [ ] Add RED schema/conformance expectations for the richer router-decision and observed-performance contracts
- [ ] Harden `router-decision`, `observed-performance-profile`, and `role-binding` schemas
- [ ] Add missing valid, invalid, minimal, and edge-case fixtures for the in-scope families
- [ ] Extend schema-tool validation to assert invalid fixtures fail
- [ ] Regenerate protocol types
- [ ] Update directly coupled protocol docs touched by the schema changes

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/schema-tools exec vitest run test/validate-schemas.test.ts test/generate-protocol-types.test.ts`
- `corepack pnpm run schemas:validate`

Sub-phase acceptance:
- the canonical protocol layer is self-consistent, generated types refresh cleanly, and fixture validation distinguishes valid from invalid inputs

### SP2. M2 router contract and fixture-driven conformance hardening

Scope and purpose:
Turn the TypeScript router into the preserved M2 reference implementation with full diagnostics and fixture-driven proof.

Requirement mapping: `R2`, `R3`

Implementation checklist:
- [ ] Add RED router tests for richer scored candidates, new reason codes, and binding-effective restrictions
- [ ] Align router helper types and reason-code vocabulary
- [ ] Emit full metric breakdowns, tie-break diagnostics, and policy-applied selection reasons
- [ ] Enforce inactive vs disabled bindings and binding-effective capability/task restrictions
- [ ] Expand router-golden cases and the fixture harness

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/conformance exec vitest run src/router-fixture-conformance.test.ts`
- `corepack pnpm --filter @role-model/conformance exec vitest run src/router-conformance.test.ts src/router-role-task-eligibility.test.ts`

Sub-phase acceptance:
- router outputs are schema-valid, explainable, role/task-aware, and proven through the required fixture-driven cases

### SP3. M3 observability linkage and aggregation hardening

Scope and purpose:
Make trace, usage, and observed-performance semantics stable, linked, and testable.

Requirement mapping: `R4`

Implementation checklist:
- [ ] Add RED observability tests for canonical sample vocabulary, linkage validation, and summary helpers
- [ ] Migrate aggregator input/output shapes and keep freshness/confidence/version-safety intact
- [ ] Add trace read/linkage validation helpers
- [ ] Add usage read helpers, summary reducers, and linkage validation helpers

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/conformance exec vitest run src/profile-aggregation-deterministic.test.ts`
- `corepack pnpm --filter @role-model/conformance exec vitest run src/gateway-smoke-observability.test.ts`

Sub-phase acceptance:
- decision, trace, usage, and profile artifacts have stable linkage semantics and the aggregator emits the preserved public contract

### SP4. Gateway-smoke validation harness

Scope and purpose:
Make the smoke app a real end-to-end proof of the M1-M3 contract.

Requirement mapping: `R5`

Implementation checklist:
- [ ] Switch smoke routing input to at least one fixture-driven router case
- [ ] Validate emitted artifacts against canonical schemas before exit
- [ ] Validate linkage before exit and fail on broken output
- [ ] Keep the root smoke command path green

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/conformance exec vitest run src/gateway-smoke-observability.test.ts`
- `corepack pnpm run smoke`

Sub-phase acceptance:
- gateway-smoke is a deterministic, self-validating integration harness for the hardened router and observability surfaces

## Prior Recursive Evidence Reviewed

- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `/.recursive/run/02-audit-remediation/04-test-summary.md`
- `/.recursive/run/02-audit-remediation/07-state-update.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `delegation remains unavailable for this run because the session still lacks explicit user authorization for subagents.`
Delegation Decision Basis: `Phase 2 is a controller-owned implementation plan that must pin the public-contract choices before RED tests and code changes begin.`
Audit Inputs Provided:
- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- Changed files:
  - `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
  - `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
  - `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- Targeted code references:
  - `/protocol/schemas/router-decision.schema.json`
  - `/protocol/schemas/observed-performance-profile.schema.json`
  - `/protocol/schemas/role-binding.schema.json`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/conformance/src/router-fixture-conformance.test.ts`
  - `/packages/conformance/src/router-conformance.test.ts`
  - `/packages/conformance/src/router-role-task-eligibility.test.ts`
  - `/packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/trace/src/index.ts`
  - `/role-model-router/packages/usage/src/index.ts`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Earlier Phase Reconciliation

- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`:
  - the plan directly targets the confirmed gap clusters instead of reopening baseline discovery
  - the unresolved observed-profile vocabulary fork is now pinned to one canonical plan decision
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`:
  - the plan preserves the already-green root validation chain as a non-regression target rather than treating it as part of the remediation problem

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
  - `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
  - `/protocol/schemas/router-decision.schema.json`
  - `/protocol/schemas/observed-performance-profile.schema.json`
  - `/protocol/schemas/role-binding.schema.json`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/conformance/src/router-fixture-conformance.test.ts`
  - `/packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/trace/src/index.ts`
  - `/role-model-router/packages/usage/src/index.ts`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Comparison reference: `working-tree`
- Normalized baseline: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Diff basis used: `git diff --name-only bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/03-protocol-baseline-hardening`
- Planned or claimed changed files:
  - `protocol/schemas/router-decision.schema.json`
  - `protocol/schemas/observed-performance-profile.schema.json`
  - `protocol/schemas/role-binding.schema.json`
  - `protocol/schemas/trace-event.schema.json`
  - `protocol/schemas/trace-span.schema.json`
  - `protocol/schemas/usage-event.schema.json`
  - `protocol/fixtures/router-golden/cases/*.json`
  - `protocol/fixtures/profile-golden/*`
  - `protocol/fixtures/trace-golden/*`
  - `protocol/fixtures/usage-golden/*`
  - `protocol/fixtures/role-task-golden/*`
  - `docs/protocol/profiles.md`
  - `docs/protocol/roles.md`
  - `docs/protocol/tasks.md`
  - `docs/protocol/role-task-capability-mapping.md`
  - `docs/protocol/traces.md`
  - `docs/protocol/usage.md`
  - `docs/protocol/benchmarks.md`
  - `packages/schema-tools/src/validate-schemas.ts`
  - `packages/protocol-types/src/generated.ts`
  - `packages/conformance/src/router-fixture-conformance.test.ts`
  - `packages/conformance/src/router-conformance.test.ts`
  - `packages/conformance/src/router-role-task-eligibility.test.ts`
  - `packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `packages/conformance/src/gateway-smoke-observability.test.ts`
  - `role-model-router/packages/core/src/types.ts`
  - `role-model-router/packages/core/src/reason-codes.ts`
  - `role-model-router/packages/core/src/router.ts`
  - `role-model-router/packages/profile-aggregator/src/index.ts`
  - `role-model-router/packages/trace/src/index.ts`
  - `role-model-router/packages/usage/src/index.ts`
  - `role-model-router/apps/gateway-smoke/src/index.ts`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/red/*`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/*`
  - `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
  - `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- Actual changed files reviewed:
  - `.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
  - `.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
  - `.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- Unexplained drift:
  - none

## Gaps Found

- none; the plan is concrete enough to drive Phase 3 without further baseline analysis

## Repair Work Performed

- pinned the public observed-profile vocabulary to `measurement_window` so Phase 3 will not drift between competing public contracts
- separated the work into schema, router, observability, and smoke-harness sub-phases so RED/GREEN evidence can stay attributable
- defined the runtime-versus-schema enforcement split for observed-profile sample-count consistency

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the schema, fixture, and doc hardening work is now planned in `SP1` but not yet implemented. | Blocking Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md` | Audit Note: the plan intentionally adopts the stronger public observed-profile vocabulary.
- R2 | Status: blocked | Rationale: the router reference-implementation hardening is planned in `SP2` but not yet implemented. | Blocking Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md` | Audit Note: canonical strategy normalization already exists and is treated as preserved baseline behavior.
- R3 | Status: blocked | Rationale: fixture-driven router conformance expansion is planned in `SP2` but not yet implemented. | Blocking Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md` | Audit Note: existing router-golden cases will be reused where they are already stronger than the preserved minimum.
- R4 | Status: blocked | Rationale: observability linkage, helper, and aggregation hardening is planned in `SP3` but not yet implemented. | Blocking Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md` | Audit Note: freshness/confidence formulas and version-mismatch rejection are treated as preserved strengths to carry forward.
- R5 | Status: blocked | Rationale: the gateway-smoke validation-harness upgrade is planned in `SP4` but not yet implemented. | Blocking Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md` | Audit Note: the root smoke entrypoint itself is already healthy and must remain so.

## Audit Verdict

- Audit summary: the plan is concrete, executable, and directly tied to the locked M1-M3 gap analysis.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> planned schema, fixture, generated-type, and doc work is captured in `## Canonical Contract Decisions`, `## Planned Changes by File`, and `SP1`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `R2` -> planned router contract hardening is captured in `## Planned Changes by File`, `## Implementation Steps`, and `SP2`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `R3` -> planned fixture-driven router conformance expansion is captured in `## Testing Strategy` and `SP2`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `R4` -> planned observability linkage and aggregation hardening is captured in `## Canonical Contract Decisions`, `## Planned Changes by File`, and `SP3`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `R5` -> planned smoke-harness validation work is captured in `## Planned Changes by File`, `## Manual QA Scenarios`, and `SP4`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
  - `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- Requirement coverage check:
  - `R1`-`R5`: covered in `## Canonical Contract Decisions`, `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Implementation Sub-phases`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS5`: preserved; the plan does not widen into deferred native hosts, memory/package integration, browser/runtime-web expansion, or unrelated cleanup

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the public-contract decisions needed before coding are pinned
  - strict-TDD RED/GREEN commands are defined
  - the planned write surface is concrete enough for later diff audits
  - manual QA expectations are concrete and limited to in-scope behavior
- Remaining blockers:
  - none

Approval: PASS
