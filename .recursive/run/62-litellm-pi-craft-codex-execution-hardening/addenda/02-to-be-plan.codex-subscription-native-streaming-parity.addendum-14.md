Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `14`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:48Z`
LockHash: `692f75bb1a5e596bfdbca80534f79d1331bc5a5af22d36d859a0e8432139d683`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.codex-subscription-responses-transport.addendum-13.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-responses-transport.addendum-13.md`
- `.tmp/pi-ref/packages/ai/src/providers/openai-codex.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-codex-responses.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-responses-shared.ts`
- `.tmp/pi-ref/packages/ai/test/openai-codex-stream.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-native-streaming-parity.addendum-14.md`
Scope note: This plan supersedes addendum 13 where addendum 13 is too shallow. Addendum 13 correctly identifies the transport root cause, but the implementation must prove true incremental streaming, Responses event coverage, tool-call behavior, and provider/execution-path telemetry. Pi is used as a source-backed reference for the upstream Codex Subscription contract, not as a downstream-specific target.

# Addendum 14 Plan: Native Codex Subscription Streaming Parity

## TODO

- [x] Audit the current partial native Codex Subscription adapter against the Pi-derived upstream contract.
- [x] Define the correct provider-agnostic execution boundary.
- [x] Define strict TDD slices that fail against incomplete behavior before implementation.
- [x] Define rebuilt-runtime verification using real Pi CLI and Craft client requests.
- [x] Keep Pi and Craft code out of the implementation scope unless repo-owned `pi-role-model` discovery metadata is proven stale.
- [x] Specify the Codex adapter implementation by mapping Pi AI's upstream Codex code to Role-Model runtime code.
- [x] Specify removal of Codex app-server execution, auth/bootstrap, prompt, and app-server dynamic-tool code.

## Current Implementation Audit

The current worktree has started the right direction:

- `createRuntimeBridgeBackend()` defaults Codex Subscription execution to `createCodexSubscriptionResponsesExecutionAdapter()`.
- The new adapter targets `https://chatgpt.com/backend-api/codex/responses`.
- It sends ChatGPT OAuth bearer auth and `chatgpt-account-id`.
- It converts basic Chat Completions messages into Responses input.
- It maps basic text and reasoning deltas into downstream Chat Completions-shaped chunks after parsing.

This is not yet sufficient:

- The adapter calls `response.text()`, so it can buffer the entire upstream SSE response before returning anything downstream. That preserves delta shape but not live streaming timing.
- `CodexExecutionAdapter.executeRequest()` returns a completed `body`, so the Codex Subscription path has no generic stream-writer hook equivalent to the LiteLLM/direct execution path.
- Responses function-call events are not normalized into downstream Chat Completions `tool_calls` deltas or Responses output items.
- Request mapping does not yet prove full parity for instructions, developer/system messages, multimodal parts, tool choice, tool strictness, reasoning summary controls, service tier, text verbosity, prompt-cache/session affinity, and request correlation headers.
- Error and terminal event handling is partial; `response.failed`, `error`, incomplete reasons, usage details, cached tokens, and terminal status need source-backed tests.
- Telemetry mostly uses `vendorId = chatgpt-codex-responses`; it still needs a stable separation between `providerId = openai`, `executionPath = codex-subscription-responses`, `upstreamSurface = chatgpt-codex-responses`, and adapter/vendor facts.
- Existing tests prove a simple mocked transcript can be converted, but not that the runtime streams first downstream bytes before upstream completion.

## Source-Backed Upstream Contract

Role-Model should learn the upstream contract from Pi's Codex implementation without copying Pi-specific downstream behavior:

- Provider registration pattern: Codex Subscription is an OpenAI/ChatGPT OAuth-backed execution surface over `https://chatgpt.com/backend-api`.
- Endpoint: `POST /codex/responses`.
- Auth headers: `Authorization: Bearer <access-token>` and `chatgpt-account-id: <account-id>`.
- Protocol headers: `OpenAI-Beta: responses=experimental`, `accept: text/event-stream`, and `content-type: application/json`.
- Request body: `store: false`, `stream: true`, `input`, `instructions`, `include: ["reasoning.encrypted_content"]`, optional `reasoning`, optional `tools`, optional `tool_choice`, optional `parallel_tool_calls`, optional `prompt_cache_key`, optional `text`, optional `service_tier`.
- Event semantics: `response.output_item.added`, `response.output_text.delta`, `response.reasoning_summary_text.delta`, `response.reasoning_text.delta`, `response.function_call_arguments.delta`, `response.function_call_arguments.done`, `response.output_item.done`, `response.completed`, `response.incomplete`, `response.failed`, and `error`.

