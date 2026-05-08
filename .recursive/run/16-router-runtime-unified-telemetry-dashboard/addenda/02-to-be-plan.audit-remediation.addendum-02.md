Run: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-08T06:28:33Z`
LockHash: `dcfaf3e2c9e1b8d7b8223771051a144052a6b58f976195424b8b8035735867b7`
Workflow version: `recursive-mode-audit-v1`
Addendum: `02`
Inputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- user scope decision: remediation must use strict TDD, browser verification, and end-to-end telemetry proof for both local and remote paths
Outputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
Scope note: This addendum converts the run-16 audit findings into a concrete remediation plan for the remaining implementation work. It requires strict TDD, browser-backed verification, and end-to-end proof that both local and remote telemetry are recorded by the canonical telemetry layer and displayed together in the repo-owned dashboard.

## TODO

- [x] Translate the audit findings into a concrete remediation sequence
- [x] Record strict TDD requirements for every remaining implementation slice
- [x] Record mandatory browser verification for the telemetry UI
- [x] Capture end-to-end proof requirements for local and remote telemetry recording plus dashboard display
- [x] Capture updated validation and closeout expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Remediation Target

The next pass must make run 16 acceptable as a completed requirement by:

1. closing the remaining canonical telemetry-contract gaps without reopening already-working telemetry APIs and SSE surfaces
2. restoring shared runtime-ui verification so the design-system and telemetry theme contract are actually tested
3. proving through end-to-end execution and browser-backed verification that one local request and one remote request both:
   - persist canonical telemetry
   - appear in telemetry APIs
   - appear together in the repo-owned dashboard and request ledger
4. finishing the run receipts and closeout artifacts honestly

## Execution Discipline

- TDD Mode: `strict`
- Non-negotiable rule:
  - no production code change lands before the corresponding failing test, validator, or browser-backed probe exists
- Required RED -> GREEN -> REFACTOR loop for each remediation slice:
  1. add or tighten the failing test, validator, or browser-backed probe first
  2. capture the initial failing behavior
  3. implement the minimum production change that makes the slice pass
  4. rerun the focused validation and browser verification for that slice
  5. only then proceed to the next slice
- Browser Verification: `required`
  - every slice that changes canonical telemetry presentation, live request recording, or dashboard freshness must be rechecked through a real browser session
  - browser verification is part of slice acceptance, not optional polish

## Remediation Slices

1. **SP6. Canonical telemetry contract completion**
   - Add RED coverage first for:
     - missing flattened telemetry fields required by `R1`:
       - `providerFamily`
       - `finishReason`
       - `streamTextDeltaCount`
       - `streamToolCallDeltaCount`
       - `streamToolArgumentDeltaCount`
     - explicit unsupported-vs-zero semantics for the canonical row contract
     - explicit cache capability vs cache usage semantics
   - Repair targets:
     - `role-model-router/packages/runtime-observability/src/index.ts`
     - `role-model-router/packages/sqlite-memory/src/index.ts`
     - `role-model-router/packages/sqlite-memory/test/index.test.ts`
     - `role-model-router/apps/runtime-host-bridge/src/index.ts`
     - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
     - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
     - `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
   - Goal:
     - make the flattened canonical telemetry row fully satisfy the locked requirement contract instead of requiring raw-bundle fallback for missing fields

2. **SP7. Shared design-system verification and telemetry presentation repair**
   - Add RED coverage first for:
     - the expanded telemetry token contract in `design-system.test.ts`
     - dashboard comparison presentation for explicit cache posture and error posture
     - request-detail presentation for stronger observed-performance/profile-history emphasis
   - Repair targets:
     - `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
     - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
     - `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
     - `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
     - `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
   - Goal:
     - make the shared runtime-ui contract and the operator-facing telemetry surfaces match the remaining `R4` and `R5` clauses

3. **SP8. Parity-slice recording and validator completion**
   - Add RED coverage first for:
     - a named local endpoint and named remote endpoint being recorded as the parity-validation basis
     - explicit typed exclusion or inspectable non-parity disclosure for endpoint families outside the active slice
     - validators asserting both source types appear in summary/comparison/request telemetry reads
   - Repair targets:
     - `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
     - `role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
     - `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
     - any run-owned receipts that name the parity slice
   - Goal:
     - move parity from “implemented in code/tests” to “explicitly recorded and verifiable in run receipts and validators”

4. **SP9. End-to-end runtime proof for telemetry recording**
   - Add RED coverage first for:
     - one local request generating a canonical telemetry record
     - one remote request generating a canonical telemetry record
     - summary/comparison/request APIs returning both source types in one read surface after those requests execute
     - SSE publishing canonical updates after those requests execute
   - Repair targets:
     - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
     - `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
     - any supporting fixtures/harness code required to drive both local and remote requests
   - Goal:
     - prove that local and remote telemetry are both recorded in the canonical telemetry layer, not just displayed through mocks

5. **SP10. Browser verification and dashboard proof**
   - Replace the current “implemented but not fully verified” state with browser-backed proof that:
     - the dashboard shows both local and remote telemetry in one operator flow
     - the request ledger shows both source types
     - request detail remains telemetry-first
     - light and dark themes work
     - narrow/mobile-width layout works
     - SSE freshness updates appear without manual reload
   - Refresh targets:
     - run-owned browser evidence under `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/evidence/`
     - `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/04-test-summary.md`
     - `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/05-manual-qa.md`
   - Goal:
     - make the run’s verification claim honest, reproducible, and visibly tied to the repo-owned runtime UI

