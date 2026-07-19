# Downstream Alias Capability Discovery

Role Model exposes two OpenAI-compatible discovery surfaces:

- `GET /v1/models` is the compact compatibility list. It answers "which model ids can
  I ask for?" and stays close to OpenAI's model-list shape. It also includes additive
  compact extension fields for downstream auto-discovery:
  - `context_window`
  - `max_tokens`
  - `input` for Pi-compatible `text`/`image` affordances
  - `input_modalities` and `output_modalities`
  - `capabilities`
  - `role_model.discovery_url`
  - `role_model.capability_revision`
- `GET /api/role-model/downstream/openai` is the rich Role Model discovery contract.
  It answers "what can this exact alias or model safely do right now?"

Downstream consumers such as Pi can use `/v1/models` as the first discovery step for
conservative context/output limits, Pi-compatible text/image input affordances, full
modality lists, tool/reasoning/structured-output flags, and a `role_model.discovery_url`
pointer. Consumers must follow the rich endpoint when they need declared versus
routable layers, conditional target membership, endpoint provenance, detailed caching
advice, or alias composition details.

## Contract Version

The current contract is:

```json
{ "contractVersion": "role-model.downstream.openai.v1" }
```

Consumers must check `contractVersion` before interpreting fields. Unknown contract
versions should be treated as incompatible unless the consumer has explicit fallback
logic.

`/v1/models` does not carry `contractVersion`; it carries
`role_model.capability_revision` and `role_model.discovery_url` on each enriched record.
Clients should use that revision as a cache key for compact metadata and fetch the rich
URL when they need declared/routable layers or conditional target detail.

`freshness.runtimeInventoryRevision` is a stable revision hash for the catalog,
runtime inventory, and alias matrix used to produce the response. Consumers may cache
the document, but should refresh when:

- the revision changes
- a request receives `no_eligible_target`
- the configured runtime URL changes
- the consumer starts a new session

## Model Record Semantics

Each `models[]` entry represents either an exact model or an alias:

- `type: "model"` means the id maps directly to one runtime model id.
- `type: "alias"` means the id routes across multiple backing models.
- `targetModelIds` are the configured alias target ids.
- `canonicalModelIds` are the catalog ids used for metadata after runtime-to-catalog
  normalization, such as `chatgpt/gpt-5.4` resolving to `openai/gpt-5.4`.
- `declared` is the configured model/endpoint set.
- `routable` is the currently usable model/endpoint set after runtime inventory,
  health, execution mode, and eligibility filters.

Consumers should treat `routable` as the operational set. `declared` is useful for
explaining operator intent and detecting drift.

Every configured downstream-visible alias receives a record, even when its current
`routable` set is empty because endpoints are disabled, unavailable, filtered by
execution mode, missing credentials, or not yet rehydrated. In that case,
`endpoint_ids` and `routable.*` are empty, while `targetModelIds` and `declared.modelIds`
still describe the configured alias membership.

## Limits

Alias limits are aggregated from the current routable backing models when at least one
routable target exists. If an alias has no current routable target, the record remains
visible and its descriptive metadata is derived from the declared configured targets so
consumers can keep a stable model list and detect the empty operational pool:

- `limits.safeContextWindow` is the minimum known context window across the selected
  aggregate target set.
- `limits.safeMaxOutputTokens` is the minimum known max output across the selected
  aggregate target set.
- `limits.maxContextWindow` is the largest known context window available behind the
  id.
- `limits.maxOutputTokens` is the largest known max output available behind the id.
- `piMapping.contextWindow` and `piMapping.maxTokens` mirror the safe values for
  conservative downstream configuration.

For `hybrid.hybrid` with GPT, DeepSeek, and Kimi behind the alias, the safe values are
expected to be the intersection of the routable target limits because the alias has
currently routable endpoints. With the current model metadata, Pi should configure the
alias conservatively at `262144` context tokens and `128000` max output tokens, while
still knowing that larger limits may exist for some conditional routes.

