Run: `/.recursive/run/54-alias-capability-discovery-contract/`
Phase: `00 Requirements`
Status: `DRAFT`
LockedAt: ``
LockHash: ``
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/run/37-downstream-openai-tool-turn-ingress/00-requirements.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md`
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md`
- `/.recursive/run/44-kimi-k2.7-code-catalog/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- `/docs/architecture/10-runtime-testing-architecture.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
- `/role-model-router/packages/catalog/src/index.ts`
- `/role-model-router/packages/catalog/src/token-economics.ts`
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/testdata/catalog/litellm-model-prices.json`
- User guidance in chat on 2026-06-22:
  - downstream consumers need accurate capability and limit metadata for alias endpoints
  - GPT/Codex Subscription model metadata is currently wrong in role-model
  - alias metadata must communicate modalities, reasoning/thinking, tool use, and caching posture
  - image and video input through aliases must route only to capable target models
  - strict TDD must be explicit and evidence-bearing
  - verification must include the updated running role-model runtime, not a stale process
  - verification must include the runtime configured in Pi, with Pi driven or inspected as a downstream consumer
  - the run must produce documentation about aliases and endpoint capability resolution by downstream consumers
  - final review on 2026-06-22 must be folded into this draft before approval: distinguish declared versus currently routable capabilities, sanitize downstream discovery, require golden contract fixtures, expose metadata freshness, standardize capability failure errors, cover all downstream aliases, and centralize request capability inference
Outputs:
- `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`
Scope note: This run makes role-model the authoritative discovery and enforcement layer for alias endpoint metadata, including GPT/Codex Subscription model metadata, per-target and aggregate alias limits, input/output modalities, reasoning controls, tool capabilities, advisory cache semantics, and request-time eligibility filtering for downstream consumers such as Pi.

## TODO

- [x] Re-read recursive-mode control-plane inputs for a new run
- [x] Identify prior runtime routing, alias, catalog, Kimi, Codex Subscription, downstream, and testing runs relevant to this requirement
- [x] Convert the approved downstream alias capability proposal into repo-owned requirement IDs
- [x] Encode GPT/Codex Subscription metadata repair as a role-model responsibility
- [x] Encode alias aggregate discovery semantics for limits, modalities, reasoning, tools, structured output, and caching
- [x] Encode request-time routing enforcement for image, video, tool, structured-output, and reasoning-control requests
- [x] Encode extensibility requirements for a versioned discovery contract, capability taxonomy, metadata source attribution, and resolver precedence
- [x] Encode strict TDD, updated-runtime verification, Pi-driven discovery verification, and downstream alias/capability-resolution documentation
- [x] Encode final review improvements for declared versus routable capability layers, sanitized downstream discovery, golden fixtures, metadata freshness, stable errors, all-alias coverage, and shared ingress inference
- [x] Record out-of-scope boundaries, constraints, and assumptions
- [x] Review whether the requirement is thorough, systematic, future-proof, and extensible
- [x] Complete Coverage Gate checklist
- [ ] Obtain user approval before locking Phase 00

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `/.recursive/STATE.md` | current truth for runtime-host bridge routes, model aliases, downstream OpenAI-compatible provider guidance, catalog ownership, Codex Subscription support, and runtime validators |
| `/.recursive/DECISIONS.md` | prior decisions for catalog foundation, alias pools, downstream contract guidance, Kimi K2.7 catalog, Codex Subscription, hosted-tool boundaries, and runtime testing |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | durable ownership and validation rules for runtime routing, provider capability metadata, alias-matrix behavior, Codex Subscription lifecycle, and downstream consumer visibility |
| run `25-router-runtime-model-alias-pool` | original alias-pool behavior and exact-model versus alias request semantics |
| run `37-downstream-openai-tool-turn-ingress` | downstream OpenAI-compatible tool-turn ingress and consumer contract context |
| run `39-runtime-session-rehydration-model-inventory` | inventory-first alias pool resolution and alias drift diagnostics |
| run `40-catalog-economics-moonshot-consolidation` | catalog canonicalization, economics, and Moonshot alias mapping precedent |
| run `44-kimi-k2.7-code-catalog` | Kimi K2.7 catalog metadata and Moonshot/Kimi model alias precedent |
| run `50-openai-codex-subscription` | OpenAI Codex Subscription curated GPT model matrix, transport-aware tool semantics, hosted search boundaries, and alias-matrix repairs |
| run `51-runtime-testing-architecture-and-regression-matrix` | validation tiers and expected runtime-host, runtime-ui, rebuilt-runtime, and packaged-runtime verification discipline |
| live runtime inspection on `http://127.0.0.1:3456` | showed `/v1/models` exposes only model IDs and endpoint IDs, `/api/role-model/models` reports `chatgpt/gpt-5.4` as `0 / 0`, and `hybrid.hybrid` expands to GPT, DeepSeek flash/pro, and Kimi K2.7 |
| user guidance on 2026-06-22 | fixed product direction for downstream alias capability discovery, modality-aware routing, reasoning/tool metadata, and advisory caching |

