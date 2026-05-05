Run: `/.recursive/run/08-router-runtime-protocol-routing/`
Phase: `03 Implementation`
Status: `LOCKED`
LockedAt: `2026-05-05T05:09:05Z`
LockHash: `42f70904464ac0276de111cff70f81527f2fd0c88774b96186598041037cae89`
Inputs:
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
Outputs:
- `/.recursive/run/08-router-runtime-protocol-routing/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This addendum records the post-closeout roadmap audit finding that run 08 intentionally narrowed the locked Phase 2 plan around canonical eligibility and reason-code expansion, and it defines the implementation-side compensation path without editing locked history.

## TODO

- [x] Record the locked-plan gap and how it was discovered
- [x] Capture the specific roadmap and run-08 requirement clauses affected
- [x] Identify the implementation surfaces that must be repaired
- [x] Update this addendum with the final remediation file list and evidence paths
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - A post-closeout audit against the authoritative router-runtime roadmap found that run 08 preserved the `RouterDecision` object shape but also narrowed the planned scope more than the roadmap and locked requirements allowed.
  - The locked Phase 2 plan explicitly chose to keep new continuity/cache/routing-model explanations only in runtime diagnostics and `metric_breakdown.preference.raw`, instead of also expanding canonical exclusion and selection reason codes.
  - That narrowing conflicts with the effective requirement set for run 08:
    - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md` requires expanded routing-core eligibility plus expanded exclusion/selection reason codes.
    - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md` requires routing-core eligibility expansion, expanded exclusion/selection reason codes, and cache-aware routing/cost signals while preserving the committed router-decision surface.
  - The concrete repo gap is currently visible in:
    - `protocol/schemas/router-decision.schema.json`
    - `packages/protocol-types/src/generated.ts`
    - `role-model-router/packages/core/src/reason-codes.ts`
    - `role-model-router/packages/core/src/router.ts`
    - `role-model-router/packages/core/src/types.ts`
    - `role-model-router/packages/endpoint-registry/src/index.ts`
    - `role-model-router/packages/protocol-routing/src/index.ts`
- Evidence:
  - `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Implications for current and later phases:
  - The locked Phase 3 receipt remains historically accurate for what shipped, but it is incomplete as the authoritative implementation story for roadmap compliance.
  - Phase 4 validation must be supplemented with remediation-focused coverage proving canonical exclusion and selection reason expansion, not just runtime diagnostics.
  - Later Phase 6-8 closeout documents will need addenda or refreshes if the product diff changes current repo truth.
- Compensation path for the current repair:
  - Expand canonical router-decision exclusion codes for the run-08 runtime eligibility cases carried by provider-account and registry state.
  - Expand canonical selection reasons so continuity affinity, cache affinity, and routing-model preference become first-class decision explanations.
  - Thread runtime eligibility metadata from endpoint-registry through protocol-routing into router-core eligibility evaluation.
  - Re-run the targeted run-08 validation chain and capture the evidence in a paired Phase 4 addendum.
- Remediation applied:
  - Added runtime eligibility metadata at the endpoint-registry boundary and preserved region-blocked cloud candidates so routing can explain them canonically instead of dropping them.
  - Threaded runtime eligibility into protocol-routing candidate projection and router-core eligibility evaluation.
  - Widened canonical router-decision exclusion and selection enums while preserving the committed object shape.
  - Added repair-focused tests for endpoint-registry, protocol-routing, and runtime-routing conformance.
- Changed files:
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/test/index.test.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/reason-codes.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/protocol/schemas/router-decision.schema.json`
  - `/packages/protocol-types/src/generated.ts`
  - `/packages/conformance/src/runtime-routing-conformance.test.ts`
  - `/docs/protocol/reason-codes.md`
- Repair evidence:
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/endpoint-registry-test.repair.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/endpoint-registry-build.repair.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-test.repair.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-build.repair.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/core-build.repair.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-routing-conformance.repair.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-validate-routing.repair.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/schemas-validate.repair.log`

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Gap categories captured:
  - locked Phase 2 narrowing of canonical reason-code expansion
  - missing runtime eligibility flow into canonical router exclusions
  - missing canonical selection reasons for continuity/cache/routing-model influence
- Compensation path recorded:
  - implementation surfaces to repair
  - required validation follow-up surface

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The locked-history gap is recorded without rewriting prior artifacts
  - [x] The affected requirement sources are explicitly cited
  - [x] The product surfaces that need remediation are identified
  - [x] The final remediation diff and evidence paths are captured
  - [x] The paired validation addendum is complete
- Remaining blockers:
  - none at the implementation-addendum level; see the paired validation addendum for rerun evidence

Approval: PASS
