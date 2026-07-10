Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `15`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:53Z`
LockHash: `5af67c898520bd0f5e35be0472bccdcc955ea0b1bc3b5dca3453e17331a147bb`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-assistant-history-content-parts.addendum-15.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.codex-assistant-history-content-parts.addendum-15.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.codex-assistant-history-content-parts.addendum-15.md`
Scope note: Records RED/GREEN, focused regression, typecheck, format, and package evidence for addendum 15.

# Addendum 15 Test Summary: Codex Assistant History Content Parts

## TODO

- [x] Record RED evidence for assistant history emitted as invalid `input_text`.
- [x] Record GREEN evidence after role-aware conversion.
- [x] Record focused regression, typecheck, formatting, and package verification.

## RED

- Command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription request conversion preserves assistant history as output_text"`
- Evidence: `evidence/logs/addendum-15/red/codex-assistant-history-output-text.red.log`
- Result: failed as expected because assistant history was emitted as `input_text`.

## GREEN

- Command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription request conversion preserves assistant history as output_text"`
- Evidence: `evidence/logs/addendum-15/green/codex-assistant-history-output-text.green.log`
- Result: passed.

## Focused Regression

- Command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "Codex Subscription"`
- Evidence: `evidence/logs/addendum-15/green/codex-subscription-focused.after-format.green.log`
- Result: 4 passed, 178 skipped.

## Typecheck

- Command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc --noEmit --pretty false`
- Evidence: `evidence/logs/addendum-15/green/runtime-host-bridge-tsc.after-format.green.log`
- Result: passed with no output.

## Formatting

- Command: `corepack pnpm exec biome check --write ...`
- Evidence: `evidence/logs/addendum-15/green/biome-check-write.log`
- Result: passed; one touched TypeScript file was formatted.

## Runtime Package

- Command: `corepack pnpm run runtime:package-sea`
- Evidence: `evidence/logs/addendum-15/rebuilt-runtime/runtime-package-sea.log`
- Result: passed.
- Packaged SHA-256: `9c657f19dfd521023a277d62a29e884e5bf273f16c3e27a0bff8c303ac74029e`

## Coverage Gate

- [x] RED and GREEN evidence are recorded.
- [x] Focused Codex regression passed.
- [x] Runtime host bridge typecheck passed.
- [x] Runtime package rebuild passed.

Coverage: PASS

## Approval Gate

- [x] Test evidence supports the implementation summary.
- [x] Verification is specific to the Pi-reproduced assistant-history failure.
- [x] Ready for rebuilt-runtime manual QA.

Approval: PASS

Audit: PASS
