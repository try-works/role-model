Run: `/.recursive/run/66-remote-providers-deferred-request-id-loading/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-12T05:18:14Z`
LockHash: `a5cad821127856cd9f69427bdc71609ba86ec063f2d3b78bc95753df0dc5faef`
Inputs:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/02-to-be-plan.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-host-bridge.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.v1.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/latest-ids-direct.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/requests-rich-direct.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-visible-before-latest-ids.png`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-state-survives-latest-ids-failure.png`
Outputs:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/05-manual-qa.md`
Scope note: This artifact records the agent-operated rebuilt-runtime verification for `/app/remote/providers`, including fresh worktree rebuild evidence, live runtime startup metadata, empty-ledger success-path receipts, delayed deferred-fetch proof, and deferred-fetch failure-isolation proof.

## TODO

- [x] Re-read the locked requirements, plan, and automated test summary
- [x] Record the rebuilt-runtime command, URL, and evidence paths
- [x] Capture live providers-page proof for delayed deferred fetch and failure isolation
- [x] Refresh final requirement dispositions after rebuilt-runtime QA

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: the thread exposes deferred subagent tooling, but the worktree still lacks `/.recursive/config/recursive-router-discovered.json`, so routed delegation remains unsafe from this run workspace.
Delegation Decision Basis: Phase 5 required direct rebuilt-runtime startup, live browser interaction, and evidence capture against the current worktree build.
Delegation Override Reason: the required `/app/remote/providers` rebuilt-runtime proof is controller-owned and had to stay local to preserve exact URL, timing, and screenshot evidence.
Audit Inputs Provided:
- locked requirements, plan, and Phase 4 verification receipt
- rebuilt-runtime build logs and runtime-process metadata
- direct endpoint receipts for `latest-ids` and rich requests
- browser proof JSON and screenshots

## Effective Inputs Re-read

- `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/02-to-be-plan.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-host-bridge.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.v1.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/latest-ids-direct.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/requests-rich-direct.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`

## QA Execution Record

QA Execution Mode: `agent-operated`
Agent Executor: `Codex main agent in D:\DEV\role-model\.worktrees\66-remote-providers-deferred-request-id-loading`
Tools Used: rebuilt runtime process launched with `node --import tsx`; `powershell` and `Invoke-RestMethod` for direct live endpoint receipts; Playwright proof executed from the `@role-model-router/runtime-ui` package context; screenshot review via local image inspection; attempted `browser:control-in-app-browser` bootstrap, but `mcp__node_repl.js` failed before browser selection with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`, so direct Playwright fallback was used
Rebuilt Runtime Base URL: `http://127.0.0.1:54884`
Exact Rebuilt Runtime Process Command:
- `"C:\Program Files\nodejs\node.exe" --import tsx C:\Users\erikb\AppData\Local\Temp\run66-phase5-rebuilt-799f053dfa89431ca64e2fb529c7e225\start-runtime-phase5.mjs D:\DEV\role-model\.worktrees\66-remote-providers-deferred-request-id-loading C:\Users\erikb\AppData\Local\Temp\run66-phase5-rebuilt-799f053dfa89431ca64e2fb529c7e225\state`
Runtime Build Evidence:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-host-bridge.log`
Runtime Process Evidence:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.v1.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.log`
Evidence Path:
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/`

## QA Scenarios and Results

### Scenario 1 — rebuilt runtime serves the lightweight latest-ids route and the unchanged rich route on an empty ledger (`R2`, `R3`, `R4`, `R8`)

Execution:
- rebuilt the runtime UI and host-bridge from the current worktree
- started the rebuilt runtime at `http://127.0.0.1:54884`
- queried:
  - `GET /api/role-model/requests/latest-ids?limit=10`
  - `GET /api/role-model/requests`
- evidence:
  - `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/latest-ids-direct.json`
  - `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/requests-rich-direct.json`

Observed results:
- `latest-ids` returned `[]` successfully from the rebuilt runtime, which satisfies the empty-ledger success path
- the existing rich `/api/role-model/requests` route also returned `[]`, showing the richer route still exists separately from the lightweight ids-only path
- the runtime under test was the freshly rebuilt worktree runtime recorded in `runtime-process.v1.json`

