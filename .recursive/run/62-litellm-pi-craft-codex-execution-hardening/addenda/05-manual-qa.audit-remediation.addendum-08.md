Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `08`
Status: `LOCKED`
LockedAt: `2026-07-08T16:08:00Z`
LockHash: `69e25c8bdbc2695e79544f6f517133a200afbb17783541d04a441b07bf3c7c16`
Workflow version: `recursive-mode-audit-v1`
QA Execution Mode: `agent-operated`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-08.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-08.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.audit-remediation.addendum-08.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-08/live/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.audit-remediation.addendum-08.md`
Scope note: This addendum records live rebuilt-runtime verification using the real Pi CLI and a real Craft headless client request path. Direct HTTP checks are included only as runtime responsiveness controls.

## TODO

- [x] Verify rebuilt runtime ownership on `127.0.0.1:3456`
- [x] Run real Pi CLI alias requests through canonical runtime aliases
- [x] Run real Pi CLI exact-model controls
- [x] Run real Craft client alias and exact-model controls
- [x] Capture provider/vendor/adapter telemetry after live requests
- [x] Verify runtime responsiveness after live client traffic
- [x] Stop isolated verification helpers without stopping the runtime

## Rebuilt Runtime Under Test

- Executable: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA-256: `80149f20a67626755e8e93e6d07b9e087589d95697ae97e16a839a36d4f9119d`
- Listener: `http://127.0.0.1:3456`
- Runtime PID: `19056`
- Runtime args include:
  - `--repo-root D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening`
  - `--runtime-state-root C:\Users\erikb\AppData\Local\Role Model Runtime`
  - `--scope-id standalone-runtime`
  - `--port 3456`

## Pi CLI Cases

| Case | Client path | Result | Evidence |
| --- | --- | --- | --- |
| `Pi-Alias-Difficulty` | real `pi.cmd`, model `difficulty.remote-only` | PASS, `PI_ALIAS2_OK`, `8868ms` | `evidence/logs/addendum-08/live/pi-difficulty-remote-only-simple-clean.log` |
| `Pi-Alias-Baseline` | real `pi.cmd`, model `baseline.remote-only` | PASS, `PI_BASELINE_OK`, `18298ms` | `evidence/logs/addendum-08/live/pi-baseline-remote-only-simple.log` |
| `Pi-Exact-GPT` | real `pi.cmd`, model `chatgpt/gpt-5.4` | PASS, `PI_GPT_OK`, `10132ms` | `evidence/logs/addendum-08/live/pi-chatgpt-exact-simple.log` |
| `Pi-Exact-DeepSeek` | real `pi.cmd`, model `deepseek/deepseek-v4-pro` | PASS, `PI_DEEPSEEK_OK`, `6587ms` | `evidence/logs/addendum-08/live/pi-deepseek-exact-simple.log` |

Pi telemetry:

- `evidence/logs/addendum-08/live/pi-clean-verification-telemetry.json`
- `evidence/logs/addendum-08/live/runtime-telemetry-after-pi-baseline-alias.json`

Key Pi telemetry rows:

- `difficulty.remote-only`: request `req-25811c73-b64c-48e7-a0fa-59510cf79ad7`, provider `openai`, vendor `codex-app-server`, adapter `ai-sdk-openai`, status `200`
- `baseline.remote-only`: request `req-00e8ec87-1436-43d7-8f58-8d5a1bf5e0f7`, provider `openai`, vendor `codex-app-server`, adapter `ai-sdk-openai`, status `200`
- `deepseek/deepseek-v4-pro`: request `req-ecd4c9fb-99d4-412f-95c8-034847859a27`, provider `deepseek`, vendor `null`, adapter `ai-sdk-openai-compatible`, status `200`

## Craft Client Cases

Craft was launched in isolated headless mode with `CRAFT_HEADLESS=1`, a temporary config/user-data directory under the worktree, and websocket RPC against the real Craft app server.

