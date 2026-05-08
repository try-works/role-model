Run: `/.recursive/run/15-unified-vendor-execution/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-07T12:14:16Z`
LockHash: `c4e85ca2a25ba718e0aee17c9f016a9031a1f26c5dfe98f7c7bb43fc052503d2`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/15-unified-vendor-execution/00-requirements.md`
- `/.recursive/run/15-unified-vendor-execution/00-worktree.md`
- `/.recursive/run/15-unified-vendor-execution/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/vendor/llama-swap/llama-swap.go`
- `/role-model-router/vendor/llama-swap/proxy/proxymanager.go`
- `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge.go`
Outputs:
- `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact converts the locked Phase 1 baseline into a concrete run-15 implementation plan. The implementation keeps the existing routed adapter-execution seam intact, introduces a unified runtime config plus vendor lifecycle layer around it, adds dedicated llama-swap and LiteLLM vendor packages, extends the bridge to dispatch by execution mode/vendor availability, and adds packaging plus end-to-end validation receipts without regressing the current host path.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the current bridge/vendored host code
- [x] Choose the architecture mapping from the external requirement to the already-shipped bridge/adapter baseline
- [x] Define the changed-file boundaries and sub-phase ordering
- [x] Define the TDD and validation stance for the implementation phase
- [x] Define packaging, E2E, and guardrail expectations
- [x] Complete the audited-phase sections and gates

## Strategy Decision

- Selected runtime-execution stance: implement unified vendor execution as a new bridge-owned mode layered on top of the current routed adapter-execution baseline, not as a rewrite of the existing provider adapters.
- Selected compatibility stance: preserve the current fixture-seeded runtime-host-bridge path as the default deterministic validation mode until the unified config path is explicitly supplied. This keeps existing validators and the vendored host bridge mode working while run 15 adds a real operator-facing execution mode.
- Selected config stance: add one bridge-owned YAML config parser plus normalized config model inside `runtime-host-bridge` rather than inventing a separate config package first. The bridge becomes the owner of `routing`, `llama_swap`, and `litellm_proxy` config interpretation.
- Selected orchestration stance: add a dedicated `process-supervisor` package for child-process lifecycle and a dedicated `vendor-abstraction` package for bridge-facing vendor types/errors. Vendor packages own vendor-specific config generation, health checks, and transport behavior; the bridge owns routing and dispatch decisions.
- Selected llama-swap stance: keep the vendored `role-model-router/vendor/llama-swap/` host baseline for current host validation flows, but add a new `vendor-llama-swap` package that can generate a runtime config, choose a localhost port, and start llama-swap through the supervisor for unified-config mode. The vendored host remains a reference/runtime asset source rather than the only lifecycle owner.
- Selected LiteLLM stance: add `vendor-litellm` for LiteLLM Proxy lifecycle/transport and `provider-litellm` for capability declaration plus request/response normalization reuse inside `adapter-execution`. The first implementation will prefer OpenAI-compatible chat-completions execution and streaming because the current bridge/runtime path is already strongest there.
- Selected registry/account stance: derive vendor-backed runtime state from unified config at bridge startup instead of only from fixtures. Remote-provider sections will produce runtime provider-account/endpoint inputs; local llama-swap model sections will produce local registry sources. Decision-only mode is explicit when neither vendor section is active.
- Selected packaging stance: add SEA config and release workflow in the same run, but treat local multi-platform proof as focused artifact generation plus CI workflow readiness. Existing runtime export packaging tests should be updated to reflect the real built dependency graph instead of failing on a fresh worktree with missing dependent `dist` outputs.
- Selected implementation stance: use pragmatic TDD in Phase 3. New tests must be written first for each sub-phase, but the run may use focused integration fixtures/mocks instead of requiring live external provider credentials for every red/green cycle. End-to-end live receipts are still required before closeout.
- Reason this plan follows those choices:
  - Phase 1 proved the repo already owns the routed execution seam; the missing layer is vendor lifecycle and config, not routing or response normalization from zero.
  - A compatibility-preserving opt-in unified-config mode avoids breaking the strong run-10 through run-14 validation floor while adding the new operator-facing execution system.
  - The vendored llama-swap host already demonstrates the host/process boundary the repo needs, but run 15 must lift that boundary into repo-owned packages so LiteLLM and SEA packaging become possible.
  - The existing bridge already has streaming, observation persistence, and request/response shaping; reusing those surfaces keeps the requirement tractable and lowers regression risk.

