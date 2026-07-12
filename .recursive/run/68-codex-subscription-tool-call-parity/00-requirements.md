Run: `/.recursive/run/68-codex-subscription-tool-call-parity/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-12T14:23:23Z`
LockHash: `3eafa40b178ed3142381dd5f0304c053e215ef7c56b8f77ab66d7fcfe62c2623`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- user guidance in chat on `2026-07-12`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `role-model-router/packages/adapter-execution/test/index.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- official public GitHub sources verified on `2026-07-12`:
  - `https://github.com/MoonshotAI/Kimi-K2.5`
  - `https://github.com/MoonshotAI/kimi-code`
  - `https://github.com/BerriAI/litellm/blob/main/litellm/proxy/route_llm_request.py`
  - `https://github.com/BerriAI/litellm/blob/main/litellm/llms/deepseek/chat/transformation.py`
  - `https://github.com/BerriAI/litellm/blob/main/litellm/llms/moonshot/chat/transformation.py`
  - `https://github.com/BerriAI/litellm/blob/main/litellm/responses/main.py`
  - `https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json`
  - `https://github.com/BerriAI/litellm/blob/main/docs/my-website/docs/providers/bedrock_imported.md`
- official OpenAI docs verified on `2026-07-12`:
  - `https://developers.openai.com/api/docs/guides/migrate-to-responses?update-multiturn=responses`
  - `https://developers.openai.com/api/docs/guides/reasoning#keeping-reasoning-items-in-context`
  - `https://developers.openai.com/api/docs/guides/tools`
  - `https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/`
Outputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
Scope note: This run repairs the Codex Subscription tool-calling contract so the native `chatgpt-codex-responses` execution path preserves OpenAI-compatible tool semantics across non-stream and streaming downstream surfaces, across continuation turns, and through the benchmark runner. It also migrates Codex tool-bearing benchmark execution to the newer `/v1/responses` surface so future benchmark truth follows the current OpenAI Responses tool contract directly instead of depending on the older non-stream `chat/completions` path. Because the runtime is generic rather than Pi-specific, the repaired continuity model must also remain fully cross-provider compatible across route switches between Codex Subscription, the current LiteLLM-backed DeepSeek path, direct Kimi code endpoints, direct Kimi OAuth / Kimi for Coding endpoints, and any additional LiteLLM-backed providers exposed in the implementation environment. The rebuilt runtime must then be verified through direct runtime probes and Pi CLI requests sent both to the exact model id under investigation and to routing aliases, including at least one verification path that proves portable continuation survives a provider-shape boundary.

## TODO

