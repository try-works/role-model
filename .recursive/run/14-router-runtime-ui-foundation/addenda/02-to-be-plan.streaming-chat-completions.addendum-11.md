Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T11:35:21Z`
LockHash: `4f65a4410eb823816c3f72f62a6b66f438d9813c3df862a3b9e6796524d300cf`
Workflow version: `recursive-mode-audit-v1`
Addendum: `11`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/01.5-root-cause.runtime-review-topology.addendum-10.md`
- User scope decision: first slice covers only OpenAI-compatible `/v1/chat/completions` streaming
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.streaming-chat-completions.addendum-11.md`
Scope note: This addendum plans the first streaming-support slice for routed downstream consumers. Scope is limited to OpenAI-compatible `/v1/chat/completions` streaming through the runtime host bridge. `/v1/responses`, other endpoint families, and UI streaming polish are out of scope for this slice.

## TODO

- [x] Record the scope expansion or repair without rewriting the locked base plan
- [x] Map the required product or architecture changes into concrete implementation slices
- [x] Capture sequencing, constraints, and focused validation expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Root Cause Reference

Streaming support is currently blocked by the bridge contract and handler shape:
- `runtime-host-bridge` rejects `stream: true` in `POST /v1/chat/completions`
- bridge execution currently materializes a full normalized response before returning JSON
- provider adapters can describe streaming capability, but the bridge has no SSE/delta transport path, no incremental tool-call assembly, and no end-of-stream finalization for usage/trace persistence

## Target Outcome

When a downstream OpenAI-compatible client sends `POST /v1/chat/completions` with `stream: true`, the runtime should:
1. route the request to the chosen endpoint exactly once before execution starts
2. stream OpenAI-compatible `chat.completion.chunk` events back to the caller
3. finalize request observation, usage, and trace persistence when the provider stream completes
4. preserve existing non-streaming behavior unchanged

## Scope Boundaries

Included:
- OpenAI-compatible `/v1/chat/completions` streaming only
- routed execution for existing live provider paths already used by the bridge
- OpenAI-style SSE output from the bridge
- final request ledger persistence after the stream closes

Excluded from this slice:
- `/v1/responses` streaming
- streaming for non-chat endpoint families
- mid-stream rerouting or fallback to a second endpoint
- browser/UI token streaming changes in the repo-owned shell unless needed for validator coverage

## Planned Changes

1. Add failing regression coverage for the streaming slice:
   - bridge handler test asserting `stream: true` no longer returns the explicit unsupported error
   - adapter-execution tests covering a live streamed provider response and finalization behavior
   - provider-openai tests for chat-completions chunk parsing and delta normalization
   - runtime-host validation coverage for a streamed downstream request through the host-facing surface

2. Introduce a streaming execution contract in `adapter-execution`:
   - keep the existing full-response execution path intact for non-streaming
   - add a streamed execution path that can consume provider event chunks, normalize text/tool-call deltas, and expose a final completion summary after stream end
   - define explicit boundaries between incremental events and final persisted artifacts

3. Extend `provider-openai` for streamed chat-completions normalization:
   - parse OpenAI-compatible SSE frames for `chat.completion.chunk`
   - accumulate assistant text deltas and provider-native tool-call deltas into the same normalized final shape used by the ledger
   - preserve finish-reason and usage reconciliation at stream completion

4. Extend `runtime-host-bridge` transport handling:
   - accept `stream: true` in `POST /v1/chat/completions`
   - execute the routed request once, then stream chunked SSE output to the caller
   - emit OpenAI-compatible chunk envelopes while maintaining request id, endpoint id, and adapter-family metadata
   - finalize request observation, profile updates, usage, and trace persistence only after the provider stream ends successfully or with a terminal error

5. Preserve current routing and operational semantics:
   - routing still happens before execution starts; no mid-stream reroute
   - topology remains split: `/api/role-model/*` -> bridge, raw host routes and `/v1/*` -> llama-swap host
   - llama-swap host remains attached to the direct bridge through `ROLE_MODEL_BRIDGE_BASE_URL`

6. Validate the slice against real downstream expectations:
   - non-streaming Kimi and other existing downstream consumers must still succeed
   - streamed `moonshotai/kimi-k2.5` requests must return chunked responses instead of the current `400` unsupported error
   - request ledger/detail endpoints must still expose a final persisted observation for streamed requests

## Risks And Design Constraints

- Streaming complicates observability because usage and finish reason often arrive only at stream end
- tool-call streaming requires incremental assembly rather than one-shot normalization
- error behavior after headers/chunks are emitted must be explicitly designed; the bridge cannot switch to a normal JSON error once SSE has started
- provider-specific stream shapes differ, so the first slice should stay anchored to OpenAI-compatible chat completions only

## Validation Plan

- `corepack pnpm --filter @role-model-router/adapter-execution test`
- `corepack pnpm --filter @role-model-router/adapter-execution build`
- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/provider-openai build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm run runtime:validate-host`
- focused downstream verification against `moonshotai/kimi-k2.5` with `stream: true` and `stream: false`

## Traceability

- R1 downstream consumers must be able to use routed OpenAI-compatible chat completions in streaming mode
- R2 routing remains single-choice before execution start; streaming must not weaken endpoint selection correctness
- R3 request observation, usage, and trace persistence must survive streamed execution

## Coverage Gate

- [x] Addendum scope is grounded in the locked base plan and effective inputs
- [x] Concrete implementation slices and constraints are recorded
- [x] Focused validation expectations are captured

Coverage: PASS

## Approval Gate

- [x] The plan addendum names the concrete streaming scope
- [x] Sequencing and operational constraints are explicit
- [x] The addendum is ready to guide paired implementation and validation receipts

Approval: PASS
