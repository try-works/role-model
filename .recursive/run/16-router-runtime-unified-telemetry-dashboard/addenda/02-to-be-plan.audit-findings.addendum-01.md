Run: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-08T06:28:33Z`
LockHash: `8788c7d44d47ac0ef5bfe4c776553dc344773662c99c6744fa1331732ca07752`
Workflow version: `recursive-mode-audit-v1`
Addendum: `01`
Inputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- implementation audit performed on `2026-05-08`
- focused validation status observed on `2026-05-08`
Outputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
Scope note: This addendum records the post-implementation audit findings against the original run-16 requirement contract and converts them into authoritative plan deltas for the remaining implementation and closeout work. It supplements the Phase 2 plan without rewriting the base artifact.

## TODO

- [x] Record the requirement-by-requirement audit findings
- [x] Distinguish satisfied surfaces from unfinished surfaces
- [x] Translate the findings into concrete remaining implementation work
- [x] Capture the updated validation and closeout expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Audit Finding Summary

- Current overall verdict: `FAIL against the original requirements`
- High-confidence implemented surfaces:
  - flattened telemetry persistence exists
  - canonical telemetry summary, comparison, request, request-detail, and SSE bridge surfaces exist
  - runtime UI dashboard, request ledger, and request-detail routes now consume the canonical telemetry surfaces
  - runtime-ui package build is green
- High-confidence remaining gaps:
  - the canonical telemetry contract is still narrower than the locked requirement set
  - the parity-validation slice is implemented in code/tests but not yet fully captured as a locked run-local contract with typed exclusions
  - shared design-system validation drift remains after telemetry token expansion
  - browser-backed QA and recursive closeout artifacts are still missing

## Requirement Delta

### `R1` Canonical telemetry contract

Current disposition: `not yet complete`

Confirmed gap:

- the flattened canonical telemetry row still omits required dashboard-critical fields:
  - `providerFamily`
  - `finishReason`
  - `streamTextDeltaCount`
  - `streamToolCallDeltaCount`
  - `streamToolArgumentDeltaCount`
- unsupported-vs-zero semantics are still not explicit for several dimensions in the canonical row contract
- cache capability vs cache usage is still encoded only partially through usage-style fields instead of a full typed capability distinction

Required plan adjustment:

- extend the persisted canonical telemetry row, bridge types, runtime-ui API types, and tests so the flattened contract directly covers the full `R1` surface without relying on raw bundle inspection

### `R2` Local and remote telemetry parity

Current disposition: `partially complete`

Confirmed gap:

- parity is demonstrated in focused tests and the implemented runtime slice, but the exact supported local endpoint and remote endpoint are not yet recorded in a locked validation/closeout artifact
- endpoint families outside the parity slice still lack an explicit typed exclusion or inspectable non-parity reason

Required plan adjustment:

- record the exact parity slice in the run receipts
- add an explicit typed exclusion or documented non-parity reason where a current family is out of the canonical unified-dashboard slice

### `R3` Queryable persistence and backend APIs

Current disposition: `substantively complete`

Confirmed implemented surfaces:

- flattened persistence in `sqlite-memory`
- canonical telemetry summary, comparison, requests, request-detail companion reads, and required SSE surface in the host bridge
- deterministic defaults for telemetry window and limit

Carry-forward rule:

- do not reopen the working `/api/role-model/telemetry/*` and SSE surfaces except where required to satisfy the missing `R1` contract fields or parity semantics

### `R4` Design-system-first frontend delivery

Current disposition: `partially complete`

Confirmed gap:

- telemetry route contract and telemetry theme tokens were added, but the shared design-system validation is stale
- `app/lib/design-system.test.ts` still asserts the pre-telemetry `runtimeTheme.colors` object and now fails against the expanded token contract

Required plan adjustment:

- repair the shared design-system/runtime-ui tests so the telemetry token additions are part of the verified shared contract, not just implemented code

### `R5` Coherent telemetry dashboard and inspection experience

Current disposition: `partially complete`

Confirmed gap:

- the dashboard and ledger now use canonical telemetry, but the comparison presentation still under-surfaces some required dimensions such as explicit cache posture and error posture
- request detail is improved, but observed-performance/profile-history presentation is still weaker than the locked requirement wording

Required plan adjustment:

- tighten the dashboard comparison and request-detail surfaces so the remaining required operator dimensions are primary rather than implicit or only available through raw JSON

### `R6` Architecture boundaries

Current disposition: `complete pending final verification receipts`

Carry-forward rule:

- preserve the current split between canonical role-model telemetry and preserved raw host/operator surfaces
- do not regress Activity into the canonical dashboard source of truth

### `R7` Automated validation and browser-backed QA

Current disposition: `not yet complete`

Confirmed gap:

- focused backend telemetry tests pass, but the current targeted runtime-ui test slice fails because the shared design-system test is stale
- there is no browser-backed run evidence yet for:
  - desktop layout
  - narrow/mobile-width layout
  - theme verification
  - unified local+remote visibility in the same operator flow
  - SSE freshness without manual reload
- run-16 closeout artifacts beyond Phase 2 are still absent

Required plan adjustment:

- restore the targeted runtime-ui telemetry test slice to green
- add browser-backed evidence for the telemetry surfaces
- complete the Phase 3-8 recursive artifacts and memory/closeout updates

## Focused Validation Delta

Observed on `2026-05-08`:

- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`: `PASS`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`: `PASS`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/lib/view-models.test.ts app/lib/design-system.test.ts`: `FAIL`
  - blocking failure:
    - `apps/runtime-ui/app/lib/design-system.test.ts`
    - stale expectation for the old `runtimeTheme.colors.light` / `runtimeTheme.colors.dark` object shape after telemetry token expansion
- `corepack pnpm --filter @role-model-router/runtime-ui build`: `PASS`

Implication:

- the current code is closer to complete than the test contract, but the run cannot claim `R7` verification until the shared runtime-ui telemetry slice is fully green and browser evidence exists

## Remaining Work Slices

1. **SP6. Canonical contract completion**
   - extend the flattened telemetry record and all typed bridge/UI surfaces for the missing `R1` fields and explicit support semantics
2. **SP7. Shared test and presentation repair**
   - repair `design-system.test.ts`
   - tighten dashboard comparison and request-detail presentation to match the remaining `R4` and `R5` clauses
3. **SP8. Validation and closeout**
   - add browser-backed QA evidence for desktop, narrow/mobile, theme, unified local+remote presence, and SSE freshness
   - complete run-16 recursive closeout artifacts, including memory updates

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 16 must treat this file as an authoritative effective input together with:

- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`

This addendum narrows the remaining in-scope work. It does **not** widen the run beyond the original requirements.

## Traceability

- `R1` -> `## Requirement Delta` (`R1`) and `## Remaining Work Slices` SP6 | Evidence: audit findings against the implemented flattened telemetry row and bridge/UI contracts
- `R2` -> `## Requirement Delta` (`R2`) and `## Remaining Work Slices` SP8 | Evidence: focused telemetry tests prove parity behavior exists, but run-local parity receipts remain incomplete
- `R3` -> `## Requirement Delta` (`R3`) | Evidence: canonical telemetry APIs and SSE already implemented; addendum explicitly protects them from unnecessary reopening
- `R4` -> `## Requirement Delta` (`R4`) and `## Remaining Work Slices` SP7 | Evidence: telemetry route contract/tokens exist, but shared design-system validation drift remains
- `R5` -> `## Requirement Delta` (`R5`) and `## Remaining Work Slices` SP7 | Evidence: dashboard/ledger/detail routes are migrated but still under-deliver some required operator dimensions
- `R6` -> `## Requirement Delta` (`R6`) | Evidence: current raw-vs-structured boundary remains correct and must be preserved
- `R7` -> `## Focused Validation Delta` and `## Remaining Work Slices` SP8 | Evidence: backend slices pass, runtime-ui targeted suite is not fully green, and browser-backed QA evidence is missing

## Coverage Gate

- [x] The addendum records the requirement-by-requirement audit findings
- [x] Implemented surfaces and unfinished surfaces are explicitly separated
- [x] The findings are translated into concrete remaining work slices
- [x] Updated validation and closeout obligations are captured
- [x] The addendum narrows remaining work without widening scope

Coverage: PASS

## Approval Gate

- [x] The addendum is consistent with the original requirements audit verdict
- [x] The remaining work is specific enough to guide the next implementation and closeout pass
- [x] No locked earlier artifact needed to be rewritten
- [x] Later phases can treat this file as an authoritative effective input

Approval: PASS
