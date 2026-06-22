Run: `/.recursive/run/54-alias-capability-discovery-contract/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-22T04:35:07Z`
LockHash: `643c6237a4a483ed7b65664e06c15b4e0d5ca5eb10e88decb5cae60e9aff76a5`
Inputs:
- `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`
- `/.recursive/run/54-alias-capability-discovery-contract/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- `/docs/architecture/10-runtime-testing-architecture.md`
- `/docs/operations/04-runtime-testing-matrix.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/test/routable-inventory-bootstrap.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/testdata/catalog/litellm-model-prices.json`
- `/protocol/schemas/capability-taxonomy.schema.json`
- `/protocol/schemas/declared-capability-profile.schema.json`
- Local Pi config at `D:\pi\agent\models.json`
- Local operator runtime config at `C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml`
Outputs:
- `/.recursive/run/54-alias-capability-discovery-contract/01-as-is.md`
Scope note: This artifact records the pre-change alias discovery, metadata, request-routing, schema, runtime, and Pi-consumer behavior that Run 54 must replace or extend.

## TODO

- [x] Re-read locked requirements and worktree baseline
- [x] Inspect existing model metadata and alias discovery code paths
- [x] Inspect request ingress and alias routing filters for capability-aware behavior
- [x] Inspect existing catalog, LiteLLM, schema, and fixture support
- [x] Inspect current local runtime and Pi downstream configuration
- [x] Audit AS-IS findings against Run 54 requirements
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md` is locked and requires rich alias capability discovery, GPT metadata repair, strict TDD, updated-runtime verification, Pi verification, and downstream documentation.
- `00-worktree.md` is locked and establishes baseline commit `557e48b63e1c75839f1b818c980daf56b72f9a5d`, branch `recursive/54-alias-capability-discovery-contract`, and diff command `git diff --name-only 557e48b63e1c75839f1b818c980daf56b72f9a5d`.
- No addenda exist for Run 54.

## Reproduction Steps

1. From the worktree, inspect `/role-model-router/apps/runtime-host-bridge/src/index.ts` around `createModelListResponse`, `createRuntimeModelRecords`, `createDownstreamOpenAIProviderConfig`, `mapChatCompletionsRequest`, and `mapResponsesRequest`.
2. Inspect `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts` around `resolveAliasAllowEndpoints`.
3. Inspect `/role-model-router/packages/catalog/data/normalized-catalog.json` for `openai/gpt-5.4`, `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`, and `moonshot/kimi-k2.7-code`.
4. Inspect `/testdata/catalog/litellm-model-prices.json` for `chatgpt/gpt-5.4`.
5. Inspect `D:\pi\agent\models.json` for the currently configured role-model provider.
6. Query `http://127.0.0.1:3456` only if a runtime is intentionally running; at AS-IS time the port refused connections.

## Current Runtime and Consumer State

- `http://127.0.0.1:3456` was not listening during Phase 1 AS-IS inspection; `GET /v1/models`, `GET /api/role-model/models`, and `GET /api/role-model/downstream/openai` all failed with connection refused.
- Pi is configured at `D:\pi\agent\models.json` with provider `role-model`, base URL `http://127.0.0.1:3456/v1`, model `hybrid.hybrid`, `input: ["text"]`, `contextWindow: 128000`, `maxTokens: 16384`, and `reasoning: false`.
- The local operator runtime config exists at `C:\Users\erikb\AppData\Local\Role Model Runtime\runtime-config.yaml` and currently defines the canonical alias matrix for `default.*`, `baseline.*`, `controller.*`, `difficulty.*`, and `hybrid.*`.
- The configured `hybrid.hybrid` alias targets `chatgpt/gpt-5.4`, `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`, and `moonshot/kimi-k2.7-code`.

## Current Code Behavior

### Model Metadata

- `/role-model-router/packages/catalog/data/normalized-catalog.json` contains correct canonical rows for:
  - `openai/gpt-5.4`: context window `1050000`, max output `128000`, modalities `image`, `pdf`, `text`
  - `deepseek/deepseek-v4-flash`: context window `1000000`, max output `384000`, modality `text`
  - `deepseek/deepseek-v4-pro`: context window `1000000`, max output `384000`, modality `text`
  - `moonshot/kimi-k2.7-code`: context window `262144`, max output `262144`, modalities `text`, `image`, `video`
