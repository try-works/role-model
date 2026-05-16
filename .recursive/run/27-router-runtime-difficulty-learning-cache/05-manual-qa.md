Run: `/.recursive/run/27-router-runtime-difficulty-learning-cache/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-11T15:09:30Z`
LockHash: `5fca4a2b0b01681aeefe7d11318d8283150255e7d956d3dc1a8567b14c00e63c`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
Outputs:
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/05-manual-qa.md`
Scope note: This artifact records the agent-operated readback QA pass for the locked run-27 stateful difficulty-learning slice from the Phase 4 baseline.

## TODO

- [x] Re-read the locked implementation and test receipts
- [x] Review live bucketed profile and advisory readback
- [x] Review deterministic cache reuse and cache invalidation readback
- [x] Review observed override and bucket-selected routing readback
- [x] Save run-owned QA notes under the evidence directory
- [x] Complete the audited Phase 5 sections and gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Operator: `main agent`
- Agent Executor: `GitHub Copilot CLI main agent`
- Tools Used: `powershell`, `tsx`, runtime-host-bridge backend readback surfaces
- Evidence Path: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`

## QA Scenarios and Results

1. **Bucketed profile and advisory readback**
   - Steps:
     - started a hybrid runtime from the repo-owned mock vendor validation plan
     - sent one easy request and one hard request through `model = "gpt-5.4-difficulty"`
     - read the selected local and remote endpoint profiles after those requests
     - reviewed the saved JSON in `phase5-readback.txt`
   - Result: PASS
   - Notes:
     - the easy request selected `llama-swap.local.local-llama-3-1-8b-instruct` and the hard request selected `openai.litellm.global.openai-gpt-4-1-mini-fast`
     - endpoint profile readback exposed `difficultyProfiles.easy` for the local endpoint and `difficultyProfiles.hard` for the remote endpoint, plus `recentSamples[*].difficulty_bucket`
     - `advisoryMaxDifficultyRecommendation` remained explicit and operator-readable on both endpoints, with `recommendedMaxDifficulty = null` and `rejectionReasons = ["min-samples"]` because the live QA pass intentionally seeded only one sample per bucket while still surfacing the advisory thresholds and evaluation payload

2. **Conversation cache reuse readback**
   - Steps:
     - started a hybrid runtime with the validator-aligned difficulty-learning invalidation profile (`reclassify_on_code_or_schema_change = false`)
     - sent one hard request with tools, then a lightweight follow-up request against the same difficulty alias
     - read the persisted observation for `req-run27-phase5-cache-hit`
     - reviewed the saved `difficultyRouting` and `observedProfile` payloads in `phase5-readback.txt`
   - Result: PASS
   - Notes:
     - the follow-up request retained `difficulty = "hard"` and `strategy = "quality"` with `cacheHit = true`
     - `excludedEndpointIds` still contained `llama-swap.local.local-llama-3-1-8b-instruct`, proving the cached hard classification preserved the same remote-only gating outcome
     - the persisted `observedProfile` block kept `difficultyBucket = "hard"` even though the follow-up prompt had `toolCount = 0`, showing the runtime reused the cached conversation difficulty instead of reclassifying

3. **Conversation cache invalidation readback**
   - Steps:
     - started a hybrid runtime with `reclassify_on_code_or_schema_change = true`
     - sent one hard seed request with tools, then a lightweight follow-up request against the same difficulty alias
     - read the persisted observation for `req-run27-phase5-invalidation-final`
     - reviewed the saved invalidation payload in `phase5-readback.txt`
   - Result: PASS
   - Notes:
     - the follow-up request reclassified to `difficulty = "easy"` with `strategy = "cost"`
     - the runtime recorded `cacheInvalidated = true` with `cacheInvalidationReasons = ["code-or-schema-change"]`
     - the persisted `observedProfile` block switched to `difficultyBucket = "easy"`, proving the invalidation path re-entered live classification instead of replaying cached hard state

4. **Observed override readback**
   - Steps:
     - started a remote-only difficulty runtime where `openai/gpt-4.1-mini-fast` remained statically capped at `max_difficulty = "easy"`
     - seeded a hard-bucket observed profile for that endpoint in runtime-owned SQLite state
     - sent one hard request through `model = "gpt-5.4"`
     - read the persisted observation for `req-run27-phase5-override`
   - Result: PASS
   - Notes:
     - the request succeeded on `openai.litellm.global.openai-gpt-4-1-mini-fast` even though the configured cap remained `easy`
     - persisted diagnostics recorded `overrideAppliedEndpointIds = ["openai.litellm.global.openai-gpt-4-1-mini-fast"]`
     - `overrideRecommendedMaxDifficultyByEndpointId` mapped that endpoint to `hard`, and the `observedProfile` block recorded `difficultyBucket = "hard"` with `bucketOverrideApplied = true`

5. **Bucket-selected routing readback**
   - Steps:
     - started a two-endpoint remote difficulty runtime with both OpenAI and Anthropic endpoints in the alias pool
     - seeded endpoint-wide profiles that favored OpenAI but hard-bucket profiles that favored Anthropic
     - sent one hard request through `model = "gpt-5.4"`
     - read the persisted observation for `req-run27-phase5-bucket`
   - Result: PASS
   - Notes:
     - the request selected `anthropic.litellm.global.claude-3-7-sonnet`
     - the alias surface still exposed both eligible endpoints in `allowEndpoints`
     - the persisted `observedProfile` block recorded `difficultyBucket = "hard"` and `bucketOverrideApplied = true`, proving the hard-bucket observed profile changed the live routing outcome

## Evidence and Artifacts

