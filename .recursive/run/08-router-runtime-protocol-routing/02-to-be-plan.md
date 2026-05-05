Run: `/.recursive/run/08-router-runtime-protocol-routing/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T04:23:39Z`
LockHash: `f739c5ee8199a1b5a0c3ee95b3c86da393307061e7f72d0c8bee85ebba22ac42`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
- `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
Outputs:
- `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `08-router-runtime-protocol-routing` into a narrow implementation plan. The run will add one router-owned integration package that projects runtime inputs into protocol-governed routing inputs, extend the deterministic router only where needed to consume explicit routing signals, add pinned routing fixtures plus conformance coverage, and add one local validation path that exercises registry construction through routing decision output. It must not widen into adapter execution or host integration work.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the run-08 roadmap slice
- [x] Choose the concrete package, fixture, router-core, and validation-command surfaces for protocol-driven routing
- [x] Define implementation steps that preserve run-08 scope discipline
- [x] Define verification commands and evidence expectations
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Package Split Decision

- Selected package split: `protocol-routing` as one new router-owned integration package plus narrow extensions to the existing `core` package.
- Reason this plan follows that split: Phase 1 showed the current gap is primarily composition, not the absence of the underlying primitives. The deterministic router core already exists, and run 07 already delivered endpoint-registry, context-envelope, retrieval-receipt, and SQLite continuity helpers. A single `protocol-routing` package keeps run 08 focused on wiring those prerequisites together instead of reopening their boundaries or scattering orchestration logic across multiple packages.
- Router-decision contract stance for run 08: keep the canonical `RouterDecision` shape stable in this run. New continuity/cache/routing-model explanations will be carried through explicit runtime routing diagnostics and `metric_breakdown.preference.raw` adjustments instead of widening the schema enum surface during this integration run.

## Planned Changes by File

- `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`: define the concrete write surface, sub-phases, validation path, and scope boundaries for run 08.
- `/role-model-router/packages/protocol-routing/package.json`: add the new router-owned protocol-routing package to the existing workspace package layout.
- `/role-model-router/packages/protocol-routing/tsconfig.json`: follow the repo TypeScript package convention for source and test separation.
- `/role-model-router/packages/protocol-routing/src/index.ts`: implement runtime request projection, registry-to-router candidate adaptation, SQLite-backed continuity/retrieval loading, continuity/cache/routing-model signal derivation, and the orchestration entry point that produces a router decision plus runtime diagnostics.
- `/role-model-router/packages/protocol-routing/src/cli.ts`: add the local validation wrapper that loads the pinned fixtures, initializes SQLite, builds the runtime registry, projects one routing request, executes deterministic routing, persists the retrieval receipt, and prints deterministic JSON diagnostics.
- `/role-model-router/packages/protocol-routing/test/index.test.ts`: add focused tests that prove projection behavior, routing-model guardrails, continuity/cache signal behavior, and the local validation path.
- `/role-model-router/packages/core/src/types.ts`: extend the current routing input and candidate surfaces with explicit optional runtime routing signals that can influence preference scoring without bypassing deterministic eligibility.
- `/role-model-router/packages/core/src/router.ts`: consume the new optional routing signals in the existing preference metric while preserving the current hard-constraint, exclusion, scoring, and tie-break flow.
- `/packages/conformance/package.json`: add the new protocol-routing package as a workspace dependency if the new conformance coverage imports it directly.
- `/packages/conformance/src/runtime-routing-conformance.test.ts`: add conformance coverage for runtime-owned local/cloud routing projection and policy-over-guidance guardrails.
- `/testdata/router-runtime/routing-request.json`: add the pinned runtime request fixture that drives protocol projection and routing evaluation.
- `/testdata/router-runtime/routing-observed-profiles.json`: add pinned observed-profile inputs so projected candidates can exercise measured latency, quality, reliability, and cost behavior.
- `/testdata/router-runtime/routing-role-task.json`: add pinned role definitions, task definitions, and role bindings for run-08 routing guardrails.
- `/testdata/router-runtime/routing-model-guidance.json`: add pinned advisory routing-model configuration and candidate ranking hints used by tests and local validation.
- `/package.json`: add one narrow root script for the run-08 local validation path so Phase 4 can exercise projected routing directly.
- `/pnpm-lock.yaml`: record the workspace importer entries required after adding the new package and any coupled workspace dependencies.

## Implementation Steps

