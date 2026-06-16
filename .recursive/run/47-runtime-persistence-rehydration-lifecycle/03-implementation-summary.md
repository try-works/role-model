Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `03 Implementation Summary`
Status: `LOCKED`
LockedAt: `2026-06-15T19:59:25Z`
LockHash: `29727d12c09eeb11cf00a0520a865f2fa9db24adee224056050ce06bc572ad31`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-worktree.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/03-implementation-summary.md`
Scope note: Phase 3 implementation slices are complete. This draft now records the orphan-reconciliation, logical-account merge, and repair-atomicity closeout slices; artifact reconciliation is complete and the remaining Phase 3 work is audit/lock review before Phase 5 rebuilt-runtime verification.

## TODO

- [x] Complete SP47-A design-system-first provider-maintenance slice under strict TDD
- [x] Capture RED/GREEN evidence for each SP47-A production change
- [x] Re-run the runtime-ui package test suite after SP47-A changes
- [x] Publish initial SP47-B backend-owned `credentialLifecycle` summary contract with compatibility aliasing
- [x] Move shared readiness/provider helpers onto canonical lifecycle counts and provider rollups
- [x] Finish SP47-B consumer migration and backend detail coverage for the initial contract slice
- [x] Continue SP47-C bootstrap reconciliation and authority hardening
- [x] Implement SP47-D explicit backend repair mutation contract
- [x] Implement SP47-E readiness-surface UI migration onto canonical lifecycle data
- [x] Reconcile full Phase 3 diff and requirement coverage after remaining slices land

## Changes Applied

### SP47-A — Design-system-first provider maintenance contract

- `apps/runtime-ui/DESIGN_SYSTEM.md` now defines `Remote > Providers` as both onboarding and maintenance, with explicit `Reconnect` and `Update API key` affordances, a save/cancel API-key modal, and shared lifecycle/readiness vocabulary expectations across Connect/System/Studio surfaces.
- `apps/runtime-ui/app/lib/design-system.test.ts` locks three provider-maintenance contract assertions:
  - saved-account maintenance actions must exist
  - API-key maintenance must use a dialog with explicit `Save` / `Cancel`
  - OAuth reconnect must stay a one-click saved-account action
- `apps/runtime-ui/app/routes/providers.tsx` renders saved-account maintenance controls, exposes a working `Update API key` modal backed by the existing inline-key upsert seam, and wires `Reconnect` through a dedicated saved-account device-auth restart handler.

### SP47-B — Canonical lifecycle summary contract and helper migration

- `apps/runtime-host-bridge/src/index.ts` now publishes a versioned `credentialLifecycle` block from `readRuntimeSummary()`, including authority state, canonical lifecycle counts, per-account lifecycle records, provider rollups, and an explicit archived-artifact list placeholder.
- `readinessSummary` is now derived from `credentialLifecycle.counts` instead of being calculated as a parallel source of truth.
- `apps/runtime-host-bridge/test/session-readiness-api.test.ts` locks the HTTP summary contract and alias consistency.
- `apps/runtime-host-bridge/test/restart-rehydration.test.ts` locks a concrete ready-account/provider-rollup case after backend restart.
- `apps/runtime-ui/app/lib/runtime-api.ts` now exposes typed `credentialLifecycle` structures to runtime-ui consumers.
- `apps/runtime-ui/app/lib/view-models.ts` now prefers canonical lifecycle counts and provider rollups when present, while retaining compatibility fallback to `readinessSummary`.
- `apps/runtime-ui/app/routes/endpoints.tsx` now passes backend provider rollups into the configured-provider view-model so that surface no longer has to re-derive readiness counts when canonical rollups are available.

### SP47-C — Bootstrap stale-state cleanup and authority hardening

- `apps/runtime-host-bridge/src/index.ts` now excludes expired pending device-authorizations from active readiness counts and surfaces them as `credentialLifecycle.archivedArtifacts` with `expired-pending-authorization` diagnostics.
- The restart hydration path now validates persisted provider accounts before reuse, excludes invalid persisted accounts from active lifecycle state, and archives them as `provider-account` artifacts instead of leaving them active.
- The restart hydration path now archives orphan pending device-authorizations and orphan credential files as stale artifacts instead of counting them as active readiness blockers.
- The canonical lifecycle rollups now mark `hasArchivedArtifacts` per provider when archived bootstrap artifacts are present.
- The bootstrap `credentials` stage now records structured `pendingAttempted`, `pendingSucceeded`, `pendingFailed`, `pendingDeferred`, `refreshAttempted`, `refreshSucceeded`, and `refreshFailed` counters.
- The bootstrap `credentials` stage now returns `degraded` instead of silently `ready` when pending-auth polling or OAuth refresh work fails during startup.
- Pending OAuth resume order is now deterministic: sort by `expiresAtMs`, then `authRequestId`, then process the startup cap and surface `pendingDeferred`.
- `/healthz` now publishes `credentialLifecycleAuthority`, reusing the same authority semantics object exposed by runtime summary.
- Failed startup OAuth refresh now persists `refresh-failing` / `failed` account posture, and the canonical lifecycle maps that posture to `expired-auth` with `oauth-refresh-failed` repair guidance instead of leaving the account falsely ready.
- `apps/runtime-host-bridge/test/restart-rehydration.test.ts` now locks stale pending-auth exclusion, orphan/invalid artifact archival, poll-failure accounting, and deterministic pending-session selection across backend restart.
- `apps/runtime-host-bridge/test/session-readiness-api.test.ts` now locks summary/health authority parity over HTTP.

### SP47-D — Explicit backend repair mutations

- `apps/runtime-host-bridge/src/index.ts` now exposes explicit `reconnectProviderAccount()` and `updateProviderApiKey()` mutations instead of forcing repair flows through the generic upsert contract.
- Reconnect repair now targets an existing OAuth account id, reuses the current pending device-auth session when one is already active, and does not require the caller to resubmit account bindings or model selections.
- API-key repair now targets an existing API-key account id, persists canonical `local-file` credential storage for inline replacement keys, and preserves account identity, allowed models, role bindings, and existing endpoint associations.
- Repair mutations are now serialized per provider account id so overlapping reconnect/update-key attempts fail with a clear conflict instead of racing into mixed-state writes.
- Credential-file repair writes now validate the next account shape before persisting the new key and persist credential payloads through temp-file rename semantics so interrupted writes do not replace the last-known-good credential file with a partial payload.
- Exact runtime-config/manual account-id collisions now merge into one logical account: manual scopes and mutable credential fields stay authoritative, runtime-config contributes bounded model coverage, and lifecycle provenance records both `manual` and `runtime-config`.
- `startBridgeServer()` now exposes explicit repair endpoints at `/api/role-model/accounts/repair/reconnect` and `/api/role-model/accounts/repair/update-key`.
- `apps/runtime-ui/app/lib/runtime-api.ts` now publishes `reconnectRuntimeAccount()` and `updateRuntimeAccountApiKey()` client helpers, and `apps/runtime-ui/app/routes/providers.tsx` maintenance actions now call those helpers instead of generic repair shims.
- `apps/runtime-host-bridge/test/account-repair.test.ts` now locks reconnect session reuse, identity/binding-preserving API-key repair, and overlapping repair rejection without partial mutation.
- `apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` now locks exact-id collision merge/provenance behavior for runtime-config/manual `moonshot.litellm` accounts.
- `apps/runtime-ui/app/lib/runtime-api.test.ts` and `apps/runtime-ui/app/lib/design-system.test.ts` now lock the explicit client endpoint contract and route-level repair API adoption.

### SP47-E — Readiness consumer migration and archived diagnostics

- `apps/runtime-ui/app/lib/view-models.ts` now exposes canonical lifecycle banner, account-row, and archived-artifact helpers so readiness surfaces present authority posture and archived stale diagnostics from the backend contract instead of route-local inference.
- `apps/runtime-ui/app/lib/view-models.ts` now also exposes provider-maintenance rows so Providers saved-account cards consume canonical lifecycle badges, normalized credential posture, source provenance, and repair actions from backend-owned lifecycle records.
- `apps/runtime-ui/app/routes/providers.tsx` now renders saved-account maintenance cards from canonical lifecycle rows, replaces raw backend labels with normalized credential posture, and surfaces archived stale artifacts only in a bounded diagnostics section.
- `apps/runtime-ui/app/routes/runtime.tsx` now presents canonical execution-readiness authority plus archived stale counts from the lifecycle contract.
- `apps/runtime-ui/app/routes/session-readiness.tsx` now renders a dedicated canonical lifecycle section with blocking account diagnostics and a separate archived stale diagnostics section.
- `apps/runtime-ui/app/routes/workbench.tsx` and `apps/runtime-ui/app/routes/studio-advanced.tsx` now show canonical lifecycle authority, blocking readiness rows, and archived stale counts in their execution-readiness banners.
- `apps/runtime-ui/app/lib/view-models.test.ts` now locks lifecycle authority, blocking account diagnostics, and archived stale artifact helpers.
- `apps/runtime-ui/app/lib/design-system.test.ts` now locks route-level adoption across Providers, Runtime, Session readiness, Workbench, and Studio Advanced.

## TDD Compliance Log

TDD Mode: `strict`

TDD Compliance: PASS
TDD Scope Note: SP47-A through SP47-E plus closeout remediation slices

RED evidence:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-a-provider-maintenance-contract.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-a-api-key-maintenance-modal.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-a-oauth-reconnect.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-b-summary-contract.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-b-view-model-lifecycle.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-c-expired-pending-auth.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-c-pending-poll-failure.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-c-health-authority.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-c-pending-priority.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-c-expired-oauth-refresh.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-d-repair-mutations.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-d-runtime-ui-repair.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-e-readiness-ui.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-providers-canonical-maintenance.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-orphan-reconciliation.red.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-logical-account-merge.red.log`

