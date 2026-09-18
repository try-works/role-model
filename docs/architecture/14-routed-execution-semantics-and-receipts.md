# Routed Execution Semantics And Receipts

This document records the implemented execution-contract, cross-provider continuation,
and observability changes landed for the routed execution hardening foundation and the
later Codex Subscription tool-call parity work.

It is the concrete follow-on to
`docs/architecture/13-litellm-pi-role-model-integration-proposal.md`.

## Goals

The run hardens the routed runtime in six places:

- preserve richer downstream request semantics in the shared execution contract
- forward those semantics through the OpenAI and LiteLLM-backed adapter paths
- preserve portable tool-loop history across route switches between Responses-native
  and chat-completions-native providers
- keep Codex Subscription compatibility owned by endpoint metadata markers instead of
  scattered hardcoded selection checks
- persist execution-family, payload-size, retry, and idempotency facts in the
  canonical request-detail and telemetry surfaces
- emit a deterministic machine-readable corpus from the existing runtime validation
  harness

## Shared Execution Contract

`role-model-router/packages/adapter-execution/src/index.ts` now carries additive
execution semantics that were previously only visible at ingress time:

- `reasoning`
- `sessionAffinity`
- `transportPreference`
- `continuation`

These fields are provider-neutral. They do not force the runtime into a Pi-shaped or
LiteLLM-shaped abstraction, but they preserve enough intent that adapters do not have
to reconstruct dropped state later.

## Ingress Mapping

`role-model-router/apps/runtime-host-bridge/src/index.ts` now preserves richer
Responses ingress semantics when building the shared execution request:

- `tool_choice`
- `parallel_tool_calls`
- `reasoning_effort`
- `reasoning`
- `thinking`
- `previous_response_id`
- prompt-cache and request-affinity hints

This keeps Pi-style and Responses-style semantics visible to provider adapters and to
request-detail receipts instead of limiting them to capability inference only.

## Provider-Family Shaping

### OpenAI-backed execution

`role-model-router/packages/provider-openai/src/index.ts` now forwards:

- responses `tool_choice`
- `parallel_tool_calls`
- reasoning payloads
- `previous_response_id`
- prompt-cache key
- session-affinity headers

### LiteLLM-backed execution

`role-model-router/packages/provider-litellm/src/index.ts` inherits the same richer
request semantics through the shared OpenAI request builder.

`role-model-router/packages/vendor-litellm/src/index.ts` and
`role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` now preserve
additive LiteLLM config blocks:

- `router_settings`
- `litellm_settings`

That keeps the repo-owned runtime config aligned with upstream LiteLLM router/module
controls without hardcoding a second enum of LiteLLM keys.

## Cross-Provider Continuation Contract

Route switches use one portable conversation history inside role-model, but upstream
serialization stays surface-specific. Before rendering the next turn, the adapter must
classify the selected route as one of:

- native Responses upstream
- native Chat Completions upstream
- Responses ingress -> Chat Completions upstream bridge

A proxy exposing `POST /v1/responses` is not enough to classify the upstream as native
Responses. Current LiteLLM-backed DeepSeek routes still default to the bridge class
unless live evidence proves a richer upstream contract for the exact selected target.

Portable continuity comes from replayable history:

- assistant text
- sibling tool-call sets with stable ids and ordering
- tool outputs
- truthful finish-reason state
- explicit caller tool policy such as `parallel_tool_calls: true`,
  `parallel_tool_calls: false`, or omission, but only when the selected target
  truthfully supports that policy

Provider-native chain state is not portable across route switches:

- `previous_response_id`
- encrypted reasoning items
- provider-specific opaque response handles
- proxy-local affinity or deployment hints that are not proven portable across the
  selected provider and request-shape change

### Route-Switch Matrix