1. Add a dedicated router-owned package at `role-model-router/packages/protocol-routing` rather than embedding run-08 composition directly in `endpoint-registry` or `core`, because the missing behavior is the protocol-driven bridge from runtime inputs to the existing deterministic router, not a second registry implementation or a router rewrite.
2. Model the new runtime projection input in `protocol-routing/src/index.ts` so one orchestration call can accept:
   - the normalized catalog output from run 05,
   - provider-account records from run 06,
   - registry sources from run 07,
   - a runtime routing request fixture,
   - observed-profile inputs,
   - role definitions, task definitions, and role bindings,
   - one optional routing-model configuration plus advisory ranking hints,
   - a SQLite runtime-state location for continuity and retrieval data.
   This package should remain the runtime-owned boundary that translates those inputs into one `RouteRequestInput` for the existing deterministic router.
3. Reuse the existing run-07 primitives instead of reimplementing them:
   - call `buildEndpointRegistry()` to derive candidates,
   - call `persistContinuitySnapshot()` / `readConversationContinuity()` to seed and read continuity state,
   - call `assembleContextEnvelope()` to build the bounded continuity envelope,
   - call `createRetrievalReceipt()` plus `persistRetrievalReceipt()` to record what context was selected.
   Run 08 should compose these surfaces and carry their outputs into routing rather than reopen their contracts.
4. Introduce explicit optional runtime routing signals on the core candidate surface instead of widening the canonical router-decision schema in this run. The projected candidate signal set should cover, at minimum:
   - continuity affinity for the endpoint referenced by the latest handoff,
   - cache affinity when the selected envelope fits reuse-oriented routing policy and the candidate can accommodate the continuity payload,
   - advisory routing-model rank or preference for endpoints suggested by the configured routing model.
   These signals should feed the existing preference metric and remain visible in `metric_breakdown.preference.raw` so the resulting `RouterDecision` stays explainable without weakening the hardened contract.
5. Keep deterministic eligibility authoritative. Routing-model guidance must remain advisory only:
   - the configured routing-model endpoint must exist in the registry and must not be denied by explicit policy filters before it is accepted as the advisory source,
   - routing-model guidance may reorder or bias candidate preference, but it must never bypass capability, modality, context, role/task/binding, budget, or policy exclusions,
   - if the guidance prefers an ineligible endpoint, that endpoint must still appear as ineligible in the final router decision.
6. Add pinned routing fixtures under `testdata/router-runtime/` so run 08 can validate both local and cloud-oriented cases without live providers:
   - `routing-request.json` should exercise requested role/task, policy allow/deny fields, and continuity-aware context limits,
   - `routing-observed-profiles.json` should provide measured latency, quality, throughput, reliability, and cost signals for both local and cloud candidates,
   - `routing-role-task.json` should provide role definitions, task definitions, and role bindings that exercise the run-03 hardened explainability floor,
   - `routing-model-guidance.json` should provide one valid routing-model selection plus one policy-conflicting or ineligible suggestion case.
7. Extend `core/src/types.ts` and `core/src/router.ts` only enough to consume the new routing signals:
   - keep `evaluateEligibility()` unchanged for hard constraints except where the projected input supplies already normalized candidate/request data,
   - add small preference-metric adjustments for continuity affinity, cache affinity, and routing-model rank,
   - record those adjustments in the metric raw payload so downstream validation can read why the score changed,
   - preserve the current tie-break order and the current `RouterDecision` output shape.
8. Add one new conformance test file under `/packages/conformance/src/runtime-routing-conformance.test.ts` that proves:
   - projected routing works for mixed local/cloud candidates built from runtime-owned fixtures,
   - continuity/cache signals can change ranking among otherwise eligible candidates,
   - policy or eligibility still defeats routing-model guidance,
   - the emitted router decision remains schema-valid.
9. Implement `protocol-routing/src/cli.ts` so one local validation command:
   - loads the tracked normalized catalog, provider-account, registry-source, continuity, and run-08 routing fixtures,
   - initializes or reuses SQLite through the existing runtime-state contract,
   - seeds continuity state,
   - builds the runtime registry,
   - projects one routing request,
   - executes deterministic routing,
   - emits the router decision, continuity-envelope summary, retrieval-receipt summary, and routing-model diagnostics,
   - fails loudly on invalid fixture input, invalid advisory configuration, SQLite read/write failure, or routing drift.
10. Keep the root command surface narrow by adding one script such as `runtime:validate-routing` to `/package.json`. Phase 4 should then exercise:
    - direct package build/test commands for `protocol-routing`,
    - the conformance package test suite,
    - the affected `core` package build,
    - the new local routing validation command,
    - the inherited broader baseline command chain (`schemas:validate`, `build`, `test`, `smoke`).
    Record the inherited schema-tools/Biome failure accurately as shared baseline state unless run 08 introduces a distinct new regression.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/protocol-routing test`
  - `corepack pnpm --filter @role-model/conformance test`
- Direct run-08 validation path:
  - `corepack pnpm run runtime:validate-routing`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/protocol-routing build`
  - `corepack pnpm --filter @role-model-router/core build`
  - `corepack pnpm --filter @role-model/conformance build`
