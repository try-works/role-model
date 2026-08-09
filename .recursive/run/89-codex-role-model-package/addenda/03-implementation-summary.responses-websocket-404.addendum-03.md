Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `03 Implementation Summary`
Addendum: `03` (`responses-websocket-404`)
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `addenda/01.5-root-cause.responses-websocket-404.addendum-03.md`
- `addenda/02-to-be-plan.responses-websocket-404.addendum-03.md`
Outputs:
- `src/responses-websocket.ts`
- `src/forwarder.ts` (`startForwarder` attaches WS)
- `src/codex-config.ts` (`supports_websockets = true`)
- `test/responses-websocket.test.ts`
- Evidence: `evidence/logs/addendum-responses-websocket/`

## Changes

- Minimal WebSocket server (no new deps): accept upgrade on `/v1/responses`, text frames only.
- Bridge: `response.create` → mock HTTP POST into `handleResponsesProxy` → parse SSE → WS JSON events.
- Connection-local previous-response cache for `previous_response_id` expansion; warmup `generate:false`.
- Managed provider: `supports_websockets = true`. Catalog `prefer_websockets` remains `false`.

## Verification

- Unit: `responses-websocket.test.ts` 3/3 PASS; forwarder suite PASS.
- Build: `tsc` PASS.
- Live: `ws://127.0.0.1:3460/v1/responses` → `WS_OPEN`, `response.completed` text `WS_BRIDGE_OK` (upstream `:3458`).

## Requirement Completion Status

- R-W1: verified — upgrade 101; evidence live-ws-probe.md
- R-W2: verified — event sequence includes created…completed
- R-W3: verified — unit test previous_response_id
- R-W4: implemented — warmup path in responses-websocket.ts
- R-W5: implemented — codex-config.ts
- R-W6: verified — unit + live probe

## Audit

- Audit Execution Mode: self-audit
- Audit: PASS
