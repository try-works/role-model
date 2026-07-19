Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `08`
Status: `LOCKED`
LockedAt: `2026-07-08T16:08:00Z`
LockHash: `bb91b92363a4f48128747ef7163b4c18875c5612aa31feb0539c3abe6f56c398`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-08.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-08/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-08.md`
Scope note: This addendum records the generic OpenAI-compatible provider/consumer remediation implemented after the live Pi/Craft slowness investigation. Pi, Craft, and LiteLLM were used as reference and verification surfaces only; Role-Model runtime code was not specialized for those client or vendor names.

## TODO

- [x] Preserve the provider/vendor/adapter boundary in the implementation plan and code
- [x] Add RED tests before production edits for alias overclassification and stream lifecycle defects
- [x] Propagate downstream cancellation into provider/vendor execution paths
- [x] Make SSE forwarding backpressure-aware and fail closed on downstream writer errors
- [x] Avoid Codex/GPT first-attempt preference from declared default tools alone
- [x] Verify through real Pi CLI and real Craft client requests against the rebuilt runtime

## Implemented Boundary

The implementation stays generic:

- `providerId` and `providerFamily` continue to identify the actual provider, for example `openai` or `deepseek`.
- Execution intermediaries stay separate as `vendorId`, `executionFamily`, and `adapterFamily`; `litellm`, `ai-sdk-openai`, and `codex-app-server` are not providers.
- OpenAI-compatible consumers may declare default tools, stream, abort, request aliases, or request exact model ids without triggering client-name branches.
- Declared/default tools are not treated as active tool intent unless the turn contains actual tool-use signals or concrete coding/workspace intent.

## Code Changes

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - added downstream close/abort handling for `/v1/chat/completions` and `/v1/responses`
  - added `BridgeClientDisconnectedError`, abort-signal merging, and backpressure-aware SSE writes
  - passed abort signals into routed execution, direct provider execution, and vendor execution
  - stopped swallowing downstream stream-writer failures except malformed provider JSON parsing
  - exported and tightened `shouldPreferOpenAICodexSubscriptionForTurn()` so declared default tools alone do not force the Codex/GPT path
- `role-model-router/packages/vendor-abstraction/src/index.ts`
  - added `abortSignal?: AbortSignal` to vendor request options
- `role-model-router/packages/vendor-litellm/src/index.ts`
  - forwarded abort signals into the LiteLLM-backed fetch path
- `role-model-router/packages/vendor-llama-swap/src/index.ts`
  - forwarded abort signals into the llama-swap fetch path
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - added regression coverage for declared default tools, downstream abort cleanup, and stream-writer propagation

## TDD Evidence

RED:
- `evidence/logs/addendum-08/red/host-bridge-routing-stream-red.log`
- `evidence/logs/addendum-08/red/direct-provider-stream-writer-red.log`

GREEN:
- `evidence/logs/addendum-08/green/host-bridge-routing-stream-green.log`
- `evidence/logs/addendum-08/green/direct-provider-stream-writer-green.log`
- `evidence/logs/addendum-08/green/host-bridge-full-failure-recheck.log`

Automated validation:
- `evidence/logs/addendum-08/automated/runtime-host-bridge-index-test-rerun.log`
- `evidence/logs/addendum-08/automated/runtime-host-bridge-build-rerun.log`
- `evidence/logs/addendum-08/automated/vendor-litellm-build.log`
- `evidence/logs/addendum-08/automated/vendor-litellm-test.log`
- `evidence/logs/addendum-08/automated/vendor-llama-swap-build.log`

TDD Compliance: PASS

## Live Verification Summary

- Real Pi CLI `difficulty.remote-only` completed with `PI_ALIAS2_OK` in `8868ms`.
- Real Pi CLI `baseline.remote-only` completed with `PI_BASELINE_OK` in `18298ms`.
- Real Pi CLI exact `chatgpt/gpt-5.4` completed with `PI_GPT_OK` in `10132ms`.
- Real Pi CLI exact `deepseek/deepseek-v4-pro` completed with `PI_DEEPSEEK_OK` in `6587ms`.
- Real Craft headless client alias `difficulty.remote-only` completed with `CRAFT_ALIAS_OK` in `11514ms`.
- Real Craft headless client exact `deepseek/deepseek-v4-pro` completed with `CRAFT_DEEPSEEK_OK` in `9344ms`.
- Post-client direct runtime checks returned `RUNTIME_RESPONSIVE_OK` and `POST_PI_RESPONSIVE_OK`.
- The isolated Craft verification process tree was stopped after proof; final process evidence shows no remaining `.tmp-craft-headless` processes.

## Requirement Delta

- `R2` | Status: `implemented` | declared default tools no longer imply active tool/coding intent by themselves
- `R3` | Status: `implemented` | downstream disconnect/backpressure handling is generic across OpenAI-compatible streamed clients
- `R4` | Status: `implemented` | Codex/GPT first-attempt preference is no longer based only on default tool declaration
- `R8` | Status: `implemented` | provider/vendor/adapter identity remains separated in live telemetry
- `R9` | Status: `verified locally` | real Pi CLI and real Craft client proofs are captured under addendum-08 evidence
- `R10` | Status: `verified locally` | rebuilt runtime on `:3456` remained responsive after live client traffic
- `R11` | Status: `pending external CI` | local focused suites, builds, and rebuilt-runtime verification passed; GitHub CI is not run from this worktree

## Coverage Gate

- [x] Implementation follows the addendum-08 generic provider/consumer boundary
- [x] TDD RED and GREEN evidence exists for the production behavior changes
- [x] Live verification used the real Pi CLI and real Craft client paths
- [x] Rebuilt runtime responsiveness and process cleanup are documented

Coverage: PASS

## Approval Gate

- [x] No client-specific runtime branch was added
- [x] Provider identity is not conflated with LiteLLM or AI SDK execution paths
- [x] Exact-model and alias paths were both verified
- [x] The remaining external CI gap is explicit

Approval: PASS

## Audit Verdict

Audit: PASS