Role-Model must not copy Pi as a consumer:

- Do not set `originator: pi`; use a Role-Model-owned originator or omit originator if the upstream accepts it.
- Do not branch on "Pi" or "Craft" when executing.
- Do not alter upstream Pi or Craft code.
- Do not make streaming or reasoning a routing eligibility condition.

## Exact Implementation Blueprint Learned From Pi AI

This section is the implementation contract for the Codex Subscription adapter. It describes what to build in Role-Model by learning from Pi AI's upstream provider code, without adding any Pi downstream application behavior.

### Provider and Execution Registration

Pi reference:

- `.tmp/pi-ref/packages/ai/src/providers/openai-codex.ts`
  - `id: "openai-codex"`
  - `baseUrl: "https://chatgpt.com/backend-api"`
  - `api: openai-codex-responses`
  - OAuth auth loaded from `loadOpenAICodexOAuth`

Role-Model implementation:

- Keep operator/provider identity as `providerId = openai`.
- Keep the existing Codex Subscription account/variant concept under OpenAI.
- Replace execution adapter identity with `executionPath = codex-subscription-responses`.
- Replace upstream surface identity with `upstreamSurface = chatgpt-codex-responses`.
- Set `vendorId = chatgpt-codex-responses`.
- Do not use `adapterFamily = ai-sdk-openai` for native Codex Subscription execution. Use a Role-Model-owned Codex Responses adapter family such as `codex-subscription-responses`.
- Choose this adapter from endpoint/account metadata after routing. Do not choose it by matching downstream client name, alias name, or prompt content.

### OAuth and Credential Handling

Pi reference:

- `.tmp/pi-ref/packages/ai/src/utils/oauth/openai-codex.ts`
  - `CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"`
  - `AUTH_BASE_URL = "https://auth.openai.com"`
  - `AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize"`
  - `TOKEN_URL = "https://auth.openai.com/oauth/token"`
  - browser redirect URI: `http://localhost:1455/auth/callback`
  - device user-code URL: `https://auth.openai.com/api/accounts/deviceauth/usercode`
  - device token URL: `https://auth.openai.com/api/accounts/deviceauth/token`
  - device verification URI: `https://auth.openai.com/codex/device`
  - device redirect URI: `https://auth.openai.com/deviceauth/callback`
  - scope: `openid profile email offline_access`
  - account id claim: `https://api.openai.com/auth.chatgpt_account_id`
  - token refresh uses `grant_type=refresh_token` against `TOKEN_URL`

Role-Model implementation:

1. Replace `createSystemCodexAuthAdapter()` app-server login with a native OpenAI Codex OAuth helper modeled on Pi's OAuth flow.
2. Implement browser PKCE login and device-code login using the same OpenAI endpoints and validation rules.
3. Store credentials in the existing Role-Model credential store with at least:
   - `access_token`
   - `refresh_token`
   - `expires_at` or equivalent expiry timestamp
   - `account_id`, derived from the access token JWT claim when not provided by the token response
4. Refresh expired tokens via `POST https://auth.openai.com/oauth/token` with `grant_type=refresh_token`, `refresh_token`, and the Codex `client_id`.
5. Preserve existing operator UX semantics for connected/pending/expired/reconnect states.
6. Do not shell out to `codex app-server` for login, account reads, token refresh, or execution readiness.
7. Migration rule: if existing stored credentials contain legacy app-server metadata, add a one-time legacy reader/rewriter only if needed to avoid forcing reconnect. That migration must not spawn app-server, must not write new `codex-app-server` metadata, and must be removable after the migration window.

### Request Construction

Pi reference:

- `.tmp/pi-ref/packages/ai/src/api/openai-codex-responses.ts`
  - `buildRequestBody()`
  - `resolveCodexUrl()`
  - `buildSSEHeaders()`
  - `buildWebSocketHeaders()`
- `.tmp/pi-ref/packages/ai/src/api/openai-responses-shared.ts`
  - `convertResponsesMessages()`
  - `convertResponsesTools()`

Role-Model implementation:

Implement `buildCodexResponsesRequest()` with these exact field rules:

- URL:
  - Always resolve to `https://chatgpt.com/backend-api/codex/responses` unless endpoint metadata explicitly overrides the ChatGPT backend base URL.
  - Normalize a supplied base URL like Pi does: base URL ending in `/codex/responses` is used as-is; ending in `/codex` appends `/responses`; otherwise append `/codex/responses`.
- Model:
  - Strip public routing prefixes `chatgpt/` and `openai/` from downstream model ids before sending upstream.
  - Preserve the downstream requested model id in returned chunks and telemetry.
  - Rename `normalizeCodexAppServerModelName()` to a transport-neutral helper such as `normalizeCodexSubscriptionModelName()`.
- Body:
  - `model`: normalized upstream model id.
  - `store: false`.
  - `stream: true` for upstream execution, even when downstream requested a non-streaming response, because the adapter needs one unified event path.
  - `instructions`: derived from system/developer messages or a safe runtime default.
  - `input`: converted to Responses input items.
  - `include: ["reasoning.encrypted_content"]`.
  - `text`: preserve downstream Responses `text` controls when provided; otherwise set no default unless Role-Model already owns a default.
  - `reasoning`: preserve downstream `reasoning` object or map Chat Completions `reasoning_effort` to `{ effort }`; include `summary` only when requested or runtime policy requires it.
  - `tools`: convert Chat Completions function tools into Responses `function` tools.
  - `tool_choice`: preserve compatible downstream tool choice; default to `auto` when tools are present and no explicit choice exists.
  - `parallel_tool_calls`: preserve downstream value when present; otherwise default to `true` when tools are present.
  - `prompt_cache_key`: forward if present; otherwise derive from generic session/cache metadata only if Role-Model already has a session id.
  - `previous_response_id`: forward for Responses-shaped downstream continuations.
  - `temperature`, `max_output_tokens`, `service_tier`: forward when present and valid for the upstream surface.
- Message conversion:
  - Convert user text to `{ role: "user", content: [{ type: "input_text", text }] }`.
  - Convert user image URLs or data URLs to `{ type: "input_image", image_url, detail: "auto" }`.
  - Convert assistant text history to Responses message output items when needed.
  - Convert prior assistant tool calls to Responses `function_call` items where possible.
  - Convert tool results to `function_call_output` items.
  - Do not collapse structured multimodal content into text except as an explicit unsupported-content fallback with diagnostics.

### Headers

Pi reference:

- `buildBaseCodexHeaders()` sets bearer auth, `chatgpt-account-id`, `originator: pi`, and a Pi user-agent.
- `buildSSEHeaders()` adds `OpenAI-Beta: responses=experimental`, `accept: text/event-stream`, and `content-type: application/json`.

Role-Model implementation:

- Required headers:
  - `Authorization: Bearer <access_token>`
  - `chatgpt-account-id: <account_id>`
  - `OpenAI-Beta: responses=experimental`
  - `accept: text/event-stream`
  - `content-type: application/json`
- Forbidden headers:
  - no `x-api-key`
  - no OpenAI Platform API key auth
  - no `originator: pi`
- Optional headers:
  - `originator: role-model` only if accepted by live verification; otherwise omit.
  - `session-id` and `x-client-request-id` only when Role-Model has generic correlation/session facts and tests prove forwarding is accepted.

### Streaming Transport

Pi reference:

- `parseSSE(response, signal)` incrementally reads `response.body.getReader()`.
- `mapCodexEvents()` maps `response.done`, `response.completed`, and `response.incomplete` into terminal Responses events and throws typed errors for `error` and `response.failed`.
- `processResponsesStream()` consumes events incrementally and emits thinking/text/tool events.

Role-Model implementation:

1. Implement an async SSE parser over `response.body`, not `response.text()`.
2. The parser must:
   - support CRLF and LF frame separators.
   - join multi-line `data:` blocks.
   - ignore `[DONE]`.
   - throw a protocol error on invalid JSON rather than silently swallowing it.
   - cancel the upstream reader when the downstream aborts.
3. Implement a Codex event normalizer that maps raw events to Role-Model internal stream events.
4. Emit downstream chunks as soon as normalized events arrive.
5. Keep a transcript accumulator alongside streaming for non-streaming final JSON, telemetry, usage, and diagnostics.
6. Initial implementation should use SSE. Do not implement Pi's WebSocket cache path unless a future requirement proves the SSE path is insufficient. The adapter design may leave a transport enum for future WebSocket support, but no hidden app-server or Pi-specific WebSocket behavior should be introduced.

