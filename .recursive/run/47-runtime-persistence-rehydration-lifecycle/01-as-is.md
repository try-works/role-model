Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `01 AS-IS Analysis`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`
- `role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`
- `role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/01-as-is.md`
Scope note: Captures the current runtime persistence, bootstrap, readiness, and credential-maintenance behavior before run 47 changes.

## TODO

- [x] Re-read locked run 47 requirements/worktree inputs and related prior runs
- [x] Inventory current persistence, bootstrap, readiness, and maintenance seams
- [x] Map every in-scope `R#` to current behavior
- [x] Record the acknowledged baseline and current test coverage gaps
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- Locked `00-requirements.md`: `R0`-`R17`, strict TDD, design-system-first UI delivery, rebuilt-runtime Phase 5 verification
- Locked `00-worktree.md`: isolated worktree on `recursive/47-runtime-persistence-rehydration-lifecycle`, base `dee829410458d03cef7e98fff7bda4472dec5fa9`, focused baseline with acknowledged host-bridge failures
- Prior run context:
  - run `06` established SQLite-backed provider-account and runtime-endpoint persistence
  - run `17` established generalized OAuth device-code and LiteLLM-backed provider handling
  - run `35` established design-system-first runtime UI discipline
  - run `39` established session bootstrap, operator-intent restore, readiness, and restart-rehydration surfaces

## AS-IS Summary

The repo already contains most of the raw ingredients that run 47 needs, but the lifecycle contract is still split across backend counts, raw account records, operator-intent manifests, and route-local UI heuristics:

1. **Persistence is multi-surface but not contract-owned.** Durable state lives across SQLite (`provider_accounts`, `runtime_endpoints`, device-auth sessions), operator-intent JSON (`remoteActivations`, `peerLoads`, `llamaSwapLoads`), and local credential files, but there is no explicit ownership/conflict matrix.
2. **Bootstrap exists but readiness remains provisional.** `runSessionBootstrapStages()` restores credentials, endpoints, peer loads, llama-swap loads, remote health, and inventory asynchronously, while `/api/role-model/runtime/summary` can still be read during `pending` or `running`.
3. **Lifecycle/readiness truth is still fragmented.** The backend summary exposes aggregate `readinessSummary` counts and bootstrap receipts, but provider/account posture is still re-derived client-side from raw `status`, `healthStatus`, `rotationState`, device-auth rows, and endpoint activation.
4. **Credential repair is generic, not semantic.** The backend exposes generic `upsertProviderAccount()` plus OAuth start/poll flows; the Providers page exposes setup-time **Save provider** / **Start OAuth** / **Check now**, but saved account cards have no first-class **Reconnect** or **Update API key** actions.
5. **Coverage is partial.** Existing tests prove connected OAuth rehydrate and pending auth restore, but there is no current protection for stale pending-auth cleanup, canonical credential-backend normalization, repair-in-place identity preservation, provisional-vs-authoritative summary semantics, or runtime-config/manual collision handling.

## Current Behavior by Requirement

