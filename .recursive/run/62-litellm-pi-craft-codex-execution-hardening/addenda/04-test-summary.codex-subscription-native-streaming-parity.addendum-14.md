Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `14`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:54Z`
LockHash: `372a78f5b2b5e7c214526b98c3b289dad01115990084f2ce2e2ee852ab2e7db4`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.codex-subscription-native-streaming-parity.addendum-14.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.codex-subscription-native-streaming-parity.addendum-14.md`
Scope note: Records addendum 14 RED/GREEN, validator, package, source-guard, and rebuilt-runtime proof.

# Addendum 14 Test Summary

## TODO

- [x] Record TDD receipts for Codex adapter-family telemetry.
- [x] Record focused and broad automated verification.
- [x] Record rebuilt-runtime telemetry proof for Codex and DeepSeek paths.

## TDD Receipts

- `evidence/logs/addendum-14/red/codex-adapter-family-receipt.red.log`: failed because Codex Subscription runtime observation bundles still reported `adapterFamily = ai-sdk-openai`.
- `evidence/logs/addendum-14/green/codex-adapter-family-receipt.green.log`: passed after runtime observations used `adapterFamily = codex-subscription-responses` for Codex Subscription execution.
- `evidence/logs/addendum-14/red/validate-vendors-codex-adapter-family.red.log`: failed because vendor validation corpus rows still normalized Codex Subscription observations to `ai-sdk-openai`.
- `evidence/logs/addendum-14/green/validate-vendors-codex-adapter-family.green.log`: passed after the validator stopped rewriting Codex adapter identity.

## Automated Verification

- `evidence/logs/addendum-14/green/codex-focused-suite.post-adapter-family.green.log`: focused Codex Subscription runtime tests passed.
- `evidence/logs/addendum-14/green/runtime-host-bridge-index.post-adapter-family.green.log`: full runtime host bridge index suite passed.
- `evidence/logs/addendum-14/green/validate-vendors-test.post-adapter-family.green.log`: vendor validator tests passed after the runtime adapter-family fix.
- `evidence/logs/addendum-14/green/validate-vendors-codex-adapter-family.green.log`: vendor validator tests passed after the corpus rewrite fix.
- `evidence/logs/addendum-14/green/runtime-host-bridge-tsc.post-adapter-family.green.log`: runtime host bridge typecheck passed after the runtime adapter-family fix.
- `evidence/logs/addendum-14/green/runtime-host-bridge-tsc.post-validator-family.green.log`: runtime host bridge typecheck passed after the validator corpus fix.
- `evidence/logs/addendum-14/green/runtime-validate-vendors.post-validator-family.green.log`: runtime vendor validation passed and reports Codex Subscription corpus rows with `adapterFamily = codex-subscription-responses`.
- `evidence/logs/addendum-14/green/runtime-package-sea.final-rebuild.green.log`: final runtime package passed.
- `evidence/logs/addendum-14/green/codex-app-server-source-guard.final.log`: source guard passed with no Codex app-server source matches under `runtime-host-bridge/src`.
- `evidence/logs/addendum-14/green/git-diff-check.final.green.log`: whitespace/conflict marker diff check passed.

## Rebuilt Runtime Artifact

- Executable: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA256: `9db186fd5a55b37e5177bb754cc977aa5ebeb3a5a90cf53736ce8c9a3ce6cc40`
- Final launch evidence: `evidence/logs/addendum-14/live/final-runtime/runtime-3456.final2.launch.json`
- Final health evidence: `evidence/logs/addendum-14/live/final-runtime/runtime-3456.final2.healthz.healthy.json`
- Final endpoint evidence: `evidence/logs/addendum-14/live/final-runtime/runtime-3456.final2.endpoints.healthy.json`
- Final process evidence: `evidence/logs/addendum-14/live/final-runtime/process-isolation-final.json`

The final runtime is healthy on `127.0.0.1:3456` with PID `40552`. The health response reports `status = healthy`, `executionMode = remote_only`, and two remote endpoints in inventory.

## Final Telemetry Proof

Evidence:

- `evidence/logs/addendum-14/live/final-runtime/telemetry-final-requests.raw.json`
- `evidence/logs/addendum-14/live/final-runtime/telemetry-final-requests.summary.json`
- `evidence/logs/addendum-14/live/final-runtime/telemetry-final-proof.json`
- `evidence/logs/addendum-14/live/final-runtime/request-details/*.json`

Required checks passed:

- `difficulty.remote-only` routed to `chatgpt/gpt-5.4` with `providerId = openai`, `vendorId = chatgpt-codex-responses`, `adapterFamily = codex-subscription-responses`, HTTP 200, and stream text deltas.
- `difficulty.remote-only` routed to `deepseek/deepseek-v4-pro` with `providerId = deepseek`, no vendor id, `adapterFamily = ai-sdk-openai-compatible`, HTTP 200, and stream text deltas.
- `chatgpt/gpt-5.4` exact model requests used `providerId = openai`, `vendorId = chatgpt-codex-responses`, `adapterFamily = codex-subscription-responses`, HTTP 200, and stream text deltas.
- `deepseek/deepseek-v4-pro` exact model requests used `providerId = deepseek`, `adapterFamily = ai-sdk-openai-compatible`, HTTP 200, and stream text deltas.

## Notes

- Persisted telemetry contains old rows from earlier binaries. The final proof uses the newest request rows after the final rebuild and relaunch.
- A first final launch wrapper looked for a nonexistent `ready` property on `/healthz`; the runtime readiness contract is `status = healthy`. The corrected evidence records the healthy response directly.

## Coverage Gate

- [x] TDD receipts are recorded.
- [x] Automated verification and source guard are recorded.
- [x] Rebuilt-runtime telemetry proof is recorded for alias and exact paths.

Coverage: PASS

## Approval Gate

- [x] Test evidence supports native Codex Subscription streaming parity.
- [x] Provider, vendor, and adapter identity are verified in telemetry.
- [x] Ready for manual QA closeout.

Approval: PASS

Audit: PASS
