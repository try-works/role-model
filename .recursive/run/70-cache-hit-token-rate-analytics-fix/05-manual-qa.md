Run: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-14T21:37:24Z`
LockHash: `bafc531b56311c7ed25190955dd1cbb327791b8aa1f3c551b65e8ac757e855dd`
Inputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/02-to-be-plan.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/03-implementation-summary.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/04-test-summary.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/seed-cache-efficiency-runtime.ts`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/seed-runtime-result.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/telemetry-query-response.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/overview-cache-efficiency-dual-axis.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/overview-cache-efficiency-dual-axis.png`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/observe-cache-efficiency-dual-axis.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/observe-cache-efficiency-dual-axis.png`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/append-cache-supported-zero.ts`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/supported-zero-seed-result.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/supported-zero-telemetry-query-response.json`
Outputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md`
Scope note: This artifact records the rebuilt-runtime proof required by `R5` for run 70: live backend query verification of the corrected cache-hit token-rate math, Overview and Observe shared-chart proof for the new dual-axis presentation, and a separate supported-zero control proving cache-supported misses remain `0` rather than being reclassified as unsupported.

## TODO

- [x] Seed a deterministic rebuilt-runtime telemetry slice for the denominator proof
- [x] Start the rebuilt runtime from the run-70 implementation state and record the exact startup command
- [x] Capture backend telemetry-query proof for the corrected main slice
- [x] Capture Overview shared-chart dual-axis proof
- [x] Capture Observe Requests shared-chart dual-axis proof
- [x] Capture a supported-zero cache control
- [x] Complete Coverage and Approval gates before locking

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `Codex main agent in D:\DEV\role-model\.worktrees\70-cache-hit-token-rate-analytics-fix`
- Tools Used: live worktree runtime-host-bridge runtime, `powershell` with `Invoke-RestMethod`, run-local `tsx` seed helpers, and the in-app browser surface for live Overview and Observe inspection
- Runtime Base URL: `http://127.0.0.1:3476`
- Runtime Scope: `runtime-host-bridge` plus the built runtime-ui assets served by the same worktree runtime
- Runtime Startup Command:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx src/cli-entry.ts --host 127.0.0.1 --port 3476 --repo-root D:\DEV\role-model\.worktrees\70-cache-hit-token-rate-analytics-fix --runtime-state-root D:\DEV\role-model\.worktrees\70-cache-hit-token-rate-analytics-fix\.recursive\run\70-cache-hit-token-rate-analytics-fix\evidence\manual-qa\runtime-state --scope-id phase5-cache-efficiency-qa`
- Runtime Evidence Path:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/`

## QA Scenarios and Results

### 1. `V1` deterministic rebuilt-runtime seed and startup

- Seed evidence:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/seed-cache-efficiency-runtime.ts`
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/seed-runtime-result.json`
- Seed facts:
  - scope id: `phase5-cache-efficiency-qa`
  - seeded remote timestamps:
    - `firstRemoteTimestampMs = 1783971075407`
    - `secondRemoteTimestampMs = 1784035875407`
  - seeded unsupported local timestamp:
    - `localTimestampMs = 1784035935407`
  - expected main-slice totals:
    - `cacheHitTokens = 48`
    - `cacheHitTokenRate = 0.133333`
    - `cacheBackedRequestRate = 0.666667`
- Startup proof:
  - the rebuilt runtime listened successfully on `127.0.0.1:3476` using the command recorded above
- Outcome:
  - the live runtime proof below runs against deterministic worktree-owned telemetry rather than historical ambient rows

### 2. `V2` backend telemetry-query proof for the corrected main slice

- Backend query evidence:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/telemetry-query-response.json`
- Query window:
  - `startAtMs = 1783971015407`
  - `endAtMs = 1784035995407`
  - `granularity = hour`
  - `metrics = cacheHitTokens, cacheHitTokenRate, cacheBackedRequestRate`
- Totals:
  - `cacheHitTokens = 48`
  - `cacheHitTokenRate = 0.133333`
  - `cacheBackedRequestRate = 0.666667`
- Bucket proof:
  - the first supported remote bucket reports `cacheHitTokens = 16`, `cacheHitTokenRate = 0.133333`, `cacheBackedRequestRate = 1`
  - the later mixed remote-plus-unsupported-local bucket reports `cacheHitTokens = 32`, `cacheHitTokenRate = 0.133333`, `cacheBackedRequestRate = 0.5`
- Partial-support proof:
  - `metricSupport.cacheHitTokenRate.status = partial`
  - `supportedRowCount = 2`
  - `unsupportedRowCount = 1`
  - `metricSupport.cacheBackedRequestRate.status = supported`
- Outcome:
  - the rebuilt runtime now reports the truthful token rate `48 / 360 = 0.133333` while leaving request-rate semantics unchanged

### 3. `V3` Overview `Cache Efficiency` dual-axis proof

- Overview evidence:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/overview-cache-efficiency-dual-axis.json`
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/overview-cache-efficiency-dual-axis.png`
- Route:
  - `http://127.0.0.1:3476/app`