## Problem Summary

Pi is configured against role-model as an OpenAI-compatible provider using the `hybrid.hybrid` alias. Because role-model does not currently expose complete alias capability metadata, Pi hard-codes fallback values in `D:/pi/agent/models.json`:

```json
{
  "contextWindow": 128000,
  "maxTokens": 16384
}
```

Those values are too low for the actual alias pool. The current runtime alias resolves to:

| Model ID | Known context window | Known max output tokens |
| --- | ---: | ---: |
| `chatgpt/gpt-5.4` | `1050000` | `128000` |
| `deepseek/deepseek-v4-flash` | `1000000` | `384000` |
| `deepseek/deepseek-v4-pro` | `1000000` | `384000` |
| `moonshot/kimi-k2.7-code` | `262144` | `262144` |

The conservative alias aggregate for this pool is therefore:

```json
{
  "safeContextWindow": 262144,
  "safeMaxOutputTokens": 128000
}
```

The runtime also has a catalog mismatch: `chatgpt/gpt-5.4` is the runtime model ID for Codex Subscription, while metadata is available as `openai/gpt-5.4` and in LiteLLM as `chatgpt/gpt-5.4`. Role-model currently fails to resolve that metadata and emits `0 / 0` for `chatgpt/gpt-5.4` in `/api/role-model/models`.

The deeper issue is not only limits. An alias can contain models with different modalities, tool behavior, reasoning controls, structured-output support, and cache behavior. For `hybrid.hybrid`, text is guaranteed, image is conditional, and video is narrower still. A downstream consumer must be able to discover that the alias can accept image input, but role-model must guarantee that image requests never route to text-only DeepSeek targets. The same principle applies to tool requests, explicit reasoning controls, strict schema output, and future capability-sensitive request features.

## Fixed Decisions

1. Role-model is the source of truth for downstream alias metadata. Pi and other consumers should discover alias limits and capabilities instead of hard-coding them.
2. `/api/role-model/downstream/openai` is the canonical rich downstream discovery surface for OpenAI-compatible consumers. `/v1/models` may remain minimal for compatibility, but compatible extension fields are allowed when they do not break clients.
3. Exact-model metadata and alias metadata must use the same underlying model metadata resolver so `chatgpt/gpt-5.4` cannot drift from its canonical GPT metadata.
4. Alias discovery must expose both aggregate semantics and per-target detail. Consumers need the safe minimums and guaranteed capabilities, while debuggers and advanced clients need target-level truth.
5. Alias aggregate semantics are explicit:
   - `safeContextWindow` and `safeMaxOutputTokens` are the minimum known values across all eligible targets in the alias pool.
   - `maxContextWindow` and `maxOutputTokens` are the maximum known values across all targets.
   - `guaranteed` capabilities and modalities are intersections across all targets.
   - `available` capabilities and modalities are unions across all targets.
   - `conditional` entries identify the subset of target models or endpoints that can satisfy a capability or modality that is not guaranteed.
6. Caching is discoverable but advisory by default. It informs cost, latency, telemetry, and routing preferences, but it is not a hard eligibility filter unless a future request or policy explicitly requires cache support.
7. Request-time routing must infer hard requirements from request payloads before scoring candidates. A model that cannot satisfy required modalities or required capabilities is ineligible, regardless of score.
8. Role-model must not become a generic hosted browser or universal tool executor as part of this run. Tool and hosted-search boundaries from run `50` remain authoritative.
9. Rich downstream discovery is a versioned role-model contract, not a one-off JSON blob. The contract must be additive, typed or schema-backed, and extensible for future modalities, controls, endpoint traits, and provider-specific capability families.
10. Capability metadata must be vocabulary-driven. New capabilities should be added through a documented taxonomy/registry and tests, not by scattering one-off booleans through route handlers.
11. Model metadata resolution must preserve source attribution, confidence, and precedence. Consumers and operators should be able to tell whether a value came from the repo catalog, LiteLLM metadata, runtime-specific provider matrices, observed runtime state, operator overrides, or a fallback.
12. Downstream consumers should be able to make conservative decisions from stable aggregate fields while advanced consumers can inspect per-target details without reverse-engineering runtime internals.
13. Discovery must distinguish declared model capabilities from current runtime routability. A model can support a capability in principle while its configured endpoint is disabled, unauthenticated, unhealthy, policy-excluded, or otherwise not eligible in the running runtime.
14. Downstream discovery must be sanitized for consumer use. Operator diagnostics may expose deeper local state, but downstream discovery must not leak secrets, credential references, local file paths, or unnecessary account internals.
15. Rich discovery must be fixture-backed and contract-tested. Golden examples for exact models, mixed aliases, unknown metadata, no-eligible-target failures, and Pi-style mapping are part of the contract, not incidental test data.
16. Discovery freshness and request-capability failure semantics must be explicit. Downstream consumers need to know when cached metadata may be stale, and capability-constrained failures need stable machine-readable errors.
17. The contract applies to every configured alias intended for downstream use, not only to the `hybrid.hybrid` worked example.

