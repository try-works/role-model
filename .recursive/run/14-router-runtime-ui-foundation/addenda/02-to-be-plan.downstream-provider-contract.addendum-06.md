Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T11:33:32Z`
LockHash: `0b3f0bb4e649b5178f77e465c00cd4a7be565b5d5d1d853ba81d590233c80e2d`
Addendum: `06`
Inputs:
- user request to audit vendored llama-swap vs role-model-router and expose a downstream-consumer provider surface
- `role-model-router/vendor/llama-swap/README.md`
- `role-model-router/vendor/llama-swap/proxy/proxymanager_api.go`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Playground.svelte`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.downstream-provider-contract.addendum-06.md`
Scope note: This addendum records the audit conclusion and implementation plan for exposing role-model as a downstream OpenAI-compatible provider.

## TODO

- [x] Record the scope expansion or repair without rewriting the locked base plan
- [x] Map the required product or architecture changes into concrete implementation slices
- [x] Capture sequencing, constraints, and focused validation expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Audit Summary

- Vendored `llama-swap` exposes a much broader local-model and operator surface than the repo-owned runtime shell currently exposes, including rerank, infill, speech, audio transcription, image generation, Stable Diffusion, model lifecycle APIs, metrics, captures, logs, SSE events, and a richer playground UI.
- The run-14 runtime host already exposes the core OpenAI-compatible surface needed for downstream consumption:
  - `GET /v1/models`
  - `POST /v1/chat/completions`
- The missing downstream-consumer gap is not the underlying inference route itself; it is the absence of a discoverable runtime-generated provider contract and a matching UI surface that tells operators exactly how to configure downstream tools such as opencode.
- Because the user asked specifically for downstream-provider onboarding, the highest-value slice is:
  1. publish a runtime endpoint that describes the OpenAI-compatible contract
  2. surface that contract in the operator UI
  3. document the broader llama-swap exposure audit and defer the larger vendor-parity backlog

## Target Outcome

An operator can open the runtime UI and copy a stable role-model provider contract for downstream OpenAI-compatible tools, while downstream apps can also fetch the same contract directly from the runtime as JSON.

## Planned Changes

1. Add failing tests for:
   - a new host-bridge endpoint that describes the downstream OpenAI-compatible contract
   - a runtime-ui API client for that endpoint
   - a runtime-ui guide/view-model helper used by the UI surface
2. Add a runtime-host endpoint:
   - `GET /api/role-model/downstream/openai`
   - response includes externally visible base URL, models/chat/health endpoints, auth guidance, and current model ids
3. Update the runtime UI to show:
   - the downstream provider JSON link
   - copyable base URL and endpoint rows
   - model list
   - generic OpenAI-compatible client steps with explicit opencode guidance
4. Keep the scope intentionally narrow:
   - do not attempt full llama-swap UI parity in this slice
   - do not add new inference endpoints beyond the downstream-provider contract
5. Validate with focused package tests/builds plus the existing runtime host/operations validators.

## Validation Plan

- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-operations`

## Traceability

- R3 runtime UI shell -> operators need a UI-visible downstream provider contract
- R4 runtime host bridge -> downstream apps need a runtime-generated OpenAI-compatible configuration descriptor
- Audit follow-up -> llama-swap capability gaps must be explicitly identified even when only one high-value slice is implemented now

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

