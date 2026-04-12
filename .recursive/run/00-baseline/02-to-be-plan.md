Run: `/.recursive/run/00-baseline/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-04-12T02:08:03Z`
LockHash: `5774ef0e891436f9f36503cf0f0a37b17e329e89b1edd9e34581465f3f5232ac`
Inputs:
- `/.recursive/run/00-baseline/00-requirements.md`
- `/.recursive/run/00-baseline/01-as-is.md`
Outputs:
- `/.recursive/run/00-baseline/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the stable-baseline requirements into concrete file creation, implementation sequencing, validation commands, and phased acceptance criteria for the `00-baseline` run.

## TODO

- [x] Re-read the locked requirements and AS-IS artifacts
- [x] Define concrete files and directories to create or modify
- [x] Define implementation steps in requirement-safe order
- [x] Define testing, smoke, and manual QA commands
- [x] Decompose the run into ordered implementation sub-phases
- [x] Complete audited-phase sections and gates

## Planned Changes by File

### Root repository files

- `README.md`
- `LICENSE`
- `CLA.md`
- `package.json`
- `pnpm-workspace.yaml`
- `biome.json`
- `tsconfig.base.json`
- `rust-toolchain.toml`
- `.github/workflows/ci.yml`

### Architecture docs

- `docs/architecture/00-overview.md`
- `docs/architecture/01-repo-boundaries.md`
- `docs/architecture/02-router-hosts.md`
- `docs/architecture/03-observability-model.md`
- `docs/architecture/04-benchmark-model.md`
- `docs/architecture/05-memory-model.md`

### Protocol docs

- `docs/protocol/capability-taxonomy.md`
- `docs/protocol/endpoint-identity.md`
- `docs/protocol/routing-policy.md`
- `docs/protocol/profiles.md`
- `docs/protocol/usage.md`
- `docs/protocol/traces.md`
- `docs/protocol/benchmarks.md`
- `docs/protocol/roles.md`
- `docs/protocol/tasks.md`
- `docs/protocol/role-task-capability-mapping.md`
- `docs/protocol/planspec.md`
- `docs/protocol/manifests.md`
- `docs/protocol/openai-compat.md`
- `docs/protocol/reason-codes.md`

### Decision records

- `docs/decisions/0001-protocol-is-canonical.md`
- `docs/decisions/0002-router-family-layout.md`
- `docs/decisions/0003-endpoint-is-routing-unit.md`
- `docs/decisions/0004-observed-performance-is-first-class.md`
- `docs/decisions/0005-roles-and-tasks-are-protocol-entities.md`

### Protocol tree and schemas

- `protocol/README.md`
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
- `protocol/fixtures/example-endpoint-identity.json`
- `protocol/fixtures/example-router-decision.json`
- `protocol/fixtures/example-usage-event.json`

### Shared root packages

- `packages/protocol-types/package.json`
- `packages/protocol-types/tsconfig.json`
- `packages/protocol-types/src/index.ts`
- `packages/conformance/package.json`
- `packages/conformance/tsconfig.json`
- `packages/conformance/src/router-conformance.test.ts`
- `packages/schema-tools/package.json`
- `packages/schema-tools/tsconfig.json`
- `packages/schema-tools/src/index.ts`
- `packages/schema-tools/src/validate-schemas.ts`
- `packages/store-contract/package.json`
- `packages/store-contract/tsconfig.json`
- `packages/store-contract/src/index.ts`
- `packages/packaging/package.json`
- `packages/packaging/tsconfig.json`
- `packages/packaging/src/index.ts`

### Router repo structure and packages

- `role-model-router/README.md`
- `role-model-router/skills/router/README.md`
- `role-model-router/skills/benchmark/README.md`
- `role-model-router/skills/detect-endpoints/README.md`
- `role-model-router/skills/export-config/README.md`
- `role-model-router/packages/core/package.json`
- `role-model-router/packages/core/tsconfig.json`
- `role-model-router/packages/core/src/index.ts`
- `role-model-router/packages/core/src/reason-codes.ts`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/core/src/types.ts`
- `role-model-router/packages/openai-compat/package.json`
- `role-model-router/packages/openai-compat/tsconfig.json`
- `role-model-router/packages/openai-compat/src/index.ts`
- `role-model-router/packages/trace/package.json`
- `role-model-router/packages/trace/tsconfig.json`
- `role-model-router/packages/trace/src/index.ts`
- `role-model-router/packages/usage/package.json`
- `role-model-router/packages/usage/tsconfig.json`
- `role-model-router/packages/usage/src/index.ts`
- `role-model-router/packages/profile-aggregator/package.json`
- `role-model-router/packages/profile-aggregator/tsconfig.json`
- `role-model-router/packages/profile-aggregator/src/index.ts`
- `role-model-router/packages/bench-core/package.json`
- `role-model-router/packages/bench-core/tsconfig.json`
- `role-model-router/packages/bench-core/src/index.ts`
- `role-model-router/packages/bench-judge/package.json`
- `role-model-router/packages/bench-judge/tsconfig.json`
- `role-model-router/packages/bench-judge/src/index.ts`
- `role-model-router/packages/provider-acp/package.json`
- `role-model-router/packages/provider-acp/tsconfig.json`
- `role-model-router/packages/provider-acp/src/index.ts`
- `role-model-router/packages/provider-mcp/package.json`
- `role-model-router/packages/provider-mcp/tsconfig.json`
- `role-model-router/packages/provider-mcp/src/index.ts`
- `role-model-router/packages/provider-cli/package.json`
- `role-model-router/packages/provider-cli/tsconfig.json`
- `role-model-router/packages/provider-cli/src/index.ts`
- `role-model-router/packages/runtime-web/package.json`
- `role-model-router/packages/runtime-web/tsconfig.json`
- `role-model-router/packages/runtime-web/src/index.ts`
- `role-model-router/packages/provider-webllm/package.json`
- `role-model-router/packages/provider-webllm/tsconfig.json`
- `role-model-router/packages/provider-webllm/src/index.ts`
- `role-model-router/packages/provider-mediapipe-genai/package.json`
- `role-model-router/packages/provider-mediapipe-genai/tsconfig.json`
- `role-model-router/packages/provider-mediapipe-genai/src/index.ts`
- `role-model-router/packages/provider-mediapipe-text/package.json`
- `role-model-router/packages/provider-mediapipe-text/tsconfig.json`
- `role-model-router/packages/provider-mediapipe-text/src/index.ts`
- `role-model-router/packages/provider-litertlm-web/package.json`
- `role-model-router/packages/provider-litertlm-web/tsconfig.json`
- `role-model-router/packages/provider-litertlm-web/src/index.ts`
- `role-model-router/packages/roles/package.json`
- `role-model-router/packages/roles/tsconfig.json`
- `role-model-router/packages/roles/src/index.ts`
- `role-model-router/packages/tasks/package.json`
- `role-model-router/packages/tasks/tsconfig.json`
- `role-model-router/packages/tasks/src/index.ts`