## Requirements

### `R1` Resolve GPT/Codex Subscription metadata correctly

Description:
Runtime model IDs in the `chatgpt/gpt-5.*` Codex Subscription matrix must resolve to complete GPT metadata while preserving the public runtime model IDs.

Acceptance criteria:
- `chatgpt/gpt-5.4` resolves to context window `1050000` and max output tokens `128000` in role-model metadata surfaces
- the metadata resolver records or exposes the canonical metadata identity used for `chatgpt/gpt-5.4`, such as `openai/gpt-5.4` or an equivalent explicit canonical ID
- the fix applies to the curated Codex Subscription GPT family from the runtime matrix, not only to one hard-coded `gpt-5.4` special case
- known GPT/Codex Subscription models do not appear as `contextWindow: 0` or `maxOutputTokens: 0` in `/api/role-model/models` or rich downstream discovery
- operator-facing provider inventory still collapses raw `chatgpt/*` under the OpenAI provider surface and does not reintroduce a duplicate `chatgpt` provider row

### `R2` Centralize model metadata resolution for exact models and aliases

Description:
The runtime must use one model metadata resolution path for exact model records, alias aggregate records, endpoint registry enrichment, and downstream provider discovery.

Acceptance criteria:
- exact model discovery, alias discovery, and runtime model records draw from a shared resolver or shared normalized metadata structure
- model metadata includes model ID, canonical metadata ID when applicable, provider ID, display name, context window, max output tokens, input modalities, output modalities, capabilities, reasoning support, tool support, structured-output support, and advisory caching support
- metadata resolution can combine repo-owned normalized catalog records, LiteLLM price/limit metadata, and runtime-specific provider matrix data without losing source attribution
- metadata records indicate unknown or incomplete fields explicitly instead of converting them silently to zero where zero is not a real model limit
- metadata records include source attribution for each major metadata group, at minimum limits, modalities, tools, reasoning, structured output, and caching
- the resolver defines precedence among repo-owned catalog metadata, LiteLLM metadata, runtime-specific provider matrices, operator overrides, observed runtime state, and fallback/default values
- the resolver preserves enough provenance for diagnostics and documentation to explain why one source won over another
- tests cover both catalog-native IDs such as `moonshot/kimi-k2.7-code` and runtime-specific aliases such as `chatgpt/gpt-5.4`

### `R3` Expose rich downstream discovery for aliases and exact models

Description:
Downstream consumers must be able to discover model and alias metadata from role-model without reading internal runtime config or hard-coding local defaults.

Acceptance criteria:
- `GET /api/role-model/downstream/openai` includes rich metadata for each exact model and each alias model intended for downstream use
- each alias record includes `type: "alias"` or an equivalent discriminator, `routingMode`, `resolvedModelIds`, endpoint IDs, aggregate limits, aggregate modalities, aggregate capabilities, and per-target model summaries
- each exact model record includes `type: "model"` or an equivalent discriminator plus exact model metadata using the same field vocabulary as alias target summaries
- the discovery response includes a contract version or schema version so downstream consumers can detect and branch on rich alias metadata support
- the discovery contract is documented as additive by default: future fields may be added without breaking consumers, while renamed or removed fields require an explicit deprecation path
- the downstream contract is backward compatible with existing OpenAI-compatible provider setup information: base URL, auth placeholder, chat-completions endpoint, responses endpoint, and model IDs remain available
- `/v1/models` remains OpenAI-compatible; if extension fields are added there, clients that ignore unknown fields continue to work
- Pi can derive `contextWindow` and `maxTokens` for `hybrid.hybrid` from discovery without hard-coded fallback values

### `R3.1` Define an extensible alias capability taxonomy and contract schema

Description:
The rich alias discovery work must leave behind a reusable contract and capability taxonomy that future model families and downstream consumers can extend without redesigning the discovery surface.

