Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/01-as-is.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`
Scope note: Defines the implementation plan for adding `Codex Subscription` under the single `OpenAI` provider while preserving the OpenAI API-key path, deduping `chatgpt`, curating subscription models, and enforcing TDD plus rebuilt-runtime verification.

## TODO

- [x] Map each requirement to a concrete implementation slice
- [x] Define RED-first test entry points for each production slice
- [x] Define end-to-end and rebuilt-runtime verification gates
- [x] Proceed to Phase 3 implementation under TDD

## Requirement Mapping

- `R1` | Coverage: `direct` | Source Quote: `The runtime and UI must expose a single operator-facing OpenAI provider rather than separate openai and chatgpt remote providers.` | Implementation Surface: `role-model-router/packages/catalog/src/litellm-catalog.ts`, `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts`, `role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`
- `R2` | Coverage: `direct` | Source Quote: `The OpenAI provider must expose a second connection method labeled Codex Subscription in addition to API Key.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`
- `R3` | Coverage: `direct` | Source Quote: `Codex Subscription must use Codex/ChatGPT-managed authentication rather than the existing OpenAI API-key path.` | Implementation Surface: `role-model-router/packages/catalog/src/litellm-catalog.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`
- `R4` | Coverage: `direct` | Source Quote: `The backend must support the Codex-managed sign-in flows needed for the Codex Subscription variant, including device-style UX when the frontend owns the ceremony.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/device-authorization.ts`, `role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`, `role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`
- `R5` | Coverage: `direct` | Source Quote: `The model inventory shown for `Codex Subscription` must come from a curated OpenAI/Codex-aware source rather than blindly inheriting the raw LiteLLM `chatgpt/*` provider inventory.` | Implementation Surface: `role-model-router/packages/catalog/src/litellm-catalog.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `testdata/catalog/models-dev-local-overrides.json` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts`, `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`
- `R6` | Coverage: `direct` | Source Quote: `Existing OpenAI API-key onboarding and request execution must continue to work after the Codex Subscription variant is added.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/providers.tsx` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`, `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`
- `R7` | Coverage: `direct` | Source Quote: `Saved-account lifecycle summaries must accurately reflect the state of Codex Subscription accounts without implying they are execution-ready before prerequisites are satisfied.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/lib/device-authorization.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`, `http://127.0.0.1:3462/app/studio/chat`
- `R8` | Coverage: `direct` | Source Quote: `Health probing and readiness checks must not assume that every OpenAI-family remote account is validated via the current /v1/models API-key probe path.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`, `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`, `http://127.0.0.1:3462/app/system/session-readiness`
- `R9` | Coverage: `direct` | Source Quote: `The system must enforce deduplication where provider/model inventory is synthesized, not only in presentation components.` | Implementation Surface: `role-model-router/packages/catalog/src/litellm-catalog.ts`, `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`
- `R10` | Coverage: `direct` | Source Quote: `All production changes in this run must be implemented under TDD discipline with concrete RED and GREEN evidence.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts`, `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`, `role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` | Verification Surface: `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/`, `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/` | QA Surface: `/.recursive/run/50-openai-codex-subscription/03-implementation-summary.md`
- `R11` | Coverage: `direct` | Source Quote: `The run must include automated end-to-end coverage for the integrated OpenAI provider behavior.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`, `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`, `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`, `corepack pnpm run runtime:validate-ui` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`, `http://127.0.0.1:3462/app/studio/chat`
- `R12` | Coverage: `direct` | Source Quote: `The final UI verification must happen against a rebuilt runtime, not only against a dev server or isolated frontend preview.` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/package.json`, `role-model-router/apps/runtime-ui/package.json`, `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts` | Verification Surface: `/.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt`, `/.recursive/run/50-openai-codex-subscription/evidence/browser/run50-studio-chat.snapshot.txt`, `/.recursive/run/50-openai-codex-subscription/evidence/screenshots/run50-remote-providers-codex-subscription.png` | QA Surface: `http://127.0.0.1:3462/app/remote/providers`, `http://127.0.0.1:3462/app/studio/chat`