| R# | Disposition | AS-IS summary |
| --- | --- | --- |
| `R0` | partial | Core runtime/provider handling is mostly provider-neutral, but lifecycle semantics still depend on raw account fields and OAuth-specific flows rather than one generic lifecycle model. |
| `R1` | partial | Durable state already spans SQLite, operator-intent JSON, and local credential files, but there is no explicit source-of-truth matrix or conflict-precedence contract. |
| `R2` | partial | `runSessionBootstrapStages()` performs reconciliation/restoration, but stale pending-auth cleanup and surfaced failure accounting are incomplete. |
| `R3` | gap | Lifecycle/readiness computation is aggregate-only in the backend and ad hoc in the UI; no canonical lifecycle mapping contract exists today. |
| `R4` | gap | Runtime, Session readiness, Workbench, Studio Advanced, Endpoints, and Providers do not all consume one canonical backend lifecycle/readiness API. |
| `R5` | gap | Saved remote accounts do not expose explicit reconnect or update-key maintenance actions. |
| `R6` | partial | API keys can persist locally, but storage mode is implicit and legacy/canonical backend names are both still visible. |
| `R7` | partial | Restart rehydration already covers remote activations, peer loads, llama-swap loads, OAuth token hydrate, and pending auth restore, but the lifecycle/readiness semantics remain incomplete. |
| `R8` | partial | Runtime summary and `/healthz` already expose bootstrap/inventory/operator-intent diagnostics, but they do not publish first-class account lifecycle receipts. |
| `R9` | partial | Corrupt operator-intent manifests and legacy credential backends are tolerated, but stale auth archival/migration policy is not explicit. |
| `R10` | gap | Current evidence is focused package tests plus the acknowledged host-bridge baseline; rebuilt packaged runtime verification has not started. |
| `R11` | partial | The design system and route metadata exist, but they do not yet define the new maintenance/lifecycle UI contract required by run 47. |
| `R12` | gap | `upsertProviderAccount()` performs generic merge-and-validate behavior, not explicit reconnect/update-key mutation contracts. |
| `R13` | gap | Some writes are atomic (`persistOperatorIntent()` temp+rename), but broader repair/bootstrap paths swallow failures and do not declare rollback/repeatability guarantees. |
| `R14` | partial | Run 39 bootstrap/readiness infrastructure is present and must be preserved, but run 47 has not yet produced compatibility proof. |
| `R15` | partial | Backend-owned summary/bootstrap APIs exist, but they stop at aggregate readiness counts and do not publish canonical account lifecycle/provider-rollup records. |
| `R16` | gap | Runtime-config accounts (`{providerId}.litellm`) and manual accounts can coexist without explicit logical-account identity/collision rules. |
| `R17` | gap | `runtime-api.ts` still models aggregate `readinessSummary` plus raw account/endpoint/device-auth arrays, so UI consumers continue to derive lifecycle semantics locally. |

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle`
2. Re-run the focused Phase 0 baseline if needed:
   - `corepack pnpm --filter ./role-model-router/packages/sqlite-memory test`
   - `corepack pnpm --filter ./role-model-router/apps/runtime-ui test`
   - `corepack pnpm --filter ./role-model-router/apps/runtime-host-bridge... build`
   - `corepack pnpm --filter ./role-model-router/apps/runtime-host-bridge test`
3. Open `role-model-router/apps/runtime-host-bridge/src/index.ts`:
   - inspect `hydrateOauthProviderAccounts()` and `refreshOauthAccessToken()`
   - inspect `buildCredentialReadinessSummary()`
   - inspect `upsertProviderAccount()`
   - inspect the async `runSessionBootstrapStages()` block
4. Open `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts` and note the persisted `remoteActivations`, `peerLoads`, and `llamaSwapLoads` manifests.
5. Open `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` and `app/lib/view-models.ts`:
   - note `RuntimeSummary.readinessSummary` is aggregate-only
   - note `buildConfiguredProviderRows()` reconstructs provider posture from raw accounts, device-authorizations, and endpoints
6. Open these readiness-consuming routes:
   - `app/routes/runtime.tsx`
   - `app/routes/session-readiness.tsx`
   - `app/routes/workbench.tsx`
   - `app/routes/studio-advanced.tsx`
   - `app/routes/endpoints.tsx`
   - `app/routes/providers.tsx`
7. Open `role-model-router/apps/runtime-host-bridge/test/index.test.ts` and inspect the restart tests around connected OAuth rehydrate and pending-auth restore.

## Current Behavior by Theme

### 1. Backend-owned summary exists, but lifecycle truth is still split (`R3`, `R4`, `R15`, `R17`)

- `readRuntimeSummary()` already returns:
  - `readinessSummary`
  - `sessionBootstrap`
  - `inventorySummary`
  - `aliasDrift`
  - `operatorIntent`
- But `RuntimeSummary.readinessSummary` still only exposes four counts:
  - `pendingDeviceAuthorizationCount`
  - `credentialsMissingAccountCount`
  - `connectedWithoutEndpointCount`
  - `readyAccountCount`
- `buildCredentialReadinessRows()` in the UI turns those counts into pills, not lifecycle records.
- `buildConfiguredProviderRows()` separately re-derives provider posture by walking raw accounts, device-auth rows, and endpoints:
  - pending = device-auth row with `status === "pending"`
  - missing credentials = account `healthStatus === "credentials-missing"`
  - connected/no-endpoint = account `status === "active"` and `healthStatus === "healthy"` but no active endpoint
  - ready = any active endpoint attached to the account
- The typed UI account shape still exposes raw `status`, `healthStatus`, `rotationState`, `credentialRef`, `allowedModels`, and `modelRoleBindings`, so lifecycle semantics remain spread across multiple raw fields.

### 2. Readiness consumers already span multiple routes (`R4`, `R15`, `R17`)

- `runtime.tsx` loads `fetchRuntimeSnapshot()` and renders `buildCredentialReadinessRows(snapshot.summary)`.
- `session-readiness.tsx` loads `fetchRuntimeSummary()` plus `fetchHealthStatus()` and renders:
  - bootstrap rows
  - readiness pills
  - operator-intent diagnostics
  - inventory stats
  - alias drift warnings
- `workbench.tsx` and `studio-advanced.tsx` both gate execution surfaces with `blockingReadinessRows`.
- `endpoints.tsx` does both:
  - aggregate readiness pills from `buildCredentialReadinessRows()`
  - provider rollups from `buildConfiguredProviderRows()`
- `providers.tsx` renders raw saved account cards with `credentialRef.backend:ref`, `status`, `healthStatus`, and model/role lists, but does not consume a canonical lifecycle record.

### 3. Bootstrap is asynchronous and only partially authoritative (`R2`, `R7`, `R8`, `R10`)

- `sessionBootstrapState` starts as `pending`, flips to `running`, then is updated asynchronously by `runSessionBootstrapStages()`.
- `/api/role-model/runtime/summary` and `/healthz` both expose bootstrap status/stages, so the runtime already distinguishes some provisional state.
- The credentials stage currently:
  - polls only `pendingAuthorizations.slice(0, 5)`
  - ignores expired entries for polling via `authorization.expiresAtMs > Date.now()`
  - swallows poll failures and refresh failures with bare `catch {}` blocks
- `buildCredentialReadinessSummary()` counts pending authorizations by `status === "pending"` without checking expiry, so stale rows that were never reclassified can still poison readiness even though bootstrap skips polling them.
- Endpoint, peer, and llama-swap restore stages degrade on partial failure, but they still report counts rather than canonical lifecycle/readiness records.

### 4. Persistence and restore surfaces are real, but ownership rules are implicit (`R1`, `R2`, `R7`, `R9`, `R14`, `R16`)

- `operator-intent.ts` persists:
  - `remoteActivations`
  - `peerLoads`
  - `llamaSwapLoads`
- Bootstrap consumes those manifests in separate stages:
  - `endpoints`
  - `peers`
  - `localReload`
  - `remoteHealth`
  - `inventory`
- `createUnifiedProviderAccounts()` synthesizes runtime-config accounts as `{providerId}.litellm`.
- Manual/saved provider accounts are still handled through `upsertProviderAccount()` and can therefore coexist beside unified-config accounts without an explicit logical-account merge policy.
- Corrupt operator-intent manifests are surfaced as diagnostics, but stale device-auth archival/removal policy is not yet explicit.

### 5. Credential storage and repair semantics are still generic (`R5`, `R6`, `R12`, `R13`)

- The code still accepts both `local-file` and `local-encrypted-file` in:
  - OAuth hydrate
  - token refresh
  - live credential resolution
  - UI backend labeling
- `upsertProviderAccount()` silently persists inline API-key input:
  - if the UI sends `credentialRef.backend === "env"` and `ref` looks like an inline API key, the backend writes a local credential file and rewrites the ref to `backend: "local-file"`
- `upsertProviderAccount()` also merges:
  - `allowedModels`
  - `modelRoleBindings`
  - missing `credentialRef`
  - missing `status` / `healthStatus` / `rotationState`
- That behavior preserves some continuity, but it is not an explicit reconnect/update-key contract and does not declare identity/binding guarantees separately from generic upsert behavior.
- `persistOperatorIntent()` uses temp-file + rename atomic writes, but broader bootstrap/repair flows do not expose repeatability or rollback rules.

### 6. The Providers UI is still onboarding-first, not maintenance-first (`R5`, `R6`, `R11`, `R12`)

- The setup form builds a provider payload and offers:
  - **Save provider**
  - **Start OAuth**
  - **Check now**
- The saved-account surface lists:
  - provider account id
  - provider id
  - health status
  - auth mode
  - `credentialRef.backend:ref`
  - base URL
  - status
  - allowed model role pills
- There are no first-class saved-account actions for:
  - reconnecting an expired OAuth account in place
  - updating an API key in place through a save/cancel modal
- The page therefore still treats maintenance as either reusing the setup form or raw control-plane state inspection.

### 7. Coverage already proves some restart flows, but key run-47 gaps are untested (`R2`, `R6`, `R7`, `R10`, `R12`, `R16`)

- Existing host-bridge tests already cover:
  - `rehydrates connected OAuth accounts from stored token files on backend restart`
  - `restores pending OAuth device-authorizations from SQLite after backend restart`
- Phase 0 baseline established:
  - `sqlite-memory` focused tests PASS
  - `runtime-ui` focused tests PASS
  - `runtime-host-bridge` focused suite still has three acknowledged pre-change failures:
    - `test/executable.test.ts`
    - `test/benchmark-runner-compare.test.ts`
    - `test/validate-vendors.test.ts`
- There is no current coverage for:
  - expired pending auth no longer counting as pending
  - canonical backend-name normalization
  - reconnect/update-key preserving account identity and bindings
  - provisional-vs-authoritative bootstrap summary semantics
  - runtime-config/manual logical-account collision handling

## Relevant Code Pointers

| Area | Path | Notes |
| --- | --- | --- |
| Unified-config account synthesis | `role-model-router/apps/runtime-host-bridge/src/index.ts` | `createUnifiedProviderAccounts()` creates `{providerId}.litellm` accounts |
| OAuth hydrate / refresh / backend-name dual support | `role-model-router/apps/runtime-host-bridge/src/index.ts` | `hydrateOauthProviderAccounts()`, `refreshOauthAccessToken()`, `resolveCredentialValue()` |
| Aggregate readiness summary | `role-model-router/apps/runtime-host-bridge/src/index.ts` | `buildCredentialReadinessSummary()` returns counts only |
| Generic provider mutation | `role-model-router/apps/runtime-host-bridge/src/index.ts` | `upsertProviderAccount()` rewrites inline API keys and merges models/bindings |
| Async bootstrap pipeline | `role-model-router/apps/runtime-host-bridge/src/index.ts` | `runSessionBootstrapStages()` credentials/endpoints/peers/vendors/localReload/remoteHealth/inventory |
| Operator-intent persistence | `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts` | `remoteActivations`, `peerLoads`, `llamaSwapLoads` |
| Summary/health API shape | `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | `RuntimeSummary`, `RuntimeHealthStatus`, raw account/endpoint/device-auth types |
| Client-side provider posture derivation | `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | `buildCredentialReadinessRows()`, `buildConfiguredProviderRows()` |
| Connect registry consumer | `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx` | aggregate readiness + provider rollups |
| Saved remote-account UI | `role-model-router/apps/runtime-ui/app/routes/providers.tsx` | setup-time auth actions, saved-account readback, no repair buttons |
| Readiness-gated execution surfaces | `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`, `session-readiness.tsx`, `workbench.tsx`, `studio-advanced.tsx` | multiple independent readiness consumers |
| Existing restart coverage | `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | connected OAuth rehydrate + pending auth restore |