| Case | Client path | Result | Evidence |
| --- | --- | --- | --- |
| `Craft-Alias-Difficulty` | Craft headless client, model `difficulty.remote-only` | PASS, `CRAFT_ALIAS_OK`, `11514ms` | `evidence/logs/addendum-08/live/craft-headless-difficulty-remote-only-openai-base-result.json` |
| `Craft-Exact-DeepSeek` | Craft headless client, model `deepseek/deepseek-v4-pro` | PASS, `CRAFT_DEEPSEEK_OK`, `9344ms` | `evidence/logs/addendum-08/live/craft-headless-deepseek-exact-openai-base-result.json` |

Craft telemetry:

- `evidence/logs/addendum-08/live/runtime-telemetry-after-craft-openai-base.json`
- `evidence/logs/addendum-08/live/runtime-telemetry-after-craft-exact-openai-base.json`

Key Craft telemetry rows:

- `difficulty.remote-only`: request `req-84b3aeed-69f6-4103-a2f8-15af5f5f17ef`, provider `openai`, vendor `codex-app-server`, adapter `ai-sdk-openai`, status `200`
- `deepseek/deepseek-v4-pro`: request `req-efd6254b-bdbe-4aa5-b135-58430201e45d`, provider `deepseek`, vendor `null`, adapter `ai-sdk-openai-compatible`, status `200`

## Craft Harness Findings

The earlier Craft failures were false negatives in the verification setup, not evidence for a Role-Model client-specific branch:

- invalid Craft `permissionMode: "allow"` caused `Cannot read properties of undefined (reading 'displayName')` before the model request path completed; the valid mode used here is `allow-all`
- the OpenAI-compatible custom endpoint base URL must be the API root `http://127.0.0.1:3456/v1`; otherwise the SDK appends `/chat/completions` to the wrong root and gets `404`
- the verification harness now fails on Craft session error messages instead of treating a terminal event as success

## Runtime Responsiveness And Cleanup

- `evidence/logs/addendum-08/live/runtime-health-responsive-after-live-clients.json`
  - `/health` status `200`
  - direct DeepSeek response `RUNTIME_RESPONSIVE_OK`
  - elapsed `2583ms`
- `evidence/logs/addendum-08/live/runtime-health-responsive-after-pi-baseline.json`
  - `/health` status `200`
  - direct DeepSeek response `POST_PI_RESPONSIVE_OK`
  - elapsed `2336ms`
- `evidence/logs/addendum-08/live/process-isolation-after-cleanup.json`
  - isolated Craft verifier tree stopped
- `evidence/logs/addendum-08/live/process-isolation-final-after-pi-baseline.json`
  - final matching process is the intended runtime PID `19056`
  - no remaining `.tmp-craft-headless` processes

Observed limitation:

- one pre-existing local Chrome/network connection remained established to `:3456`; it was not killed because it was not part of the isolated verifier tree and did not prevent the post-client health or direct chat checks from passing.

## Verdict

- Real Pi alias requests no longer stall in the clean rebuilt-runtime verification state.
- Real Craft alias and exact requests complete through the corrected generic OpenAI-compatible endpoint configuration.
- Provider identity is correctly recorded as `openai` or `deepseek`; `codex-app-server` and `ai-sdk-openai` remain execution/vendor/adapter facts.
- The runtime stayed responsive after Pi and Craft traffic.

## Coverage Gate

- [x] QA used the rebuilt runtime on `:3456`
- [x] QA used real Pi CLI requests for canonical aliases and exact model controls
- [x] QA used a real Craft client path for alias and exact model controls
- [x] Runtime telemetry separates provider, vendor, execution, and adapter identity
- [x] Runtime responsiveness and process cleanup evidence is captured

Coverage: PASS

## Approval Gate

- [x] The proof does not rely only on handwritten HTTP requests
- [x] The proof does not use invented aliases
- [x] The proof documents harness false negatives separately from runtime behavior
- [x] Isolated verification processes were cleaned up and the runtime remains available on `:3456`

Approval: PASS

## Audit Verdict

Audit: PASS
