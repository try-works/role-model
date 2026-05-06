Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 TO-BE PLAN`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-config-gap.addendum-01.md`
- `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-model-roles.addendum-02.md`
Scope note: This addendum records the second post-closeout repair inside the same run-14 operator surface: the original runtime UI repair made provider onboarding executable, but it still did not satisfy the locked run-14 requirement that operators be able to assign runtime roles to the models they enable for each provider account.

## TODO

- [x] Record the remaining gap between the run-14 requirements and the current operator flow
- [x] Map model-role assignment to concrete backend, persistence, and UI remediation slices
- [x] Preserve dependency and sequencing notes for the repair
- [x] Capture the focused validation chain for the extra scope
- [x] Refresh the paired Phase 3 and Phase 4 artifacts with addenda after implementation lands
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - `00-requirements.md` already required the initial operator surface to include **model-role assignment** alongside provider onboarding, account setup, endpoint activation, and model selection.
  - The first provider-configuration repair (`addendum-01`) closed the executable onboarding gap, but the live operator surface still stopped at `allowedModels`; there was no runtime-owned place to record or view the role intent for those models.
  - The current repo state before this addendum proved three concrete gaps:
    1. `/app/accounts` let the operator choose models, but not assign roles to the chosen models.
    2. `provider-account` and `sqlite-memory` had no persisted representation for model-role bindings.
    3. `runtime-host-bridge` exposed provider/account/endpoint control-plane APIs, but no role catalog read and no way to carry model-role assignments through account persistence or endpoint activation.
- Remediation slices:
  1. **Provider-account role-binding schema**
     - Extend the runtime-owned provider-account model with `modelRoleBindings`.
     - Validate that each binding targets an allowed model, has at least one unique role id, and only uses role ids exposed by the runtime role catalog.
  2. **SQLite persistence for role bindings**
     - Persist `modelRoleBindings` with provider accounts.
     - Maintain compatibility with existing runtime-state databases by adding the new column safely for reused workspaces.
  3. **Runtime role catalog and role-aware control plane**
     - Expose a control-plane role catalog at `/api/role-model/roles`.
     - Validate `modelRoleBindings` during account upsert and Kimi device-auth start.
     - Carry the assigned roles forward into endpoint activation responses and endpoint list reads.
  4. **Operator UI role assignment**
     - Upgrade `/app/accounts` so every selected model can receive one or more runtime roles from the live role catalog.
     - Upgrade `/app/endpoints` so the selected model’s assigned roles remain visible at activation time and on the registry table.
  5. **Runtime role-binding integration**
     - Derive runtime role bindings for runtime-managed endpoints from the persisted provider-account model-role assignments so the runtime can consume the operator intent later instead of treating it as UI-only metadata.
  6. **Focused revalidation**
     - Add failing tests first for provider-account validation, SQLite round-trip persistence, runtime API snapshot reads, host bridge control-plane routes, and runtime UI validation.
     - Re-run focused package tests/builds plus runtime validators after the repair.
- Sequencing and dependency notes:
  - Provider-account validation must land before the UI can persist model-role assignments honestly.
  - SQLite persistence must land before the host bridge can round-trip model roles across reloads.
  - The host role catalog must land before `/app/accounts` can expose operator role choices without hardcoded frontend lists.
  - Endpoint role surfacing should follow persisted account role bindings so the endpoints page reflects durable state rather than transient form state.
- Focused validation chain for this extra scope:
  - `corepack pnpm --filter @role-model-router/provider-account test`
  - `corepack pnpm --filter @role-model-router/provider-account build`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-operations`
- Impact on phase output:
  - The locked run-14 plan remains historically correct for the original foundation slice.
  - `addendum-01` remains the authoritative supplement for executable provider onboarding.
  - This addendum becomes the authoritative supplement for the still-missing model-role-assignment requirement inside the same operator surface.

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-config-gap.addendum-01.md`
- Remaining operator gap categories captured:
  - missing persisted model-role assignment
  - missing runtime role catalog surfacing
  - missing role-aware endpoint activation visibility
- Revalidation obligations captured:
  - focused package tests/builds
  - runtime validators

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The remaining run-14 requirement gap is preserved in the run-local addenda set
  - [x] Each missing capability is mapped to a concrete remediation slice
  - [x] Execution ordering is explicit where the repair is coupled
  - [x] Focused validation and later artifact refresh work are included
- Remaining blockers:
  - none at planning scope after this addendum

Approval: PASS
