Run: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-15T23:21:40Z`
LockHash: `b639a53d4d07827dc81023a49d9c2753a90fe1aa4ea1a31728b2a801f67a131f`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/02-to-be-plan.md`
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/03-implementation-summary.md`
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/04-test-summary.md`
Outputs:
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/05-manual-qa.md`
Scope note: Hybrid runtime QA combining retained agent-operated copied-state proof with final user-verified live operator proof, proving cold-start reconciliation, maintenance-versus-configured separation, cross-surface truth alignment, and the final router-overview list repair on the rebuilt client plus implementation-commit bridge runtime.

## TODO

- [x] Declare the QA execution mode, launch commands, and copied runtime-state root
- [x] Verify a cold start against a representative persisted runtime-state root with missing endpoint drift
- [x] Verify a restart on the same copied root after reconciliation persisted
- [x] Capture API evidence for summary, endpoints, candidates, and account lifecycle truth
- [x] Capture browser evidence for Providers, Models, Router, Candidates, and Benchmark
- [x] Reconcile the packaged-dist launch limitation discovered during QA
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## QA Execution Record

- QA Execution Mode: `hybrid`
- Agent Executor: Codex controller
- Tools Used: live worktree `runtime-host-bridge` bridge launched through `tsx`, built `runtime-ui` assets, `powershell` with `Invoke-RestMethod`, Playwright via `node` plus `@playwright/test`, user-performed browser verification in the live Codex session, and retained JSON or PNG or text artifacts under the run-local evidence directory
- Browser Session: Playwright via `node --input-type=module` and `@playwright/test`
- Worktree: `D:\DEV\role-model\.worktrees\71-runtime-startup-lifecycle-and-health-truth-reconciliation`
- Branch: `recursive/71-runtime-startup-lifecycle-and-health-truth-reconciliation`
- Runtime state root used for QA: `C:\Users\erikb\AppData\Local\Temp\role-model-run71-qa-state`
- Follow-up live operator state root: `C:\Users\erikb\AppData\Local\Role Model Runtime\state`
- Scope id: `runtime-host-bridge`
- Runtime Base URL: `http://127.0.0.1:3461`
- Runtime Evidence Path: `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/`
- Rebuilt commands:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge... build`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
- Launch command used for retained QA:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx src/cli-entry.ts --repo-root D:\DEV\role-model\.worktrees\71-runtime-startup-lifecycle-and-health-truth-reconciliation --runtime-state-root C:\Users\erikb\AppData\Local\Temp\role-model-run71-qa-state --scope-id runtime-host-bridge --port 3461 --unified-runtime-config C:\Users\erikb\AppData\Local\Temp\role-model-run71-qa-state\runtime-config.yaml`
- Dist-launch note:
  - direct `node .../dist/cli-entry.js` execution against the built graph failed because some workspace packages still export source-only entrypoints without a runtime condition
  - that packaging/export issue pre-dates this run’s bug scope and would require separate packaging work
  - retained QA therefore used the implementation-commit bridge CLI through `tsx` together with the rebuilt dependency graph and rebuilt client bundle
- Representative copied-state preparation:
  - copied `state/runtime-config.yaml`
  - copied `state/runtime-host-bridge/**`
  - seeded `peers.json` with the local peer row to reproduce the `local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0` maintenance account
  - inserted a maintenance-only `deepseek.capture.account` provider-account row without an active endpoint
  - removed `deepseek.personal.deepseek-api-key.global.deepseek-v4-pro` from SQLite before cold start to force startup reconciliation
  - removed peer auto-reloads from copied `operator-intent.json` so the peer remained maintenance-only rather than loading a local endpoint
- Follow-up live operator proof:
  - restarted `:3461` against the live operator state root after the router-overview shortlist fix
  - captured live `GET /api/role-model/router/candidates` and `/healthz` receipts under `evidence/manual-qa/post-router-fix/`
  - captured rebuilt-browser proof for `/app/router` under `evidence/manual-qa/post-router-fix/screens/`
  - user manually refreshed the router page in the live Codex session and confirmed the fourth candidate was now visible

## QA Scenarios and Results

