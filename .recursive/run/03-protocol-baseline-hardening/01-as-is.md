Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-04-24T21:18:36Z`
LockHash: `607a3f704cd5d583163e49ea1e8644501b96cd7a5c5520ce72f66def91cfed87`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
Outputs:
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
Scope note: This artifact records the current repository state for `03-protocol-baseline-hardening`, limited to the preserved requirement's M1-M3 baseline-hardening scope across protocol schemas, fixture-driven routing, observability linkage, and the smoke validation harness.

## TODO

- [x] Re-read the locked Phase 0 artifacts and the preserved source requirement
- [x] Inspect the current schema, fixture, router, observability, and smoke surfaces against `R1`-`R5`
- [x] Record the already-satisfied baseline pieces separately from the remaining gaps
- [x] Record the specific vocabulary and contract mismatches that Phase 2 must resolve
- [x] Complete the audited-phase sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open the active worktree at `D:\DEV\role-model\.worktrees\03-protocol-baseline-hardening`.
2. Read `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`, `00-worktree.md`, and `role-model-next-implementation-requirement.md`.
3. Inspect the current canonical schema surfaces:
   - `/protocol/schemas/router-decision.schema.json`
   - `/protocol/schemas/observed-performance-profile.schema.json`
   - `/protocol/schemas/role-binding.schema.json`
   - `/protocol/schemas/trace-event.schema.json`
   - `/protocol/schemas/trace-span.schema.json`
   - `/protocol/schemas/usage-event.schema.json`
4. Inspect the current product implementation surfaces:
   - `/role-model-router/packages/core/src/types.ts`
   - `/role-model-router/packages/core/src/reason-codes.ts`
   - `/role-model-router/packages/core/src/router.ts`
   - `/role-model-router/packages/profile-aggregator/src/index.ts`
   - `/role-model-router/packages/trace/src/index.ts`
   - `/role-model-router/packages/usage/src/index.ts`
   - `/role-model-router/apps/gateway-smoke/src/index.ts`
5. Inspect the current validation layer:
   - `/packages/conformance/src/router-fixture-conformance.test.ts`
   - `/packages/conformance/src/router-conformance.test.ts`
   - `/packages/conformance/src/router-role-task-eligibility.test.ts`
   - `/packages/conformance/src/profile-aggregation-deterministic.test.ts`
   - `/packages/conformance/src/gateway-smoke-observability.test.ts`
   - `/protocol/fixtures/router-golden/cases/`
6. Optionally re-run the already-green baseline chain from `00-worktree.md`:
   - `cmd /c "corepack pnpm run schemas:validate"`
   - `cmd /c "corepack pnpm run test"`
   - `cmd /c "corepack pnpm run smoke"`
7. Compare the observed shapes and tests to the preserved requirement's M1, M2, and M3 sections.

## Current Behavior by Requirement

- `R1`: partially satisfied structurally, blocked semantically. The canonical schema set exists, in-file `$id` values now exist, schema validation is green, and generated types still derive from schema tooling. The remaining gaps are contract depth and fixture coverage:
  - `router-decision.schema.json` still omits `app_id`, optional `org_id`, per-candidate `total_score`, `metric_breakdown`, and `tie_break`.
  - `observed-performance-profile.schema.json` still requires `sample_window` instead of the preserved requirement's `measurement_window`, omits required `endpoint_version`, and does not encode the `sample_size >= benchmark_samples + live_request_samples` consistency rule.
  - `role-binding.schema.json` still uses `status: active|disabled|candidate` instead of at least `active|inactive|disabled`.
  - fixture families under `/protocol/fixtures/profile-golden/`, `/trace-golden/`, `/usage-golden/`, and `/role-task-golden/` currently contain only basic valid examples rather than the required valid, invalid, minimal, and edge-case coverage.
  - directly coupled docs still describe the older observed-profile vocabulary and do not yet reflect the stronger baseline-hardening contract.
- `R2`: partially satisfied structurally, blocked contractually. The TypeScript router already normalizes alias strategies to canonical internal strategies, implements deterministic scoring, and applies some role/task/binding inputs. The remaining gaps are:
  - exclusion reason vocabulary is missing required codes such as `FORBIDDEN_CAPABILITY_PRESENT`, `TASK_NOT_SUPPORTED_BY_ROLE`, `ROLE_BINDING_DISABLED`, `ROLE_BINDING_TASK_NOT_ALLOWED`, and `ROLE_BINDING_CAPABILITY_MISSING`.
  - selection reason vocabulary still uses `ROLE_PREFERENCE_APPLIED` and `TASK_REQUIREMENTS_SATISFIED` instead of the preserved contract's `ROLE_POLICY_APPLIED` and `TASK_POLICY_APPLIED`.
  - router outputs still expose only a thin scored-candidate list with `endpoint_id` and `score`, with no metric-source metadata, diagnostic raw values, or tie-break detail.
  - role binding enforcement currently treats any non-`active` binding as `ROLE_BINDING_INACTIVE` and does not separately enforce binding-effective task restrictions or capability restrictions.
  - the router type layer still uses handwritten shapes that trail the canonical schema and generated protocol-type baseline expected by the preserved requirement.
- `R3`: partially satisfied structurally, blocked on coverage depth. The conformance suite already reads router cases from `/protocol/fixtures/router-golden/cases/`, and several preserved requirement cases already exist in some form. The remaining gaps are:
  - the harness still requires and asserts only the earlier smaller case list.
  - required cases such as explicit remote preference, advisory-vs-hard budget behavior, binding task restriction, binding capability restriction, and measured-profile partial coverage are not yet fully enforced by the harness.
  - the expected decision summary in fixture cases is still too thin to prove the preserved router-decision contract because it does not assert full metric breakdowns or tie-break diagnostics.
- `R4`: partially satisfied structurally, blocked semantically. The repo already emits decision, trace, usage, and observed-performance artifacts, and the profile aggregator already supports multi-sample aggregation, freshness decay, confidence growth, and endpoint-version mismatch rejection. The remaining gaps are:
  - the internal aggregator sample shape still uses `sample_source`, `recorded_at_ms`, and `failure_class` instead of the preserved requirement's `source_type`, `timestamp_ms`, optional `failure`, and optional `error_class`.
  - the aggregated observed profile still omits `endpoint_version` and still uses the older `sample_window` vocabulary.
  - `/role-model-router/packages/trace/` only writes artifacts and does not yet provide linkage validation helpers needed to detect invalid span/event relationships cleanly.
  - `/role-model-router/packages/usage/` only appends events and does not yet provide read helpers or the required summary reducers by `app_id`, `endpoint_id`, `model_id`, and `provider_kind`.
  - linkage validation currently lives only as ad hoc assertions in tests instead of stable package-level helpers.
- `R5`: partially satisfied structurally, blocked operationally. The smoke app already runs from the root wrapper path, emits decision/trace/usage/profile artifacts, and is part of the green baseline chain. The remaining gaps are:
  - it still routes from synthetic endpoint metadata instead of loading at least one fixture-driven router case.
  - it writes artifacts but does not validate them against canonical schemas before exit.
  - it does not call stable linkage validators and therefore cannot fail itself on broken linkage.
  - it does not yet consume optional role definitions, task definitions, or role bindings from fixture inputs.

## Relevant Code Pointers

- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `/protocol/schemas/router-decision.schema.json`
- `/protocol/schemas/observed-performance-profile.schema.json`
- `/protocol/schemas/role-binding.schema.json`
- `/protocol/schemas/trace-event.schema.json`
- `/protocol/schemas/trace-span.schema.json`
- `/protocol/schemas/usage-event.schema.json`
- `/protocol/fixtures/router-golden/cases/`
- `/protocol/fixtures/profile-golden/`
- `/protocol/fixtures/trace-golden/`
- `/protocol/fixtures/usage-golden/`
- `/protocol/fixtures/role-task-golden/`
- `/packages/schema-tools/src/validate-schemas.ts`
- `/packages/protocol-types/src/generated.ts`
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

## Evidence

- `00-worktree.md` already records a green baseline for `schemas:validate`, `test`, and `smoke`, proving the repo currently has a stable execution baseline but not yet the full preserved M1-M3 contract.
- `/protocol/schemas/router-decision.schema.json` currently requires only a thin scored-candidate structure and lacks the preserved requirement's `app_id`, richer score breakdown, and tie-break fields.
- `/protocol/schemas/observed-performance-profile.schema.json` currently requires `sample_window` and omits `endpoint_version`.
- `/role-model-router/packages/core/src/reason-codes.ts` currently defines an incomplete exclusion vocabulary and the earlier selection reason names.
- `/role-model-router/packages/core/src/router.ts` currently emits only `endpoint_id` plus `score` for scored candidates and collapses non-active role bindings into one exclusion path.
- `/role-model-router/packages/profile-aggregator/src/index.ts` already demonstrates multi-sample aggregation but still exposes the older sample vocabulary and output contract.
- `/role-model-router/packages/usage/src/index.ts` currently exposes only `appendUsageEvent`.
- `/role-model-router/packages/trace/src/index.ts` currently exposes only `writeTraceArtifacts`.
- `/role-model-router/apps/gateway-smoke/src/index.ts` currently emits artifacts without schema validation and does not load a fixture-driven router case.
- `/packages/conformance/src/router-fixture-conformance.test.ts` still hard-codes the earlier smaller required case list.

## Known Unknowns

- The preserved requirement uses `measurement_window` for observed-performance output, while the current repo and generated types use `sample_window`. Phase 2 must decide whether to adopt `measurement_window` directly or record a stronger-equivalent compatibility decision and update docs/tests consistently.
- The preserved requirement allows `org_id` to be nullable or optional if not in scope. Phase 2 must pin one canonical schema choice and keep router output, smoke output, and fixtures aligned to it.
- The preserved requirement calls for schema-level consistency on observed-profile sample counts. JSON Schema can encode part of that statically, but exact arithmetic enforcement may also require explicit runtime validation; Phase 2 must record the enforcement split.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `/.recursive/run/02-audit-remediation/04-test-summary.md`
- `/.recursive/run/02-audit-remediation/07-state-update.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `spawn_agent` is present in the environment, but repository policy for this session permits delegation only when the user explicitly asks for subagents, which did not happen for this run.
Delegation Decision Basis: `Phase 1 needed controller-owned comparison between the preserved requirement, the locked baseline artifacts, and the current source surfaces. With delegation unavailable by policy, the controller performed the audit directly.`
Audit Inputs Provided:
- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
  - `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
- Targeted code references:
  - `/protocol/schemas/router-decision.schema.json`
  - `/protocol/schemas/observed-performance-profile.schema.json`
  - `/protocol/schemas/role-binding.schema.json`
  - `/packages/conformance/src/router-fixture-conformance.test.ts`
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
- `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Earlier Phase Reconciliation

