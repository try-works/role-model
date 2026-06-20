Type: `domain`
Status: `CURRENT`
Scope: `Durable runtime routing, provider capability metadata, account and endpoint lifecycle semantics, alias-matrix behavior, routing-strategy and execution-mode interactions, and the operator surfaces that expose those behaviors.`
Owns-Paths:
- `/role-model-router/apps/runtime-host-bridge/**`
- `/role-model-router/apps/runtime-ui/**`
- `/role-model-router/packages/catalog/**`
- `/role-model-router/packages/core/**`
- `/role-model-router/packages/provider-openai/**`
- `/role-model-router/packages/runtime-observability/**`
- `/role-model-router/packages/protocol-routing/**`
- `/role-model-router/packages/adapter-execution/**`
- `/packages/conformance/**`
- `/packages/protocol-types/**`
- `/protocol/fixtures/router-golden/**`
- `/protocol/schemas/router-decision.schema.json`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- `/testdata/catalog/**`
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
Validated-At-Commit: `working-tree`
Last-Validated: `2026-06-20T12:40:00Z`
Tags:
- `runtime`
- `routing`
- `providers`
- `capabilities`
- `oauth`
- `telemetry`

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
- `runtime:validate-ui` teardown must shut down cleanly after backend shutdown; validator cleanup is part of the durable runtime baseline, not a one-off test harness fix.

## Validation Path

- For routing or provider-capability changes, prefer focused runtime-host and runtime-ui tests first, then the repo-owned validators such as `runtime:validate-host`, `runtime:validate-vendors`, and `runtime:validate-ui`.
- When claims depend on rebuilt operator truth, verify against the rebuilt runtime in-browser instead of relying only on fixture tests or stale local ports.
- For alias-matrix or controller behavior changes, confirm both persisted config truth and live `/v1/models` exposure.
- For provider capability changes, verify exact-model and alias-path behavior separately where the transport boundary can differ.

## Scope Boundary

- Do not treat ChatGPT/Codex auth as equivalent to an OpenAI API key.
- Do not let the runtime grow into a generic hosted tool/browser executor when the provider or consumer should own that loop.
- Do not document, emit, or accept routing aliases that are not part of the canonical runtime-owned matrix.
