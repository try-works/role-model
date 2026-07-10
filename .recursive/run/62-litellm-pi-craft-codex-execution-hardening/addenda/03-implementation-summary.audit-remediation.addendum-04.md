Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `03 Implementation`
Addendum: `04`
Status: `LOCKED`
LockedAt: `2026-07-08T12:47:03Z`
LockHash: `544c15dd761ca3044470010ab902a6612e09a6845b50f25c52522c396a5fd9d1`
Workflow version: `recursive-mode-audit-v1`
TDD Mode: `strict`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-04.md` (LOCKED)
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-04/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-05/phase4-host-bridge-floor.green.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/addendum-05-cooldown-stream-rebuilt/live-3456/summary.json`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-04.md`
Scope note: This addendum records the implemented provider/vendor/adapter remediation from addendum 04 and the local proof that the corrected identity contract now holds across adapter, persistence, validator, UI, and rebuilt-runtime alias surfaces.

## TODO

- [x] Preserve provider truth independently from vendor and adapter truth
- [x] Update runtime persistence and request-detail surfaces
- [x] Update validator and Pi harness expectations
- [x] Verify the corrected contract locally and on rebuilt-runtime alias requests

## Scope

This addendum records the implemented provider or vendor or execution or adapter split required by addendum 04. It supersedes earlier draft receipts that still treated adapter labels such as `litellm-proxy` or `ai-sdk-openai` as provider truth.

## TDD Evidence

RED:
- `evidence/logs/addendum-04/sp62-l-provider-vendor-contract.red.log`
- `evidence/logs/addendum-04/sp62-m-telemetry-ui-migration.red.log`
- `evidence/logs/addendum-04/sp62-n-validator-pi-docs.red.log`
- `evidence/logs/addendum-04/sp62-o-live-provider-vendor-proof.red.log`

GREEN:
- `evidence/logs/addendum-04/sp62-l-provider-vendor-contract.green.log`
- `evidence/logs/addendum-04/sp62-m-telemetry-ui-migration.green.log`
- `evidence/logs/addendum-04/sp62-n-validator-pi-docs.green.log`
- `evidence/logs/addendum-05/phase4-host-bridge-floor.green.log`
- `evidence/logs/addendum-05/sp62-s-rebuilt-proof.green.log`

TDD Compliance: PASS

## Implemented Changes

- `role-model-router/packages/adapter-execution/src/index.ts`
  - response capture `providerFamily` now derives from actual provider semantics instead of adapter family
- `role-model-router/packages/provider-openai/src/index.ts`
  - normalized provider responses preserve actual provider identity while keeping adapter semantics separate
- `role-model-router/packages/runtime-observability/src/index.ts`
  - execution telemetry keeps `providerFamily` provider-true and carries `vendorId` separately
- `role-model-router/packages/sqlite-memory/src/index.ts`
  - telemetry rows persist and replay `vendor_id` independently from `provider_family`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - request-detail fallback, telemetry synthesis, and endpoint inspection surfaces no longer classify LiteLLM or AI SDK adapters as providers
- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
  - removed legacy fallback behavior that inferred vendor identity from provider-family text
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - deterministic corpus receipts now assert provider, vendor, execution, and adapter fields independently
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - request and telemetry models accept separate `vendorId`, `executionFamily`, and `adapterFamily` facts
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - provider labels now prefer `providerId` and avoid adapter-family presentation bugs
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - request detail renders provider, vendor, execution, and adapter as separate facts
- `scripts/validate-agent-path.ts`
  - rebuilt-runtime Pi/Craft proof emits separated identity facts per request
- `packages/pi-role-model/test/validate-agent-path.test.ts`
  - canonical alias assertions require separated provider and vendor truth
- `docs/architecture/13-litellm-pi-role-model-integration-proposal.md`
  - LiteLLM is documented as a vendor or execution intermediary
- `docs/architecture/14-routed-execution-semantics-and-receipts.md`
  - receipt contract documents separated provider, vendor, execution, and adapter identity

## Implemented Contract

- LiteLLM-backed remote selection
  - `providerFamily = openai` or `deepseek`
  - `vendorId = litellm` when LiteLLM is the execution intermediary
  - `executionFamily = vendor-litellm`
  - `adapterFamily = litellm-proxy`
- Native Codex Subscription selection
  - `providerFamily = openai`
  - `vendorId = codex-app-server`
  - `executionFamily = remote-service`
  - `adapterFamily = ai-sdk-openai`
- Direct OpenAI-compatible remote selection
  - `providerFamily = deepseek`
  - `vendorId = null`
  - `executionFamily = remote-service`
  - `adapterFamily = ai-sdk-openai-compatible`

Rejected semantics:

- `providerFamily = litellm-proxy`
- `providerFamily = ai-sdk-openai`
- `providerFamily = ai-sdk-openai-compatible`

## Verification Highlights

Focused suites:

- `corepack pnpm --filter @role-model-router/adapter-execution exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/lib/view-models.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/validate-vendors.test.ts test/openai-codex-subscription-matrix.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/validate-agent-path.test.ts`

Broader floor:

- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:test-critical`
- `corepack pnpm run runtime:validate-packaging`

