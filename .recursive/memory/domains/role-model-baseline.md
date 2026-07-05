Type: `domain`
Status: `CURRENT`
Scope: `Stable baseline ownership for the repo workspace, canonical protocol tree, shared packages, router family, fixtures, validation surfaces, and the repo-owned runtime/operator umbrella baseline, with detailed runtime routing and provider-capability semantics split into a dedicated domain shard.`
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
- `24-router-runtime-recency-bias-throughput-sla`
- `25-router-runtime-model-alias-pool`
- `26-router-runtime-difficulty-guided-routing`
- `27-router-runtime-difficulty-learning-cache`
- `28-router-runtime-controller-guided-routing`
- `29-router-runtime-request-rewriter-hybrid-mode`
- `30-router-runtime-strategy-convergence-e2e`
- `32-models-dev-metadata-coverage`
- `34-router-runtime-role-policy-and-ui-fixture-reduction`
- `35-runtime-ui-connect-declutter`
- `36-runtime-consumption-telemetry-remediation`
- `45-observe-surface-realignment`
- `47-runtime-persistence-rehydration-lifecycle`
- `49-runtime-telemetry-analytics-charts`
- `50-openai-codex-subscription`
- `53-runtime-telemetry-analytics-contract-hardening`
- `60-runtime-ui-paper-linear-review-alignment`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-07-05T00:00:00Z`
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
- The repo now owns an explicit root `catalog:refresh` command that rewrites the pinned models.dev snapshot under `/testdata/catalog/`, while `catalog:export` regenerates the tracked normalized catalog and vendor-version ledger consumed by runtime and packaging flows
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
- The repo now also owns a hierarchical runtime operator shell under `/role-model-router/apps/runtime-ui/` with `Overview`, `Studio`, `Local`, `Remote`, `Models`, `Router`, `Observe`, `Connect`, and `System` sections layered over the existing host bridge, including controller/models, activity/log drill-ins, vendor-backed studio workspaces, and upstream/downstream/system pages
- The runtime UI now separates three configuration pillars: **Local** (device inference, including **Endpoints** at `/app/local/endpoints`), **Remote** (cloud providers), and **Connect** (how applications consume role-model as a provider at `/app/connect*`)
- Legacy `/app/endpoints*`, `/app/control/endpoints`, and `/app/integrations/*` routes redirect to Connect; Connect registry reframes consumer visibility and hands alias posture to Router instead of duplicating alias inventory on the registry page
- The runtime UI shell after run 35 is quieter: no left-rail page counts or meta-guidance panels, Overview uses a slim latest-requests teaser, Local Matrix merges into Local Models **List | Grid**, Router Config merges into Router Overview, and a shared `DisclosureSection` primitive collapses dense detail surfaces by default
- The generated normalized catalog under `/role-model-router/packages/catalog/data/` is now the default shipped provider/model metadata layer for runtime and UI consumers, while LiteLLM-derived providers, models, and endpoints remain preserved as the execution-coverage layer when upstream metadata is missing or divergent
- The host bridge now exposes runtime summary, provider list, account list/upsert, endpoint list, and controller/config control-plane routes, and the repo-local `runtime:validate-ui` command proves those operator surfaces against the live runtime baseline
- The first repo-owned provider-onboarding slice is Moonshot/Kimi-first: Moonshot Open Platform is modeled as a ready API-key path, while Kimi Code remains intentionally backend-limited with real device-OAuth metadata visible in the UI and control plane
- The bridge and provider-openai stack now support OpenAI-compatible downstream streaming for routed `/v1/chat/completions` and `/v1/responses`; live host-path E2E is green, while Kimi remains on the current chat-completions-shaped contract
- The runtime now also owns repo-local unified vendor execution through `/role-model-router/packages/process-supervisor/`, `/role-model-router/packages/vendor-abstraction/`, `/role-model-router/packages/vendor-llama-swap/`, `/role-model-router/packages/vendor-litellm/`, and `/role-model-router/packages/provider-litellm/`, while `/role-model-router/apps/runtime-host-bridge/` derives `decision_only`, `local_only`, `remote_only`, and `hybrid` execution modes from unified YAML config and reports unified remote execution as `litellm-proxy`
- The unified-vendor baseline now includes shared `cacheStatus` metadata, routed fallback-model propagation into LiteLLM `fallbacks`, and additive vendor `healthCheck()` / `executeStream()` compatibility methods for managed llama-swap and LiteLLM vendors
- The repo-owned validation floor now includes `runtime:validate-vendors`, which proves the decision-only/local-only/remote-only/hybrid execution matrix end to end with managed vendor processes, plus separate live-vendor and browser-backed closeout proof for the final local llama-swap and remote LiteLLM bridge paths
- The runtime now has a first SEA packaging path through `/role-model-router/sea-config.json`, `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`, `runtime:package-sea`, `runtime:validate-packaging`, and `/.github/workflows/build-binaries.yml`; the packaged executable embeds platform-aware llama-swap assets and is validated by booting the SEA binary and exercising `/healthz` plus `/v1/models`
- The runtime now also exposes a canonical unified telemetry baseline for mixed local and remote execution, including summary, ledger, request-detail, and `/api/role-model/telemetry/stream` SSE surfaces in `/role-model-router/apps/runtime-host-bridge/` and matching dashboard, requests, and request-detail consumers in `/role-model-router/apps/runtime-ui/`
- Detailed runtime routing, provider-capability, alias-matrix, Codex Subscription lifecycle, and hosted-search/tool semantics now live in `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`.
- Run 49 extended unified telemetry into backend-owned historical analytics, run 50 extended the same runtime baseline into Codex Subscription plus routing/provider-capability truth, and run 53 hardened telemetry analytics into an explicit backend contract with applied query metadata, metric/dimension support, full-slice aggregation, shared semantic chart states, aligned ledger filters, and a current graph matrix architecture reference. Detailed operator-routing, provider, and telemetry semantics live in the dedicated routing/provider domain shard.
- The runtime UI design baseline now follows the Paper Linear review authority captured in `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`: tokenized Inter/IBM Plex Mono typography, a fixed-shell runtime chrome with pinned sidebar/header and scrolling content frame, solid semantic pills with contrasting text, shared select/filter text sizing, icon-only theme toggle, and Recharts-backed chart primitives tuned to the current Paper route compositions.
- Paper remains the visual source of truth for shared design-system and route-composition work, but the repo-owned design-system doc and shipped runtime implementation are the authoritative shipped baseline whenever the Paper file temporarily lags the latest approved runtime adjustments.
- Failed execution rows in that canonical telemetry ledger now preserve caller correlation, request classification, source posture, and explicit failure-stage endpoint markers, so summary failures and request-ledger truth no longer diverge for new requests
- The repo-owned control plane now includes mutable runtime-config read and write routes, `Control > Runtime Config`, live account save and Kimi device-OAuth state, endpoint activation, and honest zero-endpoint `decision_only` controller or models or runtime empty states instead of 500 or loading traps
- The runtime now also owns router-grade role/task policy persistence at `runtimeStateRoot\role-policy.json`, with bridge CRUD/readback routes and router inputs consuming the runtime-owned policy instead of the earlier fixture-fed `adapter-role-task.json` source
- The repo-owned runtime UI now also includes `Control > Roles` for live role create/edit and task allowlist authoring, while `Control > Models` can mutate model-side role bindings against the same runtime-owned policy surface instead of staying inspect-only
- Request ingress now also supports direct `requestedRoleId` targeting on chat-completions and responses paths, and the selected role can inject `default_system_instructions`, constrain `tool_policy`, surface `output_contracts` plus `safety_policy_refs`, and persist the applied policy under durable `routingDiagnostics.rolePolicy`
- The QA bootstrap server now forwards the role-policy, model inventory, device-authorization, and editable unified runtime-config path needed for live Roles/Models plus routing-strategy browser proof
- The vendored llama-swap managed bridge must launch `/role-model-router/apps/runtime-host-bridge/src/cli-entry.ts`; invoking `src/cli.ts` exits without serving `/healthz` and breaks `runtime:validate-host`
- Provider-account and endpoint surfaces now preserve truthful readiness semantics across reload, restart, and packaged execution: pending device-auth flows survive reload/restart, persisted OAuth-backed accounts rehydrate from stored tokens, unresolved env-backed credentials remain `credentials-missing`, and Studio/Workbench/Runtime consumers no longer imply execution readiness before credentials and endpoint activation are actually satisfied
- `runtime:validate-packaging` now rebuilds the host before SEA packaging and proves the packaged Windows executable can serve `/healthz`, `/v1/models`, `/v1/chat/completions`, and `/v1/responses` against the current runtime baseline
- The protocol generation path now preserves `UsageEvent.cost_actual` and emits titled helper types for internal `$defs` entries, so focused `types:generate`, `schemas:validate`, and `@role-model/schema-tools build` stay green in the current baseline
- Provider-account writes remain credential-reference-only; the UI can upsert runtime accounts, but endpoint rows still remain controlled by the existing registry baseline rather than being auto-created by account-save side effects
- Browser, edge, and native provider families are intentionally scaffold-grade in this baseline
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md` now freezes the repo-owned routing-strategy handoff for alias-based local-plus-remote routing, including mode vocabulary, config ownership, the easy/medium/hard rubric, compatibility policy, rollout mapping for runs `23` through `30`, and the later-run verification discipline
- The downstream routing-strategy run contracts under `/.recursive/run/23-.../` through `/.recursive/run/30-.../` now consume the repo-owned strategy lock directly instead of only the external proposal path
- The bridge now reads latest observed profiles from SQLite runtime state on each request instead of routing from the startup fixture-only `routing-observed-profiles.json` map
- Runtime request observations now expose `routingDiagnostics.observedProfile` with source, `per-request` read mode, and measured-at metadata so operators can confirm which persisted profile influenced a route
- The repo-owned validation floor for this routing-feedback baseline now includes focused bridge tests plus `runtime:validate-host` and `runtime:validate-vendors`, including local-and-remote feedback-loop readback visibility
- The runtime now also owns an explicit `observedData` policy contract in `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, including metric-halflife tuning and throughput-SLA configuration with shared local-plus-remote semantics
- Adaptive routing now uses freshness-decayed effective metrics plus SQLite-backed throughput-penalty state to change real route outcomes in `/role-model-router/packages/core/`, `/role-model-router/packages/protocol-routing/`, and `/role-model-router/apps/runtime-host-bridge/`
- Runtime request observations and validator proof now also expose `routingDiagnostics.effectiveMetrics` and `routingDiagnostics.throughputPenalty`, so operators can see the adaptive metric values, freshness weighting, and current penalty state behind a routing decision
- The runtime now also owns a `model_aliases` contract in `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, and bridge discovery surfaces expose configured alias ids beside real model ids
- Alias requests now expand into pooled real endpoint candidates in `/role-model-router/apps/runtime-host-bridge/src/index.ts` before the existing routing stack runs, while exact-model requests remain additive and unchanged
- Runtime request observations and validator proof now also expose durable `routingDiagnostics.aliasResolution` metadata, including one hybrid local-plus-remote alias pool readback
- The runtime now also owns a difficulty-routing contract in `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, including the shared easy-medium-hard rubric family, `difficulty_classifier`, alias mode `difficulty`, and per-source `maxDifficulty`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts` now executes configured classifier-backed difficulty assignment with deterministic fallback, maps difficulty to live routing strategy behavior before final selection, and applies mixed local-and-remote `maxDifficulty` gating on difficulty-mode alias requests
- Runtime request observations and validator proof now also expose durable `routingDiagnostics.difficultyRouting` metadata, including assigned difficulty, selected strategy, fallback status or reason, rubric-signal summaries, and excluded endpoint ids
- The repo-owned validation floor now also proves mixed local-plus-remote difficulty routing through focused bridge tests, `runtime:validate-vendors`, and agent-operated readback of easy-path cost routing plus hard-path quality routing and local-endpoint exclusion; medium-path live QA remains automated-evidence-only under the current binary mock classifier
- The runtime now also owns an explicit `observed_data.difficulty_learning` contract in `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, including conversation-cache invalidation controls plus advisory-recommendation and observed-override thresholds
- `/role-model-router/packages/sqlite-memory/` and `/role-model-router/apps/runtime-host-bridge/` now persist conversation difficulty cache entries, segmented easy/medium/hard observed profiles, advisory `maxDifficulty` recommendation payloads, observed override explanations, and selected-bucket observed-profile diagnostics across both local and remote endpoints
- `/role-model-router/apps/runtime-host-bridge/src/index.ts` now reuses cached conversation difficulty when invalidation rules allow, deterministically reclassifies when the conversation changes materially, and can use observed per-bucket performance to override configured `maxDifficulty` ceilings without mutating operator config
- The repo-owned validation floor now also proves bucketed endpoint-profile readback, deterministic cache reuse and invalidation, observed override above configured ceilings, and bucket-selected routing through focused bridge tests, `runtime:validate-host`, `runtime:validate-vendors`, and agent-operated readback of live runtime surfaces
- The runtime now also owns an explicit `controller` contract in `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, including source-type targeting, controller model or endpoint selection, and bounded timeout behavior for request-time guidance
- `/role-model-router/apps/runtime-host-bridge/src/index.ts` now executes request-time controller inference for intelligent aliases on both chat-completions and responses paths, validates structured controller directives, merges accepted guidance into existing `RoutingRequest` fields plus `routingModel.preferredEndpointIds`, and fails closed on invalid controller output
- Runtime request observations and mixed-vendor validator proof now also expose durable `routingDiagnostics.controllerRouting` metadata with controller-active state, accepted directives, and explicit fallback reasons across mixed local-plus-remote runtime surfaces
- The repo-owned validation floor now also proves mixed local-plus-remote controller steering, invalid-controller-output fallback, controller-inactive alias behavior, and exact-model backward compatibility through focused bridge tests, `runtime:validate-vendors`, and agent-operated readback
- The runtime now also owns per-request routing-mode overrides for `baseline`, `difficulty`, `controller`, and `hybrid`, with deterministic invalid-value rejection and durable receipts that distinguish request overrides from alias-default routing modes
- `/role-model-router/apps/runtime-host-bridge/src/index.ts` and `/role-model-router/packages/runtime-observability/src/index.ts` now persist durable `routingDiagnostics.rewrite` and `routingDiagnostics.hybridArbitration` metadata, including rewrite-applied versus rewrite-skipped outcomes, downstream model ids, hybrid strategy changes, controller dominance, and preferred endpoint guidance
- The repo-owned validation floor now also proves same-pool override-mode execution, exact-model rewrite-skipped compatibility, explicit invalid-override `400` ingress failure, and mixed local-plus-remote readback of override, rewrite, and hybrid-arbitration diagnostics through focused bridge tests, `runtime:validate-vendors`, `runtime:validate-host`, and agent-operated QA
- The repo-owned runtime UI now also has a first-class routing-strategy operator baseline: `Control > Routing strategy`, workbench routing-mode override control, request-ledger routing decision readback, request-detail routing receipts, and a preserved advanced raw-config or raw-observation escape-hatch path all ship together in `/role-model-router/apps/runtime-ui/`
- The runtime UI validation floor now also includes deterministic routed-request receipt proof in `runtime:validate-ui`, confirming that shipped telemetry-list and request-detail APIs expose persisted `routingDecisionId`, effective routing mode, and rewrite reason for the operator shell
- Run 35 added the **Connect** pillar (`/app/connect*`) for downstream consumer guidance while **Local → Endpoints** stays separate; quieter shell, `DisclosureSection`, and browser-visual QA policy for UI-only runs
- Run 36 remediated packaged-runtime consumption: `getCurrentExecutionCatalog()` at execution time, `reasoning_content` assistant mapping, telemetry logs fallback, measured `latencyMs`, `x-role-model-request-id` alias, failure telemetry rows — verified on packaged `:3456` (QA addendum 01)
- Run 36 addendum 02 fixed sole-candidate throughput SLA hard-deny (SP7) and partial runtime-config merge (SP8); exact-remote below 24 tps still needs SLA disabled or alias pools
- Run 36 addendum 03 recorded a 46-prompt × 4-strategy routing matrix for tuning; consumer difficulty E2E on `mixed.local-remote` passed 14/15 with cache-probe caveat on shared `conversationId`
- Run 36 addenda 04–10 delivered the benchmark operator workflow: `/.recursive/BENCHMARK-WORKFLOW.md`, **Models → Benchmark** at `/app/models/benchmark`, `validate-benchmark-run.py`, judge pipeline hardening; operator run `c0b66038` is VALID with HEALTHY control (Kimi 92% > LFM 17%)
- Run 45 realigned Observe around canonical telemetry ownership: `/app/observe` resolves to Requests, request detail remains the richest canonical inspector, Activity and Logs are preserved raw-host adjacency surfaces, and packaged Logs now parse bracketed timestamp rows into request-detail links on the real operator runtime at `:3456`
- Run 47 extended the operator telemetry baseline: `/app` now leads with `Recent telemetry window` and an interaction-level latest-requests rail, `/app/observe/activity` preserves backend newest-first metrics order, `/app/router` alias inventory distinguishes configured hints, resolved models, and readiness while leaving backend-truth alias-drift warnings visible until config changes, and redundant router overview or strategy context panels are removed so router surfaces emphasize canonical inventory and live controls instead of duplicate summary copy

## Validation Path

- Prefer the repo's existing validation chain rather than ad hoc commands
- Root workspace scripts now use PATH-independent nested `corepack pnpm ...` invocations so the canonical shell-out entrypoints stay stable even when a child shell does not expose a global pnpm shim
- GitHub Actions validates this repo from a clean checkout of tracked files only; local Biome parity work should prefer a clean export or tracked-file-targeted checks instead of repo-root sweeps that also traverse nested `.worktrees/`
- On Windows, CRLF-only worktree churn can make local status noisier than the real Linux CI content diff; use `git diff` to identify the actual files that need formatter commits
- The repo-local runtime validation floor is the staged command family `runtime:validate-state`, `runtime:validate-registry`, `runtime:validate-routing`, `runtime:validate-adapter`, `runtime:validate-ui`, `runtime:validate-host`, `runtime:validate-vendors`, `runtime:validate-packaging`, `runtime:validate-observability`, `runtime:validate-operations`, `runtime:validate-tools`, plus `smoke`
- For models.dev metadata work, prefer the explicit refresh/export entrypoints (`corepack pnpm run catalog:refresh` and `corepack pnpm run catalog:export`) plus the focused runtime-ui/runtime-host suites and `runtime:validate-host`/`runtime:validate-packaging` before claiming the metadata layer is fully integrated
- For Observe or other runtime-UI telemetry work that claims packaged-operator parity, prefer focused `runtime-ui` tests/builds plus the repository-root `corepack pnpm run runtime:package-sea`, then verify the rebuilt runtime in a browser on `http://127.0.0.1:3456` instead of relying on a dev-only preview. For chart primitives, verify both contract data and rendered geometry because legends can render while Recharts plots collapse without concrete dimensions.
- When validating runtime work, treat the focused runtime validators and package tests as the run-owned baseline; broader root `build` now fails on the unrelated `provider-acp` / `provider-cli` `endpoint_kind` mismatch, broader root `test` can still fail on the workspace-level `process-supervisor` crash-callback case while the isolated package rerun passes, and vendored proxy or full Go tests on Windows still reproduce the upstream `sleep` PATH assumption

## Scope Boundary

- Do not overclaim provider completeness from the scaffold packages or placeholder rust crates
- Keep future runtime work honest: promote real runtime capability only when backed by implementation and validation, not by directory presence alone