- Observed card facts:
  - heading: `Cache Efficiency`
  - left-axis ticks: `0`, `8`, `16`, `24`, `32`
  - right-axis ticks: `0`, `0.035`, `0.07`, `0.105`, `0.14`
  - bottom-axis ticks: `17:42`, `03:42`, `14:42`
  - card text still identifies the same two shared metrics:
    - `Cache hit tokens`
    - `Cache hit token rate`
- Outcome:
  - the existing Overview cache-efficiency card now renders distinct token-volume and rate scales instead of flattening the rate series against the token scale

### 4. `V4` Observe Requests `Cache Efficiency Trend` dual-axis proof

- Observe evidence:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/observe-cache-efficiency-dual-axis.json`
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/observe-cache-efficiency-dual-axis.png`
- Route:
  - `http://127.0.0.1:3476/app/observe/requests`
- Observed card facts:
  - heading: `Cache Efficiency Trend`
  - left-axis ticks: `0`, `15`, `30`, `45`, `60`
  - right-axis ticks: `0`, `0.035`, `0.07`, `0.105`, `0.14`
  - bottom-axis ticks: `Jul 7` through `Jul 13`
  - card text still identifies the same two shared metrics:
    - `Cache hit tokens`
    - `Cache hit token rate`
- Outcome:
  - the existing Observe Requests cache-efficiency chart now renders the same split-axis geometry as Overview, so the rate series is no longer visually collapsed onto the token scale

### 5. `V5` supported-zero cache control

- Supported-zero evidence:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/append-cache-supported-zero.ts`
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/supported-zero-seed-result.json`
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/supported-zero-telemetry-query-response.json`
- Control facts:
  - appended one remote cache-supported miss row at `missTimestampMs = 1784000801873`
  - query window:
    - `startAtMs = 1784000741873`
    - `endAtMs = 1784000861873`
- Control totals:
  - `cacheHitTokens = 0`
  - `cacheHitTokenRate = 0`
  - `cacheBackedRequestRate = 0`
- Support-state proof:
  - `metricSupport.cacheHitTokens.status = supported`
  - `metricSupport.cacheHitTokenRate.status = supported`
  - `metricSupport.cacheBackedRequestRate.status = supported`
  - `supportedRowCount = 1`
  - `unsupportedRowCount = 0`
- Outcome:
  - a cache-supported miss remains a truthful supported zero and is not reclassified as unsupported

## Evidence and Artifacts

Main rebuilt-runtime proof:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/seed-cache-efficiency-runtime.ts`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/seed-runtime-result.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/telemetry-query-response.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/overview-cache-efficiency-dual-axis.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/overview-cache-efficiency-dual-axis.png`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/observe-cache-efficiency-dual-axis.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/observe-cache-efficiency-dual-axis.png`

Supported-zero control:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/append-cache-supported-zero.ts`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/supported-zero-seed-result.json`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/manual-qa/supported-zero-telemetry-query-response.json`

## Earlier Phase Reconciliation

- `04-test-summary.md` was refreshed after full local `ci:check` and `runtime:test-router` reruns exposed one final shared runtime-ui `yAxisId` typing repair in `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`.
- The rebuilt-runtime seed, telemetry-query proof, and Overview plus Observe evidence were rechecked against that repaired worktree and required no scenario or evidence changes.

## User Sign-Off

- Approved by: `agent-operated closeout per locked QA mode`
- Date: `2026-07-14`

## Traceability

- `R1` -> `telemetry-query-response.json` proves the corrected main-slice denominator result `0.133333`
- `R2` -> the rebuilt-runtime proof rides on the unchanged shared OpenAI-family normalization path already kept green in Phase 4
- `R3` -> `telemetry-query-response.json` preserves request-rate truth and partial support, while `supported-zero-telemetry-query-response.json` proves supported-zero rows remain `0` rather than unsupported
- `R4` -> Phase 3 and Phase 4 retained strict-TDD RED and GREEN evidence before this rebuilt-runtime closeout
- `R5` -> `overview-cache-efficiency-dual-axis.*` and `observe-cache-efficiency-dual-axis.*` prove the corrected metric flows through the existing Overview and Observe surfaces with separate Y axes

## Coverage Gate

- [x] The rebuilt runtime was seeded deterministically and started from the run-70 implementation state
- [x] Backend query proof records the corrected `cacheHitTokenRate` and unchanged `cacheBackedRequestRate`
- [x] Overview and Observe both have live shared-chart evidence
- [x] Supported-zero cache semantics are proven separately on the rebuilt runtime
- [x] All evidence paths used for closeout are recorded explicitly

Coverage: PASS

## Approval Gate

- [x] The verification loop did not stop at automated tests or mocked chart output
- [x] The corrected backend metric is proven on the live telemetry query route
- [x] The existing Overview and Observe surfaces both prove the operator-visible chart outcome
- [x] Supported-zero and unsupported cache semantics remain distinct on the rebuilt runtime

Approval: PASS