## Planned Changes by File

- `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`: record the concrete unified vendor execution architecture, sequencing, and validation plan for run 15.
- `/package.json`: add new validation/build convenience commands for vendor execution and SEA packaging if needed.
- `/role-model-router/apps/runtime-host-bridge/package.json`: add new dependencies required for YAML config parsing and the new vendor packages.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: extend the bridge backend to parse unified config, initialize vendors, derive execution mode, dispatch by vendor kind, normalize vendor-unavailable errors, and expose aggregated health.
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`: add the bridge-owned YAML config loader, validation, and normalized config model.
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`: preserve the legacy host validation path or add explicit legacy-vs-unified validation selectors so run 10-14 receipts stay reproducible.
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`: add a new vendor-execution validator covering decision-only/local-only/remote-only/hybrid modes.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`: add tests first for config parsing, execution-mode derivation, vendor health aggregation, and vendor-unavailable error mapping.
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`: update packaging assertions so the runtime export graph reflects the real build prerequisites and later SEA output expectations.
- `/role-model-router/packages/process-supervisor/package.json`
- `/role-model-router/packages/process-supervisor/tsconfig.json`
- `/role-model-router/packages/process-supervisor/src/index.ts`
- `/role-model-router/packages/process-supervisor/test/index.test.ts`
- `/role-model-router/packages/vendor-abstraction/package.json`
- `/role-model-router/packages/vendor-abstraction/tsconfig.json`
- `/role-model-router/packages/vendor-abstraction/src/types.ts`
- `/role-model-router/packages/vendor-abstraction/src/errors.ts`
- `/role-model-router/packages/vendor-abstraction/src/index.ts`
- `/role-model-router/packages/vendor-abstraction/test/index.test.ts`
- `/role-model-router/packages/vendor-llama-swap/package.json`
- `/role-model-router/packages/vendor-llama-swap/tsconfig.json`
- `/role-model-router/packages/vendor-llama-swap/src/index.ts`
- `/role-model-router/packages/vendor-llama-swap/test/index.test.ts`
- `/role-model-router/packages/vendor-litellm/package.json`
- `/role-model-router/packages/vendor-litellm/tsconfig.json`
- `/role-model-router/packages/vendor-litellm/src/index.ts`
- `/role-model-router/packages/vendor-litellm/test/index.test.ts`
- `/role-model-router/packages/provider-litellm/package.json`
- `/role-model-router/packages/provider-litellm/tsconfig.json`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/packages/provider-litellm/test/index.test.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`: extend execution semantics only where needed to carry vendor metadata/cost extraction cleanly through existing usage and trace paths.
- `/role-model-router/packages/adapter-execution/test/index.test.ts`: add focused tests first for any new usage/cost or vendor-dispatch-related fields reused by the bridge.
- `/role-model-router/packages/catalog/src/index.ts`: add `litellmModelId` or equivalent normalized metadata only if required for stable remote vendor mapping.
- `/role-model-router/packages/catalog/test/index.test.ts`: add tests first if the catalog model shape changes.
- `/role-model-router/vendor/llama-swap/`: preserve as the vendored host/reference asset source; only touch if needed for runtime asset sourcing or config compatibility.
- `/sea-config.json`: add SEA blob configuration for the runtime-host-bridge entrypoint plus platform-specific llama-swap assets.
- `/.github/workflows/build-binaries.yml`: add multi-platform build and release workflow for SEA artifacts.