- `/testdata/catalog/litellm-model-prices.json` contains a `chatgpt/gpt-5.4` row with `1050000 / 128000`, function calling, response schema, and vision support.
- `resolveRuntimeEndpointCatalogTemplate()` can clone canonical `openai/*` metadata for an endpoint model id that starts with `chatgpt/` when the account provider is OpenAI.
- `createRuntimeModelRecords()` currently looks up metadata by exact `modelId` in the supplied catalog and falls back to empty arrays plus `contextWindow: 0` and `maxOutputTokens: 0` when no exact row exists.
- `createRuntimeModelRecords()` receives `currentNormalizedCatalog` from `backend.listModels()` rather than an explicit shared metadata resolver; exact model records, alias records, and downstream discovery do not share one normalized metadata path.

### Discovery Surfaces

- `createModelListResponse()` groups endpoints by model id and adds alias ids when the alias resolves to endpoints. The returned records are OpenAI-compatible model list entries with `id`, `object`, `owned_by`, and `endpoint_ids` only.
- `GET /v1/models` calls `createModelListResponse(registry, modelAliases, inventory)`. It is compatibility-oriented and currently does not expose limits, modalities, tools, reasoning, caching, freshness, or alias aggregate semantics.
- `createDownstreamOpenAIProviderConfig()` currently calls `createModelListResponse(registry, modelAliases)` without passing inventory, then returns provider setup fields plus the same minimal `models` list.
- `GET /api/role-model/downstream/openai` returns the setup object from `createDownstreamOpenAIProviderConfig()` and does not expose a rich contract version, schema version, exact-versus-alias discriminator, resolved target summaries, aggregate limits, capability taxonomy, source attribution, declared-versus-routable layers, sanitization metadata, or freshness markers.
- `GET /api/role-model/models` delegates to `backend.listModels()` and returns exact runtime model records only; aliases are not represented with aggregate capability metadata.

### Alias Resolution and Routing

- `resolveAliasAllowEndpoints()` intersects `alias.modelIds` with routable inventory entries, returns `allowEndpoints`, `resolvedModelIds`, drift warnings, and `ALIAS_POOL_EMPTY` for empty pools.
- Current alias resolution correctly prevents stale-only aliases from widening to unrelated inventory, and existing tests cover stale alias drift and empty alias omission.
- `mapChatCompletionsRequest()` and `mapResponsesRequest()` set `requiredCapabilities: ["text.chat"]` and `requiredModalities: ["text"]` for all routed requests.
- Chat Completions accepts message content arrays in the type shape but `readChatMessageTextContent()` extracts only text parts; it does not infer `input.image` or `input.video` requirements from content parts.
- Responses input arrays are converted through `toResponsesInputMessages()`, which currently requires each message `content` to be a string. Responses does not yet normalize image or video input parts for routing.
- Responses hosted tools have a transport-aware special path through `resolveResponsesToolExecutionPlan()`, but general request capability inference is not centralized across Chat Completions and Responses.
- Ordinary Chat Completions function tools are converted to runtime tool definitions, but model eligibility still enters routing with only `text.chat` required and `needsTools` as a signal; there is no shared hard requirement token such as `tools.function_calling` applied before scoring for every tool-bearing request.
- Structured output, explicit reasoning controls, cache requirements, and multimodal input requirements are not normalized into one shared request-capability model before alias candidate scoring.
- No stable machine-readable no-eligible-target error contract exists for unsupported modalities or capability-constrained alias requests; current failures are plain thrown errors.

### Capability Schema and Fixtures

- `protocol/schemas/capability-taxonomy.schema.json` exists but is minimal: `version` plus `capabilities[]` with `id`, `family`, and `description`.
- `protocol/schemas/declared-capability-profile.schema.json` exists for endpoint-declared claims, but it does not define the rich downstream alias discovery response, aggregate alias semantics, declared-versus-currently-routable layers, freshness metadata, source provenance, or sanitized downstream fields required by Run 54.
- `packages/schema-tools/src/validate-schemas.ts` validates all `.schema.json` files and a hard-coded fixture manifest. Any new downstream-discovery schema and golden fixtures must be added to that manifest or covered by equivalent targeted tests.

