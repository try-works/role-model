# LiteLLM, Pi, and Role Model Integration Proposal

This document proposes how `role-model` should integrate with LiteLLM and what it
should still own itself.

The proposal is grounded in:

- `role-model` source in this repository
- the Pi reference implementation checked out under `.tmp/pi-ref/`
- LiteLLM official docs and LiteLLM upstream source on GitHub

The main conclusion is:

- LiteLLM should own broad provider translation, proxying, router retries/fallbacks,
  and provider-specific prompt/tool/reasoning normalization where it already does that
  well.
- `role-model` must still own the higher-level execution contract for routed agent
  requests: reasoning intent, session/cache affinity, tool continuation state,
  provider-sensitive replay state, and explicit routing policy.
- Codex subscription execution must remain a dedicated runtime path rather than being
  collapsed into the generic LiteLLM flow.

Implemented follow-on:

- `docs/architecture/14-routed-execution-semantics-and-receipts.md`

## Evidence Base

### Role Model code reviewed

- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-litellm/src/index.ts`
- `role-model-router/packages/vendor-litellm/src/index.ts`
- `role-model-router/packages/catalog/src/litellm-catalog.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`
- `role-model-router/packages/vendor-litellm/test/index.test.ts`
- `role-model-router/packages/provider-litellm/test/index.test.ts`
- `role-model-router/packages/adapter-execution/test/index.test.ts`

### Pi code reviewed

- `.tmp/pi-ref/packages/ai/README.md`
- `.tmp/pi-ref/packages/ai/src/models.ts`
- `.tmp/pi-ref/packages/ai/src/types.ts`
- `.tmp/pi-ref/packages/ai/src/auth/resolve.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-responses.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-responses-shared.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-completions.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-codex-responses.ts`
- `.tmp/pi-ref/packages/ai/src/api/anthropic-messages.ts`
- `.tmp/pi-ref/packages/ai/src/api/google-shared.ts`
- `.tmp/pi-ref/packages/ai/src/api/google-generative-ai.ts`
- `.tmp/pi-ref/packages/ai/src/api/google-vertex.ts`
- `.tmp/pi-ref/packages/ai/src/api/mistral-conversations.ts`
- `.tmp/pi-ref/packages/ai/src/api/bedrock-converse-stream.ts`
- `.tmp/pi-ref/packages/coding-agent/docs/providers.md`

### LiteLLM sources reviewed

LiteLLM is not vendored as source in this checkout. The local `vendor-litellm` package
installs the proxy dynamically with `uv tool install litellm[proxy]`, so the grounding
for LiteLLM comes from official upstream code and docs:

- upstream source:
  - `litellm/types/utils.py`
  - `litellm/router.py`
  - `litellm/litellm_core_utils/prompt_templates/factory.py`
  - `litellm/proxy/proxy_server.py`
- official docs:
  - <https://docs.litellm.ai/docs/>
  - <https://docs.litellm.ai/docs/completion/reliable_completions>
  - <https://docs.litellm.ai/docs/routing>
  - <https://docs.litellm.ai/docs/completion/prompt_caching>
  - <https://docs.litellm.ai/docs/response_api>
  - <https://docs.litellm.ai/docs/reasoning_content>
  - <https://docs.litellm.ai/docs/providers/openai>
  - <https://docs.litellm.ai/docs/providers/anthropic>
  - <https://docs.litellm.ai/docs/proxy/config_settings>

## Current Role Model Shape

Today the generic routed execution contract in
`role-model-router/packages/adapter-execution/src/index.ts` carries:

- messages
- tools
- tool choice
- structured output
- prompt-cache intent
- temperature
- max output tokens
- streaming

It does not carry:

- reasoning intent
- native thinking controls
- session affinity
- transport preference
- provider replay state
- thinking blocks or encrypted reasoning items
- image/tool-result blocks in a provider-neutral way

This is visible in `RuntimeExecutionRequest`, `RuntimeExecutionMessageContent`, and the
normalized response shape. The contract is intentionally simple, but it is now too thin
for the providers and routing modes the runtime is trying to support.

There is already evidence that richer semantics exist at ingress time and are being
discarded before adapter execution:

- `request-capability-inference.ts` detects `reasoning_effort`, `reasoning`, and
  `thinking` as capability requirements.
- `apps/runtime-host-bridge/src/index.ts` forwards `tool_choice`, `stream`,
  `max_tokens`, and `temperature` into the generic execution request.
- the same runtime host bridge has a dedicated Codex execution path with explicit
  handling for `reasoning`, `tool_choice`, `prompt_cache_key`, `service_tier`,
  WebSocket/SSE transport, and continuation shaping.

In other words, `role-model` already knows these semantics matter. The generic adapter
layer just cannot represent them yet.

## What LiteLLM Already Covers Well

LiteLLM should be treated as a real vendor/execution layer, not as provider identity
itself.

From the reviewed docs and upstream code, LiteLLM already provides:

- a broad provider translation layer behind an OpenAI-style surface
- model/provider capability metadata in `litellm/types/utils.py`
- retries and fallbacks
- routing groups, ordering, and weighted failover
- prompt caching support and normalized usage reporting
- `/responses` support and WebSocket support
- reasoning normalization:
  - `reasoning_content`
  - Anthropic `thinking_blocks`
- provider-specific parameter translation such as:
  - OpenAI chat to Responses bridging
  - Anthropic `reasoning_effort` to thinking/effort mapping

This means `role-model` should not try to reimplement all provider-specific translation
itself for API-key-backed remote providers. It does not mean LiteLLM becomes the
provider for telemetry or routing identity. The actual provider remains the routed
provider such as `openai` or `deepseek`, while LiteLLM should surface separately as
`vendorId: "litellm"` when it is the executing intermediary.

## What Pi Shows We Still Need Above LiteLLM

Pi has a richer internal runtime contract than `role-model` currently does.

Key Pi design points:

- provider-native adapters instead of one generic OpenAI-compatible assumption
- a unified but rich request surface:
  - `reasoning`
  - `thinkingBudgets`
  - `cacheRetention`
  - `sessionId`
  - `transport`
  - provider-scoped env
- a richer content model:
  - `text`
  - `thinking`
  - `image`
  - `toolCall`
- careful replay logic for:
  - encrypted reasoning items
  - Anthropic thinking signatures
  - tool-call ids across providers
  - cross-provider degradation when exact replay is unsafe
- dedicated Codex subscription transport logic instead of treating Codex as plain OpenAI

Pi's `openai-responses-shared.ts` and `openai-codex-responses.ts` are the strongest
reference points here. They show that the hard problem is not ordinary request shaping.
The hard problem is preserving enough state across turns so tool use, reasoning
continuity, and fallback behavior remain valid.

## Architectural Conclusion

The right split is:

### LiteLLM should own

- provider API translation for ordinary remote providers
- proxying to API-key-backed and standard OAuth-backed upstreams where LiteLLM already
  supports the flow
- router-level retries and fallback mechanics within LiteLLM-managed model groups
- provider-native prompt-format and structured-output translation
- normalized cache, cost, and reasoning fields when LiteLLM already emits them

### Role Model should own

- request capability inference and explicit routing policy
- alias selection and endpoint eligibility
- the semantic execution contract between downstream clients and adapters
- preservation of reasoning intent and provider replay state across turns
- session/cache affinity keys that survive routing and fallback
- adapter-level routing constraints when a request requires a provider family with
  semantics not preserved by a generic OpenAI-style shape
- end-to-end observability and regression verification across routed requests

### Codex subscription should remain custom

The existing dedicated Codex path in `apps/runtime-host-bridge/src/index.ts` is correct
in principle. Codex subscription execution is transport-sensitive and continuity-
sensitive enough that it should stay outside the generic LiteLLM adapter path.

## Current Gaps

### 1. The generic execution contract is too narrow

`RuntimeExecutionRequest` has no first-class fields for reasoning, session affinity, or
transport, while Pi's request contract does.

Impact:

- reasoning hints detected at ingress cannot flow to adapters
- LiteLLM features that depend on stable request semantics cannot be expressed
- provider continuity becomes accidental instead of explicit

### 2. Message content is too lossy

`RuntimeExecutionMessageContent` is basically text-only. It cannot preserve:

- `thinking_blocks`
- encrypted reasoning items
- structured provider replay items
- multimodal tool results

Impact:

- second-turn failures for providers that require previous-turn reasoning state
- inability to preserve provider-native context during routing handoff
- fragile tool continuation

### 3. The LiteLLM adapter uses an OpenAI-shaped request builder that drops important semantics

`packages/provider-litellm/src/index.ts` reuses `buildOpenAIRequest()` and
`normalizeOpenAIResponse()`.

That is acceptable for the baseline path, but today it means:

- `/responses` requests do not forward `tool_choice`
- no generic reasoning field is forwarded
- prompt caching is treated mostly as observed metadata, not as an execution input

### 4. LiteLLM vendor config generation is too minimal

`renderLiteLLMConfig()` only emits `model_list`.

It does not expose:

- `router_settings`
- retry policy
- affinity-related checks
- timeout controls
- cache configuration
- global `route_all_chat_openai_to_responses`-style settings where relevant

Impact:

- `role-model` is underusing the LiteLLM router it is already launching

### 5. Role Model is not yet exploiting LiteLLM's affinity and prompt-caching controls

`vendor-litellm` only injects `fallbacks` into the request body at execution time.

It does not use:

- model-group retry policy
- prompt-caching pre-call checks
- session affinity
- deployment affinity
- responses deployment checks

Impact:

- fallback behavior is shallower than LiteLLM can support
- cache effectiveness depends too much on luck
- continuity-sensitive routes are more fragile than necessary

### 6. Codex is richer than the generic adapter contract

The Codex runtime path already has richer request semantics than the rest of the system.
That is not the bug. The bug is that the generic routed path cannot represent a similar
level of semantic richness for other providers when needed.

## Proposal

## 1. Expand the generic execution contract

Add first-class fields to `RuntimeExecutionRequest` for:

- `reasoning`:
  - `effort`
  - optional provider-native payload passthrough
- `sessionAffinity`:
  - session key
  - cache key
  - affinity policy
- `transport`:
  - `sse`
  - `websocket`
  - `auto`
- `continuation`:
  - provider-neutral replay envelope for previous-turn reasoning/tool state

Also expand message content from simple text fragments to a richer discriminated shape
that can preserve:

- text
- image
- thinking
- provider-specific opaque replay items when necessary

This should remain provider-neutral at the top level, but must be rich enough that
adapters do not have to reconstruct lost state from plain text.

## 2. Preserve ingress semantics instead of dropping them

`apps/runtime-host-bridge/src/index.ts` already inspects request bodies deeply. Extend
the bridge mapping so reasoning and session/cache intent survive into
`RuntimeExecutionRequest` instead of being used only for capability inference.

At minimum:

- map `reasoning_effort`, `reasoning`, and `thinking`
- map prompt-cache keys and affinity hints
- map transport preferences where present
- preserve assistant-side replay metadata needed for multi-turn tool use

## 3. Split provider execution into three families

The runtime should explicitly model three remote execution families:

1. `litellm-openai-shape`
   - ordinary LiteLLM-backed remote providers using chat or responses
2. `native-specialized`
   - providers that need adapter-native handling beyond LiteLLM's exposed shape
3. `codex-subscription`
   - the existing dedicated Codex transport path

Do not force all remote execution through one adapter surface when request continuity
requirements differ materially.

## 4. Upgrade the LiteLLM adapter to use richer request semantics

Keep `provider-litellm` as a thin wrapper over OpenAI-shaped request/response handling,
but extend it so it can use the new generic request fields:

- forward `tool_choice` on both chat and responses paths
- forward reasoning controls when the target route supports them
- forward prompt-cache/session-affinity hints
- prefer `/responses` when the request requires semantics that chat-completions cannot
  preserve safely

This should use request-shape hints plus request semantics together. Shape hints alone
are not enough.

## 5. Generate richer LiteLLM config

Extend `vendor-litellm` config generation to support:

- `router_settings`
- model-group retry/fallback policy
- request timeout
- `ttft_timeout`
- `stream_idle_timeout`
- prompt-caching and affinity-related optional pre-call checks
- cache configuration where enabled by runtime policy

This should be runtime-config driven, not hardcoded globally.

## 6. Treat prompt caching as an execution concern, not only telemetry

`role-model` already records prompt-cache usage in telemetry.

It should also:

- express cache intent before execution
- attach stable cache/session identifiers when policy wants that
- route continuity-sensitive requests toward endpoints/configurations that preserve
  prompt-caching effectiveness

This is especially important for:

- long agent conversations
- benchmark harnesses
- repeated tool loops
- providers whose prompt caching depends on deployment affinity

## 7. Preserve provider replay state when needed

Add a provider-neutral continuation envelope that adapters can interpret.

Examples:

- Anthropic thinking blocks
- OpenAI encrypted reasoning items
- provider-specific tool-call ids that must survive the next turn

The runtime does not need to understand every provider payload in detail. It does need
to preserve the payload and only degrade it when the next route cannot safely use it.

That is the key Pi lesson that should be copied.

## 8. Keep Codex special and align its semantics with the generic contract

Do not collapse Codex into LiteLLM.

Instead:

- keep the custom Codex transport
- align the generic contract so its fields can represent the same concepts:
  - reasoning
  - tool choice
  - prompt cache key
  - continuation state
  - transport

This reduces special-case glue without pretending the transport is ordinary.

## Concrete Patch Plan

### Patch group A: execution contract

Edit:

- `role-model-router/packages/adapter-execution/src/index.ts`

Add:

- reasoning control fields
- session/cache affinity fields
- transport preference
- richer message content blocks
- continuation envelope

### Patch group B: request ingestion and mapping

Edit:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`