## Implementation Steps

1. Add the unified config surface inside the bridge:
   - parse one YAML file with `routing`, `llama_swap`, and `litellm_proxy` sections,
   - validate active/inactive vendor sections,
   - derive the execution mode as `decision_only`, `local_only`, `remote_only`, or `hybrid`,
   - keep the existing fixture path available when no unified config path is provided.
2. Add the generic vendor lifecycle layer:
   - implement `process-supervisor` for child-process start/health/restart/shutdown,
   - implement `vendor-abstraction` for vendor health, execution, streaming, and normalized vendor errors,
   - make the bridge depend on those abstractions instead of bridge-local ad hoc error strings.
3. Implement the llama-swap vendor package:
   - generate a temporary llama-swap config from unified config models,
   - select an ephemeral localhost port,
   - start llama-swap through the supervisor,
   - provide health, execute, and executeStream behavior through the vendor abstraction,
   - prefer vendored-source/runtime-asset sourcing for development and SEA packaging while leaving room for release-binary caching.
4. Implement the LiteLLM vendor path:
   - add `provider-litellm` for capability declaration and normalization reuse,
   - add `vendor-litellm` for config generation, health, execution, and streaming,
   - support `uv`-backed LiteLLM provisioning with a role-model-owned cache/tool directory,
   - map router fallback endpoint ids into LiteLLM fallback parameters where possible.
5. Extend bridge startup and dispatch:
   - initialize the supervisor only when unified config mode is active,
   - derive runtime registry/account/vendor state from the unified config,
   - dispatch local targets to llama-swap when available,
   - dispatch remote OpenAI-compatible targets to LiteLLM when available,
   - return explicit OpenAI-compatible vendor-unavailable errors when the required vendor class is inactive or unconfigured,
   - extend `/healthz` with vendor statuses, inactive vendors, and execution mode.
6. Preserve existing routed execution and observability semantics:
   - keep `RouterDecision`, response headers, trace spans, and runtime observation bundle persistence intact,
   - add any needed `provider.execution` trace surface without weakening the existing trace/usage contracts,
   - extract cost/cache metadata from LiteLLM responses into existing usage/observation pathways.
7. Add packaging and executable coverage:
   - add SEA config and runtime asset extraction helpers,
   - update executable packaging tests to reflect real build prerequisites,
   - add the release workflow for supported platforms.
