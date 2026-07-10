Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `11`
Status: `LOCKED`
LockedAt: `2026-07-10T04:23:27Z`
LockHash: `b315589b8fd65f3eaafc05dae178992fee1a0405ec0e8701de7cf439df6e84b3`
Workflow version: `recursive-mode-audit-v1`
Lock note: `scripts/recursive-lock.py` is not present in this worktree; audit, coverage, and approval gates are included and pass, but formal lock metadata was not applied.
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.pi-cooldown-retry.addendum-10.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `packages/pi-role-model/src/runtime-discovery.ts`
- `packages/pi-role-model/src/runtime-inspection.ts`
- Pi installed consumer reference, read-only: `D:/pi/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/api/openai-completions.js`
- Pi installed consumer reference, read-only: `D:/pi/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-agent-core/dist/agent-loop.js`
- Craft installed consumer reference, read-only: `C:/Users/erikb/AppData/Local/Programs/@craft-agentelectron/resources/app/packages/shared/src/unified-network-interceptor.ts`
- Craft installed consumer reference, read-only: `C:/Users/erikb/AppData/Local/Programs/@craft-agentelectron/resources/app/packages/shared/src/renderer/event-processor/types.ts`
- Craft installed consumer reference, read-only: `C:/Users/erikb/AppData/Local/Programs/@craft-agentelectron/resources/app/packages/shared/src/renderer/event-processor/handlers/text.ts`
- Craft installed runtime reference, read-only: `C:/Users/erikb/AppData/Local/Programs/@craft-agentelectron/resources/app/dist/main.cjs`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-consumer-runtime.addendum-11.md`
Scope note: This addendum defines the TDD-backed remediation plan for reasoning/thinking stream preservation through the Role-Model runtime and live verification through the real Pi CLI and real Craft runtime. Pi upstream and Craft upstream are read-only references. Code changes are limited to Role-Model runtime code and, only if proven necessary, the repo-owned `packages/pi-role-model` integration package.

# Addendum 11 Reasoning Stream Consumer Runtime Plan

## TODO

- [x] Record the no-Pi-upstream and no-Craft-upstream modification boundary.
- [x] Separate Pi CLI verification from Craft runtime verification.
- [x] Require canonical runtime aliases, especially `difficulty.remote-only`.
- [x] Define standard OpenAI-compatible reasoning stream behavior without consumer-specific branches.
- [x] Define strict RED/GREEN TDD slices before any production code changes.
- [x] Require rebuilt-runtime verification on `127.0.0.1:3456`.
- [x] Require live verification through the real Pi CLI and the real Craft runtime/client.
- [x] Require evidence that no background process is disturbing the target runtime.

## Change Boundary

Allowed mutable product paths:

- `role-model-router/apps/runtime-host-bridge/**`
- `role-model-router/packages/provider-openai/**`
- `role-model-router/packages/adapter-execution/**` only if the shared execution contract lacks a necessary reasoning-stream field
- `role-model-router/packages/runtime-observability/**`
- `role-model-router/packages/sqlite-memory/**`
- `packages/pi-role-model/**` only for repo-owned discovery, runtime-inspection, or additive compatibility with Role-Model's own APIs

Read-only reference paths:

- `D:/pi/**`
- `C:/Users/erikb/AppData/Local/Programs/@craft-agentelectron/**`
- `C:/Users/erikb/.craft-agent/**`, except transient isolated state or logs created for verification

Forbidden implementation paths:

- Do not modify Pi upstream code.
- Do not modify Craft upstream code.
- Do not add Pi-specific branches to Role-Model stream handling.
- Do not add Craft-specific branches to Role-Model stream handling.
- Do not invent aliases for verification.
- Do not classify LiteLLM, `ai-sdk-openai`, or Craft/Pi adapters as providers.
- Do not synthesize fake reasoning for providers that do not expose reasoning text.

`packages/pi-role-model` is in scope only because it is repo-owned. It may be changed only if the live Pi CLI evidence proves the Role-Model package's discovery or inspection contract is stale relative to the runtime. It must not become a workaround for Pi CLI streaming behavior or a replacement for fixing Role-Model's OpenAI-compatible SSE output.

## Consumer Reference Findings

Pi and Craft are separate downstream consumers. They must not be combined into one verification session, and a Craft-internal Pi-compatible adapter should be treated only as Craft implementation detail.

Pi installed code expectations:

- Pi's OpenAI Completions transport sends `stream: true` and includes usage stream options.
- Pi can send `reasoning_effort` and related reasoning controls when model metadata says reasoning is supported.
- Pi maps OpenAI-compatible streaming deltas named `reasoning_content`, `reasoning`, or `reasoning_text` into `thinking_delta`.
- Pi's agent loop propagates `thinking_delta` as intermediate message updates.
- Pi's Role-Model configuration uses `http://127.0.0.1:3456/v1` and aliases such as `difficulty.remote-only` with reasoning enabled.

Craft installed code expectations:

- Craft's Role-Model connection points at `http://127.0.0.1:3456/v1` with `difficulty.remote-only` as the configured model.
- Craft uses OpenAI-compatible chat-completions transport for the Role-Model connection.
- Craft's network interceptor generally passes through non-tool SSE events.
- Craft renderer types distinguish ordinary text deltas from intermediate text blocks, but the installed app may not render every raw reasoning delta unless its adapter maps it into its expected event shape.
- If Role-Model emits correct OpenAI-compatible `choices[].delta.reasoning_content` and Craft still does not render progress, that is a downstream rendering finding. This run must not patch Craft to compensate.

Role-Model current-risk areas:

- Chat Completions ingress must preserve downstream reasoning controls such as `reasoning_effort`, `reasoning`, and `thinking`, not only Responses ingress.
- Provider request builders must forward reasoning controls on compatible OpenAI-compatible chat-completions paths when the selected endpoint supports them.
- Streaming response normalization must preserve upstream reasoning deltas as OpenAI-compatible `choices[].delta.reasoning_content` when downstream requested or advertised reasoning support.
- Leading reasoning-only chunks must not be unconditionally suppressed for consumers that opted into reasoning streams.
- Fallback synthetic streaming must include reasoning deltas when the normalized provider result contains reasoning text and the downstream stream contract allows them.

## Target Behavior

Role-Model must expose a generalized OpenAI-compatible reasoning-stream contract:

- If a downstream request opts into reasoning through model selection, request controls, or known discovery metadata, Role-Model must preserve valid upstream reasoning deltas as SSE chunks with `choices[].delta.reasoning_content`.
- Role-Model may additionally preserve provider-native aliases internally, but downstream wire output should use stable OpenAI-compatible fields. Custom consumer-specific SSE event types are forbidden.
- `choices[].delta.content` must remain ordinary assistant-visible content. Hidden reasoning must not be moved into content to force UI rendering.
- If the selected provider or execution path does not expose reasoning text, Role-Model must not fabricate it. Instead, request detail and telemetry should record why reasoning streaming was unavailable.
- Exact-model requests and alias requests must use the same stream-normalization behavior after routing. Alias `difficulty.remote-only` is the primary verification target.
- Reasoning controls are capability requirements. If a request requires reasoning control and no endpoint can satisfy it, routing should produce a structured `no_eligible_target` outcome rather than selecting an incompatible endpoint.
- Provider identity remains actual provider identity: `openai`, `deepseek`, or another provider. LiteLLM and `ai-sdk-openai` remain vendor/adapter/execution-path facts.

The expected GPT/Codex behavior must be explicit:

- If Codex Subscription GPT returns reasoning deltas, Role-Model must forward them as `reasoning_content`.
- If Codex Subscription GPT does not expose reasoning deltas on the current execution path, Role-Model must still stream ordinary content promptly when available and record `reasoningUnavailableReason`.
- A lack of visible GPT thinking in Pi or Craft is acceptable only when wire evidence proves no upstream reasoning deltas were available. It is not acceptable when Role-Model received reasoning deltas and suppressed or dropped them.

## Root-Cause Confirmation Plan

Before implementation, Phase 3 must add RED tests that fail on the current behavior. If those tests do not reproduce the issue, stop and create a Phase 1.5 addendum instead of changing production code.

Minimum root-cause questions:

- Does Chat Completions ingress preserve `reasoning_effort`, `reasoning`, and `thinking` into the shared execution request?
- Does provider-openai forward chat-completions reasoning controls to DeepSeek/OpenAI-compatible providers when endpoint capabilities allow them?
- Does the provider stream reader retain upstream `delta.reasoning_content` before assistant-visible content arrives?
- Does the chat-completions SSE writer emit downstream `delta.reasoning_content` chunks?
- Does any runtime path suppress leading reasoning-only chunks even when downstream opted into reasoning?
- Do request detail and telemetry distinguish `reasoningRequested`, `reasoningControlForwarded`, `reasoningDeltaCount`, and `reasoningUnavailableReason`?

## Strict TDD Plan

TDD Mode for implementation: `strict`

No production code may be changed until the matching RED test has been run, failed for the expected reason, and the failure log is recorded under:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/red/`

Passing GREEN logs must be recorded under:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/green/`

### TDD Slice A: Chat Completions Reasoning Controls

RED:

- Extend `role-model-router/apps/runtime-host-bridge/test/index.test.ts`.
- Add a request-mapping test proving `/v1/chat/completions` preserves `reasoning_effort`.
- Add request-mapping coverage for provider-neutral `reasoning` and `thinking` bodies where currently accepted by compatible OpenAI-style clients.
- Assert the mapped execution request carries a generic `reasoning` contract rather than Pi or Craft specific fields.
- Run `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`.

GREEN:

- Extend the Chat Completions request body type and mapper in `runtime-host-bridge`.
- Reuse the existing provider-neutral reasoning contract where possible.
- Keep Responses reasoning behavior unchanged.

### TDD Slice B: Provider Request Shaping

RED:

- Extend `role-model-router/packages/provider-openai/test/index.test.ts`.
- Assert chat-completions request building forwards compatible reasoning controls for OpenAI-compatible providers.
- Assert the forwarded payload is generic and keyed by provider capability/request shape, not by consumer name.
- Assert DeepSeek-compatible reasoning uses the standard OpenAI-compatible `reasoning_effort` or accepted provider control shape when available.
- Run `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts`.

GREEN:

- Update provider-openai chat-completions request construction to consume the generic `reasoning` execution contract.
- Preserve Responses request handling.
- Do not classify LiteLLM as provider when execution travels through LiteLLM.

### TDD Slice C: Upstream Reasoning Delta Preservation

RED:

- Extend `role-model-router/apps/runtime-host-bridge/test/index.test.ts`.
- Feed a fake upstream SSE transcript with leading `choices[].delta.reasoning_content` followed by visible content.
- Assert the provider transcript reader records the reasoning text and counts reasoning deltas.
- Assert leading reasoning-only chunks are not dropped when the downstream request opted into reasoning.
- Assert leading reasoning-only chunks remain safely suppressible when the downstream request did not opt into reasoning.
- Run `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`.

GREEN:

- Make reasoning-only suppression opt-in and capability-aware.
- Preserve stream safety for consumers that did not request or advertise reasoning.
- Avoid custom SSE event types.

### TDD Slice D: Downstream Chat Completions SSE Output

RED:

- Extend `role-model-router/apps/runtime-host-bridge/test/index.test.ts`.
- Assert direct provider-stream passthrough emits `choices[].delta.reasoning_content` for reasoning deltas.
- Assert synthetic stream creation emits `choices[].delta.reasoning_content` before visible content when the normalized result contains reasoning text and reasoning output is allowed.
- Assert no hidden reasoning appears in `choices[].delta.content`.
- Run `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`.

GREEN:

- Update chat-completions stream chunk creation and stream normalization.
- Keep tool-call streaming and ordinary content streaming unchanged.

### TDD Slice E: Observability and Request Detail

RED:

- Extend `role-model-router/packages/runtime-observability/test/index.test.ts`.
- Extend `role-model-router/packages/sqlite-memory/test/index.test.ts` only if persistence needs additive fields.
- Extend host-bridge request-detail tests if the API reconstruction layer needs coverage.
- Assert request receipts can expose:
  - `reasoningRequested`
  - `reasoningControlForwarded`
  - `reasoningDeltaCount`
  - `reasoningOutputTokens` when measurable
  - `reasoningStreamSuppressed`
  - `reasoningUnavailableReason`
- Assert provider, vendor, execution, and adapter identities remain separate.
- Run:
  - `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
  - `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`

GREEN:

- Add only the smallest receipt fields required for debugging reasoning-stream behavior.
- Prefer observation-bundle/request-detail fields unless aggregate querying is clearly useful.
- Keep old telemetry rows backward-compatible.

### TDD Slice F: Alias Routing Regression Harness

RED:

- Extend `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` or the closest existing vendor corpus anchor.
- Add deterministic cases for canonical aliases:
  - `difficulty.remote-only`
  - `baseline.remote-only`
- Cases must assert alias routing uses configured alias definitions and actual endpoint provider identity.
- Cases must prove reasoning controls survive alias routing to the selected endpoint.
- Run `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts`.

GREEN:

- Update the deterministic corpus and result schema if needed.
- Do not create new aliases solely for testing.

### TDD Slice G: Repo-Owned Pi Package Compatibility, Only If Needed

RED:

- Use this slice only if live or automated evidence proves `packages/pi-role-model` cannot consume the additive Role-Model runtime receipts or discovery fields.
- Extend `packages/pi-role-model` tests for discovery or inspection compatibility.
- Run `corepack pnpm --filter @try-works/pi-role-model run test`.

GREEN:

- Make additive repo-owned `pi-role-model` changes only for discovery or inspection.
- Do not change Pi CLI transport behavior.
- Do not add Pi-specific stream transformation in Role-Model.

## Implementation Plan

1. Add RED tests for Chat Completions reasoning controls.
2. Add RED tests for provider-openai chat-completions reasoning forwarding.
3. Add RED tests for upstream reasoning delta preservation and downstream SSE emission.
4. Add RED tests for reasoning observability/request-detail fields.
5. Add RED alias-routing corpus coverage using existing runtime aliases.
6. Implement the smallest Role-Model runtime changes to make those tests pass.
7. Run focused GREEN commands after each slice.
8. Run broad local CI commands.
9. Rebuild the runtime from the run-62 worktree.
10. Launch the rebuilt runtime on `127.0.0.1:3456` after process-isolation checks.
11. Run live Pi CLI verification.
12. Run live Craft runtime/client verification.
13. Record request-detail, telemetry, raw SSE, process, port, and runtime hash evidence.
14. If live evidence shows a repo-owned `pi-role-model` discovery or inspection compatibility gap, return to TDD Slice G before any package change.

## Automated Verification Plan

Focused commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts`
- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model run test` only if `packages/pi-role-model` changes

Broader commands:

- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:validate-packaging`
- `corepack pnpm run ci:check`

Any known unrelated local-CI blocker must be recorded with a command log and a scoped explanation. Unknown failures are not acceptable.

## Rebuilt Runtime Verification Plan

The runtime must be rebuilt from:

- `D:/DEV/role-model/.worktrees/62-litellm-pi-craft-codex-execution-hardening`

The live target must be:

- `http://127.0.0.1:3456`

Before launch:

- Identify existing listeners on `127.0.0.1:3456`.
- Stop only Role-Model runtime processes that conflict with the target port.
- Do not kill user Pi or Craft app processes unless they are clearly isolated verification helpers started by this run.
- Capture process and port state before and after launch.

Runtime evidence to capture:

- executable path
- executable SHA-256
- process id
- port listener
- `GET /healthz`
- `GET /v1/models`
- `GET /api/role-model/endpoints`
- `GET /api/role-model/downstream/openai`
- raw SSE transcript for at least one reasoning-capable provider route
- request-detail rows for all live verification requests
- telemetry rows for all live verification requests

Evidence directories:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/rebuilt-runtime/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/live/pi-cli/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/live/craft-runtime/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-11/live/raw-sse/`

## Live Pi CLI Verification Plan

Pi verification means the real Pi CLI sends requests to Role-Model. Handwritten Pi-shaped HTTP requests are supplemental only and cannot satisfy this addendum.

Required setup:

- Use the installed Pi CLI from the local Pi environment.
- Use the Role-Model provider configuration pointing at `http://127.0.0.1:3456/v1`.
- Use runtime aliases already defined by protocol/runtime, especially `difficulty.remote-only`.
- Do not create temporary aliases to force routing.

Required Pi CLI cases:

- `difficulty.remote-only`, reasoning-capable prompt, expect successful completion and request-detail evidence for selected provider.
- `difficulty.remote-only`, repeated enough to observe both available backend families if routing policy allows, or record why the current endpoint scores selected only one family.
- exact `deepseek/deepseek-v4-pro`, reasoning-capable prompt, expect raw SSE `reasoning_content` if DeepSeek emits reasoning on the current path.
- exact `chatgpt/gpt-5.4`, reasoning-capable prompt, expect either raw SSE `reasoning_content` if Codex/OpenAI path emits it or explicit `reasoningUnavailableReason` with no timeout.
- `baseline.remote-only`, basic control case, expect no regression in ordinary content streaming.

Pi pass criteria:

- The Pi process exits or returns within the configured timeout for every case.
- Alias requests route through Role-Model's alias resolver, not direct model id bypass.
- Runtime raw SSE evidence proves whether `reasoning_content` was present on the wire.
- If `reasoning_content` was present, Pi output/log/event evidence must show it was consumable as thinking/progress or the discrepancy must be classified as downstream rendering behavior without changing Pi.
- Runtime request-detail and telemetry record provider/vendor/execution/adapter identity separately.
- No unexplained retry loop, silent timeout, or process leak remains after verification.

## Live Craft Runtime Verification Plan

Craft verification means the real Craft runtime/client sends requests to Role-Model. Handwritten Craft-shaped HTTP requests are supplemental only and cannot satisfy this addendum.

Required setup:

- Use Craft's Role-Model connection targeting `http://127.0.0.1:3456/v1`.
- Use a Craft client/runtime session separate from Pi verification.
- Use canonical runtime alias `difficulty.remote-only` for alias verification.
- Capture Craft logs when available, but use Role-Model request-detail and raw SSE as the authoritative runtime evidence.

Required Craft cases:

- `difficulty.remote-only`, reasoning-capable prompt, expect successful completion and Role-Model alias routing evidence.
- exact `deepseek/deepseek-v4-pro`, reasoning-capable prompt, expect raw SSE `reasoning_content` if upstream emits it.
- exact `chatgpt/gpt-5.4`, reasoning-capable prompt, expect either raw SSE `reasoning_content` or explicit `reasoningUnavailableReason` with no timeout.
- ordinary text request through `difficulty.remote-only`, expect no regression in normal content streaming.

Craft pass criteria:

- Craft receives final content for non-error cases.
- Runtime raw SSE evidence proves whether `reasoning_content` was present on the wire.
- If Role-Model emits valid `reasoning_content` and Craft does not render progress, classify as Craft rendering/adapter behavior and do not patch Craft in this run.
- If Role-Model drops valid upstream reasoning before it reaches Craft, classify as a Role-Model runtime bug and return to TDD slices C or D.
- Runtime request-detail and telemetry record provider/vendor/execution/adapter identity separately.
- No unexplained minute-scale response delay remains attributable to Role-Model queueing, retry loops, or background-process interference.

## Wire Compatibility Rules

- Use SSE `data:` events compatible with OpenAI chat-completions streaming.
- Preserve `choices[].delta.reasoning_content` for reasoning deltas.
- Preserve `choices[].delta.content` for visible content.
- Preserve normal terminal chunks and `[DONE]`.
- Preserve usage chunks when available.
- Do not invent consumer-specific event names.
- Do not require Pi or Craft to call a nonstandard Role-Model endpoint for reasoning progress.
- Do not expose hidden reasoning as assistant content.

## Process-Isolation Plan

Before and after live verification:

- Record all listeners on `127.0.0.1:3456`.
- Record Role-Model runtime process id and executable path.
- Record any child/helper process started by this run.
- Kill only isolated helper processes started by this run after verification.
- Leave user-facing Pi and Craft processes alone unless the user explicitly authorizes stopping them.
- Confirm `/healthz` remains responsive after Pi and Craft verification.

## Requirement Mapping

- `R0`: provider/vendor/execution/adapter identity separation remains explicit in reasoning telemetry.
- `R1`: shared execution contract covers Chat Completions reasoning controls, not only Responses.
- `R2`: Pi and Craft request semantics are preserved through Role-Model without upstream client patches.
- `R3`: LiteLLM-handled providers remain actual providers such as DeepSeek, with LiteLLM recorded as vendor/execution path only.
- `R4`: Codex Subscription GPT behavior is represented truthfully: forwarded reasoning when available, explicit unavailable reason when not.
- `R8`: request-detail and telemetry expose reasoning stream decisions without raw log scraping.
- `R9`: validator/corpus coverage uses canonical aliases and captures routing facts.
- `R10`: rebuilt runtime on `127.0.0.1:3456` is verified through real Pi CLI and real Craft runtime/client requests.
- `R11`: focused and broad local CI are required before commit readiness.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `26e6a4119a7338236fa7e97ff81629e80951e105`
- Comparison reference: `working-tree`
- Normalized baseline: `26e6a4119a7338236fa7e97ff81629e80951e105`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 26e6a4119a7338236fa7e97ff81629e80951e105`
- Current addendum-owned change: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-consumer-runtime.addendum-11.md`
- Planned product paths are limited to Role-Model runtime code and conditional repo-owned `packages/pi-role-model` compatibility code.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: deferred tool search was available in the session, but no subagent was explicitly requested for this plan-only addendum.
- Delegation Decision Basis: this addendum is a narrow Phase 2 remediation plan using already-inspected source and consumer code references; implementation-phase review should use the Phase 3.5 review-bundle path if code changes follow.
- Delegation Override Reason: user requested a plan, not delegated review. A Phase 3.5 code review remains required after implementation changes.
- Audit Inputs Provided: locked run requirements, locked base plan, addendum 10 root cause/plan/manual QA artifacts, current routing memory, current Pi package memory, Role-Model runtime source paths, and read-only Pi/Craft consumer source paths.

## Effective Inputs Re-read

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.pi-cooldown-retry.addendum-10.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/pi-role-model-package.md`

## Earlier Phase Reconciliation

- Base Phase 2 planned reasoning propagation mostly around Responses and shared execution semantics. This addendum narrows the remaining regression to Chat Completions reasoning controls and streaming deltas because Pi and Craft both use OpenAI-compatible chat-completions for the observed Role-Model connection.
- Addendum 10 correctly fixed retryable cooldown status but explicitly did not synthesize thinking. This addendum preserves that decision: it forwards real reasoning when available and records unavailability when not.
- Existing live verification language that refers to Pi-shape or Craft-shape requests is insufficient for this addendum. Real Pi CLI and real Craft runtime/client requests are mandatory.
- The user clarified that Pi and Craft are separate consumers and must not be mixed into the same session. This addendum requires independent verification sessions.
- The user clarified that Pi and Craft upstream code must not be modified. This addendum records those paths as read-only references.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: direct review of locked run artifacts, addendum 10 artifacts, current memory docs, and current source-reference findings from Pi, Craft, and Role-Model code paths.
- Acceptance Decision: `accepted`
- Refresh Handling: if implementation changes materially broaden product paths, Phase 3.5 must refresh the review bundle and include this addendum.
- Repair Performed After Verification: plan boundary was tightened to forbid Pi/Craft upstream modification and require real Pi CLI plus real Craft runtime verification.

## Requirement Completion Status

- R0 | Status: planned | Scope Decision: provider identity remains actual provider; LiteLLM and `ai-sdk-openai` remain vendor/adapter/execution path facts. | Addendum: addendum-11.
- R1 | Status: planned | Scope Decision: Chat Completions reasoning controls must enter the shared execution contract. | Addendum: addendum-11.
- R2 | Status: planned | Scope Decision: Pi and Craft are read-only downstream consumers; Role-Model owns the runtime fix. | Addendum: addendum-11.
- R3 | Status: planned | Scope Decision: DeepSeek through LiteLLM must remain DeepSeek provider identity with LiteLLM as vendor. | Addendum: addendum-11.
- R4 | Status: planned | Scope Decision: Codex Subscription GPT reasoning behavior must be truthfully forwarded or explicitly unavailable. | Addendum: addendum-11.
- R8 | Status: planned | Scope Decision: reasoning stream decisions need request-detail and telemetry receipts. | Addendum: addendum-11.
- R9 | Status: planned | Scope Decision: alias corpus must use `difficulty.remote-only` and `baseline.remote-only`, not invented aliases. | Addendum: addendum-11.
- R10 | Status: planned | Scope Decision: rebuilt-runtime proof requires real Pi CLI and real Craft runtime/client traffic. | Addendum: addendum-11.
- R11 | Status: planned | Scope Decision: local CI and runtime validators remain mandatory before commit readiness. | Addendum: addendum-11.

## Gaps Found

- Existing addendum 10 verification proves cooldown retry behavior, not reasoning stream rendering or reasoning delta preservation.
- Existing plan language allowing Pi-shape and Craft-shape requests is too weak for this regression.
- Chat Completions reasoning ingress and SSE output require explicit tests because Pi and Craft use OpenAI-compatible chat-completions against Role-Model.
- Downstream UI rendering must be diagnosed separately from Role-Model wire correctness to avoid consumer-specific runtime hacks.

## Repair Work Performed

- Added a dedicated Phase 2 remediation addendum.
- Made the mutable code boundary explicit.
- Replaced surrogate verification with real Pi CLI and real Craft runtime/client verification requirements.
- Added strict RED/GREEN slices for ingress controls, provider shaping, stream preservation, SSE output, observability, alias corpus coverage, and conditional repo-owned Pi package compatibility.

## Audit Verdict

- Audit summary: the addendum is specific, verifiable, generalized, and bounded to Role-Model runtime ownership while using Pi and Craft codebases only as protocol/behavior references and live verification clients.
- Follow-up required before implementation: run the RED tests first and record evidence under `evidence/logs/addendum-11/red/`.

## Coverage Gate

- [x] Plan forbids Pi upstream and Craft upstream modification.
- [x] Plan allows only Role-Model runtime changes and conditional repo-owned `packages/pi-role-model` compatibility changes.
- [x] Plan requires strict TDD before production changes.
- [x] Plan requires canonical aliases, especially `difficulty.remote-only`.
- [x] Plan requires rebuilt runtime verification on `127.0.0.1:3456`.
- [x] Plan requires real Pi CLI verification.
- [x] Plan requires real Craft runtime/client verification.
- [x] Plan distinguishes valid missing provider reasoning from runtime stream suppression.
- [x] Plan preserves provider/vendor/execution/adapter taxonomy.

Coverage: PASS

## Approval Gate

- [x] Plan is implementable within the current Role-Model runtime architecture.
- [x] Plan avoids consumer-specific hacks.
- [x] Plan is specific enough to start Phase 3 with strict RED tests.
- [x] Plan defines concrete live verification evidence and pass criteria.

Approval: PASS

## Audit Gate

- [x] Effective inputs re-read.
- [x] Earlier addenda reconciled.
- [x] User correction about Pi/Craft mutation boundary incorporated.
- [x] Verification plan uses real clients rather than surrogate request shapes.

Audit: PASS