GREEN evidence:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-a-provider-maintenance-contract.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-a-api-key-maintenance-modal.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-a-oauth-reconnect.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-b-summary-contract.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-b-view-model-lifecycle.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-c-expired-pending-auth.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-c-pending-poll-failure.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-c-health-authority.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-c-pending-priority.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-c-expired-oauth-refresh.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-d-repair-mutations.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-d-runtime-ui-repair.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-e-readiness-ui.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-providers-canonical-maintenance.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-orphan-reconciliation.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-logical-account-merge.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-repair-atomicity.green.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-host-bridge-focused-validation.green.log`

Cycle summary:
- SP47-A / maintenance buttons: failing design-system assertion added before saved-account `Reconnect` / `Update API key` affordances were rendered.
- SP47-A / API-key modal: failing design-system assertion added before dialog structure and save/cancel controls were implemented.
- SP47-A / OAuth reconnect: failing design-system assertion added before the dedicated saved-account reconnect handler was introduced.
- SP47-B / summary contract: failing host-bridge tests added before `credentialLifecycle` existed on the runtime summary read path and HTTP API.
- SP47-B / helper migration: failing runtime-ui `view-models` tests added before shared readiness/provider helpers preferred canonical lifecycle counts and rollups.
- SP47-C / expired pending auth: failing restart regression added before expired pending device-auth rows were excluded from blocking counts and surfaced as archived diagnostics.
- SP47-C / bootstrap failure accounting: failing restart regression added before credentials-stage poll failures were counted and surfaced as `degraded`.
- SP47-C / health authority parity: failing `/healthz` regression added before health exposed the same lifecycle-authority object as runtime summary.
- SP47-C / deterministic pending selection: failing restart regression added before startup polling sorted pending sessions by earliest expiry and surfaced the deferred session count.
- SP47-C / expired OAuth refresh: failing restart regression added before failed startup refresh moved accounts into canonical `expired-auth` posture.
- SP47-D / backend repair mutations: failing host-bridge tests added before explicit reconnect/update-key mutations existed for saved accounts.
- SP47-D / runtime-ui repair adoption: failing runtime-api and route-contract tests added before Providers maintenance handlers called the explicit repair endpoints.
- SP47-E / readiness UI migration: failing helper and route-contract tests added before Runtime, Session readiness, Workbench, and Studio Advanced consumed canonical lifecycle authority and archived stale diagnostics.
- Providers canonical maintenance closeout: failing helper and route-contract tests added before saved-account cards consumed canonical lifecycle rows, normalized storage posture, and bounded archived stale diagnostics.
- Orphan reconciliation closeout: failing restart regressions added before invalid persisted accounts, orphan device-auth rows, and orphan credential files were archived instead of remaining active lifecycle state.
- Logical-account merge closeout: failing unified-runtime-config regression added before exact-id runtime-config/manual collisions preserved manual authority and emitted mixed provenance.
- Repair atomicity closeout: overlapping repair regression added before per-account repair serialization and validate-then-persist credential writes were enforced.

## Verification So Far

- Runtime UI package regression suites:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-a-runtime-ui-package.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-b-runtime-ui-package.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-d-runtime-ui-package.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-e-runtime-ui-package.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-providers-runtime-ui-package.green.log`
- Host-bridge lifecycle/summary regression slice:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-b-host-bridge-summary.green.log`
- Host-bridge bootstrap reconciliation suite:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-c-host-bridge-bootstrap.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-d-host-bridge.green.log`
- Host-bridge closeout remediation suites:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-orphan-reconciliation.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-logical-account-merge.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-repair-atomicity.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-host-bridge-focused-validation.green.log`
- Host-bridge build verification:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-host-bridge-focused-validation.green.log`
- Fresh Phase 3 reconciliation reruns on the current worktree:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-reconcile-runtime-ui.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-reconcile-host-bridge.green.log`
- Full Phase 3 lock-review validation floor on the current worktree:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-lock-sqlite-memory.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-lock-host-bridge-focused.green.log`
- Broader host-bridge package reruns were attempted, but the suite remains blocked by pre-change failures already recorded in Phase 1 (`test/benchmark-runner-compare.test.ts`, `test/executable.test.ts`). During rerun, a stale readiness assertion in `test/index.test.ts` was updated to match the canonical lifecycle contract and now passes in isolation.