### Event Normalization

Pi reference:

- `.tmp/pi-ref/packages/ai/src/api/openai-responses-shared.ts`
  - `response.reasoning_summary_text.delta` -> thinking delta
  - `response.reasoning_text.delta` -> thinking delta
  - `response.output_text.delta` -> text delta
  - `response.function_call_arguments.delta` -> tool-call argument delta
  - `response.function_call_arguments.done` -> final tool-call arguments
  - `response.output_item.done` finalizes reasoning, message, and function-call output slots

Role-Model implementation:

Normalize to these internal events:

- `start`
- `text_delta`
- `reasoning_delta`
- `tool_call_start`
- `tool_call_arguments_delta`
- `tool_call_done`
- `output_item_done`
- `completed`
- `incomplete`
- `failed`

Rules:

- Use `response.output_item.added` to create per-output-index slots for message, reasoning, and function call items.
- Use `response.output_text.delta` for visible text only.
- Use `response.reasoning_summary_text.delta` and `response.reasoning_text.delta` for reasoning only.
- Never put reasoning deltas into visible assistant `content`.
- Use final `response.output_item.done` content only to fill missing accumulated content, not to duplicate already streamed deltas.
- Preserve response ids, output item ids, call ids, function names, usage, incomplete details, and error payloads when present.

### Downstream Mapping

Role-Model implementation:

- For Chat Completions streaming:
  - emit `data: <chat.completion.chunk>` frames.
  - first chunk includes `role: "assistant"`.
  - text maps to `choices[0].delta.content`.
  - reasoning maps to `choices[0].delta.reasoning_content`.
  - tool calls map to `choices[0].delta.tool_calls`.
  - final frame includes stable `finish_reason`.
  - emit `data: [DONE]` only if existing Role-Model stream conventions require it.
- For Chat Completions non-streaming:
  - aggregate final assistant message with `content`, optional `reasoning_content`, optional `tool_calls`, `finish_reason`, and usage.
- For Responses streaming:
  - pass through valid Responses SSE events when possible after request/telemetry hooks.
  - if normalized/replayed, preserve event names and response/output ids.
- For Responses non-streaming:
  - aggregate final `output` items for message, reasoning, and function calls.

### Tool Execution Boundary

Pi reference:

- Pi normalizes function calls as assistant stream events; it does not assume downstream app-specific tool execution inside the provider adapter.

Role-Model implementation:

- If Role-Model owns a request-scoped tool execution handler for a Codex request, execute only through that explicit handler and persist `dynamicToolExecutions`.
- If no Role-Model handler is present, return OpenAI-compatible tool calls to the downstream client.
- Remove app-server-specific dynamic tool namespace/prefix/schema compaction because the Responses API tool schema is the upstream tool contract.
- Replace app-server dynamic-tool tests with Responses function-tool request and stream tests.
- Do not add Pi or Craft branches for tool behavior.

## Codex App-Server Removal Plan

The final implementation must remove Codex app-server as a runtime dependency for OpenAI Codex Subscription.

Remove from product runtime source:

- `CODEX_APP_SERVER_DEVICE_CODE_PREFIX`
- `CODEX_APP_SERVER_REQUEST_TIMEOUT_MS`
- `CODEX_APP_SERVER_TURN_TIMEOUT_MS`
- app-server loopback port reservation and readiness polling
- `sendCodexAppServerRequest`
- `createSystemCodexAuthAdapter` app-server implementation
- app-server account-read/login subprocess logic
- `buildCodexAppServerDynamicToolBindings`
- `buildCodexAppServerDynamicTools`
- app-server namespace/prefix helpers
- `buildCodexTurnInstructions`
- `buildCodexTurnPrompt`
- `buildCodexAppServerTurnInput`
- image staging code that exists only for app-server local file inputs
- `executeCodexAppServerTurnOverStdio`
- `createCodexAppServerExecutionAdapter`
- all `spawn(... ["app-server", ...])` call sites
- all runtime fallback paths that set `vendorId = codex-app-server`

Replace with:

- native OpenAI Codex OAuth helper based on Pi's `openai-codex.ts`.
- native Codex Responses request builder based on Pi's `buildRequestBody()`.
- native Codex Responses SSE parser based on Pi's `parseSSE()`.
- native Codex event normalizer based on Pi's `mapCodexEvents()` plus `openai-responses-shared.ts`.
- native downstream stream mappers for Chat Completions and Responses.

Test removal requirements:

- Delete app-server-specific unit tests and replace them with equivalent Codex Responses tests.
- Update vendor validation fixtures/tests to expect `chatgpt-codex-responses`, not `codex-app-server`.
- Update account repair/auth tests to verify native OAuth/device-code/refresh behavior, not app-server login.
- Add a static source guard that fails if `runtime-host-bridge/src/index.ts` contains:
  - `codex app-server`
  - `app-server`
  - `executeCodexAppServer`
  - `createCodexAppServer`
  - `buildCodexAppServer`
  - `CODEX_APP_SERVER`
- Allowed exception: a temporary migration-only test/source fragment may mention the legacy credential prefix if and only if it is isolated, documented as migration-only, does not spawn app-server, and rewrites credentials into a neutral format.
- Update product docs that still describe `codex-app-server` as the Codex Subscription execution vendor. Historical run addenda remain as historical artifacts, but current architecture docs and runtime validators must reflect the new path.

## Target Architecture

The implementation should be a provider execution adapter, not a downstream compatibility shim.

Target identity model:

- `providerId`: `openai`
- `providerFamily`: `openai`
- `authMode`: `chatgpt` or `codex-subscription`
- `executionPath`: `codex-subscription-responses`
- `upstreamSurface`: `chatgpt-codex-responses`
- `vendorId`: `chatgpt-codex-responses`
- `adapterFamily`: Role-Model-owned Codex Responses adapter, not `ai-sdk-openai` and not `codex-app-server`

Target flow:

1. Route normally using alias/exact-model routing.
2. Select the endpoint.
3. If the endpoint is an OpenAI Codex Subscription endpoint, execute through the native Codex Responses transport.
4. Parse upstream SSE incrementally from `response.body`.
5. Emit downstream OpenAI-compatible chunks incrementally as upstream events arrive.
6. Maintain a normalized transcript for final body, usage, observability, and error/fallback classification.
7. Convert transcript/events to downstream request shape:
   - Chat Completions stream for `/v1/chat/completions` streamed requests.
   - Chat Completions JSON for `/v1/chat/completions` non-streamed requests.
   - Responses stream or pass-through-compatible Responses events for `/v1/responses` streamed requests.
   - Responses JSON for `/v1/responses` non-streamed requests.

## TDD Mode

TDD Mode: `strict`

RED evidence directory:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-14/red/`

GREEN evidence directory:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-14/green/`

No production runtime changes are allowed for this addendum until a failing RED test has been written and executed for the target behavior.

## TDD Slices

### Slice A: Native Request Contract

RED tests:

- Codex Subscription execution calls `https://chatgpt.com/backend-api/codex/responses`.
- Headers include bearer auth, `chatgpt-account-id`, `OpenAI-Beta: responses=experimental`, `accept: text/event-stream`, and `content-type: application/json`.
- Headers do not include OpenAI API-key auth and do not use `originator: pi`.
- Body includes `store: false`, `stream: true`, `input`, `instructions`, `include: ["reasoning.encrypted_content"]`, and requested reasoning controls.
- `chatgpt/gpt-5.4` maps to upstream model `gpt-5.4` without losing downstream model identity in returned chunks.

GREEN implementation:

- Keep the Role-Model Codex Responses adapter.
- Harden request construction against both Chat Completions and Responses input shapes.
- Decode `chatgpt-account-id` from the access token only when the stored credential does not provide it.

### Slice B: True Incremental Streaming

RED tests:

- Mock upstream `Response.body` as a controlled `ReadableStream`.
- Enqueue a `response.output_text.delta` event and keep the upstream stream open.
- Assert the downstream stream writer receives the first Chat Completions `choices[].delta.content` chunk before `response.completed` and before upstream stream close.
- Repeat with `response.reasoning_summary_text.delta` and assert `choices[].delta.reasoning_content` arrives before visible content.

GREEN implementation:

- Extend the Codex execution adapter contract to support a provider-neutral stream sink or writer callback.
- Parse upstream SSE incrementally instead of calling `response.text()` for streamed downstream requests.
- Preserve a transcript while streaming so non-streaming return paths and observability still work.

### Slice C: Responses Event Normalization

RED tests:

- Parse `response.output_item.added` for `message`, `reasoning`, and `function_call` items.
- Parse `response.output_text.delta`, `response.reasoning_summary_text.delta`, and `response.reasoning_text.delta`.
- Parse `response.function_call_arguments.delta` and `response.function_call_arguments.done`.
- Parse `response.output_item.done` and use final item content only to fill gaps, not duplicate already streamed deltas.
- Parse `response.completed`, `response.incomplete`, `response.failed`, and `error`.

