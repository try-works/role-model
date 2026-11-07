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
## Benchmark UI fixes (2026-11-07, S667 follow-up)
- Off-by-one: the Foldkit benchmark progress rendered "model 2/4" for the first endpoint because it added
  +1 to the host's already-1-based endpointIndex/caseIndex. The reference React app uses them directly.
  Fixed in features/models/routes.ts and s638 updated; s638+s642 12/12 pass; commit 161b340b.
- Fixture models: the live :3480 has zero fixture endpoints (13 real endpoints, 5 real models). The
  owner's screenshot was a stale client tab loaded before the fixture removal/restart; a fresh load of
  /system/benchmark shows only deepseek/moonshot and no active run (the restart stopped the stale run).
## Benchmark poll failure (S668, 2026-11-07)
Symptom: "Benchmark run poll failed: HTTP 0" with the phase panel stuck at the last step. Cause: the
runtime was restarted while the old tab's benchmark poll was in flight, so the fetch failed with no
status (0). Fix: BenchmarkRunPollFailed now marks a running progress as failed with the reason (panel
stops spinning) and a transport failure says "the runtime did not respond (it may have restarted)".
s638 8/8. Commit 6d492b56; client rebuilt; :3480 restarted.
- The 16-endpoint list and "model 2/4" in the same screenshot were the pre-restart client tab
  (assets are served no-store; the tab kept its old in-memory bundle across restarts). A fresh load
  shows "13 of 13 selected", no fixtures, and a new run starts at model 1/N.
## Live benchmark run with real models (2026-11-07)
Started POST /api/role-model/benchmark/runs { endpointIds: [deepseek-flash-max, kimi-k3-high],
judgeEndpointId: moonshot.personal.kimi-code.global.kimi-k3, mode: quick } -> runId a0475d47...
- Progress readback: endpointIndex=1/2, caseIndex=1/12, completedSteps=0/60 at start, incrementing.
- UI progress panel: "Phase 1 of 3 · Recording responses", "7 / 60 steps",
  "model 1/2: deepseek/deepseek-flash" — the off-by-one is gone in the live build.
## Completed real benchmark (run a0475d47, 2026-11-07)
POST /api/role-model/benchmark/runs { endpointIds: [deepseek-flash-max, kimi-k3-high],
judgeEndpointId: kimi-k3, mode: quick } -> completed, outcome=partial, steps 60/60,
caseCounts {total 24, passed 19, failed 5}.
Grades (judge method "judge", real LLM grading):
- deepseek.personal.deepseek-api-key.global.deepseek-flash-max (deepseek/deepseek-flash) overall 0.7667, 12 cases
- moonshot.personal.kimi-code.global.kimi-k3-high (moonshot/kimi-k3) overall 0.475, 12 cases
Sample graded cases: p17-tools-multi-hard=1, x01-max-signal=0.55, h01-implement-two-sum=1.
Progress counters verified live at start: endpointIndex 1/2, caseIndex 1/12, steps 0/60; UI panel
"model 1/2: deepseek/deepseek-flash". Artifact root under the runtime state root.

## Packaging note (S669 follow-up)
runtime:package-sea in this worktree refuses: "development packaging requires the exact private
distribution". Baking the S664-S668 UI fixes into a new exe needs the paired private build
(lockstep), so :3480 currently serves the worktree client build for those fixes.
## Track-B evidence binding on the dev :3480 (2026-11-07)
Runtime log repeats:
  [route-evidence-binding] failed: managed artifact digest key not found for the durable evaluation authority
  [track-b-auto-replay] tick done (outcome degraded)
Cause: resolveDurableEvaluationAuthority (track-b-runtime.ts:487-518) requires a managed
artifact-digest.key under <stateRoot>/managed-keys or <stateRoot>/<scope>/track-b/managed-keys;
the development channel does not auto-generate one (resolveManagedArtifactKeyFiles returns {} for
development). The hand-seeded r761-live-state has no managed keys, so the private
capture->queue->projection evidence binding honestly degrades. This is an environment limitation
(keys are provisioned by the release pipeline for stage/production), not a code defect; the
degradation is surfaced rather than hidden.
## Owner's 4-endpoint real benchmark completed (run ee97c6bf, 2026-11-07)
mode quick, judge moonshot.personal.kimi-code.global.kimi-k3-max; 48 cases (32 passed / 16 failed), outcome partial.
Grades (judge method "judge"):
- deepseek.personal.deepseek-api-key.global.deepseek-flash-high (deepseek/deepseek-flash) overall 0.7542
- deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high (deepseek/deepseek-v4-pro) overall 0.6667
- moonshot.personal.kimi-code.global.kimi-k2.7-code (moonshot/kimi-k2.7-code) overall 0.35
- moonshot.personal.kimi-code.global.kimi-k3-high (moonshot/kimi-k3) overall 0.4333
All 4 requested endpoints executed (skipped 0). Progress counters stayed correct throughout (endpoint/case 1-based).
