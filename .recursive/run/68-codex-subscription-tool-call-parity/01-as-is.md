Run: `/.recursive/run/68-codex-subscription-tool-call-parity/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-12T14:45:56Z`
LockHash: `390043dbb4eaa13c67d2b871a5e44608a8a30fbc1ca563a93e52622254a3974c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md` (LOCKED)
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-worktree.md` (LOCKED)
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.agents/skills/recursive-debugging/SKILL.md`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
Outputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/01-as-is.md`
Scope note: Records the current tool-calling, continuation, cross-provider rendering, and benchmark-execution baseline before run 68 repairs Codex Subscription tool-call parity.

## TODO

- [x] Re-read the locked Phase 0 artifacts and recursive bridge docs
- [x] Inventory the current execution-contract fields for tools, continuation, and parallel tool policy
- [x] Inventory the native Codex streamed and non-streamed tool-call shaping baseline
- [x] Inventory the current Responses continuation rendering baseline
- [x] Inventory the benchmark runner and regression-floor ownership
- [x] Reconcile the current code against `R1` through `R10`
- [x] Audit the artifact for recursive-mode readiness

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed the `multi_agent_v1` tool family, including `spawn_agent`, `wait_agent`, `send_input`, and `close_agent`, in this repository session.
Delegation Decision Basis: Phase 1 is direct worktree inspection against locked run inputs and current code. The tool policy forbids spawning sub-agents unless the user explicitly asks for delegation or parallel agent work.
Delegation Override Reason: sub-agent tooling is available, but the user did not authorize delegation in this thread.
Audit Inputs Provided:
- locked run-68 requirements and worktree artifacts
- current adapter-execution, provider-openai, host-bridge, and benchmark-runner sources
- current owning host-bridge, provider-openai, benchmark, and matrix tests
- prior recursive runs 52, 62, and 65

## Effective Inputs Re-read

- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-worktree.md`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`

## Reproduction Steps (Novice-Runnable)

1. Open the worktree at `D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity`.
2. Read `/role-model-router/packages/adapter-execution/src/index.ts` lines `95-108`.
   - Confirm `RuntimeExecutionRequest` models `tools`, `toolChoice`, `reasoning`, `promptCache`, `sessionAffinity`, and `continuation`, but it has no field for caller-controlled `parallel_tool_calls`.
3. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `6708-6741` and `8073-8074`.
   - Confirm Responses ingress narrows `body.input` to a plain message array via `toResponsesInputMessages()`, which accepts only `role` plus string/array `content` and discards typed items such as `function_call_output`.
4. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `8032-8052` and `8196-8219`.
   - Confirm Chat Completions and Responses ingress map `tool_choice`, prompt cache, continuation, and session affinity, but neither path reads `parallel_tool_calls`.
5. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `10676-10694`.
   - Confirm the native Codex request builder hardcodes `parallel_tool_calls: true` whenever tools are present.
6. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `9998-10111` and `10114-10170`.
   - Confirm non-stream Codex transcript normalization only records response id, text, reasoning, finish reason, and usage. It never extracts `function_call` items, so the non-stream Chat Completions compatibility body cannot emit `message.tool_calls`.
7. Compare that with `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `10206-10352`.
   - Confirm the streamed Chat Completions mapper does emit `tool_calls` deltas from native Codex `response.function_call_arguments.delta` events. The stream path is materially richer than the non-stream path.
8. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `12361-12408`.
   - Confirm bridge-managed continuation always replays assistant tool calls and `role:"tool"` outputs as Chat Completions messages. There is no Responses-native replay that emits `function_call` and `function_call_output` items.
9. Read `/role-model-router/packages/provider-openai/src/index.ts` lines `56-75` and `801-840`.
   - Confirm provider-openai also builds Responses requests by replaying a Chat Completions-style message array into `body.input`, and it forwards `tool_choice`, `previous_response_id`, and `prompt_cache_key` but not `parallel_tool_calls`.
10. Read `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` lines `331-395` and `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` lines `300-353`, `510-585`.
    - Confirm benchmark subject execution still depends on `executeChatCompletions(...)`, and the tests only stub the Chat Completions path.

## Current Behavior by Requirement