Add:

- mapping of reasoning fields into execution requests
- mapping of prompt-cache/session hints
- preservation of assistant replay metadata

### Patch group C: LiteLLM request shaping

Edit:

- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-litellm/src/index.ts`

Add:

- richer `/responses` request forwarding
- reasoning forwarding
- `tool_choice` forwarding on responses path
- cache/session hint forwarding
- route selection logic that prefers `/responses` when chat-completions would lose
  semantics

### Patch group D: LiteLLM runtime config generation

Edit:

- `role-model-router/packages/vendor-litellm/src/index.ts`

Add:

- richer rendered config
- runtime-configurable router settings
- retry/fallback/timeout/affinity options

### Patch group E: telemetry and storage

Edit:

- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`

Add:

- storage and presentation for reasoning/session/cache/continuation observability
- distinction between cache requested, cache supported, cache used, and affinity applied

### Patch group F: Codex alignment

Edit:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`

Add:

- alignment between Codex request semantics and the expanded generic contract
- shared continuation helpers where possible

## Verification Plan

The verification plan must be stronger than ordinary unit coverage.

### 1. Adapter regression tests

Add and extend tests for:

- chat-completions tool choice forwarding
- responses tool choice forwarding
- reasoning forwarding
- prompt-cache/session key forwarding
- continuation payload preservation
- mixed-provider replay degradation

Primary locations:

- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/packages/provider-litellm/test/index.test.ts`
- `role-model-router/packages/adapter-execution/test/index.test.ts`