## Evidence

- Locked Phase 0 baseline in `00-worktree.md`
- Code readback from:
  - `runtime-host-bridge/src/index.ts`
  - `runtime-host-bridge/src/operator-intent.ts`
  - `runtime-ui/app/lib/runtime-api.ts`
  - `runtime-ui/app/lib/view-models.ts`
  - `runtime-ui/app/routes/endpoints.tsx`
  - `runtime-ui/app/routes/providers.tsx`
  - `runtime-ui/app/routes/runtime.tsx`
  - `runtime-ui/app/routes/session-readiness.tsx`
  - `runtime-ui/app/routes/workbench.tsx`
  - `runtime-ui/app/routes/studio-advanced.tsx`
  - `runtime-host-bridge/test/index.test.ts`

## Known Unknowns

1. Whether run 47 should expose the canonical lifecycle contract by extending `/api/role-model/runtime/summary`, by adding a dedicated lifecycle/readiness route, or by doing both with a migration window.
2. The exact logical-account identity rule when a manual saved account overlaps a runtime-config `{providerId}.litellm` account for the same provider/model family.
3. Whether the acknowledged `test/executable.test.ts` baseline failure is purely an existing package-build expectation or a deeper host-bridge executable-contract issue that run 47 must avoid touching unless requirements force it.

