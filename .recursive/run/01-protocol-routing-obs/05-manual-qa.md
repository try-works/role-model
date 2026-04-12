Run: `/.recursive/run/01-protocol-routing-obs/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-04-12T11:51:49Z`
LockHash: `6a79be89d3c1bbfee0e60b7b725d1278fed9429daf9a9e87b4bf09e93eae1030`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/01-protocol-routing-obs/02-to-be-plan.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/02-to-be-plan.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/03-implementation-summary.addendum-02.md`
- `/.recursive/run/01-protocol-routing-obs/addenda/04-test-summary.addendum-01.md`
- `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`
Outputs:
- `/.recursive/run/01-protocol-routing-obs/05-manual-qa.md`
Scope note: This document records the agent-operated manual QA outcomes for the run-01 protocol-routing-observability baseline in the absence of a browser UI or Playwright harness.
QA Execution Mode: `agent-operated`

## TODO

- [x] Read Phase 2 manual-QA scenarios
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
| Schema and fixture contract check | `schemas:validate` passes and the required fixture directories exist with canonical run-01 shapes | The final validation log reports `Validated 19 schema file(s).` and `Validated 12 fixture file(s).`; the repo contains `router-golden`, `profile-golden`, `trace-golden`, `usage-golden`, and `role-task-golden` fixtures under `/protocol/fixtures/` | PASS | Evidence is split between the final validation receipt and direct repo inspection |
| Router conformance sanity check | Workspace tests pass and fixture-driven router expectations remain authoritative | The final validation log shows `packages/conformance` green with `37 passed`, including the fixture-driven router conformance suite and router eligibility/scoring coverage | PASS | The router test surface remained fixture-driven rather than reverting to inline-only expectations |
| Observability smoke check | Smoke output contains linked router-decision, trace, usage, observed-performance, and config-export artifacts with run-01 shapes | `runtime-output/gateway-smoke/` contains `router-decision.json`, `observed-performance.json`, `trace-spans.json`, `trace-events.jsonl`, and `usage-events.jsonl`; the files share `request_id: gateway-smoke` / `routing_decision_id: decision-gateway-smoke`, and `config-export.json` contains ACP, MCP, and CLI endpoints | PASS | Direct artifact inspection confirmed linked ids, `sample_window` / `sources`, and normalized endpoint inventory |

## Evidence and Artifacts

Store and reference artifacts under:
- `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `/runtime-output/gateway-smoke/router-decision.json`
- `/runtime-output/gateway-smoke/observed-performance.json`
- `/runtime-output/gateway-smoke/trace-spans.json`
- `/runtime-output/gateway-smoke/trace-events.jsonl`
- `/runtime-output/gateway-smoke/usage-events.jsonl`
- `/runtime-output/router-devtools/config-export.json`

## QA Execution Record

QA Execution Mode: `agent-operated`
- Agent Executor: main agent
- Tools Used: `view`, `rg`, PowerShell, recorded validation receipts
- Evidence:
  - `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
  - `/runtime-output/gateway-smoke/router-decision.json`
  - `/runtime-output/gateway-smoke/observed-performance.json`
  - `/runtime-output/gateway-smoke/trace-spans.json`
  - `/runtime-output/gateway-smoke/trace-events.jsonl`
  - `/runtime-output/gateway-smoke/usage-events.jsonl`
  - `/runtime-output/router-devtools/config-export.json`

## User Sign-Off

- Approved by: N/A (`agent-operated` mode)
- Date: N/A
- Notes: Human sign-off was not required for the selected QA mode.

## Traceability

- `R1`-`R16` -> schema, fixture, and documentation-facing contract changes remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/protocol/fixtures/**`
- `R17`-`R23` -> router eligibility, scoring, reason-code, and fixture-driven routing behavior remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R24`-`R30` -> smoke-path observability and aggregation artifacts were manually inspected and remained linked/protocol-real. | Evidence: `/runtime-output/gateway-smoke/router-decision.json`, `/runtime-output/gateway-smoke/observed-performance.json`, `/runtime-output/gateway-smoke/trace-spans.json`, `/runtime-output/gateway-smoke/trace-events.jsonl`, `/runtime-output/gateway-smoke/usage-events.jsonl`, `/runtime-output/router-devtools/config-export.json`
- `R31`-`R33` -> the executable validation path and smoke receipt remained present and reproducible. | Evidence: `/.recursive/run/01-protocol-routing-obs/04-test-summary.md`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R4` -> workspace and package-manager validation surfaces remained QA-clean under the recorded command chain. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R5` -> generated protocol ownership and aligned runtime contracts remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R6` -> fixture validation and the expanded golden corpus remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/protocol/fixtures/**`
- `R7` -> general schema strictness remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R8` -> capability-aware schema/router usage remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R9` -> endpoint identity semantics remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/protocol/fixtures/example-endpoint-identity.json`
- `R10` -> object-form `tool_calling` semantics remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R11` -> observed-performance schema and deterministic aggregation remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/runtime-output/gateway-smoke/observed-performance.json`
- `R12` -> routing policy structure remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R13` -> task-execution-profile and role-binding repairs remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/protocol/fixtures/role-task-golden/task-execution-profile-basic.json`
- `R14` -> canonical router-decision output remained QA-clean. | Evidence: `/runtime-output/gateway-smoke/router-decision.json`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R15` -> trace/usage linkage remained QA-clean. | Evidence: `/runtime-output/gateway-smoke/trace-spans.json`, `/runtime-output/gateway-smoke/trace-events.jsonl`, `/runtime-output/gateway-smoke/usage-events.jsonl`
- `R18` -> role/task-aware router inputs remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R19` -> eligibility ordering and exclusion semantics remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R20` -> normalized router scoring remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`
- `R21` -> selection reasoning and tie-break behavior remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/runtime-output/gateway-smoke/router-decision.json`
- `R22` -> fixture-driven router conformance remained QA-clean. | Evidence: `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`, `/protocol/fixtures/router-golden/cases/**`
- `R25` -> aggregation sample semantics remained QA-clean. | Evidence: `/runtime-output/gateway-smoke/observed-performance.json`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R26` -> deterministic aggregation rules remained QA-clean. | Evidence: `/runtime-output/gateway-smoke/observed-performance.json`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R27` -> freshness/confidence/version invalidation behavior remained QA-clean. | Evidence: `/runtime-output/gateway-smoke/observed-performance.json`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R28` -> required smoke span emission remained QA-clean. | Evidence: `/runtime-output/gateway-smoke/trace-spans.json`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R29` -> the M3 observability/aggregation baseline remained QA-clean. | Evidence: `/runtime-output/gateway-smoke/router-decision.json`, `/runtime-output/gateway-smoke/observed-performance.json`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`
- `R32` -> the repo still presents real protocol/router/observability behavior rather than placeholder-only closeout. | Evidence: `/.recursive/run/01-protocol-routing-obs/03-implementation-summary.md`, `/.recursive/run/01-protocol-routing-obs/evidence/logs/green/remediation-validation-green.log`

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
