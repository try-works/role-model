Run: `/.recursive/run/26-router-runtime-difficulty-guided-routing/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-11T13:41:35Z`
LockHash: `abbbc4740e1e77c74a843d3b316109a535dc37905119ff935f7938ce903203ec`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
Outputs:
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/05-manual-qa.md`
Scope note: This artifact records the agent-operated readback QA pass for the difficulty-guided routing slice from the locked Phase 4 baseline.

## TODO

- [x] Re-read the locked implementation and test receipts
- [x] Review runtime-served difficulty-alias discovery
- [x] Review one easy difficulty request readback and its persisted diagnostics
- [x] Review one hard difficulty request readback and its persisted gating behavior
- [x] Save run-owned QA notes under the evidence directory
- [x] Complete the audited Phase 5 sections and gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Operator: `main agent`
- Agent Executor: `GitHub Copilot CLI main agent`
- Tools Used: `powershell`, `tsx`, runtime-host-bridge HTTP surfaces
- Evidence Path: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt`

## QA Scenarios and Results

1. **Runtime-served difficulty-alias discovery readback**
   - Steps:
     - started a hybrid runtime with the run-26 difficulty alias config from the repo-owned mock vendor validation plan
     - called `GET /v1/models`
     - reviewed the saved readback JSON in `phase5-readback.txt`
   - Result: PASS
   - Notes:
     - the runtime exposed both `gpt-5.4` and `gpt-5.4-difficulty` alongside the real local and remote model ids
     - this confirms the operator-visible model surface exposes the difficulty alias directly

2. **Easy difficulty request observation readback**
   - Steps:
     - sent one `POST /v1/responses` request with `model = "gpt-5.4-difficulty"` and input `Say hello in one sentence.`
     - read the persisted observation for `req-run26-phase5-easy`
     - reviewed the saved `aliasResolution` and `difficultyRouting` payloads in `phase5-readback.txt`
   - Result: PASS
   - Notes:
     - the request succeeded with `statusCode = 200`
     - persisted diagnostics classified the request as `easy` with strategy `cost`
     - `allowEndpoints` exposed both the local and remote pool members and no endpoint was excluded
     - the rubric-signal summary stayed lightweight (`toolCount = 0`, `codeOrSchemaBurden = false`)

3. **Hard difficulty request observation readback**
   - Steps:
     - sent one `POST /v1/responses` request with `model = "gpt-5.4-difficulty"`, higher-burden input, and two tools
     - read the persisted observation for `req-run26-phase5-hard`
     - reviewed the saved `difficultyRouting` payload in `phase5-readback.txt`
   - Result: PASS
   - Notes:
     - the request succeeded with `statusCode = 200`
     - persisted diagnostics classified the request as `hard` with strategy `quality`
     - `excludedEndpointIds` contained `llama-swap.local.local-llama-3-1-8b-instruct`, proving live `maxDifficulty` gating on the local endpoint
     - rubric signals reflected the heavier request burden (`toolCount = 2`, `decompositionKeywordCount = 3`, `codeOrSchemaBurden = true`)

4. **Readback constraint reconciliation for medium-path QA**
   - Steps:
     - reviewed the saved QA note in `phase5-readback.txt`
     - reconciled the manual readback against the locked Phase 3 and Phase 4 evidence
   - Result: PASS
   - Notes:
     - the repo-owned mock classifier used for agent-operated QA emits `easy` or `hard` only
     - medium-path routing remains covered by the locked automated evidence from Phase 3 and Phase 4 rather than by this live mock-backed readback pass
     - no manual-QA blocker remains because the operator-visible easy and hard paths, alias visibility, and gating readback are all correct

## Evidence and Artifacts

- `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Issues Found

- none

## User Sign-Off

- Approved by: `not requested; agent-operated QA only`
- Date: `not applicable`

## Traceability

- `R1` -> verified by the runtime-served difficulty-alias discovery readback and the Phase 5 evidence note
- `R2` -> verified by the easy and hard difficulty request readbacks plus the persisted classifier-driven difficulty payloads
- `R3` -> verified by the easy-versus-hard strategy readback (`cost` vs `quality`)
- `R4` -> verified by the hard request readback and its persisted `excludedEndpointIds` payload
- `R5` -> verified by the easy and hard request observation readbacks and their persisted rubric-signal summaries
- `R6` -> verified by the agent-operated QA pass grounded in the locked Phase 4 evidence and run-owned readback note

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `the remaining QA work was a controller-owned readback pass over live HTTP surfaces and persisted observation output.`
- Delegation Decision Basis: `the QA question was whether the operator-visible difficulty alias, easy-path diagnostics, hard-path gating, and persisted observation payloads were clear and internally consistent.`
- Delegation Override Reason: `a delegated pass would still depend on the same live runtime readback, so controller-owned review kept the QA receipt tightly grounded in the captured evidence.`
- Audit Inputs Provided:
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Effective Inputs Re-read

- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Earlier Phase Reconciliation

- `03-implementation-summary.md`: difficulty config ownership, classifier execution, strategy mapping, gating, and persisted diagnostics were implemented as planned and locked before QA.
- `04-test-summary.md`: focused tests and runtime validators were already green, so Phase 5 focused on operator-visible readback clarity for alias discovery, difficulty diagnostics, and hard-path gating rather than re-proving implementation correctness.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - started a live hybrid runtime from the run-26 worktree using the repo-owned mock vendor plan
  - re-read `/v1/models`, one easy difficulty request observation, and one hard difficulty request observation
  - captured `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - authored the Phase 5 evidence note and `05-manual-qa.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Comparison reference: `working-tree`
- Normalized baseline: `38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Base branch: `recursive/25-router-runtime-model-alias-pool`
- Worktree branch: `recursive/26-router-runtime-difficulty-guided-routing`
- Actual changed files reviewed:
  - `.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc`
  - `.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
  - `.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
  - `.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md`
  - `.recursive/run/26-router-runtime-difficulty-guided-routing/05-manual-qa.md`
  - `.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
- Unexplained drift:
  - none

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts` | Implementation Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: the live readback shows the difficulty alias is exposed directly on the runtime model surface.
- R2 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: persisted easy and hard observations expose classifier-driven difficulty payloads on live operator-readable surfaces.
- R3 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: the live readback shows easy requests map to `cost` while hard requests map to `quality`.
- R4 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Implementation Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: the hard-path readback proves persisted `excludedEndpointIds` for the underpowered local endpoint.
- R5 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: persisted difficulty diagnostics and rubric-signal summaries are readable from live runtime observations rather than only from test fixtures.
- R6 | Status: verified | Changed Files: `/.recursive/run/26-router-runtime-difficulty-guided-routing/05-manual-qa.md`, `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt` | Implementation Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`, `/.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md` | Verification Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/manual-qa/phase5-readback.txt` | Audit Note: the run-owned agent-operated QA note proves the locked implementation and validation surfaces are operator-readable.

## Audit Verdict

- Audit summary: the Phase 5 readback pass confirmed that the difficulty alias, easy-path diagnostics, hard-path gating, and persisted observation payloads are visible and internally consistent across live runtime surfaces.
Audit: PASS

## Coverage Gate

- [x] The QA scenarios cover runtime-served difficulty-alias discovery, easy request diagnostics, hard request gating, and the manual-QA coverage constraint around the binary mock classifier
- [x] Agent-operated QA has a concrete run-owned evidence path
- [x] No unresolved Phase 5 issue remains

Coverage: PASS

## Approval Gate

- [x] The QA receipt is grounded in locked earlier phases and concrete readback evidence
- [x] No unresolved manual-QA blocker remains

Approval: PASS
