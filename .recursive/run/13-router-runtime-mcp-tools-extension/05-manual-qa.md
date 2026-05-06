Run: `/.recursive/run/13-router-runtime-mcp-tools-extension/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-06T13:41:37Z`
LockHash: `0b4299a1183dc485a4d78326a43e643ed78fb37f7d659b1d25ca0b7e9ee3e642`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/02-to-be-plan.md`
- `/.recursive/run/13-router-runtime-mcp-tools-extension/04-test-summary.md`
Outputs:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/05-manual-qa.md`
Scope note: This document records the planned run-13 QA scenarios, the agent-operated execution mode used for them, and the evidence that the additive MCP/tool extension behaves as intended without widening into orchestration.
QA Execution Mode: `agent-operated`

## TODO

- [x] Read Phase 2 plan QA scenarios
- [x] Declare QA execution mode
- [x] Execute the planned QA scenarios through the deterministic local validation path
- [x] Record observed outcomes for each scenario
- [x] Document pass/fail status
- [x] Record QA execution metadata and evidence
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## QA Scenarios and Results

| Scenario | Expected | Observed | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Tool-call response compatibility | `/v1/chat/completions` remains OpenAI-compatible and includes `tool_calls` when the routed provider emits them | `runtime-host-bridge/test/index.test.ts` passed and asserted an assistant message with `tool_calls` plus `finish_reason: "tool_calls"` | Pass | Evidence: `evidence/logs/verify/runtime-host-bridge-test.log` |
| Provider-agnostic tool execution path | `runtime:validate-tools` resolves normalized provider tool calls through the provider-agnostic registry and produces execution receipts | `runtime:validate-tools` passed with one successful MCP-backed `lookupRegistry` execution receipt | Pass | Evidence: `evidence/logs/verify/runtime-validate-tools.log` |
| Tool-aware inspection reads | stored observations include requested tools, normalized tool calls, execution receipts, and tool diagnostics | `validate-tools.test.ts` and `runtime:validate-tools` both observed a tooling section with `toolCalls` and `executions` | Pass | Evidence: `evidence/logs/verify/runtime-host-bridge-test.log`, `evidence/logs/verify/runtime-validate-tools.log` |
| Regression floor preservation | earlier runtime validators stay green and root `build` / `test` only reproduce the inherited schema-tools/Biome failure | `runtime:validate-host`, `runtime:validate-observability`, `runtime:validate-operations`, `runtime:validate-state`, `runtime:validate-routing`, `runtime:validate-adapter`, `schemas:validate`, and `smoke` all passed; root `build` / `test` failed only on the inherited schema-tools/Biome path | Pass | Evidence: `evidence/logs/verify/*.log` listed in Phase 4 |

## Evidence and Artifacts

Store and reference artifacts under:
- `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/`
  - `evidence/logs/verify/runtime-host-bridge-test.log`
  - `evidence/logs/verify/runtime-validate-tools.log`
  - `evidence/logs/verify/runtime-validate-host.log`
  - `evidence/logs/verify/runtime-validate-observability.log`
  - `evidence/logs/verify/runtime-validate-operations.log`
  - `evidence/logs/verify/runtime-validate-state.log`
  - `evidence/logs/verify/runtime-validate-routing.log`
  - `evidence/logs/verify/runtime-validate-adapter.log`
  - `evidence/logs/verify/schemas-validate.log`
  - `evidence/logs/verify/smoke.log`
  - `evidence/logs/verify/build.log`
  - `evidence/logs/verify/test.log`

## QA Execution Record

QA Execution Mode: `agent-operated`
- Agent Executor: `main agent`
- Tools Used: `powershell`; workspace test and validation commands via `corepack pnpm`
- Evidence:
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-host-bridge-test.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-validate-tools.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-validate-host.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-validate-observability.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-validate-operations.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-validate-state.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-validate-routing.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/runtime-validate-adapter.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/schemas-validate.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/smoke.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/build.log`
  - `/.recursive/run/13-router-runtime-mcp-tools-extension/evidence/logs/verify/test.log`

## User Sign-Off

- Approved by: `not required`
- Date: `not applicable`
- Notes: `QA Execution Mode` is `agent-operated`, so user sign-off is not required by the workflow.

## Traceability

- `R1` -> the provider-agnostic tool registry and connector-definition path were exercised in the provider-agnostic tool execution scenario.
- `R2` -> the OpenAI-compatible `tool_calls` response and compiled-runtime path were exercised in the tool-call response scenario.
- `R3` -> the tool-aware observation/inspection scenario exercised stored tooling receipts and diagnostics.
- `R4` -> the regression-floor scenario exercised the strongest local validator plus the preserved runtime validation floor.

## Coverage Gate

- [x] QA scenarios from Phase 2 are represented
- [x] Observed results are recorded for all executed scenarios
- [x] QA execution mode is declared
- [x] Required execution metadata and evidence for `agent-operated` mode are present

Coverage: PASS

## Approval Gate

- [x] The selected QA mode's completion requirements are satisfied
- [x] Agent execution evidence is present
- [x] No human sign-off is required for `agent-operated` mode

Approval: PASS
