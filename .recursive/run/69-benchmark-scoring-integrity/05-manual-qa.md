Run: `/.recursive/run/69-benchmark-scoring-integrity/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-13T13:07:25Z`
LockHash: `1c4910076eddb76aa185d9dc1e29970a4520ba51ab807387cb469c7b20ae6bea`
Inputs:
- `/.recursive/run/69-benchmark-scoring-integrity/02-to-be-plan.md`
- `/.recursive/run/69-benchmark-scoring-integrity/03-implementation-summary.md`
- `/.recursive/run/69-benchmark-scoring-integrity/04-test-summary.md`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/healthz.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/endpoints.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/direct-kimi-probe.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/start.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/completed-progress.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/result.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/validation.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/start.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/completed-progress.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/result.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/validation.json`
Outputs:
- `/.recursive/run/69-benchmark-scoring-integrity/05-manual-qa.md`
Scope note: This artifact records the final runtime verification required by `R7` on the current worktree runtime after the Phase 3 and Phase 4 closeout locks: a healthy runtime snapshot, direct Kimi endpoint proof, a valid quick rerun with Kimi and GPT both in scope, and a valid full rerun with Kimi and GPT both completing execution, grading, and compare on the latest code. Earlier reruns remain only as superseded diagnostic history.

## TODO

- [x] Refresh the repaired live runtime inventory snapshot on the current worktree runtime
- [x] Reconfirm direct post-repair Kimi endpoint proof
- [x] Record the completed quick benchmark rerun and validation verdict from the latest code
- [x] Record the completed full benchmark rerun and validation verdict from the latest code
- [x] Classify remaining low scores from the current quick and full receipts
- [x] Distinguish superseded exploratory reruns from the final release evidence
- [x] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `Codex main agent in D:\DEV\role-model\.worktrees\69-benchmark-scoring-integrity`
- Tools Used: live worktree runtime-host-bridge runtime, `powershell` with `Invoke-RestMethod`, benchmark validation script `validate-benchmark-run.py`, and retained JSON artifacts under the run-local evidence directory
- Runtime Base URL: `http://127.0.0.1:57696`
- Runtime Scope: `runtime-host-bridge`
- Runtime Evidence Path:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/`

## QA Scenarios and Results

### 1. `V1` refreshed live runtime inventory snapshot

- Snapshot evidence:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/healthz.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/endpoints.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/direct-kimi-probe.json`
- Health snapshot:
  - `/healthz` overall status: `healthy`
  - execution mode: `hybrid`
  - endpoint source: `sqlite`
  - endpoint count: `4`
  - remote-health results: `3 / 3 healthy`
- Exact active endpoint inventory:
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-flash` -> `deepseek/deepseek-v4-flash` -> `healthy`
  - `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro` -> `deepseek/deepseek-v4-pro` -> `healthy`
  - `moonshot.personal.kimi-code.global.kimi-k2.7-code` -> `moonshot/kimi-k2.7-code` -> `healthy`
  - `openai.personal.openai-codex-subscription.global.gpt-5.4` -> `chatgpt/gpt-5.4` -> `active`
- Direct endpoint proof:
  - exact-model Kimi `/v1/responses` probe returned `OK`
- Outcome:
  - Kimi is not a credential blocker on the current worktree runtime
  - the runtime is healthy enough to treat the new quick and full reruns as benchmark truth rather than availability noise

### 2. `V2` quick runtime benchmark rerun with Kimi and GPT

- Quick rerun evidence:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/start.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/completed-progress.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/result.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/validation.json`
- Run facts:
  - run id: `3210dbd4-ecae-4c3a-ae3e-24d5ce671a77`
  - mode: `quick`
  - judge endpoint: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - subject endpoints:
    - `moonshot.personal.kimi-code.global.kimi-k2.7-code`
    - `openai.personal.openai-codex-subscription.global.gpt-5.4`
- Validation verdict:
  - `workflowVerdict = VALID`
  - accuracy gates: all `PASS`
  - judge parse success: `24 / 24`
  - compare artifact count: `12`
  - progress: `60 / 60`