- Regression checks:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing --run-id 08-router-runtime-protocol-routing`
  - `git diff --name-only 5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 08 adds runtime-owned TypeScript integration and CLI validation surfaces only; it introduces no browser UI surface.

## Manual QA Scenarios

1. **Runtime fixture sanity check**
   - Steps:
     - inspect `testdata/router-runtime/routing-request.json`
     - inspect `testdata/router-runtime/routing-observed-profiles.json`
     - inspect `testdata/router-runtime/routing-role-task.json`
   - Expected:
     - the routing fixtures clearly model request, observed-profile, and role/task/binding inputs without live provider calls
     - the fixtures cover both local and cloud candidates plus continuity-aware routing inputs

2. **Projection boundary sanity check**
   - Steps:
     - inspect `role-model-router/packages/protocol-routing/src/index.ts`
     - compare with `role-model-router/packages/core/src/router.ts`
   - Expected:
     - the new package composes registry, continuity, receipt, and deterministic router inputs without replacing router-core scoring or eligibility
     - adapter execution and host integration remain out of scope

3. **Routing-model guardrail sanity check**
   - Steps:
     - inspect `testdata/router-runtime/routing-model-guidance.json`
     - run `corepack pnpm run runtime:validate-routing`
   - Expected:
     - the configured routing-model endpoint is explicit in diagnostics
     - policy or eligibility conflicts still win over advisory routing-model suggestions

4. **Continuity/cache routing sanity check**
   - Steps:
     - run `corepack pnpm run runtime:validate-routing`
     - inspect the emitted `metric_breakdown.preference.raw` and runtime diagnostics
   - Expected:
     - continuity affinity, cache affinity, and advisory guidance appear as explicit explainability inputs
     - the final `RouterDecision` remains deterministic and schema-valid

## Idempotence and Recovery

- Re-running `corepack pnpm run runtime:validate-routing` is safe and should deterministically rebuild the same projected routing request, decision output, continuity summary, retrieval receipt, and advisory diagnostics from the pinned fixtures.
- Re-running the package and conformance tests is safe and should remain green once the projection, signal, and validation behavior are implemented.
- If the diff grows into provider request execution, response normalization, HTTP serving, operator UI work, or protocol-schema redesign, stop and trim the widening before closing Phase 3.
- If the inherited schema-tools/Biome failure still appears in root `build` or `test`, record it accurately as unchanged broader baseline state unless run 08 introduces a distinct new failure.
- If the router-core changes expand beyond small type additions plus preference-signal consumption, stop and pull the orchestration behavior back into the new `protocol-routing` package.

## Implementation Sub-phases

### SP1. Protocol-driven projection package and pinned routing fixtures

Scope and purpose:
Create the router-owned `protocol-routing` package, define the runtime-owned projection input model, and add the pinned routing fixtures needed to turn the run-07 registry/continuity outputs into a real `RouteRequestInput`.

Requirement mapping: `R1`, `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/protocol-routing/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/routing-request.json`
- [ ] Add `testdata/router-runtime/routing-observed-profiles.json`
- [ ] Add `testdata/router-runtime/routing-role-task.json`
- [ ] Add `testdata/router-runtime/routing-model-guidance.json`
- [ ] Add tests that describe the desired projection and guardrail behavior before implementing production code
- [ ] Implement deterministic routing-input projection and runtime diagnostics in `src/index.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/protocol-routing test`
- `corepack pnpm --filter @role-model-router/protocol-routing build`

Sub-phase acceptance:
- The repo can compose runtime-owned registry, observed-profile, policy, and continuity inputs into a deterministic `RouteRequestInput` plus explicit routing diagnostics.

### SP2. Narrow router-core signal consumption

