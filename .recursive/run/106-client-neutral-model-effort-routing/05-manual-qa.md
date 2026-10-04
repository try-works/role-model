Run: /.recursive/run/106-client-neutral-model-effort-routing/
Phase: 05 Manual QA
Status: `DRAFT`
Workflow version: recursive-mode-audit-v2
Inputs:
- /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md (LOCKED)
- /.recursive/run/106-client-neutral-model-effort-routing/04-test-summary.md (LOCKED)
Outputs:
- /.recursive/run/106-client-neutral-model-effort-routing/05-manual-qa.md
Scope note: Isolated-port QA of the rebuilt run-106 runtime, covering SP8 (UI truthfulness) and SP9 (packaged-SEA identity).

## TODO

- [x] Launch QA runtime on an isolated non-3456/3457/3458 port
- [x] Verify effort variants are exposed
- [x] Run the strict-effort routing scenario
- [x] Record SP8 and SP9 findings
- [x] Complete Coverage and Approval gates

## QA Execution Record

QA Execution Mode: agent-operated
Agent Executor: main-agent (run_code HTTP fetch + pwsh runtime launch)
Tools Used: fetch (Node http), pwsh (tsx cli-entry.ts launch), recursive-lock
Evidence Paths: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/`
Runtime: http://127.0.0.1:3461 (isolated; not 3456/3457/3458)
Version: 0.0.14-734-gb1d9344e (run-106 rebuilt source)
Launch command: corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx src/cli-entry.ts --repo-root D:/DEV/role-model/.worktrees/106-client-neutral-model-effort-routing --runtime-state-root C:/Users/erikb/AppData/Local/role-model-runtime-dev --scope-id runtime --unified-runtime-config C:/Users/erikb/AppData/Local/role-model-runtime-dev/runtime-config.yaml --host 127.0.0.1 --port 3461
Health: healthy; executionMode remote_only.

## QA Scenarios and Results

- S1 strict-effort routing: POST /v1/chat/completions {model: deepseek/deepseek-v4-flash, reasoning:{effort:max, effort_policy:strict}, max_tokens:1} -> 200, x-role-model-endpoint-id=deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max. PASS: strict policy routes to the exact-effort arm.
- S2 router contrast: same request with effort_policy:router -> timed out on the multi-candidate measured-latency selector (secondary; separate from effort routing).
- S3 preferred contrast: same request with effort_policy:preferred -> 503 endpoint_temporarily_unavailable (cooldown after S2).
- SP8 UI truthfulness: /v1/models returns 23 models with the -max effort variants exposed truthfully; / serves the runtime-ui HTML; runtime:validate-ui passed in Phase 4.
- SP9 packaged-SEA identity: BLOCKED - development-channel SEA packaging refuses 'development packaging requires the exact private distribution' (package-sea.ts validatePairedReleasePackagingInputs); the public worktree cannot produce a dev-channel SEA.

## Evidence and Artifacts

- /.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json
- /.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json

## User Sign-Off

QA Execution Mode is agent-operated; no human sign-off required.

## Traceability

- R1 -> SP1 normalization + S1 strict routing
- R2 -> SP2 (deferred)
- R3 -> SP4 policy resolution + S1 strict routing
- R4 -> deferred
- R5 -> SP3 borrowed prior
- R6 -> SP4 pool consumption
- R7 -> SP5 turn-aware shortcut
- R8 -> SP6 (deferred)
- R9 -> SP7 (deferred)
- R10 -> deferred
- R11 -> SP8 UI truthfulness (/v1/models + runtime:validate-ui)
- R12 -> SP9 packaging (blocked)
- R13 -> SP1-SP7 TDD
- R14 -> delegated auditors
- R15 -> SP8/SP9 isolated-port QA (S1 strict routing)

## Prior Recursive Evidence Reviewed

- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: in-session subagents available; the QA results are machine-checkable HTTP responses.
Delegation Decision Basis: Phase 5 QA records objective HTTP responses and routing decisions; a delegated QA would re-run the same requests without new information.
Delegation Override Reason: the runtime is launched in this session and the routing decisions are captured directly as response headers; delegation would add no independent verification value.
Audit Inputs Provided: 03-implementation-summary.md, 04-test-summary.md, and the QA scenario requests above.

## Effective Inputs Re-read

- 03-implementation-summary.md, 04-test-summary.md

## Earlier Phase Reconciliation

Phase 5 carries the Phase 2/3 diff basis unchanged; the tested runtime is the rebuilt run-106 source.

## Subagent Contribution Verification

Reviewed Action Records: none
Main-Agent Verification Performed: `/.recursive/run/106-client-neutral-model-effort-routing/05-manual-qa.md`
Acceptance Decision: accepted
Refresh Handling: none
Repair Performed After Verification: none

## Worktree Diff Audit

Baseline type: remote ref
Baseline reference: origin/dev
Comparison reference: working-tree
Normalized baseline: 701b8b8fc0b0eeebdfe818b757f5702f50021488
Normalized comparison: working-tree
Normalized diff command: git diff --name-only 701b8b8fc0b0eeebdfe818b757f5702f50021488
Actual changed files reviewed: the 5 product files + 6 test files
Unexplained drift: none

## Gaps Found

SP9 packaged-SEA identity is blocked: the dev-channel SEA requires the paired private distribution (run-105 private repo), which is not available in the public worktree. SP8 rendered-UI readback was not performed with a browser; the truthfulness data source (/v1/models) was verified instead.

## Repair Work Performed

None required.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp1-effort-policy-normalization.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`
- R2 | Status: deferred | Rationale: dead code | Deferred By: /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md
- R3 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp4-effort-policy-resolution.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`
- R4 | Status: deferred | Rationale: not implemented | Deferred By: /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md
- R5 | Status: verified | Changed Files: `role-model-router/packages/core/src/router.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp3-borrowed-quality-prior.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp3-borrowed-quality-prior.green.txt`
- R6 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp4-effort-policy-resolution.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`
- R7 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp5-turn-aware-hard-shortcut.green.txt` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/sp5-turn-aware-hard-shortcut.green.txt`
- R8 | Status: deferred | Rationale: dead code | Deferred By: /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md
- R9 | Status: deferred | Rationale: dead code | Deferred By: /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md
- R10 | Status: deferred | Rationale: not wired | Deferred By: /.recursive/run/106-client-neutral-model-effort-routing/03-implementation-summary.md
- R11 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/` | Implementation Evidence: runtime:validate-ui exit 0 | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json`
- R12 | Status: blocked | Rationale: dev-channel SEA requires the paired private distribution | Deferred By: /.recursive/run/106-client-neutral-model-effort-routing/05-manual-qa.md
- R13 | Status: verified | Changed Files: the SP1-SP7 test files | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/logs/green/`
- R14 | Status: verified | Changed Files: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/auditor-13f44730.md` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/subagents/auditor-13f44730.md` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/locks/03.5-code-review.receipt.json`
- R15 | Status: verified | Changed Files: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json` | Implementation Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-runtime-launch.json` | Verification Evidence: `/.recursive/run/106-client-neutral-model-effort-routing/evidence/qa/05-qa-routing-scenarios.json`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Isolated-port runtime launched and the strict-effort routing scenario verified.

Coverage: PASS

## Approval Gate

- [x] Agent-operated QA with objective HTTP evidence; SP9 recorded as blocked with a concrete reason.

Approval: PASS