## Planned Changes by File

- `role-model-router/packages/catalog/src/litellm-catalog.ts`: add OpenAI OAuth metadata and canonical alias/dedupe seams for the subscription path.
- `role-model-router/packages/catalog/src/token-economics.ts`: keep operator-facing provider/model economics aligned with the deduped OpenAI-family view.
- `role-model-router/apps/runtime-host-bridge/src/index.ts`: canonicalize provider synthesis, curate the subscription model list, and wire the OpenAI subscription auth/lifecycle flow.
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`: add subscription-aware readiness policy rather than blindly using the API-key probe path.
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`: expose one `OpenAI` provider with `API Key` and `Codex Subscription`.
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`: surface truthful lifecycle labels and repair semantics for the subscription variant.
- `testdata/catalog/` or a nearby catalog-owned helper: store or derive the curated OpenAI subscription model source.
- focused host-bridge and runtime-ui test files listed below: provide RED-first coverage for each owned slice.

## Implementation Steps

1. Add RED tests for provider dedupe, subscription labeling, curated model inventory, and truthful lifecycle behavior.
2. Implement the backend OpenAI-family dedupe and curated subscription model source.
3. Implement the OpenAI subscription auth/lifecycle path and health-policy seam.
4. Implement the UI labeling and saved-account rendering changes.
5. Re-run focused validation, broader impacted suites, `runtime:validate-ui`, and rebuilt-runtime browser verification.

## Testing Strategy

- Use strict RED-GREEN-REFACTOR ordering for each production slice.
- Keep backend and frontend evidence separate so Phase 3 can cite exact failing and passing commands.
- Use focused suites first, then rerun the broader impacted runtime-host-bridge floor once the owned slices are green.
- Treat rebuilt-runtime browser verification as an acceptance requirement, not as a substitute for RED/GREEN evidence.

## Playwright Plan (if applicable)

- No dedicated Playwright harness was planned for the original run 50 implementation.
- Browser verification was planned through the rebuilt runtime surface and DOM/screenshot evidence instead.

## Manual QA Scenarios

1. Open the rebuilt runtime Providers page and verify only one `OpenAI` provider is shown.
2. Verify the OpenAI connection-method picker exposes both `API Key` and `Codex Subscription`.
3. Start the `Codex Subscription` flow and verify the runtime shows a truthful pending or connected-without-endpoint state rather than a false execution-ready state.
4. Verify saved-account rows, repair states, and lifecycle summaries consistently use `Codex Subscription`.
5. Verify no duplicate `ChatGPT` provider entry appears in the rebuilt runtime UI.

## Idempotence and Recovery

- Provider dedupe must be deterministic on repeated provider-list calls.
- Reconnect and persisted-session flows must restore the correct OpenAI variant rather than drifting back to generic OAuth labeling.
- A failed or non-executable subscription connection must remain repairable without damaging the existing API-key-backed OpenAI path.

## Implementation Sub-phases

- `SP1`: canonical provider identity and curated subscription inventory
- `SP2`: Codex-managed auth wiring and truthful readiness policy
- `SP3`: UI naming, variant selection, and saved-account rendering
- `SP4`: integrated validation, rebuilt runtime, and browser verification

## Implementation Strategy

The implementation should reuse the existing generic OAuth device-code plumbing rather than introduce a second auth framework.

The key structural moves are:

1. make `openai` the single canonical operator-facing provider identity
2. treat raw LiteLLM `chatgpt` data as support metadata, not as a second provider surface
3. add an explicit OpenAI OAuth variant labeled `Codex Subscription`
4. source the subscription variant’s models from a curated OpenAI/Codex-aware list rather than raw `chatgpt/*`
5. keep lifecycle and health semantics truthful by not forcing the subscription path through the existing API-key readiness contract unless that contract is explicitly valid

## Sub-phases

### `SP1` Canonical provider identity and curated subscription inventory (`R1`, `R5`, `R6`, `R9`)

Goal:
Collapse operator-facing OpenAI-family inventory to one `OpenAI` provider and give the subscription variant its own curated model source without regressing the API-key variant.

RED-first test work:
- extend `role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts`
  - prove raw LiteLLM `chatgpt` rows currently derive a distinct provider identity
  - prove `openai` lacks a subscription variant and curated model source today
- extend `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts`
  - prove runtime provider synthesis currently emits a separate `chatgpt` provider when present
  - prove the desired output is one `OpenAI` provider with two connection methods
- add or extend catalog-level tests under `role-model-router/packages/catalog/test/`
  - prove canonical alias behavior for OpenAI-family provider/model metadata
  - prove token-economics and model lookup stay stable after dedupe

Production changes:
- edit `role-model-router/packages/catalog/src/litellm-catalog.ts`
  - add OpenAI OAuth override metadata for the Codex-managed subscription path
  - add an explicit OpenAI-family alias/dedupe seam so `chatgpt` does not survive as a second operator provider
- edit `role-model-router/packages/catalog/src/token-economics.ts`
  - hide or alias provider/model ids as needed so dedupe is enforced consistently in operator-facing metadata and pricing lookups
- edit `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - canonicalize OpenAI-family provider synthesis in `listProviders()`
  - attach a curated model list to the subscription variant instead of blindly inheriting raw `chatgpt/*`
- add a dedicated curated-source artifact for subscription models
  - preferred shape: a small explicit fixture or helper-owned mapping checked into the repo with current-source notes and update date

Exit criteria:
- runtime provider synthesis returns one `OpenAI` provider
- the `OpenAI` provider exposes both `API Key` and `Codex Subscription`
- raw `chatgpt` rows do not appear as a separate provider surface
- the API-key-backed OpenAI path retains its current model list and auth behavior

### `SP2` Codex-managed auth wiring and truthful readiness policy (`R3`, `R4`, `R7`, `R8`)

Goal:
Wire the OpenAI subscription variant into the existing device-code flow using Codex-managed auth metadata while keeping account readiness and health semantics honest.

RED-first test work:
- extend `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`
  - prove OpenAI subscription accounts can start and reconnect through the new variant
- extend `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
  - prove persisted OpenAI subscription sessions rehydrate with correct lifecycle semantics
  - prove expired or failed subscription sessions archive and repair correctly
- extend `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`
  - prove the existing `/v1/models` probe contract is not blindly applied to the subscription path when it is not appropriate
- add a focused host-bridge test if needed around `createUnifiedProviderAccounts()`
  - prove existing OpenAI API-key accounts still resolve as API-key-backed
  - prove OAuth-backed OpenAI runtime-config accounts resolve correctly when a local OAuth credential exists

Production changes:
- edit `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - introduce a stable variant id for the subscription path, such as `openai-codex-subscription`
  - special-case variant labeling and descriptive copy for OpenAI subscription instead of generic `OpenAI OAuth`
  - route OpenAI subscription device authorization through the documented Codex/ChatGPT auth flow metadata
  - preserve `local-file` token persistence and existing reconnect/refresh semantics
  - record enough variant/account context so lifecycle summaries can distinguish subscription-backed OpenAI accounts from API-key-backed ones
- edit `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
  - add a readiness/health policy seam for subscription-backed OpenAI endpoints
  - do not mark a valid subscription account as broken solely because it does not satisfy the current generic `/v1/models` probe contract
- if needed, extend supporting state or metadata helpers so lifecycle rollups can describe `pending`, `connected-without-endpoint`, `execution-ready`, and repair-required states accurately for the new variant

Exit criteria:
- OpenAI subscription sign-in works through the generic device-code backend using OpenAI/Codex metadata
- reconnect and persisted-session flows work for subscription accounts
- readiness and health behavior are truthful and do not pretend the account is execution-ready before the execution prerequisites are actually satisfied

### `SP3` UI naming, variant selection, and saved-account rendering (`R2`, `R6`, `R7`)

Goal:
Expose the new OpenAI connection method cleanly in the runtime UI with the required `Codex Subscription` terminology and no duplicate `ChatGPT` provider row.

RED-first test work:
- extend `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - prove saved-account rows and lifecycle summaries render the correct OpenAI subscription state
- extend `role-model-router/apps/runtime-ui/app/lib/provider-account-state.test.ts`
  - prove the subscription lifecycle labels and repair states stay truthful
- extend `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - prove the Providers route renders one OpenAI provider entry and includes the `Codex Subscription` label
  - prove the page no longer relies on generic OAuth wording where the subscription label should appear
- add a focused route/component test if needed for the provider selector and variant detail panel

Production changes:
- edit `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - present `Codex Subscription` as the operator-facing label for the OpenAI OAuth variant
  - ensure saved-account reconnect flows resolve back to the subscription variant instead of a generic OAuth label
  - update variant detail copy and action labels where needed so the interface consistently says `Codex Subscription`
  - preserve the existing API-key flow for OpenAI and unchanged flows for other providers
- edit `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - add any variant-aware labeling needed for saved-account rows, maintenance rows, or lifecycle panels

Exit criteria:
- the Providers page shows one `OpenAI` provider
- the connection-method picker shows `API Key` and `Codex Subscription`
- saved-account and maintenance UI consistently refer to the subscription variant with the approved label

### `SP4` Integrated validation, rebuilt runtime, and browser verification (`R10`, `R11`, `R12`)

Goal:
Close the run with automated integrated validation and rebuilt-runtime browser evidence rather than relying on isolated unit tests or a frontend-only preview.

RED-first test work:
- add or extend integrated host-bridge/runtime tests covering:
  - successful save/setup for OpenAI `API Key`
  - successful start and completion-path handling for OpenAI `Codex Subscription`
  - at least one failure or repair-path case for OpenAI `Codex Subscription`
  - deduped provider listing plus curated model inventory
- extend `runtime-ui` tests if needed so the integrated snapshot includes the deduped OpenAI provider and both connection methods

Automated validation target:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/litellm-catalog.test.ts test/provider-overlap-metadata.test.ts test/account-repair.test.ts test/restart-rehydration.test.ts src/remote-health-probe.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/view-models.test.ts app/lib/provider-account-state.test.ts app/lib/device-authorization.test.ts app/lib/design-system.test.ts`
- `corepack pnpm run runtime:validate-ui`
- broaden to package-level or repo-level validation if the implementation touches additional surfaces

Rebuild and browser gate:
- rebuild the runtime artifact with `corepack pnpm run runtime:package-sea`
- launch the rebuilt runtime surface from the worktree
- verify in a browser against the rebuilt runtime, not a dev-only preview:
  - one `OpenAI` provider is shown
  - no duplicate `ChatGPT` provider is shown
  - `API Key` and `Codex Subscription` both appear under `OpenAI`
  - the subscription sign-in flow reaches a truthful `pending` or `connected-without-endpoint` state
- capture browser evidence after rebuild-based verification

Exit criteria:
- RED and GREEN evidence exist for every changed production slice
- automated end-to-end validation covers both OpenAI connection methods
- browser verification is completed against the rebuilt runtime artifact

## Phase 3 TDD Rule

Phase 3 implementation must follow strict RED-GREEN-REFACTOR ordering:

1. write or extend a failing automated test for the next smallest slice
2. change production code only after the failure is reproduced
3. get that slice green
4. refactor while keeping the slice green
5. record the exact RED and GREEN commands in the Phase 3 artifact

No production-only OpenAI subscription behavior may be introduced without a preceding failing automated test unless a concrete exception is recorded with compensating evidence.

## Proposed File Touch Set

- `role-model-router/packages/catalog/src/litellm-catalog.ts`
- `role-model-router/packages/catalog/src/token-economics.ts`
- `role-model-router/packages/catalog/test/...` as needed
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/provider-account-state.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- curated OpenAI subscription model-source fixture/helper under `testdata/catalog/` or a nearby catalog-owned path

## Risks To Contain During Implementation

1. Dedupe implemented only in the UI would leave backend/provider-account mismatches intact.
2. Reusing raw `chatgpt/*` rows directly would make the subscription model picker drift from current Codex-compatible availability.
3. Treating the subscription token as a normal OpenAI Platform API credential would violate the chosen auth boundary and likely break readiness semantics.
4. Overwriting the existing OpenAI provider definition instead of adding a second variant would risk regressing the API-key path.
5. Rebuild/runtime verification skipped in favor of frontend preview would leave the final integration unproven.

## Plan Drift Check

- No plan drift was introduced relative to `01-as-is.md`.
- The plan stays inside the provider synthesis, catalog, health-probe, and runtime-ui seams identified in Phase 1.
- The plan preserves the original fixed decisions: one `OpenAI` provider, exact `Codex Subscription` label, Codex-managed auth boundary, TDD, thorough end-to-end validation, and rebuilt-runtime browser verification.

## Traceability

- `R1` -> `SP1` provider dedupe and one-OpenAI provider synthesis | Evidence target: host-bridge provider-overlap tests and runtime provider listing
- `R2` -> `SP3` variant labeling and provider UI rendering | Evidence target: runtime-ui tests and rebuilt Providers page
- `R3` -> `SP2` Codex-managed auth specialization | Evidence target: account-repair tests and live runtime probe
- `R4` -> `SP2` device-code/browser flow support | Evidence target: device-authorization lifecycle tests and rebuilt runtime UI
- `R5` -> `SP1` curated subscription model source | Evidence target: catalog/host-bridge tests and provider detail readback
- `R6` -> `SP1` plus `SP3` backward-compatible API-key OpenAI path | Evidence target: focused OpenAI tests and runtime provider setup verification
- `R7` -> `SP2` plus `SP3` truthful lifecycle semantics | Evidence target: view-model and device-authorization tests plus rebuilt runtime UI
- `R8` -> `SP2` readiness and health policy seam | Evidence target: remote-health-probe coverage and live runtime probe
- `R9` -> `SP1` runtime synthesis-layer dedupe | Evidence target: provider-overlap metadata tests
- `R10` -> all sub-phases under strict RED/GREEN discipline | Evidence target: RED and GREEN logs recorded in Phase 3
- `R11` -> `SP4` integrated validation | Evidence target: impacted bridge suite, focused validation floors, and runtime validators
- `R12` -> `SP4` rebuilt-runtime browser verification | Evidence target: browser snapshots and screenshots from the rebuilt runtime

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: recursive router policy files were absent in this worktree as recorded in `00-worktree.md`.
- Delegation Decision Basis: self-audit used because no configured routed subagent policy/discovery inventory was available in the isolated worktree.
- Audit Inputs Provided: `00-requirements.md`, `01-as-is.md`, the current plan content, and the Phase 0 diff basis.

## Effective Inputs Re-read

- Re-read `/.recursive/run/50-openai-codex-subscription/00-requirements.md`.
- Re-read `/.recursive/run/50-openai-codex-subscription/01-as-is.md`.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the concrete gaps identified there: provider identity collapse, Codex-specific variant semantics, curated model sourcing, truthful readiness policy, and integrated verification.
- `00-requirements.md`: the plan preserves the fixed naming, auth-boundary, TDD, end-to-end, and rebuilt-runtime QA requirements without widening scope.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: checked that every in-scope requirement from `00-requirements.md` is mapped to a concrete sub-phase, file surface, and verification path.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: not applicable.
- Repair Performed After Verification: added the missing audit-v2 planning sections, explicit requirement mapping, and concrete QA/test strategy.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Comparison reference: `working-tree`
- Normalized baseline: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Expected planning-owned changed path: `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`

## Gaps Found

- none

## Repair Work Performed

- Added the missing audit-v2 planning sections, requirement mapping, implementation steps, QA scenarios, idempotence notes, and diff-basis fields required for a lockable Phase 2 artifact.

## Requirement Completion Status

- `R1 | Status: planned | Implementation Surface: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/packages/catalog/src/token-economics.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts, role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers | Audit Note: one-OpenAI provider dedupe is concretely planned.`
- `R2 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx, role-model-router/apps/runtime-ui/app/lib/view-models.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts, role-model-router/apps/runtime-ui/app/lib/design-system.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers | Audit Note: Codex Subscription naming is concretely planned.`
- `R3 | Status: planned | Implementation Surface: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts, role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers | Audit Note: Codex-managed auth specialization is concretely planned.`
- `R4 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Verification Surface: role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers | Audit Note: device-code/browser flow support is concretely planned.`
- `R5 | Status: planned | Implementation Surface: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/apps/runtime-host-bridge/src/index.ts, testdata/catalog/models-dev-local-overrides.json | Verification Surface: role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts, role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers | Audit Note: curated subscription model sourcing is concretely planned.`
- `R6 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Verification Surface: role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts, role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers | Audit Note: the existing API-key path is explicitly preserved.`
- `R7 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/lib/view-models.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.ts | Verification Surface: role-model-router/apps/runtime-ui/app/lib/view-models.test.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers, http://127.0.0.1:3462/app/studio/chat | Audit Note: truthful lifecycle behavior is concretely planned.`
- `R8 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/src/remote-health-probe.test.ts, role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers, http://127.0.0.1:3462/app/system/session-readiness | Audit Note: health-policy seam is concretely planned.`
- `R9 | Status: planned | Implementation Surface: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/packages/catalog/src/token-economics.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts | QA Surface: http://127.0.0.1:3462/app/remote/providers | Audit Note: dedupe is planned at synthesis time, not only in UI.`
- `R10 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts, role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts, role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | Verification Surface: /.recursive/run/50-openai-codex-subscription/evidence/logs/red/, /.recursive/run/50-openai-codex-subscription/evidence/logs/green/ | QA Surface: /.recursive/run/50-openai-codex-subscription/03-implementation-summary.md | Audit Note: strict RED/GREEN discipline is explicit.`
- `R11 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts, role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts, role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts | Verification Surface: role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts, role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts, role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts, corepack pnpm run runtime:validate-ui | QA Surface: http://127.0.0.1:3462/app/remote/providers, http://127.0.0.1:3462/app/studio/chat | Audit Note: integrated end-to-end validation is concretely planned.`
- `R12 | Status: planned | Implementation Surface: role-model-router/apps/runtime-host-bridge/package.json, role-model-router/apps/runtime-ui/package.json, role-model-router/apps/runtime-host-bridge/src/validate-ui.ts | Verification Surface: /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-remote-providers.snapshot.txt, /.recursive/run/50-openai-codex-subscription/evidence/browser/run50-studio-chat.snapshot.txt, /.recursive/run/50-openai-codex-subscription/evidence/screenshots/run50-remote-providers-codex-subscription.png | QA Surface: http://127.0.0.1:3462/app/remote/providers, http://127.0.0.1:3462/app/studio/chat | Audit Note: rebuilt-runtime browser verification is concretely planned.`

## Audit Verdict

Audit: PASS

## Coverage Gate

Coverage: PASS

- `SP1` maps `R1`, `R5`, `R6`, and `R9`
- `SP2` maps `R3`, `R4`, `R7`, and `R8`
- `SP3` maps `R2`, `R6`, and `R7`
- `SP4` maps `R10`, `R11`, and `R12`
- every sub-phase has explicit RED-first tests, production files, and exit criteria

## Approval Gate

Approval: PASS

- the plan is implementation-ready and anchored to current repo seams
- the TDD requirement is concrete rather than aspirational
- the final verification gate explicitly requires rebuilt-runtime browser QA

## Lock

- Status: `DRAFT`
LockedAt: `2026-06-19T21:58:38Z`
LockHash: `12e4329ce0e5bcb2d99427b3b136b0ea6b3f28694062f47fe008caf54cb6a847`
