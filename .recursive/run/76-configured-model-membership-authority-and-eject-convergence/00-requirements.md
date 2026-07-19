Run: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-17T10:09:22Z`
LockHash: `d98e2f65884e1b30d8b2b6811cdc45ff78011304066540f0d18341ecbfd85d52`
Workflow version: `recursive-mode-audit-v2`
User approval: `2026-07-17` (requirements approved for run creation)
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/00-requirements.md`
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-requirements.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- audited persisted-state findings captured in chat on `2026-07-17`
Outputs:
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`
Scope note: Repair the configured-model lifecycle so remote model membership has one authoritative contract, `Eject from pool` is an explicit durable mutation against that contract, and every derived surface converges to it across immediate mutation, rebuild, restart, and legacy-state repair. The run must remain provider-agnostic, extensible to future model and account types, use strict TDD, and verify the rebuilt standalone runtime before closeout.

## TODO

- [x] Re-read current recursive control-plane docs and relevant prior runs
- [x] Audit the current eject and resurrection behavior across code, tests, and persisted state
- [x] Convert the bug into a systematic configured-membership authority requirement
- [x] Define mutation, restart, migration, and conflict-handling boundaries
- [x] Make strict TDD a mandatory implementation gate
- [x] Make rebuilt-runtime verification a mandatory completion gate
- [x] Capture explicit out-of-scope boundaries and extensibility constraints
- [x] Record user approval before creating the run folder
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `backend + lifecycle bugfix`
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/apps/runtime-ui/**`
- Secondary subsystems:
  - standalone runtime persisted-state surfaces
  - restart and rehydration flows
  - runtime-config reference and inventory synthesis surfaces
- User-visible outcome:
  - when an operator ejects a model from the pool, that model is removed from the configured pool and does not come back unless the operator explicitly re-adds it

## Relevant Prior Runs

- `39-runtime-session-rehydration-model-inventory`
- `47-runtime-persistence-rehydration-lifecycle`
- `71-runtime-startup-lifecycle-and-health-truth-reconciliation`
- `72-standalone-runtime-config-authority-and-alias-rematerialization`

## Problem Summary

The current runtime does not treat configured remote model membership as one authoritative lifecycle concept. Instead, configured membership can be reconstructed from multiple durable or semi-durable surfaces, including account `allowedModels`, persisted runtime endpoints, `operator-intent.remoteActivations`, and config-derived inventory inputs.

That makes `Eject from pool` a partial cleanup instead of an authoritative removal. The immediate delete path removes some state, but rebuild and restart logic can union stale activation or endpoint evidence back into configured membership. The result is a visible operator bug: models that were explicitly ejected from the configured pool reappear in the app during `rebuildCurrentState()` or after runtime restart.

This run must replace that ambiguous behavior with one explicit configured-membership authority contract and a convergence model that future features can extend without reintroducing resurrection bugs.

## Fixed Decisions

1. Configured remote model membership is a first-class backend-owned lifecycle concept with one authoritative write contract.
2. Historical endpoint rows, remote activations, health state, and repair evidence are derived state, not authoritative configured membership.
3. `Eject from pool` is a durable lifecycle mutation, not a best-effort cleanup request.
4. Repair and restart logic may rebuild missing derived state for still-configured models, but may not recreate configured membership from stale evidence alone.
5. Backend-owned derived references may be auto-pruned during eject; explicit user-authored conflicting references must be handled explicitly and deterministically.
6. The contract must remain provider-, endpoint-, and model-agnostic and must not encode Moonshot-, Kimi-, DeepSeek-, or other vendor-specific behavior.
7. Existing local-peer wildcard semantics are preserved unless a later approved run explicitly changes them.
8. Phase 3 must use `TDD Mode: strict`.
9. Phase 5 rebuilt-runtime verification is mandatory and is a completion gate, not an optional QA addendum.

## Canonical Domain Decisions

### `D1` Authoritative membership ownership

Phase 2 must define one canonical source-of-truth contract for configured remote model membership, including:

- owning persistence surface
- owning write paths
- owning read paths
- precedence over restart and repair evidence
- identity rules for account-plus-model membership
- lifecycle transitions for add, eject, reconnect, restart, migration, and archival

### `D2` Derived-state taxonomy

Phase 2 must classify each relevant surface as authoritative, derived-durable, derived-transient, or advisory, including at minimum:

- provider account `allowedModels`
- `modelRoleBindings`
- runtime endpoint rows
- `operator-intent.remoteActivations`
- runtime-config-derived alias and controller references
- merged inventory and UI-ready view models
- health and readiness summaries

### `D3` Mutation contract taxonomy

Phase 2 must define explicit mutation classes for:

- add configured model
- eject configured model
- reconnect or repair account
- rebuild current state
- restart bootstrap reconciliation
- legacy-state sanitization or migration

Each mutation class must define:

- inputs
- authoritative writes
- derived-state writes
- allowed auto-pruning
- blocking conflict conditions
- rollback or failure semantics
- idempotence expectations

### `D4` Conflict-resolution contract

Phase 2 must define how the runtime handles references that still point at an ejected model, including:

- backend-owned derived references that are safe to auto-prune
- explicit user-authored references that must block the eject
- how conflicts are reported
- how future reference-owning features plug into the same contract

### `D5` Migration and repair contract

Phase 2 must define how existing stale persisted state is reconciled after upgrade so operators do not need manual JSON or SQLite cleanup as the normal fix path.

## Requirements

### `R1` The runtime must expose one authoritative configured-model membership contract

Description:
Configured remote model membership must stop being an emergent side effect of multiple persistence surfaces and become one explicit backend-owned contract.

Acceptance criteria:
- Phase 2 documents a source-of-truth matrix for configured membership across all current relevant surfaces.
- Exactly one contract is authoritative for whether a remote model is configured for an account.
- Every inventory and lifecycle consumer reads configured membership from that contract after mutation, rebuild, and restart.
- Future derived surfaces can be added without gaining authority by accident.

### `R2` `Eject from pool` must be an authoritative, atomic, idempotent lifecycle mutation

Description:
A successful eject must durably remove configured membership and converge all derived backend-owned state that can otherwise resurrect the model.

Acceptance criteria:
- A successful eject removes the target model from authoritative configured membership.
- The same mutation prunes all matching backend-owned derived state required for convergence, including at minimum matching model-role bindings, runtime endpoint rows, and remote activation intent.
- The mutation is atomic or has explicit rollback behavior; silent partial cleanup is not allowed.
- Repeating the same eject operation yields a stable idempotent result.
- If the ejected model is the account's last configured model, the resulting account lifecycle outcome is deterministic and documented.

### `R3` Restart, rebuild, and repair flows must not resurrect intentionally removed membership

Description:
Runtime repair logic must treat stale evidence as stale evidence. It may repair missing derived state for configured models, but it may not recreate configured membership for removed ones.

Acceptance criteria:
- `rebuildCurrentState()` cannot re-add configured membership solely from stale endpoint rows, stale remote activations, or other historical evidence.
- Restart bootstrap and persisted-state repair sanitize, archive, or prune stale evidence for non-configured models instead of rehydrating them into membership.
- The current legacy behavior that unions drift back into configured membership is explicitly replaced.
- Cold start, warm restart, and repeated restart behavior remain stable.

### `R4` Explicit conflicting references must be handled systematically and extensibly

Description:
The eject contract must work for current and future reference-bearing surfaces without silent drift or one-off exceptions.

Acceptance criteria:
- If a model is still referenced by an explicit user-authored surface that cannot be safely auto-pruned, eject fails before completion.
- The failure explains what blocked the eject, where the reference lives, whether any mutation occurred, and how to resolve it.
- Backend-owned derived references use the documented auto-prune path instead of ad hoc special cases.
- The conflict model is generic enough that future reference-bearing features can register into it without redefining eject semantics.

### `R5` Legacy-state migration and sanitization must be first-class

Description:
Operators with existing stale persisted state must converge automatically to the repaired contract without manual file surgery as the standard recovery path.

Acceptance criteria:
- Existing persisted operator state containing stale endpoints or stale remote activations converges automatically after the repaired runtime boots or performs the relevant maintenance flow.
- Manual file or database surgery is not the expected operator workflow.
- Sanitization behavior is observable and deterministic.
- Migration does not remove still-configured models or unrelated healthy state.

### `R6` UI and API surfaces must remain consistent with the authoritative contract

Description:
Once configured-membership truth is repaired, every operator-facing inventory surface must reflect that same truth immediately and after restart.