Acceptance criteria:
- the run defines a canonical vocabulary for model and alias traits, including limits, input modalities, output modalities, tool capabilities, hosted tools, structured output, reasoning, caching, endpoint lifecycle/readiness, transport caveats, and unknown metadata
- the vocabulary distinguishes hard eligibility requirements from advisory metadata and preference signals
- the vocabulary supports provider-specific extensions without polluting generic fields, for example through namespaced fields, extension bags, or a documented provider-specific section
- the rich discovery response has a schema, TypeScript type, or equivalent contract artifact that can be tested independently from route handlers
- adding a future capability such as audio input, embeddings, reranking, image generation, computer use, MCP tools, prompt caching variants, or provider-specific thinking controls should require a registry/schema/test update rather than a bespoke alias-discovery rewrite
- compatibility rules document which fields are stable, which fields are advisory, which fields are experimental, and how downstream consumers should handle unknown fields
- the contract includes golden fixtures or example payloads for at least one exact model, one mixed alias, one alias with unknown target metadata, one no-eligible-target case, and one Pi-style downstream mapping case

### `R3.2` Separate declared capabilities from currently routable capabilities

Description:
Discovery must tell downstream consumers both what the configured target models can support in principle and what the current runtime can actually route to now.

Acceptance criteria:
- exact model and alias discovery distinguish declared model capability from current endpoint availability, readiness, and policy eligibility, either through separate fields or a documented layered model
- alias aggregate fields document whether they are computed from all configured targets, currently routable targets, or another explicitly named target set
- disabled, unhealthy, credential-missing, entitlement-missing, inactive, or policy-excluded endpoints do not inflate currently routable guaranteed capabilities
- configured but non-routable targets can remain visible as configured targets when safe, with stable readiness categories and without exposing secret-bearing diagnostics
- downstream discovery gives consumers enough information to avoid advertising capabilities that are not currently routable, while operator diagnostics can expose deeper local troubleshooting detail
- tests cover at least one configured-but-not-routable target and prove the discovery response does not overclaim currently routable capability

### `R3.3` Keep downstream discovery sanitized, fresh, and cache-aware

Description:
The rich discovery endpoint must be safe for downstream consumers to read and cache without exposing local secrets or silently using stale metadata.

Acceptance criteria:
- discovery includes freshness or revision metadata such as generated time, schema/contract version, runtime inventory revision or config hash, catalog version, metadata source version, or documented equivalents
- runtime config changes, alias changes, endpoint readiness changes, or metadata source changes invalidate or advance the discovery freshness marker
- consumers can detect stale or suspect metadata instead of silently using fallback defaults
- the downstream discovery response does not expose API keys, bearer tokens, raw credential references, local filesystem paths, private auth-cache locations, or unnecessary account internals
- any endpoint IDs, account IDs, provider IDs, or diagnostic reasons exposed to downstream consumers are documented as safe, stable, non-secret identifiers or are sanitized equivalents
- richer operator-only diagnostics remain available through operator/runtime inspection surfaces where needed, but the downstream contract stays consumer-safe
- tests or contract fixtures prove the response includes freshness metadata and does not include known secret-bearing fields

### `R4` Define alias aggregate limits and unknown-target semantics

Description:
Alias records must communicate safe and maximum limits truthfully, including when one or more targets has incomplete metadata.

Acceptance criteria:
- alias metadata includes `safeContextWindow`, `maxContextWindow`, `safeMaxOutputTokens`, and `maxOutputTokens` or documented equivalent fields
- for the current `hybrid.hybrid` runtime pool, discovery reports `safeContextWindow: 262144` and `safeMaxOutputTokens: 128000`
- `safe*` fields are computed only from known positive limits and are weakened or accompanied by `unknownTargets` when one or more alias targets lacks reliable limit metadata
- `unknownTargets` identifies the model IDs or endpoint IDs whose metadata is incomplete and explains which metadata categories are missing
- an alias with unknown target metadata does not overclaim guaranteed limits or guaranteed capabilities

### `R5` Expose input and output modality support with guaranteed, available, and conditional semantics

Description:
Alias discovery must make multimodal support inspectable and must distinguish universal support from conditional support.

Acceptance criteria:
- exact model metadata separates input modalities from output modalities
- alias metadata includes `guaranteedInput`, `availableInput`, `guaranteedOutput`, and `availableOutput` or documented equivalent fields
- for the current `hybrid.hybrid` pool, discovery reports text as guaranteed input, image as available but conditional input, and video as available only for the subset that supports it
- conditional modality metadata identifies which target models or endpoints can satisfy `input.image` and `input.video`
- discovery does not list image or video under `guaranteedInput` unless every target behind the alias supports that modality
- per-target metadata makes it clear that Kimi supports image and video input, GPT supports image input, and DeepSeek targets are text-only unless future verified metadata proves otherwise

### `R6` Enforce modality-aware routing before scoring

Description:
Role-model must infer required input modalities from incoming OpenAI-compatible requests and filter out incapable alias targets before routing scores are computed.