GREEN implementation:

- Introduce a small Codex Responses event normalizer with typed internal events:
  - `text_delta`
  - `reasoning_delta`
  - `tool_call_start`
  - `tool_call_arguments_delta`
  - `tool_call_done`
  - `completed`
  - `incomplete`
  - `failed`
- Keep this normalizer provider/execution-surface specific, but downstream-consumer agnostic.

### Slice D: Chat Completions Downstream Mapping

RED tests:

- Text deltas become ordered `choices[].delta.content`.
- Reasoning deltas become ordered `choices[].delta.reasoning_content`.
- Reasoning never appears in visible `content`.
- Function-call deltas become OpenAI-compatible `choices[].delta.tool_calls`.
- A completed function call returns `finish_reason: "tool_calls"` when no final assistant text follows.
- `response.incomplete` maps to `finish_reason: "length"` or a stable incomplete finish reason already used by the runtime.

GREEN implementation:

- Add a downstream Chat Completions stream mapper over normalized Codex events.
- Preserve existing downstream chunk shape used by Pi, Craft, raw curl, and other OpenAI-compatible clients.
- Do not include consumer-specific fields.

### Slice E: Responses Downstream Mapping

RED tests:

- For `/v1/responses` streamed downstream requests, upstream Responses events are emitted as valid Responses SSE without being converted to Chat Completions.
- For `/v1/responses` non-streamed downstream requests, final output contains message, reasoning, function_call, status, and usage fields.
- Response ids and output item ids are preserved when present.

GREEN implementation:

- Keep Responses request/response behavior separate from Chat Completions response shaping.
- Use the same normalized transcript for non-streaming JSON.

### Slice F: Tool Behavior Boundary

RED tests:

- If downstream supplied tools and no runtime-owned `executeDynamicToolCall` handler is present, function calls are passed through to the downstream client as tool calls.
- If a runtime-owned `executeDynamicToolCall` handler is present, the adapter can execute request-scoped tools and continue only under the existing runtime-owned tool execution contract.
- Tool execution receipts are preserved in `dynamicToolExecutions` when runtime-owned execution occurs.
- No duplicate tool execution occurs across retry/reroute boundaries.

GREEN implementation:

- Preserve the existing runtime-owned dynamic tool execution capability where it is explicitly provided.
- Otherwise expose tool calls downstream rather than attempting to execute consumer-owned tools.
- Keep tool semantics independent of Pi or Craft.

### Slice G: Error, Retry, and Fallback Classification

RED tests:

- HTTP 429 usage-limit responses classify as terminal quota/provider-auth or quota-exhausted behavior, not generic retry loops.
- HTTP 5xx and network errors remain fallback-eligible through Role-Model's existing runtime fallback classifier.
- SSE `response.failed` and `error` events produce stable runtime error bodies and fallback classification.
- Stream abort from the downstream client cancels the upstream reader.

GREEN implementation:

- Map Codex Responses errors into existing `classifyUpstreamExecutionFailure()` categories.
- Do not add Pi-style retries inside the adapter unless the runtime fallback policy explicitly requires same-endpoint retry.
- Prefer runtime-owned fallback/cooldown semantics over hidden adapter retry loops.

### Slice H: Session, Cache, and Correlation Semantics

RED tests:

- `prompt_cache_key` is forwarded when present in downstream request body.
- Incoming `session-id` and `x-client-request-id` are preserved as runtime correlation facts and forwarded only when the upstream contract supports them.
- `previous_response_id` from Responses-shaped downstream requests is preserved for Responses execution.
- Cache/correlation fields appear in request-detail evidence without being tied to a Pi-specific path.

GREEN implementation:

- Add generic ingress extraction for session/cache/correlation metadata.
- Thread those facts through Codex request construction and observability receipts.
- Keep exact model and alias routing behavior identical after endpoint selection.

### Slice I: Telemetry Identity Separation

RED tests:

- Exact `chatgpt/gpt-5.4` and alias-selected GPT requests record `providerId = openai`.
- The same requests record `executionPath = codex-subscription-responses`.
- The same requests record `upstreamSurface` or `vendorId = chatgpt-codex-responses`.
- They do not record `providerId = litellm`, `providerId = ai-sdk-openai`, or `providerId = codex-app-server`.
- They do not report `vendorId = codex-app-server` when native Responses transport executed.

