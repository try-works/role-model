Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-05-05T22:29:37Z`
LockHash: `719d7a91e8f1d929b069e088cf386b6bee8c968df683f57ad4f84d6fa26f3dfb`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md`
Scope note: This document records the exact `DECISIONS.md` updates made for the completed runtime UI foundation run.

## TODO

- [x] Read the Phase 5 manual QA artifact
- [x] Update `/.recursive/DECISIONS.md` with the run outcome
- [x] Record a concise delta summary of the `DECISIONS.md` edits
- [x] Document rationale for the new run entry
- [x] Verify run references and artifact links are correct
- [x] Complete the audit sections and gates

## Decisions Changes Applied

- Updated path or section: `/.recursive/DECISIONS.md#recursive-run-index`
- Run entry added or edited: added the `14-router-runtime-ui-foundation` entry with its artifact list, what changed, why, how, out-of-scope summary, and known follow-ups
- Structural edits: retained the existing run index format and appended the new completed run entry after `12-router-runtime-hardening-operations`; run `13-router-runtime-mcp-tools-extension` remains unindexed here because it is not yet closed out as a completed run

## Rationale

- Why these ledger changes were needed: the global decisions ledger must record that the repo now has a repo-owned runtime operator shell, a runtime-backed provider/account onboarding surface, and an explicit Moonshot/Kimi-first control-plane slice.
- Why this run belongs in this section/index: it is the next completed runtime milestone that materially changes how operators interact with the single-host runtime baseline and what future UI or provider work must build on.

## Resulting Decision Entry

```md
### Run `14-router-runtime-ui-foundation`

- Run folder: `/.recursive/run/14-router-runtime-ui-foundation/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added `/role-model-router/apps/runtime-ui/` as the first repo-owned runtime operator shell with the `/app`, `/app/providers`, `/app/accounts`, `/app/endpoints`, `/app/workbench`, `/app/requests`, `/app/requests/:requestId`, and `/app/runtime` route family
  - extended `/role-model-router/apps/runtime-host-bridge/` plus `/role-model-router/packages/sqlite-memory/` with runtime summary, providers, accounts, account upsert, and endpoint-list control-plane seams plus the repo-local `runtime:validate-ui` command
  - widened the normalized catalog and provider-account layer for the first Moonshot/Kimi provider slice, including role-model-owned provider presets, explicit supported auth modes, and an honest backend-limited Kimi device-OAuth surface
- Why:
  - to establish the first repo-owned operator UI and provider/account onboarding flow on top of the existing single-host runtime baseline instead of continuing to rely only on vendored host surfaces
- How:
  - implemented strict RED/GREEN TDD across catalog, provider-account, SQLite, host-bridge, and runtime-ui helper slices, accepted delegated Phase 3.5 code review, captured a repaired Phase 4 validation matrix with accurate exit codes, and confirmed route-level browser QA against the live host bridge and UI dev server
- What was not done:
  - no full Kimi device-OAuth token lifecycle productization, automatic endpoint materialization from account upserts, broader public/docs/catalog shell work, or run-13 MCP/tool-extension closeout was added here
- Known issues / follow-ups:
  - Kimi Code remains intentionally `backend-limited`; the UI exposes real OAuth metadata but does not claim durable token exchange/refresh is complete
  - the endpoint registry remained on the current three-entry runtime baseline after the manual-QA Moonshot account upsert, so account save does not yet auto-materialize new endpoint rows in this run
  - the broader root `build` and `test` commands still fail on the inherited schema-tools/Biome generated-types path
