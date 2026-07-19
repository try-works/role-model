# Run 57 Addendum 10: Current-State Gap Closure Implementation Summary

Status: DRAFT
Scope: Run-local implementation summary for `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-05.md`.

## Summary

Implemented the current-state gap closure plan with TDD and live runtime/Pi verification. The closure adds runtime-task-aware Pi classification, correct all/include/exclude role assignment serialization for local and provider models, public taxonomy V1 documentation checks, QA reconciliation, and an additional live-QA-discovered fix so stable Pi advisory metadata cannot hard-filter all runtime endpoints.

## Implemented Changes

### Pi role-model package

- Added runtime task chunk support to `injectRoleModelIntentIntoPayloadWithRuntimeTasks`.
- Added async Pi extension request hook support when runtime task chunk fetching is available.
- Updated progressive-disclosure classification to record `groups`, `role-summaries`, and `tasks:<role>` chunks.
- Replaced the old unknown-prompt security default with a low-confidence broad fallback.
- Ensured runtime task chunks can supersede packaged task defaults when the runtime supplies a better matching task.

### Runtime role assignment

- Added all/include/exclude role assignment payload handling for runtime UI APIs.
- Preserved default all-role assignment for newly loaded local/provider models.
- Preserved explicit include-empty saves when a user intentionally deselects all roles.
- Added host read/write support for llama-swap and peer model role assignment modes.

### Public docs and recursive QA

- Added root public docs taxonomy V1 scan and wired it into `docs:taxonomy-v1-check`.
- Updated public docs/protocol examples away from stale `code.edit`/legacy role names.
- Added QA reconciliation addendum and validation script for Run 57 QA document consistency.

### Stable Pi advisory metadata hard-filter fix

Live runtime QA found that a stable `role_model.intent` request with unknown advisory capability/modality/tool metadata returned `400` because the core router still treated stable advisory required metadata as hard eligibility input. Added a core red test and changed router normalization so `contractVersion: 1` metadata keeps required capabilities/modalities advisory. Unknown advisory metadata is now recorded as ignored-field diagnostics without dropping the user request.

## TDD Evidence

- RED: `evidence/logs/current-state-gap-closure-4/red/slice-pi-classifier-runtime-parity.log`
- GREEN: `evidence/logs/current-state-gap-closure-4/green/slice-pi-classifier-runtime-parity.log`
- RED: `evidence/logs/current-state-gap-closure-4/red/slice3-provider-peer-llama-assignment.log`
- GREEN: `evidence/logs/current-state-gap-closure-4/green/slice3-provider-peer-llama-assignment.log`
- GREEN: `evidence/logs/current-state-gap-closure-4/green/slice4-public-docs-taxonomy-v1.log`
- GREEN: `evidence/logs/current-state-gap-closure-4/green/slice5-recursive-qa-reconciliation.log`
- RED: `evidence/logs/current-state-gap-closure-4/red/slice6-stable-advisory-no-hard-filter.log`
- GREEN: `evidence/logs/current-state-gap-closure-4/green/slice6-stable-advisory-no-hard-filter.log`

## Verification

Passed:

- `corepack pnpm --filter @try-works/pi-role-model test`
- `corepack pnpm --filter @try-works/pi-role-model build`
- `corepack pnpm --filter @role-model-router/core test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc --noEmit`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/openai-codex-subscription-matrix.test.ts --testTimeout=30000`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/routes/providers.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run docs:taxonomy-v1-check`
- `corepack pnpm run runtime:validate-ui`
- `node scripts/check-run57-qa-reconciliation.mjs`

Known verification note:

- A full default-timeout `@role-model-router/runtime-host-bridge test` run had 444 passing tests and one 5s timeout in `openai-codex-subscription-matrix.test.ts`. The same focused suite passed with `--testTimeout=30000`, and the affected runtime host suite passed with the same timeout setting.

## Live Runtime And Pi QA Receipts

Runtime:

- Fresh QA runtime health: `evidence/logs/current-state-gap-closure-4/qa/runtime-health-fresh.json`
- Taxonomy manifest/groups/roles/task chunks: `evidence/logs/current-state-gap-closure-4/qa/taxonomy-*.json`
- Router candidates all-role assignment: `evidence/logs/current-state-gap-closure-4/qa/router-candidates-after-slice6.json`
- Six package-classified runtime requests plus invalid advisory request: `evidence/logs/current-state-gap-closure-4/qa/runtime-classified-chat-results-after-slice6.json`
- Telemetry summary showing 7 successful live requests and 0 failures: `evidence/logs/current-state-gap-closure-4/qa/telemetry-summary-after-slice6.json`
- Invalid advisory request detail showing both endpoints eligible and ignored-field diagnostics: `evidence/logs/current-state-gap-closure-4/qa/router-decision-invalid-advisory-detail-after-slice6.json`

Pi:

- Local package install/list receipts: `evidence/logs/current-state-gap-closure-4/qa/pi-install-local-directory.log`, `pi-list-after-directory-reinstall.log`
- Role-model provider model discovery through Pi: `evidence/logs/current-state-gap-closure-4/qa/pi-role-model-list-models.log`
- Pi prompt through `--provider role-model --model default.hybrid`: `evidence/logs/current-state-gap-closure-4/qa/pi-role-model-prompt-security-review-after-reinstall.log`
- Runtime decision detail for the Pi prompt: `evidence/logs/current-state-gap-closure-4/qa/router-decision-pi-prompt-detail.json`

## Outcome

Run 57 Phase 1-4 implementation now conforms to the current proposal and approved addendum plan for the covered scope. Phase 5 benchmark implementation and Phase 6 telemetry expansion remain deferred to Run 58, while Phase 4 runtime/Pi telemetry receipts prove current metadata capture and routing behavior are functioning end to end.
