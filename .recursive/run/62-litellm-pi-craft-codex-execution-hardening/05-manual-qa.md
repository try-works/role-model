Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-07T19:38:53Z`
LockHash: `68385584f47273bc12839205c1d3b59faa43f11da79b9af91057b1bd019b1aff`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-worktree.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03-implementation-summary.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/04-test-summary.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-verified/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-seeded/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-seeded-env/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-final/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/05-manual-qa.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-final/`
Scope note: Phase 5 performs agent-operated rebuilt-runtime verification with isolated runtime state and real remote traffic, records the failed sub-attempts that changed the final harness, and keeps the earlier packaged-runtime proof as additive confidence rather than the authoritative Phase 5 sign-off.

# Phase 5 Manual QA

## TODO

- [x] Re-read the locked requirements, root-cause, plan, implementation summary, and Phase 4 test summary
- [x] Rebuild the runtime surfaces used by rebuilt-runtime QA
- [x] Start the rebuilt runtime from the current worktree with isolated temp runtime state
- [x] Seed remote provider accounts and activate the required endpoints inside the isolated state
- [x] Verify `difficulty.remote-only` inventory on the rebuilt runtime
- [x] Execute a representative Pi exact Codex Responses request against the rebuilt runtime
- [x] Execute a representative Craft exact DeepSeek Chat request against the rebuilt runtime
- [x] Execute a representative Pi alias Responses request against the rebuilt runtime
- [x] Execute a representative Pi alias image-bearing Responses request against the rebuilt runtime
- [x] Capture request-detail, router-decision, endpoint-profile, and telemetry-row evidence for each rebuilt-runtime request
- [x] Record the failed sub-attempts that exposed the correct direct-remote QA harness rules
- [x] Record the additive packaged-runtime proof that remained green after the rebuilt-runtime QA path succeeded
- [x] Reconcile live QA outcomes against the Phase 2 plan without claiming unsupported behavior

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: Codex
- Tools Used: PowerShell shell commands, Node/tsx runtime launch, local HTTP requests, repo build commands, isolated temp runtime state, and the existing runtime request-detail/telemetry APIs
- Date: `2026-07-08`
- Worktree: `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening`
- Branch: `recursive/62-litellm-pi-craft-codex-execution-hardening`
- Rebuilt runtime base URL for the primary pass: `http://127.0.0.1:54129`
- Rebuilt runtime base URL for the resumed non-text pass: `http://127.0.0.1:54131`
- Rebuilt runtime isolated state root:
  - `C:\Users\erikb\AppData\Local\Temp\run62-phase5-rebuilt-7c62eb5bf05f40fd852814304a8d90b6\state`
- Supplemental degraded-primary rebuilt runtime base URL:
  - `http://127.0.0.1:54130`
- Packaged-runtime supplemental base URL from the earlier packaged pass:
  - `http://127.0.0.1:54128`
- User Sign-Off Required: no, because the selected QA mode is `agent-operated`
- User Sign-Off Status: not required

## QA Scenarios and Results

| Check | Result | Evidence |
| --- | --- | --- |
| `QA1` Rebuild runtime-ui and runtime-host-bridge from the current worktree | PASS | `evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`, `rebuild-host-bridge.log` |
| `QA2` Rebuilt runtime starts from isolated temp state | PASS | `evidence/runtime/phase5-rebuilt/runtime.stdout.log`, `state-root.json` |
| `QA3` Rebuilt runtime accepts seeded remote provider accounts | PASS | `evidence/runtime/phase5-rebuilt/account-upserts.summary.json`, `accounts.after-seed.json` |
| `QA4` Rebuilt runtime activates the intended remote endpoints | PASS | `evidence/runtime/phase5-rebuilt/activation-summary.json`, `endpoints.after-activation.json` |
| `QA5` `difficulty.remote-only` exposes the expected endpoint pool on rebuilt runtime | PASS | `evidence/runtime/phase5-rebuilt/difficulty.remote-only.after-activation.json` |
| `QA6` Pi exact Codex Responses request succeeds on rebuilt runtime | PASS | `evidence/runtime/phase5-rebuilt/requests/pi-codex-tools-001/` |
| `QA7` Craft exact DeepSeek Chat request succeeds on rebuilt runtime | PASS | `evidence/runtime/phase5-rebuilt/requests/craft-deepseek-chat-001/` |
| `QA8` Pi alias Responses request succeeds on rebuilt runtime | PASS | `evidence/runtime/phase5-rebuilt/requests/pi-alias-text-001/` |
| `QA8A` Pi alias image-bearing Responses request succeeds on rebuilt runtime and proves non-text modality routing | PASS | `evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/`, `request-results.non-text-summary.json` |
| `QA9` Request-detail, router-decision, endpoint-profile, and telemetry receipts are persisted for the rebuilt-runtime cases | PASS | per-request `request-detail.json`, `router-decision.json`, `endpoint-profile.json`, and `telemetry-row.json` under `evidence/runtime/phase5-rebuilt/requests/` |
| `QA10` A degraded-primary alias request can still land on a surviving remote family on rebuilt runtime | PASS with caveat | `evidence/runtime/phase5-rebuilt/requests/pi-alias-fallback-002/` |
| `QA11` Packaged-runtime validation remains green after the rebuilt-runtime pass | PASS | `evidence/logs/green/phase4-validate-packaging-rerun.green.log`, `evidence/runtime/phase5-final/request-results.summary.json` |