GREEN implementation:

- Add or populate additive execution-path metadata in runtime observations/request detail.
- Preserve backwards-compatible vendor metadata where existing UI/tests consume it.
- Update docs/tests to distinguish provider identity from execution path.

### Slice J: Alias and Exact-Model Parity

RED tests:

- `difficulty.remote-only` and exact `chatgpt/gpt-5.4` reach the same Codex Subscription execution adapter when the router selects the Codex endpoint.
- `baseline.remote-only` and exact `deepseek/deepseek-v4-pro` continue to use the DeepSeek OpenAI-compatible path.
- Streaming support is not an eligibility filter.

GREEN implementation:

- Keep execution adapter selection endpoint-driven.
- Do not branch on alias names except in existing router alias resolution.

### Slice K: Remove Codex App-Server Runtime Code

RED tests:

- Add a static guard over `role-model-router/apps/runtime-host-bridge/src/index.ts` proving the app-server execution/auth symbols still exist before removal.
- Add failing replacements for deleted app-server tests:
  - OAuth/device-code login request contract uses OpenAI auth endpoints directly.
  - token refresh uses `https://auth.openai.com/oauth/token`.
  - Codex Responses function tools are sent as Responses `tools`, not app-server dynamic tool namespaces.
  - image input is converted to Responses `input_image`, not staged as app-server local image files.
  - native execution never spawns `codex app-server`.
- Add validator tests proving expected vendor/execution metadata is `chatgpt-codex-responses` / `codex-subscription-responses`.

GREEN implementation:

- Delete app-server execution/auth/prompt/dynamic-tool source listed in `## Codex App-Server Removal Plan`.
- Delete or rewrite tests that assert app-server behavior.
- Replace old app-server request-shaping helpers with Codex Responses helpers.
- Keep only migration-only legacy credential decoding if needed, and isolate it behind explicit tests.
- Ensure `rg "app-server|CodexAppServer|CODEX_APP_SERVER|executeCodexAppServer|createCodexAppServer|buildCodexAppServer" role-model-router/apps/runtime-host-bridge/src/index.ts` returns no matches except a documented migration-only exception.

## Automated Verification Matrix

Focused commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run build`

Runtime commands:

- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:validate-packaging`

Commit-readiness command:

- `corepack pnpm run ci:check`

Static checks:

- `git diff --check`
- inspect all changed files for accidental Pi/Craft upstream edits.

## Rebuilt Runtime Verification

Runtime source:

- `D:/DEV/role-model/.worktrees/62-litellm-pi-craft-codex-execution-hardening`

Runtime endpoint:

- `http://127.0.0.1:3456`

Required setup:

- Rebuild runtime from the run-62 worktree.
- Stop stale Role-Model runtime processes that own `127.0.0.1:3456`.
- Do not stop unrelated user Pi or Craft processes unless they are proven to own the runtime port or interfere with the isolated Role-Model runtime.
- Launch exactly one rebuilt Role-Model runtime on `127.0.0.1:3456`.
- Capture PID, command line, runtime state root, and executable/build hash.

Runtime health checks:

- `/healthz` reports healthy enough for remote routing.
- `/v1/models` lists canonical aliases including `difficulty.remote-only` and `baseline.remote-only`.
- `/api/role-model/endpoints` shows active OpenAI Codex Subscription and DeepSeek endpoints.
- No extra background runtime processes are mutating the same state root.

## Live Verification Matrix

Raw OpenAI-compatible streaming probes:

- Chat Completions streamed request to `difficulty.remote-only`.
- Chat Completions streamed request to `chatgpt/gpt-5.4`.
- Chat Completions streamed request to `deepseek/deepseek-v4-pro`.
- Responses streamed request to the Codex endpoint if the runtime exposes `/v1/responses`.
- Measure first downstream chunk latency and total latency.
- Confirm GPT/Codex selected requests record native `codex-subscription-responses`.

Real Pi CLI verification:

- Use the real Pi CLI, not curl-only or a handcrafted request script.
- Send requests to Role-Model on `http://127.0.0.1:3456`.
- Use canonical models/aliases:
  - `difficulty.remote-only`
  - `baseline.remote-only`
  - `chatgpt/gpt-5.4`
  - `deepseek/deepseek-v4-pro`
- Capture Pi command logs, Role-Model request ids, request detail JSON, telemetry rows, and endpoint selection.