- `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`:
  - claim carried forward: the run is limited to M1-M3 baseline hardening with only minimum M4/M5 support.
  - current reconciliation: the repo already satisfies the structural scaffold portions of that scope, but the preserved requirement's deeper schema, router-output, linkage, and smoke-harness contracts are still not implemented.
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`:
  - claim carried forward: the worktree starts from a green root validation chain at `bab6799`.
  - current reconciliation: the green baseline remains true and is itself evidence that the remaining work is contract expansion and hardening, not baseline breakage recovery.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
  - `/protocol/schemas/router-decision.schema.json`
  - `/protocol/schemas/observed-performance-profile.schema.json`
  - `/protocol/schemas/role-binding.schema.json`
  - `/packages/conformance/src/router-fixture-conformance.test.ts`
  - `/packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/trace/src/index.ts`
  - `/role-model-router/packages/usage/src/index.ts`
  - `/role-model-router/apps/gateway-smoke/src/index.ts`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`

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
- Actual changed files reviewed:
  - `.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
  - `.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
- Unexplained drift:
  - none; the working tree still contains only run-local Phase 0 and Phase 1 artifacts

## Gaps Found

- none beyond the intended repository gaps recorded under `## Current Behavior by Requirement`; the Phase 1 artifact accurately captures the present M1-M3 baseline-hardening shortfall without missing in-scope analysis work

