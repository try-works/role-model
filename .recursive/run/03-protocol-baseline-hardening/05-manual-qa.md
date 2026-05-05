Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-05T00:44:58Z`
LockHash: `ab046b026d60f90e166d81dc95b43a655fcca59b800454b335d70ba8050fcc31`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
Outputs:
- `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
Scope note: This document records the agent-operated manual QA checks for the hardened M1-M3 protocol baseline.
QA Execution Mode: `agent-operated`

## TODO

- [x] Read the Phase 2 manual-QA scenarios
- [x] Declare QA execution mode
- [x] Execute the planned scenarios without requiring user-side interaction
- [x] Record observed outcomes for each scenario
- [x] Document pass/fail status
- [x] Record QA execution metadata and evidence
- [x] Record user sign-off handling for the selected mode
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## QA Scenarios and Results

| Scenario | Expected | Observed | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Schema and fixture baseline | `schemas:validate` passes and the canonical schema-tool path distinguishes valid and invalid fixtures | `schemas-validate-green.log` reports `Validated 19 schema file(s).` and `Validated 28 fixture file(s).`, and the schema-tools manifest now spans router, profile, trace, usage, and role-task families across basic, minimal, edge, and invalid coverage | PASS | This matches the Phase 2 schema/fixture scenario directly |
| Router decision diagnostics | A concrete routed decision exposes `app_id`, `org_id`, `total_score`, `metric_breakdown`, `tie_break`, and canonical reason codes | `runtime-output/gateway-smoke/router-decision.json` contains `app_id`, `org_id`, `scored_candidates[*].total_score`, full per-metric `metric_breakdown`, and `tie_break` objects for the chosen and fallback endpoints | PASS | Direct file inspection was used in addition to the green router conformance log |
| Smoke harness linkage | Smoke emits router, trace, usage, and observed-performance artifacts and succeeds only when schema and linkage validation pass | `smoke-green.log` is green, `observed-performance.json` uses `endpoint_version` plus `measurement_window`, and the emitted trace and usage artifacts share the same `request_id` and `routing_decision_id` as the router-decision artifact | PASS | This directly satisfies the Phase 2 smoke-harness scenario |

## Evidence and Artifacts

- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/observability-green.log`
- `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/smoke-green.log`
- `/runtime-output/gateway-smoke/router-decision.json`
- `/runtime-output/gateway-smoke/observed-performance.json`
- `/runtime-output/gateway-smoke/trace-spans.json`
- `/runtime-output/gateway-smoke/usage-events.jsonl`

## QA Execution Record

QA Execution Mode: `agent-operated`
- Agent Executor: `main agent`
- Tools Used: `PowerShell`, direct file inspection, recorded validation receipts
- Evidence:
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/observability-green.log`
  - `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/smoke-green.log`
  - `/runtime-output/gateway-smoke/router-decision.json`
  - `/runtime-output/gateway-smoke/observed-performance.json`

## User Sign-Off

- Approved by: `N/A (agent-operated mode)`
- Date: `N/A`
- Notes: Human sign-off was not required for the selected QA mode.

## Traceability

- `R1` -> QA-confirmed via the green schema-validation receipt and direct fixture-manifest inspection. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
- `R2` -> QA-confirmed via the runtime router-decision artifact and the green router-conformance receipt. | Evidence: `/runtime-output/gateway-smoke/router-decision.json`, `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/router-green.log`
- `R3` -> QA-confirmed via the same fixture-manifest/schema-validation path used by the canonical schema tool. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/schemas-validate-green.log`
- `R4` -> QA-confirmed via direct inspection of `observed-performance.json`, `trace-spans.json`, and `usage-events.jsonl`. | Evidence: `/runtime-output/gateway-smoke/observed-performance.json`, `/runtime-output/gateway-smoke/trace-spans.json`, `/runtime-output/gateway-smoke/usage-events.jsonl`
- `R5` -> QA-confirmed via the green smoke log and the linked runtime artifact set. | Evidence: `/.recursive/run/03-protocol-baseline-hardening/evidence/logs/green/smoke-green.log`

## Coverage Gate

- [x] QA scenarios from Phase 2 are represented
- [x] Observed results are recorded for each executed scenario
- [x] QA execution mode is declared
- [x] Required execution metadata and evidence are present

Coverage: PASS

## Approval Gate

- [x] The selected QA mode's completion requirements are satisfied
- [x] Human sign-off is not required for `agent-operated` mode
- [x] Agent execution evidence is present

Approval: PASS
