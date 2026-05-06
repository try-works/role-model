Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `04`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/01.5-root-cause.kimi-workbench-500.addendum-04.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.kimi-workbench-500.addendum-04.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.kimi-workbench-500.addendum-04.md`
Scope note: This addendum records the Kimi workbench 500 repair.

## TDD Compliance Log

TDD Mode: strict

RED Evidence:
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/provider-openai-kimi-compatible.addendum-04.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-host-kimi-workbench.addendum-04.log`

GREEN Evidence:
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/provider-openai-kimi-compatible.addendum-04.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-host-kimi-workbench.addendum-04.log`

## Requirement

**Target behavior:** Workbench requests targeting the activated Kimi Code endpoint should execute without returning a 500 from `/v1/chat/completions`.

**RED Phase**
- Added provider-openai regression coverage proving the OpenAI adapter can be instantiated for `ai-sdk-openai-compatible`
- Added runtime-host-bridge regression coverage proving an activated Kimi Code endpoint must execute through the real backend path
- Confirmed the original failure was `No provider adapter is registered for ai-sdk-openai-compatible`
- Confirmed the tightly-coupled follow-on failure was `No response capture is configured for endpoint moonshot.personal.kimi-code.global.kimi-k2.5`

**GREEN Phase**
- Updated `packages/provider-openai/src/index.ts` so the existing OpenAI adapter can be instantiated for alternate adapter-family strings and so request/response capture metadata follows the target family
- Registered the compatible OpenAI adapter alias in:
  - `apps/runtime-host-bridge/src/index.ts`
  - `packages/adapter-execution/src/cli.ts`
- Added Moonshot/Kimi capture coverage in `testdata/router-runtime/adapter-captures.json`
- Added a dedicated Kimi-compatible response fixture in `testdata/router-runtime/adapter-kimi-response.json`
- Restarted the live run-14 host on port `8192` and verified Kimi chat completions return 200 directly and through the `4280` proxy used by the workbench

## Files Changed

- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/adapter-execution/src/cli.ts`
- `testdata/router-runtime/adapter-captures.json`
- `testdata/router-runtime/adapter-kimi-response.json`

## Result

Activated Moonshot/Kimi endpoints now resolve to a registered OpenAI-compatible adapter family and have a fixture-backed execution capture, so workbench chat requests complete successfully instead of failing at adapter/capture resolution.
