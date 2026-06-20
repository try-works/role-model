Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `02`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-02.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-02.md`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-01.md`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
Scope note: This addendum records the bounded restart-health repair for canonical runtime ids whose provider `/models` payload omits the provider prefix.

## Changes Applied

- Added comparable-id normalization in `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`.
  - the probe now compares both the canonical runtime id and its provider-facing unprefixed form
  - this aligns the remote-health probe with `/role-model-router/packages/provider-openai/src/index.ts`, which already strips the provider prefix before sending request-body `model`
- Added a focused unit regression in `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`.
  - canonical runtime id `deepseek/deepseek-v4-flash`
  - provider `/models` id `deepseek-v4-flash`
  - expected result: `healthy`
- Added a restart integration regression in `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`.
  - persists a remote-only runtime config
  - restarts the backend
  - proves the restarted endpoint stays `healthy` when provider `/models` returns the unprefixed id

## TDD Compliance

RED:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run src/remote-health-probe.test.ts`
  - failed on the new `accepts unprefixed provider model ids for canonical runtime model ids` assertion with `reason: "model-not-found"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/restart-rehydration.test.ts -t "keeps restarted remote endpoints healthy when provider /models returns unprefixed ids"`
  - failed before the fix once the restart harness was wired to a persisted non-`decision_only` runtime config

GREEN:
- same two commands now pass after the probe normalization change

## Verification

Focused validation:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run src/remote-health-probe.test.ts test/restart-rehydration.test.ts test/remote-health-bootstrap.test.ts test/session-bootstrap-health.test.ts test/routable-inventory-bootstrap.test.ts`
  - result: PASS (`21` tests)
- `corepack pnpm --filter @role-model-router/runtime-ui build`
  - result: PASS
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - result: PASS

Live runtime verification after restart on `http://127.0.0.1:3461`:
- `remote-health` bootstrap results now report:
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-flash` -> `healthy`
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro` -> `healthy`
  - `openai.personal.openai-codex-subscription.global.gpt-5.4` -> `healthy`
- `GET /api/role-model/endpoints` now emits both DeepSeek endpoints as `healthy`
- the remaining degraded endpoint is `moonshot.personal.kimi-code.global.kimi-k2.7-code`
  - live provider `/models` returned only `kimi-for-coding`
  - that is a separate provider/model-contract mismatch, not the prefixed-id false negative fixed here

Browser verification note:
- attempted to bootstrap the in-app browser skill for a readback pass after rebuild
- the browser plugin failed before tab setup with `failed to write kernel assets`
- runtime API receipts were used as the authoritative rebuilt-runtime verification for this bounded backend repair

## Requirement Status

- restart-time false degraded emission for canonical-vs-unprefixed provider ids: `implemented`
- targeted regression coverage for probe and restart paths: `implemented`
- live rebuilt-runtime confirmation on port `3461`: `implemented`
- Moonshot provider/model mismatch: `not changed by this addendum`

Coverage: PASS
Approval: PASS