## Traceability

| R# | AS-IS gap recorded | Primary evidence |
| --- | --- | --- |
| `R0` | No single provider-neutral lifecycle model yet | `runtime-api.ts`, `view-models.ts`, `index.ts` |
| `R1` | Multi-surface persistence without explicit ownership matrix | `index.ts`, `operator-intent.ts` |
| `R2` | Bootstrap exists but stale-pending cleanup / surfaced failure policy incomplete | `runSessionBootstrapStages()` |
| `R3` | Lifecycle computation split between backend counts and UI heuristics | `buildCredentialReadinessSummary()`, `buildConfiguredProviderRows()` |
| `R4` | Readiness consumers span many routes without one canonical lifecycle record | runtime/system/connect/workbench/studio routes |
| `R5` | No saved-account reconnect/update-key actions | `providers.tsx` |
| `R6` | Storage mode implicit; legacy backend names still active | `upsertProviderAccount()`, `hydrateOauthProviderAccounts()`, `view-models.ts` |
| `R7` | Restore families exist but semantics remain partial | `operator-intent.ts`, bootstrap stages, restart tests |
| `R8` | Diagnostics are count/stage oriented, not lifecycle-record oriented | `RuntimeSummary`, `readHealthStatus()` |
| `R9` | Corrupt-manifest handling exists; stale auth archival policy absent | `readOperatorIntentResult()`, bootstrap credentials stage |
| `R10` | Packaged-runtime verification not started | locked Phase 0 baseline only |
| `R11` | Design system not yet updated for maintenance-first remote account UI | current runtime-ui routes + requirements |
| `R12` | Generic upsert semantics stand in for repair contract | `upsertProviderAccount()`, Providers UI |
| `R13` | Atomic/repeatable behavior only partial today | `persistOperatorIntent()` vs swallowed bootstrap errors |
| `R14` | Run 39 bootstrap/readiness behaviors present and must be preserved | session readiness/runtime surfaces |
| `R15` | Backend summary exists but does not publish canonical account lifecycle/provider rollups | `RuntimeSummary`, `buildCredentialReadinessSummary()` |
| `R16` | Runtime-config/manual identity + merge rules are implicit | `{providerId}.litellm`, `upsertProviderAccount()` merge behavior |
| `R17` | UI still depends on aggregate counts plus raw arrays | `runtime-api.ts`, route consumers, `view-models.ts` |

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: self-audit; this phase required tightly coupled readback across one backend module, one operator-intent module, one typed API model, multiple UI consumers, and existing tests
- Audit Execution Mode: self-audit

## Subagent Contribution Verification

- No subagent contribution for Phase 1.

## Requirement Completion Status

- Status: audited
LockedAt: `2026-06-15T15:34:30Z`
LockHash: `e4f833a48ddf58bdf1b4838657332505dcb44a8ccb75e9023ce36ac159d61dbc`
- Changed Files:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/01-as-is.md`
- Implementation Evidence: none; Phase 1 is analysis-only
- Verification Evidence:
  - locked Phase 0 baseline in `00-worktree.md`
  - direct code readback across backend, UI, and tests
- Scope Decision: Phase 1 only; no product changes made

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every in-scope requirement has an AS-IS disposition
- [x] Backend, UI, bootstrap, persistence, and test seams are mapped to the current codebase
- [x] The acknowledged Phase 0 baseline and missing coverage obligations are recorded

Coverage: PASS

## Approval Gate

- [x] The AS-IS artifact is sufficient to plan the TO-BE contract
- [x] No blocking unknown prevents Phase 2 planning

Approval: PASS