- `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Issues Found

- none

## User Sign-Off

- Approved by: `not requested; agent-operated QA only`
- Date: `not applicable`

## Traceability

- `R1` -> verified by the cache reuse and cache invalidation readbacks plus the persisted `cacheHit` and `cacheInvalidationReasons` payloads in `phase5-readback.txt`
- `R2` -> verified by the endpoint-profile readback exposing per-bucket `difficultyProfiles` and by the bucket-selected routing readback
- `R3` -> verified by the observed override readback and its persisted override explanation fields
- `R4` -> verified by the advisory recommendation payloads in the endpoint-profile readback
- `R5` -> verified by the easy, hard, override, and bucket-selected request readbacks plus their persisted `rubricSignals`
- `R6` -> verified by this run-owned agent-operated QA pass grounded in the locked Phase 3 and Phase 4 evidence

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `the remaining Phase 5 work was a controller-owned live readback pass over seeded runtime state and persisted request observations.`
- Delegation Decision Basis: `the QA question was whether the operator-readable runtime surfaces exposed bucketed profiles, advisory recommendations, cache semantics, override explanations, and bucket-selected routing outcomes clearly and consistently.`
- Delegation Override Reason: `controller-owned execution kept the seeded runtime setup, readback evidence, and final receipt in one auditable chain.`
- Audit Inputs Provided:
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Effective Inputs Re-read

- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Earlier Phase Reconciliation

- `03-implementation-summary.md`: the locked implementation already added conversation cache persistence, bucketed observed profiles, advisory recommendation readback, override diagnostics, and bucket-selected observed-profile diagnostics.
- `04-test-summary.md`: the locked validation chain already proved the implementation from the Phase 3 baseline, so Phase 5 focused on operator-readable live runtime readback rather than re-running the full validation chain.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - started live mock-backed runtimes from the run-27 worktree
  - seeded runtime-owned observed profile state for the override and bucket-selection scenarios
  - re-read endpoint profile and request observation surfaces and captured `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - regenerated the Phase 5 evidence note after the first cache-reuse harness reproduced invalidation instead of the intended cache-hit path, then re-ran the validator-aligned repeat-request scenario so the final note records both behaviors distinctly

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3d47440b3641de91f099149e38b8a902568d4675`
- Comparison reference: `working-tree`
- Normalized baseline: `3d47440b3641de91f099149e38b8a902568d4675`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3d47440b3641de91f099149e38b8a902568d4675`
- Base branch: `recursive/26-router-runtime-difficulty-guided-routing`
- Worktree branch: `recursive/27-router-runtime-difficulty-learning-cache`
- Actual changed files reviewed:
  - `.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/05-manual-qa.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/runtime-observability/test/index.test.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/test/index.test.ts`
- Unexplained drift:
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md` and `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md` continue to show pre-existing status churn and remain outside the Phase 5 product scope.
  - earlier run-27 phase artifacts remain worktree-local because the run has not been closed or committed yet; no additional unexplained product drift was introduced during Phase 5.
  - `/.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc` changes when local Python lock tooling runs and is treated as controller-tooling fallout rather than product drift.

## Gaps Found

- none

## Repair Work Performed

- regenerated the manual-QA evidence note so the cache-reuse scenario reflects the validator-aligned repeat-request configuration and records a real `cacheHit` instead of a second invalidation-only path
- kept the final readback note phase-owned and limited to operator-visible runtime surfaces rather than reopening implementation scope

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts` | Implementation Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt` | Audit Note: the live readback shows both deterministic cache reuse (`cacheHit = true`) and deterministic reclassification (`cacheInvalidated = true`, `cacheInvalidationReasons = ["code-or-schema-change"]`).
- R2 | Status: verified | Changed Files: `/role-model-router/packages/profile-aggregator/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt` | Audit Note: live endpoint-profile readback exposes per-bucket `difficultyProfiles` and `recentSamples[*].difficulty_bucket`, and the bucket-selected routing readback proves hard-bucket state changes runtime behavior.
- R3 | Status: verified | Changed Files: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt` | Audit Note: the live override readback records `overrideAppliedEndpointIds` and `overrideRecommendedMaxDifficultyByEndpointId` while still leaving configured ceilings unchanged.
- R4 | Status: verified | Changed Files: `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt` | Audit Note: endpoint-profile readback surfaces advisory recommendation thresholds and evaluation results directly, including the explicit `min-samples` rejection when live QA has not yet accumulated enough evidence.
- R5 | Status: verified | Changed Files: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt` | Audit Note: persisted `rubricSignals` stay consistent across easy, hard, cache-reused, invalidated, override, and bucket-selected requests.
- R6 | Status: verified | Changed Files: `/.recursive/run/27-router-runtime-difficulty-learning-cache/05-manual-qa.md`, `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`, `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md` | Verification Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/manual-qa/phase5-readback.txt` | Audit Note: the run-owned QA note replays the locked learning slice through live runtime surfaces and preserves the evidence under the run directory.

## Audit Verdict

- Audit summary: the Phase 5 readback pass confirmed that bucketed profile inspection, advisory recommendation payloads, deterministic cache reuse, deterministic invalidation, observed override explanations, and bucket-selected routing outcomes are all visible and internally consistent on live run-27 runtime surfaces.
Audit: PASS

## Coverage Gate

- [x] The QA scenarios cover bucketed profile readback, advisory payload readback, cache reuse, cache invalidation, observed override, and bucket-selected routing
- [x] Agent-operated QA has a concrete run-owned evidence path
- [x] No unresolved Phase 5 issue remains

Coverage: PASS

## Approval Gate

- [x] The QA receipt is grounded in locked earlier phases and concrete readback evidence
- [x] No unresolved manual-QA blocker remains

Approval: PASS
