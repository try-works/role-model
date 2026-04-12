Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-04-12T12:06:01Z`
LockHash: `35a00c5de09ae2eee522bfb781ed00bafa26e6c60631cfcc3f782822ad7993c4`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-01.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-m1-m3-baseline-requirements.md`
Outputs:
- `/.recursive/run/01-protocol-routing-obs/addenda/02-to-be-plan.addendum-01.md`
Scope note: This addendum records the post-audit remediation plan needed to clear the externally verified compliance gaps without rewriting the locked Phase 2 plan artifact.

## TODO

- [x] Attach the remediation plan to the run-local addenda set
- [x] Map each blocking audit finding to a concrete remediation slice
- [x] Preserve execution ordering and dependency notes
- [x] Capture required revalidation and artifact refresh work
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - The authoritative remediation plan for the external audit findings now lives in the run artifact set, not only in session state.
  - This addendum supplements `02-to-be-plan.md` with the corrective work discovered after the post-closeout audit recorded in `addenda/03-implementation-summary.addendum-01.md`.
- Remediation slices:
  1. **Align `tool_calling` contract (`§5.4`)**
     - Update `role-model-router/packages/core/src/types.ts`, `role-model-router/packages/provider-cli/src/index.ts`, `role-model-router/packages/provider-acp/src/index.ts`, `role-model-router/packages/provider-mcp/src/index.ts`, router fixtures under `protocol/fixtures/router-golden/cases/`, and directly coupled conformance coverage so the runtime/test surface uses the canonical `tool_calling: { supported, style }` object already required by `protocol/schemas/declared-capability-profile.schema.json`.
  2. **Align `task-execution-profile` contract (`§5.7`)**
     - Update `protocol/schemas/task-execution-profile.schema.json` and `protocol/fixtures/role-task-golden/task-execution-profile-basic.json` so the run-01 required field set includes `task_type`, `role_id`, `required_capabilities`, `preferred_capabilities`, and `routing_policy_patch` instead of the older baseline-only shape.
  3. **Align `RouterDecision` persisted shape (`§5.8`, `§7.12`)**
     - Update `protocol/schemas/router-decision.schema.json`, `role-model-router/packages/core/src/types.ts`, `role-model-router/packages/core/src/router.ts`, router fixtures, and affected conformance assertions to emit the canonical `eligibility[]` entries with `eligible` and `exclusions[{ code, detail }]` instead of `eligible_candidates` and `ineligible_candidates[].reasons`.
  4. **Align smoke observability span coverage (`§9.8`, `§9.9`)**
     - Update `role-model-router/apps/gateway-smoke/src/index.ts`, `packages/conformance/src/gateway-smoke-observability.test.ts`, and generated smoke artifacts so the minimum required span set is `router.eligibility`, `router.scoring`, and `router.selection`.
  5. **Revalidate and refresh receipts**
     - Re-run `corepack pnpm run schemas:validate`, `corepack pnpm run build`, `corepack pnpm run test`, and `corepack pnpm run smoke`.
     - Refresh the affected run artifacts and shared ledgers, including `03-implementation-summary.md`, `04-test-summary.md`, and any later closeout artifacts or memory/ledger entries whose compliance posture changes after remediation.
- Sequencing and dependency notes:
  - `tool_calling` alignment should land before router-decision remediation because router fixtures and runtime types currently mix both drifts.
  - `task-execution-profile` remediation can proceed independently of the router-decision rewrite.
  - Smoke-span remediation should land after the decision-shape work so emitted observability artifacts reflect the corrected router contract.
- Impact on phase output:
  - `02-to-be-plan.md` remains historically correct as the locked pre-implementation plan.
  - This addendum is the durable corrective supplement for post-audit remediation.
  - Phase 3-8 artifacts should not be treated as externally compliant until the remediation slices above are implemented and revalidated.

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
  - `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-01.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-m1-m3-baseline-requirements.md`
- Audit findings mapped to remediation:
  - `§5.4`: `tool_calling` object/runtime mismatch -> remediation slice 1
  - `§5.7`: `task-execution-profile` mismatch -> remediation slice 2
  - `§5.8` / `§7.12`: `RouterDecision` shape mismatch -> remediation slice 3
  - `§9.8` / `§9.9`: smoke span-emission mismatch -> remediation slice 4
- Revalidation captured:
  - `schemas:validate`
  - `build`
  - `test`
  - `smoke`

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The remediation plan is preserved in the run-local addenda set
  - [x] Each external audit blocker is mapped to a concrete repair slice
  - [x] Dependency ordering is explicit where repair work is coupled
  - [x] Revalidation and receipt-refresh work is included
- Remaining blockers:
  - `RouterDecision` contract mismatch
  - `tool_calling` object/runtime mismatch
  - `task-execution-profile` contract mismatch
  - smoke span-emission mismatch

Approval: PASS