Acceptance criteria:
- Chat Completions ingress detects text-only messages, image content parts, and image URL parts and converts them into required input modalities
- Responses ingress detects text input and image input parts and converts them into required input modalities
- if video input is accepted by the ingress contract in this runtime, video input is detected and converted into a required input modality; if not accepted, the runtime returns a clear unsupported-input error before routing
- image requests sent to `hybrid.hybrid` are eligible only for image-capable targets such as GPT and Kimi, never text-only DeepSeek targets
- video requests sent to `hybrid.hybrid` are eligible only for video-capable targets such as Kimi
- routing diagnostics record the inferred required modalities and excluded endpoint/model reasons
- if no target behind the requested alias supports the required modalities, the runtime returns a clear no-eligible-target error instead of forwarding the request to an incompatible model

### `R6.1` Centralize request capability inference and stable failure errors

Description:
Chat Completions, Responses, and future compatible ingress paths must infer capability requirements consistently and return predictable errors when no capable target exists.

Acceptance criteria:
- request capability inference is implemented through a shared helper, shared normalized request model, or contract-tested equivalent logic rather than duplicated route-local parsing
- Chat Completions and Responses map the same logical payload features to the same normalized requirement tokens for input modalities, output modalities, tools, structured output, hosted tools, reasoning controls, and cache requirements when applicable
- exact-model and alias routing use the same inferred hard requirements before candidate scoring
- unsupported input or no-eligible-target responses use a stable machine-readable error shape with a code, requested model or alias, inferred hard requirements, and sanitized eligibility or exclusion reasons
- error responses distinguish unsupported ingress payloads, unsupported capability requests, no configured targets, no currently routable targets, and unknown metadata that prevents safe routing
- tests cover equivalent inference across Chat Completions and Responses for image input and at least one non-modality capability such as tools, structured output, or reasoning controls
- tests cover the stable error shape for at least one no-eligible-target alias request

### `R7` Expose and enforce tool, structured-output, and hosted-tool capabilities

Description:
Downstream consumers need to know whether an alias can satisfy tool and structured-output requests, and role-model must enforce hard tool requirements at routing time.

Acceptance criteria:
- exact model metadata exposes function-calling support, structured-output support, and hosted-tool support with provider/transport-specific caveats where applicable
- alias metadata includes guaranteed, available, and conditional tool/structured-output capability summaries
- a request containing function tools requires `tools.function_calling` before scoring candidates
- a request containing strict JSON schema or equivalent structured-output controls requires `structured.output` unless role-model has a documented provider-specific translation that preserves the contract
- hosted-tool support remains transport-aware: OpenAI Codex Subscription hosted search, Kimi hosted search, and DeepSeek DSML/tool-call behavior follow the boundaries established in run `50`
- routing diagnostics distinguish provider-native tool support, runtime-fallback behavior, and consumer-visible normalized tool calls where those differ
- tool-capable alias requests do not exclude Kimi or DeepSeek merely because their tool transport differs, but they also do not overclaim hosted-tool equivalence where it is not implemented

### `R8` Expose reasoning and thinking support without overclaiming control compatibility

Description:
Downstream consumers need to discover whether models can reason and whether explicit reasoning controls can be passed through or translated.

Acceptance criteria:
- exact model metadata exposes high-level reasoning support separately from control support
- reasoning controls distinguish OpenAI-style effort controls, token-budget thinking controls, provider-specific reasoning fields, and unsupported controls
- alias metadata includes guaranteed, available, and conditional reasoning support
- alias metadata includes separate summaries for `reasoning.supported`, `reasoning.effortControl`, `reasoning.budgetTokensControl`, and any other implemented reasoning-control families
- if a request includes an explicit reasoning control that role-model cannot pass through or translate safely for a target, that target is ineligible for the request
- plain reasoning preference may influence routing preference, but it is not treated as a hard rejection unless the request or policy explicitly requires reasoning support
- provider-openai `reasoning_content` and related runtime observations remain compatible with the metadata contract and do not get mistaken for a universal reasoning-control API

### `R9` Expose caching posture as advisory metadata

Description:
Caching behavior should be discoverable for cost, latency, and observability, but should not block request eligibility by default.

Acceptance criteria:
- exact model metadata exposes prompt-read support, prompt-write support, cache usage breakdown support, and cache telemetry availability where known
- alias metadata exposes guaranteed and available caching support, marked advisory by default
- caching metadata can be used by downstream consumers for display and by routing policy for preference when policy explicitly asks for cache-aware behavior
- lack of caching support does not make a target ineligible for ordinary chat, multimodal, reasoning, or tool requests
- runtime telemetry and request diagnostics remain the source of truth for actual cache hits and reported cache usage after execution

### `R10` Preserve compatibility while giving Pi a stable discovery path

Description:
Pi and similar downstream consumers must have a stable, documented way to configure role-model aliases from discovery.

