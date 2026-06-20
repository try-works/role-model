Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `03`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-03.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- OpenAI official docs for GPT-5.4, Responses tools, and Codex app-server
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-03.md`
- future implementation changes in runtime-host bridge and tests
Scope note: This addendum defines the implementation proposal for restoring truthful GPT-5.4 / Codex Subscription capability parity.

## Proposal

### Objective

Make `Codex Subscription` truthful and functional for GPT-5.4 capability routing:
- web search should work when routed to GPT-5.4
- request-scoped function tools should work when routed to GPT-5.4
- endpoint capability metadata should describe the actual transport after the bridge is fixed, not the current shim

### Phase 1: Request-Surface Parity

1. Extend runtime request parsing so `/v1/responses` accepts hosted OpenAI tools such as:
   - `web_search`
   - future hosted tool types that the bridge can faithfully pass through
2. Preserve existing function-tool support for both:
   - Chat Completions tool definitions
   - Responses tool definitions

Acceptance:
- `POST /v1/responses` with `tools=[{type:"web_search"}]` no longer fails at parse time

### Phase 2: Codex Execution Bridge Parity

1. Replace the hardcoded network/tool prohibition in `buildCodexTurnPrompt(...)`
   - allow web search and provided tools
   - keep local file/command side effects constrained by sandbox rather than a blanket prompt denial
2. Add request-scoped `dynamicTools` to `thread/start` when the incoming OpenAI-compatible request includes function tools.
3. Handle `item/tool/call` server requests from Codex app-server:
   - route calls through the runtime tool registry
   - return `contentItems` responses back to app-server
4. Record dynamic tool activity in telemetry/observability in a way that does not double-execute tools after the turn completes.

Acceptance:
- direct runtime request with a function tool can complete through Codex Subscription using the tool result

### Phase 3: Capability Truthfulness

1. Keep GPT-5.4 / Codex Subscription tool-capable in endpoint metadata once the bridge is fixed.
2. Add targeted capability assertions for:
   - tool calling supported
   - hosted web search accepted
   - no false network/tool refusal prompt remains

Acceptance:
- runtime metadata and actual behavior align

### Phase 4: End-to-End Validation

Run and record:
- focused unit/integration tests
- live runtime request proofs on `http://127.0.0.1:3461`
- rebuilt runtime browser verification

Minimum proof set:
- plain stock-price query routed to GPT-5.4 returns sourced live data
- hosted `web_search` request accepted on `/v1/responses`
- request-scoped function tool invoked successfully through Codex Subscription
- DeepSeek flash/pro still work as regression references

## RED Test Targets

- runtime-host-bridge request parser test for hosted Responses tool acceptance
- runtime-host-bridge Codex adapter test for `dynamicTools` provisioning
- runtime-host-bridge Codex adapter test for `item/tool/call` round-trip
- live or integration test proving GPT-5.4 no longer emits the current network-denied refusal for stock-price lookup

## Risks

- Codex app-server dynamic tools are still documented as experimental
- the current bridge execution pipeline auto-executes provider-emitted tool calls after normalization; Codex dynamic-tool calls must not be executed twice
- preserving agentic capability without exposing unintended local command/file behavior requires careful prompt + sandbox design

## Recommendation

Do not treat Codex Subscription as tool-ineligible.
Implement transport-faithful bridge support instead, then validate against GPT-5.4 and DeepSeek side-by-side.
