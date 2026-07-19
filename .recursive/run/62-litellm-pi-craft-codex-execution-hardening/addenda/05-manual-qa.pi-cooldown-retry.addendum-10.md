Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `05 Manual QA`
Addendum: `10`
Status: `LOCKED`
LockedAt: `2026-07-08T23:51:27Z`
LockHash: `ae78de9617b578cba52c56e9707d6bc07eaafe95a9e6846dff97bf90cd874d61`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/rebuilt-runtime/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/live-after-fix/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/rebuilt-runtime/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/live-after-fix/`
Scope note: This manual QA addendum records rebuilt-runtime verification on `127.0.0.1:3456` using direct runtime requests, real Pi CLI requests, and Craft client requests.

# Addendum 10 Manual QA

## TODO

- [x] Rebuild/package the runtime from the run-62 worktree.
- [x] Launch the rebuilt runtime on `127.0.0.1:3456`.
- [x] Capture health, process, port, endpoint, model, and executable hash evidence.
- [x] Use a verification-only cooldown injection and restore it afterward.
- [x] Verify direct runtime requests.
- [x] Verify real Pi CLI requests.
- [x] Verify Craft client requests.
- [x] Clean up isolated Craft verification helpers.

## Rebuilt Runtime

- Runtime PID: `34240`
- Runtime URL: `http://127.0.0.1:3456`
- Executable: `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\role-model-router\dist\release\win32-x64\role-model-runtime.exe`
- SHA-256: `9E93558BA1D527909336CE17EF1C88F3183E9E87832514E9F04467B20DAE6FC0`
- Health evidence: `evidence/logs/addendum-10/rebuilt-runtime/healthz.ready.json`
- Process evidence: `evidence/logs/addendum-10/rebuilt-runtime/runtime-process.after-relaunch.json`
- Port evidence: `evidence/logs/addendum-10/rebuilt-runtime/port-3456.after-relaunch.json`

## Direct Runtime Verification

During verification-only GPT cooldown:

- exact `chatgpt/gpt-5.4`: HTTP `400` in `389ms`, `no_eligible_target`
- alias `difficulty.remote-only`: HTTP `200` in `1779ms`, routed to `deepseek/deepseek-v4-pro`
- evidence: `evidence/logs/addendum-10/live-after-fix/direct-runtime/`

After cooldown restore:

- exact `chatgpt/gpt-5.4`: HTTP `200` in `7421ms`
- evidence: `evidence/logs/addendum-10/live-after-fix/post-restore/direct-chatgpt-post-restore.json`

## Pi CLI Verification

Real Pi CLI verification used the current run-62 `pi-role-model` extension path and sent actual Pi client requests to Role-Model.

During verification-only GPT cooldown:

- `difficulty.remote-only`: PASS, exit `0`, `5925ms`
- `baseline.remote-only`: PASS, exit `0`, `5006ms`
- `deepseek/deepseek-v4-pro`: PASS, exit `0`, `5191ms`
- `chatgpt/gpt-5.4`: expected fast failure, exit `1`, `3485ms`, stderr starts with `400 All eligible endpoints`
- tool-enabled `difficulty.remote-only`: PASS, exit `0`, `4914ms`
- evidence: `evidence/logs/addendum-10/live-after-fix/pi-cli-cooldown/`, `pi-cli-tools-smoke/`

After cooldown restore:

- `chatgpt/gpt-5.4`: PASS, exit `0`, `7866ms`
- evidence: `evidence/logs/addendum-10/live-after-fix/post-restore/pi-chatgpt/summary.json`

## Craft Client Verification

Craft verification used an isolated headless Craft client state root and the repo-owned Craft verification script.

During verification-only GPT cooldown:

- `difficulty.remote-only`: PASS, exit `0`, `7473ms`
- `deepseek/deepseek-v4-pro`: PASS, exit `0`, `7786ms`
- exact `chatgpt/gpt-5.4`: expected non-timeout failure, exit `1`, `2644ms`; Craft masks the runtime detail as a generic invalid request, but telemetry confirms runtime `400/no_eligible_target`
- evidence: `evidence/logs/addendum-10/live-after-fix/craft-headless/`

After cooldown restore:

- `chatgpt/gpt-5.4`: PASS, exit `0`, `9344ms`
- evidence: `evidence/logs/addendum-10/live-after-fix/craft-headless/craft-chatgpt-post-restore-summary.json`

## Cooldown State and Process Isolation

- Cooldown before injection: `evidence/logs/addendum-10/live-after-fix/cooldown-maintenance.before-injection.json`
- Cooldown after injection: `evidence/logs/addendum-10/live-after-fix/cooldown-maintenance.after-injection.json`
- Cooldown after restore: `evidence/logs/addendum-10/live-after-fix/cooldown-maintenance.after-restore.json`
- Isolated Craft cleanup evidence: `evidence/logs/addendum-10/live-after-fix/processes-after-live-verification.json`
- Remaining Role-Model listener is the rebuilt runtime on `127.0.0.1:3456`.
- A long-running external `D:\pi` Pi process remains active and was not killed because it appears to be the user-facing Pi client, not an isolated verification helper.

## Requirement Mapping

- `R0`: live receipts preserve provider identity and execution path separation.
- `R2`: both Pi and Craft clients work through the runtime without upstream patches.
- `R6`: Pi exact GPT cooldown no longer hangs behind retryable `503`.
- `R8`: telemetry and request-detail receipts explain the routing outcome.

## Coverage Gate

- [x] Rebuilt runtime was packaged and launched on `127.0.0.1:3456`.
- [x] Verification used protocol/runtime aliases, including `difficulty.remote-only`.
- [x] Verification used real Pi CLI and Craft client requests.
- [x] Cooldown state was restored after verification.

Coverage: PASS

## Approval Gate

- [x] The user-reported Pi timeout failure mode is directly covered.
- [x] Craft behavior is covered, including the masked exact-GPT cooldown error.
- [x] Runtime remains healthy after live verification.

Approval: PASS
