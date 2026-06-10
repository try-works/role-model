Run: `/.recursive/run/35-runtime-ui-connect-declutter/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-08T11:12:39Z`
LockHash: `2dbbe4ae7f10485b7783f18e68f2563ae0eca2c2fbbc00a71bcece6a7f5b1826`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/02-to-be-plan.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/04-test-summary.md`
Outputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/05-manual-qa.md`
Scope note: Browser-session visual QA for Connect IA, de-clutter, merges, and disclosure behavior in `role-model-router/apps/runtime-ui/`.

## TODO

- [x] Execute QA scenarios from the locked plan in a live browser session
- [x] Capture visual evidence (screenshots) for frontend surfaces
- [x] Record QA execution metadata and evidence paths
- [x] Map scenarios to requirements
- [x] Complete gates

## QA Execution Record

- QA Execution Mode: `hybrid` (browser visual verification primary; Phase 4 automated tests as companion proof)
- Agent Executor: Cursor controller (implementation session)
- Browser Session: Cursor IDE browser MCP (`cursor-ide-browser`)
- Dev Server: worktree `runtime-ui` at `http://127.0.0.1:5175/` (`react-router dev --port 5175 --host 127.0.0.1`)
- API Proxy Target: `http://127.0.0.1:3456` (vite proxy defaults)
- Worktree: `D:\DEV\role-model\.worktrees\35-runtime-ui-connect-declutter`
- Branch: `recursive/35-runtime-ui-connect-declutter`
- Revision note: Supersedes prior agent-operated-only Phase 5 lock; frontend QA now uses live browser navigation and screenshots per operator requirement.

## QA Scenarios and Results

| # | Scenario (from plan) | Result | Visual / browser evidence |
| --- | --- | --- | --- |
| 1 | Connect rename — `/app/connect`; eyebrow **CONNECT**; tabs Registry / Downstream / Upstream; `/app/endpoints` → `/app/connect` | **PASS** | Nav shows **Connect**; tabs visible; legacy `/app/endpoints` resolved to `/app/connect`; screenshot `qa-01-connect-registry.png` |
| 2 | Local Endpoints preserved — Local → **Endpoints** at `/app/local/endpoints`; distinct from Connect | **PASS** | Eyebrow **LOCAL**; tab **Endpoints**; no Connect eyebrow on page; screenshot `qa-02-local-endpoints.png` |
| 3 | Registry reframe — catalog present; no alias table; Router handoff link | **PASS** | Body text includes `View alias posture → Router`; no alias table; live endpoint rows rendered; screenshot `qa-01-connect-registry.png` |
| 4 | Overview — KPIs remain; latest requests ≤3 rows or empty with CTA to Observe → Requests | **PASS** | `View all requests →` links to `/app/observe/requests`; zero rows with empty-state copy; no `Reading order` / page-count chrome; screenshot `qa-03-overview-dashboard.png` |
| 5 | Local Models grid — `/app/local/matrix` → grid view; List/Grid toggle; matrix absent from nav | **PASS** | Redirect to `/app/local/models?view=grid`; **List** / **Grid** toggle visible; no Matrix nav item; screenshot `qa-04-local-models-grid.png` |
| 6 | Router merge — guidance provenance + policy inputs on Overview; `/app/router/config` redirects; Strategy tab remains | **PASS** | Overview shows **Guidance provenance** and **Policy inputs**; tabs exclude Config; `/app/router/config` → `/app/router`; screenshot `qa-05-router-overview.png` |
| 7 | Disclosure — request detail + model modal secondary sections collapsed by default; expand reveals data | **PARTIAL** | Model inspection modal: four `<details>` sections collapsed (`open=false`); expanded **Capabilities** shows structured tags; screenshots `qa-06-model-modal-disclosure-collapsed.png`, `qa-06b-model-modal-disclosure-expanded.png`. Request detail disclosure not visually exercised: telemetry ledger empty (0 requests) and synthetic id returned 404 (`runtime observation not found`). |
| 8 | Cross-links — providers → Connect registry; no bare "Open Endpoints" | **PASS** | Remote providers shows `View in Connect registry` → `/app/connect`; no bare `/app/endpoints` links; screenshot `qa-07-remote-providers-crosslink.png` |
| 9 | Legacy integrations redirect | **PASS** | `/app/integrations/downstream` resolved to `/app/connect/downstream`; downstream contract page rendered; screenshot `qa-08-connect-downstream.png` |
| 10 | Shell quiet — no page counts, no meta Reading order panels | **PASS** | Verified on Overview and Observe → Requests (`hasReadingOrder=false`, `hasPageCount=false` in browser DOM evaluation) |

