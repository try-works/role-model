Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-15T20:41:08Z`
LockHash: `faa20304c03d553b73040f1fd6bc28e3638e5d5321330362dc0352ce011669d4`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/03-implementation-summary.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/04-test-summary.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/05-manual-qa.md`
Scope note: Hybrid agent-operated QA for the rebuilt packaged runtime covering restart rehydration, canonical lifecycle/readiness agreement, and in-place saved-account maintenance flows.

## TODO

- [x] Declare QA execution mode and packaged-runtime metadata
- [x] Verify packaged restart authority and baseline fixture rehydration
- [x] Verify stale-state archival remains non-blocking
- [x] Verify `Update API key` cancel/save and `Reconnect` maintenance flows live
- [x] Verify Connect plus non-Connect readiness consumers in a live browser
- [x] Save durable API evidence for the final packaged-runtime state
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## QA Execution Record

- QA Execution Mode: `hybrid`
- Agent Executor: Codex controller
- Browser Session: Playwright MCP
- Worktree: `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle`
- Branch: `recursive/47-runtime-persistence-rehydration-lifecycle`
- Packaged runtime: `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\dist\release\win32-x64\role-model-runtime.exe`
- Packaged runtime SHA256: `9d8af5a434d45bf989c861908cd3658a5f4c74d8f9aaa7c617b146bec9bf1bc5`
- Live packaged URL: `http://127.0.0.1:64186`
- Runtime state root: `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\.recursive\run\47-runtime-persistence-rehydration-lifecycle\evidence\phase5-live\runtime-state`
- Fixture scope:
  - `L1` peer-backed local restore: in scope and verified live
  - `L2` llama-swap live packaged-runtime proof: deferred by the locked Phase 2 rationale; no `llamaSwapLoads[]` were present in the fixture manifest for this run
  - `O1` OAuth ready restore: in scope and verified live
  - `K1` API-key ready restore: in scope and verified live
  - `S1` stale-state archival: in scope and verified live

## QA Scenarios and Results

