Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `17`
Status: `LOCKED`
LockedAt: `2026-07-09T23:46:20Z`
LockHash: `f563e8333d7b6c0b4775aa4a84fa8a51e5eb405cab8d58997f61b1890959bb09`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-native-streaming-parity.addendum-14.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-assistant-history-content-parts.addendum-15.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.provider-agnostic-routing-preferences.addendum-16.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- OpenAI Chat Completions API reference: `https://developers.openai.com/api/reference/chat-completions/overview`
- OpenAI Responses API reference: `https://developers.openai.com/api/reference/responses/overview`
- Pi AI reference: `.tmp/pi-ref/packages/ai/src/api/openai-codex-responses.ts`
- Pi AI reference: `.tmp/pi-ref/packages/ai/src/api/openai-responses-shared.ts`
- Role-Model current code: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- Role-Model current tests: `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-parameter-sanitization.addendum-17.md`
Scope note: This addendum plans a runtime-side remediation for Codex Subscription request-parameter incompatibilities found after addendum 16. It does not modify upstream Pi or Craft code. It does not change provider-agnostic routing. It makes the selected-endpoint execution adapter responsible for translating OpenAI-compatible ingress semantics into the selected backend execution-surface wire format.

# Addendum 17 Plan: Codex Subscription Parameter Policy and Protocol Translation

## TODO

- [x] Record the observed failure matrix for exact Codex Subscription requests.
- [x] Separate downstream OpenAI-compatible ingress protocols from selected backend execution protocols.
- [x] Clarify that Codex Subscription currently executes through a Responses-style ChatGPT Codex backend, not a Chat Completions backend.
- [x] Reference public OpenAI Chat Completions and Responses API docs as the downstream compatibility target.
- [x] Reference Pi AI's Codex Subscription adapter as a backend-shaping implementation source without copying Pi-specific consumer behavior.
- [x] Define a generic, extensible adapter parameter policy instead of one-off parameter deletion.
- [x] Define strict TDD slices before production edits.
- [x] Define rebuilt-runtime verification with real Pi CLI and Craft client requests.
- [x] Define telemetry and request-detail assertions that make future parameter translation visible.

## Executive Summary

Role-Model must keep accepting OpenAI-compatible downstream requests, but it must not blindly forward every downstream field to every selected backend.

The specific bug found in run 62 is a protocol-boundary error:

- Downstream consumers call Role-Model through OpenAI-compatible Chat Completions or Responses surfaces.
- The selected OpenAI Codex Subscription endpoint executes through `https://chatgpt.com/backend-api/codex/responses`.
- Role-Model converts downstream Chat Completions messages into a Responses-style Codex backend request.
- The current Codex adapter also forwards `temperature` and translates `max_tokens` into `max_output_tokens`.
- The ChatGPT Codex backend rejects those fields today.

Therefore the target is not "make the Codex Subscription backend wire payload identical to public OpenAI Responses." The target is:

1. Public OpenAI Chat Completions and Responses docs define Role-Model's downstream compatibility semantics.
2. The selected backend execution surface defines the concrete upstream wire payload.
3. The Role-Model adapter translates between those two contracts with explicit, test-covered, inspectable parameter policy.

## Terminology

Use these terms consistently in implementation, tests, telemetry, docs, and review.

| Term | Meaning |
|---|---|
| Downstream consumer | Pi, Craft, curl, SDK, or any caller of Role-Model |
| Ingress surface | The HTTP/API shape Role-Model receives, such as `/v1/chat/completions` or `/v1/responses` |
| Public compatibility contract | The OpenAI-compatible semantics Role-Model presents to downstream consumers |
| Normalized execution request | Role-Model's internal representation after ingress parsing and routing preparation |
| Selected endpoint | The endpoint chosen by routing, such as `openai.personal.openai-codex-subscription.global.gpt-5.4` |
| Execution surface | The selected endpoint's backend wire protocol, such as ChatGPT Codex Responses or DeepSeek OpenAI-compatible Chat Completions |
| Provider | The actual model provider, such as `openai` or `deepseek` |
| Vendor | An intermediary or upstream surface, such as `chatgpt-codex-responses` or LiteLLM |
| Adapter family | The Role-Model code path that shapes and executes a request, such as `codex-subscription-responses` |

