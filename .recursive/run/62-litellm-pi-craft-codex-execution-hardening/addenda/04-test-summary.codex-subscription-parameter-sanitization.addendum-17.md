Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `17`
Status: `LOCKED`
LockedAt: `2026-07-10T01:23:02Z`
LockHash: `862d7efee8b04e233ff5a220458a49a325620c09393d8edcce88ab284d95e194`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-parameter-sanitization.addendum-17.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.codex-subscription-parameter-sanitization.addendum-17.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.codex-subscription-parameter-sanitization.addendum-17.md`
Scope note: This test summary covers addendum-17 automated RED/GREEN tests, type checks, runtime critical tests, vendor validation, and packaging. Live Pi and Craft verification is recorded in the addendum-17 Phase 5 QA artifact.

# Addendum 17 Test Summary

## TODO

- [x] Record RED evidence.
- [x] Record targeted GREEN evidence.
- [x] Record typecheck and package tests.
- [x] Record runtime critical tests.
- [x] Record vendor validation with an explicit zero exit code.
- [x] Record rebuilt runtime packaging evidence.
- [x] Record known non-product harness issues.

## RED Evidence

Codex Chat Completions optional parameters:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription sanitizes unsupported Chat Completions optional parameters"
```

Evidence:

- `evidence/logs/addendum-17/red/codex-chat-parameters.red.log`

Codex Responses optional parameters:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription sanitizes unsupported Responses optional parameters"
```

Evidence:

- `evidence/logs/addendum-17/red/codex-responses-parameters.red.log`

Canonical alias parity:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription applies the same parameter policy after alias routing"
```

Evidence:

- `evidence/logs/addendum-17/red/codex-alias-parameter-policy.red.log`

Responses-ingress request-detail policy:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription request detail preserves Responses-ingress parameter policy"
```

Evidence:

- `evidence/logs/addendum-17/red/codex-responses-ingress-observation-policy.red.log`

RED Result: PASS

## GREEN Evidence

Targeted addendum-17 tests:

- `evidence/logs/addendum-17/green/codex-chat-parameters.green.log`
- `evidence/logs/addendum-17/green/codex-responses-parameters.green.log`
- `evidence/logs/addendum-17/green/codex-alias-parameter-policy.green.log`
- `evidence/logs/addendum-17/green/codex-responses-ingress-observation-policy.green.log`
- `evidence/logs/addendum-17/green/codex-subscription-focused.green.log`
- `evidence/logs/addendum-17/green/codex-subscription-focused.rerun.green.log`

Typecheck and package-level tests:

- `evidence/logs/addendum-17/green/runtime-host-bridge-tsc.initial.log`
- `evidence/logs/addendum-17/green/runtime-observability-test.green.log`

Runtime critical validation:

- `evidence/logs/addendum-17/green/runtime-test-critical.green.log`
- `evidence/logs/addendum-17/green/runtime-test-critical.rerun.green.log`

Vendor validation:

- `evidence/logs/addendum-17/green/runtime-validate-vendors.green.log`
- `evidence/logs/addendum-17/green/runtime-validate-vendors.after-diagnostics-fix.green.log`
- `evidence/logs/addendum-17/green/runtime-validate-vendors.after-diagnostics-fix.rerun.green.log`

The final canonical rerun ends with:

```text
EXIT_CODE=0
```

Runtime packaging:

- `evidence/logs/addendum-17/green/runtime-package-sea.green.log`
- `evidence/logs/addendum-17/green/runtime-package-sea.rerun.green.log`
- `evidence/logs/addendum-17/green/runtime-package-sea.after-diagnostics-fix.green.log`

Packaged runtime SHA256 after the diagnostics fix:

- `d4216cff50589fbe83e8f7f19dfbcbf7cd2a2d19a6d0e8632b568781eea61285`

## Known Harness Notes

- An early post-fix vendor-validation and packaging command wrote logs under `role-model-router/.recursive/...` because it ran from the package subdirectory. The relevant logs were copied into the canonical run evidence path and the duplicate nested run-62 evidence folder was removed.
- Headless Craft initially collided with an already running Craft app instance. The normal Craft app was stopped for isolated headless verification; final headless Craft verification passed and no Craft headless process remained.

## Requirement Completion Status

- R0 | Status: verified | Verification Evidence: targeted RED/GREEN and request-detail regression tests. | Addendum: addendum-17.
- R1 | Status: verified | Verification Evidence: `codex-subscription-focused.rerun.green.log` and `runtime-host-bridge-tsc.initial.log`. | Addendum: addendum-17.
- R2 | Status: verified | Verification Evidence: no Pi/Craft source diff was introduced for this addendum; live client verification is in Phase 5. | Addendum: addendum-17.
- R3 | Status: verified | Verification Evidence: request-detail and telemetry snapshots preserve provider/vendor/adapter separation. | Addendum: addendum-17.
- R4 | Status: verified | Verification Evidence: Codex Subscription execution uses `codex-subscription-responses`; no Codex app-server path was added. | Addendum: addendum-17.
- R8 | Status: verified | Verification Evidence: `receipt-request-detail-summary-after-fix.json`. | Addendum: addendum-17.
- R10 | Status: verified | Verification Evidence: packaged runtime and live verification are recorded in Phase 5. | Addendum: addendum-17.
- R11 | Status: verified | Verification Evidence: final vendor-validation rerun exit code `0`. | Addendum: addendum-17.
- R12 | Status: verified | Verification Evidence: addendum-17 implementation, test, and QA artifacts record the final state. | Addendum: addendum-17.

## Coverage Gate

- [x] RED tests failed for the expected pre-fix behavior.
- [x] GREEN tests pass after the implementation.
- [x] TypeScript typecheck passes.
- [x] Runtime critical tests pass.
- [x] Vendor validation passes with exit code `0`.
- [x] Packaged runtime was rebuilt after the diagnostics fix.
- [x] Live client verification is covered by the Phase 5 QA addendum.

Coverage: PASS

## Approval Gate

- [x] Automated verification covers the addendum-17 acceptance criteria.
- [x] Evidence paths are in the canonical worktree run folder.
- [x] Known harness issues are documented and not product failures.

Approval: PASS