| Route switch | Source shape | Target shape | Preserve | Drop as nonportable | Required target rendering |
| --- | --- | --- | --- | --- | --- |
| `codex -> kimi` | native OpenAI Responses | current direct Kimi code endpoints use Chat Completions tool loops | assistant text, sibling tool calls, tool outputs, finish reason, truthful explicit parallel policy | `previous_response_id`, encrypted reasoning items, Codex-only opaque chain state | render assistant tool calls as `message.tool_calls`, render tool outputs as `role:"tool"` messages, preserve sibling-call ordering and ids, and only forward explicit parallel policy when the direct Kimi contract proves it |
| `codex -> deepseek` | native OpenAI Responses | current LiteLLM-backed DeepSeek routes default to `Responses ingress -> Chat Completions upstream bridge` | assistant text, sibling tool calls, tool outputs, finish reason, portable reasoning context only if the target accepts it, truthful explicit parallel policy | `previous_response_id`, encrypted reasoning items, Codex-only opaque chain state | replay the portable history as Chat Completions messages plus `role:"tool"` results, preserve sibling-call ordering and ids, and never fake Responses-native chain state on the DeepSeek side |
| `kimi -> codex` | current direct Kimi code endpoints use Chat Completions tool loops | native OpenAI Responses | assistant text, `message.tool_calls`, tool outputs, finish reason, truthful explicit parallel policy | Kimi-side message-format assumptions, synthesized `previous_response_id`, provider-opaque state absent from portable history | render assistant tool calls into Responses `function_call` items, render tool outputs into `function_call_output` items with matching `call_id`, preserve sibling-call ordering and ids, and omit `previous_response_id` on the route switch |
| `deepseek -> codex` | current LiteLLM-backed DeepSeek routes default to `Responses ingress -> Chat Completions upstream bridge` | native OpenAI Responses | assistant text, `message.tool_calls`, tool outputs, finish reason, truthful explicit parallel policy | DeepSeek-side message-format assumptions, synthesized `previous_response_id`, provider-opaque state absent from portable history | convert the portable Chat Completions history into Responses `function_call` and `function_call_output` items before the Codex turn while preserving sibling-call ordering and ids |
| `codex -> generic LiteLLM-backed provider` | native OpenAI Responses | classify the exact LiteLLM route first as native Responses upstream, native Chat Completions upstream, or bridge | assistant text, sibling tool calls, tool outputs, finish reason, portable reasoning only when the verified target accepts it, truthful explicit parallel policy | `previous_response_id`, encrypted reasoning items, Codex-only opaque chain state, LiteLLM-local hints that are not proven portable | classify first, then render to the verified upstream shape: Responses-native only for verified native Responses targets, otherwise Chat Completions plus tool messages |
| `generic LiteLLM-backed provider -> codex` | classify the exact LiteLLM route first as native Responses upstream, native Chat Completions upstream, or bridge | native OpenAI Responses | assistant text, tool calls, tool outputs, finish reason, portable reasoning only when it can be truthfully replayed, truthful explicit parallel policy | synthesized `previous_response_id`, provider-opaque state absent from portable history, LiteLLM-local proxy metadata | classify first, then render the portable history as Responses `function_call` and `function_call_output` items for Codex while preserving sibling-call ordering and ids |

### Multi-Tool And Parallel Policy Matrix

| Target family | Multiple sibling function calls in one turn | Request-side `parallel_tool_calls` handling |
| --- | --- | --- |
| Codex / OpenAI Responses function tools | documented | documented for function tools; built-in tools do not share that guarantee |
| Current direct Kimi code endpoints | documented to return multiple `tool_calls` that callers must all continue | preserve only when direct target proof exists; otherwise emit explicit unsupported-target diagnostics |
| Current LiteLLM-backed DeepSeek routes | preserve the sibling tool-call set through the Chat Completions bridge when the upstream function-tool contract supports it | preserve only when the verified upstream contract supports it; otherwise emit explicit unsupported-target diagnostics |
| Generic LiteLLM-backed providers | depends on the verified upstream, never on LiteLLM `/responses` ingress alone | depends on the verified upstream, never on LiteLLM `/responses` ingress alone |

## Codex Compatibility Ownership

Codex Subscription routing compatibility is now owned by explicit endpoint-id markers in
`role-model-router/apps/runtime-host-bridge/src/index.ts`.

The runtime still exposes the supported OpenAI Codex Subscription model matrix for
device-authorization and provider discovery, but initial routing preference no longer
depends on a duplicated static model allow-list when the endpoint metadata already
declares the transport family.

## Receipts And Telemetry

The canonical observation bundle in
`role-model-router/packages/runtime-observability/src/index.ts` now records
`executionSemantics`:

- `sourceClient`
- `executionFamily`
- `adapterFamily`
- `payloadBytes.providerRequest`
- `payloadBytes.providerResponse`
- `retryCount`
- `rerouteCount`
- `cooldownDecision`
- `idempotencyDecision`
- `toolSideEffectState`

Per-tool receipts also include `sideEffectState`, and the bundle derives a
request-level summary from the observed tool executions.

`role-model-router/packages/sqlite-memory/src/index.ts` projects the same facts into the
runtime telemetry ledger so request-detail reads and aggregate telemetry queries stay on
the same contract.

When only telemetry rows remain available, the host bridge reconstructs a compatible
request-detail view from those persisted fields.

### Latency reporting and the measured-latency selection input

Run 98 addendum 40 splits "how long did the provider take to answer" from "how long did the
caller wait", and lets a *measured* latency difference inform candidate selection without
changing default behaviour.

`latency_ms` in the telemetry ledger keeps its historical meaning: the provider's
response-header time. Three fields are recorded beside it, all nullable so rows written
before the change keep their old meaning:

- `provider_completion_latency_ms` — provider dispatch to the response body being fully read;
- `time_to_first_token_ms` — provider dispatch to the first streamed chunk (streaming only);
- `request_latency_ms` — request arrival to the response being flushed, written after the flush
  (`updateRuntimeTelemetryClientLatency`), because it is not knowable when the observation row
  is persisted.

