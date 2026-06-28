Type: `domain`
Status: `CURRENT`
Scope: `Durable runtime routing, provider capability metadata, account and endpoint lifecycle semantics, alias-matrix behavior, routing-strategy and execution-mode interactions, and the operator surfaces that expose those behaviors.`
Owns-Paths:
- `/role-model-router/apps/runtime-host-bridge/**`
- `/role-model-router/apps/runtime-ui/**`
- `/role-model-router/packages/catalog/**`
- `/role-model-router/packages/core/**`
- `/role-model-router/packages/core/data/taxonomy/**`
- `/role-model-router/packages/core/src/taxonomy/**`
- `/role-model-router/packages/provider-openai/**`
- `/role-model-router/packages/runtime-observability/**`
- `/role-model-router/packages/protocol-routing/**`
- `/role-model-router/packages/adapter-execution/**`
- `/packages/conformance/**`
- `/packages/protocol-types/**`
- `/protocol/fixtures/downstream-openai/**`
- `/protocol/fixtures/router-golden/**`
- `/protocol/schemas/downstream-openai-discovery.schema.json`
- `/protocol/schemas/router-decision.schema.json`
- `/schemas/role-model/taxonomy/**`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- `/docs/architecture/12-downstream-alias-capability-discovery.md`
- `/docs/taxonomy/**`
- `/testdata/catalog/**`
- `/packages/pi-role-model/**`
Watch-Paths:
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/domains/role-model-baseline.md`
Source-Runs:
- `22-router-runtime-routing-strategy-lock`
- `23-router-runtime-live-observed-feedback`
- `24-router-runtime-recency-bias-throughput-sla`
- `25-router-runtime-model-alias-pool`
- `26-router-runtime-difficulty-guided-routing`
- `27-router-runtime-difficulty-learning-cache`
- `28-router-runtime-controller-guided-routing`
- `29-router-runtime-request-rewriter-hybrid-mode`
- `30-router-runtime-strategy-convergence-e2e`
- `34-router-runtime-role-policy-and-ui-fixture-reduction`
- `36-runtime-consumption-telemetry-remediation`
- `45-observe-surface-realignment`
- `47-runtime-persistence-rehydration-lifecycle`
- `49-runtime-telemetry-analytics-charts`
- `50-openai-codex-subscription`
- `51-runtime-testing-architecture-and-regression-matrix`
- `53-runtime-telemetry-analytics-contract-hardening`
- `54-alias-capability-discovery-contract`
- `55-pi-role-model-package`
- `56-pi-role-model-gap-closure`
- `57-role-model-taxonomy-v1-phase-1-4`
- `58-role-model-taxonomy-v1-benchmark-telemetry`
- `59-observe-taxonomy-analytics-completion`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-06-28T20:50:00Z`
Tags:
- `runtime`
- `routing`
- `providers`
- `capabilities`
- `oauth`
- `telemetry`
- `taxonomy`

# Runtime Routing And Provider Capabilities

This shard owns the detailed runtime truth for how role-model routes requests, exposes provider and endpoint state, and surfaces those decisions to operators and downstream consumers.

## What This Domain Owns

- Runtime-host routing, provider, account, endpoint, and validator behavior
- Runtime-UI routing, provider, remote, and Studio truth surfaces
- Catalog and provider metadata that shape routing and tool-capability decisions
- Protocol and conformance artifacts tied to routing decisions and alias behavior
- The operator-facing routing-interaction architecture doc

## Durable Truths