Verdict: `PASS`

### Scenario 2 — `/app/remote/providers` becomes visible before the deferred `latest-ids` follow-up completes (`R1`, `R2`, `R3`, `R8`)

Execution:
- intercepted `GET /api/role-model/requests/latest-ids?limit=10` in the browser proof and delayed the response by `4s` while allowing the rebuilt runtime to answer it with `200`
- navigated to `/app/remote/providers`
- waited for:
  - heading `Configured provider connections`
  - provider card `provider-maintenance-moonshot.personal.primary`
  - `Save provider` button
- evidence:
  - `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`
  - `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-visible-before-latest-ids.png`

Observed results:
- the deferred request hit the rebuilt runtime at `http://127.0.0.1:54884/api/role-model/requests/latest-ids?limit=10`
- the delayed response still returned `200`
- the page used the required `limit=10` contract
- timing from `providers-phase5-proof.json`:
  - `latestIdsStartedAt` -> `headingVisibleAt`: `197 ms`
  - `latestIdsStartedAt` -> `providerCardVisibleAt`: `201 ms`
  - `latestIdsStartedAt` -> `saveProviderVisibleAt`: `206 ms`
  - `latestIdsStartedAt` -> `latestIdsResolvedAt`: `4010 ms`
- the providers page therefore became visible and usable about `3.8 s` before the deferred follow-up completed
- the provider card remained visible after the delayed response completed
- the screenshot shows the live rebuilt providers surface already rendered while the deferred request was still pending

Verdict: `PASS`

### Scenario 3 — deferred `latest-ids` failure does not clear the already-rendered providers page (`R1`, `R2`, `R8`)

Execution:
- intercepted `GET /api/role-model/requests/latest-ids?limit=10` in the browser proof and forced a `500` JSON response
- navigated to `/app/remote/providers`
- rechecked the same visible page controls after the failed deferred request
- evidence:
  - `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`
  - `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-state-survives-latest-ids-failure.png`

Observed results:
- the providers heading remained visible
- the `provider-maintenance-moonshot.personal.primary` card remained visible after the failed deferred request
- the `Save provider` button remained visible after the failed deferred request
- no route-level `"Could not load providers."` error banner appeared
- the already-rendered providers page state survived the failed deferred fetch exactly as required

Verdict: `PASS`

## Evidence and Artifacts

- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-host-bridge.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.v1.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/latest-ids-direct.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/requests-rich-direct.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.log`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-visible-before-latest-ids.png`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-state-survives-latest-ids-failure.png`

## User Sign-Off

Not required. `QA Execution Mode: agent-operated`.

QA Sign-Off: `PASS`

## Traceability

- `R1` -> Scenarios 2 and 3 prove the providers page renders and remains usable without deferring on request-history completion
- `R2` -> Scenarios 1, 2, and 3 prove the latest-10 follow-up is separate, bounded, and failure-isolated
- `R3` -> Scenario 1 plus Scenario 2 prove the lightweight `latest-ids` route is live on the rebuilt runtime and is called with `limit=10`
- `R4` -> Scenario 1 proves the rich `/api/role-model/requests` route still exists separately from the lightweight ids-only path
- `R5` -> Phase 4 suite coverage plus the live rebuilt-runtime checks confirm the deferred-load and lightweight-path regression matrix survived into the served runtime
- `R6` -> Phase 3 strict RED/GREEN proof remained intact through the rebuilt-runtime verification
- `R7` -> Phase 4 executed the required automated floor and this Phase 5 receipt consumes that baseline rather than replacing it with manual-only claims
- `R8` -> Scenarios 1 through 3, the rebuild logs, the runtime-process record, the proof JSON, and the screenshots satisfy the rebuilt-runtime browser-proof requirement

## Gaps Found

- No product gap remained in the repaired providers-page path.
- The in-app browser plugin path was unavailable in this session because `mcp__node_repl.js` failed during bootstrap before browser selection. Direct Playwright browser automation provided the required rebuilt-runtime proof instead.

## Repair Work Performed

None in the product surface during Phase 5. QA used a direct Playwright fallback after the in-app browser bootstrap failure.

## Audit Verdict

- Summary: the rebuilt worktree runtime served the live providers page correctly, the deferred `latest-ids` success path stayed non-blocking, and the deferred failure path left the loaded page intact.
Audit: PASS

## Earlier Phase Reconciliation

- `00-requirements.md` made rebuilt-runtime browser proof mandatory and explicitly required that the page become visible before the deferred latest-10 follow-up completes.
- `02-to-be-plan.md` committed to agent-operated QA on the rebuilt runtime with explicit providers-page delay and failure-isolation proof.
- `04-test-summary.md` captured the automated verification floor; this receipt closes the remaining rebuilt-runtime operator proof obligation.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed:
  - rebuilt the runtime UI and host-bridge directly from the current worktree
  - launched the rebuilt runtime and recorded the exact base URL, command, and state root
  - captured direct endpoint receipts plus delayed and failed deferred-fetch browser proof artifacts
  - reviewed the resulting screenshots to confirm the page-level evidence was coherent
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8fa2f33dacf2b04b924532145d3dbc69555bc6fb`
- Comparison reference: `working-tree`
- Normalized baseline: `8fa2f33dacf2b04b924532145d3dbc69555bc6fb`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8fa2f33dacf2b04b924532145d3dbc69555bc6fb`
- Base branch: `main`
- Worktree branch: `recursive/66-remote-providers-deferred-request-id-loading`

## Requirement Completion Status

- `R1` | Status: `verified` | Changed Files: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts` | Implementation Evidence: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-visible-before-latest-ids.png`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-state-survives-latest-ids-failure.png`
- `R2` | Status: `verified` | Changed Files: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Implementation Evidence: `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/latest-ids-direct.json`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`
- `R3` | Status: `verified` | Changed Files: `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/latest-ids-direct.json`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`
- `R4` | Status: `verified` | Changed Files: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/requests-rich-direct.json`
- `R5` | Status: `verified` | Changed Files: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Implementation Evidence: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`
- `R6` | Status: `verified` | Changed Files: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md` | Implementation Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/logs/red/runtime-ui-api.log`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/logs/red/providers-route.log`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/logs/red/sqlite-memory-latest-request-ids.log`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/logs/red/runtime-host-latest-ids.log` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.v1.json`
- `R7` | Status: `verified` | Changed Files: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md` | Implementation Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/00-requirements.md` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.v1.json`
- `R8` | Status: `verified` | Changed Files: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/05-manual-qa.md` | Implementation Evidence: `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-runtime-ui.log`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/rebuild-host-bridge.log`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/runtime-process.v1.json`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-phase5-proof.json`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-visible-before-latest-ids.png`, `/.recursive/run/66-remote-providers-deferred-request-id-loading/evidence/runtime/phase5-rebuilt/providers-state-survives-latest-ids-failure.png`

## Audit Gate

- [x] QA execution mode, rebuilt runtime URL, and process command are explicit
- [x] Observed results are recorded for the empty-ledger success path, delayed deferred fetch, and deferred-failure isolation
- [x] Evidence paths cite the rebuild, runtime process, proof JSON, and screenshots

Audit: PASS

## Coverage Gate

- [x] Rebuilt runtime proof is recorded against the actual served URL
- [x] Providers-page visibility before deferred latest-ids completion is explicit
- [x] Deferred latest-ids failure isolation is explicit
- [x] Empty-ledger success-path receipts are explicit

Coverage: PASS

## Approval Gate

- [x] The rebuilt-runtime browser-proof obligation is satisfied
- [x] No remaining product gap blocks Phase 6
- [x] Ready for later closeout artifacts

Approval: PASS

## Prior Recursive Evidence Reviewed

- `/.recursive/run/66-remote-providers-deferred-request-id-loading/02-to-be-plan.md`
- `/.recursive/run/66-remote-providers-deferred-request-id-loading/04-test-summary.md`