Operator surfaces report the client-visible percentile beside the provider one and label which
is which; a window whose rows predate the change says the client-visible duration was not
measured rather than showing the provider number.

**Selection input.** `readEndpointLatencyBuckets` (`packages/sqlite-memory`) reports p50/p95 and
sample counts per endpoint per prompt-size bucket over a bounded window, counting only successful
live requests and withholding buckets below the operator's sample floor. The parameters live in
the same versioned policy document as the other activation values, under `latencySelection`
(global, with channel and scope overrides that narrow the section field by field):

| Field | Default | Bounds |
| --- | --- | --- |
| `enabled` | `false` | boolean — decisions are byte-identical while false |
| `minStage` | `S2` | `S0`-`S4` |
| `windowHours` | `24` | 1-168 |
| `minSamples` | `5` | 3-1 000 |
| `maxDeltaMs` | `2 000` | 0-60 000 |
| `tokenBucketUpperBounds` | `[50 000, 150 000]` | 1-8 strictly increasing integers |
| `maxCandidates` | `4` | 1-32 |

A malformed or out-of-bounds value fails closed to the defaults with `enabled: false` and a
recorded violation list; the environment may only narrow (disable, or lower the delta within
bounds), never enable or widen.

When authorized, the runtime consults only the request's own prompt-size bucket, requires
evidence for the router's chosen endpoint before anything can move, and switches only when a
candidate's measured p95 beats that choice by more than `maxDeltaMs`. The switch is applied by
re-routing with the other eligible endpoints denied, so the router's eligibility, health and
capability rules still decide whether the chosen endpoint may serve the request; if they refuse
it, the original decision stands and the bounded reason is recorded. The verdict — bucket,
ranked candidates with p95 and sample counts, chosen endpoint, reason — is stored on the
observation's `routingDiagnostics.latencySelection` rather than on the `RouterDecision`
contract, and the candidate work is bounded by `maxCandidates`.

The routing-preparation reads that feed this (observed profiles, the seven-day telemetry
rollup, the benchmark capability map, the latency buckets) are served from a short-TTL shared
snapshot (`ROLE_MODEL_ROUTING_PREP_CACHE_TTL_MS`, default 5 s, `0` disables), so this work never
starves request handling.

## Provider, Vendor, Execution, And Adapter Identity

The run also hardens the identity contract so execution receipts stop classifying
execution layers as if they were providers.

- `providerId` and `providerFamily` identify the actual routed provider, such as
  `openai` or `deepseek`
- `vendorId` identifies an optional intermediary execution vendor, such as
  `litellm` or `chatgpt-codex-responses`
- `executionFamily` identifies the high-level routed execution path, such as
  `vendor-litellm` or `remote-service`
- `adapterFamily` identifies the concrete adapter implementation, such as
  `litellm-proxy`, `codex-subscription-responses`, or
  `ai-sdk-openai-compatible`

This keeps three common cases distinct:

- a LiteLLM-backed OpenAI request should read `providerFamily = openai`,
  `vendorId = litellm`, `executionFamily = vendor-litellm`,
  `adapterFamily = litellm-proxy`
- a native Codex Subscription request should read `providerFamily = openai`,
  `vendorId = chatgpt-codex-responses`, `executionFamily = remote-service`,
  `adapterFamily = codex-subscription-responses`
- a direct OpenAI-compatible request to another provider should keep the actual
  provider identity, for example `providerFamily = deepseek`, even when
  `adapterFamily = ai-sdk-openai-compatible`

## Deterministic Corpus

`role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` now emits a
deterministic corpus on top of the existing vendor validation harness.

The corpus is machine-readable and records per-case facts including:

- case id
- client kind
- request path
- routing constraint
- expected and actual execution family
- selected endpoint and model
- provider id
- provider family
- vendor id
- adapter family
- status and failure class
- retry and reroute counts
- payload bytes
- tool-call and tool-execution counts
- idempotency decision
- canonical request id and routing decision id

The deterministic corpus is exercised through the existing
`test/validate-vendors.test.ts` anchor and through the CLI validator output.

## Validation Modes

The current validation split is:

- deterministic mock harness:
  - repo-owned
  - CI-safe
  - emits the canonical corpus artifact
- rebuilt-runtime verification:
  - run from the active worktree
  - used for representative Pi and Craft request proof in later phases

## Current Constraints

The execution-semantics receipt currently measures payload bytes at the canonical
provider request/response capture boundary. That means:

- translated payload bytes
- provider canonical payload bytes
- provider wire payload bytes

all refer to the same measured downstream request body today, because the runtime does
not yet preserve a second lower-level transport capture distinct from the canonical
provider request capture.

That is intentional for this run. The goal is a stable observable contract, not a new
trace store.
