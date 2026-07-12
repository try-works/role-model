Run: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-07-12T14:07:12Z`
LockHash: `92779c00c45463e6797ba675d67bc4be4eaedbeb35b51d641fd5e624f5c011a5`
Inputs:
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/03-implementation-summary.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/06-decisions-update.md`
Scope note: Records the durable decision-ledger entry for the run-67 startup-bootstrap split, truthful deferred request evidence, non-QA latest-ids parity, and packaged-runtime readiness gating.

## TODO

- [x] Re-read the effective upstream artifacts through Phase 5
- [x] Update `/.recursive/DECISIONS.md` with the final run-67 entry
- [x] Record the exact decision-ledger delta in this receipt
- [x] Confirm the decision entry matches the verified worktree reality

## Audit Context

This phase records the final run-67 decision: route-owned first paint is now the default for the targeted operator surfaces, `/app/models` treats request evidence as deferred truth instead of startup data, non-QA startup must expose the latest-ids seam, and packaged validation must wait for runtime-summary readiness after `/healthz`.

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: the session exposes deferred subagent tooling through `tool_search`, but the worktree still lacks `/.recursive/config/recursive-router-discovered.json`, so routed delegation remains unsafe from this run workspace.
- Delegation Decision Basis: the decision delta is narrow and depends on exact reconciliation against the verified Phase 3 through Phase 5 artifacts, so direct controller review was clearer than packaging a delegated bundle.
- Delegation Override Reason: local direct audit was the safest way to reconcile the new decision entry against the locked run artifacts and the active decision ledger.
- Audit Inputs Provided:
  - locked run-67 requirements, implementation, test, and manual-QA artifacts
  - final `/.recursive/DECISIONS.md` diff in the active worktree
  - the run-67 diff basis from `00-worktree.md`

## Effective Inputs Re-read

- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/00-requirements.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/03-implementation-summary.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`
- `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- Phase 3 introduced the targeted route-family snapshot split, truthful deferred request evidence on `/app/models`, and the non-QA latest-ids plus packaged-readiness repairs.
- Phase 4 verified the owned runtime-ui, runtime-host-bridge, sqlite-memory, validator, browser, and packaging lanes.
- Phase 5 proved the same behavior against the rebuilt packaged runtime, including live route-path proof and deferred-failure isolation.
- The decision entry added here reflects that verified final state rather than the earlier broad-snapshot startup behavior.

## Decisions Changes Applied

- Added a new top-level run entry to `/.recursive/DECISIONS.md` for `67-runtime-ui-route-startup-performance-hardening`.
- Recorded:
  - the targeted operator-route family now owns explicit first-paint fetch groups instead of inheriting `fetchRuntimeSnapshot()`
  - `/app/models` is the canonical deferred request-evidence pattern, with truthful `null`, `Loading...`, and `Unavailable` semantics
  - non-QA startup paths must expose `GET /api/role-model/requests/latest-ids?limit=10`
  - packaged validation must wait for `/api/role-model/runtime/summary` after `/healthz` before control-plane assertions
  - rebuilt packaged-runtime proof must show the remediated route family and preserve the run-66 providers latest-ids baseline

## Rationale

- Run 66 fixed only the providers page, but many other operator routes still inherited the same rich request-ledger startup cost through the broad shared snapshot helper.
- Future runtime-ui and runtime-host work needs one durable ledger entry stating that route-owned first paint is the default for these operator surfaces and that rebuilt-runtime parity must include non-QA latest-ids wiring plus packaged-summary readiness.

## Resulting Decision Entry

`/.recursive/DECISIONS.md` now contains a dedicated run-67 entry that states:

- `/app/models`, `/app/router`, `/app/router/controller`, `/app/connect`, `/app/connect/upstream`, `/app/system/peers`, and the remediated Studio routes must not bootstrap through `fetchRuntimeSnapshot()`
- `/app/models` defers request evidence and degrades that evidence truthfully instead of synthesizing zero-value startup metrics
- non-QA startup paths expose `GET /api/role-model/requests/latest-ids?limit=10`
- packaged validation waits for `/api/role-model/runtime/summary` after `/healthz`
- rebuilt-runtime proof closes the loop on the remediated route family while preserving the run-66 providers lightweight latest-ids baseline

## Traceability

- `R1` -> the decision entry records the final route-family classification and ownership boundary
- `R2` -> the decision entry records the deferred `/app/models` request-evidence contract
- `R3` -> the decision entry records the targeted `P0` route-family snapshot removal
- `R4` -> the decision entry records preservation of the run-66 providers lightweight latest-ids baseline
- `R5` -> the decision entry records that startup hardening should not regress telemetry-heavy operator visibility
- `R6` -> the decision entry records persisted-state route proof as part of the durable contract
- `R7` -> the decision entry records non-QA latest-ids parity and packaged-summary readiness
- `R8` -> the decision entry is grounded in the strict TDD implementation and verification receipts
- `R9` -> the decision entry records the rebuilt packaged-runtime proof boundary

## Prior Recursive Evidence Reviewed

- none. This ledger update was driven directly by the verified run-67 artifacts and the local decision-entry delta.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: directly compared the verified Phase 3 through Phase 5 artifacts and the new `/.recursive/DECISIONS.md` entry against the active worktree
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none beyond writing the final run-67 decision entry

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5320a8a19655312e0677b369c0e40c319a75de24`
- Comparison reference: `working-tree`
- Normalized baseline: `5320a8a19655312e0677b369c0e40c319a75de24`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5320a8a19655312e0677b369c0e40c319a75de24`
- Base branch: `main`
- Worktree branch: `recursive/67-runtime-ui-route-startup-performance-hardening`
- Phase-6-owned changed file(s):
  - `/.recursive/DECISIONS.md`
- Carried-forward pre-phase worktree drift:
  - `/.recursive/STATE.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - `/role-model-router/apps/runtime-host-bridge/scripts/prod-launcher.ts`
  - `/role-model-router/apps/runtime-host-bridge/scripts/start.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/cli-startup-readiness.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
  - `/packages/schema-tools/test/recursive-runtime-host-bridge-build.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/startup-bootstrap-regression.test.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/studio-audio.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/studio-rerank.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/system-peers.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
  - `/role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`

## Gaps Found

None in the phase-owned decision-ledger update.

## Repair Work Performed

- added the durable run-67 decision entry after the implementation, automated verification floor, and rebuilt packaged-runtime proof were complete

## Requirement Completion Status

- `R1` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/03-implementation-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `R2` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/03-implementation-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `R3` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/03-implementation-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `R4` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `R5` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `R6` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `R7` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/03-implementation-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`
- `R8` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/03-implementation-summary.md`, `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/04-test-summary.md`
- `R9` | Status: `verified` | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/67-runtime-ui-route-startup-performance-hardening/05-manual-qa.md`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] The exact `/.recursive/DECISIONS.md` delta was recorded
- [x] The decision entry reflects the verified final run-67 state
- [x] The route-family split, deferred request-evidence truth, non-QA latest-ids parity, packaged-summary readiness, and rebuilt-runtime proof boundary are represented in the ledger

Coverage: PASS

## Approval Gate

- [x] `/.recursive/DECISIONS.md` now reflects the final run-67 outcome
- [x] The phase-owned ledger update matches the active worktree
- [x] Phase 7 can now reconcile repository current state against this final decision entry

Approval: PASS