Acceptance criteria:
- `GET /api/role-model/downstream/openai` documents or returns enough information for Pi to configure provider base URL, auth placeholder, model IDs, context window, max tokens, input modalities, and feature flags
- every configured alias intended for downstream use receives a discovery record with the same contract vocabulary as `hybrid.hybrid`, even when the alias has simpler exact-model or single-provider semantics
- for `hybrid.hybrid`, Pi can use `limits.safeContextWindow` as `contextWindow` and `limits.safeMaxOutputTokens` as `maxTokens`
- Pi can advertise image input for `hybrid.hybrid` when `availableInput` includes image, while understanding that role-model will route image requests only to capable targets
- Pi does not need to choose GPT versus Kimi versus DeepSeek itself for alias requests; role-model remains responsible for final candidate filtering and selection
- the discovery shape is versioned or otherwise includes a contract marker so downstream clients can detect whether rich alias metadata is available
- if rich discovery is unavailable or incomplete, downstream consumers can detect the gap instead of silently falling back to misleading defaults
- verification must inspect the Pi configuration that points at role-model and identify the configured provider, base URL, alias model ID, and any locally cached or hard-coded model limits
- the run must drive Pi, or an equivalent Pi command/API path available in the local installation, to discover information about the role-model endpoint after the updated role-model runtime is running
- Pi-driven verification must prove that Pi can obtain or consume the rich role-model alias metadata for `hybrid.hybrid` without relying on stale hard-coded `128000 / 16384` defaults
- evidence must show the discovered or applied Pi-side values for `contextWindow`, `maxTokens`, input modalities, and feature flags or capabilities
- if Pi itself does not yet have built-in discovery support, the run must document the exact gap and provide deterministic bridge verification: query role-model rich discovery, map it to Pi model config fields, and record the Pi change required or follow-up needed
- the run must not claim downstream verification is complete from role-model-only HTTP evidence; Pi-side behavior or the explicit Pi integration gap must be inspected and recorded

### `R11` Make alias capability filtering inspectable in runtime diagnostics

Description:
When an alias request is filtered by modality or capability requirements, the runtime must expose enough diagnostics for operators and downstream debugging.

Acceptance criteria:
- routing diagnostics include the requested alias, resolved model IDs, inferred request modalities, inferred request capabilities, eligible targets, and excluded targets
- exclusion reasons distinguish missing input modality, missing tool support, missing structured-output support, unsupported reasoning control, missing output modality, and unknown metadata where applicable
- request detail and router decision surfaces can display the new eligibility reasons without relying on raw JSON only
- existing alias resolution diagnostics remain backward compatible and are not replaced by less precise capability summaries
- validation proves a text-only alias request, an image alias request, a tool alias request, and a no-eligible-target request each produce truthful diagnostics

### `R12` Add comprehensive automated and runtime verification

Description:
The run must be protected by automated tests and runtime verification that prove metadata discovery and request-time enforcement work together.

Acceptance criteria:
- strict TDD is used for code-bearing changes in this run, with concrete RED and GREEN evidence captured in Phase 3
- Phase 2 must plan strict TDD sub-phases before implementation begins
- Phase 3 must record `TDD Mode: strict` unless a specific code slice is proven non-code-bearing or a documented pragmatic exception is approved in the artifact
- Phase 3 must include RED evidence paths for failing tests that prove the current behavior is wrong before production code changes are made
- Phase 3 must include GREEN evidence paths for the same tests passing after implementation
- Phase 4 must independently verify that the RED/GREEN evidence covers GPT metadata, alias discovery, modality filtering, tool/structured-output filtering, reasoning-control filtering, Pi discovery behavior, and downstream documentation where code changes are involved
- the run is not complete if tests are added only after implementation or if TDD evidence is summarized without concrete command output or evidence-file references
- tests prove `chatgpt/gpt-5.4` metadata resolves to `1050000 / 128000`
- tests prove `hybrid.hybrid` discovery reports `safeContextWindow: 262144`, `safeMaxOutputTokens: 128000`, text as guaranteed input, and image/video as conditional available inputs for the current fixture pool
- tests prove image requests through `hybrid.hybrid` never route to DeepSeek targets
- tests prove video requests through `hybrid.hybrid` route only to a video-capable target or return a clear unsupported-input/no-eligible-target error if the ingress contract does not support video
- tests prove tool requests require `tools.function_calling` and structured-output requests require `structured.output`
- tests prove explicit unsupported reasoning controls exclude incompatible targets instead of being silently ignored
- tests prove unknown metadata is surfaced through `unknownTargets` and weakens aggregate guarantees
- contract or golden-fixture tests prove the discovery shape for an exact GPT model, the `hybrid.hybrid` mixed alias, an alias with unknown target metadata, a configured-but-not-routable target, a no-eligible-target error, and a Pi-style downstream mapping
- tests prove all downstream-visible aliases receive discovery records using the rich alias contract, not only `hybrid.hybrid`
- tests prove declared capabilities and currently routable capabilities do not collapse into one overclaiming field
- tests prove discovery freshness or revision metadata changes when the relevant alias, endpoint readiness, runtime inventory, or metadata source changes
- tests prove downstream discovery omits secret-bearing and local-only fields
- tests prove Chat Completions and Responses use consistent request-capability inference for shared payload features
- validation includes focused runtime-host tests plus the relevant repo-owned validator floor from `/docs/operations/04-runtime-testing-matrix.md`
- after implementation, the updated role-model runtime must be started from the changed worktree or rebuilt package, not only inspected through unit tests or an older already-running process
- verification must query the updated runtime discovery endpoints, including at minimum `GET /api/role-model/downstream/openai` and the relevant model metadata surface, and capture response evidence
- verification must prove `chatgpt/gpt-5.4` reports the corrected metadata values and no longer appears as `0 / 0`
- verification must prove `hybrid.hybrid` reports the rich alias contract, including safe limits, resolved model IDs, modality summaries, tool/structured-output summaries, reasoning summaries, caching advisory metadata, source/provenance metadata, contract versioning, and unknown-target semantics
- verification must send at least one text-only alias request and one capability-constrained alias request, such as image or tool input, and inspect routing diagnostics to prove capability filtering is applied before scoring
- if the current runtime process on the default port is stale or belongs to a previous build, the run must either restart it with the updated build or use an alternate documented port and record that distinction in evidence
- runtime verification is mandatory unless an environmental blocker is explicitly documented in Phase 4 or Phase 5 and accepted by the user before closeout

