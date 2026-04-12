Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `04 Test Summary`
Status: `LOCKED`
LockedAt: `2026-04-12T12:06:05Z`
LockHash: `4a2bbb555c196c04e1d299878829efc5ae79648f5b9767045bc2ff083e7ffa4f`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-02.md`
- `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
Outputs:
- `/.recursive/run/01-protocol-routing-obs/addenda/04-test-summary.addendum-01.md`
Scope note: This addendum records the post-remediation validation rerun that cleared the external-audit blockers without rewriting the historical Phase 4 receipt.

## TODO

- [x] Record the remediation validation command chain
- [x] Capture the durable evidence path for the rerun
- [x] Note the remaining non-blocking environment warning
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Addendum Content

- Added/clarified information:
  - After the post-audit remediation landed, the planned validation chain was rerun successfully:
    - `corepack pnpm run schemas:validate`
    - `corepack pnpm run build`
    - `corepack pnpm run test`
    - `corepack pnpm run smoke`
  - The rerun regenerated protocol types, rebuilt the workspace, exercised the updated conformance suites, and produced smoke artifacts containing the required `router.eligibility`, `router.scoring`, and `router.selection` spans.
- Evidence:
  - `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
  - `/runtime-output/gateway-smoke/router-decision.json`
  - `/runtime-output/gateway-smoke/trace-spans.json`
  - `/runtime-output/gateway-smoke/trace-events.jsonl`
  - `/runtime-output/gateway-smoke/usage-events.jsonl`
  - `/runtime-output/gateway-smoke/observed-performance.json`
- Diagnostics:
  - The environment still emits unsupported-engine warnings because the repo declares `Node >=22 <23` while this checkout is running `Node v24.11.0`.
  - No remediation blocker remained open after the rerun.
- Impact on phase output:
  - The earlier validation receipt is preserved as historical context.
  - This addendum is the canonical evidence that the external-audit remediation set revalidated cleanly.

## Coverage Gate

- Addendum scope reviewed against:
  - `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
  - `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-02.md`
  - `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- Validation chain captured:
  - `schemas:validate`
  - `build`
  - `test`
  - `smoke`
- Durable evidence captured:
  - `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
  - `/runtime-output/gateway-smoke/router-decision.json`
  - `/runtime-output/gateway-smoke/trace-spans.json`

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - [x] The remediation validation chain is recorded with exact commands
  - [x] The rerun evidence path is durable and worktree-local
  - [x] Remaining diagnostics are non-blocking only
  - [x] The rerun closes the external-audit validation gap
- Remaining blockers:
  - none

Approval: PASS
