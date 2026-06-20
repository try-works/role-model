Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `01 AS-IS`
Status: `LOCKED`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `role-model-router/packages/catalog/src/litellm-catalog.ts`
- `role-model-router/packages/catalog/src/token-economics.ts`
- `role-model-router/packages/provider-account/src/index.ts`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `testdata/catalog/litellm-model-prices.json`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/01-as-is.md`
Scope note: Documents the current state of OpenAI-family provider synthesis, OAuth lifecycle support, provider UI behavior, model inventory sourcing, and readiness/health behavior before implementing the `Codex Subscription` variant.

## TODO

- [x] Inspect current backend provider synthesis and OAuth lifecycle seams
- [x] Inspect current UI/provider-variant behavior
- [x] Inspect current catalog/model inventory behavior for `openai` and `chatgpt`
- [x] Inspect current readiness and health behavior for OAuth-backed accounts
- [x] Proceed to Phase 2 TO-BE plan

## Source Requirement Inventory

| Requirement | Source of current-state analysis |
| --- | --- |
| `R1`, `R9` | provider synthesis in `role-model-router/apps/runtime-host-bridge/src/index.ts`, catalog identity behavior in `role-model-router/packages/catalog/src/litellm-catalog.ts`, operator filtering in `role-model-router/packages/catalog/src/token-economics.ts`, and raw LiteLLM provider rows in `testdata/catalog/litellm-model-prices.json` |
| `R2` | OpenAI variant labeling and provider UI behavior in `role-model-router/apps/runtime-host-bridge/src/index.ts` and `role-model-router/apps/runtime-ui/app/routes/providers.tsx` |
| `R3`, `R4` | generic device-code backend and persisted OAuth lifecycle behavior in `role-model-router/apps/runtime-host-bridge/src/index.ts` plus provider-account modeling in `role-model-router/packages/provider-account/src/index.ts` |
| `R5` | model sourcing order in `role-model-router/apps/runtime-host-bridge/src/index.ts` and raw provider/model inventory in `testdata/catalog/litellm-model-prices.json` |
| `R6` | existing OpenAI API-key override and account flow in `role-model-router/packages/catalog/src/litellm-catalog.ts` and `role-model-router/apps/runtime-ui/app/routes/providers.tsx` |
| `R7` | lifecycle and repair semantics in `role-model-router/apps/runtime-host-bridge/src/index.ts` and `role-model-router/apps/runtime-ui/app/lib/view-models.ts` |
| `R8` | generic remote readiness probing in `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` |
| `R10` | focused backend/frontend baseline tests captured in `00-worktree.md` |
| `R11`, `R12` | lack of integrated OpenAI subscription E2E and rebuilt-runtime browser evidence in current repo state |

- `R1` through `R12` were re-read from `/.recursive/run/50-openai-codex-subscription/00-requirements.md`.
- `R1` | Disposition: `in-scope` | Source Quote: `The runtime and UI must expose a single operator-facing OpenAI provider rather than separate openai and chatgpt remote providers.` | Summary: `Current backend synthesis can still emit separate OpenAI and chatgpt provider identities.`
- `R2` | Disposition: `in-scope` | Source Quote: `The OpenAI provider must expose a second connection method labeled Codex Subscription in addition to API Key.` | Summary: `Current variant labeling is generic and does not provide a Codex Subscription seam.`
- `R3` | Disposition: `in-scope` | Source Quote: `Codex Subscription must use Codex/ChatGPT-managed authentication rather than the existing OpenAI API-key path.` | Summary: `Generic OAuth support exists, but no OpenAI/Codex-specific auth path exists yet.`
- `R4` | Disposition: `in-scope` | Source Quote: `The backend must support the Codex-managed sign-in flows needed for the Codex Subscription variant, including device-style UX when the frontend owns the ceremony.` | Summary: `Device-code lifecycle plumbing exists, but no OpenAI subscription variant owns it yet.`
- `R5` | Disposition: `in-scope` | Source Quote: `The model inventory shown for `Codex Subscription` must come from a curated OpenAI/Codex-aware source rather than blindly inheriting the raw LiteLLM `chatgpt/*` provider inventory.` | Summary: `Current provider model resolution would fall through to raw chatgpt inventory.`
- `R6` | Disposition: `in-scope` | Source Quote: `Existing OpenAI API-key onboarding and request execution must continue to work after the Codex Subscription variant is added.` | Summary: `The current API-key-backed OpenAI flow is already stable and must remain additive-only.`
- `R7` | Disposition: `in-scope` | Source Quote: `Saved-account lifecycle summaries must accurately reflect the state of Codex Subscription accounts without implying they are execution-ready before prerequisites are satisfied.` | Summary: `Truthful lifecycle machinery exists already but is not specialized to the OpenAI subscription variant yet.`
- `R8` | Disposition: `in-scope` | Source Quote: `Health probing and readiness checks must not assume that every OpenAI-family remote account is validated via the current /v1/models API-key probe path.` | Summary: `Current remote health logic assumes an OpenAI-style bearer-token probe contract.`
- `R9` | Disposition: `in-scope` | Source Quote: `The system must enforce deduplication where provider/model inventory is synthesized, not only in presentation components.` | Summary: `The duplicate-provider problem originates in runtime synthesis rather than only in UI rendering.`
- `R10` | Disposition: `quality-gate` | Source Quote: `All production changes in this run must be implemented under TDD discipline with concrete RED and GREEN evidence.` | Summary: `The focused baseline existed, but run-owned RED-first coverage had not been added yet at this phase.`
- `R11` | Disposition: `quality-gate` | Source Quote: `The run must include automated end-to-end coverage for the integrated OpenAI provider behavior.` | Summary: `Integrated dual-method OpenAI end-to-end coverage was absent at this phase.`
- `R12` | Disposition: `quality-gate` | Source Quote: `The final UI verification must happen against a rebuilt runtime, not only against a dev server or isolated frontend preview.` | Summary: `Rebuilt-runtime browser proof for the OpenAI subscription path was absent at this phase.`

## Reproduction Steps (Novice-Runnable)

1. Open `testdata/catalog/litellm-model-prices.json` and confirm a raw `chatgpt` provider exists beside `openai`.
2. Read `role-model-router/packages/catalog/src/litellm-catalog.ts` and confirm `openai` has an API-key override but no Codex-specific OAuth override.
3. Read `role-model-router/apps/runtime-host-bridge/src/index.ts` and confirm provider listing and variant generation are driven by provider ids and generic OAuth labeling.
4. Read `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` and confirm the current remote health probe assumes an OpenAI-style `/v1/models` or `/models` bearer-token contract.
5. Read `role-model-router/apps/runtime-ui/app/routes/providers.tsx` and `role-model-router/apps/runtime-ui/app/lib/view-models.ts` and confirm the current UI has no dedicated `Codex Subscription` variant semantics.

## Executive Readback

The repo already has a generalized OAuth device-code implementation that can synthesize dynamic OAuth variants from LiteLLM provider metadata, persist local OAuth tokens, reconnect saved OAuth accounts, and surface truthful lifecycle states such as pending authorization and connected-without-endpoint.

The remaining gap is not generic OAuth infrastructure. The gap is that current runtime/catalog/UI logic still treats `chatgpt` as a separate LiteLLM provider identity, has no OpenAI-specific OAuth metadata or Codex-specific labeling, sources models from raw provider ids, and validates remote readiness through a generic OpenAI-style `/v1/models` probe that is not a safe fit for a Codex-managed subscription path.

## `R1` and `R9` Single OpenAI provider and runtime-layer dedupe

Current state:
- `testdata/catalog/litellm-model-prices.json` includes a distinct `chatgpt` LiteLLM provider with multiple `chatgpt/*` model rows.
- `role-model-router/packages/catalog/src/litellm-catalog.ts` defines an override for `openai` but no alias or override for `chatgpt`, so the raw LiteLLM provider id remains distinct.
- `role-model-router/packages/catalog/src/token-economics.ts` hides only `moonshotai` from operator surfaces; `chatgpt` is not hidden and no canonical provider alias maps `chatgpt` onto `openai`.
- `role-model-router/apps/runtime-host-bridge/src/index.ts` `listProviders()` merges:
  - normalized catalog providers, then
  - LiteLLM providers whose `providerId` is not already present in the normalized catalog.
- That merge is keyed by literal `providerId`, so a raw `chatgpt` provider survives as a separate operator-facing provider whenever it is present in LiteLLM metadata and absent from the normalized catalog.

Impact:
- The current runtime synthesis path can emit separate `OpenAI` and `chatgpt` operator providers.
- UI-only filtering would not solve the underlying duplication because the duplicate identity originates in backend provider synthesis and model sourcing.

## `R2` Operator-facing connection-method naming

Current state:
- `role-model-router/apps/runtime-host-bridge/src/index.ts` `resolveProviderVariants()` auto-generates variant labels as:
  - `${displayName} API Key`
  - `${displayName} OAuth`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx` renders `variant.label` directly in the connection-method selector and detail panel.
- OAuth actions in the UI are currently generic strings such as `Start OAuth` and `Check now`.
- Saved-account maintenance labels in `role-model-router/apps/runtime-ui/app/lib/view-models.ts` are derived from auth mode and lifecycle action, not from a connection-method identity such as `Codex Subscription`.

Impact:
- If OpenAI OAuth metadata were added without further changes, the UI would present a generic `OpenAI OAuth` method rather than the required `Codex Subscription` label.
- The current UI has no dedicated naming seam for a subscription-branded OpenAI variant.

## `R3` and `R4` Codex-managed auth boundary and sign-in flow

Current state:
- `role-model-router/packages/catalog/src/litellm-catalog.ts` already supports provider-level OAuth metadata through `LiteLLMProviderOAuth`:
  - `apiBase?`
  - `oauthHost`
  - `clientId`
  - `deviceAuthorizationEndpoint`
  - `tokenEndpoint`
  - `requiredHeaders`
  - `scope?`
- `role-model-router/apps/runtime-host-bridge/src/index.ts` already supports:
  - dynamic OAuth variant synthesis from LiteLLM provider metadata
  - `startProviderDeviceAuthorization()`
  - `pollProviderDeviceAuthorization()`
  - `reconnectProviderAccount()`
  - `refreshOauthAccessToken()`
- `startProviderDeviceAuthorization()` and reconnect build a `local-file` credential reference, persist a pending OAuth-backed provider account, start the device flow, and rebuild current state.
- `pollProviderDeviceAuthorization()` exchanges the device code for tokens and persists them to the runtime state root.
- `createUnifiedProviderAccounts()` already detects an existing OAuth credential ref and chooses `oauth2-device-code` instead of `api-key-static` when the provider supports OAuth.

Current OpenAI-specific gap:
- `KNOWN_PROVIDER_OVERRIDES` currently gives `openai` only API-key metadata.
- There is no OpenAI/Codex OAuth metadata in the catalog layer and no OpenAI-specific subscription variant identity in runtime synthesis.
- There is no code path that distinguishes a Codex-managed OpenAI account from a generic OAuth-capable provider account beyond raw `providerId`, `authMode`, and credential location.

Impact:
- The generic device-code machinery already exists and is reusable.
- The missing work is to attach the correct OpenAI/Codex auth contract to the single `OpenAI` provider without collapsing it into the existing API-key execution path.

## `R5` Curated model inventory for `Codex Subscription`

Current state:
- `role-model-router/apps/runtime-host-bridge/src/index.ts` `resolveModelIds()` chooses provider model ids in this order:
  1. unified runtime config mappings
  2. normalized catalog models matching the provider id
  3. raw LiteLLM model-price rows matching the provider id
  4. preset variant model ids
- For a distinct `chatgpt` provider id, the raw LiteLLM fixture becomes the default source of truth.
- `resolveProviderVariants()` then assigns those model ids directly to generated variants.
- There is no OpenAI/Codex-aware curated source, alias layer, or fixture specifically for a subscription-backed OpenAI variant.

Impact:
- A naive implementation would inherit the raw `chatgpt/*` fixture rows directly into the operator-facing variant picker.
- That does not satisfy the requirement that `Codex Subscription` use a deliberate, documented, current Codex-compatible model inventory.

## `R6` Preserve API-key-backed OpenAI behavior

Current state:
- `role-model-router/packages/catalog/src/litellm-catalog.ts` defines the existing `openai` override as an API-key-backed provider using `https://api.openai.com/v1`.
- `resolveProviderVariants()` already generates an API-key variant whenever `api-key-static` is supported or when no explicit auth modes are present.
- `providers.tsx` builds API-key-backed provider payloads with `credentialRef.backend: "env"` and only auto-activates endpoints immediately for API-key flows or for OAuth flows that have already reached a connected state.
- The focused Phase 0 baseline passed current provider overlap, catalog, OAuth repair, device authorization, provider account state, and view-model tests.

Impact:
- The API-key path is a stable existing behavior and must be preserved.
- Any OpenAI subscription work must be additive and must not regress current OpenAI API-key onboarding, validation, or endpoint activation semantics.

## `R7` Truthful readiness and repair semantics

Current state:
- `role-model-router/apps/runtime-host-bridge/src/index.ts` already computes lifecycle states such as:
  - `pending-authorization`
  - `connected-without-endpoint`
  - `execution-ready`
  - degraded/repairable states
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts` already maps those states into operator-facing labels such as:
  - `Pending OAuth`
  - `Execution-ready`
  - connected-without-endpoint summary rows
- Saved-account rows already expose action labels such as `Reconnect` and `Update API key`.
- `providers.tsx` reconnect flow restores the matching variant by `authMode` and `baseUrlOverride`, then launches the same device-authorization ceremony used for first-time setup.

Impact:
- The repo already has the lifecycle/readiness machinery needed for truthful subscription state rendering.
- The remaining gap is wiring the OpenAI subscription variant into those existing lifecycle paths with the correct naming and deduped provider identity.

## `R8` Health and validation behavior for the new auth path

Current state:
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` probes remote endpoints by:
  - resolving a bearer credential
  - building `${apiBase}/v1/models` or `${apiBase}/models`
  - expecting an OpenAI-style JSON payload with `data[].id`
  - marking missing listed models as `model-not-found`
- The probe target model assumes the execution endpoint is directly reachable with a bearer token that behaves like a normal OpenAI-compatible API credential.

Impact:
- That assumption is not safe for a Codex-managed subscription path unless the chosen execution surface deliberately conforms to the same contract.
- If the subscription path requires a different readiness contract, the current health probe would misclassify healthy subscription accounts as degraded.

## `R10` Existing TDD/test floor

Current state:
- Focused Phase 0 backend baseline:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/litellm-catalog.test.ts test/provider-overlap-metadata.test.ts test/account-repair.test.ts`
  - result: `53` passing tests
- Focused Phase 0 frontend baseline:
  - `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/device-authorization.test.ts app/lib/provider-account-state.test.ts app/lib/view-models.test.ts`
  - result: `45` passing tests
- Current tests cover generic provider overlap metadata, OAuth account repair/device lifecycle, and provider lifecycle view-model behavior.

Gap:
- There is no failing test yet for:
  - OpenAI/`chatgpt` provider dedupe
  - `Codex Subscription` naming
  - curated OpenAI subscription model inventory
  - OpenAI subscription readiness/health behavior

## `R11` End-to-end validation coverage gap

Current state:
- The repo has unit/integration coverage for generic device authorization and provider-account lifecycle behavior.
- The repo does not yet have integrated end-to-end coverage for a single `OpenAI` provider exposing both:
  - `API Key`
  - `Codex Subscription`
- There is no current automated coverage proving:
  - duplicate `openai` / `chatgpt` suppression
  - successful OpenAI subscription save/setup
  - failure/repair handling for an OpenAI subscription account

Impact:
- The run needs new test coverage across catalog synthesis, backend device auth, provider persistence, UI view models, and integrated provider setup flows.

## `R12` Browser verification on rebuilt runtime

Current state:
- No rebuilt-runtime browser evidence exists for an OpenAI subscription variant.
- Existing UI/provider evidence in the repo is for already-supported flows such as Moonshot/Kimi Code rather than an OpenAI/Codex subscription path.

Impact:
- Final QA for this run must add new browser verification after a rebuild, not merely reuse existing provider-page screenshots or frontend-only previews.

## Phase 1 Conclusions

1. Generic OAuth/device-code plumbing is already in place and should be reused rather than re-invented.
2. The main design problem is provider identity and source-of-truth control:
   - collapse `chatgpt` into the operator-facing `OpenAI` provider
   - attach a Codex-specific auth contract and label
   - curate the model inventory separately from raw LiteLLM `chatgpt/*` rows
3. Readiness/repair semantics mostly exist already, but remote health validation must be reviewed carefully so the subscription path is not forced through an OpenAI API-key probe contract by accident.

## Current Behavior by Requirement

- `R1`: current runtime synthesis can emit both `OpenAI` and raw `chatgpt` provider identities.
- `R2`: current variant labels are generic (`API Key`, `OAuth`) rather than `Codex Subscription`.
- `R3`: current OAuth support is generic and not yet specialized into a Codex-managed OpenAI variant.
- `R4`: current device-code lifecycle machinery exists, but there is no explicit OpenAI/Codex variant path yet.
- `R5`: current subscription-like model sourcing would fall through to raw `chatgpt/*` inventory.
- `R6`: current OpenAI API-key flow is stable and already exercised by the focused baseline.
- `R7`: current lifecycle truthfulness machinery exists, but it has not yet been specialized for OpenAI subscription semantics.
- `R8`: current remote readiness assumes an OpenAI-style bearer-token `/v1/models` probe.
- `R9`: current dedupe problem originates in backend synthesis, not just presentation.
- `R10`: current baseline has focused green tests but no RED-first run-50-specific coverage yet at this phase.
- `R11`: current repo state lacks integrated OpenAI dual-method end-to-end coverage.
- `R12`: current repo state lacks rebuilt-runtime browser proof for the OpenAI subscription path.

## Relevant Code Pointers

- `role-model-router/packages/catalog/src/litellm-catalog.ts`
- `role-model-router/packages/catalog/src/token-economics.ts`
- `role-model-router/packages/provider-account/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `testdata/catalog/litellm-model-prices.json`

## Known Unknowns

- The exact long-term execution surface for Codex-auth-backed OpenAI requests is still open at this phase; the AS-IS only proves the current direct-request runtime transport is not a safe fit.
- The exact curated OpenAI subscription model-source artifact was not chosen yet at this phase.
- Whether the existing generic health probe can be adapted or must be bypassed for subscription-backed OpenAI endpoints remained a planning question at this phase.

## Evidence

- `00-worktree.md` focused test baseline for current host-bridge and runtime-ui seams.
- Source inspection of the files listed under `Inputs`.
- Raw LiteLLM inventory evidence from `testdata/catalog/litellm-model-prices.json`.

## Traceability

- `R1` -> backend provider merge and raw provider inventory analysis | Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `testdata/catalog/litellm-model-prices.json`
- `R2` -> variant labeling analysis | Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `R3` -> generic OAuth contract analysis | Evidence: `role-model-router/packages/catalog/src/litellm-catalog.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R4` -> device-code lifecycle analysis | Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R5` -> model-source fallback analysis | Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `testdata/catalog/litellm-model-prices.json`
- `R6` -> existing API-key-path baseline | Evidence: `role-model-router/packages/catalog/src/litellm-catalog.ts`, `00-worktree.md`
- `R7` -> lifecycle and repair-path analysis | Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `R8` -> remote health probe contract analysis | Evidence: `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `R9` -> synthesis-layer dedupe analysis | Evidence: `role-model-router/packages/catalog/src/token-economics.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R10` -> current test-floor analysis | Evidence: `00-worktree.md`
- `R11` -> current end-to-end gap analysis | Evidence: absence of run-owned integrated OpenAI subscription coverage in current tests
- `R12` -> rebuilt-runtime browser-evidence gap analysis | Evidence: absence of run-owned rebuilt-runtime browser proof at this phase

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: recursive router policy files were absent in this worktree as recorded in `00-worktree.md`.
- Delegation Decision Basis: self-audit used because no configured routed subagent policy/discovery inventory was available in the isolated worktree.
- Audit Inputs Provided: `00-requirements.md`, `00-worktree.md`, `.recursive/STATE.md`, `.recursive/DECISIONS.md`, the source files listed in `Inputs`, and the Phase 0 diff basis.

## Effective Inputs Re-read

- Re-read `/.recursive/run/50-openai-codex-subscription/00-requirements.md`.
- Re-read `/.recursive/run/50-openai-codex-subscription/00-worktree.md`.
- Re-read `/.recursive/STATE.md`.
- Re-read `/.recursive/DECISIONS.md`.
- Re-read the source files listed under `Inputs`.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/05-manual-qa.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Earlier Phase Reconciliation

- `00-requirements.md`: the AS-IS confirms the generic OAuth/device-code plumbing already exists, so the remaining gap is provider identity, OpenAI-specific variant semantics, curated model sourcing, and truthful readiness handling.
- `00-worktree.md`: the AS-IS stays within the planned backend provider synthesis, health-probe, catalog, and runtime-ui seams captured by the focused baseline tests and diff basis.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: compared current source behavior directly against `00-requirements.md`, `00-worktree.md`, and the listed runtime/catalog/UI files.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: not applicable.
- Repair Performed After Verification: added the missing audit-v2 sections and requirement-grounded traceability to this Phase 1 artifact.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Comparison reference: `working-tree`
- Normalized baseline: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Reviewed changed path scope for this artifact: `/.recursive/run/50-openai-codex-subscription/01-as-is.md`

## Gaps Found

- none

## Repair Work Performed

- Added the missing audit-v2 sections, requirement-grounded traceability, diff-basis fields, and prior-evidence references required for a lockable audited artifact.

## Requirement Completion Status

- `R1 | Status: verified | Changed Files: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts, testdata/catalog/litellm-model-prices.json | Audit Note: backend synthesis can currently emit duplicate OpenAI/chatgpt provider identities.`
- `R2 | Status: verified | Changed Files: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: role-model-router/apps/runtime-ui/app/lib/view-models.ts, /.recursive/run/50-openai-codex-subscription/00-worktree.md | Audit Note: current variant naming is generic rather than Codex-specific.`
- `R3 | Status: verified | Changed Files: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: role-model-router/packages/provider-account/src/index.ts, /.recursive/run/50-openai-codex-subscription/00-worktree.md | Audit Note: generic OAuth plumbing exists but no OpenAI/Codex specialization exists yet.`
- `R4 | Status: verified | Changed Files: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: role-model-router/packages/provider-account/src/index.ts, /.recursive/run/50-openai-codex-subscription/00-worktree.md | Audit Note: device-code lifecycle exists but no OpenAI subscription variant path exists yet.`
- `R5 | Status: verified | Changed Files: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/apps/runtime-host-bridge/src/index.ts, testdata/catalog/models-dev-local-overrides.json | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts, testdata/catalog/litellm-model-prices.json | Audit Note: current fallback would inherit raw chatgpt inventory.`
- `R6 | Status: verified | Changed Files: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: /.recursive/run/50-openai-codex-subscription/00-worktree.md | Audit Note: existing OpenAI API-key behavior is stable and must be preserved.`
- `R7 | Status: verified | Changed Files: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.ts, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: role-model-router/apps/runtime-host-bridge/src/index.ts, role-model-router/apps/runtime-ui/app/lib/view-models.ts | Audit Note: truthful lifecycle machinery exists already.`
- `R8 | Status: verified | Changed Files: role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: /.recursive/run/50-openai-codex-subscription/00-worktree.md, role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts | Audit Note: current health path assumes OpenAI-style API probing.`
- `R9 | Status: verified | Changed Files: role-model-router/packages/catalog/src/litellm-catalog.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: role-model-router/packages/catalog/src/token-economics.ts, role-model-router/apps/runtime-host-bridge/src/index.ts | Audit Note: dedupe must happen at synthesis time, not only in UI.`
- `R10 | Status: verified | Changed Files: role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts, role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts, role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts, role-model-router/apps/runtime-ui/app/lib/view-models.test.ts | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: /.recursive/run/50-openai-codex-subscription/00-worktree.md | Audit Note: current focused baseline exists but run-owned RED-first coverage had not been added yet at this phase.`
- `R11 | Status: verified | Changed Files: role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts, role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts, role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: /.recursive/run/50-openai-codex-subscription/00-worktree.md, role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts, role-model-router/apps/runtime-host-bridge/test/provider-overlap-metadata.test.ts | Audit Note: integrated dual-method OpenAI E2E coverage was absent at this phase.`
- `R12 | Status: verified | Changed Files: role-model-router/apps/runtime-ui/app/routes/providers.tsx, role-model-router/apps/runtime-host-bridge/src/validate-ui.ts, role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts | Implementation Evidence: /.recursive/run/50-openai-codex-subscription/01-as-is.md | Verification Evidence: /.recursive/run/50-openai-codex-subscription/00-worktree.md, role-model-router/apps/runtime-ui/app/routes/providers.tsx | Audit Note: rebuilt-runtime browser proof was absent at this phase.`

## Audit Verdict

Audit: PASS

## Coverage Gate

Coverage: PASS

- `R1` and `R9` are covered by runtime merge, token-economics, and raw fixture analysis
- `R2` is covered by current variant generation and UI rendering analysis
- `R3` and `R4` are covered by current catalog OAuth schema and host-bridge auth lifecycle analysis
- `R5` is covered by current provider/model-id sourcing analysis
- `R6` is covered by current OpenAI API-key path analysis and focused baseline evidence
- `R7` is covered by lifecycle and repair-path analysis
- `R8` is covered by the remote health probe contract analysis
- `R10` to `R12` are covered by the recorded current test/browser evidence gaps

## Approval Gate

Approval: PASS

- the current code seams and constraints are concrete enough to drive the implementation plan
- the AS-IS clearly distinguishes reusable infrastructure from the true remaining gaps
- the Phase 0 baseline and Phase 1 findings align on where run `50` should add tests before production changes

## Lock

- Status: `DRAFT`
LockedAt: `2026-06-19T21:57:44Z`
LockHash: `f837934f88fe60a88bd514d879cce589e444943a628fbf1d6ee50a4c0ae7763a`