| Requirement | Current behavior |
| --- | --- |
| `R1` | The native Codex stream path can emit tool-call deltas, but the non-stream transcript normalizer ignores `function_call` output items. This leaves non-stream `/v1/chat/completions` and `/v1/responses` dependent on a text-only normalized transcript. |
| `R2` | `createChatCompletionsResponse()` and `createResponsesResponse()` can serialize tool calls if `result.toolCalls` exists, but the native Codex non-stream path never populates those tool calls because transcript normalization drops them. |
| `R3` | Responses continuation is not provider-neutral. The bridge collapses Responses `input` into plain messages, and bridge-managed follow-up turns are always replayed as Chat Completions assistant/tool messages instead of Responses `function_call_output` items. |
| `R4` | The shared execution contract has no `parallel_tool_calls` field. Ingress ignores it, provider-openai never forwards it, and the native Codex request builder hardcodes it to `true` when tools are present. |
| `R5` | Existing tests cover streamed tool-call parsing, some provider-openai request building, and benchmark tool-follow-up extraction, but they do not cover sibling multi-tool-call non-stream Codex parity or request-side `parallel_tool_calls` truth. |
| `R6` | There is no rebuilt-runtime Phase 5 proof yet. Exact-model, routing-alias, direct-Kimi, and LiteLLM-backed DeepSeek live verification are still unexecuted for this run. |
| `R7` | The benchmark runner still executes answer turns through `executeChatCompletions(...)` for Codex tool-bearing cases. There is no Responses-based benchmark subject path yet. |
| `R8` | Benchmark truth cannot distinguish adapter loss from model behavior on Codex tool-bearing subject turns because the benchmark still exercises the older Chat Completions compatibility layer. |
| `R9` | Cross-provider continuity is not yet fully portable. Same logical tool state is represented as plain message replay, not a provider-neutral typed history that can be rendered safely to native Responses or chat-completions targets. |
| `R10` | Current bridge behavior does not explicitly classify route-switch rendering by verified upstream shape. Responses-side rendering assumes message-array replay is sufficient even for bridge targets that need Chat Completions semantics and for native Responses targets that need typed replay. |

## Source Requirement Inventory

- `R1` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `9998-10111`, `10206-10352` | Disposition: in-scope | Source Quote: "the native `chatgpt-codex-responses` execution path preserves OpenAI-compatible tool semantics across non-stream and streaming downstream surfaces" | Summary: stream mapping extracts tool calls, non-stream normalization does not
- `R2` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `11782-11855`, `10777-10799` | Disposition: in-scope | Source Quote: "non-stream `/v1/chat/completions` replies can return an empty assistant message instead of `message.tool_calls`" | Summary: downstream serializers are tool-capable, but native Codex non-stream input never reaches them with tool calls populated
- `R3` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `6708-6741`, `8073-8074`, `12361-12408`; `/role-model-router/packages/provider-openai/src/index.ts` lines `56-75`, `801-840` | Disposition: in-scope | Source Quote: "continuation turns are not faithfully represented because assistant tool calls and `role:"tool"` follow-up messages are not converted into Responses-native `function_call` and `function_call_output` items" | Summary: Responses input and follow-up turns are both flattened into chat-style message replay
- `R4` | Source of current-state analysis: `/role-model-router/packages/adapter-execution/src/index.ts` lines `95-108`; `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `8032-8052`, `8196-8219`, `10676-10694`; `/role-model-router/packages/provider-openai/src/index.ts` lines `736-840` | Disposition: in-scope | Source Quote: "the adapter may forward or default supported controls, but it must not silently force `parallel_tool_calls: true`" | Summary: request-side `parallel_tool_calls` is missing from the shared contract and hardcoded on Codex
- `R5` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` | Disposition: in-scope | Source Quote: "route-switch matrix regressions are owned in `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`" | Summary: current regression floor does not encode the full run-68 matrix
- `R6` | Source of current-state analysis: locked requirements plus current repo evidence | Disposition: in-scope | Source Quote: "The repaired contract must be verified against a rebuilt live runtime, not only against mocked unit transcripts." | Summary: no rebuilt-runtime Pi CLI proof exists yet
- `R7` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` lines `331-395`, `612-614`, `1606` | Disposition: in-scope | Source Quote: "benchmark execution no longer depends exclusively on `executeChatCompletions(...)` for Codex tool-bearing cases" | Summary: benchmark subject and judge execution remain chat-completions based
- `R8` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` lines `300-353`, `510-585` | Disposition: in-scope | Source Quote: "GPT-5.4 no longer loses benchmark credit solely because the runtime dropped tool calls on a non-stream compatibility surface" | Summary: benchmark tests currently prove only the chat-completions tool loop
- `R9` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `12361-12408`, `19489-19545`; `/role-model-router/packages/provider-openai/src/index.ts` lines `56-75`, `801-840` | Disposition: in-scope | Source Quote: "the canonical internal continuation model is provider-neutral and can be rendered to both Responses and Chat Completions targets without losing tool-call semantics" | Summary: continuation storage and rendering are not yet provider-neutral enough for route-shape switches
- `R10` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `6708-6741`, `8073-8074`; `/role-model-router/packages/provider-openai/src/index.ts` lines `801-840` | Disposition: in-scope | Source Quote: "when the selected route is `Responses ingress -> Chat Completions upstream bridge`, the runtime renders portable history into a bridge-safe Responses request shape" | Summary: current Responses rendering does not distinguish native Responses replay from bridge-safe Chat Completions replay

