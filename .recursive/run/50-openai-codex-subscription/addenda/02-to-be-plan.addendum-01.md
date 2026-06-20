Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 TO-BE PLAN`
Status: `DRAFT`
Addendum: `01`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-01.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-01.md`
Scope note: This addendum extends run 50 with a bounded routing-alias matrix repair so any persisted routing posture can expose its corresponding canonical alias and alias inventory without requiring a pre-created config alias or a resave.

## TODO

- [x] Convert the RCA into a bounded implementation slice
- [x] Define strict RED-first tests
- [x] Include integrated runtime/UI regression coverage
- [x] Preserve rebuilt-runtime browser verification as an exit gate

## Remediation Target

When routing posture is loaded or saved, the runtime must automatically materialize a canonical primary alias matrix entry that:

1. uses the persisted routing strategy plus execution mode naming contract
2. defaults to the current routable inventory rather than an empty pool
3. appears in runtime-config and router-summary surfaces
4. covers `Use runtime default`, built-in routing families, and custom strategy strings
5. renders on `/app/router` without requiring a manually pre-created alias or a repair save

## Planned Changes By File

- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - add RED-first coverage proving `updateRuntimeConfig(...)` bootstraps a primary alias when routing posture is saved into an alias-less config
  - add matrix coverage for every routing-strategy family and every execution mode
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - materialize a canonical primary alias during runtime-config apply/update when routing posture has zero or one alias entry
  - source alias model ids from the effective routable inventory for the current execution mode
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - keep alias-id and alias-mode canonicalization authoritative for default, built-in, and custom routing strategies
  - add helper support only if needed for shared canonical naming
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - add regression coverage proving the router overview contract expects alias inventory rather than the current empty state after configured routing posture
- `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
  - only adjust if the repaired backend surface exposes a UI mismatch; avoid cosmetic-only fixes

## Implementation Steps

1. Add a failing host-bridge regression that starts with a config containing routing posture but no aliases, saves a new routing posture, and expects:
   - a canonical alias id
   - populated `modelAliases` in returned config
   - populated `aliasInventory` in router summary
2. Add a failing host-bridge matrix regression covering default/unset, built-in, and custom routing strategies across all execution modes.
3. Add or extend a runtime-ui/design-system regression so the router overview contract reflects non-empty alias inventory for a configured posture.
4. Implement backend alias materialization in the runtime-config apply path so startup-loaded configs and update flows both normalize to the same alias matrix.
5. Re-run the same focused tests green.
6. Rebuild the runtime and verify in the browser that persisted routing posture exposes the corresponding alias on `/app/router` without requiring a manual repair save.

## Testing Strategy

TDD Mode: `strict`

RED plan:

- backend focused RED:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts --testNamePattern "bootstraps the primary routing alias when routing posture is saved without preconfigured aliases"`
- backend routing matrix RED:
  - same file, full strategy-family by execution-mode matrix
- UI contract RED:
  - `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts --testNamePattern "router overview expects alias inventory for configured routing posture"`

GREEN plan:

- rerun the same focused backend and UI tests
- rerun a broader host-bridge slice that covers routing-config behavior
- rerun `runtime-ui` build and `runtime-host-bridge` build

Integrated validation target:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts test/routable-inventory-bootstrap.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`

## Manual QA Scenarios

1. Load or save a routing posture into a config variant that previously had no aliases.
   - expected: `/app/router` shows `Alias pools: 1` or greater and lists the canonical alias row
2. Change the routing strategy or execution mode again.
   - expected: the primary alias id updates to the new canonical strategy/mode name
3. Use `Use runtime default` and reload the runtime overview.
   - expected: a `default.*` alias remains exposed and consistent across reload

## Idempotence And Recovery

- reloading or re-saving the same routing posture should preserve a single canonical primary alias rather than duplicating aliases
- changing posture should rename or replace the primary alias deterministically and refresh the alias model pool for the selected execution mode
- if effective routable inventory is empty, the runtime must fail honestly rather than synthesizing an unusable alias silently

## Implementation Sub-phases

### SP1. Backend alias bootstrap

Scope and purpose:
Repair the runtime-config update path so configured routing posture cannot remain alias-less.

Requirement mapping: `R10`, `R11`

Implementation checklist:
- [ ] add failing alias-bootstrap backend tests
- [ ] synthesize the primary alias from effective routable inventory
- [ ] keep canonical alias naming aligned with strategy and execution mode

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts`

Sub-phase acceptance:
- runtime-config update returns a canonical alias even when the previous config had none

### SP2. Router overview regression proof

Scope and purpose:
Prove the operator-facing routing overview exposes the synthesized alias inventory instead of the empty-state regression.

Requirement mapping: `R11`, `R12`

Implementation checklist:
- [ ] add or extend router overview regression coverage
- [ ] confirm browser behavior against rebuilt runtime

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts`
- rebuilt-runtime browser verification on `http://127.0.0.1:3461/app/router`

Sub-phase acceptance:
- automated coverage and browser QA both show the canonical alias inventory for configured routing posture

## Effective-Input Rule For Later Phases

Until superseded by a later addendum, later phases for run 50 must treat this file as an authoritative effective input together with:

- `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-01.md`

This addendum adds only the bounded routing-alias bootstrap repair and its tests.

## Traceability

- `R10` -> strict RED-first test commands are defined before production edits
- `R11` -> integrated backend and router-overview regressions are explicit
- `R12` -> rebuilt-runtime browser verification remains mandatory

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `not probed`
Subagent Capability Probe: `not required for this bounded plan correction`
Delegation Decision Basis: `the plan is a direct continuation of the just-recorded RCA with a narrow file touch set and explicit RED tests`
Delegation Override Reason: `self-audit keeps the implementation plan aligned with the precise routing regression`

## Effective Inputs Re-read

- `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-01.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

## Earlier Phase Reconciliation

- `02-to-be-plan.md`
  - carried-forward claim: all production work must remain RED-first and rebuilt-runtime verified
  - reconciliation: this addendum appends a new bounded routing slice that the original plan did not enumerate

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Comparison reference: `working-tree`
- Normalized baseline: `3fa19909b6f11e4dbc91b5923432719f8c2adbef`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3fa19909b6f11e4dbc91b5923432719f8c2adbef`

## Gaps Found

- current automated coverage does not guard alias bootstrap on routing config saves
- current browser proof does not cover router alias inventory after saving routing posture

## Repair Work Performed

- added the bounded implementation plan needed to resume strict TDD on the routing-alias regression

## Requirement Completion Status

- `R10` | Status: `verified` | Changed Files: `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-01.md` | Verification Evidence: this addendum defines RED-before-production commands | Audit Note: TDD expectations remain explicit.
- `R11` | Status: `blocked` | Blocking Evidence: `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-01.md` | Audit Note: automated regressions still need to be implemented and run.
- `R12` | Status: `blocked` | Blocking Evidence: rebuilt-runtime browser verification is still future work for this routing slice | Audit Note: browser proof remains an exit criterion, not a planning substitute.

## Coverage Gate

- [x] The new routing regression has a bounded implementation plan
- [x] RED-first commands are specified before production edits
- [x] Rebuilt-runtime browser QA remains in scope

Coverage: PASS

## Approval Gate

- [x] The addendum is concrete enough for immediate Phase 3 TDD execution
- [x] The scope is narrow and avoids reopening unrelated provider work
- [x] The acceptance path is explicit: backend RED, UI RED, green, rebuild, browser verify

Approval: PASS
