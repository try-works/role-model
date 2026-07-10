Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `14`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:51Z`
LockHash: `5aab9c60d4953ee49495a3ea7c60391b1d76fced3dba8a0aeeb6bace8295fa2d`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-native-streaming-parity.addendum-14.md`
- `.tmp/pi-ref/packages/ai/src/providers/openai-codex.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-codex-responses.ts`
- `.tmp/pi-ref/packages/ai/src/api/openai-responses-shared.ts`
Outputs:
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.codex-subscription-native-streaming-parity.addendum-14.md`
Scope note: No upstream Pi AI code and no upstream Craft code were modified. Role-Model runtime code was changed. Repo-owned `pi-role-model` verification support from earlier addenda remains in the worktree, but this addendum did not introduce consumer-specific runtime branches.

# Addendum 14 Implementation Summary

## TODO

- [x] Replace Codex app-server execution with native Codex Subscription Responses execution.
- [x] Learn the upstream Codex Subscription auth, request, header, and SSE stream contract from Pi AI source.
- [x] Keep provider identity as the actual provider, not execution library or consumer identity.
- [x] Keep LiteLLM and Codex Subscription execution surfaces out of provider classification.
- [x] Support routed streaming through aliases and exact model ids without making streaming a routing eligibility criterion.
- [x] Emit generic Chat Completions-compatible stream chunks for text, reasoning, and tool-call argument deltas.
- [x] Preserve request transcripts for non-streaming responses, request-detail telemetry, and validator corpus output.
- [x] Remove Codex app-server source references from the runtime host bridge.
- [x] Add TDD coverage for the late adapter-family and validator-corpus classification gaps found during verification.
- [x] Verify the rebuilt runtime with real Pi CLI and real Craft headless client requests.

## Implemented Changes

- `role-model-router/apps/runtime-host-bridge/src/index.ts` now uses a native Codex Subscription Responses adapter for `openai.personal.openai-codex-subscription.*` endpoints.
- The native adapter sends requests to `https://chatgpt.com/backend-api/codex/responses` with ChatGPT OAuth bearer auth, `chatgpt-account-id`, `OpenAI-Beta: responses=experimental`, SSE accept headers, and JSON content type.
- The adapter parses upstream SSE from `response.body` incrementally instead of buffering with `response.text()`.
- The adapter maps upstream Responses events into downstream OpenAI-compatible Chat Completions chunks for text deltas, reasoning deltas, function-call argument deltas, tool-call finalization, completion, incomplete, failed, and error cases.
- The adapter keeps a transcript accumulator while streaming so non-streaming responses and telemetry use the same normalized execution facts.
- Codex Subscription OAuth and refresh logic now uses the native OpenAI Codex OAuth/device-code contract learned from Pi AI, including the Codex client id and ChatGPT account claim.
- Codex app-server execution, auth/bootstrap, prompt, and dynamic-tool source references were removed from the runtime host bridge.
- Runtime telemetry now reports Codex Subscription execution as `providerId = openai`, `vendorId = chatgpt-codex-responses`, and `adapterFamily = codex-subscription-responses`.
- DeepSeek remains `providerId = deepseek` with `adapterFamily = ai-sdk-openai-compatible` and no LiteLLM/provider misclassification.
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` no longer rewrites Codex corpus observations back to `adapterFamily = ai-sdk-openai`.

## Late Verification Fixes

Two gaps were found after the first implementation and were fixed with new failing tests first:

- Runtime observation bundles still recorded Codex Subscription rows as `adapterFamily = ai-sdk-openai`. The fix introduced an effective adapter-family resolver for Codex Subscription execution receipts.
- The vendor validator corpus still normalized Codex corpus rows back to `adapterFamily = ai-sdk-openai`. The fix removed that special-case rewrite and made the corpus use the runtime observation's execution semantics directly.

## Identity Contract

- Provider identity is the real model provider: `openai`, `deepseek`, and similar.
- Vendor identity is the execution or upstream surface where that distinction is useful: `chatgpt-codex-responses`, `litellm`, `llama-swap`, and similar.
- Adapter identity is the runtime implementation family: `codex-subscription-responses`, `ai-sdk-openai-compatible`, `litellm-proxy`, and similar.
- Pi and Craft are consumers. They are not providers, vendors, adapters, endpoints, or routing modes.
- LiteLLM is a vendor/execution path, not a provider.
- `ai-sdk-openai` is an adapter family, not a provider.

## Requirement Mapping

- Native Codex Subscription execution: implemented through the ChatGPT backend Responses endpoint without Codex app-server execution.
- Streaming parity: implemented as an incremental SSE parser and normalized downstream stream writer path.
- Routing parity: verified through canonical aliases and exact model ids without stream support as an eligibility filter.
- Provider/vendor correctness: current telemetry proves OpenAI and DeepSeek as providers, with Codex Subscription as a vendor/upstream surface.
- Consumer compatibility: verified through real Pi CLI and real Craft headless client requests without upstream Pi or Craft code changes.
- Future proofing: execution identity is selected from endpoint/account metadata after routing, not from downstream consumer name, alias name, or provider-specific prompt hacks.

## TDD Compliance

- RED: `evidence/logs/addendum-14/red/codex-adapter-family-receipt.red.log`
- GREEN: `evidence/logs/addendum-14/green/codex-adapter-family-receipt.green.log`
- RED: `evidence/logs/addendum-14/red/validate-vendors-codex-adapter-family.red.log`
- GREEN: `evidence/logs/addendum-14/green/validate-vendors-codex-adapter-family.green.log`

TDD Compliance: PASS

## Coverage Gate

- [x] Codex app-server source removal is covered by a source guard and runtime tests.
- [x] Codex Subscription adapter-family receipts are covered by failing-then-passing tests.
- [x] Vendor validator corpus classification is covered by failing-then-passing tests.
- [x] Rebuilt runtime was packaged and launched on `127.0.0.1:3456`.
- [x] Pi verification used the real Pi CLI and canonical runtime alias `difficulty.remote-only`.
- [x] Craft verification used the real Craft headless runtime/client path and canonical runtime alias `difficulty.remote-only`.

Coverage: PASS

## Approval Gate

- [x] Implementation matches addendum 14's source-backed plan.
- [x] No Pi-specific or Craft-specific runtime behavior was introduced.
- [x] Provider, vendor, and adapter identity are specific and verifiable in telemetry.
- [x] Current runtime on `:3456` is the rebuilt binary from this worktree.

Approval: PASS