### Router apps and native placeholders

- `role-model-router/apps/bench-cli/package.json`
- `role-model-router/apps/bench-cli/tsconfig.json`
- `role-model-router/apps/bench-cli/src/index.ts`
- `role-model-router/apps/router-devtools/package.json`
- `role-model-router/apps/router-devtools/tsconfig.json`
- `role-model-router/apps/router-devtools/src/index.ts`
- `role-model-router/apps/gateway-smoke/package.json`
- `role-model-router/apps/gateway-smoke/tsconfig.json`
- `role-model-router/apps/gateway-smoke/src/index.ts`
- `role-model-router/rust/README.md`
- `role-model-router/rust/Cargo.toml`
- `role-model-router/rust/crates/rm_provider_litertlm/Cargo.toml`
- `role-model-router/rust/crates/rm_provider_litertlm/src/lib.rs`
- `role-model-router/rust/crates/rm_provider_mediapipe_bridge/Cargo.toml`
- `role-model-router/rust/crates/rm_provider_mediapipe_bridge/src/lib.rs`

### Testdata and fixtures

- `testdata/prompts/chat-basic.json`
- `testdata/prompts/code-edit-basic.json`
- `testdata/eval-cases/reasoning-multi-step.json`
- `testdata/eval-cases/json-schema-adherence.json`
- `testdata/traces/sample-trace.json`
- `testdata/endpoint-metadata/sample-endpoints.json`

## Implementation Steps

