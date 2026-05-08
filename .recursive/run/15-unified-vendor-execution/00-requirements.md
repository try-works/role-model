Run: `/.recursive/run/15-unified-vendor-execution/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-07T11:53:50Z`
LockHash: `0a3d53956fb6b8ed388e99a5c2629b2ae69ad59970f064d765240a8fd33ba37e`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\requirement-unified-vendor-execution.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
Outputs:
- `/.recursive/run/15-unified-vendor-execution/00-requirements.md`
Scope note: This document defines the stable repo-local requirement contract for run `15-unified-vendor-execution`. It maps the external source requirement `rlm-2026-05-06-vendor-execution` into the repository's numbered recursive-run sequence without changing the substantive execution scope.

## TODO

- [x] Consolidate the external requirement into a repo-local recursive requirement contract
- [x] Define stable requirement identifiers and acceptance criteria
- [x] Record scope boundaries, constraints, assumptions, and sequence integration
- [x] Capture the targeted package and file inventory for the implementation run
- [x] Capture validation expectations, including end-to-end vendor execution coverage
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Parse one unified runtime config and derive execution mode from it

Description:
Run 15 must introduce a single bridge-owned configuration contract that enables or disables vendor execution based on populated config sections rather than separate launch commands.

Acceptance criteria:
- the bridge accepts one YAML config file that remains the source of truth for routing plus execution configuration
- `llama_swap` is treated as optional and only activates when its config contains a non-empty model inventory
- `litellm_proxy` is treated as optional and only activates when its config contains a non-empty provider inventory
- if both vendor sections are absent or empty, the bridge starts in decision-only mode and returns a normalized `VENDOR_NOT_CONFIGURED` style execution error instead of attempting live execution
- startup validation fails fast with descriptive config errors when the unified config is structurally invalid or internally inconsistent

### `R2` Add a bridge-owned process supervisor for vendor child processes

Description:
The runtime must manage Go and Python vendor processes from TypeScript so execution remains language-agnostic at the bridge boundary and compatible with the single-executable target.

Acceptance criteria:
- a new `packages/process-supervisor/` package owns child-process spawn, readiness, restart, shutdown, and status reporting
- vendor processes bind to ephemeral localhost ports rather than fixed external ports
- the supervisor performs readiness and health checks before the runtime reports a vendor as available
- child-process logs are aggregated into a bridge-readable structured stream
- graceful shutdown forwards termination to child processes, waits for bounded cleanup, and escalates when necessary
- crashed vendors are retried with bounded exponential backoff rather than taking down the bridge process

### `R3` Define a shared vendor abstraction and normalized vendor-error layer

Description:
Run 15 must add one TypeScript abstraction that the bridge can use for both local and remote execution vendors while preserving streaming and non-streaming execution paths.

Acceptance criteria:
- a new `packages/vendor-abstraction/` package defines the shared vendor health, execution, streaming, and metadata contracts
- the abstraction stays bridge-facing and does not force the bridge to know vendor implementation language details
- the abstraction includes explicit health and execution result types that can carry latency, model resolution, cost, cache, and vendor metadata
- normalized vendor errors include retryability and error-class information sufficient for bridge-level error mapping and fallback behavior
- the abstraction preserves both standard request execution and streamed execution surfaces

### `R4` Implement the llama-swap execution vendor

Description:
The runtime must support a local-model execution vendor backed by llama-swap while keeping role-model routing and observability semantics in the bridge.

Acceptance criteria:
- a new `packages/vendor-llama-swap/` package implements the shared vendor abstraction
- the implementation can provision or locate the correct llama-swap binary for the active platform and cache it under a role-model-owned vendor directory
- the implementation generates the required llama-swap config from the unified bridge config and starts llama-swap via the process supervisor
- health checks use the vendor's localhost health surface before the bridge treats the vendor as ready
- non-streaming and streaming execution paths use the vendor's OpenAI-compatible HTTP endpoints without weakening role-model routing semantics
- endpoint identity mapping to llama-swap model identifiers is explicit and deterministic

