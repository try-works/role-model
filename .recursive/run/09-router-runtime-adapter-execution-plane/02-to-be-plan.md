Run: `/.recursive/run/09-router-runtime-adapter-execution-plane/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T05:44:00Z`
LockHash: `9863b492efe61a93437920da211e0d8455c35e7cc2669cafd1ef96aae568f2d8`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
Outputs:
- `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `09-router-runtime-adapter-execution-plane` into a narrow implementation plan. The run will add one shared adapter-execution package plus two first provider-family packages (`provider-openai` and `provider-anthropic`), keep execution deterministic through pinned request/response captures instead of live provider calls, and upgrade the supported local smoke path so it exercises routed adapter execution and emits canonical traces/usages/captures. It must not widen into host request serving, long-lived lifecycle management, or provider-agnostic MCP/tool execution.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the run-09 roadmap slice
- [x] Choose the concrete package, fixture, and validation-command surfaces for the adapter execution plane
- [x] Define implementation steps that preserve run-09 scope discipline
- [x] Define verification commands and evidence expectations
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Package Split Decision

- Selected package split: `adapter-execution` + `provider-openai` + `provider-anthropic`
- Reason this plan follows that split:
  - Phase 1 showed two distinct missing layers: a shared runtime-owned execution contract and provider-family-specific request/response behavior.
  - A shared `adapter-execution` package keeps routed-request orchestration, capability negotiation, normalized execution outputs, trace/usage/capture shaping, and validation logic in one place.
  - Separate `provider-openai` and `provider-anthropic` packages keep family-specific request builders, response normalizers, and capability matrices isolated, which matches the roadmap's staged family implementation guidance and keeps later families extensible without reopening the shared contract.
- Validation stance for run 09: use deterministic pinned request/response captures and fixture-backed execution in this run rather than live HTTP/provider credentials. This keeps run 09 focused on adapter semantics and artifact compatibility while leaving actual host-integrated transport for run `10`.

## Planned Changes by File

- `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`: define the concrete write surface, sub-phases, validation path, and scope boundaries for run 09.
- `/role-model-router/packages/adapter-execution/package.json`: add the shared adapter-execution package to the existing workspace layout.
- `/role-model-router/packages/adapter-execution/tsconfig.json`: follow the repo TypeScript package convention for source and test separation.
- `/role-model-router/packages/adapter-execution/src/index.ts`: define the shared provider-adapter contract, routed-execution orchestration, execution-context resolution, normalized execution output model, trace/usage extraction helpers, prompt-cache/token-accounting hooks, and deterministic capture emission.
- `/role-model-router/packages/adapter-execution/src/cli.ts`: add the focused local adapter-validation entry point that loads pinned runtime fixtures, routes a request, executes the chosen provider-family adapter, and emits deterministic JSON diagnostics.
- `/role-model-router/packages/adapter-execution/test/index.test.ts`: add focused tests that prove adapter selection, capability negotiation, context preservation, normalized output shaping, and failure diagnostics before production code is added.
- `/role-model-router/packages/provider-openai/package.json`: add the first concrete provider-family execution package keyed to the normalized catalog's OpenAI-family metadata.
- `/role-model-router/packages/provider-openai/tsconfig.json`: follow the repo package convention for the OpenAI-family implementation package.
- `/role-model-router/packages/provider-openai/src/index.ts`: implement the OpenAI-family capability matrix, request builder, fixture-backed execution surface, response normalizer, error classifier, usage extraction, and prompt-cache hook behavior.
- `/role-model-router/packages/provider-openai/test/index.test.ts`: add focused tests that prove OpenAI-family request/response shaping and extraction behavior before production code is added.
- `/role-model-router/packages/provider-anthropic/package.json`: add the second concrete provider-family execution package keyed to the normalized catalog's Anthropic-family metadata.
- `/role-model-router/packages/provider-anthropic/tsconfig.json`: follow the repo package convention for the Anthropic-family implementation package.
- `/role-model-router/packages/provider-anthropic/src/index.ts`: implement the Anthropic-family capability matrix, request builder, fixture-backed execution surface, response normalizer, error classifier, usage extraction, and prompt-cache hook behavior.
- `/role-model-router/packages/provider-anthropic/test/index.test.ts`: add focused tests that prove Anthropic-family request/response shaping and extraction behavior before production code is added.
- `/role-model-router/apps/gateway-smoke/package.json`: add dependencies on the new adapter packages and stop relying on direct artifact fabrication alone.
- `/role-model-router/apps/gateway-smoke/src/index.ts`: replace the direct `routeRequest()` plus fabricated trace/usage path with a routed adapter-execution flow that still writes schema-valid smoke artifacts under `runtime-output\gateway-smoke\`.
- `/role-model-router/packages/protocol-routing/package.json`: add a workspace dependency on `adapter-execution` only if the adapter validation path imports protocol-routing types directly from that package; otherwise avoid changing it.
- `/testdata/router-runtime/adapter-request.json`: add the pinned runtime execution request fixture, including conversation/messages, optional structured-output request, tool metadata placeholders, stream preference, and prompt-cache hints.
- `/testdata/router-runtime/adapter-routing-request.json`: add the pinned routing request fixture used by smoke and adapter validation to drive endpoint selection through the existing run-08 routing layer.
- `/testdata/router-runtime/adapter-openai-response.json`: add the pinned OpenAI-family raw provider response used by tests and local adapter validation.
- `/testdata/router-runtime/adapter-anthropic-response.json`: add the pinned Anthropic-family raw provider response used by tests and local adapter validation.
- `/testdata/router-runtime/adapter-captures.json`: add deterministic per-endpoint capture mappings that tell the validation path which pinned raw response to use for a chosen endpoint.
- `/package.json`: add one narrow root script such as `runtime:validate-adapter` while preserving `smoke` as the required end-to-end local validation path.
- `/pnpm-lock.yaml`: record the workspace importer entries required after adding the new packages and any coupled workspace dependencies.

## Implementation Steps

1. Add a dedicated shared package at `role-model-router/packages/adapter-execution` rather than embedding run-09 behavior inside `gateway-smoke` or the existing detector packages, because the missing behavior is a reusable runtime-owned execution contract, not just a new smoke-specific helper.
2. Model the shared execution contract in `adapter-execution/src/index.ts` so one orchestration call can accept:
   - the existing run-08 runtime routing inputs and routed decision prerequisites,
   - the normalized catalog from run 05,
   - validated provider-account records from run 06,
   - registry sources and registry output from run 07,
   - one runtime execution request describing the conversational/provider-facing payload,
   - one provider-family adapter registry,
   - one deterministic capture source for local validation.
   The shared contract should expose, at minimum:
   - provider capability negotiation output,
   - provider-shaped request capture,
   - provider-shaped raw response capture,
   - normalized execution output,
   - streaming/tool/error/usage extraction summaries,
   - canonical trace-span/event and usage-event inputs,
   - execution diagnostics and failure details.
3. Keep routed execution downstream of run 08 instead of reopening routing. The adapter package should consume routed decision output as a prerequisite and re-resolve the chosen endpoint's provider/account/model context from the same catalog/account/registry inputs used earlier in the pipeline. This preserves run-07 and run-08 contracts instead of mutating endpoint candidates just to carry execution metadata.
4. Keep the first implementation set narrow and roadmap-aligned by adding two family packages:
   - `provider-openai` for the OpenAI family keyed by `providerId=openai` / `adapterFamily=ai-sdk-openai`
   - `provider-anthropic` for the Anthropic family keyed by `providerId=anthropic` / `adapterFamily=ai-sdk-anthropic`
   Each package should export:
   - a testable provider capability matrix covering structured outputs, tool-calling posture, streaming granularity, prompt-caching posture, and usage/token-accounting behavior,
   - a request builder that maps the runtime execution request into the family's provider-local shape,
   - a raw-response normalizer that extracts canonical text/tool/error/usage information,
   - a family-specific error classifier,
   - trace/usage annotation helpers needed by the shared package.
5. Avoid false normalization. The shared contract may unify normalized outputs, but the family packages must preserve family-specific request/response differences explicitly:
   - OpenAI-family uses a responses-style request shape and response body terminology.
   - Anthropic-family uses a messages-style request shape and content-block response terminology.
   - prompt-caching, schema, and streaming support must be represented as negotiated capabilities and fallbacks, not flattened away.
6. Keep provider execution deterministic in run 09 by using pinned local captures instead of live network transport. The local validation path should map the chosen endpoint or provider family to one pinned raw response fixture, then execute the same normalization/extraction code paths that later live transport will reuse. This satisfies the run's adapter-semantics and artifact-compatibility goals without widening into run-10 host mechanics.
7. Define the runtime execution request fixture in `testdata/router-runtime/adapter-request.json` so it exercises:
   - user/system message input,
   - one optional structured-output contract,
   - one optional tool-definition list that can be passed through or extracted from provider output without executing tools,
   - streaming preference,
   - prompt-cache hint inputs,
   - request/account/endpoint identifiers needed for traces, usage, and later host integration.
8. Upgrade `gateway-smoke/src/index.ts` to use the real routed adapter path:
   - load the normalized catalog, provider-account fixture, registry-source fixture, run-08 routing fixture, and run-09 adapter fixture,
   - build the runtime registry and route the request through `protocol-routing`,
   - execute the chosen endpoint through the shared adapter package,
   - emit the canonical router decision, observed-performance sample, trace artifacts, usage artifacts, request/response captures, and adapter diagnostics under `runtime-output\gateway-smoke\`,
   - preserve schema validation and linkage validation.
   This keeps `smoke` as the supported local validation flow required by `R4`.
9. Add one focused adapter-validation CLI in `adapter-execution/src/cli.ts` and expose it through `/package.json` as `runtime:validate-adapter`. The CLI should:
   - load the same pinned inputs as smoke,
   - execute the routed adapter path,
   - print deterministic JSON about the chosen adapter, negotiated capabilities, request/response capture paths, usage extraction, and any fallback decisions,
   - fail loudly on missing provider metadata, unsupported adapter family, invalid captures, or normalization drift.
10. Keep the root command surface narrow and Phase-4 verification focused:
    - package-level tests/builds for `adapter-execution`, `provider-openai`, and `provider-anthropic`,
    - `runtime:validate-adapter`,
    - `smoke`,
    - `runtime:validate-routing`,
    - `schemas:validate`,
    - inherited root `build` and `test`.
    Record the inherited schema-tools/Biome failure accurately as unchanged broader baseline state unless run 09 introduces a distinct new regression.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/adapter-execution test`
  - `corepack pnpm --filter @role-model-router/provider-openai test`
  - `corepack pnpm --filter @role-model-router/provider-anthropic test`