Scope and purpose:
Teach the existing deterministic router to consume explicit runtime routing signals for preference scoring without weakening hard eligibility or changing the canonical router-decision shape.

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Extend `role-model-router/packages/core/src/types.ts` with optional runtime routing signal fields
- [ ] Add tests first that describe continuity/cache/guidance preference behavior without relaxing hard exclusions
- [ ] Implement the minimal `router.ts` preference-metric changes needed to consume those signals and expose the adjustments in `metric_breakdown.preference.raw`
- [ ] Keep tie-break order, exclusion behavior, and router-decision output shape intact

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/conformance test`
- `corepack pnpm --filter @role-model-router/core build`

Sub-phase acceptance:
- Continuity/cache/guidance signals can bias ranking among eligible candidates, but policy and hard eligibility remain authoritative.

### SP3. Local validation path and runtime routing conformance

Scope and purpose:
Make the new projection package runnable and inspectable through one local validation command plus conformance coverage that exercises projected local/cloud routing and routing-model guardrails.

Requirement mapping: `R1`, `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/protocol-routing/src/cli.ts`
- [ ] Add `/packages/conformance/src/runtime-routing-conformance.test.ts`
- [ ] Add `/package.json` script `runtime:validate-routing`
- [ ] Make the CLI load the tracked inputs, initialize/read SQLite, build the registry, project the request, run routing, and emit decision plus diagnostics
- [ ] Keep the diff limited to the new package, narrow core updates, conformance coverage, pinned fixtures, the root validation script, and recursive artifacts

Tests for this sub-phase:
- `corepack pnpm run runtime:validate-routing`
- `corepack pnpm --filter @role-model/conformance test`
- `git diff --name-only 5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`

Sub-phase acceptance:
- The run has one deterministic local validation path that proves protocol-driven projection, continuity-aware routing signals, advisory routing-model control, and schema-valid routing output without widening into execution or host work.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/03-implementation-summary.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/04-test-summary.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/03-implementation-summary.md`
- `/.recursive/run/04-router-runtime-architecture-lock/03-implementation-summary.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 2 is an ExecPlan synthesis artifact that must stay tightly aligned to the locked Phase 1 findings, the run-08 roadmap slice, the chosen single-package integration boundary, and the exact intended no-widening write surface before strict TDD starts.`
Delegation Override Reason: `A delegated planning pass would add overhead without improving fidelity because the controller already holds the locked Phase 1 inventory, the relevant architecture constraints, the current package conventions, the core scoring hook, and the selected run-08 integration boundary that now drives the implementation shape.`
Audit Inputs Provided:
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
- `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `/package.json`
- `/packages/conformance/package.json`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/core/src/reason-codes.ts`
- `/role-model-router/packages/endpoint-registry/package.json`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/cli.ts`
- `/role-model-router/packages/context-envelope/package.json`
- `/role-model-router/packages/context-envelope/src/index.ts`
- `/role-model-router/packages/retrieval-receipt/package.json`
- `/role-model-router/packages/retrieval-receipt/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/testdata/router-runtime/provider-accounts.json`
- `/testdata/router-runtime/registry-sources.json`
- `/testdata/router-runtime/context-envelope.json`
- Changed files:
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
- `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `/package.json`
- `/packages/conformance/package.json`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/core/src/reason-codes.ts`
- `/role-model-router/packages/endpoint-registry/package.json`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/cli.ts`
- `/role-model-router/packages/context-envelope/package.json`
- `/role-model-router/packages/context-envelope/src/index.ts`
- `/role-model-router/packages/retrieval-receipt/package.json`
- `/role-model-router/packages/retrieval-receipt/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/testdata/router-runtime/provider-accounts.json`
- `/testdata/router-runtime/registry-sources.json`
- `/testdata/router-runtime/context-envelope.json`

## Earlier Phase Reconciliation

- `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`:
  - claim carried forward: the repo already has the deterministic router core plus the run-07 registry, continuity-envelope, retrieval-receipt, and SQLite prerequisites, but the surfaces remain disconnected and there is no routing-model control path yet.
  - current reconciliation: the plan keeps that exact gap narrow by adding one orchestration package and only small core-signal changes instead of reopening the existing package boundaries.
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`:
  - claim carried forward: downstream audited phases must execute from `D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing` using diff basis `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`.
  - current reconciliation: the planned write surface remains scoped to that selected worktree and diff basis.
- `/docs/architecture/06-router-runtime-architecture-lock.md`:
  - claim carried forward: protocol-driven projection is downstream of endpoint-registry, deterministic routing remains authoritative, SQLite-first continuity remains the baseline, and routing-model guidance must not bypass protocol semantics.
  - current reconciliation: the plan preserves those boundaries by keeping adapter execution and host integration out of scope and by constraining routing-model guidance to advisory runtime diagnostics plus small preference-signal inputs.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `/package.json`
  - `/packages/conformance/package.json`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/endpoint-registry/package.json`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/src/cli.ts`
  - `/role-model-router/packages/context-envelope/package.json`
  - `/role-model-router/packages/context-envelope/src/index.ts`
  - `/role-model-router/packages/retrieval-receipt/package.json`
  - `/role-model-router/packages/retrieval-receipt/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/testdata/router-runtime/provider-accounts.json`
  - `/testdata/router-runtime/registry-sources.json`
  - `/testdata/router-runtime/context-envelope.json`
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Comparison reference: `working-tree`
- Normalized baseline: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Diff basis used: `git diff --name-only 5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/08-router-runtime-protocol-routing`
- Actual changed files reviewed:
  - `.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
  - `.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
  - `.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
  - `.recursive/run/08-router-runtime-protocol-routing/evidence/logs/baseline/install.log`
  - `.recursive/run/08-router-runtime-protocol-routing/evidence/logs/baseline/schemas-validate.log`
  - `.recursive/run/08-router-runtime-protocol-routing/evidence/logs/baseline/build.log`
  - `.recursive/run/08-router-runtime-protocol-routing/evidence/logs/baseline/test.log`
  - `.recursive/run/08-router-runtime-protocol-routing/evidence/logs/baseline/smoke.log`
