Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `05`
Status: `LOCKED`
LockedAt: `2026-07-08T12:47:03Z`
LockHash: `f2b32a87fd16e09a79e351fece5f818ba3144cb92aeeb1bbc16e68112dd4b075`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-05.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-05/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/summary.json`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-05.md`
Scope note: This addendum records the code changes and local verification for the cooldown-provenance and reasoning-first stream defects reopened by addendum 05.

## TODO

- [x] Preserve failed attempts and cooldown receipts through canonical observability
- [x] Surface active cooldowns on operator-facing request and endpoint reads
- [x] Normalize reasoning-first streams so the first forwarded chunk is downstream-safe
- [x] Verify the new behavior in focused suites, the broader floor, and rebuilt-runtime alias traffic

## Scope

This addendum records the implementation for the live defects that remained after the provider/vendor correction:

- retryable upstream failures now leave durable failed-attempt and cooldown receipts
- pre-execution cooldown denials now surface operator-visible cooldown truth
- reasoning-first provider streams no longer forward reasoning-only SSE chunks before a downstream-safe chunk exists

## TDD Evidence

RED:
- `evidence/logs/addendum-05/sp62-p-cooldown-receipts.red.log`
- `evidence/logs/addendum-05/sp62-p-sqlite.red.log`
- `evidence/logs/addendum-05/sp62-pqrs-host-bridge.red.log`

GREEN:
- `evidence/logs/addendum-05/sp62-p-cooldown-receipts.green.log`
- `evidence/logs/addendum-05/sp62-p-sqlite.green.log`
- `evidence/logs/addendum-05/phase4-host-bridge-floor.green.log`
- `evidence/logs/addendum-05/sp62-r-stream-normalization.green.log`
- `evidence/logs/addendum-05/sp62-s-rebuilt-proof.green.log`
- `evidence/logs/addendum-05/runtime-validate-vendors.green.log`
- `evidence/logs/addendum-05/runtime-validate-observability.green.log`
- `evidence/logs/addendum-05/runtime-test-critical.green.log`
- `evidence/logs/addendum-05/runtime-validate-packaging.green.log`

TDD Compliance: PASS

## Implemented Changes

- `role-model-router/packages/runtime-observability/src/index.ts`
  - added durable `executionSemantics.failedAttempts`
  - added durable `executionSemantics.executionCooldowns`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - enriched `UpstreamExecutionError` with provider, vendor, execution, adapter, phase, and safe error preview facts
  - preserved every routed failed attempt before retry or reroute
  - persisted cooldown provenance into maintenance state and surfaced additive cooldown data on `/api/role-model/endpoints`
  - surfaced cooldown diagnostics through `runtimeTelemetryDimensionsFor` and request-detail fallback reconstruction
  - suppressed reasoning-only chat-completions chunks in both live stream capture and replay
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - added failing then green coverage for rerouted failed-attempt receipts
  - added failing then green coverage for exact-model cooldown denial diagnostics
  - added failing then green coverage for reasoning-only stream suppression

## Behavior Now Guaranteed

- a retryable or fallback-eligible upstream failure is preserved even when a later endpoint succeeds
- `no_eligible_target` denials caused by active cooldowns expose denied endpoint ids and cooldown metadata
- endpoint health can remain `healthy` while `executionCooldown.active = true`, and that is surfaced explicitly
- reasoning-only provider deltas are retained in raw transcripts but are not forwarded downstream as the first visible stream chunk

## Local Verification Highlights

- failed-attempt persistence
  - `runtime-host-bridge > retries transient API timeouts once and falls back to a secondary endpoint after quota exhaustion`
  - observation now preserves both the timeout attempt and the later quota-triggered cooldown attempt
- cooldown diagnosability
  - `runtime-host-bridge > preserves the original Codex timeout when exact-model fallback exhausts all eligible endpoints`
  - request-detail fallback exposes `executionCooldowns`
  - endpoint listing exposes `executionCooldown`
- stream normalization
  - `runtime-host-bridge > suppresses reasoning-only upstream SSE chunks until downstream-safe content is available`
  - live `difficulty.remote-only` Pi/Craft stream cases on `:3456` now start without reasoning-only first chunks

## Live Rebuilt-Runtime Evidence

- `live-3456/q-d3-pi-alias-stream-text`
  - selected provider: `deepseek`
  - first streamed chunk was not reasoning-only
- `live-3456/q-d4-craft-alias-stream-text`
  - selected provider: `deepseek`
  - first streamed chunk was not reasoning-only
- `live-3456/q-d1-direct-exact-gpt`
  - selected provider: `openai`
  - status: `200`
  - `cooldowns: []`

Live limitation:

- the clean `:3456` runtime did not have an active Codex cooldown during the final proof, so `Q-D2` was not reproduced against that live state
- the cooldown denial path is still verified deterministically by the focused host-bridge suite and persisted request-detail receipts

## Requirement Delta

- `R6` | Status: `verified locally` | failed-attempt and cooldown receipts are preserved and surfaced
- `R8` | Status: `verified locally` | canonical request-detail and telemetry surfaces expose cooldown truth
- `R9` | Status: `verified locally` | deterministic corpus now covers cooldown and stream regression cases
- `R10` | Status: `verified locally` | rebuilt-runtime Pi/Craft alias proof covers live streamed alias behavior
- `R11` | Status: `pending external CI` | local validation floor, packaged validation, and rebuilt-runtime proof are green; GitHub CI remains outside this turn

## Coverage Gate

- [x] Failed attempts are preserved even when the final request reroutes successfully
- [x] Cooldown truth is surfaced on canonical endpoint and request-detail paths
- [x] Stream suppression covers both live capture and replay
- [x] Rebuilt-runtime Pi/Craft alias proof covers streamed text behavior

Coverage: PASS

## Approval Gate

- [x] The implementation matches the locked addendum-05 plan
- [x] Focused RED-to-GREEN evidence exists for cooldown and stream behavior
- [x] Broader validation remained green after the changes
- [x] The live runtime limitation on `Q-D2` is called out explicitly instead of hidden

Approval: PASS

## Audit Verdict

Audit: PASS