- Scores:
  - `moonshot/kimi-k2.7-code` -> `0.8916666666666666`
  - `chatgpt/gpt-5.4` -> `0.9166666666666666`
- Remaining non-perfect cases:
  - `moonshot/kimi-k2.7-code`
    - `h02-fix-async-counter = 0.7`
    - `h15-max-signal-v3 = 0`
  - `chatgpt/gpt-5.4`
    - `p17-tools-multi-hard = 0`
- Outcome:
  - the repaired benchmark stack executes and grades both requested subject endpoints on the latest quick slice
  - the quick rerun no longer reproduces the earlier benchmark-owned parse, cooldown, or tool-call-authority failures

### 3. `V3` full runtime benchmark rerun with Kimi and GPT

- Full rerun evidence:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/start.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/completed-progress.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/result.json`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/validation.json`
- Run facts:
  - run id: `ce77bb27-583a-4610-a54e-afa7ac0f770c`
  - mode: `full`
  - judge endpoint: `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`
  - subject endpoints:
    - `moonshot.personal.kimi-code.global.kimi-k2.7-code`
    - `openai.personal.openai-codex-subscription.global.gpt-5.4`
- End-to-end completion proof:
  - both Kimi and GPT completed subject execution
  - both Kimi and GPT completed judge grading
  - compare phase completed for the same run
- Validation verdict:
  - `workflowVerdict = VALID`
  - accuracy gates: all `PASS`
  - judge parse success: `110 / 110`
  - heuristic fallback: `0 / 110`
  - non-trivial rationale: `110 / 110`
  - compare artifact count: `55`
  - progress: `275 / 275`
- Scores:
  - `moonshot/kimi-k2.7-code` -> `0.8909090909090909`
  - `chatgpt/gpt-5.4` -> `0.9272727272727272`
- Remaining non-perfect cases:
  - `moonshot/kimi-k2.7-code`
    - `e04-capitalize = 0`
    - `l02-many-constraints = 0`
    - `c01-full-refactor = 0`
    - `t03-tools-agent-plan = 0`
    - `x02-max-context-tools = 0`
    - `h11-decompose-code-verify = 0`
  - `chatgpt/gpt-5.4`
    - `e04-capitalize = 0`
    - `p17-tools-multi-hard = 0`
    - `h05-tool-grep-eligibility = 0`
    - `h11-decompose-code-verify = 0`
- Outcome:
  - the current runtime supports a complete valid full benchmark with both requested subject endpoints
  - the final full run no longer needs reduced-subject fallback, stalled-run interpretation, or benchmark-defect caveats to establish runtime truth

### 4. `V4` superseded exploratory reruns

- Superseded diagnostic evidence retained on disk:
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-1/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-2/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-3/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-4/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-1/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-2/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-3/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-4/`
  - `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-5/`
- Final interpretation:
  - those artifacts remain useful debugging history, but they are not the final closeout proof after the latest Phase 3 and Phase 4 locks
  - the final runtime truth for this run is `V1` through `V3`

## Remaining Low-Score Classification

- Quick-run misses:
  - `moonshot/kimi-k2.7-code` `h02-fix-async-counter = 0.7`
    - classification: `substantive implementation shortfall`
    - evidence basis: the judge rationale says the mutex fix serializes the work correctly, but the top-level async invocation is not awaited so the script is not reliably runnable to completion
  - `moonshot/kimi-k2.7-code` `h15-max-signal-v3 = 0`
    - classification: `substantive deliverable-contract miss`
    - evidence basis: the final JSON omitted the required `plan`, `patch_summary`, and `test_snippet` keys even though the benchmark executed, parsed, and judged the case normally
  - `chatgpt/gpt-5.4` `p17-tools-multi-hard = 0`
    - classification: `substantive answer miss`
    - evidence basis: the judge rationale says the response validated only the JSON answer schema instead of the router-specific clues and tests the case explicitly asked for

- Full-run misses for `moonshot/kimi-k2.7-code`:
  - `e04-capitalize = 0`
    - classification: `exact answer miss`
  - `l02-many-constraints = 0`
    - classification: `constraint-following miss`
  - `c01-full-refactor = 0`
    - classification: `patch correctness miss`
  - `t03-tools-agent-plan = 0`
    - classification: `deliverable-contract miss`
  - `x02-max-context-tools = 0`
    - classification: `placeholder or incomplete-answer miss`
  - `h11-decompose-code-verify = 0`
    - classification: `substantive deliverable miss`

- Full-run misses for `chatgpt/gpt-5.4`:
  - `e04-capitalize = 0`
    - classification: `exact answer miss`
  - `p17-tools-multi-hard = 0`
    - classification: `malformed or no-op patch miss`
  - `h05-tool-grep-eligibility = 0`
    - classification: `tool-argument miss`
  - `h11-decompose-code-verify = 0`
    - classification: `substantive deliverable miss`

- Benchmark-level conclusion:
  - both current reruns are `VALID`, judge parse success is `24 / 24` for quick and `110 / 110` for full, and compare artifact counts are complete
  - no remaining low score in the final quick or full proof needs a benchmark-parser, suite-contract, cooldown, or credential explanation
  - the remaining low scores are model-output failures or substantive answer shortfalls under a now-valid benchmark

## Evidence and Artifacts

Final release evidence:
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/healthz.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/endpoints.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/runtime-snapshot/direct-kimi-probe.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/start.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/completed-progress.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/result.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/quick-rerun-5/validation.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/start.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/completed-progress.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/result.json`
- `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/full-rerun-6/validation.json`