- Unexplained drift:
  - none; the current working diff is limited to intentional run-08 phase artifacts and evidence logs only

## Gaps Found

- none beyond the implementation work intentionally planned in this artifact; the plan is specific enough to start strict TDD without reopening Phase 1

## Repair Work Performed

- Converted the locked Phase 1 inventory into one narrow implementation boundary centered on a new `protocol-routing` composition package rather than a broader router rewrite.
- Chose a concrete explanation strategy for run 08: continuity/cache/routing-model behavior will be exposed through explicit runtime diagnostics and preference-metric raw payloads while the canonical router-decision shape remains stable.
- Bound the validation and conformance surface to deterministic pinned fixtures plus one local routing validation command so the run can prove behavior without widening into live provider execution.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines a dedicated `protocol-routing` package that composes registry output, observed-profile data, and runtime request inputs into `RouteRequestInput`, but no projection or runtime-owned router entry point exists yet. | Blocking Evidence: `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md` | Audit Note: Phase 3 will add deterministic protocol-driven projection without replacing router-core scoring or eligibility.
- R2 | Status: blocked | Rationale: the plan now defines explicit routing-model configuration, advisory diagnostics, and policy/eligibility guardrails, but no user-configurable routing-model surface exists in the codebase yet. | Blocking Evidence: `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`, `/docs/architecture/06-router-runtime-architecture-lock.md` | Audit Note: Phase 3 will keep routing-model guidance advisory and subordinate to policy and hard constraints.
- R3 | Status: blocked | Rationale: the plan now defines continuity/cache routing signals plus runtime-routing conformance over SQLite-backed continuity and retrieval prerequisites, but the router does not currently consume those signals and no projected local/cloud routing coverage exists yet. | Blocking Evidence: `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`, `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md` | Audit Note: Phase 3 will consume the existing run-07 continuity/receipt surfaces instead of redesigning them.
- R4 | Status: blocked | Rationale: the plan now defines `runtime:validate-routing` plus runtime-routing conformance coverage, but no local validation path currently emits router decisions, continuity summaries, receipt summaries, or routing-model diagnostics from pinned runtime inputs. | Blocking Evidence: `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`, `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md` | Audit Note: Phase 4 will run the new routing validator alongside the inherited broader-baseline command chain and distinguish unchanged schema-tools failures from new run-08 regressions.

## Audit Verdict

- Audit summary: the plan is narrow, executable, and aligned to the locked Phase 1 gap: one new integration package, small core-signal changes, pinned fixtures, conformance growth, and one local validation path.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> addressed in `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R2` -> addressed in `## Package Split Decision`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R3` -> addressed in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, and `## Requirement Completion Status`.
- `R4` -> addressed in `## Planned Changes by File`, `## Testing Strategy`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/01-as-is.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `/package.json`
  - `/packages/conformance/package.json`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/endpoint-registry/package.json`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/src/cli.ts`
  - `/role-model-router/packages/context-envelope/package.json`
  - `/role-model-router/packages/context-envelope/src/index.ts`
  - `/role-model-router/packages/retrieval-receipt/package.json`
  - `/role-model-router/packages/retrieval-receipt/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/testdata/router-runtime/provider-accounts.json`
  - `/testdata/router-runtime/registry-sources.json`
  - `/testdata/router-runtime/context-envelope.json`
- Requirement coverage check:
  - `R1`-`R4`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Implementation Sub-phases`, `## Requirement Completion Status`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS3`: preserved; no adapter execution, host integration, or registry/SQLite contract redesign is planned in this phase

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to drive strict TDD implementation
- [x] The write surface and validation commands stay within run-08 scope

Approval: PASS