## Relevant Code Pointers

### Shared execution contract and ingress

- `/role-model-router/packages/adapter-execution/src/index.ts:95-108`
  - `RuntimeExecutionRequest` has no field for request-side `parallel_tool_calls`.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:6708-6731`
  - `toResponsesInputMessages()` only accepts `role` plus plain `content` and returns `OpenAIChatCompletionsMessage[]`.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:8032-8052`
  - Chat Completions ingress forwards `tool_choice`, prompt cache, session affinity, reasoning, streaming, token limits, and temperature, but not `parallel_tool_calls`.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:8196-8219`
  - Responses ingress forwards `tool_choice`, prompt cache, `previous_response_id`, session affinity, streaming, token limits, and temperature, but not `parallel_tool_calls`.

### Native Codex stream versus non-stream parity

- `/role-model-router/apps/runtime-host-bridge/src/index.ts:9998-10111`
  - `normalizeCodexResponsesTranscript()` never records `function_call` items.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:10114-10170`
  - non-stream Chat Completions SSE reconstruction emits only reasoning/text deltas and a finish chunk.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:10206-10352`
  - streamed Chat Completions mapping does emit `tool_calls` deltas and sets `finish_reason: "tool_calls"` when a function call was seen.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:10777-10799`
  - native Codex non-stream responses and chat-completions bodies are rebuilt from the tool-less normalized transcript.

### Responses continuation rendering

- `/role-model-router/apps/runtime-host-bridge/src/index.ts:12361-12408`
  - `buildContinuationExecutionRequest()` always appends assistant tool calls and `role:"tool"` outputs as Chat Completions messages.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:19489-19545`
  - the bridge continuation loop reuses that chat-style replay for hosted-tool continuation after every tool turn.
- `/role-model-router/packages/provider-openai/src/index.ts:56-75`
  - `toOpenAIInput()` converts execution messages to chat-style `role/content/tool_calls/tool_call_id` records.
- `/role-model-router/packages/provider-openai/src/index.ts:801-840`
  - Responses requests are built with `input: toOpenAIInput(...)`, `tool_choice`, `previous_response_id`, and `prompt_cache_key`, but not `parallel_tool_calls`.

### Benchmark runner and current regression floor

- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts:331-395`
  - `runCaseOnEndpoint()` uses `executeBenchmarkTurn()` and stores `BenchmarkChatCompletionsExecutionResult`.
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts:612-614`
  - judge execution also uses `executeChatCompletions(...)`.
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts:300-353`
  - existing benchmark tests stub only `executeChatCompletions`.
- `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts:510-585`
  - follow-up enforcement is validated only on the chat-completions benchmark path.
- `/role-model-router/packages/provider-openai/test/index.test.ts:790-821`
  - request-building tests cover `tool_choice`, `previous_response_id`, and `prompt_cache_key`, but not `parallel_tool_calls`.
- `/role-model-router/packages/provider-openai/test/index.test.ts:1347-1414`
  - current continuation replay tests assert assistant `tool_calls` plus `role:"tool"` chat messages, not Responses-native typed replay.