### 2. LiteLLM vendor config tests

Extend `vendor-litellm` tests to assert rendered config includes:

- router settings
- retry policy
- timeout knobs
- optional pre-call checks
- affinity settings

Primary location:

- `role-model-router/packages/vendor-litellm/test/index.test.ts`

### 3. Runtime host bridge request translation tests

Add tests for:

- reasoning ingress mapping
- session/cache hint ingress mapping
- preservation of provider continuation metadata
- fallback routing qualification when semantic requirements force provider pinning

Primary location:

- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

### 4. Live proxy smoke tests

Run managed LiteLLM proxy tests that verify:

- fallback request bodies
- streamed reasoning content
- cache metadata extraction
- response path selection

### 5. End-to-end client validation

Create repeatable routed request suites for:

- Pi -> role-model
- Craft -> role-model

Test classes must include:

- plain text
- tool calls
- reasoning + tools
- prompt cache eligible long contexts
- image/file-sensitive requests
- multi-turn tool continuation
- fallback-triggering failures

The suite should include both:

- deterministic mocked runs
- live smoke runs against the launched runtime

## Non-Goals

This proposal does not recommend:

- replacing LiteLLM with Pi
- making `role-model` reimplement every provider adapter Pi has
- routing Codex subscription through LiteLLM just for consistency
- exposing raw provider-private state to downstream clients without a contract

## Recommended Decision

Adopt a layered architecture:

1. LiteLLM as the standard remote provider runtime for broad provider coverage.
2. `role-model` as the semantic routing and continuity layer above LiteLLM.
3. dedicated native execution paths for transports or providers whose semantics are not
   preserved by the generic LiteLLM/OpenAI-compatible path, including Codex
   subscription.

This gives `role-model` the part Pi gets right without giving up the vendor leverage
LiteLLM already provides.