- [x] Ground the run in the current Codex adapter, benchmark runner, and provider-openai semantics
- [x] Add explicit source-of-truth references to current OpenAI Responses and Chat Completions docs
- [x] Add concrete current-code references with examples and defect descriptions
- [x] Convert the benchmark failure into backend-owned requirement IDs
- [x] Capture non-stream, stream, continuation, and benchmark-migration requirements
- [x] Make strict TDD, regression ownership, and rebuilt-runtime Pi CLI verification explicit
- [x] Make cross-provider portability across Codex, DeepSeek, and Kimi execution shapes explicit
- [x] Document out-of-scope boundaries plus fixed architectural decisions
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `backend bugfix and benchmark-parity repair`
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/packages/provider-openai/**`
- Secondary subsystems:
  - `role-model-router/apps/runtime-host-bridge/test/**`
  - `role-model-router/apps/runtime-ui/**` only if an existing operator or inspection surface needs compatibility updates
- User-visible outcome:
  - `chatgpt/gpt-5.4` and Codex Subscription aliases can emit and continue function-tool calls correctly through both `/v1/chat/completions` and `/v1/responses`, route-switch continuity stays truthful when execution moves between Codex Subscription, the current LiteLLM-backed DeepSeek path, direct Kimi code or Kimi OAuth / Kimi for Coding endpoints, and any additional LiteLLM-backed providers available in the test environment, and benchmark results no longer under-score GPT because the adapter dropped tool calls or because the benchmark used the older Chat Completions path
- Main risk theme:
  - a shallow workaround could make the benchmark look better while leaving the Codex Subscription compatibility contract broken for real downstream clients

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `52-codex-subscription-benchmark-tool-path` | earlier Codex benchmark failures were adapter defects rather than model quality, and benchmark truth must stay backend-owned |
| `62-litellm-pi-craft-codex-execution-hardening` | introduced the current native `codex-subscription-responses` execution family and the response-shaping seams now under repair |
| `65-codex-subscription-prompt-cache-parity` | recent Codex-native response shaping already touched transcript normalization and synthetic OpenAI response bodies |
| `66-remote-providers-deferred-request-id-loading` | current recursive baseline and test or QA expectations for high-risk runtime regressions |

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| user guidance in chat on `2026-07-12` | defines the exact concern: GPT-5.4 benchmark underperformance is suspected to be a benchmark or adapter defect rather than true model quality, and the repaired runtime must be verified through Pi CLI against both the exact model id and a routing alias |
| `https://developers.openai.com/api/docs/guides/migrate-to-responses?update-multiturn=responses` | current official migration guidance from Chat Completions to Responses, including typed `input` and `output` items, `previous_response_id`, `store`, and the distinction between typed `output` items versus convenience `output_text` |
| `https://developers.openai.com/api/docs/guides/reasoning#keeping-reasoning-items-in-context` | current official requirement for preserving reasoning items, function-call items, and function-call-output items across tool turns, either via `previous_response_id` or replay of prior `output` items |
| `https://developers.openai.com/api/docs/guides/tools` | current official tool schema and caller-controlled tool behavior on the Responses API, including `tool_choice` and `parallel_tool_calls` rather than adapter-forced tool policy |
| `https://developers.openai.com/api/docs/guides/function-calling` | current official function-calling guidance that a model may call multiple functions in one turn, that `parallel_tool_calls: false` constrains function-tool turns to zero or one call, and that built-in tools have different parallel-call limits |
| `https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/` | current official Chat Completions contract for `tool_choice`, `message.tool_calls`, `tool_call_id`, and `finish_reason: "tool_calls"` |
| `/.recursive/STATE.md` | current runtime truth for Codex Subscription execution, routed execution semantics, and current Responses request-shaping decisions |
| `/.recursive/DECISIONS.md` | durable record that the current Codex Subscription path came from run 62 and that run 65 focused on prompt-cache parity instead of tool-call parity |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | durable truth for Codex Subscription transport identity, OpenAI-compatible downstream obligations, and benchmark or verification expectations |
| `https://github.com/MoonshotAI/Kimi-K2.5` | official public Moonshot GitHub evidence that the documented public Kimi API usage is chat-completions-centric today and that the model's public examples surface reasoning content on chat-completions responses |
| `https://github.com/MoonshotAI/kimi-code` | official public Moonshot GitHub evidence that Kimi Code is an open-source CLI and agent runtime, but not public proof of the hosted `api.kimi.com/coding/v1` server contract by itself |
| `https://github.com/BerriAI/litellm/blob/main/litellm/proxy/route_llm_request.py` | public LiteLLM code proof that the proxy exposes both `/chat/completions` and `/responses` routes as separate surfaces |
| `https://github.com/BerriAI/litellm/blob/main/litellm/llms/deepseek/chat/transformation.py` | public LiteLLM code proof that the native DeepSeek provider implementation translates OpenAI-compatible Chat Completions into upstream DeepSeek `/chat/completions` requests and not a native `/responses` upstream |
| `https://github.com/BerriAI/litellm/blob/main/litellm/llms/moonshot/chat/transformation.py` | public LiteLLM code proof that the native Moonshot provider implementation translates OpenAI-compatible Chat Completions into upstream Moonshot `/chat/completions` requests and not a native `/responses` upstream |
| `https://github.com/BerriAI/litellm/blob/main/litellm/responses/main.py` | public LiteLLM code proof that LiteLLM's `/responses` entrypoint can intentionally route through a Chat Completions transformation path when the selected provider lacks native Responses support or when `use_chat_completions_api` is enabled |
| `https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json` | public LiteLLM code proof that current direct DeepSeek and Moonshot model entries are registered as `mode: "chat"` rather than `mode: "responses"` |
| `https://github.com/BerriAI/litellm/blob/main/docs/my-website/docs/providers/bedrock_imported.md` | public LiteLLM repo evidence that current documented Kimi and DeepSeek usage in the repo remains strongly chat-completions-centric, including tool-calling examples on that surface |
| `https://github.com/earendil-works/pi/tree/main/packages/ai` | public Pi AI reference that one real client library treats tool handling, streaming tool-call parsing, and cross-provider handoffs as first-class concerns rather than optional extras |
| `https://github.com/earendil-works/pi/blob/main/packages/ai/src/providers/openai-codex-responses.ts` | public Pi AI code proof that one real Codex Responses client request shape carries `previous_response_id`, `prompt_cache_key`, `tool_choice`, and `parallel_tool_calls`, and that its current Codex request builder defaults `parallel_tool_calls: true` when tools are present |
| `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` | proves the benchmark currently executes through the older non-stream Chat Completions path |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | contains the current Codex transcript reduction, downstream response synthesis, request shaping, and continuation mapping seams that lose tool semantics |
| `role-model-router/packages/adapter-execution/test/index.test.ts` | proves the generic runtime already spans both `openai.responses` and `openai.chat.completions` request shapes, including Kimi and LiteLLM-backed remotes that must remain continuation-compatible after this repair |
| `role-model-router/packages/provider-openai/src/index.ts` | provides the repo-local reference implementation for richer Responses transcript reconstruction and forwarding of `previous_response_id` |
| `role-model-router/apps/runtime-host-bridge/test/index.test.ts` and `role-model-router/packages/provider-openai/test/index.test.ts` | current automated floor and proof of the missing non-stream Codex tool-parity coverage |

## Problem Summary

The current benchmark path uses the runtime's non-stream `/v1/chat/completions` ingress. For Codex Subscription, that ingress is translated upstream into the native ChatGPT Codex Responses transport, but the adapter's non-stream reduction path currently flattens the upstream SSE transcript into text-only output and drops `function_call` items. As a result:

- non-stream `/v1/chat/completions` replies can return an empty assistant message instead of `message.tool_calls`
- non-stream `/v1/responses` replies can return an empty assistant message instead of `output` items containing `function_call`
- continuation turns are not faithfully represented because assistant tool calls and `role:"tool"` follow-up messages are not converted into Responses-native `function_call` and `function_call_output` items
- benchmark tool-bearing cases can score as model failures even when the upstream Codex Responses stream actually produced a valid tool call

The benchmark also remains anchored to the older Chat Completions execution path even though current OpenAI guidance for tool-bearing GPT-5.x work centers the Responses API. This run therefore has two linked outcomes:

1. repair the runtime's Codex Subscription compatibility and continuation contract
2. migrate Codex tool-bearing benchmark execution to `/v1/responses`

This run does not "solve" the issue by changing only the benchmark surface. `/v1/chat/completions` compatibility must remain truthful for downstream callers.

Because the runtime can route across multiple OpenAI-compatible providers that do not all share the same upstream shape, this run also cannot define "fixed" as Codex-only same-provider continuation. The repaired continuity must survive provider-shape boundaries:

- Codex Subscription currently terminates on a Responses-style backend
- Kimi code endpoints and current LiteLLM-backed OpenAI-compatible remotes are exercised locally as Chat Completions-style targets
- portable tool-loop continuity therefore has to be preserved in a provider-neutral internal model and rendered at the adapter edge for the selected target shape

## Authoritative OpenAI API Contract

This run is governed by current official OpenAI documentation, and Phase 1 must treat those docs as the source of truth for tool semantics rather than relying on repo-local assumptions.

### Responses API source of truth

Primary references:
- `https://developers.openai.com/api/docs/guides/migrate-to-responses?update-multiturn=responses`
- `https://developers.openai.com/api/docs/guides/reasoning#keeping-reasoning-items-in-context`
- `https://developers.openai.com/api/docs/guides/tools`

These documents define the current expected behavior for:
- migrating tool-bearing workloads from `POST /v1/chat/completions` to `POST /v1/responses`
- typed `input` and typed `output` item semantics rather than text-only response parsing
- `function_call` output items and `function_call_output` input items linked by `call_id`
- `previous_response_id` continuation semantics
- preserving reasoning items, function-call items, and function-call-output items across tool turns for reasoning models
- richer tool behavior on reasoning-capable GPT-5.x models through the Responses API
- caller-controlled tool settings such as `tool_choice` and `parallel_tool_calls`

### Binding doc-derived facts verified on `2026-07-12`

Phase 1, Phase 3, Phase 4, and Phase 5 must treat the following as binding unless direct evidence proves an upstream-native Codex Subscription deviation:

1. The Responses API is a typed-item contract. Tool-bearing integrations must read and preserve typed `output` items; `output_text` is a convenience projection, not a sufficient source of truth for function-tool turns.
2. Multi-turn Responses state may be preserved through `previous_response_id`; when the runtime is operating with `store: false`, the caller must preserve or replay the required prior items for the next turn.
3. For reasoning-plus-tool workflows, the docs explicitly recommend passing back reasoning items, function-call items, and function-call-output items since the last user message.
4. Tool policy is caller-controlled. The adapter may forward or default supported controls, but it must not silently force `parallel_tool_calls: true` or otherwise rewrite caller intent without a documented transport requirement.
5. The official function-calling guide says the model may choose to call multiple functions in a single turn when function tools are available, and that `parallel_tool_calls: false` ensures exactly zero or one tool is called.
6. The same guide says parallel function calling is not possible when using built-in tools. Therefore this run must distinguish function-tool multi-call guarantees from built-in-tool behavior and must not claim broader multi-call support than the selected surface truthfully provides.
7. GitHub verification on `2026-07-12`: Pi's public `openai-codex-responses.ts` client carries `previous_response_id`, `prompt_cache_key`, `tool_choice`, and `parallel_tool_calls` in its Codex Responses request shape and currently defaults `parallel_tool_calls: true` in its Codex request builder. This is not the contract source of truth, but it proves at least one real downstream client expects those controls to survive request shaping.

### Chat Completions API source of truth

Primary reference:
- `https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/`

This document defines the current expected behavior for:
- `tool_choice` values including `none`, `auto`, `required`, and named-tool forcing
- `message.tool_calls` as the assistant tool-call container on Chat Completions
- `tool_call_id` continuation semantics on `role:"tool"` follow-up messages
- `finish_reason: "tool_calls"` when the assistant stops to request tool execution
- the compatibility expectations the runtime must preserve on `/v1/chat/completions` even after benchmark migration

### Parallel function-calling source of truth

Primary references:
- `https://developers.openai.com/api/docs/guides/function-calling`
- `https://developers.openai.com/api/reference/resources/responses/methods/create/`

These documents define the current expected behavior for:
- zero, one, or multiple sibling function calls in a single assistant turn when the caller permits them
- `parallel_tool_calls` as a caller-controlled Responses request field rather than an adapter-owned default
- `parallel_tool_calls: false` as a hard zero-or-one constraint for function-tool turns
- built-in tools as a distinct case where the docs do not promise parallel multi-call behavior

### Binding interpretation for this run

1. The benchmark should move to the newer Responses API for Codex tool benchmarks because current OpenAI guidance treats Responses as the primary tool-bearing surface and explicitly frames migration as moving generation to `/v1/responses`, reading typed `output`, and managing state through `previous_response_id` or replayed items.
2. The runtime must still keep `/v1/chat/completions` truthful for downstream compatibility. Benchmark migration does not excuse a broken Codex chat-completions compatibility layer.
3. Inference from the docs plus the local adapter estate: `previous_response_id` and any other provider-native response-chain handles are optimizations for same-provider continuation, not a portable cross-provider state format. Cross-provider correctness therefore must come from replayable typed history, not opaque provider-native ids.
4. Inference from the docs plus the local adapter estate: encrypted reasoning payloads and other provider-specific opaque artifacts must be treated as target-specific hints, not as mandatory portable continuity inputs, unless Phase 1 proves a given target accepts them.
5. For this run, tool-call parity includes sibling tool-call arrays and matching sibling tool outputs, not only single-call turns.
6. GitHub verification on `2026-07-12`: the official public Moonshot `Kimi-K2.5` repository documents official API usage with `client.chat.completions.create(...)`. This is strong public evidence that public Kimi integration remains chat-completions-first, but it is not proof that the separate hosted Kimi Code endpoint lacks `/responses`.
7. GitHub verification on `2026-07-12`: the official public Moonshot `kimi-code` repository is a CLI and agent runtime codebase, not the hosted Kimi Code API server. Therefore its code can inform client-side expectations and workflows, but it cannot by itself prove the exact wire contract exposed by `https://api.kimi.com/coding/v1`.
8. GitHub verification on `2026-07-12`: the public LiteLLM codebase exposes both `/chat/completions` and `/responses` as separate routed surfaces, so it is incorrect to treat LiteLLM itself as chat-completions-only in the abstract.
9. GitHub verification on `2026-07-12`: the current LiteLLM direct DeepSeek provider implementation is a Chat Completions translator whose endpoint builder appends `/chat/completions`, and the current LiteLLM direct Moonshot provider implementation does the same for Moonshot. Their current direct model metadata is registered as `mode: "chat"`, not `mode: "responses"`.
10. GitHub verification on `2026-07-12`: the current LiteLLM `/responses` entrypoint can deliberately route through a Chat Completions transformation handler when the selected provider lacks native Responses support or when `use_chat_completions_api` is enabled. Therefore a route accepting `POST /v1/responses` at LiteLLM is not by itself proof that the selected upstream provider is native Responses.
11. Binding inference from the current LiteLLM codebase: for current LiteLLM-backed DeepSeek and other LiteLLM-routed provider paths that are not directly proven native Responses upstreams, the safe default classification is `Responses ingress -> Chat Completions upstream bridge` unless direct runtime evidence proves native Responses support for the selected live target.
12. GitHub verification on `2026-07-12`: the public LiteLLM repository's current documented DeepSeek and Moonshot examples are still predominantly chat-completions-oriented. Therefore Phase 1 must verify any claim that a selected LiteLLM-routed target truly supports a usable `/responses` tool-continuation contract before the run relies on it.
13. If current runtime behavior conflicts with the OpenAI docs, the docs win unless Phase 1 records a verified upstream-native Codex Subscription transport deviation with direct evidence.

### Cross-provider route-switch handling matrix

This matrix is binding for the four named route-switch cases currently in scope plus the generic LiteLLM compatibility cases below. Phase 1 may refine a target shape only if direct runtime evidence proves the selected provider supports a richer contract than the local adapter inventory currently declares.

For this run, route classification must distinguish between:
- `native Responses upstream`
- `native Chat Completions upstream`
- `Responses ingress -> Chat Completions upstream bridge`

A proxy or router advertising `/v1/responses` is not enough to classify the target as native Responses. Current LiteLLM-backed DeepSeek and other LiteLLM-routed provider paths must be treated as the bridge class by default unless Phase 1 records contrary live evidence for the exact selected target.

Support status note for the matrix, verified on `2026-07-12`:
- `codex` / OpenAI Responses function tools are officially documented to allow multiple function calls in one turn and to accept request-side `parallel_tool_calls`; this does not extend to built-in tools, where the current OpenAI function-calling guide explicitly says parallel function calling is unavailable
- direct DeepSeek function calling is officially documented to support multiple functions in one call and parallel function calls; current LiteLLM DeepSeek routes remain Chat Completions upstreams and only support function tools on that path
- current Kimi official docs clearly document that a response may contain multiple `tool_calls` and that callers must return all of them for continuation, but the docs searched for this run did not expose an official Kimi `parallel_tool_calls` request parameter; therefore Kimi multi-tool-turn preservation is documented, while request-side parallel policy handling remains conditional pending live proof
- repo-local catalog and runtime-test evidence show the current Moonshot or Kimi OAuth or Kimi for Coding path is direct to `https://api.kimi.com/coding/v1` rather than routed through a LiteLLM proxy. Therefore the named Kimi rows below cover both direct API-key Kimi code endpoints and direct Kimi OAuth or Kimi for Coding endpoints
- a LiteLLM `/responses` ingress is never capability proof by itself; target capability must be attributed to the verified upstream provider contract, not to the proxy surface alone

| Route switch | Current source shape | Current target shape | Continuity input that MUST survive | Provider-native state that MUST NOT be treated as portable | Required adapter rendering on target turn | Verification requirement |
| --- | --- | --- | --- | --- | --- | --- |
| `codex -> kimi` | `openai.responses` / native Codex Responses backend | `openai.chat.completions` for current direct Kimi code endpoints, including direct API-key Kimi code and direct Kimi OAuth / Kimi for Coding routes | assistant text, assistant tool calls including any sibling multi-call set with stable order and ids, tool outputs, finish-reason truth, and explicit caller tool settings such as `parallel_tool_calls: true`, `parallel_tool_calls: false`, or unset when the target truthfully supports them | `previous_response_id`, encrypted reasoning items, any Codex-only opaque response item or response-chain handle | render prior assistant tool calls as `message.tool_calls`, render tool outputs as `role:"tool"` messages with matching `tool_call_id`, preserve every sibling call and sibling tool result without collapsing them, preserve truthful assistant text without fabricating a completed no-tool turn, and forward explicit parallel function-calling policy only when the target truthfully supports it or else emit explicit capability diagnostics | regression plus live proof that a tool-emitting Codex turn can continue on direct Kimi code or direct Kimi OAuth / Kimi for Coding without forwarding stale Codex-native chain state, including at least one proof of a sibling multi-tool-call turn plus explicit `parallel_tool_calls` preservation or explicit unsupported-target diagnostics |
| `codex -> deepseek` | `openai.responses` / native Codex Responses backend | default assumption: `Responses ingress -> Chat Completions upstream bridge` via the current LiteLLM-backed DeepSeek route unless Phase 1 proves a richer contract for the exact live target | assistant text, assistant tool calls including any sibling multi-call set with stable order and ids, tool outputs, finish-reason truth, portable reasoning context only if target accepts it, and explicit caller tool settings such as `parallel_tool_calls: true`, `parallel_tool_calls: false`, or unset when the target truthfully supports them | `previous_response_id`, encrypted reasoning items, any Codex-only opaque response item or response-chain handle | same portability rule as `codex -> kimi`: replay portable history into Chat Completions messages and tool results, preserve every sibling call and sibling tool result without collapsing them, do not fake Responses-native state on the DeepSeek side, and forward explicit parallel function-calling policy only when the target truthfully supports it or else emit explicit capability diagnostics | regression plus live proof that a tool-emitting Codex turn can continue on the LiteLLM-backed DeepSeek route without forwarding stale Codex-native chain state, including at least one proof of a sibling multi-tool-call turn plus explicit `parallel_tool_calls` preservation or explicit unsupported-target diagnostics |
| `kimi -> codex` | `openai.chat.completions` for current direct Kimi code endpoints, including direct API-key Kimi code and direct Kimi OAuth / Kimi for Coding routes | `openai.responses` / native Codex Responses backend | assistant text, `message.tool_calls` including any sibling multi-call set with stable order and ids, `role:"tool"` outputs, finish-reason truth, and explicit caller tool settings such as `parallel_tool_calls: true`, `parallel_tool_calls: false`, or unset when the target truthfully supports them | any Kimi-side chat-completions-only message formatting assumptions, fake or synthesized `previous_response_id`, provider-side opaque state not present in portable history | render assistant tool calls into Responses `function_call` items, render tool outputs into `function_call_output` items with matching `call_id`, preserve every sibling call and sibling tool result without collapsing them, omit `previous_response_id` on route switch and rely on replayable typed history, and forward explicit parallel function-calling policy only when the target truthfully supports it or else emit explicit capability diagnostics | regression plus live proof that a direct Kimi code or direct Kimi OAuth / Kimi for Coding tool loop can continue on Codex and still produce either a truthful next tool call or a truthful final assistant answer, including at least one proof of a sibling multi-tool-call turn plus explicit `parallel_tool_calls` preservation or explicit unsupported-target diagnostics |
| `deepseek -> codex` | default assumption: `Responses ingress -> Chat Completions upstream bridge` via the current LiteLLM-backed DeepSeek route unless Phase 1 proves a richer contract for the exact live target | `openai.responses` / native Codex Responses backend | assistant text, `message.tool_calls` including any sibling multi-call set with stable order and ids, `role:"tool"` outputs, finish-reason truth, and explicit caller tool settings such as `parallel_tool_calls: true`, `parallel_tool_calls: false`, or unset when the target truthfully supports them | any DeepSeek-side chat-completions-only message formatting assumptions, fake or synthesized `previous_response_id`, provider-side opaque state not present in portable history | same portability rule as `kimi -> codex`: convert portable chat-completions tool-loop state into Responses-native `function_call` plus `function_call_output` items before the Codex turn, preserve every sibling call and sibling tool result without collapsing them, and forward explicit parallel function-calling policy only when the target truthfully supports it or else emit explicit capability diagnostics | regression plus live proof that the LiteLLM-backed DeepSeek tool loop can continue on Codex and still produce either a truthful next tool call or a truthful final assistant answer, including at least one proof of a sibling multi-tool-call turn plus explicit `parallel_tool_calls` preservation or explicit unsupported-target diagnostics |
| `codex -> generic LiteLLM-backed provider` | `openai.responses` / native Codex Responses backend | target shape must be classified per exact LiteLLM route as `native Responses upstream`, `native Chat Completions upstream`, or `Responses ingress -> Chat Completions upstream bridge` using verified provider metadata, supported-endpoint evidence, and live proof rather than proxy surface alone | assistant text, assistant tool calls including any sibling multi-call set with stable order and ids, tool outputs, finish-reason truth, portable reasoning context only if the verified upstream accepts it, and explicit caller tool settings such as `parallel_tool_calls: true`, `parallel_tool_calls: false`, or unset when the verified upstream truthfully supports them | `previous_response_id`, encrypted reasoning items, any Codex-only opaque response item or response-chain handle, and any LiteLLM-local affinity or deployment hints that are not proven portable across provider or request-shape switches | classify first, then render to the verified upstream shape: use Responses-native rendering only for a verified native Responses upstream, use Chat Completions rendering for a verified chat upstream or bridge target, preserve every sibling call and sibling tool result without collapsing them, and forward explicit parallel function-calling policy only when the verified upstream contract supports it or else emit explicit capability diagnostics | regression plus live proof that at least one LiteLLM-backed provider route other than the named DeepSeek case is classified from evidence rather than assumption, and that cross-provider continuation preserves or truthfully declines sibling multi-tool-call plus `parallel_tool_calls` behavior according to the verified upstream contract |
| `generic LiteLLM-backed provider -> codex` | source shape must be classified per exact LiteLLM route as `native Responses upstream`, `native Chat Completions upstream`, or `Responses ingress -> Chat Completions upstream bridge` using verified provider metadata, supported-endpoint evidence, and live proof rather than proxy surface alone | `openai.responses` / native Codex Responses backend | assistant text, tool calls including any sibling multi-call set with stable order and ids, tool outputs, finish-reason truth, portable reasoning context only if it can be truthfully replayed, and explicit caller tool settings such as `parallel_tool_calls: true`, `parallel_tool_calls: false`, or unset when those settings are actually represented in portable history | fake or synthesized `previous_response_id`, provider-side opaque state not present in portable history, and any LiteLLM-local proxy or deployment metadata that the Codex target cannot truthfully consume as same-provider chain state | classify first, then convert the portable LiteLLM-side history into Responses-native `function_call` plus `function_call_output` items for Codex, preserve every sibling call and sibling tool result without collapsing them, omit provider-native chain ids on route switch, and preserve explicit parallel function-calling policy only when it is actually represented and portable from the verified source contract | regression plus live proof that at least one LiteLLM-backed provider route other than the named DeepSeek case can continue onto Codex using evidence-based classification, and that the runtime preserves or truthfully declines sibling multi-tool-call plus `parallel_tool_calls` behavior according to the verified source contract |

Universal rule across all named route-switch and generic LiteLLM cases:

- portable continuity comes from replayable conversation history, not provider-native chain ids
- if a source turn contains multiple sibling tool calls, the runtime preserves every sibling call, stable ids, relative ordering, and the one-to-one mapping to returned tool outputs across any route switch
- route-switch turns must emit an explicit diagnostic or receipt when nonportable provider-native fields are dropped
- the adapter may use same-provider optimizations only when the current selected target can truthfully consume them from the immediately preceding same-provider chain
- Phase 1, Phase 4, and Phase 5 evidence must record both the client-visible ingress wire API and the verified upstream provider wire shape for any LiteLLM-backed or compatibility-layer-backed verification path

## Current Codebase Evidence And Issue Inventory

### `C1` Benchmark runner is still anchored to the older non-stream Chat Completions path

Code references:
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts:331`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts:380`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts:612`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts:1606`

Current example:
- benchmark execution calls `deps.executeChatCompletions(...)`
- the benchmark path does not provide a stream writer
- tool-bearing benchmark cases therefore exercise the runtime's non-stream compatibility behavior

Current issue:
- Codex tool benchmarks are currently routed through the older non-stream `chat/completions` path even though OpenAI's current tool-first guidance favors Responses
- this makes the benchmark sensitive to the runtime's broken non-stream Codex compatibility layer instead of the upstream model's actual tool behavior

### `C2` The Codex transcript reducer drops `function_call` items

Code reference:
- `role-model-router/apps/runtime-host-bridge/src/index.ts:9998`

Current example:
- the reducer accumulates `response.output_text.delta`
- it accumulates `response.reasoning_summary_text.delta` and `response.reasoning_text.delta`
- on `response.output_item.done`, it only extracts final `message` text and final `reasoning` text
- it does not persist `function_call` items or `response.function_call_arguments.*`

Current issue:
- non-stream tool-bearing Codex turns are flattened into text-only transcripts
- once this reduction runs, downstream builders no longer have enough information to emit `message.tool_calls` or Responses `function_call` items

### `C3` The streaming Codex mapper already knows the right tool-call shape

Code reference:
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10206`

Current example:
- the stream mapper records `response.output_item.added` when the item type is `function_call`
- it tracks `call_id`, function name, and streamed argument deltas
- it emits downstream Chat Completions `delta.tool_calls`
- it finishes with `finish_reason: "tool_calls"` when a tool call was emitted

Current issue:
- there is a parity gap between the working streaming path and the broken non-stream path
- the repo already contains the correct streaming-side contract, but the non-stream reduction and synthesis path diverges from it

### `C4` Non-stream Chat Completions synthesis cannot emit `tool_calls`

Code reference:
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10365`

Current example:
- the non-stream builder returns only `message.role`, `message.content`, and optional `reasoning_content`

Current issue:
- there is no path for `choices[0].message.tool_calls`
- there is no path for `finish_reason: "tool_calls"` when the upstream response stopped for tool execution

### `C5` Non-stream Responses synthesis cannot emit `function_call` items

Code reference:
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10391`

Current example:
- the non-stream Responses builder returns only an optional `reasoning` item plus one assistant `message` item with text content

Current issue:
- there is no path for `output` entries of type `function_call`
- there is no path for truthful incomplete or tool-call status serialization

### `C6` Chat-history conversion breaks tool-loop continuation semantics

Code reference:
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10488`

Current example:
- the role mapper treats `assistant` specially
- every other non-system message is effectively treated as `user`
- assistant `tool_calls` are not converted into Responses-native `function_call` items
- `role:"tool"` messages are not converted into `function_call_output` items

Current issue:
- continuation turns lose tool-loop structure
- a chat-completions conversation with assistant tool calls plus tool outputs cannot round-trip cleanly into the Codex Responses backend

### `C7` The Codex request builder lags the documented Responses contract

Code reference:
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10648`

Current example:
- the builder always sends `stream: true`
- it always includes `reasoning.encrypted_content`
- when tools are present it always sends `parallel_tool_calls: true`
- it forwards `tool_choice`
- it forwards `prompt_cache_key`
- it does not forward `previous_response_id`

Current issue:
- the runtime forces tool behavior the caller did not necessarily request
- the runtime currently drops a core Responses continuation field: `previous_response_id`
- the current request builder does not align cleanly with the OpenAI Responses source-of-truth contract

### `C8` The runtime already has a good repo-local Responses reference implementation

Code references:
- `role-model-router/packages/provider-openai/src/index.ts:512`
- `role-model-router/packages/provider-openai/src/index.ts:801`
- `role-model-router/packages/provider-openai/src/index.ts:829`

Current example:
- the shared OpenAI Responses parser already reconstructs ordered `message` and `function_call` items from streamed Responses transcripts
- the direct OpenAI Responses request builder already forwards `previous_response_id`

Current issue:
- the Codex-specific adapter does not reuse or match this richer item-level contract
- the same repo currently has two different internal standards for Responses-style tool handling

### `C9` The generic adapter estate already spans both Responses and Chat Completions targets

Code references:
- `role-model-router/packages/provider-openai/src/index.ts:751`
- `role-model-router/packages/provider-openai/src/index.ts:805`
- `role-model-router/packages/provider-openai/src/index.ts:830`
- `role-model-router/packages/adapter-execution/test/index.test.ts:266`
- `role-model-router/packages/adapter-execution/test/index.test.ts:1065`
- `role-model-router/packages/adapter-execution/test/index.test.ts:1170`

Current example:
- the generic provider-openai adapter can build either `/chat/completions` or `/responses` requests from one normalized execution request
- the generic provider-openai adapter forwards `previous_response_id` on the Responses path
- local adapter-execution tests prove Kimi code currently runs as `openai.chat.completions`

Current issue:
- a repair that is only correct for same-provider Codex continuation will still break once routing moves a later turn onto a Chat Completions-style target
- the runtime needs one provider-neutral continuity model that can be rendered truthfully to both request shapes

### `C10` The current Codex adapter edge still applies Codex-specific shaping before provider-neutral portability is guaranteed

Code references:
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10488`
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10648`
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10682`
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10686`
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10687`

Current example:
- the Codex adapter converts chat-history requests into Codex Responses input through a role-and-content mapper
- the adapter includes encrypted reasoning
- the adapter defaults `tool_choice`
- the adapter forces `parallel_tool_calls: true`

Current issue:
- portability rules are not yet clearly separated from target-specific request shaping
- nonportable provider-native details could leak into the generic continuity path, or portable history could be degraded too early before route selection is finalized

## Current Test Coverage And Gaps

### `T1` Existing Codex tests cover streaming text and cache, not non-stream tool parity

Code references:
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts:3382`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts:3570`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts:3758`

Current example:
- current tests assert streamed Codex SSE text-delta mapping
- current tests assert supported-zero cache detail on a non-stream Responses reply
- current tests assert assistant history is preserved as `output_text`

Current issue:
- there is no owning test proving non-stream Codex `/v1/chat/completions` emits `message.tool_calls`
- there is no owning test proving non-stream Codex `/v1/responses` emits `function_call` items
- there is no owning test proving assistant tool calls plus `role:"tool"` continuation are converted into Responses-native continuation items

### `T2` The repo already has a good test example for streamed Responses tool-call reconstruction

Code reference:
- `role-model-router/packages/provider-openai/test/index.test.ts:180`

Current example:
- the provider-openai tests already prove reconstruction of streamed Responses `function_call` items into normalized tool-call data

Current issue:
- the Codex adapter lacks equivalent contract tests for its own transcript reduction and downstream synthesis layer

## Fixed Decisions

1. Codex Subscription remains on the native `chatgpt-codex-responses` / `codex-subscription-responses` execution family.
2. The repair must preserve item-level Responses semantics internally; it must not flatten tool-bearing turns into text-only transcripts.
3. The runtime's `/v1/chat/completions` compatibility surface remains supported and must become truthful for non-stream tool use.
4. The benchmark runner should migrate from the older non-stream `chat/completions` execution path to the newer `/v1/responses` path for Codex tool-bearing benchmark execution.
5. Benchmark migration does not replace the need to repair `/v1/chat/completions` compatibility for Codex Subscription; both surfaces remain in scope.
6. Tool names, `call_id`, arguments, reasoning items, and finish reasons must remain truth-based; the runtime must not fabricate or heuristically rewrite them.

## Requirements

### `R1` Preserve typed Codex Responses items through transcript normalization

Description:
The native Codex Subscription transcript-normalization path must preserve ordered typed output items and response status facts instead of collapsing everything into plain text plus usage totals.

Acceptance criteria:
- the normalization path preserves `message`, `reasoning`, and `function_call` items with their stable ids, `call_id`, names, arguments, and output ordering
- normalization preserves terminal response status, incomplete reason, and usage facts needed to distinguish `stop`, `tool_calls`, and length-style incompletes
- tool-only turns are not collapsed into an empty assistant message
- non-stream and stream-fed transcript collection use one compatible item model instead of divergent ad hoc logic

### `R2` Synthesize truthful non-stream downstream OpenAI-compatible bodies

Description:
The runtime-owned non-stream downstream response builders must serialize preserved tool items correctly on both supported OpenAI-compatible ingress surfaces.

Acceptance criteria:
- non-stream `/v1/chat/completions` replies emit `choices[0].message.tool_calls` when the upstream Codex response contains a function call
- non-stream `/v1/chat/completions` uses `finish_reason: "tool_calls"` when the assistant turn stops for tool execution
- non-stream `/v1/responses` replies emit `output` entries containing `function_call` items with the correct `call_id`, name, and JSON-encoded arguments
- when the upstream Codex turn contains multiple sibling function calls, non-stream `/v1/chat/completions` replies preserve every `message.tool_calls[]` entry with stable ids, arguments, and source order instead of collapsing the turn to one call or blank text
- when the upstream Codex turn contains multiple sibling function calls, non-stream `/v1/responses` replies preserve every `function_call` item with stable `call_id`, arguments, and source order
- when the assistant emits only a tool call, empty or null text content is allowed, but the tool-call item must still be present
- non-stream response shaping preserves truthful usage and status facts rather than always synthesizing a completed empty assistant message

### `R3` Preserve continuation semantics for tool-bearing Codex turns

Description:
The runtime must correctly map continuation turns into provider-neutral tool-loop state and then render that state truthfully for the selected target so Codex Subscription can continue after tool execution without losing context and route switches do not corrupt the conversation.

Acceptance criteria:
- assistant messages that carry `tool_calls` are converted into Responses-native `function_call` items rather than downgraded to ordinary assistant text
- `role:"tool"` follow-up messages with `tool_call_id` are converted into `function_call_output` items with the matching `call_id`
- continuation rendering preserves the full sibling set of assistant tool calls and the one-to-one mapping between each tool call and each returned tool output; no `tool_call_id` or `call_id` is dropped, merged, rebound, or reordered across the boundary
- `previous_response_id` remains preserved when provided by downstream callers and when the selected target can truthfully use the same provider-native response chain
- when the selected continuation target changes provider or request shape, correctness falls back to replay of portable conversation history rather than dependence on a provider-native response id
- when the runtime is operating with `store: false`, the continuation path preserves or replays the required prior portable tool and reasoning items needed for the next turn
- current continuation behavior that drops forced `tool_choice` only after tool-output continuation turns remains intact

### `R4` Keep Codex request shaping caller-truthful and transport-correct

Description:
The request builder for the native Codex Responses path must preserve supported downstream controls without imposing undocumented tool behavior, and the generic runtime must keep provider-specific continuity hints from becoming hard dependencies across route boundaries.

Acceptance criteria:
- `tool_choice`, reasoning controls, `prompt_cache_key`, and `previous_response_id` remain preserved on the Codex request path where supported today
- explicit downstream `parallel_tool_calls: true` or `parallel_tool_calls: false` survives request shaping on supported Codex Responses turns; when the caller leaves the field unset, the runtime does not silently force `true` merely because tools are present
- `previous_response_id` is not forwarded as a fake cross-provider continuity token when a continuation moves onto a different provider family or request shape
- encrypted reasoning items or any other opaque provider-native artifacts are not treated as mandatory portable cross-provider continuity inputs unless Phase 1 proves the selected target accepts them
- if a selected provider surface or tool family cannot truthfully honor the requested parallel function-calling behavior, the runtime records explicit diagnostics or capability handling instead of silently rewriting caller intent
- assistant-history conversion remains role-aware: user content stays `input_text` or equivalent user items, assistant history stays assistant output items, and tool results stay `function_call_output`
- if the run encounters function-name corruption on the native Responses path, Phase 1.5 isolates whether it originates locally or upstream and records the exact boundary before closeout

### `R5` Add owning-layer regression coverage for non-stream and continuation tool use

Description:
Automated tests must catch the exact regression family that caused the GPT-5.4 benchmark undercount.

Acceptance criteria:
- strict TDD is required for the owning regression families: Phase 3 must record RED evidence from failing tests before production changes and GREEN evidence after the fix, and the artifact must map each changed production seam to at least one named failing test before implementation begins
- host-bridge tests fail first and then pass for non-stream `/v1/chat/completions` tool-call synthesis on the Codex Subscription path
- host-bridge tests fail first and then pass for non-stream `/v1/responses` tool-call synthesis on the Codex Subscription path
- host-bridge tests fail first and then pass for tool-output continuation mapping from assistant tool calls plus `role:"tool"` messages into Responses-native continuation items
- host-bridge tests fail first and then pass for non-stream Codex synthesis with at least two sibling tool calls in one assistant turn, preserved order, and truthful tool-call ids on both downstream surfaces
- host-bridge or provider-openai tests fail first and then pass for continuation mapping with at least two sibling tool calls and matching sibling tool outputs keyed by distinct `tool_call_id` or `call_id` values
- request-builder tests fail first and then pass for explicit `parallel_tool_calls: false`, explicit `parallel_tool_calls: true`, and unset behavior on the Codex request path
- adapter-level or host-bridge-owned regressions fail first and then pass for at least one route switch from Codex Responses to a direct Kimi code target and one route switch in the opposite direction
- adapter-level or host-bridge-owned regressions fail first and then pass for at least one route switch from Codex Responses to a direct Kimi OAuth / Kimi for Coding target and one route switch in the opposite direction
- adapter-level or host-bridge-owned regressions fail first and then pass for at least one `Responses ingress -> Chat Completions upstream bridge` route, proving that tool continuity survives a Responses-facing proxy that terminates on the current LiteLLM-backed DeepSeek path
- adapter-level or host-bridge-owned regressions fail first and then pass for evidence-based classification plus continuation rendering on at least one generic LiteLLM-backed provider route other than the named DeepSeek case, or the Phase 5 artifact records the exact environment limitation that prevented a live generic LiteLLM proof
- at least one bridge-route regression proves a sibling multi-tool-call turn survives bridge rendering without collapsing multiple portable calls into one synthetic call
- adapter-level or host-bridge-owned regressions prove cross-provider continuation does not rely on forwarding a stale `previous_response_id` or other provider-native opaque state into an incompatible target
- existing Codex streaming-delta behavior remains green
- provider-openai regression coverage remains green for `previous_response_id`, prompt-cache, and OpenAI Responses tool-call parsing
- a benchmark-runner-level regression proves a Codex non-stream tool-bearing turn is no longer judged as a blank assistant response solely because the adapter dropped tool calls
- host-bridge non-stream and continuation regressions are owned in `role-model-router/apps/runtime-host-bridge/test/index.test.ts` unless Phase 1 records a narrower existing owning file
- provider-openai request-shaping and normalization regressions are owned in `role-model-router/packages/provider-openai/test/index.test.ts`
- route-switch matrix regressions are owned in `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts` unless Phase 1 records a stronger existing owning seam
- benchmark migration and benchmark-truth regressions are owned in `role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts` or another benchmark-runner-owned test file recorded explicitly in the Phase 3 artifact

### `R6` Verify repaired tool semantics against a live local runtime

Description:
The repaired contract must be verified against a rebuilt live runtime, not only against mocked unit transcripts.

Acceptance criteria:
- direct local runtime probes against `/v1/chat/completions` and `/v1/responses` show valid tool-call output for `chatgpt/gpt-5.4` on both stream and non-stream paths
- Pi CLI verification sends requests through the rebuilt runtime to both the exact model id under investigation and to a routing alias that resolves to the repaired Codex Subscription family
- Pi CLI verification covers at least one tool-emitting turn and one continuation turn that returns tool output back to the runtime
- runtime request receipts and Pi CLI stdout or stderr logs make it possible to prove which invocation used the exact model id and which invocation used the routing alias
- runtime request receipts and Pi CLI verification artifacts record whether each proof requested `parallel_tool_calls: true`, `parallel_tool_calls: false`, or left the field unset, and prove that the rebuilt runtime preserved that caller intent on the Codex request path
- a continuation turn that returns tool output to the runtime produces a final assistant answer or a truthful subsequent tool call
- Pi CLI verification proves at least one cross-provider continuation replay between Codex Subscription and a direct Kimi code target, and separately between Codex Subscription and a direct Kimi OAuth / Kimi for Coding target, without relying on provider-native chain ids
- Pi CLI or direct runtime verification proves at least one cross-provider continuation replay between Codex Subscription and the current LiteLLM-backed DeepSeek path without relying on provider-native chain ids
- if the environment exposes an additional generic LiteLLM-backed provider route beyond DeepSeek, Phase 5 verification exercises it; otherwise the artifact records the exact reason no extra generic LiteLLM proof was available
- if the selected cross-provider verification path passes through LiteLLM or another compatibility layer exposing `/v1/responses`, the evidence must also prove whether that path terminated on a native Responses upstream or on a Chat Completions upstream bridge, and must name the exact provider or endpoint family behind that bridge
- Pi CLI verification receipts explicitly separate direct-Kimi proofs from LiteLLM-backed proofs so the final artifact cannot accidentally attribute direct Kimi behavior to a LiteLLM bridge or vice versa
- evidence clearly distinguishes adapter-fixed behavior from any remaining upstream-native Codex anomalies
- the Phase 5 artifact records the exact Pi CLI commands or equivalent launcher invocations used for the exact-model and routing-alias proofs, the exact model id, the exact alias id, the runtime request ids, the selected endpoint ids, and the verified ingress plus upstream wire-shape classification for every proof case

### `R7` Migrate Codex tool benchmarks off the older non-stream Chat Completions execution path

Description:
The benchmark runner currently exercises Codex tool cases through the older non-stream `chat/completions` path. This run must add a Responses-based benchmark execution path so future Codex tool benchmarking follows OpenAI's current Responses tool contract directly.

Acceptance criteria:
- benchmark execution no longer depends exclusively on `executeChatCompletions(...)` for Codex tool-bearing cases
- Codex tool-bearing benchmark cases can run through `/v1/responses`
- benchmark extraction on the Responses path reads typed `output` items, including `function_call`
- benchmark continuation on the Responses path uses `function_call_output` and `call_id`
- benchmark migration does not remove or excuse the runtime's `/v1/chat/completions` compatibility obligations

### `R8` Revalidate benchmark truth after adapter repair and benchmark migration

Description:
The original GPT-5.4 benchmark concern must be closed against the repaired runtime and the migrated benchmark surface.

Acceptance criteria:
- the affected July 12, 2026 Codex tool-bearing benchmark cases are rerun after the adapter repair and the benchmark Responses migration
- GPT-5.4 no longer loses benchmark credit solely because the runtime dropped tool calls on a non-stream compatibility surface
- any remaining misses are classified as true model behavior, true benchmark-extraction behavior, or a separately isolated upstream-native issue with evidence
- final run artifacts explicitly separate adapter-fix evidence, benchmark-migration evidence, and post-fix benchmark outcome evidence

### `R9` Keep tool continuity fully cross-provider compatible across Codex, LiteLLM-backed DeepSeek, and Kimi code

Description:
The runtime is generic rather than Pi-specific. The repaired continuity model therefore must survive provider switches between native Responses targets, native Chat Completions targets, and Responses-ingress bridge targets that ultimately terminate on Chat Completions upstreams without corrupting tool state.

Acceptance criteria:
- the canonical internal continuation model is provider-neutral and can be rendered to both Responses and Chat Completions targets without losing tool-call semantics
- same-provider optimizations such as `previous_response_id` may be used opportunistically but are never required for correctness after a provider or request-shape switch
- route switches between `chatgpt/gpt-5.4` Codex Subscription and at least one `deepseek/*` or `moonshot/*` coding endpoint preserve assistant text, tool calls, tool outputs, and finish-reason truthfulness
- when a source turn contains multiple sibling tool calls, route switches preserve the entire sibling set, stable call ids, matching tool outputs, and relative order across both Responses and Chat Completions renderings
- when the selected target exposes `/v1/responses` but is backed by a Chat Completions upstream bridge, the runtime uses a bridge-safe Responses transformer rather than assuming provider-native Responses semantics
- when a selected provider cannot represent a detail portably, the adapter drops or translates only the nonportable field with explicit diagnostics or receipts instead of fabricating success or corrupting history
- final verification evidence separates same-provider Codex proof from cross-provider portability proof

### `R10` Distinguish native Responses targets from Responses-ingress bridges

Description:
The runtime must not infer upstream-native Responses semantics from the mere presence of a `/v1/responses` ingress on a proxy or router. Current LiteLLM-backed DeepSeek and other LiteLLM-routed providers require an explicit bridge classification and bridge-safe request or continuation shaping.

Acceptance criteria:
- route selection records or derives both the ingress wire API and the verified upstream provider wire shape before choosing same-provider-only optimizations such as `previous_response_id`
- a target exposing `/v1/responses` is not treated as a native Responses continuity peer unless Phase 1 records direct evidence of a native provider Responses contract for that exact live target
- when the selected route is `Responses ingress -> Chat Completions upstream bridge`, the runtime renders portable history into a bridge-safe Responses request shape and does not rely on provider-native Responses artifacts surviving the bridge
- bridge-safe request or continuation shaping preserves zero-or-one-versus-many function-call truth from portable history and never collapses multiple portable sibling tool calls into one synthetic call
- regression and live verification artifacts make it clear whether each proof case exercised a native Responses target, a native Chat Completions target, or a bridge target

## Out of Scope

- `OOS1`: benchmark scoring redesign, judge-model changes, or suite-authoring changes unrelated to the adapter defect or Responses migration
- `OOS2`: broad routing-policy, provider-ranking, or capability-discovery changes unrelated to tool-call parity
- `OOS3`: Pi or Craft upstream patches
- `OOS4`: unrelated prompt-cache, telemetry-chart, or runtime-ui visual work

## Constraints

- Phase 3 must use `TDD Mode: strict`
- strict TDD here means no production code before failing owning regression tests exist for the affected host-bridge and benchmark surfaces, with RED and GREEN evidence paths recorded in the Phase 3 artifact
- the fix must stay adapter-owned unless Phase 1.5 proves a narrower owning seam
- the run must not regress the currently working streamed Codex `chat/completions` tool-call path
- the run must not replace native Codex Subscription execution with a LiteLLM or API-key OpenAI fallback path
- the run must not fabricate successful tool calls when the upstream response did not actually emit them
- the run must not claim parallel sibling tool-call support on a built-in-tool surface where the current OpenAI docs explicitly say parallel function calling is unavailable
- the run must not define correctness in terms of same-provider-only `previous_response_id` reuse; cross-provider correctness has to come from portable replayable state
- the run must not leak provider-native opaque continuity artifacts into incompatible targets merely to keep a route-switch turn alive
- the run must not treat a proxy-exposed `/v1/responses` route as proof of a native Responses upstream when the current provider code or metadata shows a Chat Completions backend
- final verification is incomplete unless the rebuilt runtime is probed through Pi CLI on both an exact model id and a routing alias

## Assumptions

- the benchmark runner can add a Responses-based execution path without forcing a broad benchmark data-model redesign
- the current direct OpenAI Responses parser in `provider-openai` is a strong enough local reference point to guide the Codex parity repair
- the current QA runtime can expose at least one routing alias that resolves to the same Codex Subscription family as the exact model id under investigation, and Phase 1 will record the selected alias concretely
- the current QA runtime can expose at least one direct Kimi code or direct Kimi OAuth / Kimi for Coding endpoint plus at least one LiteLLM-backed DeepSeek endpoint for route-switch portability verification
- any remaining function-name corruption on the native Responses path can be isolated as either a local shaping bug or an upstream-native transport issue during Phase 1.5

## Coverage Gate

Coverage: PASS

- `R1` covers the root normalization defect
- `R2` covers truthful non-stream downstream response synthesis
- `R3` covers continuation and tool-output semantics
- `R4` covers request-shaping truthfulness
- `R5` requires durable regression tests and explicit strict-TDD RED and GREEN evidence
- `R6` requires rebuilt-runtime proof through both direct probes and Pi CLI exact-model plus alias verification
- `R7` makes benchmark migration to the Responses API explicit and doc-grounded
- `R8` closes the original GPT-5.4 benchmark concern with post-fix evidence
- `R9` makes cross-provider route-switch compatibility an explicit owned deliverable rather than an implicit hope
- sibling multi-tool-call parity and `parallel_tool_calls` propagation are now explicitly covered across `R2`, `R3`, `R4`, `R5`, `R6`, `R9`, and `R10` instead of being inferred from single-call cases
- OpenAI source-of-truth references and doc-derived binding facts are recorded explicitly so Phase 1 can audit against both external contract and repo-local behavior

## Approval Gate

Approval: PASS

- the defect is grounded in current code, current tests, Pi-facing verification expectations, and official OpenAI tool-calling semantics verified on `2026-07-12`
- the run is narrowly scoped to the Codex Subscription tool-call contract plus benchmark surface migration rather than a broad benchmark redesign
- the requirements preserve the current architectural boundary: native Codex Responses upstream, truthful OpenAI-compatible downstream surfaces, and provider-neutral continuity across route switches
- the run is concrete enough for Phase 0 and Phase 1 handoff without needing additional product-scoping clarification