## Protocol Boundary Model

Role-Model must support multiple independent protocol boundaries.

### Boundary 1: Consumer to Role-Model

Downstream callers may use OpenAI-compatible surfaces:

- `/v1/chat/completions`
- `/v1/responses`
- compact `/v1/models` discovery
- rich `/api/role-model/downstream/openai` discovery

For this boundary, public OpenAI docs are the compatibility target:

- Chat Completions requests are message-list based and include optional controls such as `temperature`, `max_completion_tokens`, and legacy `max_tokens`.
- Responses requests are input/item based and include optional controls such as `temperature` and `max_output_tokens`.

Role-Model should accept those fields when they are valid for the public downstream protocol.

### Boundary 2: Role-Model routing

Routing must stay provider-agnostic as established by addendum 16.

Routing may use:

- exact model or alias membership
- endpoint health and cooldown
- endpoint metadata
- model and endpoint capabilities
- role/task policy
- benchmark quality
- measured quality, latency, throughput, reliability, and cost
- explicit operator policy
- advisory controller or routing-model scoring

Routing must not use:

- downstream consumer identity
- hidden Pi or Craft assumptions
- provider-family pins
- parameter-passthrough quirks

### Boundary 3: Role-Model to selected backend

After routing selects an endpoint, the selected adapter must shape a backend-specific request.

For OpenAI Codex Subscription today:

- the runtime receives Chat Completions or Responses ingress
- `readCodexExecutionRequestShape()` detects the ingress shape
- `buildCodexResponsesRequestBody()` converts that shape into backend `input`
- `createCodexSubscriptionResponsesExecutionAdapter()` posts to `https://chatgpt.com/backend-api/codex/responses`
- telemetry should report `providerId = openai`, `vendorId = chatgpt-codex-responses`, and `adapterFamily = codex-subscription-responses`

This is a Responses-style backend execution surface, not a Chat Completions backend. It still is not guaranteed to accept every public OpenAI Responses API field verbatim.

## Current Evidence

### Live failure matrix

The rebuilt runtime on `127.0.0.1:3456` currently behaves as follows for exact `chatgpt/gpt-5.4`:

| Request shape | Runtime result | Upstream detail |
|---|---:|---|
| no optional params | `200` | n/a |
| `temperature: 0` | `400 invalid_request` | `Unsupported parameter: temperature` |
| `max_tokens: 32` | `400 invalid_request` | `Unsupported parameter: max_output_tokens` |
| `temperature: 0` and `max_tokens: 32` | `400 invalid_request` | `Unsupported parameter: temperature` |
| `max_completion_tokens: 32` | `200` | currently not forwarded to the Codex backend |

### Current implementation evidence

Current code in `role-model-router/apps/runtime-host-bridge/src/index.ts` shows:

- `readCodexExecutionRequestShape()` detects whether the incoming request capture was Chat Completions or Responses.
- `buildCodexResponsesRequestBody()` converts Chat Completions `messages` into Responses-style `input`.
- `resolveCodexResponsesUrl()` returns `https://chatgpt.com/backend-api/codex/responses`.
- The adapter posts JSON to that Responses-style Codex backend.
- The same builder currently forwards `temperature` and maps `max_tokens` to `max_output_tokens`.

The bug is not accidental use of a Chat Completions backend. The bug is incorrect ingress-to-backend parameter translation for a Responses-style Codex Subscription backend.

## Reference Hierarchy

Use this order when docs, live behavior, and source references appear to conflict.

1. Role-Model downstream compatibility should align with official OpenAI Chat Completions and Responses docs where Role-Model exposes OpenAI-compatible surfaces.
2. Selected backend wire behavior must be verified against the actual selected backend, because vendor or subscription transports can support a subset or variant of public API fields.
3. Pi AI's Codex adapter is a source-backed reference for the ChatGPT Codex backend shape, auth headers, SSE behavior, message conversion, and request construction.
4. Role-Model's runtime-routing memory and addenda 14-16 govern provider identity, routing neutrality, telemetry separation, and Codex Subscription execution ownership.

