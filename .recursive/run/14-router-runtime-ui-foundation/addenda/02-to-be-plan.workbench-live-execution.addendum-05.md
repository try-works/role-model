Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `05`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/01.5-root-cause.workbench-live-execution.addendum-05.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.workbench-live-execution.addendum-05.md`
Scope note: This addendum plans the repair for generic fixture-backed workbench output.

## Root Cause Reference

Root cause identified in `01.5-root-cause.workbench-live-execution.addendum-05.md`:
- Kimi workbench execution still resolves a static response fixture
- OAuth-backed Kimi credentials are not yet used for live chat execution
- the OpenAI-compatible adapter must honor `openai.chat.completions` for Kimi

## Target Outcome

When the operator uses the workbench with an activated OAuth-backed Kimi endpoint, the response should vary with the prompt because the host bridge is issuing a real provider request with the stored Kimi access token and decoding the provider's actual reply.

## Planned Changes

1. Add failing regression coverage for:
   - async live routed execution in `adapter-execution`
   - OpenAI-compatible chat-completions request shaping in `provider-openai`
   - live Kimi execution in `runtime-host-bridge`
2. Add a live execution seam in `adapter-execution` that can perform a provider request instead of reading fixture captures.
3. Update `provider-openai` so request/response handling follows `target.requestShapeHints.providerShape`, including `openai.chat.completions` for Kimi.
4. Update `runtime-host-bridge` to:
   - resolve stored OAuth access tokens for Kimi accounts
   - materialize live authorization headers
   - send live Kimi `chat/completions` requests through `networkFetcher`
   - keep fixture fallback for older deterministic non-Kimi validation surfaces
5. Rerun focused package validation and capture implementation/test-summary addenda.

## Validation Plan

- `corepack pnpm --filter @role-model-router/adapter-execution test`
- `corepack pnpm --filter @role-model-router/adapter-execution build`
- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/provider-openai build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-operations`

## Traceability

- R3 provider onboarding/runtime execution -> workbench output must come from live Kimi provider responses
