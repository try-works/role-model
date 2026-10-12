Run: /.recursive/run/106-client-neutral-model-effort-routing/
Phase: 05 Manual QA
Status: `LOCKED`
LockedAt: `2026-10-04T21:55:49Z`
LockHash: `0944426b518e6df96e3c70e09cd503bbda66791ac3a7b41a37d01b7ea1aa8482`
Workflow version: recursive-mode-audit-v2
Inputs:
- /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md (LOCKED)
- /.recursive/run/106-client-neutral-model-effort-routing/04-test-summary.md (LOCKED)
Outputs:
- /.recursive/run/106-client-neutral-model-effort-routing/05-manual-qa.md
Scope note: Isolated-port QA of the packaged run-106 SEA driven by a real Pi CLI, covering SP8 (UI truthfulness) and SP9 (packaged-SEA identity) plus the R15 strict-vs-router contrast and second-client parity.

## TODO

- [x] Package the SEA (role-model-dev.exe) and record its sha256
- [x] Launch the packaged runtime on an isolated non-3456/3457/3458 port (3462)
- [x] Drive it with a real Pi CLI and capture request/decision IDs
- [x] Record strict-vs-router contrast and second-client parity
- [x] Complete Coverage and Approval gates

## QA Execution Record

QA Execution Mode: agent-operated
Agent Executor: main-agent (run_code HTTP fetch + pwsh runtime:package-sea / SEA launch + Pi CLI)
Tools Used: pwsh (corepack pnpm run runtime:package-sea; SEA launch), Pi CLI (packages/pi-role-model), fetch (Node http), recursive-lock
Evidence Paths: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-packaged-sea.json`, `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json`
Runtime: http://127.0.0.1:3462 (isolated; not 3456/3457/3458)
Packaged SEA: role-model-router/dist/release/win32-x64/role-model-dev.exe (sha256 e181c6011a50a7e9681d6f16314ae7cefcbe7ca26bb21eeac34343b3befc7364, 103,994,880 bytes)
Health: healthy; executionMode remote_only.

## QA Scenarios and Results

- S1 strict-effort routing (real Pi): POST /v1/chat/completions {model: deepseek/deepseek-v4-flash, reasoning:{effort:max, effort_policy:strict}} -> 200, x-role-model-endpoint-id=deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max. PASS: strict policy routes to the exact-effort arm.
- S2 router contrast (real Pi): same request with effort_policy:router -> 200, endpoint=deepseek.personal.deepseek-api-key.global.deepseek-v4-flash. PASS: router-managed selection (contrast against strict).
- Matching request/decision IDs: requestId req-9d68e76b + routingDecisionId decision-req-9d68e76b both observed on the 3462 runtime and routed to deepseek-v4-pro, proving the request reached the packaged run-106 build, not an unverified environment variable.
- Second-client parity: a semantically identical request through a second client path produced the same normalized routing decision. PASS.
- SP8 UI truthfulness: /v1/models exposes the effort variants truthfully; runtime:validate-ui passed in Phase 4.
- SP9 packaged-SEA identity: role-model-dev.exe present with recorded sha256; packaged dependency closure (vendored Effect/Effect-MQ Track-B) present.

## Evidence and Artifacts

- /.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-packaged-sea.json
- /.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json
- /.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json
- /.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json

## User Sign-Off

QA Execution Mode is agent-operated; no human sign-off required.

## Traceability

R1 -> SP1 normalization + Pi strict routing
R2 -> SP2 arm expansion (verified via discovery effort variants)
R3 -> SP4 policy resolution + S1 strict / S2 router contrast
R4 -> four-state vocabulary (verified via telemetry/decision readbacks)
R5 -> SP3 borrowed prior (verified via decision evidence)
R6 -> SP4 pool consumption (verified via S1/S2 arm selection)
R7 -> SP5 turn-aware shortcut (verified via unit suite)
R8 -> SP6 non-inferiority (verified via ranking suite)
R9 -> SP7 discovery union/intersection (verified via /v1/models)
R10 -> canonical decision/telemetry/trace provenance (verified via matching request/decision IDs)
R11 -> SP8 UI truthfulness (/v1/models + runtime:validate-ui)
R12 -> SP9 packaged SEA (role-model-dev.exe sha256 recorded)
R13 -> SP1-SP7 TDD
R14 -> delegated auditors
R15 -> SP8/SP9 isolated-port packaged runtime + real Pi matrix

## Prior Recursive Evidence Reviewed

- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/packages/adapter-execution/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp1-effort-policy-normalization.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json`
- R2 | Status: verified | Changed Files: `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`, `role-model-router/packages/endpoint-registry/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-registry-arm-expansion.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json`
- R3 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp4-effort-policy-resolution.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json`
- R4 | Status: verified | Changed Files: `role-model-router/packages/core/src/reason-codes.ts`, `role-model-router/packages/core/src/types.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-effort-source-roundtrip.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R5 | Status: verified | Changed Files: `role-model-router/packages/core/src/router.ts`, `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp3-borrowed-quality-prior.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R6 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-effort-aware-cache-continuity.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`
- R7 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-turn-aware-difficulty.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R8 | Status: verified | Changed Files: `role-model-router/packages/core/src/router.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-non-inferiority-ranking.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R9 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-discovery-effort-projection.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json`
- R10 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/run106-canonical-effort-emission.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json`
- R11 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/lib/effort-truth.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp8-effort-truth.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json`
- R12 | Status: verified | Changed Files: `pnpm-lock.yaml`, `role-model-router/packages/runtime-observability/package.json` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-packaged-sea.json` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json`
- R13 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/test/run106-effort-policy-normalization.test.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R14 | Status: verified | Changed Files: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/auditor-13f44730.md` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/auditor-13f44730.md` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/review-bundles/03.5-code-review.md`
- R15 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-pi-routing-trace.json` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-packaged-sea.json`

## Coverage Gate

- [x] Packaged SEA launched on an isolated port and driven by a real Pi CLI with matching request/decision IDs and strict-vs-router contrast.

Coverage: PASS

## Approval Gate

- [x] Agent-operated QA with objective HTTP/Pi evidence; R15 verified with the packaged SEA and real Pi CLI.

Approval: PASS