When a backend rejects a public downstream field, Role-Model should not reject the downstream request automatically. It should translate, omit with diagnostics, emulate where safe, or return a clear local compatibility error only when the requested behavior is mandatory and cannot be honored.

## Source Verification Matrix

This addendum distinguishes external source facts from live observations and project policy. Do not upgrade live-observed private-backend behavior into a public OpenAI-doc claim.

| Plan claim | Verification source | Status |
| --- | --- | --- |
| Chat Completions and Responses are distinct public OpenAI API surfaces with different request shapes. | Official OpenAI API reference: `https://developers.openai.com/api/reference/chat-completions/overview`, `https://developers.openai.com/api/reference/responses/overview`, `https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/`, `https://developers.openai.com/api/reference/resources/responses/methods/create/` | Externally verified. |
| Public Chat Completions compatibility is message-list based and includes public optional generation controls such as temperature and token limits. | Official OpenAI Chat Completions API reference URLs above. | Externally verified for the downstream compatibility contract. |
| Public Responses compatibility is input/item based and includes public optional generation controls such as temperature and max output token limits. | Official OpenAI Responses API reference URLs above. | Externally verified for the downstream compatibility contract. |
| ChatGPT Codex Subscription execution is a selected backend adapter, not the same thing as the public OpenAI API-key Responses endpoint. | Pi AI reference code: `packages/ai/src/providers/openai-codex.models.ts` declares `api: "openai-codex-responses"` and `baseUrl: "https://chatgpt.com/backend-api"` for `gpt-5.4`; `packages/ai/src/api/openai-codex-responses.ts` resolves `/codex/responses`. | Externally source-verified against Pi AI code. |
| Pi AI builds a Codex-specific backend body instead of forwarding arbitrary OpenAI-compatible downstream request fields. | Pi AI reference code: `buildRequestBody()` in `packages/ai/src/api/openai-codex-responses.ts` constructs `store`, `stream`, `instructions`, `input`, `text`, `include`, `prompt_cache_key`, `tool_choice`, `parallel_tool_calls`, optional tools, optional reasoning, and selected options. | Externally source-verified against Pi AI code. |
| Pi AI separates Responses item conversion from Codex transport execution. | Pi AI reference code: `packages/ai/src/api/openai-responses-shared.ts` converts user text to `input_text`, assistant text to `output_text`, and tool calls/results to Responses-style items. | Externally source-verified against Pi AI code. |
| The ChatGPT Codex backend currently rejects Role-Model's forwarded `temperature` and Chat-Completions-derived `max_output_tokens` for observed requests. | Rebuilt local Role-Model runtime probes against `127.0.0.1:3456` and telemetry from this run. | Live-observed backend behavior, not an official public OpenAI-doc claim. Must be guarded by tests and diagnostics. |
| Current Role-Model routes Codex Subscription requests to `/codex/responses` and currently forwards problematic optional fields. | Current Role-Model worktree source: `role-model-router/apps/runtime-host-bridge/src/index.ts`. | Internal implementation evidence. |
| Provider identity, vendor/adapter telemetry separation, routing neutrality, and exact-model/alias parity are required. | Run 62 requirements and prior addenda 14-16. | Project policy, not an external API fact. |
| No Pi or Craft upstream-code changes are part of this remediation. | User requirement for this run. | Project constraint, not an external API fact. |

## Pi AI Reference Interpretation

Pi AI is a reference for backend behavior, not a target consumer branch.

Relevant Pi AI implementation facts:

- `openai-codex-responses.ts` builds a Codex-specific backend body for `POST /codex/responses`.
- The body includes `store: false`, `stream: true`, `instructions`, `input`, `text`, `include: ["reasoning.encrypted_content"]`, `prompt_cache_key`, `tool_choice`, and `parallel_tool_calls`.
- The body is produced from a Codex-specific options object; it does not blindly forward arbitrary OpenAI-compatible downstream fields.
- It does not translate Chat Completions `max_tokens` into backend `max_output_tokens`.
- It uses `Authorization` and `chatgpt-account-id` for ChatGPT/Codex OAuth.
- `openai-responses-shared.ts` separates message/item conversion from Codex transport execution.

Role-Model should learn these design principles:

- keep conversion logic shared and protocol-aware
- keep transport request construction backend-specific
- keep unsupported optional fields out of backend payloads unless verified
- keep consumer identity out of adapter behavior

Role-Model must not copy:

- Pi-specific `originator`
- Pi session management
- Pi command behavior
- Pi UI assumptions
- any branch on downstream application name

## Corrected Requirement

Role-Model must implement a systematic parameter-policy layer for selected backend adapters.

For Codex Subscription endpoints today:

- accept downstream `temperature` but do not forward it to the ChatGPT Codex backend until verified supported
- accept downstream `max_tokens` but do not translate it into backend `max_output_tokens`
- accept downstream `max_completion_tokens` but do not invent an unsupported backend parameter for it
- accept downstream Responses `max_output_tokens` but do not forward it to the ChatGPT Codex backend until verified supported
- preserve request success over unsupported optional parameter passthrough
- record sanitized, dropped, translated, or emulated fields in request-detail/telemetry diagnostics
- keep exact model and alias-routed requests behaviorally equivalent after endpoint selection

The implementation must be generic enough that a future public OpenAI API-key Responses endpoint can forward public `temperature` and `max_output_tokens` through a different adapter policy while Codex Subscription continues to use its verified ChatGPT Codex backend policy.

## Non-Goals

- Do not modify upstream Pi code.
- Do not modify upstream Craft code.
- Do not add consumer-name conditionals.
- Do not special-case only `difficulty.remote-only`.
- Do not create invented aliases for tests or live verification.
- Do not reintroduce Codex app-server execution.
- Do not make streaming support or reasoning deltas a routing eligibility criterion.
- Do not classify `ai-sdk-openai`, LiteLLM, or ChatGPT transport as provider identity.
- Do not silently hide parameter translation from diagnostics.
- Do not globally remove `temperature` or output-token controls from non-Codex providers that support them.

## Target Architecture

### Adapter Parameter Policy

Add a selected-execution-surface parameter policy used by request builders.

Conceptual shape:

```ts
type ParameterPolicyAction =
  | "forward"
  | "translate"
  | "drop_with_receipt"
  | "emulate_locally"
  | "reject_with_local_error";

interface AdapterParameterDecision {
  field: string;
  sourceSurface: "openai.chat.completions" | "openai.responses";
  targetSurface: string;
  action: ParameterPolicyAction;
  reason: string;
  sourceValueKind: "present" | "absent";
  forwardedField?: string;
}
```

The exact TypeScript shape may differ, but it must support:

- field identity
- source protocol
- target backend protocol
- action
- reason
- whether a backend field was forwarded
- no sensitive raw value persistence by default

### Policy Matrix

Initial policy matrix:

| Incoming field | Public ingress surface | DeepSeek/OpenAI-compatible Chat backend | Public OpenAI Responses API backend | ChatGPT Codex Responses backend |
|---|---|---|---|---|
| `temperature` | Chat Completions or Responses | forward if supported | forward if supported | drop with receipt |
| `max_tokens` | Chat Completions legacy | forward or translate per provider policy | translate to `max_output_tokens` only for public Responses adapter | drop with receipt |
| `max_completion_tokens` | Chat Completions | forward if backend is Chat Completions and supports it | translate only for public Responses adapter if semantics are verified | drop with receipt |
| `max_output_tokens` | Responses | not applicable unless translated | forward if supported | drop with receipt |
| `reasoning` | Responses | translate only when backend supports it | forward/translate per public Responses adapter | forward current verified Codex shape |
| `reasoning_effort` | Chat Completions compatibility | translate only when backend supports it | translate only when semantics are verified | forward as Codex `reasoning.effort` only if current tests prove accepted |
| `tool_choice` | Chat Completions or Responses | forward/translate when supported | forward/translate when supported | preserve current addenda 13-16 behavior |
| `prompt_cache_key` | Responses/Role-Model hint | provider policy | provider policy | forward only if source-backed and live-verified |
| `service_tier` | Responses | provider policy | forward if supported | forward only if source-backed and live-verified |
| `text` | Responses | not applicable unless translated | forward if supported | forward only if source-backed and live-verified |

This matrix is intentionally extensible. New providers and adapters should add rows or target-surface columns rather than adding ad hoc conditionals in request-building code.

