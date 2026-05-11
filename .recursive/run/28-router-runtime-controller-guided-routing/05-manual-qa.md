Run: `/.recursive/run/28-router-runtime-controller-guided-routing/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-11T16:14:06Z`
LockHash: `affd1f22e30a588b6df177e358c427198bcc4252092b9ad848f17226ab65cce6`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
Outputs:
- `/.recursive/run/28-router-runtime-controller-guided-routing/05-manual-qa.md`
Scope note: This artifact records the agent-operated readback QA pass for the locked run-28 controller-guided routing slice from the Phase 4 baseline.

## TODO

- [x] Re-read the locked implementation and test receipts
- [x] Review controller-active mixed-pool readback
- [x] Review invalid-controller-output fallback readback
- [x] Review controller-inactive alias and exact-model readback
- [x] Save run-owned QA notes under the evidence directory
- [x] Complete the audited Phase 5 sections and gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Operator: `main agent`
- Agent Executor: `GitHub Copilot CLI main agent`
- Tools Used: `powershell`, `tsx`, runtime-host-bridge backend readback surfaces
- Evidence Path: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`

## QA Scenarios and Results

1. **Controller-active intelligent alias readback**
   - Steps:
      - started a hybrid runtime from the repo-owned mock vendor validation plan
      - sent one request through `model = "gpt-5.4-intelligent"` with a prompt that should prefer the remote endpoint
      - read the persisted observation for `req-run28-phase5-intelligent`
      - reviewed the saved controller and alias diagnostics in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - the request selected `openai.litellm.global.openai-gpt-4-1-mini-fast` with `vendorId = "litellm"`
      - persisted diagnostics recorded `controllerRouting.active = true`
      - `acceptedDirectives` preserved `strategy = "quality"` and `preferredEndpointIds = ["openai.litellm.global.openai-gpt-4-1-mini-fast"]`
      - `aliasResolution.allowEndpoints` still exposed the mixed local-plus-remote pool, proving the controller steered selection without hiding the candidate set

2. **Invalid-controller-output fallback readback**
   - Steps:
      - reused the same hybrid runtime and same intelligent alias
      - sent one request whose content intentionally triggered invalid controller output
      - read the persisted observation for `req-run28-phase5-fallback`
      - reviewed the saved fallback diagnostics in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - the request still returned a normal routed response from `openai.litellm.global.openai-gpt-4-1-mini-fast`
      - persisted diagnostics recorded `controllerRouting.active = true`, `fallbackApplied = true`, and `fallbackReason = "invalid-controller-output"`
      - the mixed alias pool remained visible in `aliasResolution.allowEndpoints`, proving the runtime failed closed to the baseline alias route rather than failing open or aborting execution

3. **Controller-inactive basic alias readback**
   - Steps:
      - reused the same hybrid runtime
      - sent one request through the basic alias `model = "gpt-5.4"`
      - read the persisted observation for `req-run28-phase5-basic-alias`
      - reviewed the saved diagnostics in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - the request selected `openai.litellm.global.openai-gpt-4-1-mini-fast`
      - `controllerRouting` was `null`
      - `aliasResolution` remained present, proving operators can distinguish controller-inactive alias behavior from controller-active intelligent-mode behavior

4. **Exact-model compatibility readback**
   - Steps:
      - reused the same hybrid runtime
      - sent one request through the exact model `model = "openai/gpt-4.1-mini-fast"`
      - read the persisted observation for `req-run28-phase5-exact-model`
      - reviewed the saved diagnostics in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - the request selected `openai.litellm.global.openai-gpt-4-1-mini-fast`
      - both `controllerRouting` and `aliasResolution` were `null`
      - this confirms exact-model requests remain controller-inactive and backward-compatible in the current run

## Evidence and Artifacts

- `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Issues Found

- none

## User Sign-Off

- Approved by: `not requested; agent-operated QA only`
- Date: `not applicable`

## Traceability