1. Initialize the root Node 22 + pnpm workspace, shared TypeScript config, Biome config, and Rust stable toolchain/workspace files before creating feature packages.
2. Create the root repo skeleton so the repository has a stable home for docs, schemas, packages, router packages, apps, rust crates, and testdata.
3. Write architecture docs, protocol docs, and decision records before host-specific implementation so protocol semantics are defined in docs first.
4. Create the schema set under `protocol/schemas/` together with example fixtures under `protocol/fixtures/`.
5. Implement `packages/protocol-types` and `packages/schema-tools` so generated protocol types and schema validation have reusable code paths anchored to canonical JSON Schema.
6. Implement the deterministic routing core in `role-model-router/packages/core` together with shared reason-code and routing types.
7. Add conformance coverage in `packages/conformance` and wire it into the root TypeScript test command.
8. Implement observability artifact writers, benchmark packages, and shared packaging/store contracts.
9. Implement role/task packages plus the lightweight host baseline across router skills, provider packages, and smoke apps.
10. Add browser/edge/native scaffolding packages and rust placeholder crates without overstating runtime completeness or hard-wiring deferred runtime dependencies at the repo root.
11. Add root README guidance, documented root quality-gate commands, and CI workflow wiring after the commands they document actually exist.

## Testing Strategy

- Install and workspace bootstrap: `pnpm install`
- Schema validation: `pnpm run schemas:validate`
- Protocol type generation: `pnpm run types:generate`
- Formatting/linting: `pnpm run lint`
- Type-aware package verification: `pnpm run build`
- TypeScript/router tests: `pnpm run test`
- Rust tests: `pnpm run test:rust`
- Lightweight host smoke: `pnpm run smoke`
- CI parity check: `pnpm run ci:check`

Pass criteria:

- schema validation succeeds against every required schema file
- routing conformance tests cover the required exclusion, preference, measured-profile, cost, and tie-break cases
- smoke execution writes routing decision, trace, and usage artifacts to a documented runtime output path
- the root CI workflow can run the same commands non-interactively

## Playwright Plan (if applicable)

- Not applicable for this baseline run.
- Rationale: the planned implementation does not introduce a browser UI or an existing Playwright harness; Phase 5 will use agent-operated CLI/manual smoke scenarios instead.

## Manual QA Scenarios

1. **Repo navigation:** open the root `README.md`, verify it explains the protocol, router family, baseline scope, and deferred items.
2. **Schema tooling:** run `pnpm run schemas:validate`, confirm all required schema files validate.
3. **Type generation:** run `pnpm run types:generate`, confirm generated protocol types come from the canonical schema files.
4. **Routing conformance:** run `pnpm run test`, confirm deterministic routing and reason-code cases pass.
5. **Gateway smoke:** run `pnpm run smoke`, confirm the smoke app writes `RouterDecision`, trace, and usage artifacts under the documented runtime output path.
5. **Config export:** run the config export path, confirm a stable machine-readable config artifact is emitted.

## Idempotence and Recovery

- Re-running `pnpm install` and the root build/test scripts should be safe because all generated outputs remain inside ignored or documented runtime paths.
- If a package scaffold is partially created, re-run the workspace command after restoring the missing file at the planned path rather than inventing alternate locations.
- If smoke artifacts pollute the working tree, remove only the documented runtime output directory and rerun `pnpm run smoke`.
- If a planned file path must move during implementation, record that via a Phase 3 upstream-gap addendum instead of silently diverging from this plan.

## Implementation Sub-phases

### SP1. Workspace/toolchain baseline, repo skeleton, and canonical docs

Scope and purpose:
Create the fixed workspace/toolchain baseline plus the repository layout, root docs, architecture docs, protocol docs, and decision records so the protocol is defined as versioned repository content before code implementation expands.
Requirement mapping: `R1`, `R2`, `R3`, `R4`, `R5`, `R18`, `R19`, `R20`, `R30`, `R31`, `R34`, `R50`, `R51`, `R52`, `R53`, `R54`, `R55`

Implementation checklist:
- [ ] Create root files `README.md`, `LICENSE`, `CLA.md`, `package.json`, `pnpm-workspace.yaml`, `biome.json`, `tsconfig.base.json`, and `rust-toolchain.toml`
- [ ] Create directory structure under `protocol/`, `docs/`, `packages/`, `role-model-router/`, `testdata/`, and `.github/`
- [ ] Create `role-model-router/rust/Cargo.toml` as the Rust workspace root
- [ ] Write `docs/architecture/*.md`
- [ ] Write `docs/protocol/*.md`
- [ ] Write `docs/decisions/*.md`
- [ ] Write `role-model-router/README.md` and skill README stubs under `role-model-router/skills/`

