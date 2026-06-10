Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-08T15:37:52Z`
LockHash: `1bbc2ea321bed5d290c1accc8e1f41fdf8d8b4e785f0d34375b506fb3273a745`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/02-to-be-plan.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/04-test-summary.md`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/05-manual-qa.md`
Scope note: Agent-operated HTTP QA for consumption, logs, telemetry, and request-id remediation on worktree QA bridge.

## TODO

- [x] Declare QA execution mode
- [x] Start worktree QA bridge and record preview URL
- [x] Execute HTTP scenarios for R3, R5, R6
- [x] Record compensating evidence for R1, R2, R4 (automated + packaged follow-up)
- [x] Save evidence logs
- [x] Complete gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: Cursor controller
- Tools: `curl.exe`, PowerShell `Invoke-WebRequest`, worktree `start-for-qa.ts`
- Preview URL: `http://127.0.0.1:3456`
- Preview Log: `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/preview-server.log`
- Worktree: `D:\DEV\role-model\.worktrees\36-runtime-consumption-telemetry-remediation`
- Branch: `recursive/36-runtime-consumption-telemetry-remediation`
- Note: QA bridge uses `decision_only` fixtures without live litellm/llama-swap vendors; remote success paths require packaged runtime with operator credentials.

## QA Scenarios and Results

| # | Scenario | Requirement | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `GET /logs/stream` returns JSON 503, not SPA HTML | R3 | **PASS** | `{"error":"log stream unavailable without an active llama-swap vendor"}` HTTP 503 |
| 2 | `GET /api/role-model/local/logs` returns telemetry-formatted lines when vendor inactive | R3 | **PASS** | Two failure lines with ISO timestamps after failed chat requests |
| 3 | `POST /v1/chat/completions` with `x-role-model-request-id: req-qa-fail-36b` records that id in telemetry | R5 | **PASS** | `/api/role-model/telemetry/requests` shows `requestId: req-qa-fail-36b` |
| 4 | Failed chat produces telemetry row with `errorClass: execution_failed`, `statusCode: 400` | R6 | **PASS** | Telemetry JSON rows for `req-qa-fail-36` and `req-qa-fail-36b` |
| 5 | Local peer model `lfm2.5-1.2b-instruct` without catalog error | R1 | **DEFERRED** | Bridge integration test `registers configured local OpenAI-compatible peers` PASS in Phase 4; live peer at `:1234` requires packaged runtime rebuild + operator peer |
| 6 | Remote `moonshot/kimi-k2.6` returns non-empty assistant text from `reasoning_content` | R2 | **DEFERRED** | Unit tests PASS; QA bridge returns `VENDOR_NOT_CONFIGURED` for remote execution without litellm in fixture mode |
| 7 | Successful request telemetry `latencyMs` ≠ 120 | R4 | **DEFERRED** | `readLatencyMs` metadata unit test PASS; live measured latency requires successful remote/local execution on packaged runtime |

## Evidence and Artifacts

- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/preview-server.log`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/phase5-manual-qa-curl.log`
- Companion automated proof: `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/phase4-tier-a-rerun.log`

## User Sign-Off

- Not required (`agent-operated` mode)
- Operator follow-up recommended for deferred R1/R2/R4 scenarios on packaged `Role-Model.bat` after merge

## Traceability

- `R3` → scenarios 1–2
- `R5` → scenario 3
- `R6` → scenario 4
- `R1` → scenario 5 (deferred with Phase 4 integration compensating evidence)
- `R2` → scenario 6 (deferred with unit-test compensating evidence)
- `R4` → scenario 7 (deferred with unit-test compensating evidence)

## Effective Inputs Re-read

- `02-to-be-plan.md` verification notes per SP
- `04-test-summary.md`

## Earlier Phase Reconciliation

- HTTP QA outcomes align with Phase 4 automated PASS for logs/stream, request-id alias, and failure telemetry paths
- No regressions in bridge health or telemetry listing APIs

## Requirement Completion Status

| ID | Status | Verification Evidence |
| --- | --- | --- |
| R3 | verified | Scenarios 1–2 + Phase 4 bridge test |
| R5 | verified | Scenario 3 + Phase 4 alias test |
| R6 | verified | Scenario 4 |
| R1 | verified (compensating) | Phase 4 bridge peer integration tests; packaged peer curl deferred |
| R2 | verified (compensating) | Phase 4 provider-openai + view-models tests; live Kimi deferred |
| R4 | verified (compensating) | Phase 4 latency metadata test; live success-path latency deferred |

## Coverage Gate

- [x] All automatable HTTP scenarios executed on live QA bridge
- [x] Deferred live scenarios documented with compensating evidence

Coverage: PASS

## Approval Gate

- [x] Agent-operated execution record and evidence paths complete
- [x] No blocking failures on in-scope HTTP scenarios

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: direct HTTP QA against worktree bridge; no delegation required
- Delegation Override Reason: n/a

Audit: PASS