## Representative Rebuilt-Runtime Results

Authoritative rebuilt-runtime request summary:

- `pi-codex-tools-001`
  - `requestId: req-5c3e2ff2-f851-4b99-922b-6b454946f780`
  - `sourceClient: openai.responses`
  - `endpointId: openai.personal.openai-codex-subscription.global.gpt-5.4`
  - `modelId: chatgpt/gpt-5.4`
  - `providerId: openai`
  - `statusCode: 200`
  - `adapterFamily: ai-sdk-openai`
- `craft-deepseek-chat-001`
  - `requestId: req-75cf0117-eb61-497f-a2a6-44f90877f5db`
  - `sourceClient: openai.chat.completions`
  - `endpointId: deepseek.personal.deepseek-api-key.global.deepseek-v4-flash`
  - `modelId: deepseek/deepseek-v4-flash`
  - `providerId: deepseek`
  - `statusCode: 200`
  - `adapterFamily: ai-sdk-openai-compatible`
- `pi-alias-text-001`
  - `requestId: req-be5ccf36-2ece-4792-baa2-36edd25e582c`
  - `sourceClient: openai.responses`
  - `endpointId: deepseek.personal.deepseek-api-key.global.deepseek-v4-flash`
  - `modelId: deepseek/deepseek-v4-flash`
  - `providerId: deepseek`
  - `statusCode: 200`
  - `adapterFamily: ai-sdk-openai-compatible`
- `pi-alias-image-001`
  - `requestId: req-462d0f38-396e-40b3-b8e4-80e6705f7ab8`
  - `sourceClient: openai.responses`
  - `endpointId: openai.personal.openai-codex-subscription.global.gpt-5.4`
  - `modelId: chatgpt/gpt-5.4`
  - `providerId: openai`
  - `statusCode: 200`
  - `adapterFamily: ai-sdk-openai`
  - `outputText: IMAGE_OK`

Rebuilt-runtime alias inventory proof:

- `difficulty.remote-only` endpoint ids on rebuilt runtime:
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-flash`
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - `moonshot.personal.kimi-code.global.kimi-k2.7-code`
  - `openai.personal.openai-codex-subscription.global.gpt-5.4`

Post-activation inventory truth note:

- `/api/role-model/endpoints` and `/v1/models` reflected the activated remote inventory correctly during rebuilt-runtime QA
- `/healthz` session-bootstrap inventory remained startup-scoped and did not become the authoritative post-activation inventory surface after later account activation
- for this run's rebuilt-runtime QA, endpoint and model truth should come from `/api/role-model/endpoints`, `/v1/models`, and the per-request router/request receipts rather than `/healthz` inventory summaries

Non-text routing proof:

- `pi-alias-image-001` required input modalities `image` and `text`
- the rebuilt router decision excluded the DeepSeek endpoints with `MODALITY_UNSUPPORTED`
- the same decision rewrote `difficulty.remote-only` to `chatgpt/gpt-5.4` and selected `openai.personal.openai-codex-subscription.global.gpt-5.4`
- evidence: `evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/router-decision.json`

Degraded-primary supplemental proof:

- In `pi-alias-fallback-002`, the isolated rebuilt runtime was restarted with the same state root after the DeepSeek account was intentionally repointed to an unreachable `baseUrlOverride`
- The alias request still completed successfully:
  - `requestId: req-c4aeed83-b526-4df5-8835-d9186b1c2b72`
  - `requestedModelId: difficulty.remote-only`
  - `selectedEndpointId: openai.personal.openai-codex-subscription.global.gpt-5.4`
  - `statusCode: 200`
- Audit note:
  - this is a successful degraded-primary failover selection on the rebuilt runtime
  - it did not produce a non-zero `rerouteCount`; the unhealthy DeepSeek family was removed before dispatch rather than after an in-flight retry

## Evidence and Artifacts

Authoritative rebuilt-runtime evidence:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/rebuild-host-bridge.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/state-root.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/credential-refs.summary.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/runtime.stdout.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/providers.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/accounts.before.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/accounts.seed-input.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/account-upserts.summary.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/accounts.after-seed.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/activation-summary.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/endpoints.after-activation.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/models.after-activation.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/difficulty.remote-only.after-activation.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/request-results.summary.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/request-results.non-text-summary.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/telemetry.final.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/router-decisions.final.json`

