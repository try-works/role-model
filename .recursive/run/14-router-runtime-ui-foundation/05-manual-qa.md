Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-05T22:25:33Z`
LockHash: `40b91b3e70d7a3f632a371d735354c537f5353e94c306b7fa12bdce3c1269f2a`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
- `/.recursive/run/14-router-runtime-ui-foundation/04-test-summary.md`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-validate-ui.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-validate-host.log`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/manual-qa/phase5-browser-qa.txt`
Scope note: This artifact records the route-level, readability, and interaction-focused QA for `14-router-runtime-ui-foundation`. The goal is to confirm that the new repo-owned operator shell is coherent in a browser, that Moonshot/Kimi onboarding is surfaced honestly, that the runtime-backed account/workbench/request flows work end to end, and that preserved host-owned surfaces remain visible beside the new app shell.

## TODO

- [x] Re-read the implementation and test receipts
- [x] Start a live run-14 host bridge and runtime-ui session
- [x] Walk the planned `/app/*` route family in a browser
- [x] Exercise provider/account onboarding and workbench inspection flows
- [x] Confirm preserved host-tool references remain visible
- [x] Complete the QA receipt and gates

## QA Execution Record

QA Execution Mode: `agent-operated`
Operator: `main agent`
Agent Executor: `GitHub Copilot CLI main agent`
Tools Used: `powershell`, `browser-use CLI`, screenshots
Environment: `local worktree at D:\DEV\role-model\.worktrees\14-router-runtime-ui-foundation`
Live QA endpoints:
- runtime host bridge: `http://127.0.0.1:8191`
- runtime UI dev server: `http://127.0.0.1:4273`
Scope: `route-shell coherence, provider/account onboarding readability, live workbench/request inspection, and preserved host-tool visibility for the repo-owned runtime UI`

## QA Scenarios and Results

1. **Operator shell route integrity**
   - Steps:
     - open `/app`, `/app/providers`, `/app/accounts`, `/app/endpoints`, `/app/workbench`, `/app/requests`, and `/app/runtime`
     - confirm the shell and preserved host-tool rail stay visible during route transitions
   - Result: PASS
   - Notes:
     - the fixed shell stayed stable while only the inner route surface changed
     - the sidebar route family, route badges, JSON shortcuts, and preserved `/logs`, `/api/metrics`, and `/ui` links remained visible on every tested route

2. **Moonshot / Kimi onboarding honesty check**
   - Steps:
     - open `/app/providers`
     - inspect the Moonshot AI provider card and its variants
   - Result: PASS
   - Notes:
     - the page distinguishes `Moonshot Open Platform` (`ready`, `api-key-static`) from `Kimi Code` (`backend-limited`, `oauth2-device-code`)
     - the Kimi surface shows real device-OAuth metadata: `https://auth.kimi.com`, client id `17e5f671-d194-4dfb-9706-5516cb48c098`, and the device/token endpoints, rather than pretending OAuth is already complete

3. **Account upsert and endpoint-registry sanity check**
   - Steps:
     - open `/app/accounts`
     - submit the prefilled `moonshot.personal.primary` upsert form
     - open `/app/endpoints`
   - Result: PASS
   - Notes:
     - the account form wrote a deterministic upsert and then showed `moonshot.personal.primary` as `healthy`, `active`, and `api-key-static` with the Moonshot base URL while exposing only the credential reference
     - the endpoint registry remained on the current three-entry runtime baseline after the account upsert; this matches the shipped validator and current registry behavior, so account save does not yet auto-materialize new endpoint rows during this run

4. **Workbench and structured request inspection**
   - Steps:
     - open `/app/workbench`
     - select `GPT 4.1 Mini Fast`
     - submit the prompt `Summarize the runtime UI in one sentence.`
     - open `/app/requests`
     - open the linked request detail view
   - Result: PASS
   - Notes:
     - the workbench returned `OpenAI summary`, proving the repo-owned shell can drive the live `/v1/chat/completions` path
     - the requests ledger immediately surfaced `req-runtime-host-bridge`
     - the request detail view exposed the structured request artifact, routing decision, trace/usage payload, observed-performance summary, and linked endpoint profile in the same stable shell

5. **Runtime summary and preserved host-tool boundary check**
   - Steps:
     - open `/app/runtime`
     - inspect the lifecycle summary and host-tool links
   - Result: PASS
   - Notes:
     - the runtime page presents the bridge/runtime summary while explicitly preserving `/logs`, `/api/metrics`, `/ui`, and the structured runtime-summary JSON link as adjacent operator tools
     - the page text keeps the vendor-host boundary honest instead of pretending the new app replaced every host-owned surface

## Evidence and Artifacts

- `/.recursive/run/14-router-runtime-ui-foundation/evidence/manual-qa/phase5-browser-qa.txt`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/dashboard.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/providers.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/accounts-before.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/accounts-after.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/endpoints.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/workbench-before.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/workbench-after.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/requests.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/request-detail.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/screenshots/runtime.png`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-validate-ui.log`
- `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-validate-host.log`
- `/.recursive/run/14-router-runtime-ui-foundation/04-test-summary.md`

## User Sign-Off

- QA mode is `agent-operated`; no human sign-off was requested for this phase.
- Agent sign-off: PASS

## Traceability

- `R1` -> verified through the operator shell route-integrity scenario and the captured dashboard/runtime screenshots.
- `R2` -> verified through the shell/readability checks on providers, accounts, workbench, requests, and runtime surfaces.
- `R3` -> verified through the Moonshot/Kimi onboarding scenario and the account-upsert scenario.
- `R4` -> verified through route traversal across `/app`, `/app/providers`, `/app/accounts`, `/app/endpoints`, `/app/workbench`, `/app/requests`, and `/app/runtime`.
- `R5` -> verified through shell-stability, route-state readability, and no-shell-replacement observations across all browser-tested pages.
- `R6` -> verified through the preserved host-tool boundary check and the live workbench/request inspection flow against the existing host bridge.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/04-test-summary.md`
  - `/role-model-router/apps/runtime-ui/app/routes.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-validate-ui.log`
  - `/.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-validate-host.log`
- Requirement coverage check:
  - `R1`-`R6`: covered in `## QA Scenarios and Results` and `## Traceability`

Coverage: PASS

## Approval Gate

- [x] Manual QA confirms the repo-owned operator shell is coherent across the shipped route family
- [x] Manual QA confirms Moonshot/Kimi onboarding is surfaced honestly, including the backend-limited OAuth note
- [x] Manual QA confirms the live workbench, request ledger, request detail, and preserved host-tool boundary behave as expected

Approval: PASS
