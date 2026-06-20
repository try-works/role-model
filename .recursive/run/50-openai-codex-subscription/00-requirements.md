Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `00 Requirements`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `FAS-5`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts`
- `/role-model-router/packages/catalog/src/litellm-catalog.ts`
- `/role-model-router/packages/catalog/src/token-economics.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/testdata/catalog/litellm-model-prices.json`
- User guidance in chat on 2026-06-18:
  - use Codex auth rather than general OpenAI OAuth
  - operator-facing label must be `Codex Subscription`
  - require TDD
  - require thorough end-to-end tests
  - require browser verification after rebuilding the runtime
Outputs:
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
Scope note: This run adds a Codex-auth-backed `Codex Subscription` connection method under the single operator-facing `OpenAI` provider, preserves the existing OpenAI API-key path, and eliminates duplicate `openai` / `chatgpt` operator inventory while enforcing TDD, thorough end-to-end validation, and rebuilt-runtime browser QA.

## TODO

- [x] Define a stable run id for the OpenAI subscription onboarding slice
- [x] Capture the single-provider `OpenAI` plus `Codex Subscription` operator contract
- [x] Capture the Codex-managed auth boundary for the subscription path
- [x] Capture catalog and provider deduplication requirements
- [x] Capture curated model inventory requirements for the subscription path
- [x] Capture TDD requirements for all production changes
- [x] Capture thorough end-to-end validation requirements
- [x] Capture rebuilt-runtime browser verification requirements
- [x] Record out-of-scope boundaries and constraints
- [x] Proceed to Phase 1 AS-IS

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `FAS-5` | operator outcome: authenticate with ChatGPT/Codex subscription for OpenAI endpoint and avoid duplicate `chatgpt` / `openai` remote endpoints |
| `/.recursive/STATE.md` | current runtime/operator truth, including existing OAuth generalization and readiness semantics |
| `/.recursive/DECISIONS.md` | prior implementation intent and known provider-account / OAuth decisions |
| current host-bridge, provider-account, catalog, and UI files | actual seams for provider synthesis, auth lifecycle, health/readiness behavior, and setup UI |
| `testdata/catalog/litellm-model-prices.json` | current raw LiteLLM provider/model inventory, including the `chatgpt` provider rows that must not surface as duplicate operator providers |
| chat guidance on 2026-06-18 | fixed naming, auth direction, TDD requirement, end-to-end testing requirement, rebuilt-runtime browser verification requirement |
| official OpenAI docs current on 2026-06-18 | Codex authentication and app-server auth flows define the subscription auth boundary; general API auth remains separate |

## Contract-First Delivery Rule

Implementation for this run must follow this order:

1. requirements contract
2. AS-IS analysis of current provider synthesis, auth lifecycle, health probing, and provider UI
3. failing automated tests for each production slice
4. backend provider synthesis and auth-path implementation
5. curated model inventory and dedupe implementation
6. frontend variant labeling and lifecycle UI implementation
7. end-to-end validation
8. rebuilt-runtime browser verification

Route-level or UI work may not bypass the backend auth and dedupe contract.
The `Codex Subscription` operator surface may not be implemented as a cosmetic label on top of the existing OpenAI API-key execution path.

## Fixed Decisions

1. The operator-facing provider remains `OpenAI`.
2. The operator-facing connection-method label is exactly `Codex Subscription`.
3. `Codex Subscription` is a Codex-auth integration, not a general OpenAI Platform API OAuth flow.
4. Existing OpenAI API-key onboarding remains in scope and must keep working.
5. Duplicate operator-facing `openai` and `chatgpt` provider entries are not allowed.
6. Raw LiteLLM `chatgpt/*` inventory is not the sole source of truth for the subscription model picker.
7. Production changes in this run must follow TDD with concrete RED and GREEN evidence.
8. Final QA must include browser verification against a rebuilt runtime artifact rather than a frontend-only preview.

## Requirements

### `R1` Single OpenAI provider in operator surfaces

Description:
The runtime and UI must expose a single operator-facing `OpenAI` provider rather than separate `openai` and `chatgpt` remote providers.

Acceptance criteria:
- provider list and setup flows show one `OpenAI` provider entry
- raw LiteLLM `chatgpt` provider inventory does not appear as a separate selectable provider
- existing OpenAI API-key onboarding remains available under the `OpenAI` provider
- runtime provider synthesis and UI snapshots prove that duplicate `OpenAI` / `ChatGPT` provider rows are not emitted

### `R2` Add `Codex Subscription` as an OpenAI connection method

Description:
The `OpenAI` provider must expose a second connection method labeled `Codex Subscription` in addition to `API Key`.

Acceptance criteria:
- the Providers UI shows `API Key` and `Codex Subscription` as distinct variants under `OpenAI`
- `Codex Subscription` is the exact operator-facing label used in the interface
- variant selection, saved-account rows, and lifecycle labels consistently use `Codex Subscription`
- existing provider setup flows for non-OpenAI providers are unchanged

### `R3` Use Codex-managed auth for `Codex Subscription`

Description:
`Codex Subscription` must use Codex/ChatGPT-managed authentication rather than the existing OpenAI API-key path.

Acceptance criteria:
- the implementation uses a Codex-auth-backed login/session flow for the `Codex Subscription` variant
- the implementation does not treat ChatGPT/Codex subscription auth as a generic bearer token for direct OpenAI API calls through the current API-key transport
- the backend records enough account/session state to distinguish `Codex Subscription` accounts from API-key-backed OpenAI accounts
- the implementation is grounded in current official OpenAI documentation for Codex authentication and app-server flows

### `R4` Support browser and device-code subscription sign-in

Description:
The backend must support the Codex-managed sign-in flows needed for the `Codex Subscription` variant, including device-style UX when the frontend owns the ceremony.

Acceptance criteria:
- the implementation supports starting a Codex-managed sign-in flow from the runtime backend
- the UI can present the information required to complete the sign-in flow
- account/session state moves through truthful lifecycle states such as pending, connected-without-endpoint, and execution-ready
- failed, expired, or stale auth states are surfaced with actionable repair semantics

### `R5` Curate model inventory for `Codex Subscription`

Description:
The model inventory shown for `Codex Subscription` must come from a curated OpenAI/Codex-aware source rather than blindly inheriting the raw LiteLLM `chatgpt/*` provider inventory.

Acceptance criteria:
- the runtime exposes a deliberate model list for the `Codex Subscription` variant
- the selected list is compatible with current documented Codex ChatGPT-sign-in model availability
- the implementation does not rely solely on raw LiteLLM `chatgpt/*` rows as the source of truth for the operator-facing subscription model picker
- the chosen source and any mapping rules are documented in code or run artifacts

### `R6` Preserve API-key-backed OpenAI behavior

Description:
Existing OpenAI API-key onboarding and request execution must continue to work after the `Codex Subscription` variant is added.

Acceptance criteria:
- OpenAI API-key account creation still succeeds
- existing OpenAI API-key execution and readiness behavior remain intact
- existing OpenAI API-key model selection remains available where previously supported
- validation covers both OpenAI connection methods

### `R7` Truthful readiness and repair semantics

Description:
Saved-account lifecycle summaries must accurately reflect the state of `Codex Subscription` accounts without implying they are execution-ready before prerequisites are satisfied.

Acceptance criteria:
- pending sign-in, expired sign-in, connected-without-endpoint, and ready states are rendered consistently in backend summaries and UI rows
- repair actions for `Codex Subscription` accounts are exposed through the saved-account maintenance surface
- archived stale or failed auth artifacts remain separated from active saved-account state
- lifecycle behavior remains consistent with the repo’s existing readiness semantics

### `R8` Health and validation behavior must match the new auth path

Description:
Health probing and readiness checks must not assume that every OpenAI-family remote account is validated via the current `/v1/models` API-key probe path.

Acceptance criteria:
- `Codex Subscription` accounts use health/readiness logic appropriate to their auth and execution path
- the implementation does not misclassify valid `Codex Subscription` accounts as broken solely because they do not fit the current API-key probe contract
- validation covers both account creation and post-auth readiness behavior

### `R9` Catalog/provider dedupe is enforced at the runtime synthesis layer

Description:
The system must enforce deduplication where provider/model inventory is synthesized, not only in presentation components.

Acceptance criteria:
- runtime provider synthesis returns a deduped operator-facing provider set
- UI-level filtering is not the sole mechanism preventing duplicate `openai` and `chatgpt` providers
- tests prove the dedupe behavior with representative catalog plus LiteLLM inputs

### `R10` TDD is mandatory for production changes

Description:
All production changes in this run must be implemented under TDD discipline with concrete RED and GREEN evidence.

Acceptance criteria:
- new or changed production behavior is preceded by failing automated tests that demonstrate the intended gap
- Phase 3 records concrete RED evidence paths and GREEN evidence paths for backend and frontend slices
- no production-only behavior is justified solely by manual QA
- if any slice requires pragmatic TDD handling, the exception and compensating evidence are explicitly recorded

### `R11` Thorough end-to-end validation across auth, catalog, and UI flows

Description:
The run must include automated end-to-end coverage for the integrated OpenAI provider behavior.

Acceptance criteria:
- automated tests cover provider synthesis, variant generation, account persistence, lifecycle transitions, dedupe behavior, and model inventory selection
- integrated runtime-host-bridge validation covers both `API Key` and `Codex Subscription` paths
- end-to-end tests cover at least one successful save/setup path for each OpenAI connection method
- end-to-end tests cover at least one failure or repair-path scenario for `Codex Subscription`

### `R12` Browser verification on rebuilt runtime

Description:
The final UI verification must happen against a rebuilt runtime, not only against a dev server or isolated frontend preview.

Acceptance criteria:
- the runtime is rebuilt before final browser QA
- browser verification is executed against the rebuilt runtime surface
- manual QA confirms the `OpenAI` provider shows `API Key` and `Codex Subscription`, with no duplicate `ChatGPT` provider
- manual QA confirms the `Codex Subscription` flow reaches a truthful pending or connected state in the rebuilt runtime UI
- browser evidence is captured after the rebuild-based verification

## Out of Scope

- adding non-OpenAI Codex subscription support for other providers
- replacing the existing OpenAI API-key execution path
- broad catalog cleanup unrelated to OpenAI / chatgpt deduplication
- full redesign of the Providers page beyond what is needed to add `Codex Subscription` cleanly
- migrating every raw `chatgpt/*` fixture or historical artifact in one sweep unless required for the selected implementation path
- general OpenAI API auth changes outside the OpenAI provider onboarding slice

## Constraints

- operator-facing label must be `Codex Subscription`
- the implementation must stay consistent with current official OpenAI docs as of 2026-06-18
- the runtime must preserve existing truthful readiness semantics for provider accounts
- the change must not introduce duplicate `OpenAI` and `ChatGPT` provider entries in operator surfaces
- the implementation must not depend on treating ChatGPT/Codex subscription auth as a normal OpenAI Platform API key
- existing OpenAI API-key support must continue to function
- production work for this run must follow TDD with recorded RED and GREEN evidence
- final QA must include browser verification against a rebuilt runtime artifact

## Coverage Gate

Coverage: PASS

- `R1`-`R2` cover the operator-facing provider and connection-method contract from `FAS-5` and approved chat guidance
- `R3`-`R4` cover the Codex-managed auth boundary and subscription sign-in flow requirements
- `R5`-`R6` cover model inventory and API-key backward-compatibility requirements
- `R7`-`R9` cover truthful lifecycle semantics, health behavior, and runtime-layer deduplication
- `R10`-`R12` cover the requested TDD, thorough end-to-end testing, and rebuilt-runtime browser verification contract
- out-of-scope and constraints explicitly fence off broader auth, catalog, and UI redesign work

## Approval Gate

Approval: PASS

- the operator-facing terminology is fixed as `Codex Subscription`
- the auth direction is fixed as Codex-managed rather than general OpenAI API OAuth
- the dedupe requirement is explicit at the runtime synthesis layer
- the TDD, end-to-end, and rebuilt-runtime browser verification requirements are explicit and testable
- the artifact is concrete enough to drive Phase 1 AS-IS analysis

## Lock

- Status: `DRAFT`
LockedAt: `2026-06-19T21:44:29Z`
LockHash: `ab7f7a85f451660909efa5a54b627f013c942d5b66a52046095bed0b2c3029d4`
