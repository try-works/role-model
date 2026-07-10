Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `15`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:56Z`
LockHash: `8e6be3e04ff4ccc503ea95e919631aa250f587691ccaf86420631979cf8cf091`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.codex-assistant-history-content-parts.addendum-15.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-15/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.codex-assistant-history-content-parts.addendum-15.md`
Scope note: Records rebuilt-runtime and real Pi CLI multi-turn verification for addendum 15.

# Addendum 15 Manual QA: Codex Assistant History Content Parts

## TODO

- [x] Rebuild and relaunch the runtime on `127.0.0.1:3456`.
- [x] Verify exact Codex history through the runtime without unsupported parameters.
- [x] Verify real Pi CLI persistent multi-turn exact and alias sessions.
- [x] Record Craft compatibility boundary for this isolated conversion fix.

## Rebuilt Runtime

- Runtime binary: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA-256: `9c657f19dfd521023a277d62a29e884e5bf273f16c3e27a0bff8c303ac74029e`
- Launch evidence: `evidence/logs/addendum-15/rebuilt-runtime/runtime-relaunch.json`
- Health evidence: `evidence/logs/addendum-15/rebuilt-runtime/healthz.relaunch.ready.json`
- Listener evidence: `evidence/logs/addendum-15/rebuilt-runtime/port-3456.relaunch.listener.json`
- Final process evidence: `evidence/logs/addendum-15/rebuilt-runtime/process-isolation-final.json`

The rebuilt runtime is healthy on `127.0.0.1:3456`, PID `62776`.

## Direct Runtime Probe

- Exact Codex history without unsupported temperature:
  - request: `evidence/logs/addendum-15/live/direct-runtime/chatgpt-exact-history-no-temperature.request.json`
  - response: `evidence/logs/addendum-15/live/direct-runtime/chatgpt-exact-history-no-temperature.response.json`
  - summary: `evidence/logs/addendum-15/live/direct-runtime/chatgpt-exact-history-no-temperature.summary.json`
  - result: HTTP 200, selected `chatgpt/gpt-5.4`, content `DIRECT_HISTORY_OK`

## Real Pi CLI Verification

Real Pi CLI command source:

- `D:\pi\node_modules\.bin\pi.ps1`

Persistent Pi sessions were stored under:

- `evidence/logs/addendum-15/live/pi-cli/sessions/`

Passing exact Codex Subscription session:

- `pi-exact-chatgpt-turn1.summary.json`: exit `0`, output `PI_EXACT_TURN1_OK`
- `pi-exact-chatgpt-turn2.summary.json`: exit `0`, output `PI_EXACT_TURN2_OK`

Passing canonical alias sessions:

- `pi-difficulty-remote-only-turn1.summary.json`: exit `0`, output `PI_ALIAS_TURN1_OK`
- `pi-difficulty-remote-only-turn2.summary.json`: exit `0`, output `PI_ALIAS_TURN2_OK`
- `pi-difficulty-remote-only-hard-turn1.summary.json`: exit `0`, output `PI_ALIAS_HARD_TURN1_OK`
- `pi-difficulty-remote-only-hard-turn2.summary.json`: exit `0`, output `PI_ALIAS_HARD_TURN2_OK`
- `pi-difficulty-remote-only-hard-tools-turn1.summary.json`: exit `0`, output `PI_ALIAS_HARD_TOOLS_TURN1_OK`
- `pi-difficulty-remote-only-hard-tools-turn2.summary.json`: exit `0`, output `PI_ALIAS_HARD_TOOLS_TURN2_OK`

Telemetry evidence:

- `evidence/logs/addendum-15/live/pi-cli/telemetry-requests-post-pi-hard-tools-latest12.summary.json`

Relevant telemetry facts:

- Exact `chatgpt/gpt-5.4` Pi turns selected `openai.personal.openai-codex-subscription.global.gpt-5.4`
- `providerId` was `openai`
- `vendorId` was `chatgpt-codex-responses`
- `adapterFamily` was `codex-subscription-responses`
- status was `success`, HTTP `200`
- canonical alias `difficulty.remote-only` Pi turns completed successfully

## Craft

Craft was not rerun for this addendum. Existing user-owned Craft processes were detected and left untouched:

- evidence: `evidence/logs/addendum-15/rebuilt-runtime/process-isolation-final.json`

The addendum 14 Craft verification remains the current Craft compatibility proof:

- `evidence/logs/addendum-14/live/final-runtime/craft-headless/craft-final-summary.json`

That prior proof includes `difficulty.remote-only`, exact `chatgpt/gpt-5.4`, and exact `deepseek/deepseek-v4-pro` Craft requests. This addendum's production change is isolated to Role Model's native Codex Responses chat-history conversion.

## Result

The Pi-reproduced multi-turn assistant-history failure is fixed in the rebuilt runtime on `127.0.0.1:3456`. The previous `input_text` 400 was reproduced by RED unit test and eliminated by role-aware Responses content conversion.

## Coverage Gate

- [x] Rebuilt runtime evidence is recorded.
- [x] Direct runtime history probe passed.
- [x] Real Pi CLI persistent multi-turn exact and alias sessions passed.
- [x] Telemetry evidence confirms OpenAI provider identity and Codex Responses adapter identity.

Coverage: PASS

## Approval Gate

- [x] Manual QA covers the user-visible screenshot failure.
- [x] No Pi or Craft upstream changes were required.
- [x] Runtime is ready for final run closeout.

Approval: PASS

Audit: PASS