## Plan Deviations

- No product-scope deviation so far.
- SP47-C now handles expired pending device-auth rows as archived stale artifacts, publishes health authority parity, and surfaces failed startup refresh as explicit `expired-auth`.
- SP47-C now also archives invalid persisted accounts, orphan device-auth rows, and orphan credential files during restart reconciliation.
- SP47-D landed the explicit saved-account repair contract.
- SP47-D closeout also added per-account repair serialization, validate-then-persist credential writes, and exact-id runtime-config/manual logical-account merge rules.
- SP47-E now covers Providers alongside Runtime, Session readiness, Workbench, and Studio Advanced on canonical lifecycle/readiness helpers.
- Phase 3 diff/coverage reconciliation is now complete against the current worktree state: the normalized tracked diff remains limited to the planned product files, `test/account-repair.test.ts` remains the one intentional untracked product file, and the `.react-router/types/**` plus `vendor/llama-swap/dist-assets/` trees remain incidental generated verification artifacts outside the product-scope coverage set.

## Implementation Evidence

- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/package.json`
- `role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`
- `role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- `role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`

## Worktree Diff Audit

- Baseline: `dee829410458d03cef7e98fff7bda4472dec5fa9`
- Comparison: worktree `HEAD` plus current product edits
- Normalized diff command: `git diff --name-only dee829410458d03cef7e98fff7bda4472dec5fa9`
- Intentional untracked product file: `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts` remains part of the Phase 3 scope and evidence set even though it is not listed by the normalized tracked-file diff.
- Incidental generated verification artifacts currently present in the worktree:
  - `role-model-router/apps/runtime-ui/.react-router/types/**`
  - `role-model-router/vendor/llama-swap/dist-assets/`