## Repair Work Performed

- separated already-green baseline behavior from still-missing contract work so Phase 2 can target real gaps instead of re-auditing fixed baseline items
- recorded the exact schema, router, conformance, aggregator, trace, usage, and smoke surfaces that must be included in the implementation plan
- elevated the `measurement_window` versus `sample_window` mismatch as an explicit design decision point instead of letting it remain an implicit drift source

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the schema/tooling foundation exists, but router-decision depth, observed-profile semantics, role-binding status vocabulary, fixture breadth, and doc alignment remain below the preserved M1 contract. | Blocking Evidence: `/protocol/schemas/router-decision.schema.json`, `/protocol/schemas/observed-performance-profile.schema.json`, `/protocol/schemas/role-binding.schema.json`, `/protocol/fixtures/profile-golden/` | Audit Note: this is hardening work, not scaffold creation.
- R2 | Status: blocked | Rationale: the router already scores deterministically and applies some role/task logic, but its output structure, reason codes, metric diagnostics, and binding enforcement remain below the preserved M2 contract. | Blocking Evidence: `/role-model-router/packages/core/src/reason-codes.ts`, `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/core/src/types.ts` | Audit Note: boundary strategy normalization is already present and should be preserved.
- R3 | Status: blocked | Rationale: fixture-driven routing exists, but the harness and expected outputs still enforce only the thinner earlier contract. | Blocking Evidence: `/packages/conformance/src/router-fixture-conformance.test.ts`, `/protocol/fixtures/router-golden/cases/` | Audit Note: some required cases already exist and can be promoted rather than recreated.
- R4 | Status: blocked | Rationale: observability artifacts are emitted and partially tested, but the sample model, helper surface, output schema, and linkage validation are still below the preserved M3 contract. | Blocking Evidence: `/role-model-router/packages/profile-aggregator/src/index.ts`, `/role-model-router/packages/trace/src/index.ts`, `/role-model-router/packages/usage/src/index.ts` | Audit Note: multi-sample aggregation and version-mismatch rejection already exist and should be preserved.
- R5 | Status: blocked | Rationale: gateway-smoke is executable and emits files, but it is not yet a fixture-driven, self-validating, failure-on-broken-linkage harness. | Blocking Evidence: `/role-model-router/apps/gateway-smoke/src/index.ts`, `/packages/conformance/src/gateway-smoke-observability.test.ts` | Audit Note: the root command path is already healthy from run `02-audit-remediation`.