Tests for this sub-phase:
- `pnpm run lint`
- `pnpm run build`

Sub-phase acceptance:
- A human can navigate the repo and understand the protocol, router family, scope boundaries, and deferred work from the docs alone.

Rollback / recovery notes:
- If doc structure drifts, restore the planned paths and re-run the docs check before moving on.

### SP2. Schemas, fixtures, protocol types, and schema tooling

Scope and purpose:
Create the machine-readable protocol schemas, example fixtures, generated protocol types, and schema tooling so later routing and host code compile against canonical JSON Schema rather than a competing model.
Requirement mapping: `R6`, `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13`, `R14`, `R15`, `R16`, `R17`, `R32`, `R43`, `R45`, `R56`, `R57`

Implementation checklist:
- [ ] Create all required schema files under `protocol/schemas/`
- [ ] Create example fixtures under `protocol/fixtures/`
- [ ] Implement generated-type flow for `packages/protocol-types/` from canonical schemas
- [ ] Implement schema validation helpers in `packages/schema-tools/src/index.ts` and `src/validate-schemas.ts`
- [ ] Use Ajv/Ajv-formats and `json-schema-to-typescript` as the baseline validation/type-generation stack

Tests for this sub-phase:
- `pnpm run schemas:validate`
- `pnpm run types:generate`
- `pnpm run build`

Sub-phase acceptance:
- A human can inspect the schema files and validate them with the documented command.

Rollback / recovery notes:
- If a schema fails validation, repair the specific file rather than weakening the validator or removing required fields.

### SP3. Routing core and conformance

Scope and purpose:
Implement a deterministic routing core with reason codes, eligibility checks, scoring, and tie-break behavior, then prove it with conformance tests.
Requirement mapping: `R21`, `R22`, `R23`, `R24`, `R25`, `R26`, `R44`

Implementation checklist:
- [ ] Implement routing types and reason-code definitions in `role-model-router/packages/core/src/types.ts` and `src/reason-codes.ts`
- [ ] Implement the pure router in `role-model-router/packages/core/src/router.ts`
- [ ] Export the core package through `role-model-router/packages/core/src/index.ts`
- [ ] Add conformance coverage in `packages/conformance/src/router-conformance.test.ts`

Tests for this sub-phase:
- `npm run test -- --runInBand packages/conformance`
- `npm run build -- --filter @role-model-router/core`

Sub-phase acceptance:
- A human can run the test suite and see deterministic results for exclusions, preference handling, measured-profile precedence, and tie-break behavior.

Rollback / recovery notes:
- If routing semantics drift, fix the pure core or the tests; do not bypass conformance assertions.

### SP4. Observability, benchmarking, and shared support packages

Scope and purpose:
Implement the observability artifact writers, benchmark support packages, and store/packaging contracts so routing and host flows can emit protocol-shaped data and future storage/package work has defined boundaries.
Requirement mapping: `R27`, `R28`, `R29`, `R30`, `R31`, `R32`, `R33`, `R34`, `R46`, `R47`

Implementation checklist:
- [ ] Implement `role-model-router/packages/trace/src/index.ts`
- [ ] Implement `role-model-router/packages/usage/src/index.ts`
- [ ] Implement `role-model-router/packages/profile-aggregator/src/index.ts`
- [ ] Implement `role-model-router/packages/bench-core/src/index.ts`
- [ ] Implement `role-model-router/packages/bench-judge/src/index.ts`
- [ ] Implement `packages/store-contract/src/index.ts`
- [ ] Implement `packages/packaging/src/index.ts`
- [ ] Add benchmark/testdata fixtures under `testdata/`

Tests for this sub-phase:
- `pnpm run test`
- `pnpm run smoke`

Sub-phase acceptance:
- A human can inspect emitted decision/trace/usage artifacts and see how benchmark outputs can feed observed performance.

Rollback / recovery notes:
- If artifact output paths are wrong, fix the documented runtime path and rerun the smoke command; do not write outputs into tracked source directories.

### SP5. Lightweight host baseline and provider scaffolding

Scope and purpose:
Create the lightweight router host path, endpoint detection/config export baselines, provider-family scaffolds, runtime-web package, smoke apps, and rust placeholders.
Requirement mapping: `R35`, `R36`, `R37`, `R38`, `R39`, `R40`, `R41`, `R42`, `R58`, `R59`

