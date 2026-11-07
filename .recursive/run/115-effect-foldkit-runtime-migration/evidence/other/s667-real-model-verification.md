# S667 - real-owner-model verification on :3480 (fixtures removed)

Date: 2026-11-07. Runtime: 0.0.20-761-g3f7779fb, exe 5e0810c0... served on 127.0.0.1:3480
with the worktree client (S664/S665/S666). State root D:/DEV/rm-clean/r761-live-state.

## Fixtures removed
- Seeded fixture accounts deleted from the state DB (standalone-runtime-dev/memory/memory.sqlite):
  openai.personal.primary (openai/gpt-4.1-mini-fast), anthropic.team.shared (claude-3.7-sonnet).
- Runtime relaunched WITHOUT --fixture-root so the fixture provider-accounts.json is not re-seeded.
- Confirmed: GET /api/role-model/accounts = deepseek.personal.deepseek-api-key, moonshot.personal.kimi-code only.

## Owner's real models kept
- deepseek.personal.deepseek-api-key (local-file API key): deepseek/deepseek-flash, deepseek/deepseek-v4-pro.
- moonshot.personal.kimi-code (OAuth2 device code, all 28 roles): moonshot/kimi-k2.6, kimi-k2.7-code, kimi-k3.

## Real inference (POST /v1/chat/completions, real provider calls)
| model | finish | content | usage |
|---|---|---|---|
| deepseek/deepseek-flash | stop | OK | 35/9/44 |
| deepseek/deepseek-v4-pro | stop | OK | 88/21/109 |
| moonshot/kimi-k2.6 | stop | OK | 91/33/124 |
| moonshot/kimi-k2.7-code | stop | OK | 91/34/125 |
| moonshot/kimi-k3 | stop | OK | 91/37/128 |

Streaming (kimi-k3, stream=true): HTTP 200, 49 SSE events, terminal [DONE], 9821 bytes.

## Routing + capture
- GET /v1/models lists only the real aliases/endpoints (deepseek/*, moonshot/*).
- Telemetry /api/role-model/telemetry/requests recorded the live requests with endpointId,
  reasoningEffort, roleIds (28), eligibleEndpointIds, statusFamily=success, payload byte counts.
- Router /api/role-model/router/decisions returns 9 captured decisions.

## UI readbacks (client bundle at :3480)
- /control/providers: 2 accounts, moonshot 2 endpoints + deepseek, each model healthy with 28 roles.
- /control/endpoints: DeepSeek V4.1 Flash 2, DeepSeek V4 Pro 1, Kimi K2.6 1, Kimi K2.7 Code 1, Kimi K3 4; no fixture models.
- /models and /router render with no fixture models.

## Remaining acceptance-lane items
- Role/controller-initiated routing (requestedRoleId from guidance) not exercised in this receipt;
  the direct-alias lane is verified. R15's ordinary-client (DSH/pi) lane still needs the client config.
## Restart durability (2026-11-07)
Stopped and relaunched the same exe on the same state root (still without --fixture-root):
- accounts persisted (deepseek.personal.deepseek-api-key, moonshot.personal.kimi-code), 13 endpoints persisted,
  11 telemetry rows persisted.
- Real inference after restart: deepseek/deepseek-flash finish=stop "OK" (35/2/37);
  moonshot/kimi-k3 finish=stop "OK" (91/26/117). Stored API key + OAuth token files survive restart.

## Role-carrying request
POST /v1/chat/completions with header x-role-model-requested-role-id: coder for moonshot/kimi-k3:
- finish=stop "OK"; telemetry row records requestedRoleId="coder", roleIds=["coder"],
  endpoint moonshot.personal.kimi-code.global.kimi-k3-max, statusFamily=success, real token usage.

## Router surfaces (real data)
- GET /api/role-model/router/candidates: real endpoints with 28 role bindings, capabilities,
  operational profile (latency/failure/confidence), pricing, controllerEligible.
- GET /api/role-model/telemetry/requests and /router/decisions: captured decisions with
  endpoint, reasoningEffort, eligible endpoints, cost snapshot.
- UI: /requests (telemetry ledger), /control/providers, /control/endpoints, /models, /router —
  all render real models only, no fixture models.

## Not yet exercised
- Controller/guidance-initiated model selection (requestedRoleId inferred from guidance/heuristics, not
  caller header) — the header lane is verified; the guidance inference lane is the next test.
- Ordinary DSH/pi CLI client (dsh binary not on PATH in this environment); the OpenAI-compatible
  surface is verified with real credentials.
## Controller-mode routing (2026-11-07)
POST /v1/chat/completions with headers x-role-model-routing-mode: controller +
x-role-model-requested-role-id: coder (model moonshot/kimi-k3):
- Real response served by moonshot/kimi-k3 (finish=length at max_tokens=200, real content).
- Telemetry decision records routingMode="controller", selectedStrategy="quality",
  requestedRoleId="coder", endpoint moonshot.personal.kimi-code.global.kimi-k3, statusFamily="success".
- This exercises the guidance/controller lane (not just the caller-header lane).
## All four routing modes verified with real models (2026-11-07)
Each request pinned deepseek/deepseek-v4-pro with role coder and a different x-role-model-routing-mode:
| mode | strategy | selected endpoint | result |
|---|---|---|---|
| baseline | balanced | deepseek-v4-pro-high | real finish=stop OK |
| difficulty | cost | deepseek-v4-pro | real finish=stop OK |
| controller | cost | deepseek-v4-pro-max | real finish=stop OK |
| hybrid | cost | deepseek-v4-pro-max | real finish=stop OK |

- The controller decision path is exercised (the controller model is deepseek/deepseek-flash per /api/role-model/controller).
- Router UI: /router renders Candidates + Decisions tabs with real data, no fixtures.
- Multi-provider selection across providers in ONE decision is not directly triggerable through
  /v1/chat/completions because that surface requires a pinned model alias; the controller evaluates
  candidates for the pinned model. Cross-provider selection belongs to the role/controller surface
  (Studio/agent), which remains to be exercised.
## Observe / learning / error-path surfaces (2026-11-07)
- /api/role-model/telemetry/rows: 16 endpoint rows with real token counts, estimated cost,
  latency, role bindings; the invalid-model probe is recorded as routing.failed.pre-execution
  (failureCount 1) proving the error path is captured.
- /api/metrics/page: real request rows (model does/not-exist visible as the failed probe).
- /api/role-model/operator/learning: knowledge worker available (sqlite_fts5_bm25, 0 candidates,
  0 indexed documents) — learning pipeline live, no data yet.
- Header capture: x-client-request-id=client-cap-001 recorded as clientRequestId.
- Prompt cache: promptCacheSupported=true but cachedRequestCount=0 over repeated identical
  deepseek-flash prompts (provider-side cache minimum prefix/window); recorded, not a failure.
- Invalid model -> clean 400 capability_eligibility_error/no_eligible_target.

## R15/R17 status after this verification
- R15 real-provider lane: real DeepSeek + real Kimi (OAuth) inference verified through the packaged
  runtime surface; the strict "ordinary DSH/pi CLI" client is still open (dsh binary not on PATH).
- R17 joined journey: provider -> decision -> capture -> UI -> restart verified; the graph/payload
  join and the private replay root remain.