## Audit Verdict

- Audit summary: the current checkout starts from a healthy execution baseline but still falls materially short of the preserved M1-M3 contract in schema depth, router diagnostics, observability linkage helpers, fixture coverage, and smoke harness behavior.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> current canonical schema/tooling strengths and remaining schema/fixture/doc gaps are captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`, `/protocol/schemas/router-decision.schema.json`, `/protocol/schemas/observed-performance-profile.schema.json`, `/protocol/schemas/role-binding.schema.json`
- `R2` -> current router strengths and remaining routing-contract gaps are captured in `## Current Behavior by Requirement`, `## Relevant Code Pointers`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`, `/role-model-router/packages/core/src/reason-codes.ts`, `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/core/src/types.ts`
- `R3` -> current fixture-driven conformance baseline and remaining coverage gaps are captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`, `/packages/conformance/src/router-fixture-conformance.test.ts`, `/protocol/fixtures/router-golden/cases/`
- `R4` -> current observability/linkage baseline and remaining helper/schema gaps are captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`, `/role-model-router/packages/profile-aggregator/src/index.ts`, `/role-model-router/packages/trace/src/index.ts`, `/role-model-router/packages/usage/src/index.ts`
- `R5` -> current smoke-path capabilities and remaining harness gaps are captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`, `/role-model-router/apps/gateway-smoke/src/index.ts`, `/packages/conformance/src/gateway-smoke-observability.test.ts`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/03-protocol-baseline-hardening/00-requirements.md`
  - `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
  - `/.recursive/run/03-protocol-baseline-hardening/role-model-next-implementation-requirement.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/role-model-baseline.md`
- Requirement coverage check:
  - `R1`-`R5`: covered in `## Current Behavior by Requirement`, `## Evidence`, `## Requirement Completion Status`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS5`: preserved; this artifact identifies only M1-M3 hardening gaps and does not widen into deferred native hosts, memory backends, browser/runtime-web expansion, or unrelated cleanup

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the current repo state is tied back to the locked `R1`-`R5` requirement map
  - the already-green baseline is separated from the still-missing contract work
  - the product surfaces that must be planned in Phase 2 are concrete
  - the only unresolved semantic fork that needs a Phase 2 decision is explicitly recorded
- Remaining blockers:
  - none

Approval: PASS
