Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-04-12T05:48:34Z`
LockHash: `991d5ec37b4a48f2d803758fbfdecbb7dc3728e7a59e6e00fc871b10db6e3bdd`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
Scope note: This artifact records the current repository state for `01-protocol-routing-obs`, identifies which M1-M3 requirements are already satisfied versus still mismatched, and establishes the grounded input for the Phase 2 repair plan.

## TODO

- [x] Re-read the locked Phase 0 artifacts
- [x] Inventory the current repository state from the active worktree
- [x] Map current behavior and gaps back to requirement IDs
- [x] Record code pointers, evidence, and known unknowns
- [x] Complete audited-phase sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open the active worktree at `D:\DEV\role-model\.worktrees\01-protocol-routing-obs`.
2. Open `/.recursive/run/01-protocol-routing-obs/00-requirements.md` and read the M1-M3 requirements plus `R1`-`R33` mapping at the top.
3. Inspect the current repo surfaces:
   - `protocol/schemas/`
   - `protocol/fixtures/`
   - `packages/protocol-types/src/generated.ts`
   - `packages/schema-tools/src/validate-schemas.ts`
   - `role-model-router/packages/core/src/router.ts`
   - `role-model-router/packages/core/src/types.ts`
   - `role-model-router/packages/profile-aggregator/src/index.ts`
   - `role-model-router/packages/trace/src/index.ts`
   - `role-model-router/packages/usage/src/index.ts`
   - `role-model-router/apps/gateway-smoke/src/index.ts`
   - `packages/conformance/src/router-conformance.test.ts`
4. Run the baseline commands recorded in `00-worktree.md`:
   - `corepack pnpm run schemas:validate`
   - `corepack pnpm exec biome check .`
   - `corepack pnpm -r --if-present test`
   - `cargo test --manifest-path role-model-router/rust/Cargo.toml --workspace`
5. Compare the existing router, schema, and observability shapes with the stricter structures required in sections 5-13 of `00-requirements.md`.

## Current Behavior by Requirement

- `R1`, `R2`: partially satisfied. The repository already contains the broad M1-M3 implementation surfaces from `00-baseline`, but the stricter run-01 contract is not yet met because the schema, router, and observability semantics still reflect an older baseline shape rather than the new normative requirement.
- `R3`, `R4`: satisfied at the repository-definition level. The repo uses Markdown, JSON Schema, TypeScript, pnpm, Vitest, Ajv, and CI on Node 22, though the local environment currently runs Node 24 and emits an engine warning during pnpm commands.
- `R5`: partially satisfied. Canonical schemas and generated protocol types exist, but runtime router/trace/usage/profile types are also hand-maintained in `role-model-router/packages/**/src/*.ts`, so the repo still has schema-adjacent duplicate protocol definitions.
- `R6`: partially satisfied. The required package surfaces and schema files exist, but the required fixture directories do not; `protocol/fixtures/` currently contains only three example files instead of the required golden fixture directories.
- `R7`: partially satisfied. Schemas are Draft 2020-12 objects with closed shapes, but many omit stable in-file `$id` fields, use open string fields where the run requires closed enums, and do not encode the stricter required/optional distinctions now mandated.
- `R8`: partially satisfied. The capability taxonomy schema exists, but it does not encode the required canonical built-ins as closed built-in entries or enum-backed constraints; it allows arbitrary string IDs.
- `R9`: partially satisfied. The endpoint identity schema exists, but it requires fields that should be optional, omits `endpoint_version`, and does not enforce the required `endpoint_kind` and `provider_kind` enums.
- `R10`: partially satisfied. The declared capability profile schema exists, but `tool_calling` is a boolean instead of the required object, modality values are unconstrained strings, and several required optional fields are missing.
- `R11`: partially satisfied. The observed performance schema exists, but it still uses `measurement_window` plus required single-value fields like `judge_score`; it does not model `sample_window`, `sources`, optional `quality_score`, or the required sample-count consistency rules.
- `R12`: blocked. The routing policy schema still uses the older `prefer_local`, `budget_mode`, and `tie_break_order` model rather than the required `compute_preference`, capability/provider allow-deny filters, `budget`, `privacy`, and `targets` structure.
- `R13`: partially satisfied. Role/task/binding/profile schemas exist, but the shapes do not match the stricter contract: `role-binding` uses `experimental` instead of `candidate`, `task-execution-profile` lacks `role_id` and `routing_policy_patch`, and the role/task entities include older extra fields without the exact required shape.
- `R14`: partially satisfied. A router decision schema exists, but it uses `eligible_candidates` and `ineligible_candidates[].reasons` instead of the required `eligibility[]` entries with `CandidateExclusion` objects and does not constrain all required exclusion/selection reason codes.
- `R15`: partially satisfied. Trace and usage schemas exist, but trace spans/events lack `request_id` and `routing_decision_id`, `trace-span` still uses `name` instead of `span_type`, `trace-event` still uses `message` instead of the required `payload`, and usage-event optionality also differs from the new requirement.
- `R16`: blocked. M1 acceptance is not met because fixture directories are incomplete, multiple schemas/types drift from the required contract, and the generated/runtime protocol surfaces do not yet align cleanly enough to treat M1 as complete.
- `R17`: partially satisfied. The router package exposes a deterministic pure function in `role-model-router/packages/core/src/router.ts`, but its accepted input shape is narrower than required.
- `R18`: partially satisfied. The router accepts request metadata plus endpoint/declared/observed candidates, but it does not accept role definitions, task definitions, role bindings, or a full routing-policy object matching the new schema.
- `R19`: blocked. The eligibility pipeline is only partially implemented; it lacks provider-kind filtering, role-binding checks, and role/task compatibility checks, so the exact required precedence order is not satisfied.
- `R20`: blocked. Scoring does not implement the required normalized metric formulas, precedence rules, or strategy weights. The current implementation uses an older additive heuristic with different strategy names.
- `R21`: partially satisfied. The router returns fallback chains and deterministic tie-breaks, but it lacks the required `0.01` epsilon tie rule and does not implement unknown-metric redistribution.
- `R22`: partially satisfied. Conformance tests exist and pass, but they are hand-authored rather than fixture-driven and miss several required cases, especially role/task, privacy, provider filtering, and unknown-metric redistribution.
- `R23`: blocked. M2 acceptance is not met because role/task logic is not wired into routing, required reason codes are incomplete, scoring math is non-conformant, and tests are not fixture-driven.
- `R24`: partially satisfied. The smoke path emits router decision, trace, usage, and observed-performance artifacts, but the linkage chain is only partially protocol-real because the trace and observed-profile structures do not match the new contract.
- `R25`: blocked. The profile aggregator only handles a single benchmark sample and does not model the required internal sample record or multi-sample aggregation path.
- `R26`: blocked. Deterministic aggregation rules for sample windows, p50/p95, throughput median, cost median, failure aggregation, and quality aggregation are not implemented.
- `R27`: blocked. Freshness and confidence are hard-coded rather than computed from the required formulas, and endpoint-version invalidation is not modeled.
- `R28`: partially satisfied. The gateway smoke app emits artifacts, but it still emits only a `router.selection` span plus older event shapes, not the required `router.scoring` span, `router.decision.created` event, or stricter trace/usage linkage contract, and observability conformance tests are absent.
- `R29`: blocked. M3 acceptance is not met because the profile aggregator is single-sample, schema linkage is incomplete, and observed profiles are not consumed under the full required semantics.
- `R30`: partially satisfied. The repo documents and scripts already provide part of the required validation surface, but the stricter M3 semantics are still incomplete.
- `R31`: partially satisfied. Schema validation, type generation, tests, and CI commands exist, but `schemas:validate` currently validates only schemas rather than the required fixture corpus, the stricter run-01 contract is not fully covered, and `biome check .` currently fails in the Windows worktree baseline due tracked-file formatting drift.
- `R32`: partially satisfied. The repo contains real implementation work rather than only placeholders, but some router-provider/native surfaces remain scaffold-grade and the current M1-M3 semantics are still incomplete enough that run-01 completion cannot yet be claimed.
- `R33`: blocked. The repository is not yet at the run-01 definition of done because protocol, router, and observability semantics still need structural and behavioral upgrades to match the new normative requirement.

## Relevant Code Pointers

- `/.recursive/run/01-protocol-routing-obs/00-requirements.md` — canonical run-01 requirements and stricter M1-M3 contract
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md` — locked Phase 0 worktree and diff-basis record
- `package.json` — toolchain, scripts, Node engine, and validation command surface
- `.github/workflows/ci.yml` — current CI command chain
- `protocol/schemas/endpoint-identity.schema.json` — endpoint schema shape and enum gaps
- `protocol/schemas/routing-policy.schema.json` — older routing-policy model
- `protocol/schemas/observed-performance-profile.schema.json` — older observed-profile shape
- `protocol/schemas/router-decision.schema.json` — older router-decision eligibility model
- `protocol/schemas/trace-span.schema.json`
- `protocol/schemas/trace-event.schema.json`
- `protocol/schemas/usage-event.schema.json`
- `protocol/schemas/role-definition.schema.json`
- `protocol/schemas/task-definition.schema.json`
- `protocol/schemas/role-binding.schema.json`
- `protocol/schemas/task-execution-profile.schema.json`
- `protocol/fixtures/` — current example-only fixture directory
- `packages/protocol-types/src/generated.ts` — generated types that mirror the older schema contract
- `packages/schema-tools/src/validate-schemas.ts` — schema loading/validation/generation path
- `packages/conformance/src/router-conformance.test.ts` — hand-authored router tests
- `role-model-router/packages/core/src/types.ts` — hand-maintained router-side protocol types
- `role-model-router/packages/core/src/reason-codes.ts` — currently available exclusion/selection codes
- `role-model-router/packages/core/src/router.ts` — current eligibility, scoring, and tie-break logic
- `role-model-router/packages/profile-aggregator/src/index.ts` — current single-sample aggregator
- `role-model-router/packages/trace/src/index.ts` — current trace artifact model
- `role-model-router/packages/usage/src/index.ts` — current usage-event model
- `role-model-router/packages/roles/src/index.ts` — default role list not consumed by router logic
- `role-model-router/packages/tasks/src/index.ts` — default task list not consumed by router logic
- `role-model-router/apps/gateway-smoke/src/index.ts` — smoke-path emission chain

## Known Unknowns

- The exact smallest change set needed to preserve backward compatibility while upgrading strategy names and routing-policy shape has not yet been chosen.
- The current Windows-only `biome check .` failure appears to be checkout-formatting drift rather than broken product logic, but the repo-level fix should be decided explicitly in Phase 2 rather than folded into unrelated protocol work by accident.
- The repo already contains some beyond-M1-M3 scaffolding from `00-baseline`; Phase 2 must preserve the user’s instruction not to expand run-01 into unrelated provider/runtime work.

## Evidence

- `corepack pnpm run schemas:validate` passes in the run-01 worktree and validates 19 schema files, but `packages/schema-tools/src/validate-schemas.ts` currently validates schemas only and does not cover the required golden fixtures.
- `corepack pnpm -r --if-present test` passes in the run-01 worktree.
- `cargo test --manifest-path role-model-router/rust/Cargo.toml --workspace` passes in the run-01 worktree.
- `corepack pnpm exec biome check .` fails in the run-01 worktree because tracked files would be reformatted under the current Windows checkout.
- `protocol/fixtures/` currently contains only:
  - `example-endpoint-identity.json`
  - `example-router-decision.json`
  - `example-usage-event.json`
- `role-model-router/packages/core/src/router.ts` implements older strategy names (`low-cost`, `low-latency`, `high-quality`) and an additive heuristic score instead of the required normalized weighted scoring.
- `role-model-router/packages/profile-aggregator/src/index.ts` aggregates a single sample into a legacy observed-profile shape with `measurement_window`.
- `role-model-router/apps/gateway-smoke/src/index.ts` emits one `router.selection` span plus `router.eligibility` and `router.selection` events, but not the required `router.scoring` span, `router.decision.created` trace event, or stricter multi-span linkage shape required by run-01.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
- `/.recursive/run/00-baseline/00-worktree.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `recursive-subagent` loaded successfully in this session, custom background task agents launched successfully, and delegated audit/review tooling is available.
Delegation Decision Basis: `Phase 1 required a controller-verified snapshot tied tightly to the current worktree, the locked Phase 0 diff basis, and many small protocol/router files. Direct file inspection produced the authoritative AS-IS snapshot, while bounded M1 and M2 subagent scans plus a delayed phase-auditor pass were used only to prompt controller re-checks and repairs.`
Delegation Override Reason: `The generated delegated phase-audit bundle was incomplete because it recorded Changed Files Reviewed: none for this untracked run folder, so a full delegated Phase 1 audit could not be accepted as lockable evidence. The controller therefore retained self-audit ownership and did not rely on delegated output for the final lockable verdict.`
Audit Inputs Provided:
- `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
- Targeted code references:
  - `/package.json`
  - `/.github/workflows/ci.yml`
  - `/protocol/schemas/*.schema.json`
  - `/protocol/fixtures/`
  - `/packages/protocol-types/src/generated.ts`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/conformance/src/router-conformance.test.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/core/src/types.ts`
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
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- Upstream artifact: `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - Claim carried forward: run 01 must preserve the existing baseline where correct but upgrade the repo to the stricter M1-M3 protocol, router, observability, and validation contract.
  - Current reconciliation: the broad M1-M3 repo surfaces already exist, but many of the actual schema and runtime semantics still implement the older baseline rather than the stricter run-01 contract.
- Upstream artifact: `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - Claim carried forward: downstream phases execute from `recursive/01-protocol-routing-obs` using baseline commit `c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`.
  - Current reconciliation: Phase 1 inspection was performed entirely from the isolated worktree and uses the locked diff basis unchanged.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
  - `/.recursive/run/01-protocol-routing-obs/evidence/review-bundles/01-as-is-phase-auditor.md`
  - `/package.json`
  - `/.github/workflows/ci.yml`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/protocol/schemas/*.schema.json`
  - `/protocol/fixtures/`
  - `/packages/protocol-types/src/generated.ts`
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
- Refresh Handling: `bounded M1/M2 audit receipts and the delegated phase-auditor output were used only as repair prompts; no delegated record is relied on for lockable Phase 1 evidence after controller re-read and repair`
- Repair Performed After Verification:
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Comparison reference: `working-tree`
- Normalized baseline: `c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd`
- Diff basis used: `git diff --name-only c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd` plus `git status --short` because the run folder is currently untracked
- Base branch: `main`
- Worktree branch: `recursive/01-protocol-routing-obs`
- Planned or claimed changed files:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
  - `/.recursive/run/01-protocol-routing-obs/evidence/review-bundles/01-as-is-phase-auditor.md`
  - `/.recursive/run/01-protocol-routing-obs/subagents/run01-m1-schema-audit.md`
  - `/.recursive/run/01-protocol-routing-obs/subagents/run01-m2-router-audit.md`
- Actual changed files reviewed:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/role-model-m1-m3-baseline-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/run/01-protocol-routing-obs/01-as-is.md`
  - `/.recursive/run/01-protocol-routing-obs/evidence/review-bundles/01-as-is-phase-auditor.md`
  - `/.recursive/run/01-protocol-routing-obs/subagents/run01-m1-schema-audit.md`
  - `/.recursive/run/01-protocol-routing-obs/subagents/run01-m2-router-audit.md`
- Unexplained drift:
  - none

## Gaps Found

- none; the repository-wide implementation gaps are the intended subject of this AS-IS analysis and are already captured under `## Current Behavior by Requirement` and `## Requirement Completion Status`, while the phase-audit defects identified during review were repaired before re-audit.

## Repair Work Performed

- corrected the Phase 1 diff audit so it explicitly records that `git diff --name-only c62b72f8f0a7fc3be61a29dddbe9458ef4fb9acd` is empty for this untracked run folder and that `git status --short --untracked-files=all` provided the actual reviewed run-artifact scope
- strengthened `R15`, `R28`, `R31`, and `## Evidence` so the artifact no longer understates the trace/event shape gaps, missing gateway-smoke span/event coverage, or the fact that `schemas:validate` does not validate the required fixture corpus
- added the missing `## Audit Verdict` and `## Traceability` sections required by the Phase 1 template
- normalized `## Requirement Completion Status` entries to the lockable `R# | Status:` format without wrapped code ticks around each requirement identifier

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the repo already centers M1-M3 semantics, but run-01 scope discipline still needs to be enforced while upgrading older baseline semantics. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md` | Audit Note: beyond-scope scaffolds exist but do not yet force unrelated work.
- R2 | Status: blocked | Rationale: the required repo surfaces exist broadly, but the stricter schema/router/observability semantics are not yet fully satisfied. | Blocking Evidence: `/protocol/schemas/`, `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/profile-aggregator/src/index.ts` | Audit Note: end-state outcomes are only partially met.
- R3 | Status: blocked | Rationale: the repo-definition language and tooling choices already align with the requirement, but Phase 1 still records the run as blocked because downstream M1-M3 implementation work remains incomplete. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md` | Audit Note: the language/tooling baseline is not itself the blocker.
- R4 | Status: blocked | Rationale: the repo-definition dependency and CI surfaces already align with the requirement, but Phase 1 still records the run as blocked because downstream M1-M3 implementation work remains incomplete. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md`, `/.recursive/run/01-protocol-routing-obs/00-worktree.md` | Audit Note: the local Node 24 warning is environmental, not a repo-definition gap.
- R5 | Status: blocked | Rationale: schemas and generated types exist, but hand-maintained runtime protocol types still create duplicate protocol-shape ownership. | Blocking Evidence: `/packages/protocol-types/src/generated.ts`, `/role-model-router/packages/core/src/types.ts`, `/role-model-router/packages/trace/src/index.ts`, `/role-model-router/packages/usage/src/index.ts` | Audit Note: canonical ownership is incomplete.
- R6 | Status: blocked | Rationale: required schema/package surfaces exist, but required golden fixture directories do not. | Blocking Evidence: `/protocol/fixtures/`, `/packages/`, `/role-model-router/packages/` | Audit Note: fixture layout remains underspecified.
- R7 | Status: blocked | Rationale: schemas are closed Draft 2020-12 objects, but many miss stable in-file `$id` values, closed enums, or the stricter required/optional semantics. | Blocking Evidence: `/protocol/schemas/` | Audit Note: general schema discipline is only partially upgraded.
- R8 | Status: blocked | Rationale: capability taxonomy exists, but canonical built-ins are not encoded as enforced built-ins in schema form. | Blocking Evidence: `/protocol/schemas/capability-taxonomy.schema.json` | Audit Note: capability IDs are effectively open strings.
- R9 | Status: blocked | Rationale: endpoint identity exists, but enum constraints and optional-field semantics do not match the new contract. | Blocking Evidence: `/protocol/schemas/endpoint-identity.schema.json` | Audit Note: `endpoint_version` is missing and many optional fields are required.
- R10 | Status: blocked | Rationale: declared capability profile exists, but `tool_calling` and modality semantics are still older-model. | Blocking Evidence: `/protocol/schemas/declared-capability-profile.schema.json`, `/role-model-router/packages/core/src/types.ts` | Audit Note: required `tool_calling` object is absent.
- R11 | Status: blocked | Rationale: observed profile exists, but uses legacy `measurement_window` and required `judge_score` instead of the required sample-window and sources model. | Blocking Evidence: `/protocol/schemas/observed-performance-profile.schema.json`, `/packages/protocol-types/src/generated.ts`, `/role-model-router/packages/profile-aggregator/src/index.ts` | Audit Note: schema and implementation both need upgrade.
- R12 | Status: blocked | Rationale: routing policy remains on the older `prefer_local`/`budget_mode` model instead of the required compute/budget/privacy/targets model. | Blocking Evidence: `/protocol/schemas/routing-policy.schema.json`, `/role-model-router/packages/core/src/types.ts` | Audit Note: this is a central structural mismatch.
- R13 | Status: blocked | Rationale: role/task/binding/profile schemas exist, but exact required fields and status enums do not match the stricter contract. | Blocking Evidence: `/protocol/schemas/role-definition.schema.json`, `/protocol/schemas/task-definition.schema.json`, `/protocol/schemas/role-binding.schema.json`, `/protocol/schemas/task-execution-profile.schema.json` | Audit Note: `candidate`, `role_id`, and `routing_policy_patch` mismatches remain.
- R14 | Status: blocked | Rationale: router-decision schema exists, but its eligibility and exclusion structure is still the older baseline model. | Blocking Evidence: `/protocol/schemas/router-decision.schema.json`, `/role-model-router/packages/core/src/types.ts` | Audit Note: required `eligibility[]` entries and `CandidateExclusion` objects are absent.
- R15 | Status: blocked | Rationale: trace and usage schemas exist, but linkage fields, `span_type`/`payload` shapes, and event/span enums do not match the stricter contract. | Blocking Evidence: `/protocol/schemas/trace-span.schema.json`, `/protocol/schemas/trace-event.schema.json`, `/protocol/schemas/usage-event.schema.json`, `/role-model-router/packages/trace/src/index.ts`, `/role-model-router/packages/usage/src/index.ts` | Audit Note: request and routing decision linkage is incomplete and the current payload model is still older-baseline.
- R16 | Status: blocked | Rationale: M1 acceptance cannot pass while schema, fixture, and generated/runtime shape mismatches remain. | Blocking Evidence: `/protocol/fixtures/`, `/packages/protocol-types/src/generated.ts`, `/protocol/schemas/` | Audit Note: M1 remains incomplete.
- R17 | Status: blocked | Rationale: the router package outcome exists, but required inputs are missing. | Blocking Evidence: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/core/src/types.ts` | Audit Note: pure function exists, full contract does not.
- R18 | Status: blocked | Rationale: endpoint/declared/observed inputs are accepted, but role/task/binding inputs and full routing policy structure are missing. | Blocking Evidence: `/role-model-router/packages/core/src/types.ts` | Audit Note: input signature is narrower than required.
- R19 | Status: blocked | Rationale: the eligibility pipeline omits provider-kind, role-binding, and role/task checks required by the exact precedence order. | Blocking Evidence: `/role-model-router/packages/core/src/router.ts` | Audit Note: current pipeline is incomplete.
- R20 | Status: blocked | Rationale: scoring uses a legacy additive heuristic and older strategy names instead of the required normalized metrics and weights. | Blocking Evidence: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/core/src/types.ts`, `/protocol/schemas/routing-policy.schema.json` | Audit Note: this is the main M2 behavior gap.
- R21 | Status: blocked | Rationale: fallback ordering and deterministic tie-breaks exist, but epsilon tie handling and unknown-metric redistribution do not. | Blocking Evidence: `/role-model-router/packages/core/src/router.ts` | Audit Note: behavior is close but non-conformant.
- R22 | Status: blocked | Rationale: router tests exist and pass, but they are not fixture-driven and miss several required cases. | Blocking Evidence: `/packages/conformance/src/router-conformance.test.ts`, `/protocol/fixtures/` | Audit Note: conformance depth is insufficient.
- R23 | Status: blocked | Rationale: M2 acceptance cannot pass while role/task routing, scoring, and fixture-driven coverage remain incomplete. | Blocking Evidence: `/role-model-router/packages/core/src/router.ts`, `/packages/conformance/src/router-conformance.test.ts` | Audit Note: M2 remains incomplete.
- R24 | Status: blocked | Rationale: the smoke path emits the four artifact families, but their linkage contract is only partially aligned with run-01. | Blocking Evidence: `/role-model-router/apps/gateway-smoke/src/index.ts`, `/role-model-router/packages/trace/src/index.ts`, `/role-model-router/packages/usage/src/index.ts` | Audit Note: artifact chain exists but is not yet normatively correct.
- R25 | Status: blocked | Rationale: there is no explicit multi-sample internal sample model for profile aggregation. | Blocking Evidence: `/role-model-router/packages/profile-aggregator/src/index.ts` | Audit Note: only single-sample aggregation exists.
- R26 | Status: blocked | Rationale: deterministic aggregation rules for windows, percentiles, throughput/cost medians, and error aggregation are absent. | Blocking Evidence: `/role-model-router/packages/profile-aggregator/src/index.ts`, `/protocol/schemas/observed-performance-profile.schema.json` | Audit Note: observed-profile semantics remain baseline-grade.
- R27 | Status: blocked | Rationale: freshness/confidence formulas and endpoint-version invalidation are not implemented. | Blocking Evidence: `/role-model-router/packages/profile-aggregator/src/index.ts` | Audit Note: current values are hard-coded.
- R28 | Status: blocked | Rationale: smoke emission exists, but required trace-event names, span sets, linkage fields, and observability conformance tests are incomplete. | Blocking Evidence: `/role-model-router/apps/gateway-smoke/src/index.ts`, `/protocol/schemas/trace-span.schema.json`, `/protocol/schemas/trace-event.schema.json`, `/testdata/traces/sample-trace.json` | Audit Note: the smoke path still lacks the required `router.scoring` span and `router.decision.created` event.
- R29 | Status: blocked | Rationale: M3 acceptance cannot pass while aggregation and linkage semantics remain incomplete. | Blocking Evidence: `/role-model-router/packages/profile-aggregator/src/index.ts`, `/role-model-router/apps/gateway-smoke/src/index.ts` | Audit Note: M3 remains incomplete.
- R30 | Status: blocked | Rationale: validation commands and smoke paths exist, but the underlying semantics they validate still need upgrade. | Blocking Evidence: `/package.json`, `/.github/workflows/ci.yml`, `/role-model-router/apps/gateway-smoke/src/index.ts` | Audit Note: command surface exists, contract conformance does not.
- R31 | Status: blocked | Rationale: schema validation, type generation, tests, and CI commands exist, but fixture validation required by run-01 is still missing and the repo is not lint-clean under the current Windows checkout. | Blocking Evidence: `/packages/schema-tools/src/validate-schemas.ts`, `/.recursive/run/01-protocol-routing-obs/00-worktree.md`, `/packages/conformance/src/router-conformance.test.ts` | Audit Note: baseline validation is only partially green and does not yet cover the required fixture corpus.
- R32 | Status: blocked | Rationale: the repo contains real code, but some provider/native surfaces remain scaffold-grade and the current state still falls short of the stricter requirement. | Blocking Evidence: `/role-model-router/packages/`, `/role-model-router/rust/crates/` | Audit Note: this does not yet violate the non-goal rule, but it does not satisfy completion either.
- R33 | Status: blocked | Rationale: the stricter definition of done is not met while M1-M3 semantic mismatches remain. | Blocking Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md` | Audit Note: Phase 2 must target the remaining schema/router/observability upgrades.

## Audit Verdict

- Audit summary: the delegated phase-auditor initially failed this artifact on meta-audit accuracy, not on the underlying M1-M3 status calls. After controller repair, the Phase 1 artifact now accurately records the untracked diff scope, includes the required audited-phase sections, and no longer understates the command-surface or observability gaps.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13`, `R14`, `R15`, `R16` -> current M1 schema/entity/fixture state is captured in `## Current Behavior by Requirement`, `## Relevant Code Pointers`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md`, `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `R17`, `R18`, `R19`, `R20`, `R21`, `R22`, `R23` -> current M2 router, scoring, role/task, reason-code, and conformance-test state is captured in `## Current Behavior by Requirement`, `## Relevant Code Pointers`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md`, `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `R24`, `R25`, `R26`, `R27`, `R28`, `R29` -> current M3 smoke-path, trace/usage linkage, aggregation, and observability state is captured in `## Current Behavior by Requirement`, `## Relevant Code Pointers`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md`, `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
- `R30`, `R31`, `R32`, `R33` -> current validation surface, repository honesty, and definition-of-done status is captured in `## Current Behavior by Requirement`, `## Evidence`, and `## Requirement Completion Status`. | Evidence: `/.recursive/run/01-protocol-routing-obs/01-as-is.md`, `/.recursive/run/01-protocol-routing-obs/00-worktree.md`, `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/01-protocol-routing-obs/00-requirements.md`
  - `/.recursive/run/01-protocol-routing-obs/00-worktree.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
- Requirement coverage check:
  - `R1`-`R33`: covered in `## Current Behavior by Requirement`, `## Requirement Completion Status`, `## Traceability`, and `## Relevant Code Pointers`
- Out-of-scope confirmation:
  - `OOS1`-`OOS8`: unchanged from Phase 0 requirements and not contradicted by the current checkout

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the current repository state is tied back to the stricter run-01 requirement set
  - already-satisfied versus still-mismatched surfaces are separated explicitly
  - downstream planning can proceed from this artifact without re-inventing the gap analysis
  - no required Phase 1 section is missing
- Remaining blockers:
  - none

Approval: PASS
