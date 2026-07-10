Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `12`
Status: `LOCKED`
LockedAt: `2026-07-10T04:23:28Z`
LockHash: `03eb607fb0be490ba470d9e642623e0c28e4380d235f81656a4c596e55b31ae3`
Workflow version: `recursive-mode-audit-v1`
Lock note: `scripts/recursive-lock.py` is not present in this worktree; audit, coverage, and approval gates are included and pass, but formal lock metadata was not applied.
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.reasoning-stream-routing-agnostic.addendum-12.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-consumer-runtime.addendum-11.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-routing-agnostic.addendum-12.md`
Scope note: This plan supersedes any interpretation that would make reasoning-stream output a routing eligibility criterion. The fix is a generalized stream-preservation repair inside Role-Model runtime.

# Addendum 12 Plan: Routing-Agnostic Streaming Preservation

## TODO

- [x] Forbid streaming/reasoning output as a routing eligibility filter.
- [x] Define generic post-routing stream preservation.
- [x] Require strict TDD before production code changes.
- [x] Require rebuilt-runtime verification on `127.0.0.1:3456`.
- [x] Require live Pi CLI and Craft runtime/client verification.
- [x] Preserve provider/vendor/execution/adapter taxonomy.

## Target Behavior

Role-Model must support streaming and reasoning deltas after routing between models and endpoints:

- Routing determines the endpoint. Streaming normalization happens after endpoint selection.
- Streaming support is not an endpoint eligibility requirement.
- If an execution path receives incremental text deltas, downstream Chat Completions streaming must receive multiple `choices[].delta.content` chunks.
- If an execution path receives reasoning or thinking deltas, downstream Chat Completions streaming must receive `choices[].delta.reasoning_content` chunks.
- Hidden reasoning must never be copied into assistant-visible `content`.
- If a provider/execution path returns only a final answer and exposes no incremental events, Role-Model may stream one final content chunk but telemetry must identify the stream source as synthesized/final-only rather than "provider returned no reasoning."
- Exact-model requests and alias requests must use the same post-routing stream behavior.
- Canonical aliases such as `difficulty.remote-only` and `baseline.remote-only` must be used for verification.

## Forbidden Fixes

- Do not make `reasoning.stream_output` or text-stream granularity a router eligibility filter.
- Do not exclude GPT/Codex Subscription from aliases solely because reasoning deltas were absent in one live run.
- Do not synthesize fake reasoning text.
- Do not put reasoning text into `content`.
- Do not add Pi-specific or Craft-specific runtime branches.
- Do not modify Pi upstream or Craft upstream source.
- Do not invent test aliases.
- Do not classify LiteLLM, `ai-sdk-openai`, or Codex app server as providers.

## Mutable Scope

Allowed product paths:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/runtime-observability/**` only if additional stream-origin telemetry fields are needed
- `role-model-router/packages/provider-openai/**` only if parser support for an existing OpenAI-compatible field is missing
- `packages/pi-role-model/**` only if repo-owned discovery/inspection compatibility is proven stale

Expected initial implementation path:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

## Strict TDD Plan

TDD Mode: `strict`

RED logs:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-12/red/`

GREEN logs:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-12/green/`

### Slice A: Codex App-Server Text Deltas

RED:

- Add a host-bridge test proving `executeCodexAppServerTurnOverStdio()` preserves app-server `item/agentMessage/delta` as an ordered delta list, not only accumulated text.
- Add a bridge streaming test proving a Codex-style streamed Chat Completions response emits one downstream SSE content chunk per captured delta.

GREEN:

- Extend the app-server completed-turn shape with text deltas.
- For streamed Chat Completions requests, serialize those deltas into a normal OpenAI-compatible SSE transcript.

### Slice B: Generic Reasoning/Thinking Deltas

RED:

- Add a host-bridge test with app-server reasoning/thinking delta messages.
- Assert downstream SSE uses `choices[].delta.reasoning_content`.
- Assert reasoning deltas do not appear in `choices[].delta.content`.

GREEN:

- Extend the app-server event reader with provider-neutral reasoning/thinking delta collection.
- Serialize collected reasoning/thinking deltas as `reasoning_content`.

### Slice C: Replay Metadata

RED:

- Add a regression proving `replayProviderStreamTranscript()` preserves leading reasoning-only chunks when the original request had reasoning controls.