`null` means unknown, not zero.

## Modalities

`modalities.guaranteedInput` means every target in the selected aggregate set can
accept the modality. For currently routable aliases, that selected set is the routable
pool; for empty-pool aliases, it is the declared configured target set.
`modalities.availableInput` means at least one selected target can accept it.
`modalities.conditionalInput` maps each non-guaranteed available modality to the
specific target models and endpoints that support it.

For a mixed alias:

- text is usually guaranteed
- image may be conditional when GPT/Kimi support it and DeepSeek does not
- video may be conditional when only Kimi supports it

Downstream request logic should be:

1. Infer required input modalities from the request body.
2. If every required modality is in `guaranteedInput`, the alias can be used without a
   routing assumption.
3. If a required modality is absent from `guaranteedInput` but present in
   `availableInput`, the alias can still be used, but the runtime must route to a target
   listed under `conditionalInput[modality]`.
4. If a required modality is absent from `availableInput`, the consumer should not send
   that request to the id.

The runtime also enforces this server-side. An image request sent to an alias containing
DeepSeek text-only targets is filtered before scoring so DeepSeek is not eligible for
that request.

## Capabilities

`capabilities.guaranteed` and `capabilities.available` follow the same semantics as
modalities.

Important named capability families:

- `text.chat` for ordinary chat and responses text generation
- `tools.function_calling` for function/tool call support
- `structured.output` for JSON-schema or JSON-object output controls
- `reasoning` and `reasoning.*` for thinking/reasoning support

Convenience summaries are also exposed:

- `capabilities.tools.functionCalling`
- `capabilities.reasoning.supported`
- `capabilities.reasoning.effortControl`
- `capabilities.structuredOutput.supported`

Consumers should use the capability lists for routing decisions and the convenience
objects for simple UI/config display.

## Caching

Caching is exposed as advisory metadata:

- `capabilities.caching.promptRead`
- `capabilities.caching.promptWrite`
- `capabilities.caching.source`

Consumers may display or use caching metadata for optimization, but should not treat it
as a hard routing requirement unless their own request explicitly depends on cache
semantics. Unknown cache support is represented as `null`.

## Request-Time Enforcement

The bridge infers request requirements before difficulty/controller scoring:

- chat-completions image parts require `image`
- responses `input_image` parts require `image`
- video parts require `video`
- function tools require `tools.function_calling`
- JSON schema/object response formats require `structured.output`
- reasoning controls require `reasoning.*`

Targets that cannot satisfy the inferred requirements are removed from the candidate
pool. Diagnostics are surfaced under:

```json
{
  "routingDiagnostics": {
    "capabilityEligibility": {
      "requiredInputModalities": ["image", "text"],
      "requiredCapabilities": ["text.chat"],
      "excludedTargets": [
        {
          "endpointId": "deepseek.personal.primary.global.deepseek-v4-flash",
          "modelId": "deepseek/deepseek-v4-flash",
          "reasons": ["missing_input.image"]
        }
      ]
    }
  }
}
```

If no target remains, the bridge returns a stable client error:

```json
{
  "error": {
    "type": "capability_eligibility_error",
    "code": "no_eligible_target"
  }
}
```

Downstream clients should handle this by refreshing discovery and choosing a different
model id or removing the unsupported request feature.

## Sanitization

The rich discovery contract must not expose provider secrets, credential references, or
host filesystem paths. It may expose stable endpoint ids, model ids, provider ids,
catalog sources, limits, capabilities, and routability state.

This is intentional: downstream consumers need operational capability metadata, not
operator-local runtime configuration.

## Extensibility

New modalities and capabilities are strings. Consumers should preserve and display
unknown values instead of failing, while only making hard routing choices for
capabilities they understand.

Shape changes require a new `contractVersion`. Additive capability names, modality
names, and conditional-support map keys do not.