6. **SP11. Recursive closeout**
   - Complete:
     - `03-implementation-summary.md`
     - `04-test-summary.md`
     - `05-manual-qa.md`
     - `06-decisions-update.md`
     - `07-state-update.md`
     - `08-memory-impact.md`
   - Goal:
     - close run 16 with audited receipts, state/decisions updates, and memory maintenance rather than leaving the run in a partially implemented Phase 2/Phase 3 limbo

## End-to-End Proof Requirements

The remediation pass is not complete until all of the following are demonstrated together:

1. start the live runtime/bridge against the active local+remote execution slice
2. issue at least one local request and one remote request through the real bridge execution path
3. confirm both requests persist canonical telemetry rows
4. confirm both source types appear in:
   - `/api/role-model/telemetry/summary`
   - `/api/role-model/telemetry/rows`
   - `/api/role-model/telemetry/requests`
5. open the repo-owned runtime UI in a browser and confirm both source types are displayed in:
   - `/app`
   - `/app/observe/requests`
6. confirm request detail remains telemetry-first for one local and one remote request
7. confirm SSE-backed freshness updates the UI without manual reload after generating new requests

If any of those conditions cannot be completed in the current environment, the limitation must be documented explicitly and the affected requirement must not be overstated as complete.

## Browser Verification Plan

Browser verification is required because the remaining gaps are partly about live dashboard behavior, not only backend correctness.

Required browser-backed checks after the relevant slices land:

1. open the repo-owned runtime UI origin in `browser-use`
2. verify `/app` shows one unified telemetry summary/comparison surface
3. verify `/app/observe/requests` shows both source types after executing one local and one remote request
4. open one local request detail and one remote request detail and confirm telemetry-first presentation
5. verify the dashboard and requests views at narrow/mobile width
6. verify light and dark theme behavior on the telemetry surfaces
7. trigger fresh requests while the dashboard or requests page is open and confirm SSE freshness updates the displayed UI without reload

Required browser artifacts:

- dashboard desktop screenshot
- dashboard narrow/mobile screenshot
- requests ledger screenshot
- request detail screenshot(s) for local and remote examples
- theme screenshot(s) as needed to prove light/dark behavior
- any trace or structured capture needed to prove SSE freshness

## Validation Plan

- Focused RED/GREEN package validation:
  - `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
  - `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/lib/view-models.test.ts app/lib/design-system.test.ts`
- Focused build checks:
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/sqlite-memory build`
- End-to-end runtime checks:
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:validate-vendors`
  - direct bridge-backed execution for one local request and one remote request
  - direct reads from `/api/role-model/telemetry/summary`, `/rows`, `/requests`, and `/stream`
- Browser verification commands:
  - `browser-use open http://127.0.0.1:<port>/app`
  - `browser-use screenshot <artifact-path>.png`
  - browser-side interaction and fetch probes required to demonstrate dashboard freshness and local+remote visibility
- Regression floor:
  - `corepack pnpm run runtime:validate-observability`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run runtime:validate-routing`
  - `corepack pnpm run schemas:validate`

## Receipt And Closeout Expectations

- `03-implementation-summary.md` must explicitly distinguish:
  - canonical telemetry-contract completion
  - shared runtime-ui test repairs
  - parity-slice naming and exclusion handling
  - end-to-end telemetry recording/display proof
- `04-test-summary.md` must separate:
  - focused TDD RED/GREEN evidence
  - end-to-end runtime proof
  - browser verification
- `05-manual-qa.md` must record whether QA remained agent-operated and must not overclaim browser or real-runtime coverage
- `08-memory-impact.md` must update skill and run memory if this run teaches anything durable about browser verification, SSE validation, or local/remote telemetry parity workflows

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 16 must treat this file as an authoritative effective input together with:

- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`

This addendum narrows the remaining in-scope remediation work. It does **not** widen the run beyond the original locked requirements.

## Traceability

- `R1` -> SP6 canonical telemetry contract completion | Evidence: `## Remediation Slices`, `## End-to-End Proof Requirements`
- `R2` -> SP8 parity-slice recording and validator completion, plus SP9 end-to-end telemetry proof | Evidence: `## Remediation Slices`, `## Validation Plan`
- `R3` -> SP6 and SP9 preserve and complete the existing canonical telemetry persistence/API/SSE surfaces | Evidence: `## Remediation Slices`, `## Validation Plan`
- `R4` -> SP7 shared design-system verification and telemetry presentation repair | Evidence: `## Execution Discipline`, `## Remediation Slices`
- `R5` -> SP7 presentation repair and SP10 browser dashboard proof | Evidence: `## Browser Verification Plan`, `## End-to-End Proof Requirements`
- `R6` -> carry-forward boundary rule in `## Remediation Slices` and `## Effective-Input Rule For Later Phases` | Evidence: Activity remains preserved raw-host adjacency
- `R7` -> SP8, SP9, SP10, and SP11 validation/closeout completion | Evidence: `## Validation Plan`, `## Receipt And Closeout Expectations`

## Coverage Gate

- [x] The audit findings were translated into a concrete remediation sequence
- [x] Strict TDD is explicit and required
- [x] Browser verification is explicit and required
- [x] End-to-end proof requirements for both local and remote telemetry recording plus dashboard display are explicit
- [x] Validation and closeout obligations are captured
- [x] The addendum narrows remaining work without widening scope

Coverage: PASS

## Approval Gate

- [x] The remediation addendum is consistent with the audit-findings addendum
- [x] The remaining work is specific enough to guide the next implementation pass
- [x] The end-to-end telemetry proof requirement is concrete and verifiable
- [x] Later phases can treat this file as an authoritative effective input

Approval: PASS