### Diagnostics Contract

Every non-forward action must produce a structured diagnostic.

Minimum diagnostic fields:

- `field`
- `sourceSurface`
- `targetSurface`
- `action`
- `reason`
- `adapterFamily`
- `providerId`
- `vendorId`

Example:

```json
{
  "parameterSanitization": [
    {
      "field": "temperature",
      "sourceSurface": "openai.chat.completions",
      "targetSurface": "chatgpt.codex.responses",
      "action": "drop_with_receipt",
      "reason": "unsupported_by_selected_backend",
      "adapterFamily": "codex-subscription-responses",
      "providerId": "openai",
      "vendorId": "chatgpt-codex-responses"
    }
  ]
}
```

Diagnostics must be visible through request detail and available in machine-readable test fixtures. Telemetry rows may store a compact summary if full arrays are too large.

### Failure Policy

Unsupported optional parameter passthrough should not create upstream invalid requests.

Rules:

- If an optional downstream parameter cannot be represented safely, drop with receipt.
- If a required downstream semantic cannot be represented and would materially change correctness, fail locally before provider execution with a clear non-retryable compatibility error.
- If the backend still returns `invalid_request` for an unrelated reason, preserve existing terminal invalid-request behavior.
- Do not trigger fallback for true invalid requests.
- Do not place an endpoint in cooldown because Role-Model forwarded an unsupported optional field that it should have sanitized.

## Implementation Plan

### SP62-W1 Introduce source and target surface metadata

Change targets:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- related tests in `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Plan:

- Preserve the current ingress-shape detection from request capture.
- Name the source surface explicitly:
  - `openai.chat.completions`
  - `openai.responses`
- Name the target surface explicitly:
  - `chatgpt.codex.responses`
  - `openai.chat.completions`
  - `openai.responses`
  - `openai-compatible.chat.completions`
- Pass source and target surface metadata to request builders and diagnostics.

### SP62-W2 Add Codex Subscription parameter policy

Change targets:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

RED:

- Add a test that calls the Codex Subscription adapter through mocked network fetch with Chat Completions ingress containing:
  - `temperature: 0`
  - `max_tokens: 32`
  - `max_completion_tokens: 32`
- Assert the backend request body sent to `https://chatgpt.com/backend-api/codex/responses` does not include:
  - `temperature`
  - `max_output_tokens`
  - `max_tokens`
  - `max_completion_tokens`
- Assert the body still includes:
  - `model`
  - `store: false`
  - `stream: true`
  - `input`
  - `include: ["reasoning.encrypted_content"]`
- Assert structured parameter diagnostics record all omitted fields.

Expected RED:

- current code forwards `temperature`
- current code maps `max_tokens` to `max_output_tokens`
- current code has no structured parameter-policy diagnostics

GREEN:

- Apply the Codex target-surface policy inside `buildCodexResponsesRequestBody()` or a helper it calls.
- Do not forward unsupported optional fields.
- Return parameter diagnostics with the Codex execution result.

### SP62-W3 Add Responses-ingress coverage for Codex backend policy

Change targets:

- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`

RED:

- Add a test for `/v1/responses`-style ingress to a selected Codex Subscription endpoint with:
  - `temperature`
  - `max_output_tokens`
- Assert the ChatGPT Codex backend request omits unsupported fields with diagnostics.

GREEN:

- Ensure the policy applies based on target surface, not only Chat Completions ingress.

### SP62-W4 Preserve exact-model and alias parity

Change targets:

- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`

RED:

- Add a test proving exact `chatgpt/gpt-5.4` and alias-routed `difficulty.remote-only` requests use the same Codex parameter policy after the OpenAI Codex Subscription endpoint is selected.
- The alias test must use the canonical protocol/runtime alias `difficulty.remote-only`.
- The test may arrange scoring/fixtures so Codex is selected; it must not add a provider-specific routing preference.

GREEN:

- Keep all parameter policy execution after endpoint selection.
- Ensure no pre-routing alias or consumer branch owns Codex parameter behavior.

### SP62-W5 Preserve provider identity and observability

