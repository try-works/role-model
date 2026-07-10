Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `13`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:49Z`
LockHash: `7c34a520288d03bda50d1168fff013d13e72de995664c67ef33d4f173a96d30c`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.codex-subscription-responses-transport.addendum-13.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-routing-agnostic.addendum-12.md`
- `.tmp/pi-ref/packages/ai/src/api/openai-codex-responses.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-responses-shared.ts`
- `.tmp/pi-ref/packages/ai/test/openai-codex-stream.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-responses-transport.addendum-13.md`
Scope note: This plan supersedes addendum 12's app-server-delta implementation direction. It keeps addendum 12's generic post-routing streaming requirement.

# Addendum 13 Plan: Native Codex Subscription Responses Transport

## TODO

- [x] Define the native Codex Subscription Responses target behavior.
- [x] Define forbidden fixes and consumer-boundary constraints.
- [x] Define strict TDD slices and rebuilt-runtime Pi/Craft verification.

## Target Behavior

Role-Model must route first, then execute through the selected endpoint's correct execution path.

For OpenAI Codex Subscription endpoints:

- execute via ChatGPT Codex Responses transport, not `codex app-server`.
- send OAuth bearer credentials and ChatGPT account id from Role-Model managed credential storage.
- request streaming from the upstream transport.
- preserve text, reasoning, tool, usage, terminal, and error events in a generic stream transcript.
- convert that transcript into the downstream request shape without consumer-specific branches.

For all endpoints:

- streaming is not routing eligibility.
- exact model ids and aliases share the same post-routing execution behavior.
- downstream Pi and Craft should receive valid OpenAI-compatible streaming frames.

## Forbidden Fixes

- Do not preserve `codex app-server` as the desired Codex Subscription streaming path.
- Do not implement Pi-specific or Craft-specific branches.
- Do not modify upstream Pi or Craft code.
- Do not synthesize fake reasoning.
- Do not copy reasoning into assistant-visible content.
- Do not classify LiteLLM, `ai-sdk-openai`, Codex app-server, or ChatGPT transport as provider identity.
- Do not invent aliases for verification.

## Mutable Scope

