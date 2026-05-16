Run: `/.recursive/run/32-models-dev-metadata-coverage/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-15T22:18:49Z`
LockHash: `58b0863ecef88953071805ad052f3ce301c57541eafb1e6465cbb0ff21581775`
Inputs:
- `/.recursive/run/32-models-dev-metadata-coverage/03-implementation-summary.md`
- `/.recursive/run/32-models-dev-metadata-coverage/04-test-summary.md`
- `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`
- `/.recursive/run/32-models-dev-metadata-coverage/addenda/02-to-be-plan.credential-lifecycle-remediation.addendum-01.md`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-repo-build.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-host-suite.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-ui-suite.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-validate-host.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-validate-packaging.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-catalog-export-command.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-catalog-export-provider-metadata.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-catalog-refresh-command.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-post-refresh-catalog-tests.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-post-refresh-export.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-provider-metadata.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-refresh-command.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp1-tracked-catalog-export.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp2-catalog-refresh-with-supplement.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp2-post-supplement-export.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp2-refresh-supplement.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp3-runtime-host-test.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/sp3-runtime-ui-test.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/red/sp1-provider-metadata.red.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/red/sp1-refresh-command.red.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/red/sp1-tracked-catalog-export.red.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/red/sp2-refresh-supplement.red.log`
Outputs:
- `/.recursive/run/32-models-dev-metadata-coverage/05-manual-qa.md`
Scope note: Records the agent-operated end-to-end QA pass for run 32 using the packaged runtime executable, the packaged control-plane surfaces, and the validated runtime-host APIs.

## TODO

- [x] Declare the QA execution mode and supporting evidence
- [x] Record the manual QA scenarios and observed results
- [x] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: agent-operated
- Agent Executor: `GitHub Copilot CLI (GPT-5.4)`
- Tools Used: `powershell`, packaged Windows executable `role-model-runtime.exe`, runtime-host HTTP probes, run-local evidence logs
- Evidence Path: `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-validate-packaging.green.log`

## QA Scenarios and Results

- Scenario: packaged executable boots as a usable runtime surface without extra CLI arguments
  - Result: PASS
  - Observed evidence: `run32-runtime-validate-packaging.green.log` shows the SEA executable at `/role-model-router/dist/release/win32-x64/role-model-runtime.exe` launched successfully and returned `healthStatus: healthy`.
- Scenario: packaged runtime exposes the expected packaged API surface
  - Result: PASS
  - Observed evidence: `run32-runtime-validate-packaging.green.log` confirms `/healthz`, `/v1/models`, `/v1/chat/completions`, and `/v1/responses` succeeded through the packaged executable.
- Scenario: packaged control plane reflects execution-ready truth for a representative provider path
  - Result: PASS
  - Observed evidence: packaged validation selected endpoint `moonshot.personal.primary.global.kimi-k2.5` and returned matching chat/responses text `packaged env endpoint summary`; the remediation addendum scope for readiness truth is covered by the final runtime-host/runtime-ui suites and packaged validation evidence.
- Scenario: live runtime-host path still exposes representative metadata and request inspection after the models.dev integration
  - Result: PASS
  - Observed evidence: `run32-runtime-validate-host.green.log` reports `model_count: 3`, routed request capture, structured endpoint profile readback, and successful output text.
- Scenario: operator-surface regressions across Providers/Runtime/Endpoints/Workbench/Studio are covered after the addendum remediation
  - Result: PASS
  - Observed evidence: `run32-runtime-ui-suite.green.log` passed `67` tests across runtime-api, view-models, device-authorization, design-system, and provider-account-state slices; `run32-runtime-host-suite.green.log` passed `61` runtime-host tests including OAuth rehydration, pending OAuth restoration, env-backed credential execution, and Kimi endpoint execution.

## Evidence and Artifacts

- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-validate-packaging.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-validate-host.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-ui-suite.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-runtime-host-suite.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/evidence/logs/green/run32-repo-build.green.log`
- `/.recursive/run/32-models-dev-metadata-coverage/04-test-summary.md`

## User Sign-Off

- Approved by: N/A (set a real approver when QA mode requires human sign-off)
- Date: N/A (set a real approval date when required)

## Traceability

- `R1` and `R2` -> packaged/runtime validation used the refreshed generated catalog artifacts rather than placeholder data
- `R3` -> runtime-host/runtime-ui suites plus packaged validation confirm truthful auth/control-plane semantics after reload/restart and execution
- `R4` -> live runtime-host validation proves runtime discovery and routed execution still preserve LiteLLM-backed coverage
- `R5` -> packaged runtime/UI asset validation plus runtime-ui suite confirm operator-visible metadata and readiness wiring
- `R6` -> this agent-operated QA receipt complements the automated test receipt with packaged executable proof

## Coverage Gate

- [x] QA Execution Mode is declared accurately as `agent-operated`
- [x] The packaged executable and live runtime-host scenarios both have concrete evidence paths
- [x] The QA record avoids claiming human sign-off or unattested browser interactions
Coverage: PASS

## Approval Gate

- [x] QA claims are grounded in durable run-local evidence
- [x] Packaged-runtime behavior is treated as a first-class acceptance surface
- [x] The receipt stays inside the original run scope and approved addendum
Approval: PASS
