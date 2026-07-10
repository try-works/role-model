Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `15`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:47Z`
LockHash: `f1f64c240b0fe5892db2dcd70ddbc50a6d18e6ef8859b953796169cbff0f34e2`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.codex-assistant-history-content-parts.addendum-15.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-assistant-history-content-parts.addendum-15.md`
Scope note: Plans the strict-TDD repair for role-aware Chat Completions to Responses content-part conversion.

# Addendum 15 Plan: Codex Responses Assistant History Content Parts

## TODO

- [x] Define the role-aware conversion behavior.
- [x] Define RED/GREEN test evidence paths.
- [x] Define rebuilt-runtime and real Pi CLI verification for multi-turn history.

## Objective

Repair native Codex Subscription request conversion so OpenAI-compatible chat history can be routed through aliases and exact endpoints without invalid Responses content-part types.

The concrete user-visible fix is that multi-turn Pi sessions using `difficulty.remote-only` must not fail with:

`400 Invalid value: 'input_text'. Supported values are: 'output_text' and 'refusal'.`

## Implementation Plan

1. Add a failing unit test for the exact replay shape:
   - input: chat-completions `messages` containing `user`, `assistant`, `user`
   - expected Responses input: user text as `input_text`, assistant text as `output_text`, next user text as `input_text`
   - evidence: `evidence/logs/addendum-15/red/codex-assistant-history-output-text.red.log`

2. Make `toCodexResponsesContentPart` role-aware:
   - `user` text and chat `text` parts become `input_text`
   - `assistant` text and chat `text` parts become `output_text`
   - assistant `refusal` parts stay `refusal`
   - already-valid assistant `output_text` stays `output_text`
   - already-valid user `input_text` stays or normalizes to `input_text`
   - user `image_url` stays convertible to Responses `input_image`
   - no consumer, alias, provider, or model special-casing

3. Keep scope limited:
   - do not modify Pi code
   - do not modify Craft code
   - do not reintroduce Codex app server execution
   - do not treat streaming support as a routing eligibility condition

## TDD Verification

Required automated checks:

- RED: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription request conversion preserves assistant history as output_text"`
- GREEN: same command passes after production change
- Focused Codex regression: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription"`
- Type check: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc --noEmit --pretty false`

## Rebuilt Runtime Verification

After tests pass:

1. Rebuild the runtime package with the repository packaging command.
2. Stop stale `role-model-runtime.exe` listeners on `127.0.0.1:3456`.
3. Launch the rebuilt runtime from this worktree on `127.0.0.1:3456`.
4. Verify `/healthz` reports healthy and ready.

## Live Verification

Pi CLI verification must use the real Pi CLI and a persistent session path so assistant history is replayed:

- exact Codex Subscription target: `chatgpt/gpt-5.4`
- routed alias: `difficulty.remote-only`
- at least two turns per session
- second turn must reuse the same Pi session
- expected: no `input_text` 400 on assistant history
- expected: telemetry shows a successful Codex Subscription execution for the exact target and at least one successful alias-routed execution

Craft verification should confirm the generic runtime path remains compatible:

- send a multi-turn Craft runtime request through `difficulty.remote-only` if the headless Craft helper is available
- otherwise run the OpenAI-compatible runtime history request directly and record Craft headless as not rerun in this addendum

## Acceptance Criteria

- The failing test proves the old converter emitted invalid assistant `input_text`.
- The green test proves assistant history is emitted as Responses `output_text`.
- The rebuilt runtime on `127.0.0.1:3456` contains the fix.
- Real Pi CLI multi-turn requests no longer produce the screenshot error.
- Telemetry shows the Codex Subscription provider as `openai`, not `litellm`, and LiteLLM remains classified as a vendor/execution path only.

## Coverage Gate

- [x] Plan covers the exact assistant-history `input_text` failure.
- [x] Plan preserves user image/file input semantics and assistant output/refusal semantics.
- [x] Plan includes TDD, rebuilt-runtime verification, and real Pi CLI multi-turn verification.

Coverage: PASS

## Approval Gate

- [x] Plan is specific and verifiable.
- [x] Plan is consumer-agnostic and provider-agnostic.
- [x] Ready for implementation.

Approval: PASS

Audit: PASS
