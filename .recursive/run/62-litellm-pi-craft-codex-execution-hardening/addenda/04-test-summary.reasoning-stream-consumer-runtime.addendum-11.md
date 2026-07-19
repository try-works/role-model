Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `11`
Status: `LOCKED`
LockedAt: `2026-07-10T04:26:55Z`
LockHash: `5dabc24fa6671cf243cbda57cfcefc63ee9d92e7b58d0fb8cbd9bc67a38fe188`
Workflow version: `recursive-mode-audit-v1`
Lock note: `scripts/recursive-lock.py` is not present in this worktree; audit, coverage, and approval gates are included and pass, but formal lock metadata was not applied.
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.reasoning-stream-consumer-runtime.addendum-11.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.reasoning-stream-consumer-runtime.addendum-11.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03.5-code-review.reasoning-stream-consumer-runtime.addendum-11.md`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.reasoning-stream-consumer-runtime.addendum-11.md`
Scope note: Records RED/GREEN, CI, packaging, and risk evidence for addendum 11.

# Addendum 11 Test Summary

## TODO

- [x] Record RED evidence for reasoning stream gaps.
- [x] Record focused and broad GREEN evidence.
- [x] Record packaging verification and remaining risks.

## RED Evidence

- `evidence/logs/addendum-11/red/provider-openai-chat-reasoning.red.log`
- `evidence/logs/addendum-11/red/host-bridge-chat-reasoning-stream.red.log`
- `evidence/logs/addendum-11/red/runtime-observability-reasoning-receipt.red.log`

RED failures reproduced the planned gaps: chat-completions reasoning controls were not forwarded, reasoning stream chunks were not preserved/emitted in the expected opted-in path, and observability lacked the requested reasoning stream receipt shape.

## Focused GREEN Evidence

- `evidence/logs/addendum-11/green/provider-openai-chat-reasoning.green.log`
- `evidence/logs/addendum-11/green/host-bridge-chat-reasoning-stream.green.log`
- `evidence/logs/addendum-11/green/runtime-observability-reasoning-receipt.green.log`
- `evidence/logs/addendum-11/green/host-bridge-after-reasoning-receipt.green.log`
- `evidence/logs/addendum-11/green/validate-vendors-test.green.log`

Focused verification passed after implementation. The host-bridge focused rerun included 195 tests in `test/index.test.ts`.

## Broad GREEN Evidence

- `evidence/logs/addendum-11/green/biome-touched.green.log`
- `evidence/logs/addendum-11/green/biome-touched.post-type.green.log`
- `evidence/logs/addendum-11/green/runtime-host-bridge-build.after-plan-type.log`
- `evidence/logs/addendum-11/green/runtime-validate-vendors.green.log`
- `evidence/logs/addendum-11/green/runtime-test-critical.green.log`
- `evidence/logs/addendum-11/green/runtime-validate-packaging.green.log`
- `evidence/logs/addendum-11/green/ci-check.rerun.log`

`corepack pnpm run ci:check` passed on rerun.

- Summary: `evidence/logs/addendum-11/green/ci-check.rerun.summary.json`
- Exit code: `0`
- Duration: `376437 ms`

The first `ci:check` attempt failed because isolated Craft temp profile directories were inside the worktree and Biome tried to format generated app files. Those temp directories were removed, then `ci:check` passed without product-code changes for that failure.

## Packaging Verification

Runtime packaging passed:

- Log: `evidence/logs/addendum-11/green/runtime-validate-packaging.green.log`
- Packaged executable: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA-256: `d0e909f887309e69b64fc5a4cafc4e6796f0f9d1cb88a5b0c71de4c0fe93c15c`

Packaging initially detected a stale runtime process holding the executable. The stale process was stopped before packaging was rerun. The live runtime was relaunched from the rebuilt executable afterward.

## Local CI Coverage

The local CI run covered:

- Repository formatting/lint checks.
- Rust format/lint/test paths.
- Schema validation and generated protocol types.
- Docs build.
- Runtime UI build and tests.
- Runtime host bridge build and tests.
- Runtime critical test suite.
- Runtime UI validation.
- Runtime observability validation.
- Gateway smoke test.

Runtime host bridge full suite evidence in the CI tail:

- `55` runtime-host-bridge test files passed.
- `507` runtime-host-bridge tests passed.
- `test/index.test.ts` included the addendum 11 stream-regression coverage.

## Test Risks

- GPT/Codex Subscription did not return reasoning deltas in live verification, so tests prove the runtime records absence and does not suppress normal content. They do not prove GPT can emit reasoning on this execution path.
- Craft headless verification did not send reasoning controls on the observed path, so the runtime-side Craft proof is final-content routing plus provider delta observation, not Craft UI rendering of thinking.
- Generated or binary artifacts outside the addendum 11 source delta remain visible in the worktree due prior run/package activity. This test receipt covers addendum 11 owned changes and verification.

## Coverage Gate

- [x] RED tests were recorded before production changes.
- [x] Focused GREEN tests passed.
- [x] Broad CI passed.
- [x] Runtime packaging passed.
- [x] Canonical alias tests and live verification use runtime-defined aliases.

Coverage: PASS

## Approval Gate

- [x] Test evidence supports the implementation summary.
- [x] Failing intermediate attempts are explained and distinguished from valid verification.
- [x] Remaining provider/client limitations are explicitly documented.

Approval: PASS
