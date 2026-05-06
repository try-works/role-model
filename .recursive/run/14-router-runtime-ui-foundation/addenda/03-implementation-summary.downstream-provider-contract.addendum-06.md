Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `06`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.downstream-provider-contract.addendum-06.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.downstream-provider-contract.addendum-06.md`
Scope note: This addendum records the downstream OpenAI-compatible provider contract implementation and the llama-swap exposure audit outcome for this slice.

## TDD Compliance Log

TDD Mode: strict

RED Evidence:
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-host-downstream-provider.addendum-06.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-ui-downstream-provider.addendum-06.log`

GREEN Evidence:
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-host-downstream-provider.addendum-06.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-ui-downstream-provider.addendum-06.log`

## Requirement

**Target behavior:** The runtime must expose a downstream-consumer provider contract for OpenAI-compatible apps, and the runtime UI must surface the same contract so operators can configure tools like opencode without guessing base URLs or endpoint paths.

**RED Phase**
- Added a runtime-host regression proving `GET /api/role-model/downstream/openai` must return a stable provider descriptor instead of `404`
- Added a runtime-ui API regression proving the client must fetch the downstream contract from the new host endpoint
- Added a runtime-ui guide regression proving the UI helper must generate stable connection rows and example commands

**GREEN Phase**
- Added `createDownstreamOpenAIProviderConfig(...)` to `role-model-router/apps/runtime-host-bridge/src/index.ts`
- Added request-aware base URL resolution so the host can emit a usable external base URL instead of a hardcoded path
- Registered the new runtime endpoint:
  - `GET /api/role-model/downstream/openai`
- Added `fetchDownstreamOpenAIProviderConfig(...)` to `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- Added `buildDownstreamProviderGuide(...)` to `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- Updated `role-model-router/apps/runtime-ui/app/routes/runtime.tsx` so the operator shell now shows:
  - the downstream provider JSON link
  - OpenAI-compatible base URL and endpoint rows
  - auth guidance and placeholder token note
  - available model ids and example `curl` commands
  - explicit downstream setup steps for tools like opencode

**REFACTOR Phase**
- Kept the downstream contract generation in the host helper layer so the request handler and UI client both stay thin
- Reused the existing model-list response as the source of truth for the downstream model inventory

## Audit Outcome

- Confirmed the vendored `llama-swap` app still exposes many surfaces the repo-owned shell does not yet expose, especially:
  - rerank / infill / image / audio / SDAPI endpoints
  - model unload and running-model lifecycle APIs
  - `/api/events`, `/api/metrics`, `/api/captures/:id`, `/logs`, `/logs/stream`, and `/ui`
  - richer playground tabs for chat, images, speech, transcription, and rerank
- Chose not to widen this slice to full llama-swap parity. The implemented cut focuses on the user-requested downstream-provider contract because it unlocks downstream consumption immediately without mixing in multiple unrelated operator features.

## Files Changed

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`

## Result

Run-14 now exposes a runtime-generated downstream OpenAI-compatible provider descriptor and surfaces it in the operator UI, so downstream consumers can configure role-model as a provider using a stable JSON contract instead of inferred endpoint knowledge.
