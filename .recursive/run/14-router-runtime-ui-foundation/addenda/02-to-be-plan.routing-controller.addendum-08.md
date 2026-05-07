Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T11:35:20Z`
LockHash: `8396c3658a18c8c8948d941b0f50be7fea18cc58892d39332a97c5f5f7362f25`
Workflow version: `recursive-mode-audit-v1`
Addendum: `08`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.runtime-ia-redesign.addendum-07.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.routing-controller.addendum-08.md`
Scope note: This addendum records the run-14 planning slice that introduces an explicit controller selection surface into the redesigned runtime shell.

## TODO

- [x] Standardize the operator-facing naming for the new controller surface
- [x] Define the route, interaction rule, and bridge contract for controller assignment
- [x] Capture sequencing and validation expectations for this extra scope
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Naming Decision

- Operator-facing term: **Controller**
- Rejected term: `Judge`
- Reason: the runtime surface needs a concrete operational selector for the endpoint/model pair currently acting as the controller; `Controller` is clearer and matches the intended control-plane semantics.

## Interaction Rule For Controller Assignment

- The controller is an explicit **endpoint/model pair**, not only a model id
- The first slice supports one global controller assignment for the whole runtime
- Controller selection must remain honest about health/tooling posture so operators do not assign an unusable endpoint
- Controller reads and writes belong to bridge-owned `/api/role-model/*` control-plane routes rather than client-local state

## Planned Route And API Contract

- New route: `/app/control/controller`
- Required layout contract:
  - current assigned controller summary
  - candidate endpoint/model inventory
  - health and tooling posture visibility
  - explicit assignment action
- Preferred bridge API:
  - `GET /api/role-model/controller`
  - `PATCH /api/role-model/controller`
- Future follow-on surfaces may add:
  - diagnostics
  - activity
  - policy constraints

## Sequencing And Constraints

1. Persist controller assignment in runtime-owned storage before exposing optimistic UI writes
2. Add bridge read/write routes before wiring the page to live snapshot data
3. Fold controller posture into the hierarchical shell alongside `Control > Models`

## Validation Plan

- `corepack pnpm --filter @role-model-router/sqlite-memory test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter runtime-ui test`
- `corepack pnpm run runtime:validate-ui`

## Traceability

- R3 operator control surfaces must include an explicit controller assignment path
- R5 runtime shell hierarchy must expose controller management under `Control`

## Coverage Gate

- [x] Naming, route placement, and API seams are explicit
- [x] Controller interaction rules are defined as endpoint/model assignment
- [x] Focused validation expectations are recorded

Coverage: PASS

## Approval Gate

- [x] The addendum names the concrete control-plane scope
- [x] Sequencing is clear where backend and UI work are coupled
- [x] The addendum is ready to guide implementation and validation receipts

Approval: PASS