GREEN:

- Pass `reasoningRequested` into replay metadata.
- Keep suppression behavior for non-reasoning requests.

### Slice D: Observability

RED:

- If existing receipts cannot distinguish native-stream versus synthetic/final-only stream origin, add a failing observability/request-detail assertion.

GREEN:

- Add the smallest stream-origin receipt necessary.
- Do not create a parallel trace system.

## Automated Verification

Focused commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run build`
- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts` only if observability changes

Broad commands:

- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-packaging`
- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run ci:check` if the implementation touches shared contracts or before commit readiness

## Rebuilt Runtime Verification

Rebuild from:

- `D:/DEV/role-model/.worktrees/62-litellm-pi-craft-codex-execution-hardening`

Launch target:

- `http://127.0.0.1:3456`

Required checks:

- Capture executable SHA-256.
- Capture process id and port listener.
- Confirm exactly one Role-Model runtime owns `127.0.0.1:3456`.
- Confirm `/healthz` is healthy.
- Confirm `/v1/models` includes `difficulty.remote-only`.
- Confirm `/api/role-model/endpoints` lists active DeepSeek and OpenAI/Codex endpoints.

## Live Verification

Pi CLI verification must use the real Pi CLI:

- `difficulty.remote-only`
- `baseline.remote-only`
- `chatgpt/gpt-5.4`
- `deepseek/deepseek-v4-pro`

Craft runtime verification must use the real Craft runtime/client:

- `difficulty.remote-only`
- `baseline.remote-only`
- `chatgpt/gpt-5.4`
- `deepseek/deepseek-v4-pro`

Pass criteria:

- Requests complete without timeout.
- Alias requests route through canonical alias resolution.
- GPT/Codex streamed requests show more than one content delta when the app-server emitted more than one text delta.
- DeepSeek still emits/preserves reasoning deltas.
- Any reasoning/thinking deltas observed from any endpoint are emitted as `reasoning_content`.
- Request-detail evidence separates provider, vendor, adapter, and execution family.
- No background helper processes disturb the runtime.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: deferred tool search is available in this session.
- Delegation Decision Basis: this plan directly follows a source-level root-cause trace and user clarification; Phase 3.5 review remains required after implementation.
- Delegation Override Reason: keeping the plan local avoids delaying the TDD repair; review will be refreshed after the diff exists.
- Audit Inputs Provided: addendum 12 root cause, addendum 11 artifacts, routing memory, Pi package memory, and source paths listed in scope.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: direct reconciliation against addendum 12 root cause and source inspection.
- Acceptance Decision: accepted.
- Refresh Handling: Phase 3.5 must review the implementation diff and live verification evidence.
- Repair Performed After Verification: plan explicitly forbids using streaming as routing eligibility.

## Requirement Completion Status

- R0 | Status: planned | Scope Decision: taxonomy remains provider/vendor/adapter separated. | Addendum: addendum-12.
- R1 | Status: planned | Scope Decision: reasoning controls remain request semantics, not routing eligibility. | Addendum: addendum-12.
- R2 | Status: planned | Scope Decision: Pi and Craft remain read-only verification clients. | Addendum: addendum-12.
- R4 | Status: planned | Scope Decision: Codex/GPT streamed text deltas must be preserved when app-server emits them. | Addendum: addendum-12.
- R8 | Status: planned | Scope Decision: stream-origin and reasoning-delta behavior must be inspectable. | Addendum: addendum-12.
- R9 | Status: planned | Scope Decision: canonical aliases only. | Addendum: addendum-12.
- R10 | Status: planned | Scope Decision: rebuilt-runtime Pi/Craft verification is mandatory. | Addendum: addendum-12.
- R11 | Status: planned | Scope Decision: local tests and CI must be recorded before commit readiness. | Addendum: addendum-12.

## Coverage Gate

- [x] Plan addresses the user correction.
- [x] Plan preserves routing semantics and makes streaming post-routing.
- [x] Plan is TDD-backed.
- [x] Plan includes rebuilt runtime, Pi CLI, and Craft runtime verification.

Coverage: PASS

## Approval Gate

- [x] Plan is specific and testable.
- [x] Plan avoids consumer/model/provider special cases.
- [x] Plan can proceed to strict TDD implementation.

Approval: PASS

Audit: PASS
