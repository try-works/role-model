Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `02 To-Be Plan`
Addendum: `03` (`responses-websocket-404`)
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `addenda/01.5-root-cause.responses-websocket-404.addendum-03.md`
Outputs:
- `addenda/02-to-be-plan.responses-websocket-404.addendum-03.md`

## Requirements

- **R-W1:** `GET`/`Upgrade` on `ws://…/v1/responses` returns `101 Switching Protocols` (not HTTP 404).
- **R-W2:** Client `response.create` frames are forwarded through the existing role-model Responses pipeline; server emits the same event types as SSE (`response.created` … `response.completed`) as WS JSON text frames.
- **R-W3:** Connection-local cache expands `previous_response_id` (+ incremental `input`) into a full HTTP request body compatible with `store=false`.
- **R-W4:** `generate: false` warmup returns a completed response id without calling upstream.
- **R-W5:** Managed apikey provider advertises `supports_websockets = true` once the bridge exists.
- **R-W6:** Live proof: WS probe against `:3460` completes with a model reply; unit tests cover upgrade + create + previous_response_id.

## TDD

1. RED: `test/responses-websocket.test.ts` (upgrade, create stream, previous_response_id).
2. GREEN: `src/responses-websocket.ts` + `startForwarder` attach; rebuild.
3. Live: Node WebSocket client → `:3460` → `:3458`.

## Non-goals

Prefer flipping catalog `prefer_websockets` (keep false unless Desktop requires prefer); no router edits.
