# Routed Execution Semantics And Receipts

This document records the implemented execution-contract and observability changes
landed for the LiteLLM, Pi, and Craft execution-hardening run.

It is the concrete follow-on to
`docs/architecture/13-litellm-pi-role-model-integration-proposal.md`.

## Goals

The run hardens the routed runtime in five places:

- preserve richer downstream request semantics in the shared execution contract
- forward those semantics through the OpenAI and LiteLLM-backed adapter paths
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

## Provider, Vendor, Execution, And Adapter Identity

The run also hardens the identity contract so execution receipts stop classifying
execution layers as if they were providers.

- `providerId` and `providerFamily` identify the actual routed provider, such as
  `openai` or `deepseek`
- `vendorId` identifies an optional intermediary execution vendor, such as
  `litellm` or `codex-app-server`
- `executionFamily` identifies the high-level routed execution path, such as
  `vendor-litellm` or `remote-service`
- `adapterFamily` identifies the concrete adapter implementation, such as
  `litellm-proxy`, `ai-sdk-openai`, or `ai-sdk-openai-compatible`

This keeps three common cases distinct:

- a LiteLLM-backed OpenAI request should read `providerFamily = openai`,
  `vendorId = litellm`, `executionFamily = vendor-litellm`,
  `adapterFamily = litellm-proxy`
- a native Codex Subscription request should read `providerFamily = openai`,
  `vendorId = codex-app-server`, `executionFamily = remote-service`,
  `adapterFamily = ai-sdk-openai`
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
