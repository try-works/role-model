Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `16`
Status: `LOCKED`
LockedAt: `2026-07-09T14:02:43Z`
LockHash: `f9b40bc08b9e608f90985108597fdc1bedf8eefd0a5d0d53367093f1860fe01d`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.provider-agnostic-routing-preferences.addendum-16.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-16/live/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.provider-agnostic-routing-preferences.addendum-16.md`
Scope note: Manual QA used the rebuilt Role-Model runtime binary on `127.0.0.1:3456`, the real Pi CLI, and a real Craft headless client path. No curl-only or handcrafted request script was accepted as a substitute for Pi or Craft verification.

# Addendum 16 Manual QA

## TODO

- [x] Launch rebuilt runtime from the run-62 worktree on `127.0.0.1:3456`.
- [x] Verify runtime health, endpoint registry, and alias registry.
- [x] Verify exactly one runtime process owns `127.0.0.1:3456`.
- [x] Verify real Pi CLI can call `difficulty.remote-only`.
- [x] Verify real Pi CLI tool-bearing request keeps compatible endpoints eligible.
- [x] Verify real Craft client can call `difficulty.remote-only`.
- [x] Verify router decisions show DeepSeek is not excluded by provider-specific policy when compatible.
- [x] Clean up addendum-16 headless Craft helper processes.

## Rebuilt Runtime

Executable:

- `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\role-model-router\dist\release\win32-x64\role-model-runtime.exe`

SHA256:

- `355eeb6dbed726f2c329d877bf1e7d50c998c04c8e01378c212dff764b06ddd9`

Launch command shape:

```powershell
role-model-runtime.exe --repo-root "D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening" --runtime-state-root "C:\Users\erikb\AppData\Local\Role Model Runtime" --scope-id standalone-runtime --host 127.0.0.1 --port 3456
```

Process:

- PID: `62648`
- Listener: `127.0.0.1:3456`

Evidence:

- `evidence/logs/addendum-16/live/runtime-3456-relaunch.stdout.log`
- `evidence/logs/addendum-16/live/runtime-3456-relaunch.stderr.log`
- `evidence/logs/addendum-16/live/process-isolation-final-external-only.json`

## Runtime Health And Registry

Health evidence:

- `evidence/logs/addendum-16/live/healthz-final.json`

Health result:

- `status = healthy`
- `executionMode = remote_only`
- `sessionBootstrap.status = ready`
- inventory contains 2 model IDs and 2 endpoint IDs

Endpoint evidence:

- `evidence/logs/addendum-16/live/endpoints-final.json`

Active healthy endpoints:

- `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- `openai.personal.openai-codex-subscription.global.gpt-5.4`

Both endpoints declare:

- `text.chat`
- `tools.function_calling`
- `reasoning`
- `structured.output`
- `code.edit`

Model registry evidence:

- `evidence/logs/addendum-16/live/models-final.json`

Alias check:

- `difficulty.remote-only` contains both endpoint IDs.
- `baseline.remote-only`, `default.remote-only`, and related aliases also expose both compatible endpoints.

## Pi CLI Verification

Pi command path:

- `D:\pi\node_modules\.bin\pi.ps1`

### Pi Alias Text Request

Command:

```powershell
pi -e packages/pi-role-model/extensions/role-model.ts --provider role-model --model difficulty.remote-only --thinking off --no-tools --no-session -p <prompt>
```

Expected text:

- `PI_ADD16_ALIAS_TEXT_OK`

Evidence:

- `evidence/logs/addendum-16/live/pi-cli/alias-text.summary.json`
- `evidence/logs/addendum-16/live/pi-cli/alias-text.stdout-stderr.log`
- `evidence/logs/addendum-16/live/pi-cli/alias-text-runtime/summary.json`
- `evidence/logs/addendum-16/live/pi-cli/alias-text-runtime/router-decision.by-request-id.json`

Result:

- Exit code: `0`
- Duration: `6526 ms`
- Request ID: `req-aa0d2e29-9008-41cc-b323-4056119aacc2`
- Chosen endpoint in router decision: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- Eligible endpoints:
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - `openai.personal.openai-codex-subscription.global.gpt-5.4`

Router decision proof:

- `policy_snapshot.allow_endpoints` contains both endpoints.
- Both endpoints are eligible with no exclusions.
- Both endpoints are scored.
- Selection is score-based, not provider-pin-based.

### Pi Alias Tool-Bearing Request

Command:

```powershell
pi -e packages/pi-role-model/extensions/role-model.ts --provider role-model --model difficulty.remote-only --thinking high --tools ls --no-session -p <prompt>
```

Expected text:

- `PI_ADD16_ALIAS_TOOL_OK`

Evidence:

- `evidence/logs/addendum-16/live/pi-cli/alias-tool.summary.json`
- `evidence/logs/addendum-16/live/pi-cli/alias-tool.stdout-stderr.log`
- `evidence/logs/addendum-16/live/pi-cli/alias-tool-runtime/summary.json`
- `evidence/logs/addendum-16/live/pi-cli/alias-tool-runtime/router-decision.by-request-id.json`

Result:

- Exit code: `0`
- Duration: `6649 ms`
- Request ID: `req-89bb99d2-7cf4-4b28-a98d-a9a6e997ed12`
- Selected endpoint: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- Provider: `deepseek`
- Adapter: `ai-sdk-openai-compatible`
- Execution family: `remote-service`
- Required capabilities:
  - `reasoning.effort_control`
  - `text.chat`
  - `tools.function_calling`

Router decision proof:

- `allowEndpoints` contains DeepSeek and OpenAI Codex Subscription.
- Both endpoints are eligible with no exclusions.
- DeepSeek is not excluded by `POLICY_DENY_ENDPOINT`.
- No Codex-specific hard pin is present.

## Craft Client Verification

Craft verification used the real headless Craft runtime/client path and the canonical `difficulty.remote-only` alias.

Evidence:

- `evidence/logs/addendum-16/live/craft-headless-2/craft-server.json`
- `evidence/logs/addendum-16/live/craft-headless-2/craft-difficulty-remote-only.summary.json`
- `evidence/logs/addendum-16/live/craft-headless-2/craft-difficulty-remote-only-result.json`
- `evidence/logs/addendum-16/live/craft-headless-2/runtime/summary.json`
- `evidence/logs/addendum-16/live/craft-headless-2/runtime/router-decision.by-request-id.json`

Result:

- Exit code: `0`
- Duration: `8997 ms`
- Contains expected text: `true`
- Request ID: `req-3aae970c-8af6-487b-a9b4-e4c56f0ff0fd`
- Selected endpoint: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- Provider: `deepseek`
- Adapter: `ai-sdk-openai-compatible`
- Source client: `openai.chat.completions`
- Required capabilities:
  - `text.chat`
  - `tools.function_calling`

Router decision proof:

- `allowEndpoints` contains DeepSeek and OpenAI Codex Subscription.
- Both endpoints are eligible with no exclusions.
- No provider-specific policy deny excludes DeepSeek.

## Process Isolation

Final process evidence:

- `evidence/logs/addendum-16/live/process-isolation-final-external-only.json`

Result:

- Exactly one listener owns `127.0.0.1:3456`.
- The listener is PID `62648`.
- The process executable path is the rebuilt run-62 worktree runtime binary.
- Exactly one `role-model-runtime.exe` process remains.
- No addendum-16 headless Craft helper processes remain.

Process Isolation: PASS

## Requirement Completion Status

- R0 | Status: manually verified | Evidence: Pi and Craft alias decisions preserve both compatible endpoints. | Addendum: addendum-16.
- R1 | Status: manually verified | Evidence: runtime requests carry capability requirements, not provider preference. | Addendum: addendum-16.
- R2 | Status: manually verified | Evidence: real Pi CLI and real Craft client requests passed without upstream consumer changes. | Addendum: addendum-16.
- R3 | Status: manually verified | Evidence: selected DeepSeek rows report provider `deepseek`; no LiteLLM provider misclassification appears in these requests. | Addendum: addendum-16.
- R4 | Status: manually verified | Evidence: OpenAI Codex Subscription remains an eligible endpoint in the alias pool but is not hard-pinned. | Addendum: addendum-16.
- R8 | Status: manually verified | Evidence: router decisions include allow endpoints, eligibility, exclusions, scores, selected endpoint, provider, vendor, and adapter facts. | Addendum: addendum-16.
- R10 | Status: manually verified | Evidence: rebuilt runtime on `127.0.0.1:3456`, Pi CLI logs, Craft logs, and process isolation evidence. | Addendum: addendum-16.
- R11 | Status: manually verified | Evidence: Phase 4 CI passed before runtime launch. | Addendum: addendum-16.
- R12 | Status: manually verified | Evidence: docs and memory updates are present in the worktree. | Addendum: addendum-16.

## Coverage Gate

- [x] Rebuilt runtime launched on `127.0.0.1:3456`.
- [x] Runtime health is `healthy`.
- [x] Alias registry includes both configured endpoints for `difficulty.remote-only`.
- [x] Pi CLI text alias request passed.
- [x] Pi CLI tool-bearing alias request passed.
- [x] Craft alias request passed.
- [x] Router decisions prove both compatible endpoints eligible.
- [x] Process isolation is clean.

Coverage: PASS

## Approval Gate

- [x] Live verification used the rebuilt runtime binary from this worktree.
- [x] Live verification used real Pi CLI and real Craft client paths.
- [x] No provider-specific routing preference remains in observed decisions.
- [x] No stale background runtime is disturbing `:3456`.

Approval: PASS
