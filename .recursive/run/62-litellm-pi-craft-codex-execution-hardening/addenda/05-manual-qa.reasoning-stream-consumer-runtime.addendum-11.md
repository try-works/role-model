Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `11`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:58Z`
LockHash: `7266b3f632a33e4476d881d22bf849b4318ef3e3d823ac29153696174b4d6127`
Workflow version: `recursive-mode-audit-v1`
Lock note: `scripts/recursive-lock.py` is not present in this worktree; audit, coverage, and approval gates are included and pass, but formal lock metadata was not applied.
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-consumer-runtime.addendum-11.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.reasoning-stream-consumer-runtime.addendum-11.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.reasoning-stream-consumer-runtime.addendum-11.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.reasoning-stream-consumer-runtime.addendum-11.md`
Scope note: Records rebuilt-runtime, real Pi CLI, real Craft runtime, raw SSE, and process-isolation QA for addendum 11.

# Addendum 11 Manual QA

## TODO

- [x] Verify rebuilt runtime on `127.0.0.1:3456`.
- [x] Verify real Pi CLI requests through canonical aliases and exact model ids.
- [x] Verify real Craft runtime/client requests through canonical aliases and exact model ids.
- [x] Record raw SSE reasoning stream evidence and process isolation.

## Rebuilt Runtime

Live target:

- URL: `http://127.0.0.1:3456`
- PID: `62252`
- Executable: `D:/DEV/role-model/.worktrees/62-litellm-pi-craft-codex-execution-hardening/role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA-256: `d0e909f887309e69b64fc5a4cafc4e6796f0f9d1cb88a5b0c71de4c0fe93c15c`
- Launch evidence: `evidence/logs/addendum-11/live/runtime/runtime-relaunch.json`
- Health evidence: `evidence/logs/addendum-11/live/runtime/healthz.final.json`
- Process evidence: `evidence/logs/addendum-11/live/runtime/role-model-runtime-processes.final.json`
- Port evidence: `evidence/logs/addendum-11/live/runtime/port-3456-listeners.final.json`

Final process isolation:

- Exactly one listener was observed on `127.0.0.1:3456`.
- Listener owner was PID `62252`.
- Runtime `/healthz` returned `healthy`.
- Runtime execution mode was `remote_only`.

## Live Pi CLI Verification

Verification used the real Pi CLI:

- CLI: `D:/pi/node_modules/.bin/pi.ps1`
- Extension: `packages/pi-role-model/extensions/role-model.ts`
- Provider: `role-model`
- Endpoint: `http://127.0.0.1:3456`
- Mode: `--thinking high --no-tools --no-context-files --no-session --approve --print`

Valid rerun evidence:

- `difficulty.remote-only`: exit `0`, duration `5257 ms`, evidence `evidence/logs/addendum-11/live/pi-cli/alias-difficulty-remote-only.rerun.summary.json`
- `baseline.remote-only`: exit `0`, duration `5683 ms`, evidence `evidence/logs/addendum-11/live/pi-cli/alias-baseline-remote-only.rerun.summary.json`
- `deepseek/deepseek-v4-pro`: exit `0`, duration `5832 ms`, evidence `evidence/logs/addendum-11/live/pi-cli/exact-deepseek.rerun.summary.json`
- `chatgpt/gpt-5.4`: exit `0`, duration `9781 ms`, evidence `evidence/logs/addendum-11/live/pi-cli/exact-chatgpt.rerun.summary.json`

Pi request-detail evidence:

- Summary: `evidence/logs/addendum-11/live/pi-cli/request-details-pi-cli-latest4.summary.json`
- `difficulty.remote-only` resolved through the canonical alias and selected `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`.
- `difficulty.remote-only` recorded `reasoning.requested: true`, `reasoning.controlForwarded: true`, `reasoning.deltaCount: 34`, and `reasoning.streamSuppressed: false`.
- `baseline.remote-only` recorded `reasoning.requested: true`, `reasoning.controlForwarded: true`, `reasoning.deltaCount: 26`, and `reasoning.streamSuppressed: false`.
- Exact DeepSeek recorded `reasoning.deltaCount: 20`.
- Exact GPT recorded `reasoning.requested: true`, `reasoning.controlForwarded: true`, `reasoning.deltaCount: 0`, and `reasoning.unavailableReason: provider_returned_no_reasoning`.

Initial Pi CLI evidence file `pi-cli-results.json` includes invalid early attempts before the final rerun path was stabilized. The valid pass criteria are the four `*.rerun.summary.json` files and the latest request-detail summary.

Pi verdict: PASS.

## Live Craft Runtime Verification

Verification used the real Craft runtime in an isolated headless profile:

- Craft server evidence: `evidence/logs/addendum-11/live/craft-runtime/craft-server.json`
- Start evidence: `evidence/logs/addendum-11/live/craft-runtime/craft-headless-start.json`
- Summary: `evidence/logs/addendum-11/live/craft-runtime/craft-summary.json`
- Temp profile cleanup: `evidence/logs/addendum-11/live/craft-runtime/temp-profile-cleanup.json`

Craft live cases:

- `difficulty.remote-only`: exit `0`, duration `11448 ms`, output `evidence/logs/addendum-11/live/craft-runtime/craft-difficulty-remote-only-result.json`
- `baseline.remote-only`: exit `0`, duration `9680 ms`, output `evidence/logs/addendum-11/live/craft-runtime/craft-baseline-remote-only-result.json`
- `deepseek/deepseek-v4-pro`: exit `0`, duration `7523 ms`, output `evidence/logs/addendum-11/live/craft-runtime/craft-deepseek-exact-result.json`
- `chatgpt/gpt-5.4`: exit `0`, duration `10389 ms`, output `evidence/logs/addendum-11/live/craft-runtime/craft-chatgpt-exact-result.json`

Craft request-detail evidence:

- Summary: `evidence/logs/addendum-11/live/craft-runtime/request-details-craft-latest4.summary.json`
- `difficulty.remote-only` resolved to the canonical alias with `chatgpt/gpt-5.4` and `deepseek/deepseek-v4-pro` allowed endpoints.
- `baseline.remote-only` resolved to the canonical alias with the same allowed endpoints.
- Exact DeepSeek recorded provider `deepseek`, adapter `ai-sdk-openai-compatible`, text deltas, and `reasoning.deltaCount: 22`.
- Exact GPT and alias-selected GPT recorded provider `openai`, vendor `codex-app-server`, adapter `ai-sdk-openai`, and normal streamed content.
- Craft headless `pi_compat` traffic did not send reasoning controls in the observed path, so alias-selected GPT request details show `reasoning: null`.

Craft verdict: PASS for real Craft runtime routing and response completion. Craft visible-reasoning rendering remains a downstream client behavior question when Craft does not request reasoning controls.

## Supplemental Raw SSE Verification

Raw SSE is supplemental evidence only; it does not replace real Pi CLI or Craft runtime verification.

- Summary: `evidence/logs/addendum-11/live/raw-sse/raw-sse-summary.json`
- `difficulty.remote-only`: HTTP `200`, response model `deepseek-v4-pro`, `43` reasoning deltas, `10` content deltas.
- `deepseek/deepseek-v4-pro`: HTTP `200`, response model `deepseek-v4-pro`, `61` reasoning deltas, `12` content deltas.

This proves Role-Model emits OpenAI-compatible `reasoning_content` on the wire for a reasoning-capable provider path and canonical alias.

## Observed Provider Behavior

- DeepSeek returned reasoning deltas and Role-Model forwarded or recorded them.
- GPT/Codex Subscription returned ordinary content but no reasoning deltas in the observed execution path.
- Role-Model reported GPT reasoning absence as `provider_returned_no_reasoning` when Pi requested reasoning.
- No fabricated reasoning was emitted.

## Background Process Check

Cleanup and isolation evidence:

- Craft helper cleanup: `evidence/logs/addendum-11/live/craft-runtime/temp-profile-cleanup.json`
- Final runtime process: `evidence/logs/addendum-11/live/runtime/role-model-runtime-processes.final.json`
- Final listener: `evidence/logs/addendum-11/live/runtime/port-3456-listeners.final.json`

Only the rebuilt Role-Model runtime is intentionally left running on `127.0.0.1:3456` for user testing.

## Manual QA Verdict

Manual QA: PASS.

The rebuilt runtime is live, healthy, and responding on `127.0.0.1:3456`. Real Pi CLI and real Craft runtime requests both completed through canonical aliases and exact model ids. DeepSeek reasoning stream forwarding is proven on the wire. GPT/Codex reasoning absence is classified as upstream unavailability rather than runtime suppression.

## Coverage Gate

- [x] Rebuilt runtime verified on `127.0.0.1:3456`.
- [x] Real Pi CLI sent requests to Role-Model.
- [x] Real Craft runtime/client sent requests to Role-Model.
- [x] Canonical aliases were used.
- [x] Raw SSE evidence proves runtime reasoning stream behavior.
- [x] Process isolation evidence captured and final runtime left running.

Coverage: PASS

## Approval Gate

- [x] Live verification meets addendum 11 pass criteria.
- [x] Provider limitations are documented.
- [x] No Pi or Craft upstream modifications were made.
- [x] Runtime is ready for user retesting on `127.0.0.1:3456`.

Approval: PASS