Acceptance criteria:
- After successful eject, configured-model counts, cards, details, and relevant API responses no longer show the removed model.
- The removed model stays absent after rebuild and restart.
- Blocked ejects and startup sanitization outcomes produce explicit diagnostics instead of silent resurrection or disappearance.
- UI surfaces distinguish configured membership from maintenance-only credentials, archived stale state, and non-configured endpoint residue.

### `R7` The contract must be future-proof and extensible

Description:
This run must repair the bug by clarifying the lifecycle model, not by introducing a brittle special case.

Acceptance criteria:
- The implementation does not hardcode provider-specific or model-family-specific behavior.
- New persistence surfaces or new runtime features that can reference configured models must plug into the authority and conflict contracts through documented extension points.
- The run documents which surfaces are authoritative versus derived so later features do not accidentally create another competing authority.
- Tests include negative controls proving unaffected lifecycle families continue to work.

### `R8` Phase 3 must use strict TDD with owning regression coverage

Description:
The implementation must follow strict RED-GREEN discipline and leave behind durable automated coverage for the bug class, not only a one-off fix.

Acceptance criteria:
- `03-implementation-summary.md` declares `TDD Mode: strict`.
- Every production code change is preceded by a failing owning automated test recorded in the run evidence.
- Minimum RED/GREEN coverage includes:
  - eject with sibling models preserved
  - eject of last configured model
  - repeated eject idempotence
  - restart with stale remote activation intent
  - restart with stale endpoint rows
  - conflict-blocked eject
  - legacy-state sanitization or migration
  - negative controls for still-configured models, unaffected sibling accounts, and existing local wildcard behavior
- Tests extend the owning runtime-host suites rather than relying on one-off manual scripts only.

### `R9` Phase 5 must verify the rebuilt standalone runtime end to end

Description:
The repaired behavior must be proven on the rebuilt runtime that owns the actual persisted state, not only in isolated tests or development helpers.

Acceptance criteria:
- Verification uses the rebuilt standalone runtime that owns the real operator state, not only unit tests, dev helpers, or source inspection.
- Phase 5 proves the bug on representative persisted state, performs real eject actions, and proves the models stay removed after restart.
- Verification records before-and-after evidence for authoritative membership, derived endpoint state, remote activation intent, inventory surfaces, and restart outcome.
- Verification proves remaining configured models still route normally.
- The run is not complete until rebuilt-runtime verification passes.

## Out of Scope

- changing route scoring, benchmark policy, or model-catalog behavior
- deleting models from the global catalog rather than from a runtime's configured pool
- provider-specific patches that bypass the generic lifecycle contract
- broad UI redesign unrelated to truthful lifecycle, diagnostics, or required maintenance flows
- manual persisted-state cleanup as the normal user-facing fix

## Constraints

- backend owns configured-membership truth
- no silent partial success and no silent resurrection
- preserve unaffected accounts, bindings, and still-configured models
- preserve explicit user-authored config unless the contract explicitly allows safe auto-pruning
- keep diagnostics secret-safe
- Phase 3 strict TDD is mandatory
- Phase 5 rebuilt-runtime verification is mandatory

## Required Evidence

- Phase 2 source-of-truth and mutation matrix
- RED and GREEN evidence for every owning test slice
- automated regression logs for eject, restart, conflict, and migration cases
- rebuilt-runtime QA evidence with before-and-after state proof
- Phase 6, Phase 7, and Phase 8 updates documenting the new authority and convergence contract in `DECISIONS`, `STATE`, and relevant memory

## Coverage Gate

- [x] The requirement defines one authoritative configured-membership contract
- [x] The requirement covers eject mutation semantics, convergence, and idempotence
- [x] The requirement covers rebuild, restart, repair, and migration behavior
- [x] The requirement covers explicit conflict handling for current and future reference surfaces
- [x] The requirement covers UI and API consistency
- [x] The requirement makes strict TDD mandatory
- [x] The requirement makes rebuilt-runtime verification mandatory
- [x] Out-of-scope and extensibility boundaries are explicit

Coverage: PASS

## Approval Gate

- [x] The scope is limited to configured-model membership authority and eject convergence
- [x] The fix boundary is systematic rather than provider-specific or page-local
- [x] Acceptance criteria are observable and testable
- [x] Strict TDD is a mandatory implementation gate
- [x] Rebuilt-runtime verification is a mandatory completion gate
- [x] The user approved this requirements artifact for run creation on `2026-07-17`

Approval: PASS
