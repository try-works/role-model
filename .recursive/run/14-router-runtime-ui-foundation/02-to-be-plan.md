Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T21:03:21Z`
LockHash: `c5351b23357aa5126c6c4e81dbda0b231e418b6078fae092ba9c695eb1bf749b`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`
- `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\runtime-ui-design-report.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/apps/docs-site/package.json`
- `/apps/docs-site/react-router.config.ts`
- `/apps/docs-site/vite.config.ts`
- `/apps/docs-site/app/root.tsx`
- `/apps/docs-site/app/app.css`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-operations.ts`
- `/role-model-router/packages/catalog/src/index.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/testdata/catalog/models-dev-snapshot.json`
- `/testdata/catalog/models-dev-local-overrides.json`
- `/testdata/router-runtime/provider-accounts.json`
- `/testdata/router-runtime/registry-sources.json`
- `https://github.com/anomalyco/models.dev/blob/e91db96d83defb15ce27fc1bea9325996466c58e/providers/moonshotai/provider.toml`
- `https://github.com/anomalyco/models.dev/tree/e91db96d83defb15ce27fc1bea9325996466c58e/providers/moonshotai/models`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/klips/klip-14-kimi-code-oauth-login.md`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/src/kimi_cli/auth/oauth.py`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/src/kimi_cli/auth/platforms.py`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact converts the locked Phase 1 baseline into one narrow, buildable run-14 slice: add the repo-owned runtime UI app, expose the missing runtime provider/account/endpoints read-model/control-plane seams from the bridge backend, ingest the first Moonshot catalog slice from `models.dev`, and surface both Moonshot API-key and Kimi Code device-OAuth onboarding paths from day one without widening into full secret-management productization or a wholesale vendored-host rewrite.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the design report
- [x] Choose the first end-to-end runtime UI implementation slice
- [x] Choose the backend/control-plane stance for provider/account onboarding
- [x] Choose the Moonshot/Kimi auth modeling stance
- [x] Define changed-file boundaries, sub-phases, validation commands, and QA scope
- [x] Complete the audited-phase sections and gates

## Strategy Decision

- Selected runtime-UI stance: create a new repo-owned React Router + Vite + Tailwind app under `role-model-router/apps/runtime-ui/`, following the existing docs-site tooling baseline but without inheriting the docs shell or Fumadocs component model.
- Selected operator-route stance: implement one persistent `/app` operator shell with the first required route family:
  - `/app`
  - `/app/providers`
  - `/app/accounts`
  - `/app/workbench`
  - `/app/runtime`
  - `/app/endpoints`
  - `/app/requests`
  - `/app/requests/:requestId`
- Selected backend stance: extend `runtime-host-bridge` with the missing role-model-native read-model/control-plane endpoints needed by that UI:
  - `GET /api/role-model/runtime/summary`
  - `GET /api/role-model/providers`
  - `GET /api/role-model/accounts`
  - `POST /api/role-model/accounts`
  - `GET /api/role-model/endpoints`
  - keep the existing request-history, request-detail, endpoint-profile, `/v1/models`, and `/v1/chat/completions` routes intact
- Selected persistence stance: keep runtime state in the existing SQLite-first baseline by extending `sqlite-memory` with provider-account read/update helpers and using those helpers inside the host bridge instead of continuing to treat provider accounts as write-once fixture input only.
- Selected Moonshot/Kimi stance: split the first provider family into two operator-visible onboarding variants under one Moonshot/Kimi umbrella:
  - **Moonshot Open Platform** -> catalog-backed API-key path using `models.dev` provider `moonshotai` (`https://api.moonshot.ai/v1`)
  - **Kimi Code** -> device-OAuth-backed onboarding variant using the real `kimi-cli` flow shape (`https://api.kimi.com/coding/v1`, OAuth host `https://auth.kimi.com`, device authorization + token endpoints, device headers, token refresh metadata)