- The runtime owns a canonical strategy × execution-mode routing matrix, and alias materialization must reflect that matrix instead of ad hoc inventory fallback.
- Legacy `craft-ask` strategy and alias ids are removed and should not reappear in config materialization, `/v1/models`, or operator documentation.
- Exact-model requests stay additive; alias requests resolve through the runtime-owned candidate pool before final routing.
- `/api/role-model/downstream/openai` is the rich downstream OpenAI-compatible discovery contract for exact models and aliases. `/v1/models` remains the compact compatibility list, but now carries additive conservative capability metadata (`context_window`, `max_tokens`, Pi-compatible `input`, full modality lists, capability names, `role_model.discovery_url`, and `role_model.capability_revision`) so consumers can auto-discover from the standard model-list URL. Consumers that need declared versus routable layers, conditional target membership, provenance, cache posture detail, or alias composition should follow the rich route.
- Pi can configure the role-model provider aliases from the compact `/v1/models` route. The current Run 54 QA baseline proved all `15` aliases list through `pi --provider role-model --list-models role-model` with `262.1K` context, `128K` max output, thinking enabled, and image support, while concrete DeepSeek models still correctly show no image input support.
- The repo-owned Pi package is `/packages/pi-role-model` and is published publicly as `@try-works/pi-role-model` for `pi install @try-works/pi-role-model`. It uses the rich `/api/role-model/downstream/openai` contract to register a Pi provider named `role-model`, ships a `role-model` skill, and implements one `/role-model` command family. The verified scope is external-runtime only: no managed runtime process, no Role-Model launcher call, no Pi credential copy/sync, no benchmark command, no Pi auth-file reads, and no Pi-side routing logic.
- Role-Model Taxonomy V1 is the canonical classification and routing-intent vocabulary. It is versioned separately across schema version, taxonomy version, database/storage version, content revision, and classification contract version, and currently exposes `6` groups, `28` roles, `280` task types, `46` capabilities, `9` modalities, and `15` tool classes. Group membership is explicit on role entries via `primaryGroupId` and `secondaryGroupIds`; task IDs follow `{role-family}.{task-action}[.{variant}]`; task detail stays subordinate to role context.
- Runtime taxonomy discovery is exposed through `/api/role-model/taxonomy*`. Consumers should start with summaries/groups/role summaries, then fetch task details only for likely roles or ambiguity. Do not force consumers to ingest the full taxonomy catalog when compact progressive-disclosure data is sufficient.
- Request metadata from consumers should use `role_model.intent`. The router normalizes it into routing intent, treats hard trusted fields as eligibility filters, treats advisory fields as scoring/diagnostic signals, and persists taxonomy version metadata with decisions so historical receipts remain interpretable.
- `pi-role-model` now packages compact taxonomy data and a progressive classifier. It should prefer compatible runtime taxonomy/effective-taxonomy discovery when available, fall back to the package snapshot offline, avoid hidden classification model calls by default, and inject `role_model.intent` into provider payloads only for known Role-Model aliases.
- `pi-role-model` discovery should check `/healthz`, `/api/version`, and `/api/role-model/downstream/openai`, with compact `/v1/models` fallback only for compatible rich-discovery absence. Remote endpoints are blocked by default unless an explicit trusted allow-remote path is used, and `authentication.required: true` must fail closed unless a real supported token source is added.
- Rich downstream OpenAI discovery records must remain Pi-compatible for both configured aliases and QA fallback records: include contract version, record type, limits, structured capabilities, modalities, declared/routable metadata, `piMapping`, freshness, and conservative renderer fields.
- Runtime-host QA backends are part of the Pi integration verification surface. `scripts/start-for-qa.ts` should start managed local and remote mock vendors, skip placeholder control-plane endpoints by default, advertise canonical taxonomy capabilities for QA local/remote models, bind the QA local model to canonical roles, and support real Pi completion QA where telemetry records `requestedRoleId`, role-scoped `roleIds`, `ROLE_POLICY_APPLIED`, and `TASK_POLICY_APPLIED`.
- For Pi package compatibility, provider model records need Pi renderer fields beyond id/limits: `input` and zeroed `cost` are required for `pi --list-models role-model` to render Role-Model models without a package-side TypeError. Role-Model provider models also need `compat.supportsDeveloperRole: false`; real Pi prompt QA found the runtime rejects `developer` messages unless Pi is told not to send that role.
- Pi extension commands use `handler(args, ctx)`, not `run`; command output should use `ctx.ui.notify(...)`. Non-interactive `pi -p "/role-model ..."` sends slash-command text to the model instead of executing extension commands, so package command QA should use Pi RPC. Noninteractive `pi -p` remains appropriate for actual model prompt smoke tests.
- Pi's package CLI on Windows can complete useful work and then print `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`; run 56 observed this after `install`, `list`, `--help`, `--list-models`, and `remove`. Treat observable package state, RPC command output, and prompt success as the package truth while recording the Pi CLI teardown caveat.
- Rich downstream discovery is derived on each read from the current registry, catalog, runtime alias config, and effective routable inventory. Endpoint/model onboarding, routing-strategy alias regeneration, execution-mode changes, endpoint readiness, and catalog updates should update those underlying inputs rather than writing separate alias metadata.
- Every configured downstream alias should receive a rich discovery record. If the current endpoint pool is empty, the alias remains visible with empty `routable` sets and declared configured target metadata rather than disappearing from discovery.
- Mixed-alias capability claims must distinguish guaranteed, available, conditional, declared, and currently routable support. Capability-constrained requests must filter incompatible targets before scoring.
- Routing semantics are split across `baseline`, `difficulty`, `controller`, and `hybrid`, with request-level overrides producing durable routing diagnostics rather than mutating saved operator config.
- Difficulty routing, controller routing, rewrite behavior, hybrid arbitration, observed-profile selection, effective metrics, throughput penalties, and alias resolution are all runtime-owned diagnostics that should remain inspectable in request receipts.
- The operator-facing routing interaction reference is `/docs/architecture/09-runtime-routing-strategy-interactions.md`; when routing semantics change, that doc must stay aligned with runtime truth.
- Operator-facing OpenAI inventory collapses to one `OpenAI` provider surface with `API Key` plus `Codex Subscription`; raw `chatgpt/*` provider rows are not an operator-facing provider baseline.
- `Codex Subscription` is a truthful auth-boundary path, not an API-key equivalent:
  - device authorization can complete from the local Codex auth cache
  - a connected account can remain `Connected, no endpoint` / `entitlement-missing`
  - direct OpenAI Platform execution stays blocked when the cached ChatGPT/Codex session lacks the required request scopes
