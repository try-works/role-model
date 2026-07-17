Run: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/`
Phase: `02 TO-BE Plan`
Status: `DRAFT`
Addendum: `01`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/02-to-be-plan.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- current controller and eject implementation in:
  - `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
Outputs:
- this addendum
Scope note: Expand run 76 so ejecting a configured model that is explicitly referenced by `controller` no longer fails when the controller can be resolved deterministically from the post-eject runtime state. The fix must extend the configured-membership authority contract rather than adding a one-off controller branch, remain provider-agnostic, use strict TDD, and keep account-managed and runtime-config-managed eject behavior aligned.

## TODO

- [x] Record the controller-conflict gap left by run 76
- [x] Define a systematic reference-resolution extension instead of a special case
- [x] Define deterministic controller replacement and clear semantics
- [x] Keep account-managed and config-managed eject flows aligned
- [x] Define strict RED/GREEN implementation slices
- [x] Complete Coverage Gate and Approval Gate

## Problem Addendum

Run 76 correctly established that configured-model membership is authoritative and that explicit references must be handled deterministically before eject mutates membership. The remaining gap is that `controller` was classified only as an unconditional blocking explicit reference.

That is too strict. `controller` is backend-mediated runtime control-plane state with a deterministic convergence path. When the ejected model is the current controller, the runtime should resolve that explicit reference against the post-eject projected world instead of failing with `configured_model_reference_conflict: controller` and requiring a separate manual mutation first.

This addendum must refine the explicit-reference contract without weakening it:

- custom aliases remain explicit blocking references
- `difficultyClassifier` remains an explicit blocking reference
- `controller` becomes a resolved explicit reference with a documented reassignment-or-clear policy

## Fixed Decisions

1. `controller` is no longer an unconditional `block` reference during eject.
2. Explicit references now use a policy-driven resolution contract rather than a boolean blocking split.
3. `controller` is the first explicit reference to use `auto-reassign-or-clear`.
4. Replacement selection is derived from the post-eject projected registry and membership state.
5. If no surviving valid controller candidate exists, controller state is cleared and eject still succeeds.
6. The change must remain provider-agnostic and must not create separate account-managed versus config-managed semantics.

## Addendum Requirements

### `A1` Controller-backed eject must converge automatically

Description:
Eject should no longer fail solely because the target model is the active controller.

Acceptance criteria:
- eject of a controller-backed configured model does not fail solely because `controller` points at that model
- if a valid replacement exists after removal, controller is reassigned during the same lifecycle mutation
- if no valid replacement exists after removal, controller is cleared during the same lifecycle mutation
- no success result leaves the removed model still referenced by controller state

### `A2` Controller resolution must be projected from post-eject truth

Description:
Controller reassignment must be computed from the world that will exist after the configured membership is removed, not from stale pre-eject state.

Acceptance criteria:
- replacement selection excludes the target `{providerAccountId, modelId}` endpoints before resolution
- replacement selection reads from the surviving effective registry and controller-eligibility rules
- restart and rebuild after success preserve the reassigned or cleared controller outcome instead of resurrecting the removed model

### `A3` Replacement selection must be deterministic and reusable

Description:
The backend must expose one deterministic controller-resolution helper rather than embedding ad hoc ordering at individual call sites.

Acceptance criteria:
- the same projected state always yields the same controller resolution result
- the selection rule is documented and test-covered
- the helper is reusable by future explicit references that may need reassignment semantics

### `A4` Account-managed and runtime-config-managed eject must share the same resolution semantics

Description:
Both owner types must use the same explicit-reference resolution contract, with owner-specific persistence only at the commit boundary.

Acceptance criteria:
- both eject flows resolve controller outcome through the same projected-state helper
- rollback restores prior controller state if the owner mutation fails before commit
- post-success reads and receipts are consistent across both owner types

### `A5` The explicit-reference contract must remain extension-safe

Description:
This change must strengthen the run 76 framework instead of carving out a controller-only exception.

Acceptance criteria:
- explicit references support policies `block`, `auto-prune`, and `auto-reassign-or-clear`
- `controller` is implemented through that framework
- custom aliases still block and `difficultyClassifier` still blocks unless a later addendum changes them
- no provider-specific or endpoint-family-specific logic is introduced

## Reference-Resolution Contract Extension

Configured-model reference policies become:

- `block`
- `auto-prune`
- `auto-reassign-or-clear`

Policy meanings:

- `block`: eject fails before mutation
- `auto-prune`: backend-owned derived state is removed as part of convergence
- `auto-reassign-or-clear`: explicit state is rewritten against the post-eject projected state; if no valid replacement exists, clear the reference

Initial mapping under this addendum:

- custom alias -> `block`
- `difficultyClassifier` -> `block`
- `controller` -> `auto-reassign-or-clear`

## Deterministic Controller Resolution Contract

Controller resolution runs against the post-eject projected state:

1. build the projected surviving registry and endpoint set after removing the target `{providerAccountId, modelId}` endpoints
2. filter to controller-eligible endpoints under the existing execution-mode compatibility rules
3. choose:
   - the existing default-controller guidance endpoint if it still survives and remains eligible
   - otherwise the first surviving eligible endpoint in effective registry order
   - otherwise clear controller