## Evidence

- `RuntimeExecutionRequest` has no `parallelToolCalls` field, so ingress cannot preserve caller intent structurally.
- Responses ingress converts `body.input` into plain messages via `toResponsesInputMessages()`.
- Native Codex streaming emits `tool_calls` deltas, but non-stream transcript normalization returns no tool-call inventory.
- Bridge-managed continuation always replays assistant and tool turns as chat-style messages.
- provider-openai builds Responses `body.input` from chat-style message replay and never forwards `parallel_tool_calls`.
- benchmark subject execution and its owning tests still use `executeChatCompletions(...)`.

## Known Unknowns

- The exact minimum typed-item shape needed for every live cross-provider replay case may require one implementation iteration once RED tests pin the required portable subset.
- The current deterministic matrix may or may not expose an extra generic LiteLLM-backed provider route beyond DeepSeek for automated coverage.
- The exact Phase 5 live verification commands will depend on which endpoints are active in the rebuilt runtime at verification time.

## Traceability

- `R1`: native Codex stream versus non-stream tool parity baseline recorded
- `R2`: downstream non-stream synthesis dependency on surviving `toolCalls` recorded
- `R3`: Responses continuation flattening recorded
- `R4`: missing request-side `parallel_tool_calls` contract recorded
- `R5`: regression-floor coverage gap recorded
- `R6`: absence of rebuilt-runtime Pi CLI proof recorded
- `R7`: benchmark subject-path gap recorded
- `R8`: benchmark test-floor gap recorded
- `R9`: provider-neutral continuation gap recorded
- `R10`: route-shape classification gap recorded

## Gaps Found

None beyond the in-scope run-68 target defects already documented in the locked requirements, the requirement-baseline table above, and the evidence sections of this Phase 1 artifact.

## Repair Work Performed

None. This is a Phase 1 audit artifact. Repairs are deferred to Phase 2 planning and Phase 3 implementation.

## Audit Verdict

Audit: PASS

The current tool-calling and benchmark baseline has been systematically inventoried. The observed gaps align directly with `R1` through `R10`.

## Earlier Phase Reconciliation

- `00-requirements.md` defines the run as a contract repair across non-stream parity, continuation portability, benchmark migration, cross-provider routing, and TDD plus Pi verification. The Phase 1 inventory confirms those gaps exist in the current worktree.
- `00-worktree.md` fixed the diff basis at `git diff --name-only c2402a1b97ff2d4de900b012a50ac8c1b69f3512`. This artifact reuses that basis unchanged.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct code inspection in the run-68 worktree
- Acceptance Decision: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Comparison reference: `working-tree`
- Normalized baseline: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Diff basis used: `git diff --name-only c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/68-codex-subscription-tool-call-parity`
- Active worktree path: `D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity\`
- Planned or claimed changed files:
  - `/.recursive/run/68-codex-subscription-tool-call-parity/01-as-is.md`
- Unexplained drift:
  - none

## Requirement Completion Status

- `R1` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R2` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R3` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R4` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R5` | Status: deferred | Rationale: explicit RED-first regression work begins in Phase 3 | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R6` | Status: deferred | Rationale: rebuilt-runtime Pi CLI verification is a Phase 5 obligation | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R7` | Status: deferred | Rationale: benchmark-runner migration is a Phase 3 implementation task | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R8` | Status: deferred | Rationale: post-fix benchmark rerun is a Phase 4 and Phase 5 obligation | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R9` | Status: deferred | Rationale: provider-neutral continuation repair is pending Phase 3 | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `R10` | Status: deferred | Rationale: upstream-shape classification and bridge-safe rendering are pending Phase 3 | Deferred By: `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`

## Coverage Gate

- [x] Locked Phase 0 inputs were re-read and cited
- [x] Current code and test ownership for `R1` through `R10` is recorded
- [x] The current behavioral gaps are traceable to concrete file and line references

Coverage: PASS

## Approval Gate

- [x] The AS-IS baseline is concrete enough for root-cause analysis and planning
- [x] No required current-state seam from the locked requirements remains unaccounted for
- [x] The artifact is ready for Phase 1.5 and Phase 2 handoff

Approval: PASS