## Evidence and Artifacts

- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-01-connect-registry.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-02-local-endpoints.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-03-overview-dashboard.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-04-local-models-grid.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-05-router-overview.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-06-model-modal-disclosure-collapsed.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-06b-model-modal-disclosure-expanded.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-07-remote-providers-crosslink.png`
- `/.recursive/run/35-runtime-ui-connect-declutter/evidence/screenshots/qa-08-connect-downstream.png`
- Companion automated proof: `/.recursive/run/35-runtime-ui-connect-declutter/evidence/logs/phase4-runtime-ui-test.log`

## User Sign-Off

- Approved by: pending operator review of browser screenshots
- Date: n/a

## Traceability

- `R0` → browser-verified surfaces match design-system nav/route contracts
- `R1` → scenario 1
- `R2` → scenarios 1, 9
- `R3` → scenario 2
- `R4` → scenario 3
- `R5` → scenario 10
- `R6` → scenario 10
- `R7` → scenario 5
- `R8` → scenario 4
- `R9` → scenario 6
- `R10` → scenario 3
- `R11` → scenarios 1, 7 (partial), 10
- `R12` → companion Phase 4 logs + browser session above
- `R13` → scenario 7 (partial — model modal verified; request detail blocked on empty ledger)
- `R14` → scenarios 3, 8

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: delegated browser MCP available; used for navigation, DOM evaluation, and screenshots
- Delegation Decision Basis: controller executed browser QA directly with MCP tools; audit performed self-audit after evidence copy verification
- Frontend QA policy: browser sessions + visual verification required for UI changes (operator override of plan's agent-operated-only note)

## Effective Inputs Re-read

- `02-to-be-plan.md` Manual QA Scenarios
- `04-test-summary.md`

## Earlier Phase Reconciliation

- Browser QA outcomes align with Phase 4 automated PASS; no regressions observed in live shell/nav/routing

## Subagent Contribution Verification

- N/A

## Worktree Diff Audit

- Baseline reference: `48503a46b138054970ba63f576d0ce454f08b5c6`
- QA scope: runtime-ui product paths only; server run from worktree on port `5175`

## Gaps Found

- Request-detail disclosure could not be visually verified because the runtime telemetry ledger is empty and test chat completion returned `503 Service Unavailable`
- Full-page screenshots capture viewport reliably; main content panels are confirmed via browser DOM text evaluation when viewport crops sidebar

## Repair Work Performed

- Re-ran Phase 5 after operator correction: replaced test-only agent-operated receipt with browser-session visual QA and screenshot evidence

## Requirement Completion Status

- R1 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 1, `qa-01-connect-registry.png`
- R2 | Status: verified | Verification Evidence: `05-manual-qa.md` scenarios 1, 9
- R3 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 2, `qa-02-local-endpoints.png`
- R4 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 3, `qa-01-connect-registry.png`
- R5 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 10
- R6 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 10
- R7 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 5, `qa-04-local-models-grid.png`
- R8 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 4, `qa-03-overview-dashboard.png`
- R9 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 6, `qa-05-router-overview.png`
- R10 | Status: verified | Verification Evidence: `05-manual-qa.md` scenario 3
- R11 | Status: verified | Verification Evidence: browser QA + Phase 4 test log (companion)
- R12 | Status: verified | Verification Evidence: `evidence/logs/phase4-runtime-ui-test.log` + browser session record above
- R13 | Status: partial | Verification Evidence: model modal disclosure screenshots; request-detail disclosure blocked on empty ledger / 503 test request
- R14 | Status: verified | Verification Evidence: `05-manual-qa.md` scenarios 3, 8, `qa-07-remote-providers-crosslink.png`

## Audit Verdict

- Browser-session visual QA satisfies all plan scenarios except request-detail disclosure (environment-blocked). Model-modal disclosure provides compensating visual proof for `DisclosureSection` behavior. No blocking UI regressions found in live navigation, redirects, merges, or cross-links.
Audit: PASS

## Coverage Gate

- [x] All plan manual QA scenarios addressed (scenario 7 partial with documented blocker)
- [x] Browser-session metadata and screenshot evidence recorded
- [x] Companion automated evidence paths recorded

Coverage: PASS

## Approval Gate

- [x] No blocking QA failures for shipped IA/nav/merge behavior
- [x] Request-detail disclosure gap documented with reproduction path for operator follow-up
- [x] Ready for Phase 6–8 closeout pending operator screenshot review

Approval: PASS

Audit: PASS
