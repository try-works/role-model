Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T11:33:32Z`
LockHash: `e5a9d1380badfe40482d23f21005dda67a2e7bc41e2d62b7df69e12efa67a82b`
Addendum: `04`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/01.5-root-cause.kimi-workbench-500.addendum-04.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.kimi-workbench-500.addendum-04.md`
Scope note: This addendum plans the Kimi workbench 500 repair after the browser-open OAuth change.

## TODO

- [x] Record the scope expansion or repair without rewriting the locked base plan
- [x] Map the required product or architecture changes into concrete implementation slices
- [x] Capture sequencing, constraints, and focused validation expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Root Cause Reference

Root cause identified in `01.5-root-cause.kimi-workbench-500.addendum-04.md`:
- Kimi routes correctly select the activated Moonshot endpoint
- execution then fails because `ai-sdk-openai-compatible` is not registered in the adapter list
- the existing OpenAI request/response adapter logic is reusable for this provider family

## Target Outcome

Workbench requests against activated Kimi Code endpoints should execute successfully through the same runtime routing stack as OpenAI endpoints, without mutating catalog metadata or special-casing Kimi in the UI.

## Planned Changes

1. Add failing regression coverage for:
   - creating an OpenAI adapter for `ai-sdk-openai-compatible`
   - executing chat completions through an activated Kimi Code endpoint in the runtime host bridge
2. Update the shared OpenAI adapter factory so it can be instantiated for alternate adapter-family strings while keeping its request/response semantics unchanged.
3. Register the compatible OpenAI adapter family in:
   - `apps/runtime-host-bridge/src/index.ts`
   - `packages/adapter-execution/src/cli.ts`
4. Add Moonshot/Kimi response-capture entries to the fixture map used by the current runtime shell so activated Kimi endpoints have an execution payload.
5. Rerun focused provider-openai and runtime-host-bridge validation, then capture implementation/test-summary addenda and GREEN logs.

## Validation Plan

- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/provider-openai build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-operations`

## Traceability

- R3 provider onboarding/runtime execution -> activated Kimi endpoints must be runnable from workbench

## Coverage Gate

- [x] Addendum scope is grounded in the locked base plan and effective inputs
- [x] Concrete implementation slices or constraints are recorded in the addendum body
- [x] Focused validation expectations or follow-on receipt obligations are captured

Coverage: PASS

## Approval Gate

- [x] The plan addendum names the concrete repair or expansion scope
- [x] Sequencing or dependency constraints are explicit where needed
- [x] The addendum is ready to guide paired implementation and validation receipts

Approval: PASS