- `R1` -> verified by the intelligent-alias controller-active readback plus the preserved `controllerRouting.acceptedDirectives` payload in `phase5-readback.txt`
- `R2` -> verified by the intelligent-alias accepted-directive payload and by the invalid-output fallback readback in `phase5-readback.txt`
- `R3` -> verified by the mixed-pool intelligent-alias readback selecting the remote endpoint while still exposing the full local-plus-remote candidate pool
- `R4` -> verified by the persisted controller diagnostics and fallback metadata in `phase5-readback.txt`
- `R5` -> verified by the controller-active, controller-fallback, basic-alias, and exact-model readbacks that clearly separate the operator-visible modes
- `R6` -> verified by this run-owned agent-operated QA pass grounded in the locked Phase 3 and Phase 4 evidence

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `the remaining Phase 5 work was a controller-owned live readback pass over persisted request observations from the mixed local-plus-remote runtime harness.`
- Delegation Decision Basis: `the QA question was whether the operator-readable runtime surfaces clearly distinguished controller-active, controller-fallback, alias-only, and exact-model behavior.`
- Delegation Override Reason: `controller-owned execution kept the live runtime setup, readback evidence, and final receipt in one auditable chain.`
- Audit Inputs Provided:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Effective Inputs Re-read

- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Earlier Phase Reconciliation

- `03-implementation-summary.md`: the locked implementation already added controller config ownership, validated directive merge, live controller execution, and durable controller diagnostics.
- `04-test-summary.md`: the locked validation chain already proved the implementation from the Phase 3 baseline, so Phase 5 focused on operator-readable live runtime readback rather than re-running the full validation chain.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - started a live mock-backed hybrid runtime from the run-28 worktree
  - read persisted request observations for controller-active, controller-fallback, basic-alias, and exact-model requests
  - captured `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - replaced the first oversized QA payload attempt with the compact readback summary saved under the run-owned evidence path so the final note stays readable and durable

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Comparison reference: `working-tree`
- Normalized baseline: `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Base branch: `recursive/27-router-runtime-difficulty-learning-cache`
- Worktree branch: `recursive/28-router-runtime-controller-guided-routing`
- Actual changed files reviewed:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/05-manual-qa.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
- Unexplained drift:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md` continues to show pre-existing status churn and remains outside the Phase 5 product scope.
  - earlier run-local phase artifacts remain worktree-local because the run has not been closed or committed yet; no additional unexplained product drift was introduced during Phase 5.

## Gaps Found

- none

## Repair Work Performed

- replaced the first manual-QA harness output with a compact readback summary so the run-owned evidence file captures only the operator-relevant controller fields
- kept the final readback note phase-owned and limited to controller-visible runtime surfaces rather than reopening implementation scope

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: live readback shows the controller contract remains active and preserved on intelligent-mode requests.
- R2 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: accepted-directive and invalid-output fallback payloads remain deterministic and operator-readable.
- R3 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Implementation Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: the intelligent alias still selects the remote endpoint while exposing the full mixed candidate pool.
- R4 | Status: verified | Changed Files: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: persisted observations retain controller-active and controller-fallback metadata for later audit and learning.
- R5 | Status: verified | Changed Files: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Implementation Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: operators can now distinguish controller-active, controller-fallback, alias-only, and exact-model request behavior on the live readback surface.
- R6 | Status: verified | Changed Files: `/.recursive/run/28-router-runtime-controller-guided-routing/05-manual-qa.md`, `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`, `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md` | Verification Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: the run-owned QA note replays the locked controller slice through live runtime surfaces and preserves the evidence under the run directory.

## Audit Verdict

- Audit summary: the Phase 5 readback pass confirmed that controller-active steering, invalid-output fallback, basic alias behavior, and exact-model backward compatibility are all visible and internally consistent on live run-28 runtime surfaces.
Audit: PASS

## Coverage Gate

- [x] The QA scenarios cover controller-active steering, invalid-output fallback, controller-inactive alias behavior, and exact-model compatibility
- [x] Agent-operated QA has a concrete run-owned evidence path
- [x] No unresolved Phase 5 issue remains

Coverage: PASS

## Approval Gate

- [x] The QA receipt is grounded in locked earlier phases and concrete readback evidence
- [x] No unresolved manual-QA blocker remains

Approval: PASS
