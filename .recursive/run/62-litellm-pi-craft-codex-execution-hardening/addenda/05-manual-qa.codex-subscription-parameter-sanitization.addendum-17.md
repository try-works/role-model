Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `17`
Status: `LOCKED`
LockedAt: `2026-07-10T01:23:02Z`
LockHash: `6f71eb963edd0b48074e49d0679811479bfb427bb702ba2707bfdf11d0a745d7`
Workflow version: `recursive-mode-audit-v1`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.codex-subscription-parameter-sanitization.addendum-17.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-17/live/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.codex-subscription-parameter-sanitization.addendum-17.md`
Scope note: Manual QA used the rebuilt Role-Model runtime binary on `127.0.0.1:3456`, direct runtime probes, the real Pi CLI, and the real Craft headless client path. Curl-only probes were treated as diagnostics, not substitutes for Pi or Craft verification.

# Addendum 17 Manual QA

## TODO

- [x] Rebuild the runtime after the implementation and diagnostics fix.
- [x] Stop stale Role-Model listeners on `127.0.0.1:3456`.
- [x] Launch the rebuilt runtime from the run-62 worktree on `127.0.0.1:3456`.
- [x] Verify runtime health and endpoint registry.
- [x] Run direct exact-model and alias probes.
- [x] Verify request-detail parameter sanitization receipts.
- [x] Verify real Pi CLI exact `chatgpt/gpt-5.4`.
- [x] Verify real Pi CLI canonical alias `difficulty.remote-only`.
- [x] Verify real Pi CLI multi-turn canonical alias session.
- [x] Verify real Craft alias request.
- [x] Verify real Craft exact `chatgpt/gpt-5.4` request.
- [x] Record process isolation and cleanup status.

## Rebuilt Runtime

Executable:

- `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\role-model-router\dist\release\win32-x64\role-model-runtime.exe`

SHA256:

- `d4216cff50589fbe83e8f7f19dfbcbf7cd2a2d19a6d0e8632b568781eea61285`

Launch command shape:

```powershell
role-model-runtime.exe --repo-root "D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening" --runtime-state-root "C:\Users\erikb\AppData\Local\Role Model Runtime" --scope-id standalone-runtime --host 127.0.0.1 --port 3456
```

Current runtime:

- PID: `48524`
- Listener: `127.0.0.1:3456`
- Health: `healthy`

Evidence:

- `evidence/logs/addendum-17/live/runtime-3456.after-diagnostics-fix.launch.json`
- `evidence/logs/addendum-17/live/runtime-smoke-after-diagnostics-fix.json`
- `evidence/logs/addendum-17/live/process-isolation-final-after-addendum17-cleanup.json`

Active healthy endpoints:

- `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- `openai.personal.openai-codex-subscription.global.gpt-5.4`

## Direct Runtime Probes

Direct probes covered exact Codex and canonical alias requests across Chat Completions and Responses ingress.

Evidence:

- `evidence/logs/addendum-17/live/direct-probes-summary.json`
- `evidence/logs/addendum-17/live/receipt-probes-after-fix-summary.json`
- `evidence/logs/addendum-17/live/receipt-request-detail-summary-after-fix.json`

Observed results:

- Exact `chatgpt/gpt-5.4` Chat Completions request with `temperature` completed without backend `Unsupported parameter: temperature`.
- Exact `chatgpt/gpt-5.4` Responses request with `temperature` and `max_output_tokens` completed without backend unsupported-parameter failure.
- Request detail recorded `sourceClient = openai.responses` for Responses ingress and `sourceClient = openai.chat.completions` for Chat Completions ingress.
- Request detail recorded `providerId = openai`, `vendorId = chatgpt-codex-responses`, and `adapterFamily = codex-subscription-responses`.

## Pi CLI Verification

Real Pi CLI path:

- `D:\pi\node_modules\.bin\pi.cmd`

Role-Model extension path:

- `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\packages\pi-role-model\extensions\role-model.ts`

Role-Model endpoint:

- `http://127.0.0.1:3456`

Evidence:

- `evidence/logs/addendum-17/live/pi-cli/pi-cli-summary-after-fix.json`
- `evidence/logs/addendum-17/live/pi-cli/pi-telemetry-latest12-summary-after-fix.json`
- `evidence/logs/addendum-17/live/pi-cli/sessions/2026-07-10T00-46-43-164Z_add17-pi-multiturn.jsonl`

