Type: `domain`
Status: `CURRENT`
Scope: `Stable baseline ownership for the repo workspace, canonical protocol tree, shared packages, router family, fixtures, validation surfaces, and the repo-owned runtime/operator baseline extended through the live observed-feedback routing baseline in run 23.`
Owns-Paths:
- `/README.md`
- `/LICENSE`
- `/CLA.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/biome.json`
- `/tsconfig.base.json`
- `/rust-toolchain.toml`
- `/.github/workflows/ci.yml`
- `/docs/**`
- `/protocol/**`
- `/packages/**`
- `/role-model-router/**`
- `/testdata/**`
Watch-Paths:
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Source-Runs:
- `00-baseline`
- `01-protocol-routing-obs`
- `02-audit-remediation`
 - `03-protocol-baseline-hardening`
 - `04-router-runtime-architecture-lock`
 - `05-router-runtime-catalog-foundation`
 - `06-router-runtime-provider-accounts-sqlite-memory`
 - `07-router-runtime-endpoint-registry-context-envelope`
 - `08-router-runtime-protocol-routing`
 - `09-router-runtime-adapter-execution-plane`
- `10-router-runtime-host-integration`
- `11-router-runtime-observability-feedback`
- `12-router-runtime-hardening-operations`
- `13-router-runtime-mcp-tools-extension`
- `14-router-runtime-ui-foundation`
- `15-unified-vendor-execution`
- `16-router-runtime-unified-telemetry-dashboard`
- `22-router-runtime-routing-strategy-lock`
- `23-router-runtime-live-observed-feedback`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-05-11T19:11:00+08:00`
Tags:
- `baseline`
- `workspace`
- `protocol`
- `router`
- `validation`
- `runtime`

# Role-Model Baseline

This repository now has a real product baseline rather than only recursive scaffolding.

## What This Domain Owns

- The root workspace/toolchain manifests and repo navigation docs
- The canonical JSON Schema contracts and related protocol docs
- Shared packages for protocol types, schema tooling, conformance, store contracts, and packaging
- Router packages/apps, provider scaffolds, skill READMEs, and native placeholder crates
- Fixture data and the CI workflow

## Durable Truths

- Canonical machine-readable protocol contracts live under `/protocol/schemas/`
- Generated protocol types live under `/packages/protocol-types/src/generated.ts`
- The deterministic router contract lives under `/role-model-router/packages/core/`
- Schema validation covers the canonical schema set plus the required fixture corpus
- Schema validation now covers the canonical schema set plus an expanded valid, invalid, minimal, and edge fixture corpus
- Canonical schema sources under `/protocol/schemas/` now self-identify with stable in-file `$id` values, and both schema-tools and conformance fail fast if those ids are missing or mismatched
- Fixture-driven router conformance lives under `/packages/conformance/src/router-fixture-conformance.test.ts` and is backed by `/protocol/fixtures/router-golden/cases/`
- The router now applies role/task/binding-aware eligibility, provider and endpoint policy filters, canonical compute-preference/strategy aliases, normalized weighted scoring, explicit exclusion codes, and explainable scored-candidate diagnostics
- Observed-performance aggregation now uses deterministic multi-sample semantics with `measurement_window`, `endpoint_version`, benchmark/live-request source counts, failure/error-class rates, freshness/confidence, and mixed-version rejection
- Trace and usage packages expose stable read/linkage helpers, and usage also exposes summary reducers by app, endpoint, model, and provider kind
- The smoke path exercises the hardened baseline end to end with a fixture-driven router case and validates emitted artifacts against schemas and linkage helpers before exit
- The stable config export path emits normalized ACP, MCP, and CLI endpoint inventory rather than a CLI-only snapshot
- The protocol docs now carry both the baseline role/task examples and the hardened M1-M3 contract details for profiles, traces, usage, benchmarks, and reason codes
- The current router-runtime baseline is single-host and local-machine scoped, not distributed or multi-host
- The runtime stack now includes runtime-owned provider-account, SQLite memory, endpoint registry, context envelope, retrieval receipt, protocol routing, adapter execution, provider-family adapters, a managed TypeScript runtime host bridge, and a shared runtime observability layer
- The live host path is a managed TypeScript bridge in `/role-model-router/apps/runtime-host-bridge/` over vendored `/role-model-router/vendor/llama-swap/`, with raw vendor surfaces preserved and structured role-model inspection routes added beside them
- The vendored host now has a tracked fallback UI surface under `/role-model-router/vendor/llama-swap/proxy/ui_stub/`, so clean worktrees no longer require leftover generated `proxy/ui_dist` assets just to compile or start the local host
- Structured inspection now includes `/api/role-model/requests`, `/api/role-model/requests/:id`, and `/api/role-model/endpoints/:endpointId/profile`, while raw `/logs`, `/logs/stream`, `/api/events`, `/api/metrics`, and `/api/captures/:id` remain vendor-owned operator surfaces
- Runtime request observations, grouped diagnostics, capture-policy receipts, profile-feedback shaping, and deterministic OpenTelemetry GenAI export mapping are shared through `/role-model-router/packages/runtime-observability/`
- Runtime-state maintenance is still SQLite-owned and now includes explicit export, backup, delete, and restore drills plus the stronger `runtime:validate-operations` command for end-to-end operator validation
- The runtime now also owns a provider-agnostic tool registry in `/role-model-router/packages/tool-registry/`, runtime MCP connector-definition shaping in `/role-model-router/packages/provider-mcp/`, outward OpenAI-compatible `tool_calls` surfacing in `/role-model-router/apps/runtime-host-bridge/`, and tooling receipts/diagnostics in `/role-model-router/packages/runtime-observability/`
- The deterministic local runtime validation floor now includes `runtime:validate-tools`, which exercises one fixture-backed tool-execution path and confirms stored tool execution receipts through the existing observation model
- The compiled runtime package graph now declares `runtime` export conditions so plain Node uses built `dist` entrypoints for executable verification instead of falling back to source-only TypeScript entrypoints
- Durable operator guidance for the single-host runtime baseline now lives under `/docs/operations/01-router-runtime-hardening-playbook.md`
- The repo now also owns a hierarchical runtime operator shell under `/role-model-router/apps/runtime-ui/` with `Overview`, `Studio`, `Control`, `Observe`, `Integrations`, and `System` sections layered over the existing host bridge, including controller/models, activity/log drill-ins, vendor-backed studio workspaces, and upstream/downstream/system pages
- The host bridge now exposes runtime summary, provider list, account list/upsert, endpoint list, and controller/config control-plane routes, and the repo-local `runtime:validate-ui` command proves those operator surfaces against the live runtime baseline
- The first repo-owned provider-onboarding slice is Moonshot/Kimi-first: Moonshot Open Platform is modeled as a ready API-key path, while Kimi Code remains intentionally backend-limited with real device-OAuth metadata visible in the UI and control plane
- The bridge and provider-openai stack now support OpenAI-compatible downstream streaming for routed `/v1/chat/completions` and `/v1/responses`; live host-path E2E is green, while Kimi remains on the current chat-completions-shaped contract
- The runtime now also owns repo-local unified vendor execution through `/role-model-router/packages/process-supervisor/`, `/role-model-router/packages/vendor-abstraction/`, `/role-model-router/packages/vendor-llama-swap/`, `/role-model-router/packages/vendor-litellm/`, and `/role-model-router/packages/provider-litellm/`, while `/role-model-router/apps/runtime-host-bridge/` derives `decision_only`, `local_only`, `remote_only`, and `hybrid` execution modes from unified YAML config and reports unified remote execution as `litellm-proxy`
- The unified-vendor baseline now includes shared `cacheStatus` metadata, routed fallback-model propagation into LiteLLM `fallbacks`, and additive vendor `healthCheck()` / `executeStream()` compatibility methods for managed llama-swap and LiteLLM vendors
- The repo-owned validation floor now includes `runtime:validate-vendors`, which proves the decision-only/local-only/remote-only/hybrid execution matrix end to end with managed vendor processes, plus separate live-vendor and browser-backed closeout proof for the final local llama-swap and remote LiteLLM bridge paths
- The runtime now has a first SEA packaging path through `/role-model-router/sea-config.json`, `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`, `runtime:package-sea`, `runtime:validate-packaging`, and `/.github/workflows/build-binaries.yml`; the packaged executable embeds platform-aware llama-swap assets and is validated by booting the SEA binary and exercising `/healthz` plus `/v1/models`
- The runtime now also exposes a canonical unified telemetry baseline for mixed local and remote execution, including summary, ledger, request-detail, and `/api/role-model/telemetry/stream` SSE surfaces in `/role-model-router/apps/runtime-host-bridge/` and matching dashboard, requests, and request-detail consumers in `/role-model-router/apps/runtime-ui/`
- The repo-owned control plane now includes mutable runtime-config read and write routes, `Control > Runtime Config`, live account save and Kimi device-OAuth state, endpoint activation, and honest zero-endpoint `decision_only` controller or models or runtime empty states instead of 500 or loading traps
- The protocol generation path now preserves `UsageEvent.cost_actual` and emits titled helper types for internal `$defs` entries, so focused `types:generate`, `schemas:validate`, and `@role-model/schema-tools build` stay green in the current baseline
- Provider-account writes remain credential-reference-only; the UI can upsert runtime accounts, but endpoint rows still remain controlled by the existing registry baseline rather than being auto-created by account-save side effects
- Browser, edge, and native provider families are intentionally scaffold-grade in this baseline
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md` now freezes the repo-owned routing-strategy handoff for alias-based local-plus-remote routing, including mode vocabulary, config ownership, the easy/medium/hard rubric, compatibility policy, rollout mapping for runs `23` through `30`, and the later-run verification discipline
- The downstream routing-strategy run contracts under `/.recursive/run/23-.../` through `/.recursive/run/30-.../` now consume the repo-owned strategy lock directly instead of only the external proposal path
- The bridge now reads latest observed profiles from SQLite runtime state on each request instead of routing from the startup fixture-only `routing-observed-profiles.json` map
- Runtime request observations now expose `routingDiagnostics.observedProfile` with source, `per-request` read mode, and measured-at metadata so operators can confirm which persisted profile influenced a route
- The repo-owned validation floor for this routing-feedback baseline now includes focused bridge tests plus `runtime:validate-host` and `runtime:validate-vendors`, including local-and-remote feedback-loop readback visibility

