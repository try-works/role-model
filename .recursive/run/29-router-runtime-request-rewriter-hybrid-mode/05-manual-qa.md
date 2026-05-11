Run: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-11T19:32:50Z`
LockHash: `0156059a224f6f04fae8ae0daa00640e10cdc0e46fad22ca71c27ac30cd0d91e`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/04-test-summary.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
Outputs:
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/05-manual-qa.md`
Scope note: This artifact records the agent-operated readback QA pass for the locked run-29 rewrite, per-request override, and hybrid-routing slice from the Phase 4 baseline.

## TODO

- [x] Re-read the locked implementation and test receipts
- [x] Review override-mode readback for the basic alias pool
- [x] Review controller and hybrid arbitration readback for the intelligent alias pool
- [x] Review exact-model rewrite-skipped readback
- [x] Review invalid override rejection over the live HTTP ingress
- [x] Save run-owned QA notes under the evidence directory
- [x] Complete the audited Phase 5 sections and gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Operator: `main agent`
- Agent Executor: `GitHub Copilot CLI main agent`
- Tools Used: `powershell`, `tsx`, runtime-host-bridge backend and HTTP readback surfaces
- Evidence Path: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`

## QA Scenarios and Results

1. **Basic alias override-mode readback**
   - Steps:
      - started a mixed local-plus-remote runtime from the repo-owned mock vendor validation plan
      - sent the same alias request through `model = "gpt-5.4"` with explicit `baseline`, `difficulty`, `controller`, and `hybrid` overrides
      - read the persisted observations for `req-run29-phase5-baseline`, `req-run29-phase5-difficulty`, `req-run29-phase5-controller`, and `req-run29-phase5-hybrid`
      - reviewed the saved routing diagnostics in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - each request preserved the mixed local-plus-remote candidate pool in `aliasResolution.allowEndpoints`
      - each request recorded `routingMode.source = "request-override"` with the expected `effectiveMode`
      - difficulty-mode readback added `difficultyRouting`, controller-mode readback added `controllerRouting`, and hybrid-mode readback added `hybridArbitration`
      - each alias request recorded `rewrite.applied = true` with the selected concrete downstream model id
      - the mock harness converged on the local endpoint for all four override modes, so this scenario verified decision-path differentiation in the receipts rather than route-outcome divergence

2. **Intelligent alias controller and hybrid arbitration readback**
   - Steps:
      - reused the same mixed local-plus-remote runtime
      - sent the same intelligent alias request through `model = "gpt-5.4-intelligent"` with explicit `baseline`, `difficulty`, `controller`, and `hybrid` overrides
      - read the persisted observations for `req-run29-phase5-intelligent-baseline`, `req-run29-phase5-intelligent-difficulty`, `req-run29-phase5-intelligent-controller`, and `req-run29-phase5-intelligent-hybrid`
      - reviewed the saved controller and hybrid diagnostics in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - controller-mode readback recorded `controllerRouting.active = true` and preserved `acceptedDirectives.preferredEndpointIds = ["openai.litellm.global.openai-gpt-4-1-mini-fast"]`
      - hybrid-mode readback recorded `hybridArbitration.active = true`, `controllerChangedPlan = true`, `dominantSignal = "controller"`, and `finalStrategy = "quality"`
      - the mixed candidate pool remained visible in `aliasResolution.allowEndpoints`, so the readback clearly distinguished controller or hybrid steering from baseline or difficulty-only behavior
      - the mock harness again selected the local endpoint, so endpoint divergence for the same pool remains anchored to the locked Phase 4 validator evidence rather than this readback-only pass

3. **Exact-model compatibility readback**
   - Steps:
      - reused the same runtime
      - sent one exact-model request through `model = "local/llama-3.1-8b-instruct"` with `routingModeOverride = "baseline"`
      - read the persisted observation for `req-run29-phase5-exact-model`
      - reviewed the saved rewrite receipt in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - the request selected `llama-swap.local.local-llama-3-1-8b-instruct`
      - `routingDiagnostics.rewrite.applied = false`
      - `rewrite.reason = "requested-model-matches-downstream"` confirms exact-model requests remain additive and do not invent unnecessary rewriting

4. **Invalid override rejection**
   - Steps:
      - reused the same runtime
      - sent one HTTP request to `/v1/chat/completions` with header `x-role-model-routing-mode: unsupported-mode`
      - recorded the response body in `phase5-readback.txt`
   - Result: PASS
   - Notes:
      - the bridge returned `400`
      - the response body stated `Invalid x-role-model-routing-mode header value "unsupported-mode". Expected one of: baseline, difficulty, controller, hybrid.`
      - this confirms invalid overrides fail deterministically at ingress instead of silently altering default routing behavior

## Evidence and Artifacts

- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Issues Found

- none in product behavior

## User Sign-Off

- Approved by: `not requested; agent-operated QA only`
- Date: `not applicable`

## Traceability

- `R1` -> verified by the basic alias rewrite-applied readback plus the exact-model rewrite-skipped readback in `phase5-readback.txt`
- `R2` -> verified by the intelligent alias controller and hybrid arbitration receipts in `phase5-readback.txt`
- `R3` -> verified by the override-mode request readbacks and the explicit `400` invalid-override rejection in `phase5-readback.txt`
- `R4` -> verified by the exact-model readback that preserves `rewrite.applied = false` when the downstream model already matches the requested model
- `R5` -> verified by the operator-visible routing-mode, difficulty, controller, hybrid, and rewrite receipts captured in `phase5-readback.txt`
- `R6` -> verified by this run-owned agent-operated QA pass together with the locked Phase 4 end-to-end validator proof for mode-driven route outcomes

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `the remaining Phase 5 work was a controller-owned live readback pass over persisted request observations and ingress error handling from the mixed runtime harness.`
- Delegation Decision Basis: `the QA question was whether operators can read back rewrite, override, and hybrid-arbitration behavior from the live request-observation and ingress surfaces.`
- Delegation Override Reason: `controller-owned execution kept the runtime setup, evidence generation, and final receipt in one auditable chain.`
- Audit Inputs Provided:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/04-test-summary.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Effective Inputs Re-read

- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/04-test-summary.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Earlier Phase Reconciliation

- `03-implementation-summary.md`: the locked implementation already added explicit rewrite receipts, per-request override handling, hybrid arbitration, and durable routing diagnostics.
- `04-test-summary.md`: the locked validation chain already proved end-to-end mode-driven route outcomes, so Phase 5 focused on operator-readable request readback and ingress failure behavior rather than rerunning the full validator chain.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - started a live mixed local-plus-remote runtime from the repo-owned mock validation plan
  - read persisted request observations for basic alias overrides, intelligent alias overrides, exact-model compatibility, and invalid-override ingress rejection
  - captured `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - switched the manual-QA harness from the real validation plan to the repo-owned mock validation plan after a tooling-local `uv tool install litellm[proxy]` failure, without changing product code or Phase 4 validation evidence
  - kept the final evidence compact and operator-readable in one run-owned text file

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Comparison reference: `working-tree`
- Normalized baseline: `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Base branch: `recursive/28-router-runtime-controller-guided-routing`
- Worktree branch: `recursive/29-router-runtime-request-rewriter-hybrid-mode`
- Actual changed files reviewed:
  - `/.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/02-to-be-plan.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/04-test-summary.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/05-manual-qa.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