### `R5` Implement the LiteLLM execution vendor and LiteLLM provider adapter

Description:
The runtime must support remote API execution through LiteLLM Proxy while preserving the existing adapter-execution contract used by routed requests.

Acceptance criteria:
- a new `packages/vendor-litellm/` package implements the shared vendor abstraction for LiteLLM Proxy
- the runtime can provision LiteLLM through `uv`, preferring an isolated role-model-owned tool directory over system-level Python setup
- the implementation generates LiteLLM config from the unified bridge config, starts LiteLLM via the process supervisor, and performs health checks before use
- execution captures actual cost and cache metadata when LiteLLM exposes them and returns that metadata to the bridge-owned execution layer
- a new `packages/provider-litellm/` package implements the existing `ProviderAdapter` contract for LiteLLM-backed execution
- the LiteLLM adapter advertises native structured-output support, provider-native tool calling, streamed deltas, and implicit prompt-caching semantics consistent with the source requirement

### `R6` Integrate vendor execution into the runtime host bridge without breaking existing runtime guarantees

Description:
The runtime host bridge must connect router decisions to real vendor execution while preserving existing routing, persistence, auditability, and OpenAI-compatible response semantics.

Acceptance criteria:
- `role-model-router/apps/runtime-host-bridge/` starts the process supervisor during bridge initialization and only activates vendors required by config
- the bridge waits for configured vendors to become healthy before exposing runtime execution as available
- execution dispatch selects llama-swap for local/gguf-style targets and LiteLLM for remote OpenAI-compatible or remote API targets according to resolved execution metadata
- missing required vendors produce normalized OpenAI-compatible errors rather than unsupported-operation failures or bridge crashes
- existing `RouterDecision` persistence, response headers, trace spans, and usage-event persistence remain intact
- the bridge adds unified vendor health information and inactive-vendor reporting to `/healthz`

### `R7` Package the runtime as a Node.js SEA distribution with embedded vendor assets

Description:
Run 15 must preserve the single-command operator experience by building the bridge and its required vendor assets into a Node.js SEA distribution flow.

Acceptance criteria:
- `sea-config.json` is added and targets the built runtime-host-bridge entrypoint
- llama-swap platform binaries are embedded or otherwise made available as runtime-extractable SEA assets for the supported release platforms
- build automation covers `linux-x64`, `darwin-x64`, `darwin-arm64`, and `win32-x64`
- release automation produces installable artifacts suitable for GitHub Releases
- runtime asset extraction uses platform-aware paths and preserves Windows compatibility

### `R8` Preserve end-to-end validation, observability, and non-regression guarantees

Description:
The run must prove that unified vendor execution works end to end and does not regress the existing router-runtime baseline.

Acceptance criteria:
- validation includes unit coverage for the process supervisor and vendor abstractions
- validation includes integration coverage for config parsing, vendor startup, and bridge-level vendor dispatch
- validation includes end-to-end execution coverage for decision-only, local-only, remote-only, and hybrid vendor modes
- end-to-end execution covers at least one real llama-swap path and one real LiteLLM-backed remote path unless a documented environmental constraint blocks it
- existing routing, RBAC, context-envelope, trace, decision-audit, and usage behaviors remain intact after the execution-layer changes
- streaming behavior remains zero-copy or pass-through where the underlying vendor supports it and stays explicitly documented where compatibility shims remain necessary

## Out of Scope

- `OOS1`: replacing the router's canonical routing, policy, or decision semantics with vendor-specific behavior
- `OOS2`: bypassing the bridge-owned process supervisor in favor of an external orchestrator for the first implementation slice
- `OOS3`: widening the initial vendor scope beyond llama-swap and LiteLLM before the unified abstraction proves out
- `OOS4`: exposing vendor child-process ports externally instead of keeping them localhost-bound
- `OOS5`: treating speculative dynamic config reload as required for initial completion; it remains stretch scope unless a later addendum promotes it