- Selected OAuth scope stance: run 14 must expose the Kimi Code OAuth path as a first-class onboarding surface and backend metadata contract from day one, but it may remain an explicit backend-limited path if durable token storage/refresh is not finished in the same slice. The UI must make that limitation explicit rather than pretending OAuth does not exist.
- Selected validation stance: add one UI/control-plane validator that proves the new provider/account/endpoints/runtime-summary APIs work against the runtime bridge baseline, while keeping the existing `runtime:validate-host`, `runtime:validate-observability`, `runtime:validate-operations`, and `docs:build` floor intact.
- Reason this plan follows those choices:
  - Phase 1 proved the runtime already has a usable read/execute backend baseline and the repo already has the right frontend toolchain; the missing line is the role-model-owned operator shell plus the provider/account control plane.
  - `models.dev` gives the real Moonshot catalog metadata for the API-key/OpenAI-compatible path, while `kimi-cli` gives the real Kimi Code OAuth/device-flow semantics; treating them as the same auth surface would be inaccurate.
  - Extending the existing SQLite + host-bridge stack is narrower and safer than inventing a second backend just for the UI.
  - A thin, explicit Kimi OAuth limitation is allowed by `R3` and avoids blocking the whole UI run on full secret/token lifecycle productization.

## Planned Changes by File

- `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`: record the concrete runtime-ui/control-plane slice and Moonshot/Kimi auth stance for run 14.
- `/package.json`: add runtime-ui convenience scripts and one runtime-backed UI/control-plane validator command if the final implementation leaves behind a new stable operator validation path.
- `/role-model-router/apps/runtime-ui/package.json`: add the new runtime UI app package.
- `/role-model-router/apps/runtime-ui/react-router.config.ts`: configure the app as the operator-shell React Router SPA.
- `/role-model-router/apps/runtime-ui/vite.config.ts`: reuse the docs-site Vite + Tailwind + React Router direction and proxy runtime-host APIs during development.
- `/role-model-router/apps/runtime-ui/tsconfig.json`: provide a local app TS config.
- `/role-model-router/apps/runtime-ui/app/root.tsx`: define the runtime UI root layout and error boundary.
- `/role-model-router/apps/runtime-ui/app/app.css`: define the first role-model runtime token layer, shell layout primitives, and the route-surface styling baseline.
- `/role-model-router/apps/runtime-ui/app/components/**`: add the first shared operator-shell and surface primitives (`AppShell`, nav, page header, detail cards, states, tables, badges, forms, inspection panel).
- `/role-model-router/apps/runtime-ui/app/lib/**`: add API clients, route-data helpers, token utilities, provider/auth-formatting helpers, and shared status mapping.
- `/role-model-router/apps/runtime-ui/app/routes/**`: add the first operator pages for dashboard, providers, accounts, workbench, runtime, endpoints, requests, and request detail.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: add the missing runtime summary, providers, accounts, and endpoint-list APIs; keep the existing request/profile/chat routes stable.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`: add focused tests first for the new UI-facing control-plane/read-model routes and account mutation behavior.
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`: add one deterministic runtime-backed validator for the new operator APIs.
- `/role-model-router/packages/sqlite-memory/src/index.ts`: add provider-account read/list/upsert helpers and any minimal diagnostics reads needed by the new host endpoints.
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`: add focused tests first for the new provider-account read/update helpers.
- `/role-model-router/packages/provider-account/src/index.ts`: extend validation only where necessary so the first Moonshot/Kimi slice can model supported auth modes explicitly rather than assuming every provider is API-key-only.
- `/role-model-router/packages/provider-account/test/index.test.ts`: add focused tests first for any new auth-mode compatibility logic.
- `/role-model-router/packages/catalog/src/index.ts`: extend the normalized provider shape only if required to carry explicit supported-auth-mode hints for the Moonshot/Kimi slice.
- `/role-model-router/packages/catalog/test/index.test.ts`: add or extend tests first if the normalized provider shape changes.
- `/testdata/catalog/models-dev-snapshot.json`: ingest the first `moonshotai` provider and Kimi model entries from `models.dev`.
- `/testdata/catalog/models-dev-local-overrides.json`: add the role-model-specific Moonshot overrides needed for provider kind, adapter family, control-plane requirements, and explicit onboarding metadata if that metadata belongs in the normalized provider shape.
- `/testdata/router-runtime/provider-accounts.json`: extend the deterministic account baseline only if the validator or host-backed list views need one Moonshot account fixture by default.
- `/testdata/router-runtime/registry-sources.json`: extend the deterministic endpoint baseline only if the UI/control-plane validator needs one Moonshot-backed endpoint to appear in list surfaces.
- `/testdata/router-runtime/provider-presets.json`: add a runtime-owned provider-onboarding fixture that describes the operator-visible provider variants and the Kimi OAuth metadata that does not belong in `models.dev` itself.

## Implementation Steps

1. Add the provider/control-plane read model the UI needs:
   - keep `models.dev` as the upstream catalog source,
   - add a runtime-owned provider-preset layer that merges normalized catalog providers/models with operator-facing onboarding metadata,
   - distinguish Moonshot Open Platform (API key) from Kimi Code (device OAuth) without rewriting the catalog source model.
2. Extend provider-account persistence and validation:
   - add `sqlite-memory` helpers to list and upsert provider accounts for runtime-host use,
   - preserve credential references and never return raw secret material,
   - permit the first Moonshot/Kimi auth-mode surface with explicit health/limitation states rather than hiding unsupported combinations.
3. Extend the runtime host bridge with UI-facing control-plane endpoints:
   - add runtime summary, providers, accounts, and endpoint-list reads,
   - add account upsert behavior for the first onboarding form path,
   - keep the existing request/profile/model/chat endpoints stable so workbench, requests, and runtime pages can reuse them directly.
4. Create the repo-owned runtime UI app:
   - scaffold the app from the docs-site toolchain pattern, not its content/layout system,
   - implement the token layer and shell primitives from the locked design contract,
   - keep the shell stable across loading and route transitions.
5. Implement the first route family with shared surfaces:
   - dashboard/runtime summary
   - providers catalog + Moonshot/Kimi onboarding cards
   - accounts registry + detail form
   - endpoints registry
   - requests ledger + request detail inspector
   - workbench chat composer over the existing host-backed `/v1/models` + `/v1/chat/completions` path
6. Surface the Kimi OAuth path honestly:
   - show the real OAuth host, client id, device-authorization/token endpoints, and required device-header metadata from `kimi-cli`,
   - show current limitation state explicitly if token exchange/refresh is not yet executable end-to-end in run 14,
   - never fake a successful OAuth connection when the backend cannot yet persist/refresh a usable token.
7. Add one runtime-backed UI/control-plane validator and preserve the existing runtime floor:
   - validate new provider/account/endpoints/runtime-summary APIs,
   - rerun the existing host/observability/operations validators,
   - rerun `docs:build`, `schemas:validate`, and record inherited root `build` / `test` failures accurately if unchanged.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm --filter @role-model-router/provider-account test`
  - `corepack pnpm --filter @role-model-router/catalog test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
- Package build checks:
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`
  - `corepack pnpm --filter @role-model-router/provider-account build`
  - `corepack pnpm --filter @role-model-router/catalog build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
- Direct run-14 validation paths:
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-operations`
  - `corepack pnpm run docs:build`
