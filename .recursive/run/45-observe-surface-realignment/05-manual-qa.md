Run: `/.recursive/run/45-observe-surface-realignment/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-15T07:55:00Z`
LockHash: `b6f5577d1eba578f4539efd5bb318a36905f9bfacd42461ad8eca70f5bd2c841`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/45-observe-surface-realignment/02-to-be-plan.md`
- `/.recursive/run/45-observe-surface-realignment/04-test-summary.md`
Outputs:
- `/.recursive/run/45-observe-surface-realignment/05-manual-qa.md`
Scope note: Agent-operated packaged-runtime browser QA for the Observe realignment on `http://127.0.0.1:3456`.

## TODO

- [x] Launch the rebuilt packaged runtime on `:3456`
- [x] Seed one real telemetry request through the packaged runtime
- [x] Verify Requests, request detail, Activity, and Logs in a browser
- [x] Verify cross-surface movement
- [x] Save browser evidence
- [x] Complete gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Tools: packaged `role-model-runtime.exe`, PowerShell `Invoke-RestMethod`, `browser-use`
- Preview URL: `http://127.0.0.1:3456`
- Worktree: `D:\DEV\role-model\.worktrees\45-observe-surface-realignment`
- Branch: `recursive/45-observe-surface-realignment`
- Packaged runtime: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- Seed upstream: mock OpenAI-compatible server on `http://127.0.0.1:4567/v1`
- Seed account: `moonshot.personal.primary`
- Seed request id observed in packaged logs and telemetry: `req-runtime-host-bridge`

## QA Scenarios and Results

| # | Scenario | Requirement | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Open `/app/observe` on the packaged runtime and verify it lands on the Requests ledger | R1 | **PASS** | Browser state shows `Telemetry request ledger` on `/app/observe` |
| 2 | Verify Requests shows telemetry summary plus a populated ledger row after a real packaged-runtime request | R2, R8 | **PASS** | Browser state on Requests shows `Requests 1`, `Latency 62 ms avg`, and `req-runtime-host-bridge` |
| 3 | Drill into the request row and verify canonical request detail renders | R2, R5, R8 | **PASS** | Browser state on request detail shows `req-runtime-host-bridge` with canonical telemetry facts |
| 4 | Open Activity and verify raw-host framing plus a clear handoff back to Requests | R3, R5, R8 | **PASS** | Browser state shows `Canonical structured telemetry` and `Open canonical request ledger` |
| 5 | Open Logs and verify parsed rows, raw stream actions, and a clickable request-detail handoff on the real packaged log format | R4, R5, R8 | **PASS** | Browser state shows timestamped row with linked `req-runtime-host-bridge` plus `Open raw proxy stream` |
| 6 | Follow the Logs request link back into canonical request detail | R4, R5, R8 | **PASS** | Browser navigation lands on request detail for `req-runtime-host-bridge` |

## Browser Evidence

- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-activity-browser.png`
- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-logs-browser.png`
- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-logs-browser-fixed.png`
- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-request-detail-browser.png`

## Evidence and Artifacts

- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-activity-browser.png`
- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-logs-browser.png`
- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-logs-browser-fixed.png`
- `/.recursive/run/45-observe-surface-realignment/evidence/logs/observe-request-detail-browser.png`
- Companion automated proof: `/.recursive/run/45-observe-surface-realignment/04-test-summary.md`

## QA Notes

- The first packaged Logs browser pass exposed a real regression: the page rendered the raw row but did not extract `req-runtime-host-bridge` from the packaged log format.
- That gap was fixed via a strict TDD addendum in `view-models.test.ts` / `view-models.ts`, the packaged runtime was rebuilt, and the Logs browser scenario was rerun to green.

## User Sign-Off

- Not required (`agent-operated` mode)

## Traceability

- `R1` → scenario 1
- `R2` → scenarios 2-3
- `R3` → scenario 4
- `R4` → scenarios 5-6
- `R5` → scenarios 3-6
- `R6` → scenarios 2-6 confirmed the packaged runtime needed no backend/API addendum beyond the frontend/view-model diff
- `R7` → scenario 5 directly exercised the packaged-runtime regression discovered and closed through the recorded RED/GREEN addendum
- `R8` → scenarios 1-6

## Earlier Phase Reconciliation

- Phase 5 packaged browser proof confirms the route framing and handoffs that Phase 3 implemented and Phase 4 verified at the focused test/build layer.
- The packaged-runtime parser regression found during QA is closed and reconciled by the SP45-D addendum evidence.

## Requirement Completion Status

| ID | Status | Verification Evidence |
| --- | --- | --- |
| R1 | verified | packaged browser landing to Requests |
| R2 | verified | packaged Requests summary + request-detail drill-in |
| R3 | verified | packaged Activity framing and request-ledger handoff |
| R4 | verified | packaged Logs parsed row, raw stream actions, and request-detail link |
| R5 | verified | packaged cross-surface movement between Requests, request detail, Activity, and Logs |
| R8 | verified | all scenarios executed against rebuilt runtime on `:3456` |

## Coverage Gate

- [x] Rebuilt packaged runtime used instead of a dev server
- [x] Observe Requests, request detail, Activity, and Logs all exercised in the browser
- [x] Cross-surface movement verified on the packaged runtime

Coverage: PASS

## Approval Gate

- [x] No blocking packaged-runtime browser failures remain
- [x] Evidence saved for the final packaged Observe flow

Approval: PASS

Audit: PASS
