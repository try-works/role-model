Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 To-Be Plan`
Addendum: `10`
Status: `LOCKED`
LockedAt: `2026-07-08T23:51:27Z`
LockHash: `1d299a71b54c32646d77a561ba0484d50f69f67b50fff6248cb486a687088e60`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.pi-cooldown-retry.addendum-10.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.pi-cooldown-retry.addendum-10.md`
Scope note: This plan fixes the retry-inducing HTTP status for deterministic cooldown denial and verifies the rebuilt runtime through real Pi CLI and Craft client traffic.

# Addendum 10 Remediation Plan

## TODO

- [x] Define the minimal shared-runtime behavior change.
- [x] Require a failing test before production code changes.
- [x] Require rebuilt runtime packaging before live verification.
- [x] Require real Pi CLI requests to aliases and exact model ids.
- [x] Require Craft client requests to alias and exact model ids.
- [x] Require process-isolation evidence so verification helpers do not disturb the runtime.

## Target Behavior

When all eligible endpoints for a requested model are denied pre-execution by recorded cooldown receipts, Role-Model must return HTTP `400` with `error.code: no_eligible_target`. The response remains structured and diagnostic, but it is no longer classified as a retryable server-side `503`.

This applies to exact model requests such as `chatgpt/gpt-5.4`. Alias routing such as `difficulty.remote-only` should continue to select another eligible endpoint, for example DeepSeek, when GPT is cooling down and another alias member remains eligible.

## TDD Plan

1. Add a RED regression in `role-model-router/apps/runtime-host-bridge/test/index.test.ts` that induces Codex timeout/cooldown, then calls `/v1/chat/completions` through the bridge HTTP server with exact model `chatgpt/gpt-5.4`.
2. Assert the HTTP response is `400`, the body is `routing_error/no_eligible_target`, and the body includes denied endpoint ids plus active execution cooldown receipts.
3. Assert no additional provider execution attempt is made during pre-execution denial.
4. Assert telemetry records `statusCode: 400` and `errorClass: no_eligible_target`.
5. Assert request-detail keeps execution cooldown context for diagnosis.
6. Only after RED, change production status classification in `throwUnavailableExecutionTarget()`.
7. Run the targeted GREEN test, format check, full `runtime-host-bridge` index suite, and `runtime:test-critical`.

## Implementation Plan

- Change only the generic runtime-host bridge error classification for `no_eligible_target`.
- Preserve the existing diagnostic payload, denied endpoint ids, and cooldown receipts.
- Do not add Pi-specific request handling.
- Do not add Craft-specific request handling.
- Do not classify LiteLLM as a provider. Provider identity remains `openai`, `deepseek`, etc.; LiteLLM remains a vendor/execution path.
- Do not synthesize provider thinking or progress deltas.

## Rebuilt Runtime Verification Plan

1. Rebuild/package the runtime from the run-62 worktree.
2. Stop only the previous Role-Model runtime listener on `127.0.0.1:3456`.
3. Launch the rebuilt runtime binary on `127.0.0.1:3456` from the worktree.
4. Capture health, endpoint, model, process, port, and executable hash evidence.
5. Inject a short verification-only cooldown receipt for the GPT endpoint in the local runtime SQLite state.
6. Verify direct runtime behavior:
   - exact `chatgpt/gpt-5.4` returns HTTP `400` quickly with `no_eligible_target`
   - alias `difficulty.remote-only` succeeds by routing to an eligible endpoint
7. Verify real Pi CLI behavior:
   - `difficulty.remote-only` succeeds
   - `baseline.remote-only` succeeds
   - exact `deepseek/deepseek-v4-pro` succeeds
   - exact `chatgpt/gpt-5.4` during cooldown fails fast with HTTP `400`, not timeout
   - tool-enabled `difficulty.remote-only` smoke succeeds
8. Verify Craft client behavior:
   - alias `difficulty.remote-only` succeeds
   - exact `deepseek/deepseek-v4-pro` succeeds
   - exact `chatgpt/gpt-5.4` during cooldown surfaces a non-timeout failure and telemetry proves runtime `400/no_eligible_target`
9. Restore cooldown state.
10. Verify exact `chatgpt/gpt-5.4` succeeds after restore through direct runtime, Pi CLI, and Craft client.
11. Clean up isolated verification helpers and record remaining process state.

## Local CI Plan

- Run `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`.
- Run `corepack pnpm run runtime:test-critical`.
- Run `corepack pnpm run ci:check` before commit readiness unless an unrelated pre-existing blocker is discovered and recorded with evidence.

## Requirement Mapping

- `R0`: provider/vendor and execution-path taxonomy remains correct.
- `R2`: downstream clients are validated without patches.
- `R6`: cooldown denial is deterministic and non-retryable.
- `R8`: request-detail and telemetry remain sufficient to explain the outcome.

## Coverage Gate

- [x] Plan covers RED/GREEN TDD.
- [x] Plan covers rebuilt runtime verification.
- [x] Plan covers real Pi CLI and Craft client requests.
- [x] Plan uses runtime-defined aliases, not invented aliases.

Coverage: PASS

## Approval Gate

- [x] The implementation surface is minimal and shared.
- [x] The verification surface matches the user-reported failure mode.
- [x] The plan preserves provider/vendor taxonomy.

Approval: PASS