Implementation checklist:
- [ ] Create and document `role-model-router/skills/router`, `benchmark`, `detect-endpoints`, and `export-config`
- [ ] Implement provider entry packages for ACP, MCP, CLI, WebLLM, MediaPipe GenAI, MediaPipe text, and LiteRT-LM web
- [ ] Implement `role-model-router/packages/runtime-web/src/index.ts`
- [ ] Implement `role-model-router/apps/bench-cli/src/index.ts`
- [ ] Implement `role-model-router/apps/router-devtools/src/index.ts`
- [ ] Implement `role-model-router/apps/gateway-smoke/src/index.ts`
- [ ] Add rust placeholders under `role-model-router/rust/crates/`
- [ ] Keep deferred runtime libraries out of unconditional root dependencies unless a scaffolded provider explicitly justifies them

Tests for this sub-phase:
- `pnpm run smoke`
- `pnpm run build`

Sub-phase acceptance:
- A human can run the smoke app, detect candidate endpoints, export a config artifact, and see protocol-shaped runtime outputs without needing a desktop host.

Rollback / recovery notes:
- If a provider scaffold is too speculative, reduce it to a documented stub in the planned package path rather than deleting the reserved home.

### SP6. CI, validation docs, and final repo wiring

Scope and purpose:
Wire root scripts, CI, and validation docs so the baseline is reproducible and self-describing.
Requirement mapping: `R48`, `R49`, `R50`, `R51`, `R60`

Implementation checklist:
- [ ] Finalize root `package.json` scripts for install/bootstrap guidance, schema validation, protocol type generation, lint, build, TypeScript tests, Rust tests, smoke, and CI parity
- [ ] Implement `.github/workflows/ci.yml`
- [ ] Ensure `README.md` documents validation commands and repo navigation
- [ ] Ensure `role-model-router/README.md` documents host family responsibilities and later expansion

Tests for this sub-phase:
- `pnpm run ci:check`
- `pnpm run build`
- `pnpm run test`
- `pnpm run test:rust`

Sub-phase acceptance:
- A human can clone the repo, install dependencies, read the README, and run the documented baseline validation commands end to end.

Rollback / recovery notes:
- If CI diverges from local commands, fix the scripts so CI calls the same commands instead of introducing a separate hidden path.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/00-baseline/00-requirements.md`
- `/.recursive/run/00-baseline/00-worktree.md`
- `/.recursive/run/00-baseline/01-as-is.md`
- `/.recursive/memory/MEMORY.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `recursive-mode` and `recursive-worktree` were loaded successfully in this session, and delegated task tooling remains available.
Delegation Decision Basis: The plan must stay tightly aligned to the controller's intended file layout and implementation ordering, so the plan was authored and audited directly against the locked upstream artifacts.
Delegation Override Reason: Creating a delegated plan bundle would add overhead without improving accuracy for a repo that is still at the from-scratch planning stage.
Audit Inputs Provided:
- `/.recursive/run/00-baseline/00-requirements.md`
- `/.recursive/run/00-baseline/01-as-is.md`
- Changed files:
  - `/.recursive/run/00-baseline/02-to-be-plan.md`
- Targeted code references:
  - `/.recursive/run/00-baseline/00-requirements.md`
  - `/.recursive/run/00-baseline/01-as-is.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`

## Effective Inputs Re-read

- `/.recursive/run/00-baseline/00-requirements.md`
- `/.recursive/run/00-baseline/01-as-is.md`

## Earlier Phase Reconciliation

- Upstream artifact: `/.recursive/run/00-baseline/00-requirements.md`
  - Claim carried forward: the run must create the full stable-baseline repository shape, use the fixed pnpm/TypeScript/Rust baseline, and avoid overstating deferred provider/runtime support.
  - Current reconciliation: the plan preserves the mandated implementation order, adds the fixed root workspace/toolchain files, and reserves explicit homes for deferred runtime families.
- Upstream artifact: `/.recursive/run/00-baseline/01-as-is.md`
  - Claim carried forward: the current checkout lacks all required product-facing files and packages.
  - Current reconciliation: the plan creates those missing paths directly instead of trying to retrofit partial existing code.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed: `/.recursive/run/00-baseline/00-requirements.md`, `/.recursive/run/00-baseline/01-as-is.md`, `/.recursive/run/00-baseline/02-to-be-plan.md`