- Direct run-09 validation paths:
  - `corepack pnpm run runtime:validate-adapter`
  - `corepack pnpm run smoke`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/adapter-execution build`
  - `corepack pnpm --filter @role-model-router/provider-openai build`
  - `corepack pnpm --filter @role-model-router/provider-anthropic build`
  - `corepack pnpm --filter @role-model-router/gateway-smoke build`
- Regression checks:
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\09-router-runtime-adapter-execution-plane --run-id 09-router-runtime-adapter-execution-plane`
  - `git diff --name-only f4f9aa294904909d02e0572c6dfc20fc9da9ccb5`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 09 adds runtime-owned TypeScript packages, fixtures, and CLI/smoke validation only; it introduces no browser UI surface.

## Manual QA Scenarios

1. **Adapter family selection sanity check**
   - Steps:
     - inspect `testdata/router-runtime/adapter-captures.json`
     - run `corepack pnpm run runtime:validate-adapter`
   - Expected:
     - the chosen endpoint resolves to exactly one provider-family adapter
     - the output prints the selected provider family, negotiated capabilities, and capture paths deterministically

2. **Provider-shaped capture sanity check**
   - Steps:
     - inspect `runtime-output\gateway-smoke\request-capture.json`
     - inspect `runtime-output\gateway-smoke\response-capture.json`
   - Expected:
     - the request capture is provider-shaped rather than a fake generic abstraction
     - the response capture preserves raw family-specific payload structure while the normalized output remains separate