- Those generated artifacts came from local verification/build steps and are not part of the intended product-scope requirement coverage for run 47.
- Current intentional product files now cover:
  - SP47-A runtime-ui design-system/providers maintenance files
  - SP47-B host-bridge runtime summary contract
  - SP47-B runtime-ui typed contract, helper migration, and Endpoints wiring
  - SP47-C host-bridge stale-auth cleanup, authority publication, and expired-refresh lifecycle handling
  - SP47-C closeout archival of invalid persisted accounts, orphan device-auth rows, and orphan credential files
  - SP47-D explicit host-bridge repair mutations plus Providers/runtime-api adoption
  - SP47-D closeout serialization/atomicity updates and exact-id runtime-config/manual account merge handling
  - SP47-E runtime-ui lifecycle authority and archived diagnostics migration across Providers, Runtime, Session readiness, Workbench, and Studio Advanced

## Requirement Completion Status

| ID | Status | Changed Files | Verification Evidence |
| --- | --- | --- | --- |
| R0 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/backend-unified-runtime-config.test.ts`, `test/account-repair.test.ts`, `app/lib/runtime-api.ts`, `app/lib/view-models.ts`, `app/routes/providers.tsx`, `app/routes/runtime.tsx`, `app/routes/session-readiness.tsx`, `app/routes/workbench.tsx`, `app/routes/studio-advanced.tsx` | provider-neutral lifecycle/repair RED/GREEN logs; focused host-bridge suite; runtime-ui package suites |
| R1 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `app/lib/runtime-api.ts`, `app/lib/view-models.ts`, `app/routes/endpoints.tsx` | SP47-B RED/GREEN logs; host-bridge summary suite; runtime-ui package suites |
| R2 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/session-readiness-api.test.ts`, `test/restart-rehydration.test.ts` | SP47-B, SP47-C, and orphan-reconciliation RED/GREEN logs; focused host-bridge validation |
| R3 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `app/lib/view-models.ts`, `app/lib/view-models.test.ts` | SP47-B RED/GREEN logs; runtime-ui package suite |
| R4 | implemented_pending_phase5 | `app/lib/view-models.ts`, `app/lib/view-models.test.ts`, `app/routes/providers.tsx`, `app/routes/runtime.tsx`, `app/routes/session-readiness.tsx`, `app/routes/workbench.tsx`, `app/routes/studio-advanced.tsx`, `app/lib/design-system.test.ts` | SP47-E + providers-maintenance RED/GREEN logs; runtime-ui package suites |
| R5 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/account-repair.test.ts`, `app/lib/runtime-api.ts`, `app/lib/runtime-api.test.ts`, `app/routes/providers.tsx` | SP47-D RED/GREEN logs; repair-atomicity green; runtime-ui package suite |
| R6 | implemented_pending_phase5 | `apps/runtime-ui/DESIGN_SYSTEM.md`, `app/lib/design-system.test.ts`, `app/lib/view-models.ts`, `app/lib/view-models.test.ts`, `app/routes/providers.tsx`, `apps/runtime-host-bridge/src/index.ts`, `test/account-repair.test.ts` | SP47-A + SP47-D + providers-maintenance RED/GREEN logs; focused host-bridge validation |
| R7 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/restart-rehydration.test.ts` | SP47-C bootstrap green; orphan-reconciliation green; focused host-bridge validation |
| R8 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/session-readiness-api.test.ts`, `app/routes/runtime.tsx`, `app/routes/session-readiness.tsx`, `app/routes/workbench.tsx`, `app/routes/studio-advanced.tsx` | SP47-C health-authority RED/GREEN logs; SP47-E route adoption logs |
| R9 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/restart-rehydration.test.ts` | orphan-reconciliation RED/GREEN logs; focused host-bridge validation |
| R10 | pending_phase5 | `Phase 5 only` | rebuilt-runtime rebuild/launch verification not started yet |
| R11 | implemented_pending_phase5 | `apps/runtime-ui/DESIGN_SYSTEM.md`, `app/lib/design-system.test.ts`, `app/routes/providers.tsx`, `app/lib/view-models.ts` | SP47-A + SP47-E + providers-maintenance RED/GREEN logs; runtime-ui package suites |
| R12 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/account-repair.test.ts`, `app/lib/runtime-api.ts`, `app/lib/runtime-api.test.ts`, `app/routes/providers.tsx` | SP47-D RED/GREEN logs; repair-atomicity green; runtime-ui package suite |
| R13 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/account-repair.test.ts`, `package.json` | repair-atomicity green; focused host-bridge validation; package test now includes `account-repair.test.ts` |
| R14 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/restart-rehydration.test.ts`, inherited Phase 1 refs | SP47-C bootstrap/orphan greens; final rebuilt-runtime proof pending Phase 5 |
| R15 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `app/lib/view-models.ts`, `app/lib/view-models.test.ts`, `app/routes/endpoints.tsx`, `app/routes/providers.tsx`, `app/routes/runtime.tsx`, `app/routes/session-readiness.tsx`, `app/routes/workbench.tsx`, `app/routes/studio-advanced.tsx` | SP47-B + SP47-E + providers-maintenance RED/GREEN logs; runtime-ui package suites; host-bridge summary/bootstrap suites |
| R16 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `test/backend-unified-runtime-config.test.ts`, `test/account-repair.test.ts` | logical-account-merge RED/GREEN logs; focused host-bridge validation |
| R17 | implemented_pending_phase5 | `apps/runtime-host-bridge/src/index.ts`, `app/lib/runtime-api.ts`, `app/lib/view-models.ts`, `app/routes/endpoints.tsx`, `app/routes/providers.tsx`, `app/routes/runtime.tsx`, `app/routes/session-readiness.tsx`, `app/routes/workbench.tsx`, `app/routes/studio-advanced.tsx`, plus SP47-A UI contract files | strict RED/GREEN evidence recorded above |

Notes:
- The canonical summary contract, orphan/stale archival rules, explicit repair mutations, logical-account merge rules, and all in-scope readiness/maintenance route migrations now exist; remaining work is final Phase 3 audit/lock work and later rebuilt-runtime verification.
- Phase 3 implementation coverage is complete; final requirement disposition still depends on Phase 5 rebuilt-runtime proof and the Phase 1-recorded pre-change host-bridge package failures remain outside this run scope.

## Audit Verdict

- Audit summary: the implementation matches the locked requirements and Phase 2 plan for the Phase 3 scope by delivering provider-neutral lifecycle authority, stale-state archival, explicit repair mutations, deterministic exact-id cross-source merges, and canonical readiness consumer migration, while the full planned pre-Phase-5 validation floor now passes on the worktree except for the Phase 1-recorded package carve-outs that remain explicitly out of scope for this run.
Audit: PASS

## Traceability

- R0 -> SP47-B, SP47-D, SP47-E | provider-neutral lifecycle authority, repair mutations, and readiness-surface migration are evidenced by the recorded RED/GREEN logs plus `sp47-phase3-lock-host-bridge-focused.green.log`.
- R1 -> SP47-B, SP47-C | canonical ownership/read paths are evidenced by the summary contract, SQLite-first restore behavior, and `sp47-phase3-lock-host-bridge-focused.green.log`.
- R2 -> SP47-C | stale transient reconciliation, orphan archival, and deterministic startup accounting are evidenced by restart/health RED-GREEN logs and `sp47-phase3-lock-host-bridge-focused.green.log`.
- R3 -> SP47-B, SP47-C | canonical lifecycle states, counts, and rollups are evidenced by summary-contract logs, runtime-ui lifecycle tests, and `sp47-phase3-lock-host-bridge-focused.green.log`.
- R4 -> SP47-A, SP47-E | all in-scope readiness consumers moved onto the canonical contract, evidenced by runtime-ui package tests and providers/runtime/session/workbench/studio route adoption.
- R5 -> SP47-A, SP47-D, SP47-E | reconnect/update-key UX and explicit repair mutations are evidenced by design-system tests, runtime-api tests, `test/account-repair.test.ts`, and `sp47-phase3-lock-host-bridge-focused.green.log`.
- R6 -> SP47-B, SP47-D, SP47-E | normalized storage-mode/backend behavior is evidenced by provider-maintenance logs, runtime-ui package tests, and focused host-bridge repair validation.
- R7 -> SP47-C | restart rehydration continuity for implemented code paths is evidenced by `test/restart-rehydration.test.ts`, `test/validate-restart-rehydration.test.ts`, and `sp47-phase3-lock-host-bridge-focused.green.log`; packaged-runtime proof remains Phase 5 work.
- R8 -> SP47-C, SP47-E | authority semantics and diagnostics are evidenced by summary/health parity tests plus canonical readiness UI adoption.
- R9 -> SP47-C | legacy-state archival and corrupt/orphan handling are evidenced by orphan-reconciliation logs, corrupt operator-intent bootstrap tests, and focused host-bridge validation.
- R10 -> SP47-F pending | Phase 3 has satisfied the preconditions for rebuilt-runtime proof via strict RED/GREEN evidence, `sp47-phase3-lock-sqlite-memory.green.log`, runtime-ui regression logs, and `sp47-phase3-lock-host-bridge-focused.green.log`.
- R11 -> SP47-A, SP47-E | design-system-first sequencing is evidenced by `DESIGN_SYSTEM.md`, design-system tests, and downstream route adoption.
- R12 -> SP47-D | explicit backend repair mutation semantics are evidenced by dedicated repair endpoints, runtime-api helpers, and `test/account-repair.test.ts`.
- R13 -> SP47-C, SP47-D | repeatability, concurrency rejection, and atomic credential-write behavior are evidenced by repair-atomicity logs and focused host-bridge validation.
- R14 -> SP47-C, SP47-F pending | prior-run continuity is preserved by the restart/readiness-focused regression floor; rebuilt packaged-runtime non-regression proof remains Phase 5 work.
- R15 -> SP47-B, SP47-E | backend-owned lifecycle/readiness truth is evidenced by `credentialLifecycle`, provider rollups, runtime-ui consumer migration, and focused host-bridge validation.
- R16 -> SP47-B, SP47-D | exact-id logical-account merge/provenance behavior is evidenced by `test/backend-unified-runtime-config.test.ts`, repair serialization behavior, and focused host-bridge validation.
- R17 -> SP47-A, SP47-B, SP47-E | summary/runtime-api/view-model/route migration is evidenced by the recorded RED/GREEN receipts plus current runtime-ui and focused host-bridge reruns.

## Coverage Gate

- [x] SP47-A product changes have corresponding RED/GREEN evidence
- [x] Implemented SP47-B summary/helper slices have corresponding RED/GREEN evidence
- [x] Implemented SP47-C bootstrap slices have corresponding RED/GREEN evidence
- [x] Implemented SP47-D repair slices have corresponding RED/GREEN evidence
- [x] Implemented SP47-E readiness-surface slices have corresponding RED/GREEN evidence
- [x] Runtime-ui and relevant host-bridge regression coverage re-ran after the slice
- [x] The Phase 2 planned validation floor now passes on the worktree for `sqlite-memory`, `runtime-ui`, and the focused host-bridge suite
- [x] Remaining Phase 3 implementation sub-phases are complete
- [x] Phase 3 diff/coverage reconciliation is complete

Coverage: PASS

## Approval Gate

- [x] SP47-A follows the locked plan and design-system-first ordering
- [x] Implemented SP47-B slices follow the locked plan and keep `readinessSummary` as a compatibility alias
- [x] Implemented SP47-C slices follow the locked plan by making stale transient auth non-blocking and surfacing startup poll failures explicitly
- [x] Implemented SP47-D slices follow the locked plan by moving saved-account repair flows onto explicit backend mutations
- [x] Full Phase 3 implementation sub-phases are complete
- [x] Phase 3 artifact reconciliation is complete against the current worktree diff and fresh focused validation reruns
- [x] Phase 3 lock review completed against the locked requirements, locked Phase 2 plan, current worktree diff, and the full planned validation floor

Approval: PASS
