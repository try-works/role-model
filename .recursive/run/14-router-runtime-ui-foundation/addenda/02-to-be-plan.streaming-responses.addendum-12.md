Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T11:35:21Z`
LockHash: `0932b4b09fb1b866b2f893313d0082e850bb8b862eaa95d204fdc1286868efd9`
Addendum: `12`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.streaming-chat-completions.addendum-11.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.streaming-chat-completions.addendum-11.md`
- User scope decision: generalize OpenAI-compatible streaming across both `/v1/chat/completions` and `/v1/responses`
- Reference repos re-used for this slice:
  - `MoonshotAI/kimi-cli`
  - `anomalyco/opencode`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.streaming-responses.addendum-12.md`
Scope note: This addendum plans the second streaming-support slice. The first slice already delivered live OpenAI-compatible `/v1/chat/completions` passthrough. This slice generalizes the same downstream streaming contract to OpenAI-compatible `/v1/responses` while preserving the existing chat-completions path.

## TODO

- [x] Reconcile the already-implemented chat-completions streaming slice and its deferred `/v1/responses` scope
- [x] Reuse the strongest external references for OpenAI-compatible Responses streaming semantics
- [x] Define the bridge, provider-normalization, and validation scope for the second slice
- [x] Record the planned validation probes for JSON, SSE, and chat-completions regression coverage

## Earlier Phase Reconciliation

- Addendum `11` planned and delivered `/v1/chat/completions` streaming first, explicitly deferring `/v1/responses`.
- The bridge now has a reusable `streamWriter` passthrough seam and transcript replay fallback for chat-completions.
- `provider-openai` already builds `openai.responses` requests and normalizes finalized JSON response bodies, but it does not yet parse streamed `response.*` transcripts into the same final normalized shape.
- `runtime-host-bridge` still exposes only `/v1/chat/completions`; there is no routed `/v1/responses` surface yet.

## Reference Re-use Notes

- `anomalyco/opencode` is the strongest direct reference for this slice because its OpenAI Responses transport posts to `/responses` with `stream: true` and uses an event-stream handler over typed `response.*` chunks.
- `MoonshotAI/kimi-cli` remains the same product-family reference used in the earlier slice, but for this phase it serves mainly as a Kimi/Moonshot event-stream behavior reference rather than a direct `/responses` implementation template.

## Target Outcome

When a downstream OpenAI-compatible client sends `POST /v1/responses` with `stream: true`, the runtime should:
1. route the request to the chosen endpoint exactly once before execution starts
2. stream OpenAI-compatible `response.*` SSE events back to the caller as provider chunks arrive
3. finalize request observation, usage, and trace persistence after the provider stream completes
4. preserve the already-working `/v1/chat/completions` streaming path unchanged
5. preserve non-streaming `/v1/responses` behavior for finalized JSON responses

## Scope Boundaries

Included:
- OpenAI-compatible `/v1/responses` support in `runtime-host-bridge`
- provider-native passthrough streaming for live `openai.responses` providers
- transcript parsing and final normalization for streamed `response.*` event payloads in `provider-openai`
- shared transport/fallback behavior so both `/v1/chat/completions` and `/v1/responses` use one bridge-side streaming pattern
- request ledger, usage, and trace persistence after streamed `/v1/responses` execution

Excluded from this slice:
- non-OpenAI provider families
- `/v1/messages`, `/v1/embeddings`, `/completion`, `/infill`, or other advanced families
- mid-stream rerouting or fallback to a second endpoint
- browser/UI token rendering polish beyond validator or inspection needs

## Planned Changes

1. Add failing regression coverage for the new slice:
   - host-bridge tests asserting `/v1/responses` exists and streams incremental `response.*` events instead of returning 404 or buffering to a final JSON-only body
   - provider-openai tests asserting a streamed OpenAI Responses transcript normalizes into final output text, tool calls, finish reason, and usage
   - focused live-Kimi style bridge coverage ensuring the new route shares the same passthrough transport semantics already established for chat-completions

2. Generalize the bridge execution contract:
   - lift the chat-completions-specific execution shape into a route-aware OpenAI-compatible downstream execution surface
   - reuse the current `streamWriter` passthrough seam for `/v1/responses`
   - keep the compatibility fallback for captured/offline transcripts when live provider deltas are unavailable

3. Extend `provider-openai` for streamed Responses normalization:
   - parse streamed `response.created`, `response.output_text.delta`, `response.completed`, and related `response.*` frames from raw SSE transcripts
   - accumulate assistant text deltas and function/tool-call deltas into the same normalized final shape already used by request persistence
   - reconcile final usage and finish metadata from terminal response events

4. Add `/v1/responses` transport handling in `runtime-host-bridge`:
   - accept OpenAI Responses-style request bodies
   - route and execute through the existing runtime selection path
   - emit `text/event-stream` with provider-native `response.*` payloads while preserving role-model endpoint and adapter metadata headers
   - return finalized JSON for non-streaming requests

5. Preserve prior streaming behavior:
   - `/v1/chat/completions` passthrough must remain green
   - the split-topology contract remains unchanged: `/api/role-model/*` and `/healthz` -> bridge, raw host routes and `/v1/*` -> llama-swap host
   - llama-swap host remains attached to the direct bridge through `ROLE_MODEL_BRIDGE_BASE_URL`

## Risks and Design Constraints

- OpenAI Responses streams use a different event vocabulary than chat-completions, so transcript parsing must not conflate `response.*` frames with `chat.completion.chunk`.
- Some providers may stream reasoning or tool-call deltas separately from visible assistant text, so final normalization must reconcile partial event families safely.
- Once SSE headers are emitted, terminal failures must stay in-stream; the route cannot revert to a JSON error envelope.
- The bridge should avoid duplicating route-specific transport code where a route-agnostic OpenAI-compatible streaming helper would keep both paths aligned.

## Validation Plan

- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/provider-openai build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- focused downstream verification against the live run-14 stack for:
  - `POST /v1/responses` with `stream: true`
  - `POST /v1/responses` with `stream: false`
  - regression check for `POST /v1/chat/completions` with `stream: true`

## Traceability

- R1 downstream consumers must be able to use routed OpenAI-compatible `/v1/responses` in both streaming and non-streaming mode
- R2 the bridge must preserve the already-working `/v1/chat/completions` passthrough contract while generalizing the transport
- R3 request observation, usage, and trace persistence must survive streamed `/v1/responses` execution

## Coverage Gate

- [x] Earlier chat-completions deferral and current `/v1/responses` gap are reconciled explicitly
- [x] Planned implementation work covers bridge routing, transcript normalization, and validation
- [x] Validation plan includes both streaming and non-streaming `/v1/responses` plus chat-completions regression checks

Coverage: PASS

## Approval Gate

- [x] Scope boundaries are explicit
- [x] Risks and constraints are called out before implementation
- [x] Planned changes and validation steps are concrete enough to drive Phase 3

Approval: PASS