- Regression checks:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run smoke`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
- Guardrail checks:
  - `python D:\DEV\role-model\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --run-id 14-router-runtime-ui-foundation`
  - `git diff --name-only 85abf980096c931f09554ca203b66fa58bcb3cf4`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: the repo does not already carry a Playwright baseline for app testing, and run 14 can verify the first UI slice with focused route/helper tests, app builds, the runtime-backed control-plane validator, and manual/browser QA.

## Manual QA Scenarios

1. **Operator shell integrity**
   - Steps:
     - start the runtime host bridge baseline and the new runtime-ui dev server
     - open the new app and navigate across all `/app/*` routes
   - Expected:
     - sidebar/header/main shell stays stable
     - loading and empty states render inside the shell rather than replacing it
     - route titles, counts, and right-panel details stay coherent

2. **Moonshot/Kimi provider onboarding**
   - Steps:
     - open `/app/providers`
     - inspect the Moonshot/Kimi provider card(s)
     - confirm the UI distinguishes the API-key and Kimi OAuth paths
   - Expected:
     - the API-key path shows a normal account-creation route
     - the Kimi OAuth path shows the real device-flow metadata and an explicit limitation or readiness state
     - the UI does not claim OAuth is working if the backend path is still limited

3. **Account registry and endpoint activation**
   - Steps:
     - create or update a Moonshot API-key account from `/app/accounts`
     - inspect `/app/endpoints`
   - Expected:
     - account state, auth mode, health, and credential-ref status appear without exposing raw secret values
     - endpoint summaries reflect the resulting provider-account state

4. **Workbench and request inspection**
   - Steps:
     - use `/app/workbench` to send a chat request through the existing runtime host path
     - inspect `/app/requests` and `/app/requests/:requestId`
   - Expected:
     - workbench shows model selection and response output against the live runtime host
     - request ledger and request detail remain backed by the existing runtime observation APIs

5. **Runtime summary and preserved vendor references**
   - Steps:
     - open `/app/runtime`
     - confirm the page links or references the preserved host-owned diagnostics where appropriate
   - Expected:
     - runtime summary acknowledges host/operator ownership boundaries
     - preserved `/logs`, `/api/events`, `/api/metrics`, `/api/captures/:id`, and vendored `/ui/` are treated as adjacent host tools, not silently removed from the product narrative

## Idempotence and Recovery

- Re-running provider-account upserts must be safe; account writes should behave as deterministic upserts keyed by provider-account id rather than creating silent duplicates.
- Re-running the UI/control-plane validator must be safe and should use deterministic runtime-state roots/scopes just like the existing runtime validators.
- If Moonshot/Kimi catalog ingestion changes later, the provider-preset layer must preserve the distinction between upstream catalog metadata and role-model-owned onboarding metadata.
- If the Kimi OAuth token-exchange backend is not ready, the UI and host APIs must expose an explicit limitation state or `501`-style contract rather than returning success-shaped placeholders.
- If provider-account validation rejects an onboarding payload, the error should be surfaced as explicit operator diagnostics in the API/UI flow; it must not fail silently or coerce unknown auth modes.

## Implementation Sub-phases

### SP1. Catalog/control-plane foundation for Moonshot/Kimi and runtime UI

Scope and purpose:
Add the data/control-plane seam the new app needs before building the UI shell: Moonshot catalog ingestion, provider presets, provider-account persistence helpers, and runtime-host endpoints for provider/account/endpoint/runtime-summary reads.

Requirement mapping: `R3`, `R4`, `R6`

Implementation checklist:
- [ ] Add focused tests first for any new catalog/provider-account/sqlite-memory helpers
- [ ] Ingest `moonshotai` provider/model data into the repo-owned catalog snapshot/overrides
- [ ] Add a runtime-owned provider-preset source for Moonshot Open Platform and Kimi Code
- [ ] Extend `sqlite-memory` with provider-account read/upsert helpers
- [ ] Extend `runtime-host-bridge` with providers/accounts/endpoints/runtime-summary APIs and the account upsert path
- [ ] Add the runtime-backed `validate-ui` control-plane validator

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/catalog test`
- `corepack pnpm --filter @role-model-router/provider-account test`
- `corepack pnpm --filter @role-model-router/sqlite-memory test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm run runtime:validate-ui`

Sub-phase acceptance:
- The runtime bridge exposes enough provider/account/runtime data for the new UI to load real operator pages, and the Moonshot/Kimi-first provider slice exists in repo-owned data rather than only in external references.

### SP2. Runtime UI app scaffold, token layer, and shared shell

Scope and purpose:
Create the new repo-owned runtime UI app and the shared operator-shell/component baseline that all later pages use.

Requirement mapping: `R1`, `R2`, `R5`

Implementation checklist:
- [ ] Invoke `recursive-tdd` before production-code edits in this sub-phase
- [ ] Add focused tests first for route-data helpers and any shared UI formatting/state helpers
- [ ] Scaffold `role-model-router/apps/runtime-ui/` with React Router + Vite + Tailwind
- [ ] Implement the role-model token layer and shell primitives
- [ ] Implement the first shared surfaces for state cards, tables, details, forms, empty/error/loading states, and inspection panel framing
- [ ] Wire the app dev proxy/base URL strategy to the runtime-host APIs

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`

Sub-phase acceptance:
- The repo contains a buildable runtime-ui app with a stable `/app` shell, reusable primitives, and live data hooks ready for the first route family.

### SP3. First route family and onboarding/workbench integration

Scope and purpose:
Land the operator pages themselves, including provider/account onboarding, runtime summary, endpoint/request inspection, and a live workbench over the existing host-backed chat path.

Requirement mapping: `R1`, `R3`, `R4`, `R5`, `R6`

Implementation checklist:
- [ ] Add focused tests first for route-data mappers and any account form submission helpers
- [ ] Implement `/app`, `/app/providers`, `/app/accounts`, `/app/runtime`, `/app/endpoints`, `/app/requests`, `/app/requests/:requestId`, and `/app/workbench`
- [ ] Support Moonshot API-key account creation/editing end-to-end
- [ ] Support Kimi OAuth as a first-class onboarding path with explicit backend status/limitation handling
- [ ] Confirm preserved host-owned diagnostics are linked or surfaced appropriately from the operator UI
- [ ] Rerun the runtime validation floor plus runtime-ui build/tests and manual QA

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm run runtime:validate-ui`
- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:validate-operations`
- `corepack pnpm run docs:build`
- `corepack pnpm run schemas:validate`

Sub-phase acceptance:
- The new repo-owned UI is usable end-to-end for the first operator slice and accurately reflects both the runtime’s current capabilities and the still-preserved vendored operator surfaces.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills are available in this session.
Delegation Decision Basis: `Phase 2 required one controller-owned plan spanning the new runtime-ui app boundary, host control-plane endpoints, SQLite/provider-account extensions, Moonshot catalog ingest, and the Kimi OAuth metadata stance while preserving the existing runtime architecture lock.`
Delegation Override Reason: `Choosing the exact split between upstream catalog data, runtime-owned provider presets, backend-limited Kimi OAuth handling, and the first operator-route family required tightly coupled reasoning across the locked Phase 1 findings and the real runtime/UI seams.`
Audit Inputs Provided:
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`
- `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\runtime-ui-design-report.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/apps/docs-site/package.json`
- `/apps/docs-site/react-router.config.ts`
- `/apps/docs-site/vite.config.ts`
- `/apps/docs-site/app/root.tsx`
- `/apps/docs-site/app/app.css`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-operations.ts`
- `/role-model-router/packages/catalog/src/index.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/testdata/catalog/models-dev-snapshot.json`
- `/testdata/catalog/models-dev-local-overrides.json`
- `/testdata/router-runtime/provider-accounts.json`
- `/testdata/router-runtime/registry-sources.json`
- `https://github.com/anomalyco/models.dev/blob/e91db96d83defb15ce27fc1bea9325996466c58e/providers/moonshotai/provider.toml`
- `https://github.com/anomalyco/models.dev/tree/e91db96d83defb15ce27fc1bea9325996466c58e/providers/moonshotai/models`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/klips/klip-14-kimi-code-oauth-login.md`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/src/kimi_cli/auth/oauth.py`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/src/kimi_cli/auth/platforms.py`
- Changed files:
  - `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`

## Effective Inputs Re-read

- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`
- `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/docs/architecture/06-router-runtime-architecture-lock.md`
- `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\runtime-ui-design-report.md`
- `/package.json`
- `/pnpm-workspace.yaml`
- `/apps/docs-site/package.json`
- `/apps/docs-site/react-router.config.ts`
- `/apps/docs-site/vite.config.ts`
- `/apps/docs-site/app/root.tsx`
- `/apps/docs-site/app/app.css`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-operations.ts`
- `/role-model-router/packages/catalog/src/index.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/testdata/catalog/models-dev-snapshot.json`
- `/testdata/catalog/models-dev-local-overrides.json`
- `/testdata/router-runtime/provider-accounts.json`
- `/testdata/router-runtime/registry-sources.json`
- `https://github.com/anomalyco/models.dev/blob/e91db96d83defb15ce27fc1bea9325996466c58e/providers/moonshotai/provider.toml`
- `https://github.com/anomalyco/models.dev/tree/e91db96d83defb15ce27fc1bea9325996466c58e/providers/moonshotai/models`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/klips/klip-14-kimi-code-oauth-login.md`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/src/kimi_cli/auth/oauth.py`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/src/kimi_cli/auth/platforms.py`

## Earlier Phase Reconciliation

- `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`:
  - claim carried forward: the repo already has the right frontend stack baseline, runtime read APIs, provider-account vocabulary, and green host/operator validations, but it still lacks the repo-owned runtime-ui app, the provider/account control-plane APIs, and the Moonshot/Kimi-first catalog slice.
  - current reconciliation: the selected plan adds exactly those missing layers without reopening the existing runtime host, routing, or observability baseline.
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`:
  - claim carried forward: run 14 must create a repo-owned runtime UI, include provider/account onboarding from the start, preserve vendored host/operator capabilities honestly, and support Moonshot/Kimi API-key plus OAuth modeling.
  - current reconciliation: the selected plan meets that contract by combining a new operator-shell app with a narrow control-plane extension and a dual-path Moonshot/Kimi onboarding model.
- `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`:
  - claim carried forward: downstream audited phases must execute from `D:\DEV\role-model\.worktrees\14-router-runtime-ui-foundation` using diff basis `85abf980096c931f09554ca203b66fa58bcb3cf4`.
  - current reconciliation: the plan reuses that locked worktree and diff basis unchanged.
- `/docs/architecture/06-router-runtime-architecture-lock.md`:
  - claim carried forward: `models.dev` stays catalog-only, provider-account state stays runtime-owned, SQLite stays authoritative locally, and `llama-swap` stays the host/operator-workflow layer rather than the protocol or control-plane source of truth.
  - current reconciliation: the selected plan adds a runtime-owned provider-preset/control-plane layer beside the existing catalog and host layers instead of collapsing those boundaries.

## Subagent Contribution Verification

- Reviewed Action Records:
  - none
- Main-Agent Verification Performed:
  - `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/docs/architecture/06-router-runtime-architecture-lock.md`
  - `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\runtime-ui-design-report.md`
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/apps/docs-site/package.json`
  - `/apps/docs-site/react-router.config.ts`
  - `/apps/docs-site/vite.config.ts`
  - `/apps/docs-site/app/root.tsx`
  - `/apps/docs-site/app/app.css`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-operations.ts`
  - `/role-model-router/packages/catalog/src/index.ts`
  - `/role-model-router/packages/provider-account/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/testdata/catalog/models-dev-snapshot.json`
  - `/testdata/catalog/models-dev-local-overrides.json`
  - `/testdata/router-runtime/provider-accounts.json`
  - `/testdata/router-runtime/registry-sources.json`
  - external `models.dev` Moonshot provider files and `kimi-cli` OAuth sources listed above
- Acceptance Decision: `no delegated result accepted; controller completed self-audit`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `85abf980096c931f09554ca203b66fa58bcb3cf4`
- Comparison reference: `working-tree`
- Normalized baseline: `85abf980096c931f09554ca203b66fa58bcb3cf4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 85abf980096c931f09554ca203b66fa58bcb3cf4`
- Diff basis used: `git diff --name-only 85abf980096c931f09554ca203b66fa58bcb3cf4`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/14-router-runtime-ui-foundation`
- Actual changed files reviewed:
  - `/.recursive/run/14-router-runtime-ui-foundation/00-worktree.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/01-as-is.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
- Unexplained drift:
  - none; the current working diff is limited to intentional run-14 recursive artifacts

## Gaps Found

- none beyond the concrete plan choices already captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`; the plan is specific enough to drive strict TDD implementation.

## Repair Work Performed

- Converted the broad ask of “build the new runtime UI” into one narrow additive slice over the existing runtime backend instead of treating the run like a blank-slate product rewrite.
- Chose a concrete Moonshot/Kimi split grounded in upstream sources: API-key onboarding from `models.dev` Moonshot Open Platform metadata, plus Kimi Code device-OAuth metadata from the implemented `kimi-cli` flow.
- Chose a runtime-owned provider-preset/control-plane seam so Phase 3 can preserve the catalog/account/host architecture boundary while still giving the new UI accurate onboarding data.

## TDD Mode

TDD Mode: `strict`
- Phase 3 must create failing tests first for each new backend helper, host-route contract, and UI data/helper module before production code lands.
- If any UI surface is difficult to DOM-test without widening the toolchain, extract its route-data or formatting logic into testable modules and cover those modules first, then use app build/manual QA as the higher-level guardrail.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the plan now defines the new repo-owned runtime-ui app and first operator route shell, but none of those UI surfaces exist in code yet. | Blocking Evidence: `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`, `/role-model-router/apps`, `/apps/docs-site/package.json` | Audit Note: Phase 3 will build a new app boundary without replacing vendored `/ui/`.
- R2 | Status: blocked | Rationale: the plan now defines the token layer, shared shell primitives, and shared route-state surfaces, but the runtime UI design system has not yet been implemented in repo code. | Blocking Evidence: `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`, `C:\Users\erikb\.copilot\session-state\c404b58f-6ef5-45c3-81b8-28675b2af11d\runtime-ui-design-report.md`, `/apps/docs-site/app/app.css` | Audit Note: Phase 3 should reuse the existing toolchain and implement only the missing operator-shell layer.
- R3 | Status: blocked | Rationale: the plan now defines the provider/account control-plane reads and writes, the Moonshot catalog slice, and the Kimi OAuth onboarding metadata/status contract, but those control-plane surfaces and catalog updates are not implemented yet. | Blocking Evidence: `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/testdata/catalog/models-dev-snapshot.json`, `/role-model-router/packages/provider-account/src/index.ts` | Audit Note: Phase 3 must keep secrets by reference and surface any Kimi OAuth limitation explicitly.
- R4 | Status: blocked | Rationale: the plan now defines the first operator route family and the additional runtime-summary/providers/accounts/endpoints APIs they need, but those pages and APIs do not yet exist. | Blocking Evidence: `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-web/src/index.ts` | Audit Note: Existing request/profile/model/chat APIs should be reused rather than replaced.
- R5 | Status: blocked | Rationale: the plan now defines the shell-stability, responsive, and shared-state approach, but no operator-specific accessible/responsive UI implementation exists yet. | Blocking Evidence: `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`, `/apps/docs-site/app/root.tsx`, `/apps/docs-site/app/app.css` | Audit Note: Phase 3 should keep loading/empty/error states inside the persistent shell.
- R6 | Status: blocked | Rationale: the plan now defines a runtime-owned provider-preset/control-plane seam plus a `runtime:validate-ui` extension of the current validation floor, but the bridge, SQLite helpers, and validator still need implementation. | Blocking Evidence: `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`, `/docs/architecture/06-router-runtime-architecture-lock.md`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/package.json` | Audit Note: Phase 3 must preserve the existing architecture split and the known inherited root build/test caveat.

## Audit Verdict

- Audit summary: the run-14 plan is now intentionally narrow and executable. It does not assume a blank-slate runtime, and it does not require full OAuth secret-management productization before any UI can ship. It adds exactly the missing control-plane and frontend layers needed to make the existing runtime inspectable and configurable through a repo-owned operator UI, starting with the Moonshot/Kimi provider family.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> the new app boundary, operator shell, and first route family are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, and `## Requirement Completion Status`.
- `R2` -> the token layer, shared shell primitives, and design-system implementation boundary are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R3` -> the provider/account control-plane slice, Moonshot catalog ingest, and Kimi OAuth metadata/status contract are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R4` -> the exact route set and required backend API additions are captured in `## Strategy Decision`, `## Planned Changes by File`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R5` -> the shell-stability, shared-state, and responsive-implementation stance are captured in `## Strategy Decision`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R6` -> the SQLite/host-bridge extension boundary, preserved vendor surfaces, and validation-floor strategy are captured in `## Strategy Decision`, `## Testing Strategy`, `## Idempotence and Recovery`, and `## Requirement Completion Status`.

## Coverage Gate

- [x] Locked Phase 0 and Phase 1 artifacts were re-read
- [x] A concrete end-to-end slice was chosen for runtime-ui, provider/account APIs, and Moonshot/Kimi onboarding
- [x] The Kimi OAuth path was reconciled against `kimi-cli` rather than guessed from pretraining alone
- [x] Planned changed files, validation commands, and manual QA scope are explicit enough for Phase 3

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to implement without reopening Phase 1 questions
- [x] The slice remains narrow enough to fit the runtime UI foundation run rather than the entire long-term product surface
- [x] No unresolved Phase 2 ambiguity blocks a strict-TDD implementation start

Approval: PASS