This intentionally reuses the runtime's existing controller fallback semantics instead of introducing a second ranking model.

## Planned Changes by File

- `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`
  - extend reference descriptors and helpers so explicit references can declare policy-driven resolution instead of only blocking behavior

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - add projected-state controller-resolution helper
  - integrate `auto-reassign-or-clear` into configured-model eject preflight and owner mutation planning
  - keep non-controller explicit blockers unchanged

- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - add helper support to rewrite or clear controller config in config-managed eject mutations

- `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
  - add account-managed controller auto-reassignment coverage
  - add account-managed controller clear-on-last coverage
  - preserve negative controls for sibling accounts and non-controller eject behavior

- `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - add config-managed controller auto-reassignment coverage
  - add config-managed controller clear-on-last coverage
  - preserve blocking behavior for `difficultyClassifier` and custom aliases

- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - update client expectations so controller-backed eject success is no longer surfaced as a 409 conflict

## Implementation Steps

1. Extend the configured-membership reference contract so explicit references can declare policy-driven resolution behavior.
2. Add RED tests proving controller-backed eject currently blocks and should instead reassign or clear.
3. Implement one backend helper that computes projected post-eject controller outcome.
4. Thread that helper through both account-managed and runtime-config-managed eject flows.
5. Preserve blocking behavior for custom aliases and `difficultyClassifier`.
6. Run focused host and UI suites, then broader affected test floors.

## Implementation Sub-phases

### SP-A - Reference policy extension

- Requirements: `A3`, `A5`
- RED: pure or ownership tests fail because explicit references cannot express `auto-reassign-or-clear`
- GREEN: extend the configured-membership reference contract to support policy-driven explicit-reference resolution
- Gate: reference policy tests pass with no eject behavior changed yet

### SP-B - Account-managed controller-backed eject

- Requirements: `A1`, `A2`, `A3`, `A4`
- RED: account-managed eject of the active controller fails with `configured_model_reference_conflict`, does not reassign when a surviving candidate exists, and does not clear when no candidate exists
- GREEN: implement projected controller resolution in the account-managed eject path
- Gate: focused `remove-account-model` tests pass

### SP-C - Runtime-config-managed controller-backed eject

- Requirements: `A1`, `A2`, `A4`, `A5`
- RED: config-managed eject of the active controller still blocks or preserves stale `controller` config
- GREEN: implement the same projected controller resolution semantics in config-managed eject and rollback paths
- Gate: focused `backend-unified-runtime-config` tests pass

### SP-D - API and restart truth

- Requirements: `A1`, `A2`, `A4`
- RED: client parsing and post-restart truth still reflect conflict or stale controller state
- GREEN: align API/client behavior and restart truth with the resolved controller outcome
- Gate: focused runtime API and affected host restart coverage pass

## Testing Strategy

- TDD Mode: `strict`
- Every production edit requires a preceding failing owning test and separate RED/GREEN evidence.

Focused RED/GREEN commands:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/remove-account-model.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts
```

Broader verification:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm run runtime:test-critical
```

## Manual QA Addendum

1. Start with two configured models where model A is the current controller.
2. Eject model A through the real UI/API path.
3. Verify:
   - eject succeeds
   - model A disappears from configured inventory
   - controller moves to model B
4. Restart twice and verify model A stays absent and model B remains controller.
5. Repeat with one configured controller-backed model only and verify:
   - eject succeeds
   - controller becomes unassigned
   - restart preserves the unassigned state
6. Run a blocker control where a custom alias still references the target model and verify eject still returns 409.

## Requirement Mapping

- `R2`, `A1`, `A4` -> authoritative eject convergence plus owner-aligned controller resolution
- `R3`, `A2` -> rebuild/restart preserve the resolved controller outcome without membership resurrection
- `R4`, `A5` -> explicit-reference contract is strengthened systematically instead of bypassed
- `R6` -> API/UI truth reflects reassigned or cleared controller state immediately
- `R8`, `A3` -> strict RED/GREEN coverage around deterministic reusable controller resolution

## Earlier Phase Reconciliation

- `00-requirements.md` remains valid: configured membership stays authoritative and eject remains a durable lifecycle mutation.
- `02-to-be-plan.md` remains valid except for its prior classification of `controller` as an unconditional explicit blocker.
- This addendum refines only the explicit-reference resolution contract for `controller`; it does not relax custom alias or `difficultyClassifier` blockers and does not change the configured-membership authority contract.

## Coverage Gate

- [x] The controller-conflict gap is explicit
- [x] The fix is systematic rather than a one-off controller branch
- [x] Deterministic replacement and no-candidate clear behavior are defined
- [x] Account-managed and config-managed paths are both covered
- [x] Strict TDD slices and verification commands are explicit

Coverage: PASS

## Approval Gate

- [x] Scope is limited to controller-backed eject behavior within run 76
- [x] The design remains provider-agnostic and future-proof
- [x] Blocking behavior for other explicit references remains explicit
- [x] The implementation path is testable and bounded

Approval: PASS