Change targets:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts` only if needed
- `role-model-router/packages/sqlite-memory/src/index.ts` only if needed
- related tests only if those packages change

RED:

- Add assertions that sanitized Codex requests still report:
  - `providerId = openai`
  - `providerFamily = openai`
  - `vendorId = chatgpt-codex-responses`
  - `adapterFamily = codex-subscription-responses`
- Add request-detail assertions for parameter diagnostics.

GREEN:

- Persist diagnostics without raw sensitive payloads.
- Do not regress provider/vendor/adapter separation from addenda 14-16.

### SP62-W6 Extend validator and docs

Change targets:

- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` if validator corpus should cover this behavior
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` if validator output changes
- `docs/architecture/14-routed-execution-semantics-and-receipts.md` if architecture docs need alignment
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` in Phase 8 only after implementation, if final code changes owned paths

Plan:

- Add deterministic validation cases for Codex Subscription parameter policy.
- Document that OpenAI-compatible ingress fields are translated by selected adapters and are not automatically backend wire fields.
- Keep public OpenAI docs as the downstream semantic reference.
- Keep backend-specific parameter support recorded as adapter policy, not routing policy.

## Strict TDD Evidence Plan

TDD Mode: `strict`

Evidence directories:

- RED: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-17/red/`
- GREEN: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-17/green/`
- LIVE: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-17/live/`

Required RED commands:

1. `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription sanitizes unsupported Chat Completions optional parameters"`
2. `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription sanitizes unsupported Responses optional parameters"`
3. `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription applies the same parameter policy after alias routing"`
4. If validator changes: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts -t "Codex parameter policy"`

Required GREEN commands:

1. Repeat every RED command and record passing output.
2. `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription"`
3. `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc --noEmit --pretty false`
4. If telemetry packages change, run their focused package tests.
5. `corepack pnpm run runtime:test-critical`
6. `corepack pnpm run runtime:validate-vendors`

No production edit may precede the failing test for the behavior it fixes.

## Rebuilt Runtime Verification Plan

After GREEN:

1. Rebuild the runtime from this worktree.
2. Stop stale Role-Model runtime listeners on `127.0.0.1:3456`.
3. Launch the rebuilt runtime on `127.0.0.1:3456`.
4. Verify runtime health/readiness:
   - `/healthz`
   - `/api/role-model/endpoints`
   - `/v1/models`
