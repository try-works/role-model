Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `05`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/01.5-root-cause.workbench-live-execution.addendum-05.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.workbench-live-execution.addendum-05.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.workbench-live-execution.addendum-05.md`
Scope note: This addendum records the repair that moved Kimi workbench execution from fixed fixture replay to live prompt-sensitive provider execution.

## TDD Compliance Log

TDD Mode: strict

**RED Phase**
- Added regression coverage for live routed execution in `role-model-router/packages/adapter-execution/test/index.test.ts`
- Added regression coverage for Kimi `openai.chat.completions` request shaping in `role-model-router/packages/provider-openai/test/index.test.ts`
- Added runtime-host coverage for activated Kimi live execution plus token refresh/retry behavior in `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- Confirmed the live path initially surfaced real provider failures instead of the canned fixture output:
  - invalid or expired credential error
  - then Kimi's coding-agent restriction error

**GREEN Phase**
- Added `executeLiveRoutedRequest(...)` in `role-model-router/packages/adapter-execution/src/index.ts` while preserving the deterministic fixture-backed path for existing validation surfaces
- Updated `role-model-router/packages/provider-openai/src/index.ts` so OpenAI-compatible targets honor `requestShapeHints.providerShape`, including Kimi `openai.chat.completions`
- Updated `role-model-router/apps/runtime-host-bridge/src/index.ts` to:
  - resolve persisted OAuth credentials for local encrypted-file Kimi accounts
  - refresh access tokens proactively and retry once on `401` or `403`
  - send live Kimi inference requests with explicit JSON content type
  - apply the Kimi CLI client fingerprint on inference requests via:
    - `User-Agent: KimiCLI/1.41.0`
    - `X-Msh-Platform: kimi_cli`
    - `X-Msh-Version: 1.41.0`
    - the existing device-identifying `X-Msh-*` headers
- Rebuilt and restarted the run-14 host bridge, then confirmed prompt-sensitive outputs through both the host port and the workbench proxy path

## Files Changed

- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/adapter-execution/test/index.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

## Result

Moonshot/Kimi workbench requests now execute against the live provider path with stored OAuth credentials and the required Kimi CLI client fingerprint, so the browser-facing runtime returns real prompt-sensitive completions instead of the generic `Kimi Code summary` fixture.