Real Craft verification:

- Use the real Craft runtime/client path, not a synthetic HTTP-only substitute.
- Send requests to Role-Model on `http://127.0.0.1:3456`.
- Use canonical models/aliases:
  - `difficulty.remote-only`
  - `baseline.remote-only`
  - `chatgpt/gpt-5.4`
  - `deepseek/deepseek-v4-pro`
- Capture Craft request logs, Role-Model request ids, request detail JSON, telemetry rows, and endpoint selection.

Pass criteria:

- Pi and Craft requests complete without timeout.
- Alias requests use protocol/runtime-defined aliases only.
- Exact model and alias-selected Codex requests use native Codex Responses execution, not app-server execution.
- Streaming text arrives incrementally when upstream emits text deltas.
- Upstream reasoning deltas, when emitted, arrive as downstream reasoning deltas.
- No fake reasoning is generated when upstream emits none.
- Reasoning is never copied into visible assistant content.
- Tool calls remain OpenAI-compatible and are either passed through or runtime-executed according to the explicit tool boundary.
- Telemetry separates provider identity from execution path.

## Out of Scope

- No upstream Pi code changes.
- No upstream Craft code changes.
- No LiteLLM vendor code changes.
- No consumer-specific branches in Role-Model runtime.
- No new aliases invented for tests or live verification.
- No fake reasoning or synthetic progress indicators pretending to be model reasoning.

## Requirement Completion Status

- R0 | Status: planned | Changed Files: expected runtime-host bridge and tests only unless telemetry schema requires additive metadata. | Scope Decision: provider identity remains `openai`; execution path is separate; Codex app-server runtime code must be removed rather than retained as an alternate execution path. | Addendum: addendum-14.
- R1 | Status: planned | Changed Files: expected stream adapter and stream tests. | Scope Decision: streaming/reasoning are execution semantics after routing, not routing eligibility. | Addendum: addendum-14.
- R2 | Status: planned | Changed Files: no upstream Pi or Craft changes. | Scope Decision: Pi and Craft are verification clients, not runtime special cases. | Addendum: addendum-14.
- R4 | Status: planned | Changed Files: expected Codex Responses parser/mapper plus removal of app-server prompt/stdio turn code. | Scope Decision: Codex/GPT streaming must come from ChatGPT Codex Responses events and must be delivered incrementally. | Addendum: addendum-14.
- R7 | Status: planned | Changed Files: expected tool event normalization and existing runtime tool boundary tests. | Scope Decision: tool calls are generic OpenAI-compatible events; runtime-owned tool execution remains explicit. | Addendum: addendum-14.
- R8 | Status: planned | Changed Files: expected telemetry/request-detail metadata if current fields cannot represent provider/execution separation, plus validator fixture updates from `codex-app-server` to native Codex Responses metadata. | Scope Decision: LiteLLM, ai-sdk-openai, Codex app-server, and ChatGPT Responses are not providers. Codex app-server must not appear as a current execution vendor after this addendum. | Addendum: addendum-14.
- R10 | Status: planned | Verification Evidence: rebuilt runtime on `127.0.0.1:3456`, real Pi CLI requests, real Craft client requests. | Scope Decision: local HTTP probes are supplemental only. | Addendum: addendum-14.

## Coverage Gate

- [x] Plan is based on direct Pi source inspection.
- [x] Plan avoids downstream Pi-specific or Craft-specific runtime branches.
- [x] Plan calls out the current adapter's buffering gap.
- [x] Plan requires true incremental streaming tests.
- [x] Plan covers text, reasoning, tools, errors, usage, session/cache/correlation, aliases, exact models, telemetry identity, rebuilt runtime, Pi CLI, and Craft verification.
- [x] Plan exactly maps Pi AI Codex OAuth, request, header, SSE, event-normalization, and downstream-mapping patterns to Role-Model implementation tasks.
- [x] Plan requires removing Codex app-server execution/auth/prompt/dynamic-tool code and replacing its tests.

Coverage: PASS

## Approval Gate

- [x] Plan is specific and verifiable.
- [x] Plan is TDD-backed with concrete RED/GREEN slices.
- [x] Plan is future-proofed around execution surfaces rather than downstream applications.
- [x] Plan is ready for implementation only after RED tests are created and observed failing.
- [x] Plan makes Codex app-server removal a required implementation outcome, not an optional cleanup.

Approval: PASS

Audit: PASS