- Supported OpenAI subscription models are curated to GPT `5.3+`; capability claims for that path should be tied to the curated matrix rather than inherited blindly from raw upstream catalog rows.
- Hosted-search and tool-capability routing is transport-aware:
  - OpenAI exact hosted search is provider-native for supported GPT `5.3+` subscription models
  - Kimi exact hosted search is provider-native on the active transport and should not be excluded from search-capable routing
  - DeepSeek has documented provider-native web search on other vendor surfaces, but on the current runtime transport the bridge still classifies it as `runtime-fallback`
  - DeepSeek DSML search markup should be normalized back into consumer-visible tool calls rather than expanded into a generic router-hosted browser/tool runtime
- The router runtime is not a universal hosted browser or tool executor for every provider. Current code still has a `runtime-fallback` classification for some ordinary tool-calling web-search turns, but that should not be confused with a provider-native hosted-tool contract.
- The architecture reference for these boundaries is `/docs/architecture/09-runtime-routing-strategy-interactions.md`; that doc and this shard should stay aligned when the runtime transport or hosted-tool boundary changes.
- Non-controller `requestedRoleId` ingress is part of the baseline and must survive alias-based routing without being lost before role filtering.
- Roles are the primary operator-facing hierarchy level; task detail is subordinate and should appear only through explicit drill-down rather than as flat top-level routing inventory.
- Runtime account and endpoint readiness must remain truthful across reload, restart, and packaged execution:
  - pending device-auth flows survive reload and restart
  - persisted OAuth-backed accounts rehydrate from stored tokens
  - unresolved env-backed credentials remain `credentials-missing`
  - Studio and related consumers must not imply execution readiness before credentials and endpoint activation are actually satisfied
