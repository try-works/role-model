Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-14T17:15:18Z`
LockHash: `18e28991bd20b9928744f68d988ce0081921e48591dfb014646f1a3ee8447719`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md` (locked)
Outputs:
- `/.recursive/run/43-benchmark-routing-display/05-manual-qa.md`
Scope note: Agent-operated packaged-runtime QA on rebuilt SEA `:3456` (accelerated verification tier).

## TODO

- [x] Declare QA execution mode and rebuild metadata
- [x] Record Q1–Q11 scenario results
- [x] Complete Coverage and Approval gates before locking

## QA Execution Mode

agent-operated

## QA Execution Record

| Field | Value |
| --- | --- |
| Agent Executor | Cursor controller |
| seaBuildCommand | `corepack pnpm run runtime:package-sea` (worktree) |
| seaBuildLog | `evidence/logs/phase5-sea-build.log` |
| runtimeSha256 | `4dc26f1c9989e972373dd2c7e26bd30c77b9871eee06750b0c34a89ce5cb214c` |
| restartCommand | `role-model-runtime.exe --port 3456 --scope-id run43-verify --runtime-state-root <stateRoot>` |
| scopeId | `run43-verify` |
| runtimeStateRoot | `C:\Users\erikb\AppData\Local\Temp\role-model-run42-verify-state` |
| benchmarkArtifactRoot | `...\run43-verify\memory\benchmark-runs` |
| Runtime URL | `http://127.0.0.1:3456` |
| Verification tier | **Accelerated:** full-mode smoke (3 cases) + complete quick; not full 55-case suite |

**Resume note:** After operator pause, LiteLLM uv-tools were re-provisioned (`uv tool install litellm[proxy]`) before runtime restart.

## QA Scenarios and Results

| ID | Scenario | Pass/Fail | Evidence |
| --- | --- | --- | --- |
| Q1 | Overview latency success | **PASS** | `phase5-dashboard-latency-qa.log` — avg=1055 ms, p95=1055 |
| Q2 | Overview latency failure path | **PASS** | same log — failure avg=21 ms (not bare n/a) |
| Q3 | Full benchmark | **PASS (smoke)** | runId `42406002-77a1-47df-bbb8-0562a64bdb72`, 15/15 steps, cases e01/p06/p17 |
| Q4 | Quick after full smoke | **PASS** | runId `751e9d7f-d36d-41b1-b984-b27040abcfa3`, 60/60 steps; by-mode API both populated pre-clear |
| Q5 | Routing quality readback | **PASS** | `phase5-accelerated-qa.log` — routingQualityScore=0.467; hardBlend absent (quick-only sqlite after smoke) |
| Q6 | Run history + latencyMs | **PASS** | history=2 pre-clear; caseAudit latencyMs=4313 |
| Q7 | Benchmark UI latency | **PASS (API)** | caseAudit latencyMs in summary readback; UI covered by unit tests Phase 4 |
| Q8 | Per-model clear | **PASS** | per-endpoint DELETE cleared sqlite for v4-pro |
| Q9 | Global clear | **PASS** | DELETE `/benchmark/data` emptied summary/history |
| Q10 | Post-clear re-run | **PASS** | runId `b9fba560-fbe1-4d7b-8acf-aa94af06c20c`, 60/60; quick panel populated |
| Q11 | Run 42 regression | **PASS** | `phase5-run42-spotcheck.log` — deepseek.providerKind=provider-openai, chat 200 |

## Evidence and Artifacts

- `evidence/logs/phase5-sea-build.log`
- `evidence/logs/phase5-dashboard-latency-qa.log`
- `evidence/logs/phase5-run42-spotcheck.log`
- `evidence/logs/phase5-accelerated-qa.log`
- `evidence/logs/phase5-runtime-start-full.log` (litellm failure diagnosis)
- `evidence/scripts/phase5-accelerated-qa-resume.ps1`
- `evidence/PAUSE-RESUME.md`

## User Sign-Off

Not required (agent-operated).

## Requirement Completion Status

- R0 | Status: verified | Verification Evidence: Q11 spot-check + worktree SEA lineage
- R1 | Status: verified | Verification Evidence: Q4 by-mode dual runs + Q10 quick panel post-clear
- R2 | Status: verified | Verification Evidence: Q6 run history API
- R3 | Status: verified | Verification Evidence: Q5 routingQualityScore on candidates
- R4 | Status: partial | Verification Evidence: hardBlend not observed (only quick sqlite after global clear path); blend covered by Phase 4 unit tests
- R5 | Status: verified | Verification Evidence: Phase 4 + packaged benchmark samples persisted
- R6 | Status: verified | Verification Evidence: Phase 4 legacy mode tests
- R7 | Status: partial | Verification Evidence: Phase 4 targeted green; full bridge floor baseline failures documented
- R8 | Status: deferred | Deferred By: Phase 6 DECISIONS.md
- R9 | Status: verified | Verification Evidence: Q1/Q2 telemetry logs on `:3456`
- R10 | Status: verified | Verification Evidence: Q7 latencyMs in summary; Q4/Q10 benchmark runs
- R11 | Status: verified | Verification Evidence: Q8–Q10 clear semantics logs
- R12 | Status: verified (accelerated) | Verification Evidence: Q1–Q11 table above on SEA `4dc26f1c`; full 55-case suite deferred

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: self-executed resume after operator pause
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Traceability

- R0: Q11 + SEA rebuild on run 43 worktree
- R1: Q4/Q10 dual-mode summaries
- R2: Q6 run list
- R3: Q5 candidates API
- R4: partial — no live hardBlend (global clear reset); unit tests in Phase 4
- R5: benchmark smoke + quick runs
- R6: Phase 4 routing quality tests
- R7: Phase 4 floor partial
- R8: Phase 6
- R9: Q1/Q2
- R10: Q7 + benchmark runIds
- R11: Q8–Q10
- R12: accelerated Q matrix on packaged runtime

## Coverage Gate

- [x] All Q1–Q11 rows recorded with Pass/Fail
- [x] SEA rebuild metadata captured
- [x] Accelerated tier documented explicitly

Coverage: PASS

## Approval Gate

- [x] Packaged-runtime evidence supports verified disposition for in-scope requirements (with R4/R7 partial notes)

Approval: PASS