Per-request rebuilt-runtime receipts:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-codex-tools-001/request.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-codex-tools-001/response.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-codex-tools-001/telemetry-row.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-codex-tools-001/request-detail.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-codex-tools-001/router-decision.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-codex-tools-001/endpoint-profile.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/craft-deepseek-chat-001/request.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/craft-deepseek-chat-001/response.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/craft-deepseek-chat-001/telemetry-row.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/craft-deepseek-chat-001/request-detail.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/craft-deepseek-chat-001/router-decision.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/craft-deepseek-chat-001/endpoint-profile.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-text-001/request.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-text-001/response.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-text-001/telemetry-row.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-text-001/request-detail.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-text-001/router-decision.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-text-001/endpoint-profile.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/request.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/response.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/telemetry-row.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/request-detail.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/router-decision.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-image-001/endpoint-profile.json`
- degraded-primary alias supplemental receipt:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-fallback-002/response.json`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-fallback-002/telemetry-row.json`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-fallback-002/request-detail.json`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/requests/pi-alias-fallback-002/router-decision.json`

Supplemental packaged-runtime evidence:

- authoritative packaged validation:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/green/phase4-validate-packaging-rerun.green.log`
- additive packaged live-request proof:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-final/request-results.summary.json`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-final/telemetry.final.json`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-final/router-decisions.final.json`

## Failed Sub-Attempts That Changed The Final Harness

- `phase5-verified`
  - observed result: runtime booted, but `/api/role-model/accounts` and `/api/role-model/endpoints` were empty and `difficulty.remote-only` never activated
  - evidence: `evidence/runtime/phase5-verified/phase5.error.json`
  - durable lesson: copying runtime state alone is not enough for direct remote execution proof because account rows are read from SQLite, not reconstructed from bridge credential files
- `phase5-seeded`
  - observed result: seeded accounts and activations succeeded, but the alias request failed with `Stored OAuth credential api-key/deepseek/deepseek.personal.deepseek-api-key does not contain an access token.`
  - evidence: `evidence/runtime/phase5-seeded/requests/pi-alias-text-001/response.json`
  - durable lesson: local-file direct execution resolves credential files from `<runtimeStateRoot>/<scopeId>/credentials/**`, not from `<runtimeStateRoot>/runtime-host-bridge/credentials/**`
- `phase5-seeded-env`
  - observed result: env-backed DeepSeek account removed the file-lookup issue, but the alias request failed with `VENDOR_NOT_CONFIGURED`
  - evidence: `evidence/runtime/phase5-seeded-env/requests/pi-alias-text-001/response.json`
  - durable lesson: with the current bridge behavior, non-file credential backends still route remote execution through LiteLLM vendor execution; if vendors are intentionally disabled for isolated QA, direct-remote proof should use local-file refs plus scope-local copied credentials
- final harness change:
  - authoritative rebuilt-runtime QA used a temp state root, copied only the required root config plus scope-local credential files, seeded provider accounts through the official API, activated endpoints through the official API, and then drove live requests through the rebuilt server

## User Sign-Off

- QA Execution Mode: `agent-operated`
- Approved by: not required for `agent-operated` QA
- Date: `2026-07-08`
- Notes: the user explicitly asked that Phase 5 include rebuilt-runtime verification. That rebuilt-runtime proof is the authoritative QA path in this artifact.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: `tool_search` on `2026-07-08` exposed callable `multi_agent_v1` tools, including `spawn_agent`.
Delegation Decision Basis: this phase required local runtime rebuilds, isolated state manipulation, live HTTP verification, and evidence capture. The active session policy still forbids unsolicited subagent use, so QA remained local.
Delegation Override Reason: delegated QA would have violated the active no-unsolicited-subagent policy even though the tool surface technically exists.
Audit Inputs Provided:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/05-manual-qa.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-worktree.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03-implementation-summary.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/04-test-summary.md`
- rebuilt-runtime evidence under `evidence/runtime/phase5-rebuilt/`
- supplemental packaged-runtime evidence under `evidence/runtime/phase5-final/`
- diff basis from `00-worktree.md`
- actual changed files from `git status --short`

## Effective Inputs Re-read

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-worktree.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/03-implementation-summary.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/04-test-summary.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Earlier Phase Reconciliation

- Phase 4 verified the changed code surface and packaged-runtime floor, but intentionally left rebuilt-runtime proof for Phase 5
- The first three Phase 5 sub-attempts found real direct-remote QA harness truths rather than product regressions:
  - accounts are SQLite-backed, not derived from copied bridge credentials
  - local-file direct execution reads scope-local credentials
  - env-backed direct-remote accounts still route through LiteLLM vendor execution
- The final rebuilt-runtime harness incorporated those truths and then executed live requests successfully
- The later resumed rebuilt-runtime pass on port `54131` added the missing non-text routing proof without changing product code
- The earlier packaged-runtime pass remains valuable confidence, but it is supplemental here because the user asked for rebuilt-runtime QA specifically

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct rebuild execution, direct live HTTP request execution, direct inspection of the rebuilt-runtime request-detail/router/telemetry receipts, and direct comparison against the supplemental packaged-runtime receipts
- Acceptance Decision: `accepted`
- Refresh Handling: not applicable
- Repair Performed After Verification: corrected the Phase 5 harness assumptions about account persistence and credential-file location before relying on the final rebuilt-runtime receipts

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `26e6a4119a7338236fa7e97ff81629e80951e105`
- Comparison reference: `working-tree`
- Normalized baseline: `26e6a4119a7338236fa7e97ff81629e80951e105`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 26e6a4119a7338236fa7e97ff81629e80951e105`
- Actual changed product/docs files remain the Phase 4 product set plus this phase receipt and evidence only:
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `role-model-router/packages/adapter-execution/src/index.ts`
  - `role-model-router/packages/provider-litellm/test/index.test.ts`
  - `role-model-router/packages/provider-openai/src/index.ts`
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `role-model-router/packages/runtime-observability/src/index.ts`
  - `role-model-router/packages/runtime-observability/test/index.test.ts`
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - `role-model-router/packages/sqlite-memory/test/index.test.ts`
  - `role-model-router/packages/vendor-litellm/src/index.ts`
  - `role-model-router/packages/vendor-litellm/test/index.test.ts`
  - `docs/architecture/13-litellm-pi-role-model-integration-proposal.md`
  - `docs/architecture/14-routed-execution-semantics-and-receipts.md`
- Actual recursive/control-plane drift owned by this phase:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/05-manual-qa.md`
- Unexplained drift: none

## Requirement Completion Status

- R0 | Status: verified | Changed Files: `role-model-router/packages/adapter-execution/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: explicit execution-family ownership and native Codex path preservation | Verification Evidence: rebuilt `pi-codex-tools-001` exact OpenAI request and rebuilt `craft-deepseek-chat-001` exact DeepSeek request
- R1 | Status: verified | Changed Files: `role-model-router/packages/adapter-execution/src/index.ts`, `role-model-router/packages/provider-openai/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: shared responses semantics propagation | Verification Evidence: rebuilt `pi-codex-tools-001` exact OpenAI request plus focused Phase 4 suites
- R2 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/packages/provider-openai/src/index.ts` | Implementation Evidence: downstream semantics survive ingress translation | Verification Evidence: rebuilt exact and alias responses requests plus request-detail/telemetry receipts
- R3 | Status: verified | Changed Files: `role-model-router/packages/vendor-litellm/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Implementation Evidence: LiteLLM settings pass-through | Verification Evidence: focused Phase 4 suites plus additive packaged-runtime proof
- R4 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: operator-configured Codex endpoints route through compatibility ownership rather than fixed exact-model constants | Verification Evidence: rebuilt `pi-codex-tools-001`, rebuilt `pi-alias-image-001`, packaged `phase5-final/pi-codex-tools-001`, and focused Phase 4 Codex matrix coverage
- R5 | Status: verified | Changed Files: `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` | Implementation Evidence: payload-byte receipts and corpus output | Verification Evidence: rebuilt telemetry rows for all four representative requests plus request-detail execution-semantics receipts
- R6 | Status: verified | Changed Files: `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts` | Implementation Evidence: retry/reroute/idempotency/tool-side-effect fields and deterministic recovery corpus | Verification Evidence: rebuilt request-detail and telemetry receipts expose the recovery fields, and degraded-primary rebuilt QA `pi-alias-fallback-002` proves alias failover to a surviving family | Audit Note: the degraded-primary live proof was pre-dispatch failover selection rather than a non-zero `rerouteCount`, but the runtime exposed the recovery fields and selected the surviving family successfully
- R7 | Status: verified | Changed Files: `role-model-router/packages/adapter-execution/src/index.ts`, `role-model-router/packages/provider-openai/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: tool-bearing request semantics survive the shared execution contract | Verification Evidence: rebuilt `pi-codex-tools-001` exact OpenAI request with a function tool present, plus focused propagation suites
- R8 | Status: verified | Changed Files: `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: canonical telemetry/request-detail expansion | Verification Evidence: rebuilt per-request `telemetry-row.json`, `request-detail.json`, and `router-decision.json` receipts
- R9 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Implementation Evidence: deterministic 200-case Pi/Craft corpus | Verification Evidence: Phase 4 validator suite plus machine-readable corpus artifact
- R10 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/index.ts` | Implementation Evidence: rebuilt-runtime request path plus additive packaged-runtime proof | Verification Evidence: rebuilt `request-results.summary.json`, rebuilt `requests/pi-alias-image-001/router-decision.json`, rebuilt per-request receipts, degraded-primary rebuilt alias failover selection, `phase4-validate-packaging-rerun.green.log`, and packaged `phase5-final/request-results.summary.json`
- R11 | Status: deferred | Rationale: GitHub-hosted CI remains a merge-time surface that was not executed from this local worktree even though local focused suites, rebuilt-runtime QA, and packaged-runtime validation all passed | Deferred By: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/06-decisions-update.md`
- R12 | Status: deferred | Rationale: late-phase decision, state, and durable memory updates are owned by Phases 6-8 rather than Phase 5 manual QA | Deferred By: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/06-decisions-update.md`
- R13 | Status: verified | Changed Files: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`, `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/05-manual-qa.md` | Implementation Evidence: the final QA harness remained grounded in the locked root-cause findings instead of improvising a Pi/Craft-side patch | Verification Evidence: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`, `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/phase5-rebuilt/request-results.summary.json`

## Audit Verdict

Audit: PASS

## Traceability

- `R0 / R1 / R2 / R4` -> rebuilt exact-model and alias live traffic plus supplemental packaged-runtime proof
- `R3` -> Phase 4 LiteLLM config pass-through coverage plus additive packaged-runtime proof
- `R5 / R6 / R8` -> rebuilt telemetry/request-detail/router receipts for the representative live cases
- `R7` -> rebuilt tool-bearing `pi-codex-tools-001` request plus focused propagation suites
- `R9` -> deterministic corpus artifact from Phase 3 / Phase 4
- `R10` -> authoritative rebuilt-runtime request summary plus additive packaged-runtime validation and live packaged request summary
- `R11` -> local focused suites, local critical regression floor, rebuilt-runtime QA, and packaged validation
- `R12` -> explicitly deferred to the late-phase control-plane and memory updates
- `R13` -> root-cause-derived QA harness corrections recorded in this phase

## Coverage Gate

- [x] Rebuilt-runtime verification was executed from the current worktree
- [x] The rebuilt-runtime pass seeded real remote accounts and activated the intended endpoints inside isolated temp state
- [x] Representative exact OpenAI, exact DeepSeek, alias text, and alias image requests all passed on the rebuilt runtime
- [x] Each representative rebuilt-runtime case has request-detail, router-decision, endpoint-profile, and telemetry-row evidence
- [x] The failed sub-attempts and the final harness corrections are recorded explicitly
- [x] Supplemental packaged-runtime confidence remains recorded without replacing the rebuilt-runtime sign-off

Coverage: PASS

## Approval Gate

- [x] `QA Execution Mode: agent-operated` is declared and consistent with the evidence set
- [x] Rebuilt-runtime verification is complete and is the authoritative Phase 5 proof
- [x] The final QA evidence is stored under durable run-local artifact paths
- [x] Remaining external GitHub CI work is called out explicitly instead of hidden

Approval: PASS