8. Add end-to-end vendor validation:
   - decision-only mode returns normalized vendor-unavailable errors,
   - local-only mode exercises llama-swap,
   - remote-only mode exercises LiteLLM or a stable mock-compatible equivalent in tests,
   - hybrid mode proves the bridge chooses the expected vendor family per target kind.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/process-supervisor test`
  - `corepack pnpm --filter @role-model-router/vendor-abstraction test`
  - `corepack pnpm --filter @role-model-router/vendor-llama-swap test`
  - `corepack pnpm --filter @role-model-router/vendor-litellm test`
  - `corepack pnpm --filter @role-model-router/provider-litellm test`
  - `corepack pnpm --filter @role-model-router/adapter-execution test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/process-supervisor build`
  - `corepack pnpm --filter @role-model-router/vendor-abstraction build`
  - `corepack pnpm --filter @role-model-router/vendor-llama-swap build`
  - `corepack pnpm --filter @role-model-router/vendor-litellm build`
  - `corepack pnpm --filter @role-model-router/provider-litellm build`
  - `corepack pnpm --filter @role-model-router/adapter-execution build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- Direct run-15 validation paths:
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-vendors`
- Regression checks:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run runtime:validate-adapter`
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-operations`
  - `corepack pnpm run runtime:validate-tools`
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run smoke`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
- Vendor/runtime checks:
  - `C:\Program Files\Go\bin\go.exe test ./...` from `role-model-router\vendor\llama-swap\`
  - focused `uv`/LiteLLM provisioning checks when available in the environment

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 15 changes vendor execution, process lifecycle, and packaging rather than adding a new browser automation surface. Existing runtime validators plus end-to-end HTTP request coverage are the relevant verification mode.

## Manual QA Scenarios

1. **Decision-only startup**
   - Steps:
     - start the bridge with a unified config that omits both `llama_swap` and `litellm_proxy`
     - call `/healthz`
     - send one `POST /v1/chat/completions`
   - Expected:
     - `/healthz` reports `mode: "decision_only"`
     - no vendor process is started
     - the request returns the normalized vendor-unavailable error contract

2. **Local-only execution**
   - Steps:
     - start the bridge with only `llama_swap.models` configured
     - inspect `/healthz`
     - send one local-model request
   - Expected:
     - llama-swap is healthy and LiteLLM is inactive
     - the request executes through the local vendor path
     - the response preserves role-model routing headers and observation persistence

3. **Remote-only execution**
   - Steps:
     - start the bridge with only `litellm_proxy.providers` configured
     - inspect `/healthz`
     - send one remote-model request
   - Expected:
     - LiteLLM is healthy and llama-swap is inactive
     - the response includes the expected role-model headers and any available cost/cache metadata

4. **Hybrid execution**
   - Steps:
     - start the bridge with both vendor sections configured
     - send one local-model request and one remote-model request
   - Expected:
     - the bridge selects the expected vendor family per target kind
     - both requests are persisted and observable through the existing runtime request surfaces

5. **Packaging sanity**
   - Steps:
     - build the runtime-host-bridge package and run the executable packaging checks
     - inspect generated SEA/release artifacts if produced locally
   - Expected:
     - the runtime export graph is buildable
     - packaging tests reflect real dependency build requirements
     - SEA config and workflow artifacts are present and coherent

## Idempotence and Recovery

- Re-running the unified-config validator commands must be safe and should create isolated runtime-state roots/scopes just like the current validators.
- Re-running vendor startup must not leak orphan child processes; the supervisor must own termination and restart behavior explicitly.
- If LiteLLM provisioning is unavailable in the local environment, tests must use deterministic mocks or skip with an explicit receipt rather than silently pretending the vendor path is covered.
- If unified config parsing fails, the bridge must fail fast with descriptive validation errors rather than silently falling back to fixture mode.
- If packaging work touches the current executable-packaging test, the repaired test must still prove the runtime-export graph rather than being weakened into a no-op.

## Implementation Sub-phases

### SP1. Unified config, supervisor, and vendor abstraction foundation

Scope and purpose:
Introduce the bridge-owned config and lifecycle layer that the current runtime is missing, without yet requiring both vendors to be fully implemented.

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Add tests first for unified config parsing, execution-mode derivation, process-supervisor lifecycle, and normalized vendor errors
- [ ] Add `process-supervisor`
- [ ] Add `vendor-abstraction`
- [ ] Add bridge-owned YAML config loading and normalized config types
- [ ] Add bridge startup wiring for legacy mode vs unified-config mode

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/process-supervisor test`
- `corepack pnpm --filter @role-model-router/vendor-abstraction test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`

Sub-phase acceptance:
- The bridge can parse unified config, derive execution mode, and describe vendor lifecycle state without yet requiring the entire vendor matrix.

### SP2. Llama-swap vendor path and local-mode bridge dispatch

Scope and purpose:
Add the first concrete managed vendor implementation and prove local-only plus decision-only behavior end to end.

Requirement mapping: `R1`, `R2`, `R4`, `R6`, `R8`

