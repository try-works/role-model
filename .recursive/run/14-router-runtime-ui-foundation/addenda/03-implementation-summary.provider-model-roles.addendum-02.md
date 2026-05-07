Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `03 Implementation`
Status: `LOCKED`
LockedAt: `2026-05-07T11:35:23Z`
LockHash: `c67eda73889928aeb1566225d151cc4529436e86444d5688f98530f35a48ca4d`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-model-roles.addendum-02.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.provider-config-gap.addendum-01.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.provider-model-roles.addendum-02.md`
Scope note: This addendum records the implementation-side repair for the remaining run-14 provider-configuration gap: provider accounts now persist model-role assignments, the runtime host exposes a role catalog, and runtime-managed endpoints carry those assigned roles forward.

## TODO

- [x] Record the additional implementation scope without rewriting locked Phase 3 history
- [x] Capture the new provider-account, persistence, backend, and UI role-binding surfaces
- [x] Record strict TDD evidence for the extra scope
- [x] Attach the focused validation evidence paths
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - The original run-14 implementation receipt and `addendum-01` remain historically correct, but they still left one locked requirement unmet: operators could choose models, yet they could not assign runtime roles to those models.
  - The worktree now closes that remaining gap in four places:
    1. **Provider accounts persist model-role bindings** instead of stopping at `allowedModels`.
    2. **The host bridge exposes a runtime role catalog** so the UI uses runtime-owned role metadata rather than hardcoded frontend guesses.
    3. **Runtime-managed endpoints surface assigned roles** so activation no longer loses the operator’s role intent.
    4. **The runtime derives dynamic role bindings for activated endpoints** from the stored account/model-role configuration.
- Remediation applied:
  - Extended `provider-account` with:
    - `modelRoleBindings`
    - validation for unknown roles, duplicate bindings, empty role sets, and model/role mismatches
  - Extended `sqlite-memory` with:
    - `model_role_bindings_json` persistence on `provider_accounts`
    - compatibility handling for reused databases that predate the new column
  - Extended `runtime-host-bridge` with:
    - `/api/role-model/roles`
    - role-aware account validation for both account upsert and Kimi device-auth start
    - runtime role summaries surfaced from the bridge
    - runtime endpoint responses and endpoint list rows that include assigned role ids
    - derived runtime role bindings for runtime-managed endpoints
  - Updated `runtime-ui` data/client surfaces with:
    - role catalog reads in `fetchRuntimeSnapshot(...)`
    - account and endpoint types that include model-role bindings and role ids
  - Repaired the runtime UI route surfaces:
    - `/app/accounts` now renders role choices per selected model and persists them with the account payload
    - `/app/endpoints` now shows the assigned roles for the selected model and the activated registry rows
- Changed files:
  - `/role-model-router/packages/provider-account/src/index.ts`
  - `/role-model-router/packages/provider-account/test/index.test.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- TDD evidence:
  - RED:
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/provider-account-model-roles.addendum-02.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/sqlite-memory-model-roles.addendum-02.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-ui-model-roles.addendum-02.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-host-model-roles.addendum-02.log`
  - GREEN:
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/provider-account-model-roles.addendum-02.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/sqlite-memory-model-roles.addendum-02.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-ui-model-roles.addendum-02.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-host-model-roles.addendum-02.log`
    - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-validators-model-roles.addendum-02.log`

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-model-roles.addendum-02.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.provider-config-gap.addendum-01.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- Additional implementation categories captured:
  - persisted model-role bindings
  - runtime role catalog surfacing
  - role-aware endpoint activation visibility
  - derived runtime role bindings for activated endpoints
- Evidence attached:
  - focused RED/GREEN logs
  - changed-file list

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The implementation delta is preserved in the run-local addenda set
  - [x] The provider-account/persistence/backend/UI seams are named concretely
  - [x] The TDD evidence paths are attached
  - [x] The role-catalog and endpoint-role behavior are recorded explicitly
- Remaining blockers:
  - none at the focused implementation level for this repair slice

Approval: PASS