### `R13` Update durable architecture and consumer documentation

Description:
The repository must document the new downstream alias capability contract and its routing semantics.

Acceptance criteria:
- the run creates or updates a durable documentation page specifically about aliases and endpoint capability resolution by downstream consumers
- `/docs/architecture/09-runtime-routing-strategy-interactions.md` or a clearly linked architecture document explains rich alias discovery, exact model metadata, aggregate semantics, conditional modalities, reasoning/tool/caching metadata, and request-time capability filtering
- downstream setup documentation or Connect guidance explains that `/api/role-model/downstream/openai` is the canonical rich discovery route for clients that need alias capabilities
- documentation states that `/v1/models` is compatibility-oriented and may not be sufficient for rich clients unless extension fields are present
- documentation includes the intended downstream mapping for Pi-style clients: `contextWindow = safeContextWindow`, `maxTokens = safeMaxOutputTokens`, and `availableInput` controls UI affordances while role-model enforces final routing
- documentation preserves the run `50` hosted-tool and Codex Subscription boundaries and does not describe role-model as a generic hosted-tool/browser executor
- documentation explains the difference between exact models, alias models, endpoint IDs, resolved model IDs, and concrete routed endpoints
- documentation defines safe aggregate limits, maximum limits, unknown targets, guaranteed capabilities, available capabilities, and conditional capabilities
- documentation explains input/output modality handling, including why text can be guaranteed while image or video may be available but conditional for mixed aliases
- documentation explains reasoning/thinking controls, tool/function-calling capabilities, structured output support, hosted-tool boundaries, source/provenance metadata, contract versioning, extension rules, and advisory cache metadata
- documentation explains declared capability versus currently routable capability, endpoint readiness categories, metadata freshness/revision semantics, downstream sanitization boundaries, and stable capability failure errors
- documentation includes at least one worked example for `hybrid.hybrid` or a representative mixed alias showing GPT, DeepSeek, and Kimi-style target differences

## Out of Scope

- `OOS1`: changing Pi itself in this repository; Pi integration may be validated externally, but role-model changes are the deliverable here
- `OOS2`: turning `/v1/models` into a non-compatible endpoint that breaks OpenAI-compatible clients
- `OOS3`: adding a new generic hosted browser/tool runtime for providers that do not natively support hosted tools
- `OOS4`: adding new live provider credentials or requiring credential-bearing live provider tests in the default CI floor
- `OOS5`: redesigning the routing strategy matrix or replacing `baseline`, `difficulty`, `controller`, and `hybrid` semantics
- `OOS6`: changing benchmark scoring or benchmark case content except where existing validation is extended to cover metadata and capability routing
- `OOS7`: claiming cache support as a hard requirement for ordinary requests unless an explicit future policy contract requires it
- `OOS8`: broad runtime UI redesign beyond the operator/readback changes needed to make capability filtering inspectable
- `OOS9`: implementing Pi itself inside this repository; Pi integration may be inspected and driven externally, but role-model remains the product change
- `OOS10`: turning Pi into a first-class test fixture if no stable local Pi automation surface exists