5. Confirm exact endpoints are active:
   - `openai.personal.openai-codex-subscription.global.gpt-5.4`
   - `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
6. Confirm `difficulty.remote-only` includes both endpoints.

## Live Verification Plan

### Direct runtime probes

Direct probes are low-level diagnostics, not final downstream proof.

Required probes:

- exact `chatgpt/gpt-5.4` with no optional params
- exact `chatgpt/gpt-5.4` with `temperature: 0`
- exact `chatgpt/gpt-5.4` with `max_tokens: 32`
- exact `chatgpt/gpt-5.4` with `max_completion_tokens: 32`
- exact `chatgpt/gpt-5.4` through `/v1/responses` with `temperature: 0`
- exact `chatgpt/gpt-5.4` through `/v1/responses` with `max_output_tokens`
- alias `difficulty.remote-only` with `temperature: 0`
- alias `difficulty.remote-only` with `max_tokens: 32`

Expected:

- no `Unsupported parameter: temperature`
- no `Unsupported parameter: max_output_tokens`
- requests return `200` unless the selected upstream fails for an unrelated reason
- telemetry/request-detail records parameter-policy diagnostics when Codex Subscription is selected

### Pi CLI verification

This is mandatory because the user explicitly requires real Pi verification through the real Pi client.

Use the installed Pi CLI to send requests to the Role-Model provider on `127.0.0.1:3456`.

Required Pi cases:

- exact `chatgpt/gpt-5.4` request that previously carried `temperature`
- exact `chatgpt/gpt-5.4` request with a token-limit path if Pi can be configured to send one
- alias `difficulty.remote-only` request using the canonical alias, not an invented alias
- at least one multi-turn Pi session to ensure addendum 15 assistant-history conversion still works

Expected:

- Pi request completes without `400 Unsupported parameter: temperature`
- Pi request completes without `400 Unsupported parameter: max_output_tokens`
- telemetry identifies provider as `openai` when Codex is selected
- telemetry does not classify LiteLLM or `ai-sdk-openai` as provider
- request-detail exposes sanitized optional field diagnostics for Codex-selected cases

Evidence:

- Pi command transcript logs under `evidence/logs/addendum-17/live/pi-*.log`
- telemetry list snapshots under `evidence/logs/addendum-17/live/pi-telemetry-*.json`
- request-detail snapshots under `evidence/logs/addendum-17/live/pi-request-detail-*.json`

### Craft client verification

Use the real Craft client or the repo-owned headless Craft verification helper if that is the existing run-62 mechanism.

Required Craft cases:

- alias `difficulty.remote-only` with an ordinary chat request
- exact `chatgpt/gpt-5.4` if Craft supports exact model selection through Role-Model
- exact or alias request that includes ordinary OpenAI-compatible optional parameters when Craft emits them

Expected:

- Craft receives a response without minute-scale timeout caused by Codex unsupported optional parameters
- routing between DeepSeek and GPT remains score-driven, not provider-pinned
- request-detail shows selected provider/vendor/adapter facts separately
- no changes to Craft source are required

Evidence:

- Craft transcript/result logs under `evidence/logs/addendum-17/live/craft-*.log`
- telemetry/request-detail snapshots for Craft-generated requests

## Extensibility Requirements

Future adapters must follow the same model:

- Add a target-surface name.
- Declare a parameter policy for optional and required fields.
- Write RED tests for unsupported, translated, and forwarded fields.
- Record diagnostics for every non-forward action.
- Keep route eligibility separate from parameter policy.
- Keep provider, vendor, execution family, and adapter family separate.
- Verify exact-model and alias paths independently.

Adding a new OpenAI API-key Responses adapter should not reuse the Codex Subscription policy. It should have its own `openai.responses` target surface and can forward public Responses fields when source-backed by official docs and live verification.

Adding a new OpenAI-compatible Chat Completions adapter should not inherit Codex Subscription drops. It should use a Chat Completions target-surface policy.

## Acceptance Criteria

- `AC17-1`: A failing test proves current Codex Subscription request construction forwards unsupported Chat Completions optional parameters.
- `AC17-2`: A failing test proves current Codex Subscription request construction mishandles Responses optional parameters for the ChatGPT Codex backend.
- `AC17-3`: The GREEN implementation removes unsupported Codex backend fields without consumer-specific branching.
- `AC17-4`: Exact `chatgpt/gpt-5.4` requests with `temperature`, `max_tokens`, and `max_completion_tokens` no longer fail with backend unsupported-parameter errors.
- `AC17-5`: Responses-ingress `chatgpt/gpt-5.4` requests with `temperature` or `max_output_tokens` no longer fail with backend unsupported-parameter errors.
- `AC17-6`: Alias `difficulty.remote-only` keeps both DeepSeek and GPT eligible when capability metadata allows both.
- `AC17-7`: Sanitization is recorded in structured request detail or telemetry diagnostics.
- `AC17-8`: True invalid requests still fail fast and do not trigger fallback.
- `AC17-9`: Real Pi CLI verification passes through Role-Model.
- `AC17-10`: Real Craft client verification passes through Role-Model.
- `AC17-11`: Provider identity remains actual provider identity; vendor/adapter identities remain separate.
- `AC17-12`: Rebuilt runtime is launched and verified on `127.0.0.1:3456` after implementation.

## Audit Checklist

- [x] Plan distinguishes downstream ingress surface from backend execution surface.
- [x] Plan states Codex Subscription uses a Responses-style ChatGPT Codex backend, not a Chat Completions backend.
- [x] Plan cites OpenAI Chat Completions and Responses public API docs as downstream compatibility references.
- [x] Plan cites Pi AI Codex adapter code as a backend implementation reference.
- [x] Plan does not require upstream Pi or Craft code changes.
- [x] Plan keeps routing provider-agnostic.
- [x] Plan scopes behavior to selected-endpoint execution translation.
- [x] Plan defines an extensible adapter parameter policy.
- [x] Plan includes strict TDD RED/GREEN evidence paths.
- [x] Plan includes rebuilt-runtime verification.
- [x] Plan includes real Pi CLI and Craft client verification.
- [x] Plan includes telemetry/request-detail diagnostics for non-forward parameter actions.

## Requirement Completion Status

- R0 | Status: planned | Changed Files: expected host bridge Codex request-builder code and host bridge tests. | Scope Decision: selected-backend parameter policy, not routing policy. | Addendum: addendum-17.
- R1 | Status: planned | Changed Files: expected `role-model-router/apps/runtime-host-bridge/src/index.ts` and focused tests. | Implementation Evidence: pending Phase 3 strict TDD. | Addendum: addendum-17.
- R2 | Status: planned | Changed Files: no upstream Pi or Craft source changes. | Verification Evidence: real Pi CLI and real Craft client/runtime requests after rebuild. | Addendum: addendum-17.
- R3 | Status: planned | Scope Decision: LiteLLM remains a vendor/execution path, not a provider; no LiteLLM-specific routing preference is introduced. | Addendum: addendum-17.
- R4 | Status: planned | Scope Decision: Codex Subscription remains a selected endpoint execution adapter; no Codex app-server execution and no provider-specific pre-routing pinning. | Addendum: addendum-17.
- R8 | Status: planned | Changed Files: request-detail or telemetry diagnostics only if current observation surfaces cannot expose parameter policy receipts. | Verification Evidence: request-detail snapshots in Phase 5. | Addendum: addendum-17.
- R10 | Status: planned | Verification Evidence: rebuilt runtime on `127.0.0.1:3456`, direct probes, Pi CLI logs, Craft logs, telemetry rows, and request details. | Addendum: addendum-17.
- R11 | Status: planned | Verification Evidence: focused RED/GREEN tests plus runtime validation commands listed in the Strict TDD Evidence Plan. | Addendum: addendum-17.
- R12 | Status: planned | Changed Files: late-phase updates to `/.recursive/DECISIONS.md`, `/.recursive/STATE.md`, and memory docs only after implementation/verification if the run completes late phases. | Addendum: addendum-17.

## Coverage Gate

- [x] Plan accounts for OpenAI-compatible Chat Completions ingress.
- [x] Plan accounts for OpenAI-compatible Responses ingress.
- [x] Plan accounts for the ChatGPT Codex `/codex/responses` backend adapter.
- [x] Plan separates public OpenAI downstream semantics from private backend wire payload policy.
- [x] Plan defines strict RED/GREEN tests for chat-completions, responses, exact-model, and alias paths.
- [x] Plan preserves provider-agnostic routing and provider/vendor/adapter identity separation.
- [x] Plan requires structured diagnostics for every non-forward parameter action.
- [x] Plan requires rebuilt-runtime verification on `127.0.0.1:3456`.
- [x] Plan requires real Pi CLI and Craft client verification.

Coverage: PASS

## Approval Gate

- [x] Plan is specific, source-verified, and implementable.
- [x] Plan is extensible through adapter parameter policy rather than consumer/model-specific branches.
- [x] Plan requires TDD before production edits.
- [x] Plan includes live verification with the rebuilt runtime.
- [x] Plan is approved for implementation by the user's `implement` command.

Approval: PASS

Audit Execution Mode: self-audit
Subagent Availability: unavailable in this turn; no multi-agent execution tool is available in the active toolset
Subagent Capability Probe: active callable tools include shell, patch, MCP resource helpers, and `tool_search`; no multi-agent execution tool was exposed after the current tool set refresh
Delegation Decision Basis: addendum 17 was verified directly against official OpenAI docs, Pi AI reference code, current Role-Model source, and live-runtime observations; no delegated audit result is required to make this planning artifact lockable
Audit Inputs Provided: locked run-62 requirements and base plan, addenda 14-16, official OpenAI Chat Completions and Responses docs, Pi AI Codex adapter references, current Role-Model runtime-host-bridge source, current host-bridge tests, DECISIONS, STATE, and runtime-routing memory

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: checked the addendum against public OpenAI API docs, Pi AI source references, current Role-Model implementation evidence, current run-62 provider/routing addenda, and the user's explicit constraints.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: no delegated context to refresh.
- Repair Performed After Verification: added the Source Verification Matrix and this lockable audit/coverage/approval section before implementation.

Audit: PASS
