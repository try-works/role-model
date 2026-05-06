Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 TO-BE PLAN`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
- `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/testdata/router-runtime/provider-presets.json`
- `/testdata/router-runtime/registry-sources.json`
- `https://github.com/MoonshotAI/kimi-cli/blob/17938161923c6f7550c9f291ff15ed5b1cacc1a9/src/kimi_cli/auth/oauth.py`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-config-gap.addendum-01.md`
Scope note: This addendum records the post-closeout expansion required after live run-14 operator testing showed that the shipped runtime UI exposes provider metadata but still does not let an operator actually complete Kimi device OAuth, choose provider models, or materialize usable Moonshot/Kimi endpoints from the UI.

## TODO

- [ ] Record the concrete gap between the locked run-14 plan and the currently shippable operator flow
- [ ] Map each missing operator capability to a concrete backend/UI remediation slice
- [ ] Preserve execution ordering and dependency notes for the repair
- [ ] Capture the focused validation chain required for the extra scope
- [ ] Refresh the paired Phase 3 and Phase 4 artifacts with addenda after implementation lands
- [ ] Complete Coverage Gate checklist
- [ ] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - The locked run-14 plan accurately delivered the runtime UI foundation, but live operator testing exposed a remaining product gap inside the same user-facing area: the control-plane surfaces are mostly descriptive, not executable, for Moonshot/Kimi onboarding.
  - The current repo state proves four specific gaps:
    1. `providers.tsx` only renders provider and OAuth metadata; it has no executable onboarding action.
    2. `accounts.tsx` saves a structural provider-account record, but it hardcodes model selection from the preset and does not run device OAuth.
    3. `endpoints.tsx` only lists the current registry and exposes no activation/materialization flow.
    4. `runtime-host-bridge/src/index.ts` exposes account upsert and endpoint list reads only; it has no device-auth, model-configuration, or endpoint-activation mutation path.
  - `endpoint-registry/src/index.ts` still derives cloud endpoints from static `registry-sources.json`, so saving a new Moonshot/Kimi account alone does not create a usable endpoint row for the runtime.
  - The Kimi flow should follow the real Moonshot device-auth contract from `kimi-cli` rather than a placeholder:
    - device authorization: `POST https://auth.kimi.com/api/oauth/device_authorization`
    - token polling/refresh: `POST https://auth.kimi.com/api/oauth/token`
    - request headers derived from the Kimi device metadata contract
    - file-backed persisted OAuth token material rather than success-shaped fake state
- Remediation slices:
  1. **Executable Kimi device OAuth backend**
     - Extend `runtime-host-bridge` with device-auth start/poll routes for the Kimi variant, using the provider preset metadata plus the real Kimi request shape.
     - Persist the resulting token material in runtime-owned local storage referenced through `local-encrypted-file`-style credential refs; do not return raw tokens from UI APIs.
     - Record connection state explicitly so the UI can distinguish pending authorization, connected, expired, and refresh-failing states.
  2. **Operator-editable provider account model selection**
     - Extend the account mutation/read model so an operator can choose allowed models instead of inheriting the full preset list silently.
     - Surface the effective model set, auth state, and connection health in the runtime account response.
     - Preserve validation through `provider-account` rather than inventing a UI-only schema.
  3. **Runtime-managed endpoint materialization**
     - Add a runtime-owned mutable endpoint source or activation layer persisted in `sqlite-memory`.
     - Merge that dynamic layer with the existing fixture/source-driven endpoint registry so new Moonshot/Kimi endpoints appear immediately after configuration.
     - Allow the operator to activate an endpoint from a provider account + model + region/base-URL combination without editing repo fixtures.
  4. **UI route repair for executable onboarding**
     - Upgrade `/app/providers` from a metadata catalog to an onboarding entry surface.
     - Upgrade `/app/accounts` to support model selection and Kimi OAuth connection state/actions.
     - Upgrade `/app/endpoints` to support endpoint activation/materialization and show the resulting runtime-managed entries.
  5. **Focused revalidation and receipt refresh**
     - Add failing tests first for the new host bridge APIs, SQLite persistence helpers, registry materialization, and runtime API client behavior.
     - Re-run the focused runtime-ui/runtime-host validation chain after the repair.
     - Record the resulting product diff in paired Phase 3 and Phase 4 addenda rather than rewriting locked history.
- Sequencing and dependency notes:
  - The device OAuth backend must land before the UI can honestly expose a Kimi connect action.
  - The mutable endpoint layer must land before the endpoints page can prove that configured accounts become usable runtime endpoints.
  - Account model-selection support should land before endpoint activation so activation works from effective user-chosen models rather than preset defaults only.
- Focused validation chain for this extra scope:
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm --filter @role-model-router/endpoint-registry test`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`
  - `corepack pnpm --filter @role-model-router/endpoint-registry build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-operations`
  - `corepack pnpm run schemas:validate`
- Impact on phase output:
  - `02-to-be-plan.md` remains the historically correct locked foundation plan for the original run-14 slice.
  - This addendum becomes the authoritative plan supplement for the newly requested executable provider/model configuration work.
  - Phase 3-8 artifacts should be supplemented with paired addenda for this extra scope once implementation and validation complete.

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- Operator gap categories captured:
  - missing executable Kimi device OAuth flow
  - missing operator-controlled model selection
  - missing runtime-managed endpoint materialization
  - missing executable onboarding actions in the runtime UI
- Revalidation obligations captured:
  - focused package tests/builds
  - runtime validators
  - schema validation

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The post-closeout product gap is preserved in the run-local addenda set
  - [x] Each missing operator capability is mapped to a concrete remediation slice
  - [x] Execution ordering is explicit where the repair is coupled
  - [x] Focused validation and later artifact-refresh work are included
- Remaining blockers:
  - Kimi device OAuth backend is not yet implemented in the worktree
  - operator model selection is still preset-driven
  - runtime-managed endpoint activation/materialization does not exist yet

Approval: PASS