Live rebuilt-runtime proof:

- `live-3456/q-d3-pi-alias-stream-text`
  - provider: `deepseek`
  - vendor: `null`
  - execution: `remote-service`
  - adapter: `ai-sdk-openai-compatible`
- `live-3456/q-d4-craft-alias-stream-text`
  - provider: `deepseek`
  - vendor: `null`
  - execution: `remote-service`
  - adapter: `ai-sdk-openai-compatible`
- `live-3456/q-c3-pi-alias-inline-image`
  - provider: `openai`
  - vendor: `codex-app-server`
  - execution: `remote-service`
  - adapter: `ai-sdk-openai`
- `live-3456/q-c4-craft-alias-inline-image`
  - provider: `openai`
  - vendor: `codex-app-server`
  - execution: `remote-service`
  - adapter: `ai-sdk-openai`

Supplemental diagnostic:

- `live-3456/q-c3-pi-alias-tools`
  - still selected DeepSeek on this runtime because the active DeepSeek endpoint remained tool-capable
  - this did not block addendum-04 acceptance because `Q-C3` allows tool-bearing or image-bearing proof, and the Pi image-bearing alias case exercised the required OpenAI Codex path

## Requirement Delta

- `R3` | Status: `verified locally` | LiteLLM is represented as a vendor, not a provider
- `R4` | Status: `verified locally` | Codex-native OpenAI execution remains provider-true while surfacing adapter identity separately
- `R8` | Status: `verified locally` | telemetry and request-detail now expose truthful separated identity fields
- `R9` | Status: `verified locally` | deterministic validator corpus and Pi harness assert the corrected contract
- `R10` | Status: `verified locally` | rebuilt-runtime alias proof uses canonical aliases and separated identity facts
- `R11` | Status: `pending external CI` | local validation floor and rebuilt-runtime proof are green, but GitHub-hosted merge-time CI is outside this turn

## Coverage Gate

- [x] Provider identity is no longer conflated with LiteLLM or AI SDK adapter labels
- [x] Vendor, execution, and adapter facts are persisted separately
- [x] Runtime UI and request-detail surfaces render the separated facts
- [x] Pi/Craft alias proof uses canonical runtime aliases and records the corrected fields

Coverage: PASS

## Approval Gate

- [x] The implementation matches the locked addendum-04 contract
- [x] RED-to-GREEN evidence exists for the corrected semantic surfaces
- [x] The rebuilt-runtime alias proof shows truthful provider/vendor separation
- [x] Remaining external CI work is explicitly left open instead of implied complete

Approval: PASS

## Audit Verdict

Audit: PASS
