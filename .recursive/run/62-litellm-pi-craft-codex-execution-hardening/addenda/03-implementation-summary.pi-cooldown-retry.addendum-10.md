Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `10`
Status: `LOCKED`
LockedAt: `2026-07-08T23:51:27Z`
LockHash: `d4300e518f6694c1e8e5d3ea5c35055e0239f3360bad6f52d6f3e0390d7661b2`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/red/cooldown-no-eligible-http-status.red.log`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.pi-cooldown-retry.addendum-10.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Scope note: This addendum records the minimal runtime-host bridge implementation required to stop retry-induced Pi timeouts for deterministic cooldown denial.

# Addendum 10 Implementation Summary

## TODO

- [x] Preserve RED evidence before changing production code.
- [x] Add a regression that exercises the HTTP bridge path, not only internal function calls.
- [x] Change shared runtime-host bridge status classification.
- [x] Preserve diagnostic cooldown receipts.
- [x] Avoid Pi-specific, Craft-specific, and LiteLLM-provider special cases.

## Implemented Changes

- `role-model-router/apps/runtime-host-bridge/test/index.test.ts` now extends the Codex timeout/cooldown regression to start a bridge HTTP server and call `/v1/chat/completions` for exact model `chatgpt/gpt-5.4` while the endpoint is cooled down.
- The regression asserts HTTP `400`, structured `routing_error/no_eligible_target`, denied endpoint ids, active execution cooldown receipts, no extra provider execution attempt, telemetry `statusCode: 400`, and request-detail cooldown context.
- `role-model-router/apps/runtime-host-bridge/src/index.ts` now always throws `BridgeHttpError(400, ...)` for `throwUnavailableExecutionTarget()` instead of returning `503` when cooldown is active.

The implementation intentionally keeps the existing error body. Only the HTTP status classification changes.

## TDD Compliance

- RED: `evidence/logs/addendum-10/red/cooldown-no-eligible-http-status.red.log`
- RED failure: expected `400`, actual `503`
- GREEN: `evidence/logs/addendum-10/green/cooldown-no-eligible-http-status.green.log`
- Post-format GREEN: `evidence/logs/addendum-10/green/cooldown-no-eligible-http-status.post-format.green.log`
- Formatting GREEN: `evidence/logs/addendum-10/green/biome-check.green.log`

TDD Compliance: PASS

## Requirement Mapping

- `R0`: no provider/vendor taxonomy change; LiteLLM remains an execution vendor/path.
- `R2`: Pi and Craft compatibility is achieved through runtime behavior.
- `R6`: deterministic cooldown denial is non-retryable by clients that retry `503`.
- `R8`: telemetry and request-detail preserve the evidence needed to debug cooldown denial.

## Risk Review

- Exact GPT requests during active cooldown now fail fast with `400`. This is intentional because there is no eligible target for that exact model at that moment.
- Alias requests can still succeed when another eligible alias target exists.
- GPT responses through Codex Subscription may still emit no intermediate thinking/progress deltas; the runtime does not fabricate missing provider events.

## Coverage Gate

- [x] Implementation is covered by a failing test written before production code.
- [x] The changed behavior is generic runtime-host bridge behavior.
- [x] Diagnostic payloads and cooldown receipts are preserved.

Coverage: PASS

## Approval Gate

- [x] The implementation matches the addendum-10 plan.
- [x] The change is minimal and avoids client/vendor special cases.
- [x] Known residual UX behavior is documented separately from the fixed timeout classification.

Approval: PASS