## Constraints

- role-model, not downstream consumers, owns alias target filtering and final route selection
- metadata must not overclaim support; unknown values must remain inspectable
- exact-model behavior must remain additive and backward compatible
- the OpenAI-compatible public surface must remain usable by clients that ignore role-model extension fields
- all code-bearing changes must follow TDD unless a documented pragmatic exception is justified in Phase 3
- default automated verification must remain deterministic and offline-safe
- provider-specific capability claims must be grounded in the current runtime transport, not only upstream marketing or unrelated API surfaces
- durable docs and memory updates must stay aligned with the runtime-routing-and-provider-capabilities memory shard
- future capability additions must use the new taxonomy/schema/registry path rather than one-off route-local fields
- updated-runtime verification must not accidentally query a stale runtime process and call that proof complete
- Pi verification must distinguish role-model discovery success from Pi-side discovery or consumption success
- downstream discovery must not leak secrets, raw credential references, local filesystem paths, or private auth-cache locations
- declared model capability, configured target membership, and currently routable endpoint capability must remain distinguishable in the contract and diagnostics
- request capability inference should be shared or contract-tested across ingress paths so Chat Completions and Responses cannot drift silently

## Assumptions

- the current runtime alias pool for `hybrid.hybrid` remains GPT/Codex Subscription, DeepSeek V4 flash, DeepSeek V4 pro, and Kimi K2.7 during this run's fixture-based verification
- LiteLLM metadata and repo-owned normalized catalog metadata are sufficient sources for the GPT/Kimi/DeepSeek limit values identified in the source inventory
- downstream consumers such as Pi can consume nonstandard extension fields from a role-model-specific discovery endpoint even if they keep using OpenAI-compatible chat-completions for inference
- role-model already has enough request parsing structure in chat-completions and responses ingress to infer image/tool/structured-output/reasoning requirements without replacing the whole adapter layer
- video input support may require an explicit unsupported-input branch if the current OpenAI-compatible ingress cannot represent video payloads safely
- the local machine has a Pi installation or configuration under `D:/pi/agent` that can be inspected or driven during verification
- if Pi cannot perform automatic discovery yet, the run can still satisfy downstream verification by documenting the Pi-side gap and proving the role-model-to-Pi mapping deterministically
- the updated runtime can be started on a non-conflicting local port if `:3456` is occupied by an older packaged runtime

## Coverage Gate

Coverage: PASS

- `R1` and `R2` cover GPT/Codex Subscription metadata correctness and shared model metadata resolution
- `R3`, `R3.1`, and `R4` cover rich downstream discovery, extensible contract/taxonomy design, and truthful alias aggregate limit semantics
- `R3.2` and `R3.3` cover declared-versus-routable capability layers, downstream sanitization, freshness metadata, and cache-safe discovery semantics
- `R5` and `R6` cover multimodal discovery and modality-aware request-time routing enforcement
- `R6.1` covers centralized request capability inference and stable machine-readable capability failure errors
- `R7` covers tool, hosted-tool, and structured-output discovery plus hard routing requirements
- `R8` covers reasoning/thinking support and control-level compatibility
- `R9` covers advisory cache discovery without making cache support a default eligibility filter
- `R10` covers Pi and other downstream consumers discovering stable alias settings without hard-coded defaults
- `R11` covers operator and downstream debugging through inspectable routing diagnostics
- `R12` covers strict evidence-bearing TDD, automated regression tests, updated running-runtime verification, and Pi-configured downstream verification
- `R13` covers durable architecture and downstream consumer documentation for alias and endpoint capability resolution
- out-of-scope items and constraints keep the run focused on role-model metadata/discovery/routing truth rather than unrelated UI, benchmark, provider, or Pi implementation work

## Approval Gate

Approval: FAIL

- the artifact is repo-specific and grounded in current runtime behavior, prior alias/catalog/Codex Subscription runs, and the runtime-routing provider-capability memory shard
- the requirement is now more systematic and future-proof: it requires a versioned contract, extensible capability taxonomy, shared resolver, declared-versus-routable capability layers, sanitized downstream discovery, freshness metadata, source attribution, golden fixtures, additive compatibility rules, strict TDD, live updated-runtime verification, Pi-side verification, and downstream-facing documentation
- the user's requested capabilities are represented: limits, modalities including image/video, reasoning/thinking, tools, structured output, caching posture, downstream discoverability, and Pi verification
- request-time enforcement is included, so discovery cannot claim image/tool/reasoning support without routing only to capable targets
- the run preserves backward compatibility and existing runtime ownership boundaries while giving Pi a clear rich discovery path
- approval remains `FAIL` only because explicit user approval to lock this Phase 00 requirement is still pending
