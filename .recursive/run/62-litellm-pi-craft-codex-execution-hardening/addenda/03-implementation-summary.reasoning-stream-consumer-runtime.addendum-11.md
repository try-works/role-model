Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `11`
Status: `LOCKED`
LockedAt: `2026-07-10T04:23:31Z`
LockHash: `69c9acbcbd1fa33701d1dd68617bbe4c224fb5fe986578e7367322744de5bd30`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Lock note: `scripts/recursive-lock.py` is not present in this worktree; audit, coverage, and approval gates are included and pass, but formal lock metadata was not applied.
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-consumer-runtime.addendum-11.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/red/provider-openai-chat-reasoning.red.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/red/host-bridge-chat-reasoning-stream.red.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/red/runtime-observability-reasoning-receipt.red.log`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.reasoning-stream-consumer-runtime.addendum-11.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/scripts/craft-headless-verify.mjs`
Scope note: This implementation changes Role-Model runtime behavior only. No Pi upstream code and no Craft upstream code were modified. The repo-owned `packages/pi-role-model` package did not require code changes.

# Addendum 11 Implementation Summary

## TODO

- [x] Preserve RED evidence before production changes.
- [x] Extend Chat Completions ingress to carry provider-neutral reasoning controls.
- [x] Forward compatible reasoning controls through provider-openai chat-completions execution.
- [x] Preserve and emit OpenAI-compatible reasoning stream deltas without consumer-specific branches.
- [x] Add observability/request-detail receipt fields for reasoning stream diagnosis.
- [x] Keep provider, vendor, adapter, and execution identity separated.
- [x] Avoid Pi-specific, Craft-specific, model-specific, or provider-hack implementations.
- [x] Keep normal content streaming and non-reasoning clients backward-compatible.

## Implemented Changes

- `role-model-router/apps/runtime-host-bridge/src/index.ts` now accepts Chat Completions reasoning controls from generic OpenAI-compatible request bodies: `reasoning_effort`, `reasoning`, and `thinking`.
- Chat Completions and Responses now share reasoning extraction through a provider-neutral execution request shape.
- Runtime stream metadata now records whether reasoning was requested, whether controls were forwarded, how many reasoning deltas were observed, whether reasoning was suppressed, and why reasoning was unavailable.
- Leading reasoning-only upstream SSE chunks are suppressed only for downstream requests that did not opt into reasoning. Reasoning-capable requests preserve upstream `choices[].delta.reasoning_content`.
- Synthetic Chat Completions streaming now emits `choices[].delta.reasoning_content` before assistant-visible content when the normalized provider result contains reasoning text.
- `role-model-router/packages/provider-openai/src/index.ts` now forwards chat-completions reasoning controls to compatible OpenAI/OpenAI-compatible provider paths without classifying adapters or vendors as providers.
- `role-model-router/packages/runtime-observability/src/index.ts` now exposes a reasoning stream receipt for request-detail and telemetry diagnosis.
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/scripts/craft-headless-verify.mjs` now accepts `CRAFT_VERIFY_THINKING_LEVEL` so live Craft verification can exercise the same model/session path while keeping Craft upstream read-only.

## Taxonomy Preservation

- Provider identity remains the actual provider, for example `openai` or `deepseek`.
- Vendor identity remains the execution/vendor path, for example `codex-app-server` when the OpenAI Codex Subscription app-server path is used.
- Adapter identity remains the adapter implementation, for example `ai-sdk-openai` or `ai-sdk-openai-compatible`.
- LiteLLM is not classified as a provider. It remains a vendor/execution path when used.
- Pi and Craft are consumers. They are not providers, vendors, or routing endpoints.

## TDD Compliance

- RED: `evidence/logs/addendum-11/red/provider-openai-chat-reasoning.red.log`
- RED: `evidence/logs/addendum-11/red/host-bridge-chat-reasoning-stream.red.log`
- RED: `evidence/logs/addendum-11/red/runtime-observability-reasoning-receipt.red.log`
- GREEN: `evidence/logs/addendum-11/green/provider-openai-chat-reasoning.green.log`
- GREEN: `evidence/logs/addendum-11/green/host-bridge-chat-reasoning-stream.green.log`
- GREEN: `evidence/logs/addendum-11/green/runtime-observability-reasoning-receipt.green.log`
- GREEN: `evidence/logs/addendum-11/green/host-bridge-after-reasoning-receipt.green.log`
- GREEN: `evidence/logs/addendum-11/green/biome-touched.green.log`
- GREEN: `evidence/logs/addendum-11/green/biome-touched.post-type.green.log`

TDD Compliance: PASS

## Requirement Mapping

- `R0`: provider/vendor/execution/adapter identity remains explicit in request details and telemetry.
- `R1`: Chat Completions now carries reasoning controls into the shared execution path.
- `R2`: Pi and Craft compatibility is provided by generalized OpenAI-compatible runtime behavior, not upstream client patches.
- `R3`: DeepSeek remains provider identity even when an OpenAI-compatible adapter or LiteLLM-style execution path is involved.
- `R4`: Codex Subscription GPT reasoning is truthfully represented. If no reasoning deltas are returned, the runtime records `provider_returned_no_reasoning` instead of fabricating thinking.
- `R8`: request-detail and telemetry expose reasoning request, forwarding, delta count, suppression, and unavailable-reason facts.
- `R9`: verification uses canonical runtime aliases including `difficulty.remote-only` and `baseline.remote-only`.
- `R10`: rebuilt-runtime verification is recorded under addendum 11 live evidence.
- `R11`: focused tests, critical runtime tests, packaging validation, vendor validation, and local CI were run.

## Risk Review

- GPT through the Codex Subscription path returned ordinary content but did not expose reasoning deltas in the live verification. The runtime now records that explicitly and does not synthesize fake reasoning.
- Craft headless verification did not send reasoning controls on the observed `pi_compat` path. Role-Model still preserved DeepSeek upstream reasoning deltas when the provider emitted them.
- Initial Pi CLI batch evidence contained invalid early launch attempts. Valid Pi evidence is the `*.rerun.summary.json` set and the latest request-detail summaries.
- Two `role-model-router/vendor/llama-swap/dist-assets/win32-x64/*` binary artifacts remain modified by the packaging/runtime workflow. They are not part of the addendum 11 code change and were not reverted.

## Coverage Gate

- [x] Implementation is covered by RED tests written before production changes.
- [x] Changes are generic Role-Model runtime behavior.
- [x] No Pi upstream or Craft upstream code was modified.
- [x] No invented aliases were used for verification.
- [x] Reasoning stream behavior is observable without raw log scraping.

Coverage: PASS

## Approval Gate

- [x] Implementation matches the addendum 11 plan.
- [x] The change is bounded to runtime/provider/observability paths and verification harness support.
- [x] The solution preserves downstream compatibility by using OpenAI-compatible SSE fields.
- [x] Known provider limitations are recorded instead of hidden or faked.

Approval: PASS
