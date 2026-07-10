Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `14`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:57Z`
LockHash: `3e7da99c44430d6f13afa6beabaf5086b03d024d29f3326041377f6d16a426a9`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.codex-subscription-native-streaming-parity.addendum-14.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.codex-subscription-native-streaming-parity.addendum-14.md`
Scope note: Records real Pi CLI, real Craft client, stream, telemetry, and process-isolation verification for addendum 14.

# Addendum 14 Manual QA

## TODO

- [x] Launch rebuilt runtime on `127.0.0.1:3456`.
- [x] Verify real Pi CLI requests through canonical alias routing.
- [x] Verify real Craft client requests through canonical alias and exact routing.
- [x] Verify telemetry identity and process isolation.

## Runtime Launch

The rebuilt Role-Model runtime is running on `127.0.0.1:3456`.

- PID: `40552`
- Binary: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA256: `9db186fd5a55b37e5177bb754cc977aa5ebeb3a5a90cf53736ce8c9a3ce6cc40`
- Health: `status = healthy`
- Evidence: `evidence/logs/addendum-14/live/final-runtime/runtime-3456.final2.healthz.healthy.json`

## Real Pi CLI Verification

Pi verification used the real Pi CLI with the repo-owned Role-Model extension:

- Extension: `packages/pi-role-model/extensions/role-model.ts`
- Provider: `role-model`
- Base URL: `http://127.0.0.1:3456/v1`
- Alias: `difficulty.remote-only`

Results:

- `pi-difficulty-remote-only-codex-hard-direct`: returned `PI_FINAL_CODEX_OK`.
- `pi-difficulty-remote-only-deepseek-simple-direct`: returned `PI_FINAL_DEEPSEEK_OK`.

Evidence:

- `evidence/logs/addendum-14/live/final-runtime/pi/pi-difficulty-remote-only-codex-hard-direct.stdout.log`
- `evidence/logs/addendum-14/live/final-runtime/pi/pi-difficulty-remote-only-deepseek-simple-direct.stdout.log`
- `evidence/logs/addendum-14/live/final-runtime/pi/pi-final-summary.direct.fixed.json`

Telemetry proof:

- `req-b61b62e2-9738-4fa6-a8bf-5c1e47fd0816`: `difficulty.remote-only` routed to `chatgpt/gpt-5.4`, provider `openai`, vendor `chatgpt-codex-responses`, adapter `codex-subscription-responses`.
- `req-74173a09-1aa3-40bf-9cc4-09fa87bcd70b`: `difficulty.remote-only` routed to `deepseek/deepseek-v4-pro`, provider `deepseek`, adapter `ai-sdk-openai-compatible`.

## Real Craft Client Verification

Craft verification used the real isolated headless Craft runtime/client path:

- Craft process: `Craft Agents.exe` PID `55300`
- RPC URL: `ws://127.0.0.1:54503`
- Connection type configured through Craft: `pi_compat`
- Role-Model endpoint configured through Craft: `http://127.0.0.1:3456/v1`

Results:

- `craft-difficulty-remote-only-codex-hard`: returned `CRAFT_FINAL_CODEX_OK`.
- `craft-difficulty-remote-only-deepseek-simple`: returned `CRAFT_FINAL_DEEPSEEK_OK`.
- `craft-chatgpt-exact`: returned `CRAFT_FINAL_GPT_OK`.
- `craft-deepseek-exact`: returned `CRAFT_FINAL_DEEPSEEK_EXACT_OK`.

Evidence:

- `evidence/logs/addendum-14/live/final-runtime/craft-headless/craft-final-summary.json`
- `evidence/logs/addendum-14/live/final-runtime/craft-headless/craft-difficulty-remote-only-codex-hard-result.json`
- `evidence/logs/addendum-14/live/final-runtime/craft-headless/craft-difficulty-remote-only-deepseek-simple-result.json`
- `evidence/logs/addendum-14/live/final-runtime/craft-headless/craft-chatgpt-exact-result.json`
- `evidence/logs/addendum-14/live/final-runtime/craft-headless/craft-deepseek-exact-result.json`

Telemetry proof:

- `req-1c040122-a20f-42b8-a00b-2c006c5af8ce`: `difficulty.remote-only` routed to `chatgpt/gpt-5.4`, provider `openai`, vendor `chatgpt-codex-responses`, adapter `codex-subscription-responses`.
- `req-213ae789-d24d-4ce4-831e-5074abe7f897`: `difficulty.remote-only` routed to `chatgpt/gpt-5.4`, provider `openai`, vendor `chatgpt-codex-responses`, adapter `codex-subscription-responses`.
- `req-992d2f31-fb7e-4905-ac77-d37b27878766`: exact `chatgpt/gpt-5.4`, provider `openai`, vendor `chatgpt-codex-responses`, adapter `codex-subscription-responses`.
- `req-f111ee47-ce3a-487a-be50-fcf24079f3d2`: exact `deepseek/deepseek-v4-pro`, provider `deepseek`, adapter `ai-sdk-openai-compatible`.

## Stream and Reasoning QA

- All final telemetry rows above report `streamTextSupported = true`.
- Codex Subscription rows report positive `streamTextDeltaCount`.
- DeepSeek rows report positive `streamTextDeltaCount`.
- The runtime does not require stream support for routing eligibility.
- The runtime does not fabricate reasoning deltas when the upstream does not emit reasoning deltas.
- When upstream emits text, reasoning, or tool-call argument deltas, the Codex Subscription adapter normalizes them through the same downstream streaming path.

## Process Isolation QA

- Evidence: `evidence/logs/addendum-14/live/final-runtime/process-isolation-final.json`
- The only process owning listener/established connections on `127.0.0.1:3456` is `role-model-runtime.exe` PID `40552`.
- `TIME_WAIT` rows are owned by Windows `Idle` PID `0` and are not competing runtime listeners.

## Manual QA Result

Manual QA: PASS

## Coverage Gate

- [x] Rebuilt runtime launch evidence is recorded.
- [x] Real Pi CLI verification is recorded.
- [x] Real Craft client verification is recorded.
- [x] Stream, telemetry, and process isolation QA are recorded.

Coverage: PASS

## Approval Gate

- [x] Manual QA meets addendum 14 pass criteria.
- [x] Canonical aliases and exact model ids were used.
- [x] Runtime remains suitable for final run closeout.

Approval: PASS

Audit: PASS
