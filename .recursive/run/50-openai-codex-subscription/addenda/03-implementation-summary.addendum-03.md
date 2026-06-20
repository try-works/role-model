Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `03`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-04.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-04.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-03.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
Scope note: This addendum records the provider-wide OpenAI Codex Subscription `5.3+` model-matrix implementation that replaces the legacy GPT-5.4-centric allowlist.

## Changes Applied

- Replaced the flat `OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS` constant in `/role-model-router/apps/runtime-host-bridge/src/index.ts` with an exported structured matrix:
  - `OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX`
  - `OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS`
- The matrix now supports only the OpenAI `5.3+` family for this run:
  - `chatgpt/gpt-5.5`
  - `chatgpt/gpt-5.5-pro`
  - `chatgpt/gpt-5.4`
  - `chatgpt/gpt-5.4-mini`
  - `chatgpt/gpt-5.4-nano`
  - `chatgpt/gpt-5.4-pro`
  - `chatgpt/gpt-5.3-codex`
  - `chatgpt/gpt-5.3-codex-spark`
  - `chatgpt/gpt-5.3-chat-latest`
- The matrix encodes lifecycle posture for each row:
  - `supported`
  - `preview`
  - `deprecated`
- Added OpenAI-subscription model guards:
  - device authorization rejects pre-`5.3` Codex Subscription model ids
  - `upsertProviderAccount(...)` rejects unsupported Codex Subscription model ids
  - endpoint activation rejects unsupported Codex Subscription model ids even if a stale account record exists

## TDD Compliance

RED:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts`
  - initially failed because:
    - the new matrix export did not exist
    - `listProviders()` still returned the legacy `5.1` / `5.2` plus `gpt-5.3-instant` allowlist
    - `startProviderDeviceAuthorization(...)` accepted `chatgpt/gpt-5.2-codex`

GREEN:
- the same targeted command now passes after the matrix and guard implementation

## Verification

Focused automated verification:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts`
  - result: PASS
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/provider-overlap-metadata.test.ts test/account-repair.test.ts test/restart-rehydration.test.ts`
  - result: PASS
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - result: PASS

Matrix coverage now asserted in `test/openai-codex-subscription-matrix.test.ts`:
- exact supported OpenAI `5.3+` inventory
- exclusion of legacy `5.1` / `5.2` rows and undocumented `gpt-5.3-instant`
- lifecycle posture for `gpt-5.3-chat-latest` and `gpt-5.3-codex-spark`
- provider-surface exposure through `listProviders()`
- request-surface acceptance for hosted `web_search` and function-tool requests for every supported model id

Rebuilt-runtime verification:
- rebuilt `@role-model-router/runtime-host-bridge` with `pnpm build`
- attempted to launch the built `dist/cli-entry.js`
  - observed existing repo packaging gap: the dist entrypoint still depends on unbuilt workspace package artifacts such as `packages/profile-aggregator/src/benchmark-routing-quality.js`
  - this matches the pre-existing executable packaging gap already observed elsewhere in the repo
- relaunched the updated runtime from `src/cli-entry.ts` via `tsx` on `http://127.0.0.1:3461`
- live API spot-check on `GET /api/role-model/providers`
  - result: PASS
  - observed `OpenAI` provider with `API Key` and `Codex Subscription`
  - observed `Codex Subscription` model ids:
    - `chatgpt/gpt-5.5`
    - `chatgpt/gpt-5.5-pro`
    - `chatgpt/gpt-5.4`
    - `chatgpt/gpt-5.4-mini`
    - `chatgpt/gpt-5.4-nano`
    - `chatgpt/gpt-5.4-pro`
    - `chatgpt/gpt-5.3-codex`
    - `chatgpt/gpt-5.3-codex-spark`
    - `chatgpt/gpt-5.3-chat-latest`
- Playwright opened `http://127.0.0.1:3461/app/providers`
  - result: PASS
  - screenshot captured after relaunch against the updated code path

## Requirement Status

- provider-wide OpenAI Codex Subscription support for documented `5.3+` rows: `implemented`
- exclusion of legacy pre-`5.3` Codex Subscription rows: `implemented`
- single-source OpenAI subscription model matrix: `implemented`
- automated regression matrix covering all supported rows: `implemented`
- rebuilt-runtime browser verification on the relaunched runtime surface: `implemented`
- standalone packaged dist runtime without wider workspace dist artifacts: `not fixed in this addendum`
