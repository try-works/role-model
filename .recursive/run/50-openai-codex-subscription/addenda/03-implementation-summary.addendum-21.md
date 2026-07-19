Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `21`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-21.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-21.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-21.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Scope note: make hosted web-search support transport-aware in runtime metadata and docs, without inventing a DeepSeek-native hosted-search contract on the current OpenAI-compatible transport.

## Implemented

1. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - added exported `resolveEndpointWebSearchSupport()` metadata with three runtime modes:
     - `native`
     - `runtime-fallback`
     - `unsupported`
   - distinguished:
     - OpenAI native `openai.responses.web_search`
     - Kimi native `moonshot.chat.builtin_web_search`
     - DeepSeek documented Anthropic-native `deepseek.anthropic.server_web_search`
       while keeping the current runtime path on `runtime-fallback`
   - switched hosted-tool filtering to endpoint-level transport-aware checks instead of a
     model-id-only OpenAI matrix lookup
   - exposed `webSearchSupport` on endpoint inventory readback
2. updated `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
   - added the endpoint metadata shape for `webSearchSupport`
3. updated `/docs/architecture/09-runtime-routing-strategy-interactions.md`
   - replaced the outdated OpenAI-only hosted-search description with a transport contract
     matrix
   - documented native versus runtime-managed versus documented-other-transport support
4. updated focused bridge regression coverage
   - added a support-descriptor regression for OpenAI, Kimi, and DeepSeek
   - pinned endpoint inventory HTTP readback so operator-facing endpoint metadata stays
     in sync with the bridge logic

## TDD Evidence

RED Evidence:
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-21-web-search-transport.red.log`

GREEN Evidence:
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-21-web-search-transport.green.log`

## Verification

Focused test commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "web-search support by active runtime transport|serves runtime control-plane summary, provider, account, and endpoint routes|maps exact Kimi responses web-search requests"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "web-search|web_search|runtime control-plane summary, provider, account, and endpoint routes"`

Live runtime verification on `http://127.0.0.1:3462` after restart:

1. endpoint inventory now reports:
   - OpenAI GPT-5.4:
     - `mode: native`
     - `currentRuntimeContract: openai.responses.web_search`
   - Kimi K2.7 Code:
     - `mode: native`
     - `currentRuntimeContract: moonshot.chat.builtin_web_search`
   - DeepSeek V4 Flash / Pro:
     - `mode: runtime-fallback`
     - `documentedProviderContract: deepseek.anthropic.server_web_search`
2. exact live request results:
   - OpenAI exact request:
     - request id `req-b5e991a0-59b3-4d2c-8d00-326dc0bb4bb5`
     - completed with final cited answer in one `responses` request
   - Kimi exact request:
     - request id `req-ddf7ebee-8d94-4bb2-a2d2-0d1a089d492c`
     - emitted provider-native `"$web_search"` and recorded one passthrough tool
       execution
   - DeepSeek exact request:
     - request id `req-6799fee4-7c27-4919-8f8b-4000bc082bdc`
     - emitted runtime-managed `web_search` and recorded one runtime search execution

Result:

- the runtime now exposes the web-search capability distinction explicitly
- OpenAI and Kimi are modeled as native on the current transport
- DeepSeek remains eligible for web-search turns through runtime fallback, while the docs
  now state clearly that its provider-native web search is documented on the Anthropic /
  Claude Code transport instead