## Constraints

- Repo run `15-unified-vendor-execution` follows the merged run-14 baseline on `main` at `e78d4bb286585aa69394de341f1120af756c2393`.
- The external requirement's source run identifier is `rlm-2026-05-06-vendor-execution`, but the repo-local recursive run must stay in the numbered sequence as `15-unified-vendor-execution`.
- Existing public interfaces that must remain backward-compatible include `ProviderAdapter`, `RuntimeBridgeBackend`, persisted `RouterDecision` artifacts, and the SQLite-backed `RuntimeObservationBundle`.
- The bridge remains the owner of routing, RBAC, decision auditability, context envelopes, trace spans, and usage persistence even after live vendor execution is introduced.
- Vendor execution must remain compatible with the Node.js SEA target and therefore cannot assume a permanently provisioned external Node/Python/Go orchestration layer.
- Vendor child processes must remain localhost-bound and use cross-platform path handling suitable for Windows.
- LiteLLM provisioning uses `uv` per the source requirement unless a later locked addendum explicitly changes that dependency strategy.

## Assumptions

- The current runtime-host-bridge baseline still executes through captured or simulated provider responses and therefore needs a new live execution layer rather than incremental fixture-only tweaks.
- The vendored or downloadable llama-swap and LiteLLM assets are obtainable in the target development and release environments, or can be cached once acquired.
- Remote-provider credentials remain configuration or environment concerns owned by the operator and are never stored in canonical protocol artifacts.
- The current router-runtime package graph is mature enough that the new execution layer can be added without reopening previously locked routing or observability contracts.

## Sequence Integration

- Roadmap slot: `post-run14 unified vendor execution foundation`
- Previous repo dependency: `14-router-runtime-ui-foundation` for the current merged repo baseline
- Execution-layer dependencies: `09-router-runtime-adapter-execution-plane`, `10-router-runtime-host-integration`, `11-router-runtime-observability-feedback`, `12-router-runtime-hardening-operations`, `13-router-runtime-mcp-tools-extension`
- Next repo dependency: `TBD after run 15 planning and closeout`
- Required handoff: a bridge-owned live vendor execution layer, packaged single-executable build flow, and evidence-backed end-to-end validation receipts

## Targeted Package And File Inventory

- New package: `role-model-router/packages/process-supervisor/`
- New package: `role-model-router/packages/vendor-abstraction/`
- New package: `role-model-router/packages/vendor-llama-swap/`
- New package: `role-model-router/packages/vendor-litellm/`
- New package: `role-model-router/packages/provider-litellm/`
- Modified app: `role-model-router/apps/runtime-host-bridge/src/`
- Modified package: `role-model-router/packages/adapter-execution/src/`
- Potential catalog touchpoint: `role-model-router/packages/catalog/src/`
- New build config: `role-model-router/sea-config.json`
- New release automation: `.github/workflows/build-binaries.yml`

## Validation Expectations

- Focused package build and test coverage is required for every new package introduced in this run.
- Bridge-level validation must cover vendor startup, health aggregation, dispatch, normalized errors, and streamed plus non-streamed execution.
- End-to-end validation must be captured in run evidence and must exercise the operator-facing single-command flow from config load through bridged request execution.
- If platform-specific release validation cannot be completed locally, the limitation must be documented explicitly and paired with CI-backed verification receipts rather than omitted silently.

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] Scope boundaries, constraints, assumptions, and package targets are recorded
- [x] Validation expectations include end-to-end vendor execution coverage

Coverage: PASS

## Approval Gate

- [x] The repo-local run id and external requirement mapping are explicit
- [x] The implementation scope is specific enough to support Phase 1 AS-IS analysis and Phase 2 planning
- [x] No unresolved requirement ambiguity remains for run initialization

Approval: PASS