- Unexplained drift:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md` and `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md` continue to show run-folder newline or status churn outside the Phase 5 product scope.
  - `/.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc` was rewritten by recursive lock tooling and is tooling drift rather than product-runtime scope.
  - earlier run-local phase artifacts remain worktree-local because run 29 has not entered closeout yet; no additional unexplained product drift was introduced during Phase 5.

## Gaps Found

- none

## Repair Work Performed

- replaced the initial real-harness manual-QA attempt with the repo-owned mock validation plan after a tooling-local `litellm[proxy]` install failure so the readback pass remained deterministic and repository-owned
- kept the final Phase 5 note limited to operator-readable readback and ingress behavior rather than reopening the locked Phase 4 validator scope

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt` | Audit Note: live readback shows alias requests rewritten to the selected downstream model and exact-model requests preserved without rewrite.
- R2 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt` | Audit Note: intelligent alias readback preserves explicit controller and hybrid arbitration receipts with controller-dominant planning metadata.
- R3 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt` | Audit Note: request overrides remain visible in request observations and invalid overrides still fail closed at the HTTP ingress.
- R4 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt` | Audit Note: exact-model requests remain additive and continue to report rewrite skipped when the requested model already matches the selected endpoint.
- R5 | Status: verified | Changed Files: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Implementation Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt` | Audit Note: operators can distinguish override source, difficulty routing, controller steering, hybrid arbitration, and rewrite receipts on the same request-observation surface.
- R6 | Status: verified | Changed Files: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/05-manual-qa.md`, `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/03-implementation-summary.md`, `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/04-test-summary.md` | Verification Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/manual-qa/phase5-readback.txt` | Audit Note: the run-owned QA note replays the locked rewrite and override surfaces through live readback while Phase 4 remains the end-to-end proof for mode-driven route outcomes.

## Audit Verdict

- Audit summary: the Phase 5 readback pass confirmed that override provenance, rewrite ownership, hybrid arbitration, exact-model additive behavior, and invalid-override ingress handling are all visible and internally consistent on live run-29 runtime surfaces.
Audit: PASS

## Coverage Gate

- [x] The QA scenarios cover basic alias overrides, intelligent alias arbitration readback, exact-model compatibility, and invalid-override ingress failure
- [x] Agent-operated QA has a concrete run-owned evidence path
- [x] No unresolved Phase 5 issue remains

Coverage: PASS

## Approval Gate

- [x] The QA receipt is grounded in locked earlier phases and concrete readback evidence
- [x] No unresolved manual-QA blocker remains

Approval: PASS