## Validation Path

- Prefer the repo's existing validation chain rather than ad hoc commands
- Root workspace scripts now use PATH-independent nested `corepack pnpm ...` invocations so the canonical shell-out entrypoints stay stable even when a child shell does not expose a global pnpm shim
- GitHub Actions validates this repo from a clean checkout of tracked files only; local Biome parity work should prefer a clean export or tracked-file-targeted checks instead of repo-root sweeps that also traverse nested `.worktrees/`
- On Windows, CRLF-only worktree churn can make local status noisier than the real Linux CI content diff; use `git diff` to identify the actual files that need formatter commits
- The repo-local runtime validation floor is the staged command family `runtime:validate-state`, `runtime:validate-registry`, `runtime:validate-routing`, `runtime:validate-adapter`, `runtime:validate-ui`, `runtime:validate-host`, `runtime:validate-vendors`, `runtime:validate-packaging`, `runtime:validate-observability`, `runtime:validate-operations`, `runtime:validate-tools`, plus `smoke`
- When validating runtime work, treat the focused runtime validators and package tests as the run-owned baseline; broader root `build` now fails on the unrelated `provider-acp` / `provider-cli` `endpoint_kind` mismatch, broader root `test` can still fail on the workspace-level `process-supervisor` crash-callback case while the isolated package rerun passes, and vendored proxy or full Go tests on Windows still reproduce the upstream `sleep` PATH assumption

## Scope Boundary

- Do not overclaim provider completeness from the scaffold packages or placeholder rust crates
- Keep future runtime work honest: promote real runtime capability only when backed by implementation and validation, not by directory presence alone