3. **Trace and usage linkage sanity check**
   - Steps:
     - run `corepack pnpm run smoke`
     - inspect `runtime-output\gateway-smoke\trace-spans.json`, `trace-events.jsonl`, and `usage-events.jsonl`
   - Expected:
     - execution-era spans and usage events remain linked to the routed decision and request ids
     - usage extraction and error classification are visible without reopening provider-family semantics

4. **Scope-boundary sanity check**
   - Steps:
     - inspect the final run diff
     - compare against `/.recursive/run/10-router-runtime-host-integration/00-requirements.md` if needed
   - Expected:
     - no live HTTP serving, request proxying, long-lived lifecycle management, or provider-agnostic tool execution behavior is added in run 09
     - run 09 stops at adapter semantics, normalization, extraction hooks, and local validation

## Idempotence and Recovery

- Re-running `corepack pnpm run runtime:validate-adapter` is safe and should deterministically resolve the same chosen adapter, request capture, normalized response, trace/usage extraction output, and fallback diagnostics from the pinned fixtures.
- Re-running `corepack pnpm run smoke` is safe and should deterministically rebuild the same schema-valid runtime artifacts under `runtime-output\gateway-smoke\`.
- Re-running the package tests is safe and should remain green once the shared contract and both family packages are implemented.
- If the diff grows into live provider HTTP calls, reverse-proxy features, daemon management, or provider-agnostic tool execution, stop and trim the widening before closing Phase 3.
- If the inherited schema-tools/Biome failure still appears in root `build` or `test`, record it accurately as unchanged broader baseline state unless run 09 introduces a distinct new failure.
- If the shared contract starts forcing family adapters into a fake universal request/response shape before normalization, stop and keep the provider-local request/response surfaces explicit.

## Implementation Sub-phases

### SP1. Shared adapter contract and routed-execution fixtures

Scope and purpose:
Create the shared `adapter-execution` package, define the routed-execution contract, and add the pinned runtime fixtures that drive deterministic adapter validation.

Requirement mapping: `R1`, `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/adapter-execution/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/adapter-request.json`
- [ ] Add `testdata/router-runtime/adapter-routing-request.json`
- [ ] Add `testdata/router-runtime/adapter-captures.json`
- [ ] Add tests that describe adapter selection, capability negotiation, and normalized output expectations before implementing production code
- [ ] Implement the shared execution contract, capture model, and validation helpers in `src/index.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/adapter-execution test`
- `corepack pnpm --filter @role-model-router/adapter-execution build`

Sub-phase acceptance:
- The repo can resolve a routed execution context, choose an adapter family deterministically, and describe the normalized output/capture contract without invoking live transport.

### SP2. OpenAI-family adapter implementation

Scope and purpose:
Add the first concrete provider-family package and prove OpenAI-family request building, response normalization, and extraction behavior through strict TDD.

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Add `role-model-router/packages/provider-openai/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/adapter-openai-response.json`
- [ ] Add tests first that describe OpenAI-family capability negotiation, request shape, normalized response, and usage/error extraction
- [ ] Implement the OpenAI-family adapter in `src/index.ts`
- [ ] Keep prompt-caching and structured-output fallback decisions explicit in the adapter result

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/provider-openai build`