Superseded exploratory evidence retained for history only:
- earlier quick rerun directories under `/.recursive/run/69-benchmark-scoring-integrity/evidence/runtime/`
- `full-rerun-1/`
- `full-rerun-2/`
- `full-rerun-3/`
- `full-rerun-4/`
- `full-rerun-5/`

## User Sign-Off

- Approved by: `agent-operated closeout per locked QA mode`
- Date: `2026-07-13`

## Traceability

- `R1` -> the final closeout uses the same isolated local `main`-based worktree and runtime captured in `/.recursive/run/69-benchmark-scoring-integrity/00-worktree.md`
- `R2` -> the final quick and full runtime receipts no longer exhibit overlap-only grading collapse after the Phase 3 parity repair
- `R3` -> quick rerun `24 / 24` parse success and full rerun `110 / 110` parse success prove the repaired code-fence and deliverable-formatting path holds live
- `R4` -> the current quick and full reruns keep the repaired suite-contract surfaces gradable instead of reproducing earlier contradictory-contract failures
- `R5` -> runtime reruns consume the benchmark-owned regression floor proven in Phase 4 and preserve compare artifacts as diagnostic receipts without rewriting endpoint scores
- `R6` -> the runtime verification loop iterated on the current code until fresh `VALID` quick and full receipts existed on top of the locked implementation and test phases
- `R7` -> `quick-rerun-5` and `full-rerun-6` both completed `VALID`, with both requested subject endpoints included and with remaining misses now classifiable as model-output failures rather than benchmark-integrity defects

## Coverage Gate

- [x] The refreshed runtime snapshot is healthy and recorded explicitly
- [x] Direct Kimi endpoint proof is retained after the auth repair
- [x] The quick rerun completed `VALID` with both Kimi and GPT included
- [x] The full rerun completed `VALID` with both Kimi and GPT included
- [x] Remaining low scores are classified from the current quick and full receipts
- [x] Earlier reruns are clearly separated from the final closeout evidence

Coverage: PASS

## Approval Gate

- [x] The runtime verification loop did not stop at package tests
- [x] GPT is part of both final quick and full verification benchmark runs
- [x] Kimi is part of both final quick and full verification benchmark runs
- [x] The final full benchmark completed on the repaired runtime without reduced subject coverage
- [x] Final evidence distinguishes historical exploratory runs from the current repaired runtime truth

Approval: PASS

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: the worktree-local recursive router still resolves delegated review roles to `ask-user`, so Phase 5 remained direct local QA.
Delegation Decision Basis: this phase required direct control of the live runtime, repeated benchmark reruns, validation against the live API, and retained JSON receipts.