Passed cases:

- Exact `chatgpt/gpt-5.4` returned `PI_ADD17_EXACT_GPT_OK` with empty stderr.
- Canonical alias `difficulty.remote-only` returned `PI_ADD17_ALIAS_OK` with empty stderr.
- Multi-turn canonical alias session returned `PI_ADD17_TURN1_OK` and `PI_ADD17_TURN2_OK` with empty stderr.

## Craft Client Verification

Craft verification used the repo-owned headless Craft helper after stopping the normal Craft app instance that was occupying the single-instance runtime path.

Evidence:

- `evidence/logs/addendum-17/live/craft-headless-after-craft-stop/craft-summary-after-fix.json`
- `evidence/logs/addendum-17/live/craft-headless-after-craft-stop/craft-alias-difficulty-after-fix-result.json`
- `evidence/logs/addendum-17/live/craft-headless-after-craft-stop/craft-exact-chatgpt-after-fix-result.json`
- `evidence/logs/addendum-17/live/craft-headless-after-craft-stop/sessions/260710-keen-wave.session.jsonl`
- `evidence/logs/addendum-17/live/craft-headless-after-craft-stop/sessions/260710-eager-reed.session.jsonl`

Passed cases:

- Canonical alias `difficulty.remote-only` returned `CRAFT_ADD17_ALIAS_OK`, exit code `0`, elapsed about `41,994 ms`.
- Exact `chatgpt/gpt-5.4` returned `CRAFT_ADD17_GPT_OK`, exit code `0`, elapsed about `64,877 ms`.

Known note:

- The normal Craft app was stopped to allow isolated headless verification and was not restarted by this QA step.

## Process Isolation

Final process evidence:

- `evidence/logs/addendum-17/live/process-isolation-final-after-addendum17-cleanup.json`

Observed final state:

- One Role-Model runtime process owns the `127.0.0.1:3456` listener: PID `48524`.
- No Craft headless verification process remains.
- Accidental duplicate evidence folders `role-model-router/.recursive/run/62...`, `--session-id`, and literal `~` were removed after preserving required transcripts.

## Requirement Completion Status

- R0 | Status: verified | Verification Evidence: direct probes and request-detail summaries. | Addendum: addendum-17.
- R1 | Status: verified | Verification Evidence: exact Codex direct probes, Pi CLI exact Codex, and Craft exact Codex. | Addendum: addendum-17.
- R2 | Status: verified | Verification Evidence: real Pi CLI and real Craft client paths completed without Pi/Craft source changes. | Addendum: addendum-17.
- R3 | Status: verified | Verification Evidence: telemetry/request-detail provider/vendor/adapter fields. | Addendum: addendum-17.
- R4 | Status: verified | Verification Evidence: Codex Subscription selected endpoint uses `codex-subscription-responses`. | Addendum: addendum-17.
- R8 | Status: verified | Verification Evidence: request-detail sanitization receipts. | Addendum: addendum-17.
- R10 | Status: verified | Verification Evidence: rebuilt runtime on `127.0.0.1:3456`, direct probes, Pi CLI, Craft, and process isolation. | Addendum: addendum-17.
- R11 | Status: verified | Verification Evidence: automated test summary and live runtime proof. | Addendum: addendum-17.
- R12 | Status: verified | Verification Evidence: final addendum-17 artifacts and canonical evidence paths. | Addendum: addendum-17.

## Coverage Gate

- [x] Rebuilt runtime is active on `127.0.0.1:3456`.
- [x] Direct runtime probes passed.
- [x] Request-detail sanitization receipts passed.
- [x] Real Pi CLI exact-model verification passed.
- [x] Real Pi CLI alias verification passed.
- [x] Real Pi CLI multi-turn alias verification passed.
- [x] Real Craft alias verification passed.
- [x] Real Craft exact Codex verification passed.
- [x] Process isolation and cleanup are recorded.

Coverage: PASS

## Approval Gate

- [x] QA execution mode is agent-operated and evidence-backed.
- [x] Required live verification used rebuilt runtime, Pi CLI, and Craft client.
- [x] Runtime remains launched for local user testing.

Approval: PASS