| # | Scenario | Requirement | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Rebuilt packaged runtime starts, exposes aligned authority semantics on `/api/role-model/runtime/summary` and `/healthz`, and remains reachable for browser QA | R8, R10 | **PASS** | `evidence/phase5-live/restart-final-summary.json`, `evidence/phase5-live/restart-final-health.json`, `evidence/phase5-live/post-repair-summary.json`, `evidence/phase5-live/post-repair-healthz.json` |
| 2 | `L1` peer-backed local fixture survives packaged restart as `execution-ready` with its persisted endpoint/model intent intact | R7, R14 | **PASS** | `evidence/phase5-live/restart-final-summary.json`, `evidence/phase5-live/restart-final-endpoints.json`, `evidence/phase5-live/restart-final-models.json` |
| 3 | `L2` llama-swap live proof remains explicitly deferred per the locked Phase 2 scope decision, with no hidden blocker discovered in packaged startup | R7 | **PASS** | `02-to-be-plan.md`, `evidence/phase5-live/restart-final-summary.json` |
| 4 | `O1` OAuth-ready remote fixture survives packaged restart as `execution-ready` without forced re-onboarding | R0, R7, R14 | **PASS** | `evidence/phase5-live/restart-final-summary.json`, `evidence/phase5-live/restart-final-accounts.json` |
| 5 | `K1` persisted-local API-key remote fixture survives packaged restart as `execution-ready` with stable identity and active endpoint | R0, R6, R7 | **PASS** | `evidence/phase5-live/restart-final-summary.json`, `evidence/phase5-live/restart-final-accounts.json` |
| 6 | `S1` orphan/expired device-auth state is archived and non-blocking after packaged restart | R2, R7, R9 | **PASS** | `evidence/phase5-live/restart-final-summary.json`, `evidence/phase5-live/restart-final-authority-trace.json` |
| 7 | `Update API key` opens a saved-account modal, `Cancel` closes it without mutating account identity/bindings/endpoints, and the packaged runtime stays authoritative | R5, R11, R12 | **PASS** | `.playwright-mcp/page-2026-06-15T20-33-18-791Z.yml`, live API verification during the browser session |
| 8 | `Update API key` `Save` rotates the persisted credential in place while preserving `moonshot.personal.api-key` identity, endpoint linkage, and role bindings | R5, R6, R12, R13 | **PASS** | `.playwright-mcp/page-2026-06-15T20-34-02-851Z.yml`, `evidence/phase5-live/post-repair-api-key-proof.txt`, `evidence/phase5-live/post-repair-accounts.json`, `evidence/phase5-live/post-repair-summary.json` |
| 9 | `Reconnect` repairs `moonshot.personal.oauth-repair` in place, preserving account identity and endpoint/model bindings while returning it to `execution-ready` | R5, R12, R13 | **PASS** | `.playwright-mcp/page-2026-06-15T20-34-31-234Z.yml`, `evidence/phase5-live/post-repair-accounts.json`, `evidence/phase5-live/post-repair-summary.json` |
| 10 | `Connect` reflects the canonical provider rollups after repair, including `moonshot` as `3 ready` and the two unrelated env-unresolved manual accounts as separate attention items | R4, R15, R17 | **PASS** | `.playwright-mcp/page-2026-06-15T20-35-23-107Z.yml`, `evidence/phase5-live/post-repair-summary.json` |
| 11 | `System -> Session readiness` shows authoritative lifecycle state, degraded bootstrap status, and the archived stale artifact separately from active blockers | R3, R8, R15 | **PASS** | `.playwright-mcp/page-2026-06-15T20-35-29-474Z.yml`, `evidence/phase5-live/post-repair-summary.json`, `evidence/phase5-live/post-repair-healthz.json` |
| 12 | `System -> Runtime` reflects the same canonical authority and archived-stale counts as the summary APIs | R4, R8, R15, R17 | **PASS** | `.playwright-mcp/page-2026-06-15T20-35-55-171Z.yml`, `evidence/phase5-live/post-repair-summary.json`, `evidence/phase5-live/post-repair-healthz.json` |
| 13 | `Studio -> Advanced` shows the same authoritative lifecycle banner and blocker counts as a non-Connect readiness consumer | R4, R15, R17 | **PASS** | `.playwright-mcp/page-2026-06-15T20-35-49-260Z.yml`, `evidence/phase5-live/post-repair-summary.json` |

## Evidence and Artifacts

- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/restart-prep.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/restart-final-authority-trace.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/restart-final-summary.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/restart-final-health.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/restart-final-accounts.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/restart-final-endpoints.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/restart-final-models.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/post-repair-summary.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/post-repair-healthz.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/post-repair-accounts.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/post-repair-api-key-proof.txt`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/request-log.json`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/logs/seed-start.log`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/phase5-live/logs/restart-final.log`
- Companion repair/addendum evidence:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-phase3-providers-typecheck.red.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-providers-typecheck.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-phase3-cli-repair-wiring.red.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-cli-repair-wiring.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/red/sp47-phase3-api-key-available-actions.red.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase3-api-key-available-actions.green.log`
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/evidence/logs/green/sp47-phase5-runtime-package-sea-rerun-3.green.log`

## QA Notes

- The packaged-runtime proof began by exposing three real gaps after the locked Phase 3 receipt: a runtime-ui typecheck blocker during SEA packaging, missing packaged repair-endpoint wiring, and a missing `Update API key` action for healthy remote persisted-local API-key accounts.
- Those fixes were completed under strict TDD and are recorded in `addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md`.
- Two unrelated persisted manual accounts, `anthropic.team.shared` and `openai.personal.primary`, remain in the fixture baseline as `env-unresolved`. They are not stale-artifact regressions from run 47; they are surfaced truthfully as separate attention items and do not block the verified local/OAuth/API-key restart continuity for the scoped fixtures.
- The packaged runtime remained `authoritative` with `bootstrapStatus: degraded` before and after the maintenance-path repairs because the decision-only fixture intentionally preserves those unrelated env-unresolved accounts and the archived stale OAuth artifact in diagnostics.

