Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `02`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-03.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-03.md`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-02.md`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Scope note: This addendum records the Codex Subscription bridge parity repair that restores GPT-5.4 hosted web search and request-scoped function tools through the runtime-backed OpenAI transport.

## Changes Applied

- Widened runtime execution tool definitions in `/role-model-router/packages/adapter-execution/src/index.ts`.
  - function tools remain backward compatible
  - hosted OpenAI Responses tools now have an explicit `kind: "hosted"` plus raw payload preservation
- Updated `/role-model-router/packages/provider-openai/src/index.ts`.
  - hosted Responses tools are preserved instead of being coerced into function tools
  - hosted tools force the OpenAI adapter onto the `/responses` path even when endpoint hints prefer `chat/completions`
- Updated `/role-model-router/packages/provider-anthropic/src/index.ts`.
  - Anthropic stays function-tool-only and now rejects hosted OpenAI tools explicitly instead of failing at type level
- Updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`.
  - `/v1/responses` request mapping now accepts hosted OpenAI tools
  - exported `buildCodexDynamicTools(...)` for request-scoped function-tool extraction
  - exported `buildCodexTurnPrompt(...)` and removed the blanket `do not access the network` instruction
  - Codex app-server initialization now sets `capabilities.experimentalApi: true`
  - Codex `thread/start` now provisions `dynamicTools`
  - Codex `item/tool/call` requests are executed through the runtime MCP tool registry and answered on the app-server websocket with real tool results
  - dynamic tool executions are merged back into persisted runtime observations so Observe reflects the actual tool run

## TDD Compliance

RED:
- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts --testNamePattern "forces the OpenAI Responses API path when hosted tools are requested"`
  - failed with `Hosted OpenAI tools are only supported on the Responses API path.`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "hosted OpenAI responses tools|Codex dynamic-tool extraction|buildCodexTurnPrompt no longer forbids network access"`
  - originally failed before the bridge changes because hosted tools were rejected, dynamic-tool extraction was missing, and the prompt still forbade network access

GREEN:
- same targeted provider-openai command now passes
- same targeted runtime-host-bridge command now passes

## Verification

Focused automated verification:
- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run`
  - result: PASS
- `corepack pnpm --filter @role-model-router/provider-anthropic exec vitest run`
  - result: PASS
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "hosted OpenAI responses tools|Codex dynamic-tool extraction|buildCodexTurnPrompt no longer forbids network access"`
  - result: PASS
- `corepack pnpm --filter @role-model-router/provider-openai build`
  - result: PASS
- `corepack pnpm --filter @role-model-router/provider-anthropic build`
  - result: PASS
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - result: PASS

Broader automated status:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run`
  - Codex-specific changes are green
  - unrelated pre-existing failures remain in:
    - `test/validate-ui.test.ts` (`moonshotVariantIds` expectation mismatch)
    - `test/validate-vendors.test.ts` (timeout)
    - `test/executable.test.ts` when packaging runs without all workspace runtime `dist/` artifacts present

Live rebuilt-runtime verification on `http://127.0.0.1:3461` after relaunch:
- `POST /v1/chat/completions` with `model: "chatgpt/gpt-5.4"` and a live Cloudflare stock-price query
  - result: PASS
  - observed behavior: GPT-5.4 returned the current Cloudflare price and cited MarketWatch instead of refusing network access
- `POST /v1/responses` with `model: "chatgpt/gpt-5.4"` and `tools: [{ "type": "web_search" }]`
  - result: PASS
  - observed behavior: hosted `web_search` completed successfully and returned a sourced Cloudflare stock-price answer
- `POST /v1/responses` with request-scoped function tool `lookupRegistry`
  - result: PASS
  - observed behavior: GPT-5.4 invoked the runtime MCP connector, returned endpoint status/model data, and `/api/role-model/requests/req-2a37184c-f6ef-42bb-b6ea-38cb431287fa` persisted:
    - `tooling.executions[0].toolName = "lookupRegistry"`
    - `tooling.executions[0].status = "succeeded"`

Browser verification after rebuild/relaunch:
- relaunched runtime-host bridge on port `3461`
- Playwright browser readback confirmed:
  - `/app` loads the operator shell
  - `/app/studio/chat` loads the rebuilt Chat workspace surface after hydration

## Requirement Status

- Codex Subscription GPT-5.4 live web-search parity through runtime-backed chat requests: `implemented`
- Hosted OpenAI Responses tool passthrough for Codex Subscription: `implemented`
- Request-scoped function-tool passthrough through Codex app-server dynamic tools: `implemented`
- Observe/telemetry persistence for Codex dynamic tool executions: `implemented`
- Rebuilt runtime relaunch on `3461`: `implemented`
- Browser verification after rebuild: `implemented`
- Broader unrelated runtime-host validation flakes: `not changed by this addendum`

Coverage: PASS
Approval: PASS
