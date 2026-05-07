Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `04 Test Summary`
Status: `LOCKED`
LockedAt: `2026-05-07T11:35:26Z`
LockHash: `38b3dd8e1663083fd3c8f3f68b556ac659c2868ff73732fd642a2077037119e1`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/04-test-summary.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.provider-model-roles.addendum-02.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-model-roles.addendum-02.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/04-test-summary.provider-model-roles.addendum-02.md`
Scope note: This addendum records the focused validation rerun for the remaining model-role-assignment repair: the earlier run-14 receipts proved the shell and executable onboarding, while this addendum proves that model-role bindings persist cleanly, surface through the control plane, and remain visible at endpoint activation time.

## TODO

- [x] Record why the original validation receipts are insufficient for this extra scope
- [x] Attach the focused rerun command chain and outcomes
- [x] Attach the durable evidence paths
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - The locked Phase 4 receipt and `addendum-01` validation chain did not validate role-aware account configuration because model-role assignment did not exist yet.
  - The focused rerun needed to prove:
    - provider-account validation for model-role bindings
    - SQLite round-trip persistence of `modelRoleBindings`
    - runtime API snapshot reads that include the role catalog and account model-role bindings
    - host bridge control-plane surfacing of `/api/role-model/roles`
    - runtime-backed UI validation proving both role catalog availability and persisted role assignment on the upserted Moonshot account
- Focused rerun results:
  - `corepack pnpm --filter @role-model-router/provider-account test`: PASS
  - `corepack pnpm --filter @role-model-router/provider-account build`: PASS
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`: PASS
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`: PASS
  - `corepack pnpm --filter @role-model-router/runtime-ui test`: PASS
  - `corepack pnpm --filter @role-model-router/runtime-ui build`: PASS
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`: PASS
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`: PASS
  - `corepack pnpm run runtime:validate-ui`: PASS
  - `corepack pnpm run runtime:validate-host`: PASS
  - `corepack pnpm run runtime:validate-operations`: PASS
- Runtime-backed validator delta:
  - `runtime:validate-ui` now proves role-aware account setup by returning:
    - `availableRoleIds` containing:
      - `classifier`
      - `coder.patch`
      - `coder.review`
      - `developer`
      - `embedder`
      - `general.chat`
      - `language.detector`
      - `tool.agent`
    - `accountRoleBindingIncludesUpsert: true`
    - `activatedEndpointId: "moonshot.personal.primary.global.kimi-k2.5"`
    - `endpointListIncludesActivation: true`
- Durable evidence:
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/provider-account-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/sqlite-memory-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-ui-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/red/runtime-host-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/provider-account-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/sqlite-memory-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-ui-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-host-model-roles.addendum-02.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/green/runtime-validators-model-roles.addendum-02.log`

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/14-router-runtime-ui-foundation/04-test-summary.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/addenda/03-implementation-summary.provider-model-roles.addendum-02.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.provider-model-roles.addendum-02.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- Validation compensation captured:
  - focused package tests
  - focused package builds
  - runtime validators
  - role-aware account proof in `runtime:validate-ui`

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The insufficiency of the prior validation receipts is explicit
  - [x] The focused rerun command chain is recorded
  - [x] The final outcomes are recorded
  - [x] Durable evidence paths are attached
- Remaining blockers:
  - none at the focused validation level for this repair slice

Approval: PASS