Sub-phase acceptance:
- The repo can execute the shared contract against a pinned OpenAI-family capture and produce normalized output plus canonical extraction details.

### SP3. Anthropic-family adapter implementation and smoke integration

Scope and purpose:
Add the second concrete provider-family package, integrate routed adapter execution into `gateway-smoke`, and provide the focused CLI validation path required for Phase 4.

Requirement mapping: `R1`, `R2`, `R3`, `R4`

Implementation checklist:
- [ ] Add `role-model-router/packages/provider-anthropic/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/router-runtime/adapter-anthropic-response.json`
- [ ] Add tests first that describe Anthropic-family capability negotiation, request shape, normalized response, and usage/error extraction
- [ ] Implement the Anthropic-family adapter in `src/index.ts`
- [ ] Add `role-model-router/packages/adapter-execution/src/cli.ts`
- [ ] Add `/package.json` script `runtime:validate-adapter`
- [ ] Update `role-model-router/apps/gateway-smoke/` to use routed adapter execution and emit request/response captures plus canonical artifacts

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/provider-anthropic test`
- `corepack pnpm run runtime:validate-adapter`
- `corepack pnpm run smoke`
- `corepack pnpm --filter @role-model-router/gateway-smoke build`
- `git diff --name-only f4f9aa294904909d02e0572c6dfc20fc9da9ccb5`

Sub-phase acceptance:
- The run has one deterministic local validation path and one smoke path that both exercise routed adapter execution, emit schema-valid artifacts, and preserve provider-family-specific captures without widening into host integration.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/04-test-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/08-router-runtime-protocol-routing/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/.recursive/run/07-router-runtime-endpoint-registry-context-envelope/03-implementation-summary.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 2 is an ExecPlan synthesis artifact that must stay tightly aligned to the locked Phase 1 findings, the run-09 roadmap slice, the repaired run-08 routing handoff, and the chosen shared-contract-plus-family-package split before strict TDD starts.`
Delegation Override Reason: `A delegated planning pass would add overhead without improving fidelity because the controller already holds the locked Phase 1 inventory, the relevant roadmap clauses, the existing routing/registry prerequisites, and the package-boundary decision that now drives the implementation shape.`
Audit Inputs Provided:
- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Changed files:
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`

## Earlier Phase Reconciliation

- `/.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`:
  - claim carried forward: run 09 must add the provider adapter contract, first provider-family implementations, request/response normalization, execution-time extraction hooks, and the mandatory local validation/repair loop.
  - current reconciliation: this plan stays inside that scope by adding one shared contract package, two first family packages, and one smoke/CLI validation path while leaving host integration and provider-agnostic tool execution out of scope.
- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`:
  - claim carried forward: the repo currently has routing prerequisites, provider metadata, smoke artifact helpers, and canonical trace/usage contracts, but no execution plane.
  - current reconciliation: this plan consumes those prerequisites directly and avoids mutating the earlier registry/routing contracts just to carry execution state.
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md` plus the run-08 addendum:
  - claim carried forward: run 08 now provides the protocol-driven routing boundary and canonical runtime routing explanations required before adapter execution can begin.
  - current reconciliation: this plan treats run-08 routing as a prerequisite and keeps routed execution downstream of it rather than rebuilding routing inside the adapters.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `f4f9aa294904909d02e0572c6dfc20fc9da9ccb5`
- Comparison reference: `working-tree`
- Normalized baseline: `f4f9aa294904909d02e0572c6dfc20fc9da9ccb5`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only f4f9aa294904909d02e0572c6dfc20fc9da9ccb5`
- Diff basis used: `git diff --name-only f4f9aa294904909d02e0572c6dfc20fc9da9ccb5`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/09-router-runtime-adapter-execution-plane`
- Actual changed files reviewed:
  - `.recursive/run/09-router-runtime-adapter-execution-plane/00-requirements.md`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/evidence/logs/baseline/install.log`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/evidence/logs/baseline/schemas-validate.log`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/evidence/logs/baseline/build.log`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/evidence/logs/baseline/test.log`
  - `.recursive/run/09-router-runtime-adapter-execution-plane/evidence/logs/baseline/smoke.log`
- Unexplained drift:
  - none; the current working diff is limited to intentional run-09 phase artifacts and baseline evidence logs only

## Gaps Found

- none beyond the implementation work intentionally planned in this artifact; the plan is specific enough to start strict TDD without reopening Phase 1

## Repair Work Performed

- Converted the Phase 1 inventory into one narrow implementation boundary centered on a shared adapter contract plus two concrete provider-family packages instead of a broader host/runtime rewrite.
- Chose a deterministic validation strategy that upgrades `smoke` and adds a focused adapter CLI while still deferring live HTTP transport and host integration to run 10.
- Bound the execution validation surface to pinned provider-family captures so run 09 can prove request/response normalization and extraction semantics without introducing environment-dependent provider calls.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines a shared `adapter-execution` package plus `provider-openai` and `provider-anthropic`, but no execution contract or concrete family implementation exists in code yet. | Blocking Evidence: `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md` | Audit Note: Phase 3 will add a runtime-owned adapter contract and two first provider-family packages without widening into host mechanics.
- R2 | Status: blocked | Rationale: the plan now defines provider-shaped request builders, response normalizers, and routed context resolution, but the codebase still has only routing outputs and smoke-time artifact fabrication. | Blocking Evidence: `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`, `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md` | Audit Note: Phase 3 will keep provider-local request/response shapes explicit and normalize only after family-specific parsing.
- R3 | Status: blocked | Rationale: the plan now defines explicit extraction hooks and normalized execution outputs, but no adapter-time trace/usage/error/tool extraction path exists yet. | Blocking Evidence: `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`, `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md` | Audit Note: Phase 3 will populate the existing canonical trace/usage contracts instead of inventing new execution artifacts.
- R4 | Status: blocked | Rationale: the plan now defines `runtime:validate-adapter` plus a smoke upgrade, but no local validation path currently emits adapter captures, diagnostics, or extraction summaries. | Blocking Evidence: `/.recursive/run/09-router-runtime-adapter-execution-plane/00-worktree.md`, `/.recursive/run/09-router-runtime-adapter-execution-plane/02-to-be-plan.md` | Audit Note: Phase 4 will distinguish unchanged broader-baseline failures from any new run-09 adapter regression.

## Audit Verdict

- Audit summary: the plan is narrow, executable, and aligned to the locked Phase 1 gap: one shared execution package, two first provider-family packages, pinned captures, and one upgraded smoke/CLI validation path.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> addressed in `## Package Split Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`.
- `R2` -> addressed in `## Planned Changes by File`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R3` -> addressed in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, and `## Requirement Completion Status`.
- `R4` -> addressed in `## Planned Changes by File`, `## Testing Strategy`, `## Idempotence and Recovery`, and `## Requirement Completion Status`.

## Coverage Gate

- [x] The package split and validation strategy are concrete enough to drive Phase 3 implementation
- [x] The plan preserves run-09 scope boundaries and defers host integration and provider-agnostic tool execution
- [x] The plan names the new fixtures, packages, command surfaces, and validation expectations explicitly

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to execute under strict TDD
- [x] The plan remains consistent with the Phase 1 inventory and roadmap constraints
- [x] No unresolved design ambiguity blocks Phase 3 start

Approval: PASS
