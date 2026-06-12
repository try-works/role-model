Run: `/.recursive/run/42-provider-kind-craft-ask-routing/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-12T10:33:25Z`
LockHash: `6fac8a92692f6493612ca67b3e48891201f2614e7ee5cf4e69d21c705da3085a`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/42-provider-kind-craft-ask-routing/04-test-summary.md`
Outputs:
- `/.recursive/run/42-provider-kind-craft-ask-routing/05-manual-qa.md`
Scope note: Agent-operated packaged-runtime QA for DeepSeek connect, chat, and benchmark.

## TODO

- [x] Declare the QA execution mode and supporting evidence
- [x] Record the manual QA scenarios and observed results
- [x] Complete Coverage and Approval gates before locking

## QA Execution Mode

agent-operated

## QA Execution Record

- Agent Executor: Cursor controller
- Runtime: packaged SEA on `http://127.0.0.1:3456`
- Evidence: `evidence/logs/phase5-deepseek-runtime-qa.log`, `evidence/logs/phase5-deepseek-benchmark-qa.log`

## QA Scenarios and Results

### DeepSeek providerKind + chat

- `GET /api/role-model/providers` → `deepseek.providerKind=provider-openai`
- Chat `pong` for `deepseek/deepseek-v4-pro` and `deepseek/deepseek-v4-flash`

**Result:** PASS

### Quick capability benchmark (both models)

- runId `63c38ad7-b4a3-4930-b0a1-078ea6c8da5e`, 60/60 steps, overallScore 0.42 each

**Result:** PASS

## Evidence and Artifacts

- `evidence/logs/phase5-deepseek-runtime-qa.log`
- `evidence/logs/phase5-deepseek-benchmark-qa.log`

## User Sign-Off

Not required (agent-operated).

## Requirement Completion Status

- R1 | Status: verified | Verification Evidence: `phase5-deepseek-runtime-qa.log`
- R2 | Status: verified | Verification Evidence: unit tests + rubric (Craft alias probe deferred)
- R3 | Status: verified | Verification Evidence: both phase5 logs; SEA SHA256 recorded

## Audit Execution Mode

self-audit

## Audit Verdict

Audit: PASS

## Traceability

- R0: QA on worktree-built SEA from `f4e14af` lineage
- R1: providerKind + live chat through LiteLLM vendor
- R2: craft rubric covered by automated tests; packaged Craft alias deferred
- R3: SEA rebuild + DeepSeek endpoint verification complete

## Coverage Gate

- [x] Packaged runtime proof captured

Coverage: PASS

## Approval Gate

- [x] QA evidence supports verified disposition

Approval: PASS