Expected product paths:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts` only if reusable Responses parsing belongs there
- `role-model-router/packages/provider-openai/test/index.test.ts` only if reusable Responses parsing moves there
- `role-model-router/packages/runtime-observability/src/index.ts` only if stream execution-path receipts need schema support
- `role-model-router/packages/runtime-observability/test/index.test.ts` only if observability changes
- `packages/pi-role-model/**` only if repo-owned Role-Model discovery compatibility is proven stale

Out of scope:

- upstream Pi source under `.tmp/pi-ref/**`
- Craft source
- LiteLLM vendor source

## TDD Plan

TDD Mode: `strict`

RED logs:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-13/red/`

GREEN logs:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-13/green/`

### Slice A: Codex Responses Request Contract

RED:

- Add a test with mocked `fetch` proving Codex Subscription execution calls `https://chatgpt.com/backend-api/codex/responses`.
- Assert request headers include:
  - `Authorization: Bearer <access-token>`
  - `chatgpt-account-id: <account-id>`
  - `OpenAI-Beta: responses=experimental`
  - `accept: text/event-stream`
  - no API-key header
- Assert body includes:
  - `model`
  - `stream: true`
  - `input`
  - `include: ["reasoning.encrypted_content"]`
  - reasoning effort when requested

GREEN:

- Add a Role-Model Codex Subscription Responses execution adapter.
- Reuse Role-Model's stored OAuth credential payload.
- Extract account id from stored credential when available; otherwise decode it from the access token claim used by Pi.

### Slice B: Responses Text Streaming

RED:

- Mock upstream SSE with two `response.output_text.delta` events and terminal `response.completed`.
- Assert downstream streamed Chat Completions response emits two ordered `choices[].delta.content` chunks.
- Assert non-streaming requests still return the final content.

GREEN:

- Parse Responses SSE into a generic internal transcript.
- Replay text deltas into downstream Chat Completions SSE for `/v1/chat/completions`.

### Slice C: Responses Reasoning Streaming

RED:

- Mock upstream SSE with `response.output_item.added` item type `reasoning`.
- Include `response.reasoning_summary_text.delta` and `response.reasoning_text.delta`.
- Assert downstream Chat Completions stream emits `choices[].delta.reasoning_content`.
- Assert those deltas do not appear in `choices[].delta.content`.

GREEN:

- Normalize Responses reasoning/thinking deltas into a provider-neutral reasoning stream.
- Emit `reasoning_content` only when downstream request includes reasoning intent or when existing runtime policy says reasoning streams are allowed.

### Slice D: Routed Alias Parity

RED:

- Add a host-bridge test proving alias-routed `difficulty.remote-only` and exact `chatgpt/gpt-5.4` select the same Codex Subscription Responses execution path once the endpoint is selected.
- Assert streaming behavior is equivalent after routing.

GREEN:

- Move execution-path choice behind endpoint metadata, not request alias detection.
- Ensure routing eligibility ignores streaming granularity.

### Slice E: Telemetry and Receipts

RED:

- Add assertions that selected provider is `openai` while execution path is `codex-subscription-responses`.
- Assert telemetry no longer reports `codex-app-server` for direct Responses transport requests.

GREEN:

- Update receipts minimally to expose execution path separately from provider identity.
- Keep old receipt fields backwards-compatible where possible, but do not lie about app-server usage.

## Automated Verification

Focused:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run build`

Broad:

- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:validate-packaging`
- `corepack pnpm run ci:check`

## Rebuilt Runtime Verification

Rebuild from:

- `D:/DEV/role-model/.worktrees/62-litellm-pi-craft-codex-execution-hardening`

Launch:

- `http://127.0.0.1:3456`

Required process checks:

- exactly one Role-Model runtime owns `127.0.0.1:3456`
- capture PID
- capture executable SHA-256
- `/healthz` healthy
- `/v1/models` includes `difficulty.remote-only`
- active endpoints include OpenAI Codex Subscription and DeepSeek

## Live Verification

Pi CLI verification must use the real Pi CLI to send requests to Role-Model:

- `difficulty.remote-only`
- `baseline.remote-only`
- `chatgpt/gpt-5.4`
- `deepseek/deepseek-v4-pro`

Craft verification must use the real Craft runtime/client to send requests to Role-Model:

- `difficulty.remote-only`
- `baseline.remote-only`
- `chatgpt/gpt-5.4`
- `deepseek/deepseek-v4-pro`

Pass criteria:

- requests complete without timeout.
- aliases route through canonical alias resolution.
- Codex/GPT requests use execution path `codex-subscription-responses`.
- DeepSeek requests continue using the OpenAI-compatible DeepSeek execution path.
- streaming text deltas are visible for upstream streamed responses.
- any upstream reasoning/thinking deltas become `reasoning_content`.
- no hidden reasoning is copied into visible `content`.
- request-detail evidence separates provider identity from execution path and adapter facts.

## Requirement Completion Status

- R0 | Status: planned | Scope Decision: provider identity remains actual provider identity; Codex Subscription execution path is separate. | Addendum: addendum-13.
- R1 | Status: planned | Scope Decision: reasoning and streaming are post-routing execution semantics. | Addendum: addendum-13.
- R2 | Status: planned | Scope Decision: Pi and Craft are live verification clients, not sources of runtime branches. | Addendum: addendum-13.
- R4 | Status: planned | Scope Decision: GPT/Codex streaming comes from ChatGPT Codex Responses events. | Addendum: addendum-13.
- R8 | Status: planned | Scope Decision: telemetry reports `openai` provider and `codex-subscription-responses` execution path separately. | Addendum: addendum-13.
- R10 | Status: planned | Scope Decision: rebuilt-runtime verification on `127.0.0.1:3456` is mandatory. | Addendum: addendum-13.

## Coverage Gate

- [x] Plan is based on direct Pi source inspection.
- [x] Plan corrects the app-server mistake.
- [x] Plan is TDD-backed.
- [x] Plan includes rebuilt runtime, Pi CLI, and Craft verification.
- [x] Plan avoids consumer-specific logic.

Coverage: PASS

## Approval Gate

- [x] Specific and verifiable.
- [x] Future-proof by using provider execution surfaces, not consumer names.
- [x] Ready for strict TDD implementation.

Approval: PASS

Audit: PASS