- Acceptance Decision: `accepted`
- Refresh Handling: `none`
- Repair Performed After Verification: `none`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `e60adec5bc9c448d53517c1219939a1ca794de7b`
- Comparison reference: `working-tree`
- Normalized baseline: `e60adec5bc9c448d53517c1219939a1ca794de7b`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only e60adec5bc9c448d53517c1219939a1ca794de7b`
- Planned or claimed changed files:
  - `/.recursive/run/00-baseline/02-to-be-plan.md`
  - `README.md`
  - `package.json`
  - `protocol/schemas/`
  - `packages/`
  - `role-model-router/`
  - `testdata/`
  - `.github/workflows/ci.yml`
- Actual changed files reviewed:
  - `/.recursive/run/00-baseline/00-requirements.md`
  - `/.recursive/run/00-baseline/00-worktree.md`
  - `/.recursive/run/00-baseline/01-as-is.md`
  - `/.recursive/run/00-baseline/02-to-be-plan.md`
- Unexplained drift:
  - none

## Gaps Found

- none; the plan is concrete enough to cover the known requirement surface and does not leave unresolved in-scope planning gaps at this phase.

## Repair Work Performed

- none

## Requirement Completion Status

- R52 | Status: blocked | Rationale: The fixed language baseline is planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R53 | Status: blocked | Rationale: The Node 22 + pnpm workspace baseline is planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R54 | Status: blocked | Rationale: The shared TypeScript baseline is planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R55 | Status: blocked | Rationale: The Rust stable toolchain and Cargo workspace baseline are planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP5.
- R56 | Status: blocked | Rationale: The canonical JSON Schema source-of-truth flow is planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R57 | Status: blocked | Rationale: The TypeScript dependency baseline is planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2 and SP6.
- R58 | Status: blocked | Rationale: The Rust dependency baseline is planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R59 | Status: blocked | Rationale: Runtime and adapter dependency policy is planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R60 | Status: blocked | Rationale: Root quality-gate commands are planned but not yet implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP6.
- R1 | Status: blocked | Rationale: The ownership-boundary doc is planned but not implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R2 | Status: blocked | Rationale: The required top-level directory layout is planned but not implemented in Phase 2. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and later sub-phases.
- R3 | Status: blocked | Rationale: Architecture docs are planned but not yet created. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R4 | Status: blocked | Rationale: Protocol docs are planned but not yet created. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R5 | Status: blocked | Rationale: Decision records are planned but not yet created. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R6 | Status: blocked | Rationale: Required schema files are planned but not yet created. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R7 | Status: blocked | Rationale: Meaningful schema definitions are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R8 | Status: blocked | Rationale: `EndpointIdentity` docs and schema are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R9 | Status: blocked | Rationale: `DeclaredCapabilityProfile` docs and schema are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R10 | Status: blocked | Rationale: `ObservedPerformanceProfile` docs and schema are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2 and SP4.
- R11 | Status: blocked | Rationale: `UsageEvent` docs and schema are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2 and SP4.
- R12 | Status: blocked | Rationale: Trace docs and schemas are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2 and SP4.
- R13 | Status: blocked | Rationale: `RouterDecision` docs and schema are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2 and SP3.
- R14 | Status: blocked | Rationale: `RoleDefinition` support is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R15 | Status: blocked | Rationale: `TaskDefinition` support is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R16 | Status: blocked | Rationale: `RoleBinding` support is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R17 | Status: blocked | Rationale: `TaskExecutionProfile` support is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R18 | Status: blocked | Rationale: The role/task/capability mapping doc is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1.
- R19 | Status: blocked | Rationale: Default role/task examples are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP2.
- R20 | Status: blocked | Rationale: Capability taxonomy expansion is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP2.
- R21 | Status: blocked | Rationale: The routing core implementation is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R22 | Status: blocked | Rationale: Eligibility checks are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R23 | Status: blocked | Rationale: Reason-code definitions and usage are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R24 | Status: blocked | Rationale: Routing-input precedence behavior is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R25 | Status: blocked | Rationale: Deterministic tie-break behavior is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R26 | Status: blocked | Rationale: Conformance coverage is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R27 | Status: blocked | Rationale: Observability-first package work is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R28 | Status: blocked | Rationale: The minimum request observability loop is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP4 and SP5.
- R29 | Status: blocked | Rationale: Local artifact persistence is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP4 and SP5.
- R30 | Status: blocked | Rationale: Dashboard-facing observability documentation is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP4.
- R31 | Status: blocked | Rationale: The benchmark model is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP4.
- R32 | Status: blocked | Rationale: Benchmark schemas are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R33 | Status: blocked | Rationale: Capability-oriented benchmark fixtures are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R34 | Status: blocked | Rationale: The benchmark-to-observed-performance path is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP4.
- R35 | Status: blocked | Rationale: The lightweight host directories and packages are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R36 | Status: blocked | Rationale: Endpoint detection baseline work is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R37 | Status: blocked | Rationale: Config export tooling is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R38 | Status: blocked | Rationale: The smoke flow that emits observability artifacts is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R39 | Status: blocked | Rationale: Browser and edge runtime support scaffolding is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R40 | Status: blocked | Rationale: Provider and endpoint kinds for future runtimes are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1, SP2, and SP5.
- R41 | Status: blocked | Rationale: Provider-family package scaffolding is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R42 | Status: blocked | Rationale: Native rust placeholders are planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP5.
- R43 | Status: blocked | Rationale: `packages/protocol-types/` is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R44 | Status: blocked | Rationale: `packages/conformance/` is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP3.
- R45 | Status: blocked | Rationale: `packages/schema-tools/` is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP2.
- R46 | Status: blocked | Rationale: `packages/store-contract/` is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R47 | Status: blocked | Rationale: `packages/packaging/` is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP4.
- R48 | Status: blocked | Rationale: The CI workflow is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP6.
- R49 | Status: blocked | Rationale: Validation command documentation is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP6.
- R50 | Status: blocked | Rationale: Root README coverage is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP6.
- R51 | Status: blocked | Rationale: Router README coverage is planned but not yet authored. | Blocking Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md` | Audit Note: Planned in SP1 and SP6.