Implementation checklist:
- [ ] Add tests first for llama-swap config generation, health checks, and local dispatch
- [ ] Add `vendor-llama-swap`
- [ ] Extend the bridge to start llama-swap when `llama_swap.models` is configured
- [ ] Return normalized vendor-unavailable errors in decision-only mode
- [ ] Preserve routing headers, observation persistence, and `/healthz` aggregation

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/vendor-llama-swap test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm run runtime:validate-vendors`

Sub-phase acceptance:
- Decision-only and local-only startup/dispatch both work through the bridge with explicit health and error behavior.

### SP3. LiteLLM vendor path, remote-mode dispatch, and usage/cost propagation

Scope and purpose:
Add the remote vendor implementation and bridge integration needed for remote-only and hybrid execution.

Requirement mapping: `R2`, `R3`, `R5`, `R6`, `R8`

Implementation checklist:
- [ ] Add tests first for LiteLLM config generation, fallback mapping, cost/cache extraction, and provider-litellm capability declarations
- [ ] Add `vendor-litellm`
- [ ] Add `provider-litellm`
- [ ] Extend bridge dispatch to remote-mode and hybrid-mode paths
- [ ] Propagate LiteLLM response cost/cache data through existing usage/observation surfaces

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/vendor-litellm test`
- `corepack pnpm --filter @role-model-router/provider-litellm test`
- `corepack pnpm --filter @role-model-router/adapter-execution test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm run runtime:validate-vendors`

Sub-phase acceptance:
- Remote-only and hybrid execution both work with vendor-aware dispatch and the expected metadata propagation.

### SP4. SEA packaging and executable validation receipts

Scope and purpose:
Add the first single-executable packaging surface and align the current executable-packaging tests with the real runtime dependency graph.

Requirement mapping: `R7`, `R8`

Implementation checklist:
- [ ] Add tests first or adjust existing packaging tests to reflect the actual built graph
- [ ] Add `sea-config.json`
- [ ] Add runtime asset extraction helpers where needed
- [ ] Add `.github/workflows/build-binaries.yml`
- [ ] Record local/CI packaging validation receipts

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- any focused packaging command added in this run

Sub-phase acceptance:
- The repo contains a coherent SEA packaging path and the executable validation surface reflects real build prerequisites.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/15-unified-vendor-execution/01-as-is.md`
- `/.recursive/run/15-unified-vendor-execution/00-worktree.md`
- `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`
- `/.recursive/run/10-router-runtime-host-integration/01-as-is.md`
- `/.recursive/run/09-router-runtime-adapter-execution-plane/01-as-is.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills are available in this session.
Delegation Decision Basis: `Phase 2 required controller-owned reconciliation between the locked run-15 contract, the live runtime-host-bridge implementation, the current vendored host lifecycle, and the already-shipped adapter-execution seam so the plan would extend the real architecture instead of contradicting it.`
Delegation Override Reason: `The plan needed one coherent architecture choice before Phase 3 TDD begins; delegating pieces of that decision across subagents would have increased cross-phase drift risk.`
Audit Inputs Provided:
- `/.recursive/run/15-unified-vendor-execution/00-requirements.md`
- `/.recursive/run/15-unified-vendor-execution/00-worktree.md`
- `/.recursive/run/15-unified-vendor-execution/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/vendor/llama-swap/llama-swap.go`
- `/role-model-router/vendor/llama-swap/proxy/proxymanager.go`
- `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge.go`
- Changed files:
  - `/.recursive/run/15-unified-vendor-execution/00-requirements.md`
  - `/.recursive/run/15-unified-vendor-execution/00-worktree.md`
  - `/.recursive/run/15-unified-vendor-execution/01-as-is.md`
  - `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/15-unified-vendor-execution/00-requirements.md`
- `/.recursive/run/15-unified-vendor-execution/00-worktree.md`
- `/.recursive/run/15-unified-vendor-execution/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/vendor/llama-swap/llama-swap.go`
- `/role-model-router/vendor/llama-swap/proxy/proxymanager.go`
- `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge.go`

## Earlier Phase Reconciliation

