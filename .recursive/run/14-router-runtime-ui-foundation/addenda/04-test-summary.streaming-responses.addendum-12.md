Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `04 Test Summary`
Status: `LOCKED`
LockedAt: `2026-05-07T11:35:27Z`
LockHash: `ee03471043eb77fc84a6b8b70f827211ebdff5d6bdf965b0696601b0be5d96b0`
Addendum: `12`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.streaming-responses.addendum-12.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/04-test-summary.streaming-responses.addendum-12.md`
Scope note: This addendum records focused validation for the downstream OpenAI-compatible `/v1/responses` streaming slice and its regression coverage against the existing chat-completions path.

## TODO

- [x] Re-run focused provider-openai build and test coverage for streamed Responses normalization
- [x] Re-run runtime-host-bridge build and test coverage for `/v1/responses`
- [x] Capture live downstream host-path verification for `/v1/responses` JSON and SSE behavior
- [x] Record the chat-completions streaming regression probe on the same live host path

## Validation Results

| Command / Probe | Result | Evidence |
| --- | --- | --- |
| `corepack pnpm --filter @role-model-router/provider-openai build` | PASS | provider-openai TypeScript build completed after streamed Responses normalization changes |
| `corepack pnpm --filter @role-model-router/provider-openai test` | PASS | `5/5` tests passed, including streamed OpenAI Responses transcript normalization |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge build` | PASS | runtime-host-bridge TypeScript build completed after `/v1/responses` route and backend changes |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge test` | PASS | `21/21` tests passed, including `/v1/responses` metadata, route, backend, and preserved utility-route coverage |
| Live spawned host: `POST /v1/responses` with `stream=false` and `model=openai/gpt-4.1-mini-fast` | PASS | returned `200` JSON with `message` and `function_call` output items through the downstream `/v1` surface |
| Live spawned host: `POST /v1/responses` with `stream=true` and `model=openai/gpt-4.1-mini-fast` | PASS | returned `200` `text/event-stream` with `response.created` and `response.completed` frames plus role-model endpoint metadata headers |
| Live spawned host: `POST /v1/chat/completions` with `stream=true` and `model=openai/gpt-4.1-mini-fast` | PASS | regression check returned `200` `text/event-stream`, OpenAI chunk payloads, and `[DONE]` |

## Focused Evidence

- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/provider-openai-responses-streaming.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-host-bridge-responses-streaming.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-host-streaming-e2e.json`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-host-streaming-e2e.stdout.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-host-streaming-e2e.stderr.log`

## End-to-End Notes

- The host-path end-to-end verification was run through a live spawned `llama-swap` host wired to the run-14 bridge, so the observed `/v1/*` behavior exercised the same downstream surface consumed by real clients.
- `/v1/responses` validation used `openai/gpt-4.1-mini-fast`, which is currently cataloged as `openai.responses`.
- Moonshot/Kimi remains cataloged as `openai.chat.completions`, so Kimi continues to validate through `/v1/chat/completions` rather than `/v1/responses`.

## Conclusion

The addendum-12 repair is validated end to end. Downstream consumers can now use the bridged `/v1/responses` surface in both JSON and SSE mode, and the already-working `/v1/chat/completions` streaming path remains green on the same live host stack.

## Coverage Gate

- [x] Automated validation covers both touched packages
- [x] Live end-to-end verification covers `/v1/responses` JSON, `/v1/responses` SSE, and `/v1/chat/completions` streaming regression
- [x] Evidence paths are recorded for green package logs and host-path verification logs

Coverage: PASS

## Approval Gate

- [x] Validation results match the implemented scope from addendum 12
- [x] End-to-end evidence is captured for the downstream `/v1` surface
- [x] Remaining catalog-shape constraint for Kimi is documented rather than hidden

Approval: PASS