## Audit Verdict

- Audit summary: The plan is concrete, ordered, and broad enough to cover the full stable-baseline requirement set without pretending deferred provider families are complete.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R52`, `R53`, `R54`, `R55`, `R56`, `R57`, `R58`, `R59`, `R60` -> planned workspace/toolchain, schema-source-of-truth, dependency, and root-command work is captured in `## Planned Changes by File`, `## Implementation Steps`, and `## Implementation Sub-phases` SP1, SP2, SP5, and SP6. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`
- `R1`, `R2`, `R3`, `R4`, `R5` -> planned root/docs/decision work is captured in `## Planned Changes by File`, `## Implementation Steps`, and `## Implementation Sub-phases` SP1. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`
- `R6`, `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13` -> planned schema and protocol-entity work is captured in `## Planned Changes by File`, `## Implementation Steps`, and `## Implementation Sub-phases` SP2. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`
- `R14`, `R15`, `R16`, `R17`, `R18`, `R19`, `R20` -> planned role/task/capability work is captured across SP1 and SP2. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`
- `R21`, `R22`, `R23`, `R24`, `R25`, `R26` -> planned deterministic routing and conformance work is captured in SP3 and `## Testing Strategy`. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`
- `R27`, `R28`, `R29`, `R30`, `R31`, `R32`, `R33`, `R34` -> planned observability and benchmark work is captured in SP4 plus `## Testing Strategy` and `## Manual QA Scenarios`. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`
- `R35`, `R36`, `R37`, `R38`, `R39`, `R40`, `R41`, `R42` -> planned lightweight host, provider scaffold, runtime-web, app, and rust placeholder work is captured in SP5. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`
- `R43`, `R44`, `R45`, `R46`, `R47`, `R48`, `R49`, `R50`, `R51` -> planned shared-package, CI, and README work is captured in SP2, SP3, SP4, SP6, and `## Planned Changes by File`. | Evidence: `/.recursive/run/00-baseline/02-to-be-plan.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/00-baseline/00-requirements.md`
  - `/.recursive/run/00-baseline/01-as-is.md`
- Requirement coverage check:
  - `R1`-`R60`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS10`: preserved; the plan only reserves scaffolding/doc paths for deferred runtime families

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - concrete file paths are named
  - implementation order matches the Phase 0 requirements
  - tests and smoke commands are explicit
  - manual QA scenarios and recovery guidance are defined
  - no required Phase 2 section is missing
- Remaining blockers:
  - none

Approval: PASS