- `/.recursive/run/15-unified-vendor-execution/00-requirements.md`:
  - claim carried forward: run 15 must add unified vendor config, vendor lifecycle, LiteLLM support, packaging, and end-to-end execution coverage while preserving current runtime guarantees.
  - current reconciliation: the selected plan keeps the existing routed execution seam intact and adds the missing orchestration/config layer around it.
- `/.recursive/run/15-unified-vendor-execution/00-worktree.md`:
  - claim carried forward: downstream audited phases must execute from `D:\DEV\role-model\.worktrees\15-unified-vendor-execution` using diff basis `e78d4bb286585aa69394de341f1120af756c2393`.
  - current reconciliation: Phase 2 planning was performed from that worktree and preserves the locked diff basis.
- `/.recursive/run/15-unified-vendor-execution/01-as-is.md`:
  - claim carried forward: the current bridge is fixture-seeded, vendor lifecycle is still vendored-host-owned, LiteLLM is missing, and the packaging surface is incomplete.
  - current reconciliation: every implementation sub-phase addresses those exact gaps directly without reopening already-shipped routing or request-normalization work.
- `/.recursive/run/10-router-runtime-host-integration/02-to-be-plan.md`:
  - claim carried forward: the vendored llama-swap host is still a valid outer-process reference point and should not become the routing source of truth.
  - current reconciliation: the new plan preserves that boundary while introducing repo-owned vendor lifecycle packages underneath unified-config mode.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/15-unified-vendor-execution/00-requirements.md`
  - `/.recursive/run/15-unified-vendor-execution/00-worktree.md`
  - `/.recursive/run/15-unified-vendor-execution/01-as-is.md`
  - `/.recursive/RECURSIVE.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/role-model-router/apps/runtime-host-bridge/package.json`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/provider-openai/src/index.ts`
  - `/role-model-router/vendor/llama-swap/llama-swap.go`
  - `/role-model-router/vendor/llama-swap/proxy/proxymanager.go`
  - `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge.go`
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `e78d4bb286585aa69394de341f1120af756c2393`
- Comparison reference: `working-tree`
- Normalized baseline: `e78d4bb286585aa69394de341f1120af756c2393`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only e78d4bb286585aa69394de341f1120af756c2393`
- Diff basis used: `git diff --name-only e78d4bb286585aa69394de341f1120af756c2393`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/15-unified-vendor-execution`
- Actual changed files reviewed:
  - `/.recursive/run/15-unified-vendor-execution/00-requirements.md`
  - `/.recursive/run/15-unified-vendor-execution/00-worktree.md`
  - `/.recursive/run/15-unified-vendor-execution/01-as-is.md`
  - `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`
- Unexplained drift:
  - none; the working diff remains limited to intentional run-15 recursive artifacts at planning time

## Gaps Found

- none beyond the plan coverage already captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Manual QA Scenarios`, and `## Implementation Sub-phases`; the Phase 2 plan is concrete enough to start Phase 3 work.

## Repair Work Performed