| # | Scenario | Requirement | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Cold start reconciles the missing persisted remote activation instead of trusting a non-empty SQLite endpoint table | R2, R8 | **PASS** | `evidence/manual-qa/cold-start/focus.json`, `evidence/manual-qa/cold-start/healthz.json` |
| 2 | Cold start keeps `deepseek.capture.account` and `local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0` as maintenance-only rows, not configured remote connections | R1, R4, R6, R8 | **PASS** | `evidence/manual-qa/cold-start/focus.json`, `evidence/manual-qa/cold-start/accounts.json`, `evidence/manual-qa/cold-start/screens/providers-body.txt`, `evidence/manual-qa/cold-start/screens/providers.png` |
| 3 | Cold start leaves the configured remote endpoint set at four remote endpoints with one healthy and eligible GPT-5.4 candidate plus three blocked non-runnable records | R3, R5, R8 | **PASS** | `evidence/manual-qa/cold-start/focus.json`, `evidence/manual-qa/cold-start/endpoints.json`, `evidence/manual-qa/cold-start/router-candidates.json` |
| 4 | Providers, Models, Router, Candidates, and Benchmark reflect the same cold-start truth after authority is reached | R4, R5, R8 | **PASS** | `evidence/manual-qa/cold-start/screens/providers.png`, `evidence/manual-qa/cold-start/screens/models.png`, `evidence/manual-qa/cold-start/screens/router.png`, `evidence/manual-qa/cold-start/screens/router-candidates.png`, `evidence/manual-qa/cold-start/screens/benchmark.png`, `evidence/manual-qa/cold-start/screens/benchmark-body.txt` |
| 5 | Benchmark checklist stays truthful and lists only benchmark-runnable endpoints in the active checklist | R3, R5, R8 | **PASS** | `evidence/manual-qa/cold-start/screens/benchmark-body.txt`, `evidence/manual-qa/cold-start/router-candidates.json` |
| 6 | Restart on the same copied root is idempotent: endpoint stage stays at four endpoints and no extra reconciliation occurs once the repaired row is persisted | R2, R8 | **PASS** | `evidence/manual-qa/restart/focus.json`, `evidence/manual-qa/restart/healthz.json` |
| 7 | Restart preserves the same maintenance-only accounts while backend health and eligibility stay internally consistent with live probes | R1, R3, R5, R6, R8 | **PASS** | `evidence/manual-qa/restart/focus.json`, `evidence/manual-qa/restart/endpoints.json`, `evidence/manual-qa/restart/router-candidates.json` |
| 8 | Final rebuilt-runtime router overview renders the full routing-eligible list after fresh bundle reload, with the user manually confirming all four configured remote candidates are visible on `/app/router` | R5, R8 | **PASS** | `evidence/manual-qa/post-router-fix/router-candidates.json`, `evidence/manual-qa/post-router-fix/healthz.json`, `evidence/manual-qa/post-router-fix/screens/router-app.png`, `evidence/manual-qa/post-router-fix/screens/router-app-body.txt` |

## Evidence and Artifacts

- Cold start API evidence:
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/healthz.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/summary.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/endpoints.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/router-candidates.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/accounts.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/focus.json`
- Cold start browser evidence:
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/screens/providers.png`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/screens/providers-body.txt`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/screens/models.png`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/screens/router.png`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/screens/router-candidates.png`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/screens/benchmark.png`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/cold-start/screens/benchmark-body.txt`
- Restart API evidence:
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/restart/healthz.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/restart/summary.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/restart/endpoints.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/restart/router-candidates.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/restart/focus.json`
- Follow-up live operator evidence:
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/post-router-fix/healthz.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/post-router-fix/router-candidates.json`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/post-router-fix/screens/router-app.png`
  - `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/evidence/manual-qa/post-router-fix/screens/router-app-body.txt`

## User Sign-Off

- Required and received. QA Execution Mode is `hybrid`; the user reported `manual qa passed` in chat on `2026-07-16` after reloading the live router page on `http://127.0.0.1:3461/app/router` and confirming all four candidates were visible.
- Approved by: `user`
- Date: `2026-07-16`

## Traceability

- `R1` → scenarios 2 and 7
- `R2` → scenarios 1 and 6
- `R3` → scenarios 3, 5, and 7
- `R4` → scenarios 2 and 4
- `R5` → scenarios 3, 4, 5, 7, and 8
- `R6` → scenarios 2 and 7
- `R7` → satisfied by the retained RED/GREEN evidence in Phase 3 and the retained green reruns in Phase 4
- `R8` → scenarios 1 through 8

## Coverage Gate

- [x] The runtime was launched against a representative copied persisted state root, not mocked data
- [x] The cold start exercised startup reconciliation with a deliberately missing endpoint row
- [x] The restart exercised the same copied root after reconciliation persisted
- [x] The remote provider connections pane, Models, Router, Candidates, and Benchmark surfaces were captured or text-extracted
- [x] The copied state reproduced both maintenance-only rows called out in the requirement
- [x] API evidence and browser evidence were both retained under run-owned paths
- [x] Final live operator proof and user sign-off were retained for the router-overview follow-up fix

Coverage: PASS

## Approval Gate

- [x] Cold-start evidence proves the missing remote endpoint was restored with `reconciled: 1`
- [x] Providers evidence proves `deepseek.capture.account` and `local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0` stayed out of configured remote connections
- [x] Cross-surface evidence proves health and eligibility truth aligned after authority was reached
- [x] Restart evidence proves the endpoint pass is idempotent on the same copied root
- [x] The dist-launch packaging/export limitation is documented and does not change the correctness of the implemented startup-truth fix
- [x] Follow-up live operator proof and user sign-off confirm the router page now renders the full eligible list

Approval: PASS