- The telemetry query path is backend-owned and powers Overview plus Observe analytics surfaces; setup and control pages should not regress into chart dashboards.
- Richer taxonomy telemetry dimensions now include original role/task hints, normalized role/task, group, variant, capability, modality, and tool-class data. Observe analytics and request-ledger enrichment should read those dimensions from persisted telemetry-ledger fields first; reparsing large raw `runtime_observations.observation_json` bundles is now a fallback path for request detail, not the normal analytics path.
- The telemetry analytics contract now returns applied query metadata, slice metadata, metric support, and dimension support. Analytics aggregation is full-slice by default and must not silently inherit request-ledger pagination caps.
- Request-ledger reads and telemetry analytics reads share overlapping filter semantics for operator-visible dimensions while preserving separate ledger pagination behavior.
- Runtime UI telemetry charts consume shared semantic states (`loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, `populated`) instead of treating missing buckets as the only source of chart truth.
- Horizontal ranking telemetry charts use bottom legends for long technical labels and a concrete plot height so Recharts has stable geometry.
- The current runtime telemetry graph matrix architecture reference is `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`.
- `runtime:validate-ui` teardown must shut down cleanly after backend shutdown; validator cleanup is part of the durable runtime baseline, not a one-off test harness fix.
- Benchmark-backed quality precedence in live routing is now: task score → eligible role score → eligible group score → overall benchmark fallback → measured quality. Measured latency, throughput, and reliability remain advisory non-quality metrics and benchmark evidence must not create hard eligibility by itself.

## Validation Path

- For routing or provider-capability changes, prefer focused runtime-host and runtime-ui tests first, then the repo-owned validators such as `runtime:validate-host`, `runtime:validate-vendors`, and `runtime:validate-ui`.
- When claims depend on rebuilt operator truth, verify against the rebuilt runtime in-browser instead of relying only on fixture tests or stale local ports.
- For telemetry chart changes, include both contract-level tests and browser/runtime verification that chart primitives render non-empty geometry when data is present.
- For alias-matrix or controller behavior changes, confirm persisted config truth, live `/v1/models` exposure, and Pi-originated requests for every configured alias when Pi compatibility is in scope.
- For downstream discovery changes, confirm both `/v1/models` compact metadata and the rich route against the current runtime config alias set, including empty-pool aliases where feasible, and validate the downstream OpenAI schema/fixtures.
- For provider capability changes, verify exact-model and alias-path behavior separately where the transport boundary can differ.
- For taxonomy changes, compare canonical data against proposal or generated golden fixtures, validate schemas and generated docs, probe `/api/role-model/taxonomy*`, verify runtime routing intent normalization, verify UI role assignment/drill-down, and run `@try-works/pi-role-model` compact-classification tests.
- For Pi taxonomy changes, use real Pi RPC for `/role-model` commands and capture real provider transport to prove `role_model.intent` is sent for known Role-Model aliases; one-line stdin pipelines can close before slower async extension commands finish.

## Scope Boundary

- Do not treat ChatGPT/Codex auth as equivalent to an OpenAI API key.
- Do not let the runtime grow into a generic hosted tool/browser executor when the provider or consumer should own that loop.
- Do not document, emit, or accept routing aliases that are not part of the canonical runtime-owned matrix.
- Do not implement taxonomy-aware benchmark scoring, taxonomy telemetry rollups, or telemetry-informed taxonomy routing inside the Phase 1-4 taxonomy baseline; those are later proposal phases.

## Benchmark Quality Routing (Added 2026-06-24)

Benchmark runs produce per-endpoint quality scores (`endpointGrades[].overallScore`) that are stored on routing candidates as `benchmarkCapability.overallScore`. The `getQualityMetric()` function in the router core reads these through a three-tier priority system:

1. `candidate.observed?.judge_score` — live request judging (highest priority, rarely populated)
2. `candidate.observed?.quality_score` — difficulty-bucketed observed profiles
3. `candidate.benchmarkCapability?.overallScore` — benchmark-derived quality (added in addendum 10)
4. Default 0.500 — neutral fallback

The `MetricSource` type includes `"benchmark"` for provenance. `EndpointCandidate` carries `benchmarkCapability?: { overallScore?: number }` populated by `buildBenchmarkCapabilityForEndpoint()` from completed benchmark summaries.

**Before fix:** All models defaulted to quality 0.500. Routing was pure cost/latency — v4-flash won 89%.
**After fix:** v4-pro 0.925, kimi 1.000, v4-flash 0.833. v4-pro wins 90%.

Kimi k2.7 (benchmark 1.0, cost score 0.640, 56s avg latency) still trails v4-pro (benchmark 1.0, cost 0.919, 9s avg) because the tiebreak order is `quality → latency → reliability → endpoint_id` and Kimi's cost/latency disadvantages outweigh its perfect quality.

**Current benchmark results (routing-capability-v2 v3.4, judge: deepseek-v4-flash):**

| Model | Score | 12 Cases | Notes |
|-------|-------|----------|-------|
| deepseek-v4-pro | 1.00 | 12/12 ✅ | Best all-around |
| moonshot/kimi-k2.7 | 1.00 | 12/12 ✅ | Perfect but slow (56s avg) |
| deepseek-v4-flash | 0.75 | 9/12 | Failed p17, x01, h15 (tool-chain cases) |
