Run: `/.recursive/run/69-benchmark-scoring-integrity/`
Phase: `05 Manual QA packaged benchmark matrix expansion addendum`
Status: `LOCKED`
LockedAt: `2026-07-14T04:49:21Z`
LockHash: `058cb18b906289e7254b3349c1aa4df123d249b4f669eeea07bf9f762a96bb11`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md` (LOCKED)
- `/.recursive/run/69-benchmark-scoring-integrity/addenda/05-manual-qa.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
Outputs:
- `/.recursive/run/69-benchmark-scoring-integrity/addenda/05-manual-qa.packaged-benchmark-matrix-expansion.addendum-02.md`
Scope note: This current-phase addendum expands the packaged-runtime re-verification matrix for run 69 beyond GPT and Kimi. Per the latest operator instruction, the rebuilt packaged runtime must rerun both quick and full benchmarks with the four currently configured remote subjects: `chatgpt/gpt-5.4`, `moonshot/kimi-k2.7-code`, `deepseek/deepseek-v4-flash`, and `deepseek/deepseek-v4-pro`.

## TODO

- [x] Record the expanded packaged-runtime subject matrix and judge-overlap disposition
- [x] Rebuild the packaged runtime from the run-69 worktree
- [x] Capture packaged-runtime health and direct endpoint proof before benchmarks
- [x] Run the quick packaged benchmark with GPT, Kimi, DeepSeek v4 Flash, and DeepSeek v4 Pro
- [x] Run the full packaged benchmark with GPT, Kimi, DeepSeek v4 Flash, and DeepSeek v4 Pro
- [x] Validate both packaged-runtime runs and record the resulting evidence paths
- [x] Complete Coverage and Approval gates before locking

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Delegation Decision Basis: this addendum required direct control of the packaged standalone runtime, live Kimi device authorization, rebuilt binary launch/restart, and long-running benchmark supervision on `127.0.0.1:3456`.

## Expanded Packaged Matrix

- Packaged runtime:
  - executable: `/role-model-router/dist/release/win32-x64/role-model-runtime.exe`
  - SHA-256: `c90f2fcbcf9146ac2b160ede786f05fea709f3560ebc82a28e496e1594630dbc`
  - runtime base URL: `http://127.0.0.1:3456`
  - runtime scope: `standalone-runtime`
  - runtime state root: `C:\Users\erikb\AppData\Local\Role Model Runtime`
- Subject endpoints:
  - `moonshot.personal.kimi-code.global.kimi-k2.7-code`
  - `openai.personal.openai-codex-subscription.global.gpt-5.4`
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-flash`
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- Judge endpoint:
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
- Judge-overlap disposition:
  - `judgeSubjectOverlap: true` for both packaged runs
  - accepted intentionally because the requested subject matrix already consumes every configured remote benchmark subject
  - run-69 benchmark repairs explicitly support overlap mode and surface the expected warning instead of treating it as a workflow defect

## Remediation Performed Before Re-Verification

1. Added a strict-TDD restart regression:
   - `restart rehydration > refreshes Kimi OAuth after restart by honoring the stored token device id`
2. Repaired packaged/runtime-host Kimi OAuth refresh behavior:
   - `/role-model-router/apps/runtime-host-bridge/src/index.ts` now recovers `device_id` from stored Kimi OAuth JWT payloads and reuses it for refresh, remote-health probe headers, and direct exact-model execution headers
3. Revalidated the focused floor:
   - `test/restart-rehydration.test.ts`
   - `test/restart-rehydration.test.ts test/index.test.ts`
   - `go test .` in `/role-model-router/apps/launcher` with `GO111MODULE=off`
4. Rebuilt the packaged runtime from the run-69 worktree.
5. Repaired the live packaged Kimi credential by starting a packaged-runtime device authorization and completing it through the existing local Kimi browser session.
6. Restarted the rebuilt packaged runtime after Kimi re-authentication so startup had to prove the new restart-safe path live.

## Packaged Runtime Proof

- Snapshot evidence:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-runtime-snapshot/healthz.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-runtime-snapshot/runtime-summary.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-runtime-snapshot/accounts.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-runtime-snapshot/endpoints.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-runtime-snapshot/direct-probes/`
- Packaged startup verdict after Kimi re-auth plus restart:
  - `/healthz.status = healthy`
  - `credentialLifecycleAuthority.bootstrapStatus = ready`
  - `sessionBootstrap.status = ready`
  - `remote-health.details.healthy = 3`
  - `remote-health.details.degraded = 0`
  - Kimi account lifecycle: `execution-ready`
  - Kimi endpoint health: `healthy`