## User Sign-Off

- Not required (`hybrid` agent-operated Phase 5 with durable evidence saved in the run directory)

## Traceability

- `R0` → scenarios 4-5, 9-13
- `R1` → scenarios 1-6
- `R2` → scenario 6
- `R3` → scenario 11
- `R4` → scenarios 10-13
- `R5` → scenarios 7-9
- `R6` → scenarios 5, 8
- `R7` → scenarios 2-6
- `R8` → scenarios 1, 11-12
- `R9` → scenario 6
- `R10` → scenarios 1-13 executed against the rebuilt packaged runtime
- `R11` → scenario 7 plus the saved-account Providers flow in scenarios 8-9
- `R12` → scenarios 7-9
- `R13` → scenarios 8-9
- `R14` → scenarios 2-5
- `R15` → scenarios 10-13
- `R16` → scenarios 5, 8-9 reuse stable account identity and preserved bindings
- `R17` → scenarios 10-13 plus the aligned summary/health surfaces in scenario 1

## Earlier Phase Reconciliation

- Phase 5 found real packaged-runtime defects after the locked Phase 3 receipt.
- Those defects are reconciled in the current-phase upstream-gap addendum:
  - `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.upstream-gap.03-implementation-summary.addendum-01.md`
- The final post-repair packaged-runtime evidence in this artifact supersedes the earlier pre-repair browser/API state for final acceptance.

## Requirement Completion Status

| ID | Status | Verification Evidence |
| --- | --- | --- |
| R0 | verified | Scenarios 4-5, 9-13 |
| R1 | verified | Scenarios 1-6 |
| R2 | verified | Scenario 6 |
| R3 | verified | Scenario 11 |
| R4 | verified | Scenarios 10-13 |
| R5 | verified | Scenarios 7-9 |
| R6 | verified | Scenarios 5, 8 |
| R7 | verified | Scenarios 2-6; scenario 3 records the locked `L2` deferral rationale |
| R8 | verified | Scenarios 1, 11-12 |
| R9 | verified | Scenario 6 |
| R10 | verified | Scenarios 1-13 against the rebuilt packaged runtime |
| R11 | verified | Scenarios 7-9 plus companion Phase 3 design-system evidence |
| R12 | verified | Scenarios 7-9 |
| R13 | verified | Scenarios 8-9 |
| R14 | verified | Scenarios 2-5 |
| R15 | verified | Scenarios 10-13 |
| R16 | verified | Scenarios 5, 8-9 |
| R17 | verified | Scenarios 1, 10-13 |

## Subagent Capability Probe

- Subagent tools available; QA executed by controller
- Audit Execution Mode: `self-audit`

## Coverage Gate

- [x] The rebuilt packaged runtime was launched and exercised instead of relying on a dev server
- [x] `L1`, `O1`, `K1`, and `S1` packaged restart outcomes were recorded with durable evidence
- [x] The locked `L2` deferral rationale was restated explicitly
- [x] `Update API key` save/cancel and `Reconnect` were exercised live against the packaged runtime
- [x] Connect plus non-Connect readiness consumers were verified in a live browser session
- [x] Final summary, accounts, and health evidence were saved after the repair flows

Coverage: PASS

## Approval Gate

- [x] No blocking packaged-runtime QA failures remain for the scoped fixtures
- [x] Phase 5-discovered implementation gaps were repaired and documented through the current-phase addendum
- [x] The final packaged-runtime state is captured in durable evidence files under `evidence/phase5-live`

Approval: PASS

Audit: PASS