### Documentation

- `/docs/architecture/09-runtime-routing-strategy-interactions.md` documents the current alias matrix, strict alias resolution, and transport-aware hosted web-search handling.
- The current architecture doc does not define Pi-style downstream alias capability resolution, rich discovery schema/versioning, aggregate limit semantics, conditional modalities, declared versus routable capability layers, downstream sanitization, metadata freshness, or stable no-eligible-target errors.

## Current Behavior by Requirement

- `R1`: catalog and LiteLLM data contain correct GPT values, but current runtime surfaces do not have one shared resolver that guarantees `chatgpt/gpt-5.4` resolves to canonical GPT metadata everywhere.
- `R2`: exact model discovery, alias discovery, and runtime model records are split across ad hoc functions; source attribution and precedence are not modeled.
- `R3`: `/api/role-model/downstream/openai` exists but is setup-oriented and minimal, not a rich alias/exact model discovery contract.
- `R3.1`: minimal capability schemas exist, but there is no downstream alias capability taxonomy/schema with golden fixtures for mixed aliases, unknown targets, no-eligible-target, or Pi mapping.
- `R3.2`: current discovery does not distinguish declared model capability from currently routable endpoint capability.
- `R3.3`: downstream discovery does not expose freshness/revision metadata and does not define a sanitization boundary.
- `R4`: alias aggregate limits and unknown-target semantics are not exposed.
- `R5`: input/output modality support is not exposed with guaranteed/available/conditional semantics.
- `R6`: alias routing filters by model alias membership, not inferred modality requirements.
- `R6.1`: request capability inference is not centralized and stable failure errors do not exist.
- `R7`: tool and structured-output support are partly present in execution code and catalog metadata, but not exposed or enforced through one alias capability contract.
- `R8`: reasoning support exists as generic catalog capability strings and runtime observations, but reasoning controls are not exposed or enforced as a downstream compatibility surface.
- `R9`: caching appears in runtime telemetry/vendor metadata, but cache posture is not exposed in downstream discovery.
- `R10`: Pi currently relies on hard-coded config values and cannot discover rich alias limits/capabilities from role-model.
- `R11`: alias diagnostics expose resolution/drift, but not inferred request capability filters or exclusion reasons.
- `R12`: baseline validation exists, with an inherited host validator timeout; Run 54 needs strict RED/GREEN tests plus updated-runtime and Pi verification.
- `R13`: existing routing docs cover alias families but not downstream alias capability resolution.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `557e48b63e1c75839f1b818c980daf56b72f9a5d`
- Comparison reference: `working-tree`
- Normalized baseline: `557e48b63e1c75839f1b818c980daf56b72f9a5d`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 557e48b63e1c75839f1b818c980daf56b72f9a5d`
- Current phase-owned changes: `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`, `00-worktree.md`, and this `01-as-is.md`.
- Product implementation files are not changed in Phase 1.

## Known Unknowns

- The runtime process that previously exposed `:3456` is not currently running, so live response shape from the installed runtime must be reproven in Phase 4/5 after an updated runtime is started.
- The exact Pi automation surface is not yet known; Phase 2 must plan both direct Pi-driven discovery and a deterministic bridge fallback if Pi has no built-in discovery command.
- Some provider-specific capability details, especially reasoning controls and cache behavior, need implementation-time source-of-truth decisions to avoid overclaiming.

## Findings

1. The current downstream discovery route is insufficient for Pi because it returns setup-oriented OpenAI-compatible model IDs rather than rich exact/alias capabilities.
2. The current metadata path is not centralized; model records can still fall back to `0 / 0` when runtime model IDs do not exactly match catalog IDs.
3. Alias resolution is inventory-aware but capability-blind; it does not filter DeepSeek out of image/video alias requests or filter unsupported tool/reasoning/structured-output requests before scoring.
4. Existing catalog data is strong enough to build the requested contract for the known GPT, DeepSeek, and Kimi pool, but the current schema and runtime surfaces do not expose the needed aggregate semantics.
5. Pi is currently configured with stale conservative values and no multimodal/reasoning capability readback, confirming the downstream consumer problem.
6. The existing schema tooling can support a machine-readable contract, but no downstream discovery schema or golden fixture exists yet.
7. Documentation currently explains alias routing strategy interactions but not downstream alias capability resolution.

## Audit Execution

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed `multi_agent_v1.spawn_agent`.
- Delegation Decision Basis: Recursive-mode prefers delegated audits when available, but the active subagent tool contract says not to spawn subagents unless the user explicitly asks for subagents, delegation, or parallel agent work.
- Delegation Override Reason: User approved implementation and worktree use but did not explicitly authorize subagents; this Phase 1 audit therefore uses self-audit.
- Audit Inputs Provided: locked Run 54 requirements/worktree artifacts, runtime code pointers above, catalog rows, Pi config, runtime config, and normalized diff basis.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: direct file reads and command evidence from the worktree; direct Pi/runtime config inspection; direct `:3456` connection checks.
- Acceptance Decision: `accepted`
- Refresh Handling: not applicable; no delegated context was used.
- Repair Performed After Verification: none.

## Requirement Completion Status

- `R1`: `not implemented`; AS-IS confirms source data exists but runtime resolver is incomplete.
- `R2`: `not implemented`; AS-IS confirms split metadata paths.
- `R3`: `not implemented`; AS-IS confirms minimal downstream discovery.
- `R3.1`: `not implemented`; AS-IS confirms no rich downstream schema/golden fixtures.
- `R3.2`: `not implemented`; AS-IS confirms no declared-versus-routable layer.
- `R3.3`: `not implemented`; AS-IS confirms no freshness/sanitization contract.
- `R4`: `not implemented`; AS-IS confirms no alias aggregate limits.
- `R5`: `not implemented`; AS-IS confirms no guaranteed/available/conditional modalities.
- `R6`: `not implemented`; AS-IS confirms modality-blind alias routing.
- `R6.1`: `not implemented`; AS-IS confirms duplicated/partial inference and plain errors.
- `R7`: `not implemented`; AS-IS confirms tool/structured-output metadata is not contract-driven.
- `R8`: `not implemented`; AS-IS confirms reasoning controls are not contract-driven.
- `R9`: `not implemented`; AS-IS confirms caching is not in discovery.
- `R10`: `not implemented`; AS-IS confirms Pi hard-codes the alias model.
- `R11`: `not implemented`; AS-IS confirms diagnostics lack capability exclusion details.
- `R12`: `not implemented`; AS-IS records baseline validation state for later TDD/verification.
- `R13`: `not implemented`; AS-IS confirms docs gap.

## Traceability

- Metadata and resolver findings -> `R1`, `R2`, `R4`
- Discovery surface findings -> `R3`, `R3.1`, `R3.2`, `R3.3`, `R5`, `R9`, `R10`
- Routing and ingress findings -> `R6`, `R6.1`, `R7`, `R8`, `R11`
- Baseline and runtime/Pi observations -> `R10`, `R12`
- Documentation findings -> `R13`

## Coverage Gate

- [x] Existing discovery routes reviewed
- [x] Exact-model metadata and catalog source rows reviewed
- [x] Alias resolution and routing ingress reviewed
- [x] Capability schema and fixture support reviewed
- [x] Local runtime availability and Pi config reviewed
- [x] Findings map to every Run 54 requirement

Coverage: PASS

## Approval Gate

- [x] AS-IS findings are concrete enough to drive strict RED tests in Phase 3
- [x] Findings preserve the run boundary and do not prescribe implementation before Phase 2
- [x] Baseline uncertainties are recorded for planning rather than hidden

Approval: PASS

## Audit Gate

- [x] Re-read effective inputs
- [x] Reconciled findings with the Phase 0 diff basis
- [x] Verified findings against concrete files and local config
- [x] Confirmed every requirement has an AS-IS disposition

Audit: PASS