- Direct exact-model proof:
  - `chatgpt/gpt-5.4` -> `OK`
  - `moonshot/kimi-k2.7-code` -> `OK`
  - `deepseek/deepseek-v4-flash` -> `OK`
  - `deepseek/deepseek-v4-pro` -> `OK`

## Packaged Quick Benchmark

- Evidence:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-quick-rerun-1/start.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-quick-rerun-1/completed-progress.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-quick-rerun-1/result.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-quick-rerun-1/validation.json`
- Run facts:
  - run id: `cc8ce36c-e945-428b-ae77-cd224dec0036`
  - mode: `quick`
  - judge endpoint: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - `judgeSubjectOverlap: true`
- Validation verdict:
  - `workflowVerdict = VALID`
  - judge parse success: `48 / 48`
  - heuristic fallback: `0 / 48`
  - compare artifact count: `12`
  - progress: `108 / 108`
- Scores:
  - `moonshot/kimi-k2.7-code` -> `0.9166666666666666`
  - `chatgpt/gpt-5.4` -> `0.9166666666666666`
  - `deepseek/deepseek-v4-flash` -> `0.75`
  - `deepseek/deepseek-v4-pro` -> `1`

## Packaged Full Benchmark

- Evidence:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-full-rerun-1/start.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-full-rerun-1/completed-progress.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-full-rerun-1/result.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/packaged-full-rerun-1/validation.json`
- Run facts:
  - run id: `67421812-9a7b-4d18-9996-592bba5d06a4`
  - mode: `full`
  - judge endpoint: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - `judgeSubjectOverlap: true`
- Validation verdict:
  - `workflowVerdict = VALID`
  - judge parse success: `220 / 220`
  - heuristic fallback: `0 / 220`
  - compare artifact count: `55`
  - progress: `495 / 495`
- Scores:
  - `moonshot/kimi-k2.7-code` -> `0.9454545454545454`
  - `chatgpt/gpt-5.4` -> `0.9454545454545454`
  - `deepseek/deepseek-v4-pro` -> `0.9436363636363636`
  - `deepseek/deepseek-v4-flash` -> `0.8454545454545455`

## Requirement Completion Status

- `A1` | Status: complete | Evidence: packaged standalone startup now rehydrates Kimi into `execution-ready` with endpoint health `healthy`
- `A2` | Status: complete | Evidence: direct packaged restart moved Kimi from manual-QA failure state to `healthy` after live re-auth and fixed restart behavior
- `A3` | Status: complete | Evidence: `kimi-refresh-device-id.red.log`, `kimi-refresh-device-id.green.log`, `kimi-refresh-device-id-broader.green.log`, `kimi-refresh-device-id-launcher.green.log`
- `A4` | Status: complete | Evidence: packaged quick run `cc8ce36c-e945-428b-ae77-cd224dec0036` and packaged full run `67421812-9a7b-4d18-9996-592bba5d06a4`, both `VALID`
- `R5` | Status: complete | Evidence: restart regression floor plus packaged runtime snapshot and direct probes
- `R6` | Status: complete | Evidence: strict-TDD Kimi device-id regression landed green before packaged rebuild
- `R7` | Status: complete | Evidence: rebuilt packaged runtime completed valid quick/full four-subject reruns with Kimi, GPT, DeepSeek v4 Flash, and DeepSeek v4 Pro all in scope

## Coverage Gate

- [x] The addendum records the four-subject packaged matrix and the overlap disposition explicitly
- [x] The rebuilt packaged runtime is proven healthy after a real standalone restart
- [x] Direct exact-model probes are retained for all four benchmark subjects
- [x] The packaged quick benchmark completed `VALID`
- [x] The packaged full benchmark completed `VALID`
- [x] Validation evidence paths are retained for both packaged runs

Coverage: PASS

## Approval Gate

- [x] GPT is included in both packaged quick and packaged full benchmark runs
- [x] Kimi is included in both packaged quick and packaged full benchmark runs
- [x] DeepSeek v4 Flash is included in both packaged quick and packaged full benchmark runs
- [x] DeepSeek v4 Pro is included in both packaged quick and packaged full benchmark runs
- [x] Kimi packaged-runtime eligibility no longer fails before benchmark execution
- [x] Judge overlap is recorded honestly rather than hidden behind a reduced subject matrix

Approval: PASS