- Narrowed the implementation stance so run 15 extends the current bridge and adapter-execution baseline instead of accidentally redoing run-09 or run-10 work.
- Made the compatibility strategy explicit: legacy fixture mode stays intact while unified-config mode is added as the new operator-facing execution path.
- Separated vendor lifecycle/orchestration work from provider normalization work so the plan can reuse the already-shipped provider-openai/provider-anthropic adapters rather than duplicating them.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines the bridge-owned YAML config surface and explicit execution-mode derivation, but the current bridge still boots from fixtures and vendored host config. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/vendor/llama-swap/config.role-model.yaml` | Audit Note: Phase 3 should add unified-config mode without breaking the legacy fixture path used by the current validators.
- R2 | Status: blocked | Rationale: the plan now assigns vendor lifecycle to a new repo-owned supervisor layer, but lifecycle is still owned only by the vendored llama-swap host and its managed bridge subprocess. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/vendor/llama-swap/llama-swap.go`, `/role-model-router/vendor/llama-swap/proxy/proxymanager.go` | Audit Note: Phase 3 should lift lifecycle into repo-owned packages while preserving current shutdown and host-safety behavior.
- R3 | Status: blocked | Rationale: the plan now defines a bridge-facing vendor abstraction and normalized vendor-error layer, but the live bridge still mixes direct fetch logic, credential resolution, and string-based provider errors inside one app. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/adapter-execution/src/index.ts` | Audit Note: Phase 3 should extend the current adapter seam instead of duplicating request/response normalization logic.
- R4 | Status: blocked | Rationale: the plan now defines a repo-owned llama-swap vendor package for unified-config mode, but the live repo still only has vendored llama-swap bridge mode and no bridge-owned local vendor package. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/vendor/llama-swap/llama-swap.go`, `/role-model-router/vendor/llama-swap/proxy/rolemodel_bridge.go` | Audit Note: Phase 3 should preserve the vendored host as a reference/runtime asset source while adding repo-owned local vendor lifecycle.
- R5 | Status: blocked | Rationale: the plan now defines LiteLLM lifecycle plus adapter support, but there is still no LiteLLM package, no `uv` provisioning path, and no remote vendor orchestration in code. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/pnpm-workspace.yaml` | Audit Note: Phase 3 should add LiteLLM as the first remote-vendor path instead of widening the current bridge-local fetch helpers.
- R6 | Status: blocked | Rationale: the plan now defines vendor-aware dispatch and aggregated health, but the bridge still boots from fixtures and executes requests through ad hoc callback logic instead of vendor-mode-aware orchestration. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts` | Audit Note: Phase 3 must preserve routing headers, persistence, streaming, and observation semantics while adding the new dispatch layer.
- R7 | Status: blocked | Rationale: the plan now defines SEA packaging and release workflow work, but the repo still lacks SEA config, release automation, and coherent executable-packaging coverage for the full built dependency graph. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`, `/package.json` | Audit Note: Phase 3 should fix the current executable-packaging assumptions rather than weakening them.
- R8 | Status: blocked | Rationale: the plan now defines vendor-mode validators and end-to-end mode coverage, but the current validation floor still lacks decision-only/local-only/remote-only/hybrid receipts and retains the inherited root build/test caveat. | Blocking Evidence: `/.recursive/run/15-unified-vendor-execution/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`, `/packages/schema-tools/src/validate-schemas.ts`, `/package.json` | Audit Note: Phase 3 and Phase 4 must add focused vendor receipts while preserving the existing regression floor.

## Audit Verdict

- Audit summary: the implementation plan is concrete and architecture-safe. It keeps the current routed execution baseline, adds the missing unified config and vendor lifecycle layer, introduces the two required vendor packages, and closes the packaging/E2E gaps the AS-IS artifact identified.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> unified config parsing and execution-mode derivation are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`.
- `R2` -> process supervision and lifecycle ownership are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R3` -> vendor abstraction and normalized vendor errors are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R4` -> llama-swap vendor ownership is captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R5` -> LiteLLM lifecycle and adapter support are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R6` -> bridge dispatch, health aggregation, and observability preservation are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, and `## Requirement Completion Status`.
- `R7` -> SEA packaging and executable test alignment are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R8` -> end-to-end validation and regression coverage are captured in `## Testing Strategy`, `## Manual QA Scenarios`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.

## Coverage Gate

- [x] Locked Phase 0 and Phase 1 artifacts were re-read and reconciled
- [x] The plan maps directly onto the current bridge, adapter, and vendored host architecture
- [x] Concrete changed-file boundaries, validation commands, and sub-phase ordering are recorded
- [x] Every requirement `R1`-`R8` has a concrete implementation and validation stance

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to start Phase 3 implementation
- [x] The compatibility strategy for legacy fixture mode versus new unified-config mode is explicit
- [x] No unresolved planning ambiguity blocks the first TDD sub-phase

Approval: PASS