```

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `late-phase ledger maintenance remained controller-owned`
Delegation Decision Basis: `the decisions delta was short and directly coupled to the locked run artifacts and manual-QA outcome`
Delegation Override Reason: `a delegated pass would not improve confidence for this compact ledger update`
Audit Inputs Provided:
- `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/DECISIONS.md`

## Effective Inputs Re-read

- `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- Manual QA outcome reflected: yes
- Run outcome and scope reflected: yes
- Follow-ups and out-of-scope items reflected: yes

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md`
  - `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`
  - `/.recursive/DECISIONS.md`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `85abf980096c931f09554ca203b66fa58bcb3cf4`
- Comparison reference: `working-tree`
- Normalized baseline: `85abf980096c931f09554ca203b66fa58bcb3cf4`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 85abf980096c931f09554ca203b66fa58bcb3cf4`
- Base branch: `main`
- Worktree branch: `recursive/14-router-runtime-ui-foundation`
- Actual changed files reviewed: `/.recursive/DECISIONS.md`, `/package.json`, `/pnpm-lock.yaml`, `/role-model-router/apps/runtime-host-bridge/package.json`, `/role-model-router/apps/runtime-host-bridge/src/cli.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`, `/role-model-router/apps/runtime-ui/app/app.css`, `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`, `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`, `/role-model-router/apps/runtime-ui/app/lib/cn.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `/role-model-router/apps/runtime-ui/app/root.tsx`, `/role-model-router/apps/runtime-ui/app/routes.ts`, `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`, `/role-model-router/apps/runtime-ui/app/routes/app-layout.tsx`, `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`, `/role-model-router/apps/runtime-ui/app/routes/index.tsx`, `/role-model-router/apps/runtime-ui/app/routes/not-found.tsx`, `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`, `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/role-model-router/apps/runtime-ui/app/routes/runtime.tsx`, `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`, `/role-model-router/apps/runtime-ui/package.json`, `/role-model-router/apps/runtime-ui/react-router.config.ts`, `/role-model-router/apps/runtime-ui/tsconfig.json`, `/role-model-router/apps/runtime-ui/vite.config.ts`, `/role-model-router/packages/catalog/data/normalized-catalog.json`, `/role-model-router/packages/catalog/src/index.ts`, `/role-model-router/packages/catalog/test/index.test.ts`, `/role-model-router/packages/provider-account/src/index.ts`, `/role-model-router/packages/provider-account/test/index.test.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/packages/sqlite-memory/test/index.test.ts`, `/testdata/catalog/models-dev-local-overrides.json`, `/testdata/catalog/models-dev-snapshot.json`, `/testdata/router-runtime/provider-presets.json`

## Gaps Found

- none

## Repair Work Performed

- Added the completed run-14 entry to `/.recursive/DECISIONS.md` and synchronized this receipt with the final ledger wording.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`, `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md` | Audit Note: the durable ledger now records the repo-owned runtime UI foundation and route-shell milestone.
- R2 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/14-router-runtime-ui-foundation/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`, `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md` | Audit Note: the ledger now records that the operator shell is repo-owned and tied to the shared runtime UI/control-plane contract rather than the vendored UI shell.
- R3 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md`, `/testdata/router-runtime/provider-presets.json`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Evidence: `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`, `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md` | Audit Note: the ledger now records the Moonshot/Kimi-first onboarding slice and the honest backend-limited Kimi OAuth stance.
- R4 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md`, `/role-model-router/apps/runtime-ui/app/routes.ts` | Verification Evidence: `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`, `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md` | Audit Note: the ledger now preserves the shipped `/app/*` route family as the first runtime operator build.
- R5 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md` | Verification Evidence: `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`, `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md` | Audit Note: the ledger now records route-level browser QA as part of the completed run truth instead of implying a purely code-only UI milestone.
- R6 | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md`, `/.recursive/run/14-router-runtime-ui-foundation/04-test-summary.md` | Verification Evidence: `/.recursive/run/14-router-runtime-ui-foundation/04-test-summary.md`, `/.recursive/run/14-router-runtime-ui-foundation/05-manual-qa.md`, `/.recursive/run/14-router-runtime-ui-foundation/06-decisions-update.md` | Audit Note: the ledger now preserves the run-owned green validation floor, the preserved host-boundary stance, and the remaining inherited root reds.

## Audit Verdict

- Audit summary: the decisions ledger now records the runtime UI foundation baseline and its remaining known follow-ups accurately.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> reflected in the runtime-ui foundation bullet plus the `R1` requirement line above.
- `R2` -> reflected in the repo-owned shell/shared-surface framing plus the `R2` requirement line above.
- `R3` -> reflected in the Moonshot/Kimi onboarding bullet plus the `R3` requirement line above.
- `R4` -> reflected in the route-family bullet plus the `R4` requirement line above.
- `R5` -> reflected in the route-level browser-QA wording plus the `R5` requirement line above.
- `R6` -> reflected in the known follow-ups and validation-floor wording plus the `R6` requirement line above.

## Coverage Gate

- [x] The completed run entry reflects the final implementation and validation outcome
- [x] Out-of-scope and follow-up items are preserved accurately
- [x] Artifact links and run references are correct

Coverage: PASS

## Approval Gate

- [x] `/.recursive/DECISIONS.md` reflects the completed run truth
- [x] No unresolved ledger inconsistencies remain

Approval: PASS
