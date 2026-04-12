Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `03 Implementation`
Status: `LOCKED`
LockedAt: `2026-04-12T12:06:03Z`
LockHash: `5ecf963d4e8824e7a18aa21d9cafa9a170a8ee0c59dd72a45ba3516fd4d036b8`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-m1-m3-baseline-requirements.md`
Outputs:
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-01.md`
Scope note: This addendum records the post-closeout external audit against the authoritative M1-M3 baseline requirements and the resulting compliance gaps that block treating Phase 3 as fully complete.

## TODO

- [x] Record the external audit verdict
- [x] Capture the material findings with exact requirement sections and file paths
- [x] Explain why the current Phase 3 and Phase 4 receipts are insufficient for full compliance
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - An external audit against `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-m1-m3-baseline-requirements.md` returned `FAIL`.
  - **Finding 1:** `RouterDecision` still uses the older `eligible_candidates` / `ineligible_candidates[].reasons` shape instead of the required `eligibility[]` entries with `eligible` and `exclusions[{ code, detail }]`. | Requirement refs: `§5.8`, `§7.12` | Files: `protocol/schemas/router-decision.schema.json`, `role-model-router/packages/core/src/types.ts`, `role-model-router/packages/core/src/router.ts`
  - **Finding 2:** the canonical `tool_calling` object contract was not carried through the runtime/test surface; the schema requires `{ supported, style }`, but router types, provider detectors, and router fixtures still use a boolean. | Requirement ref: `§5.4` | Files: `protocol/schemas/declared-capability-profile.schema.json`, `role-model-router/packages/core/src/types.ts`, `role-model-router/packages/provider-cli/src/index.ts`, `role-model-router/packages/provider-acp/src/index.ts`, `role-model-router/packages/provider-mcp/src/index.ts`, `protocol/fixtures/router-golden/cases/*.json`
  - **Finding 3:** `task-execution-profile` remains on the older shape and does not require `role_id` or `routing_policy_patch` as mandated by the requirement. | Requirement ref: `§5.7` | Files: `protocol/schemas/task-execution-profile.schema.json`, `protocol/fixtures/role-task-golden/task-execution-profile-basic.json`
  - **Finding 4:** the smoke path emits only `router.selection` instead of the required minimum span set `router.eligibility`, `router.scoring`, and `router.selection`. | Requirement refs: `§9.8`, `§9.9` | Files: `role-model-router/apps/gateway-smoke/src/index.ts`, `packages/conformance/src/gateway-smoke-observability.test.ts`, `runtime-output/gateway-smoke/trace-spans.json`
- Rationale:
  - The current Phase 3 and Phase 4 receipts were written from the repo's passing command surface, but the later direct comparison against the authoritative external requirement doc found contract mismatches that those receipts did not capture.
  - A stage-local addendum preserves the existing draft receipts while making the blocking compliance gaps explicit before remediation starts.
- Impact on phase output:
  - Phase 3 cannot be treated as externally compliant until the four gaps above are remediated.
  - Phase 4's green validation chain remains historically accurate for the current command surface, but it is insufficient as a full requirement-compliance receipt.
  - Later Phase 5-8 closeout artifacts inherit a stale compliance posture and should be refreshed after remediation and revalidation.

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
  - `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-m1-m3-baseline-requirements.md`
- Compliance gaps captured:
  - `§5.4`: declared capability profile `tool_calling` object mismatch
  - `§5.7`: `task-execution-profile` required-field mismatch
  - `§5.8` / `§7.12`: `RouterDecision` persisted-shape mismatch
  - `§9.8` / `§9.9`: smoke span-emission mismatch
- Evidence paths captured:
  - `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
  - `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
  - `/runtime-output/gateway-smoke/trace-spans.json`

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The audit verdict is recorded without rewriting existing phase history
  - [x] Each material finding is tied to exact requirement sections and changed files
  - [x] The impact on the existing phase receipts is explicit
  - [x] No required section is missing
- Remaining blockers:
  - `RouterDecision` contract mismatch
  - `tool_calling` object/runtime mismatch
  - `task-execution-profile` contract mismatch
  - smoke span-emission mismatch

Approval: PASS
