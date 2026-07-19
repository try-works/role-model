Run: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-17T11:00:14Z`
LockHash: `b727979f345e7ee1d37d2f112c656535e73c1d65a9e1b3544ebc28c8382d5cb3`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md` (LOCKED)
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-worktree.md` (LOCKED)
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/01-as-is.md` (LOCKED)
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/01.5-root-cause.md` (LOCKED)
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- affected host, manifest, config, tests, API, and UI sources
Outputs:
- This file
Scope note: Define one backend configured-membership contract, authority-led convergence, atomic/idempotent eject, extensible conflict handling, strict TDD slices, and rebuilt standalone verification.

## TODO

- [x] Re-read every locked run input
- [x] Select the authority, persistence, identity, and precedence contract
- [x] Define surface taxonomy and mutation matrix
- [x] Map R1-R9 to files, tests, and QA
- [x] Define strict RED/GREEN sub-phases
- [x] Define cross-store rollback and legacy sanitization
- [x] Define API/UI diagnostics and rebuilt-runtime proof
- [x] Complete delegated planner audit and repair loop

## Audit Context

- Audit Execution Mode: `subagent`
- Subagent Availability: `available`
- Subagent Capability Probe: the collaboration runtime provides a read-only planner role over a complete review bundle.
- Delegation Decision Basis: the plan makes architectural choices across manual and runtime-config membership, SQLite/JSON/YAML mutation, reference ownership, and restart migration; independent traceability review is warranted.
- Delegation Override Reason: N/A
- Audit Inputs Provided: all locked run artifacts, relevant prior-run plans/memory, fixed diff basis, affected paths, R1-R9, RC1-RC5, testing commands, and QA requirements.

## Effective Inputs Re-read

- Requirements fix backend ownership, one contract, durable eject, no resurrection, explicit conflicts, automatic legacy convergence, UI/API truth, strict TDD, and rebuilt-runtime QA.
- Phase 1 identifies competing membership inputs and incomplete downstream projections.
- Phase 1.5 proves activation-driven resurrection occurs inside DELETE's own rebuild, while endpoint evidence and runtime-config reapply provide independent paths.
- Phase 2 must choose the contract; no earlier artifact mandates SQLite-only, YAML-only, or tombstone persistence.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/39-runtime-session-rehydration-model-inventory/02-to-be-plan.md`: preserve restart rehydration for still-configured models.
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`: preserve credential lifecycle and endpoint-first activation evidence semantics without allowing evidence to create membership.
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/02-to-be-plan.md`: retain deterministic staged bootstrap and observable reconciliation.
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/02-to-be-plan.md`: preserve standalone YAML as the owner of runtime-config provider mappings and canonical path behavior.
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`: preserve alias, account, endpoint, routing, and local wildcard invariants.

## Canonical Configured-Membership Contract

### Identity

- Canonical key: exact normalized pair `{providerAccountId, modelId}`.
- Model-only deletion is forbidden; sibling accounts using the same model remain untouched.
- Local peer wildcard accounts retain their existing separate lifecycle and are excluded from remote membership eject/sanitization.
- Account ids ending in the generated runtime-config namespace `*.litellm` are reserved whenever a matching YAML LiteLLM provider exists. At that account id, YAML owns the complete account membership set; a persisted non-runtime-config row with the same id is legacy metadata input only and its `allowedModels` cannot add membership.
- Collision precedence is therefore deterministic per account, not a union per key: matching YAML provider present -> `runtime-config-managed`; otherwise -> `account-managed`. An exact model present in both sources has one YAML owner, and a manual-only model on the colliding row is legacy residue to sanitize.

### Authoritative read contract

- All runtime consumers read configured remote membership through one backend helper that produces a normalized `ConfiguredModelMembershipSnapshot` from owner-tagged sources.
- Manual/account-managed membership owner: SQLite provider account `allowed_models_json`.
- Runtime-config-managed membership owner: the matching standalone YAML LiteLLM provider `modelMappings`; generated SQLite `*.litellm` accounts are materialized projections, not an independent authority.
- The snapshot exposes source provenance (`account-managed` or `runtime-config-managed`) so mutation uses the owning persistence surface without giving downstream evidence authority.
- Endpoints, remote activations, role bindings, aliases, inventory, health, lifecycle summaries, and UI cards never add membership.

This is one backend contract with source-owned persistence, not a union of arbitrary evidence. New membership owners must register explicitly with the contract; adding a new derived surface cannot make it authoritative.

Collision migration is automatic: when a matching YAML provider claims a reserved account id, materialization replaces the row's membership with the exact YAML mapping set while preserving allowed credential/account metadata. Removing that YAML provider releases the id; it does not resurrect the pre-collision manual membership. Tests cover disjoint manual/YAML models, the same key in both sources, eject/repeat/config-reapply/restart, and provider removal.

### Authoritative write contract

- `add`: mutate the declared owner, validate, then materialize/converge derived state.
- `eject`: preflight all references, mutate the declared owner, prune backend-owned derived state, rebuild projections, and return a structured receipt.
- `config apply`: YAML mappings replace runtime-config-managed membership; generated accounts materialize that membership exactly rather than unioning stale account rows.
- `reconnect/repair`: may repair credentials and derived state only for membership present in the snapshot.
- `rebuild/restart`: may recreate missing derived state for configured keys but may not create membership.
- `migration/sanitization`: prunes derived keys absent from the snapshot and records a reconciliation receipt.

## Source-of-Truth Matrix

| Surface | Classification | Allowed influence |
| --- | --- | --- |
| manual account `allowedModels` | authoritative, durable, account-managed | owns manual account-plus-model membership |
| YAML LiteLLM `modelMappings` | authoritative, durable, runtime-config-managed | owns generated `*.litellm` membership |
| generated runtime-config provider accounts | derived-durable materialization | exact projection of mappings plus non-membership credential metadata |
| `modelRoleBindings` | derived-durable, backend-owned | roles for configured keys only; auto-prune on eject |
| SQLite runtime endpoints | derived-durable, backend-owned | execution/readiness for configured keys only; auto-prune/sanitize |
| `operator-intent.remoteActivations` | derived-durable recovery intent | rehydrate endpoints only for configured keys; auto-prune/sanitize |
| primary/generated aliases | derived-durable, backend-owned | rematerialize from routable configured inventory; safe auto-prune |
| custom aliases | explicit user-authored reference | block eject if target is referenced |
| controller/classifier model or endpoint | explicit user-authored reference | block eject if target model/endpoint is referenced |
| merged inventory/UI view models | derived-transient | display snapshot/materialized accounts only |
| health/readiness summaries | advisory/derived-transient | never create membership |

## Conflict and Extension Contract

- Add a generic `ConfiguredModelReferenceInspector`/descriptor model in `src/configured-model-membership.ts`.
- Each descriptor includes stable `kind`, `owner`, `path`, `providerAccountId`, `modelId`, optional `endpointId`, and policy `auto-prune` or `block`.
- Initial inspectors cover bindings, endpoints, activations, primary aliases, custom aliases, controller, classifier, and runtime-config mappings.
- Runtime-config mappings are membership-owner writes, not blocking references for their own `*.litellm` account.
- Preflight runs before any mutation. A blocking result returns HTTP `409` with code `configured_model_reference_conflict`, reference paths, `mutationApplied:false`, and resolution guidance.
- Future reference-owning features register an inspector rather than adding one-off eject branches.

## Eject Mutation and Rollback Contract

Result shape:

```ts
interface ConfiguredModelEjectResult {
  success: true;
  removedAccount: boolean;
  alreadyAbsent: boolean;
  authority: "account-managed" | "runtime-config-managed" | "absent";
  pruned: {
    modelRoleBindings: number;
    runtimeEndpoints: number;
    remoteActivations: number;
    generatedAliases: number;
  };
}
```

Failures use a typed result/error taxonomy:

- `configured_model_reference_conflict`: no write started; `mutationApplied:false`.
- `configured_model_eject_rolled_back`: a write failed and every touched store was restored; `mutationApplied:false`, `reconciliationRequired:false`.
- `configured_model_eject_indeterminate`: compensation or rollback failed; `mutationApplied:"indeterminate"`, `reconciliationRequired:true`, with the failed boundary and recovery guidance. The operation never reports success in this state.

Rules:

1. acquire the account mutation lock by provider account id; runtime-config-owned mutations additionally acquire the shared unified-config mutation lock used by normal config updates;
2. build the authoritative snapshot and reference inventory;
3. if explicit conflicts exist, return/throw the typed 409 before writes;
4. calculate and validate the full next account/config/intent/endpoint state in memory;
5. for account-managed membership, snapshot operator intent bytes, begin `BEGIN IMMEDIATE`, stage account/binding/endpoint changes inside the SQLite transaction, atomically replace operator intent with its pruned next document, then commit SQLite; JSON failure rolls back SQLite; commit failure first explicitly rolls back the still-active SQLite transaction and then atomically restores the JSON snapshot; return `configured_model_eject_rolled_back` only after both stores are read back/verified, and return `configured_model_eject_indeterminate` if either SQLite rollback or JSON restoration/verification fails;
6. for runtime-config-managed membership, snapshot YAML and operator-intent bytes, atomically replace YAML by same-directory temp-file plus rename, apply the exact next config, atomically prune operator intent, and rebuild; any pre-commit failure restores and reapplies both snapshots in reverse order, while rollback/apply failure returns `configured_model_eject_indeterminate`;
7. rebuild from authority and verify the target key is absent from materialized membership and derived state;
8. return a structured receipt.

Repeated eject of an already-absent key returns `success:true`, `alreadyAbsent:true`, and zero or actual stale-derived prune counts. It never returns a misleading failure solely because convergence was already achieved.

The authoritative owner write is the semantic commit point: SQLite `COMMIT` for account-managed membership and atomic YAML rename for runtime-config-managed membership. A process crash after that point may leave derived residue but cannot restore membership: startup reconciliation uses the owner snapshot to prune JSON/SQLite projections and records the recovery. Fault-injection tests cover JSON write, SQLite commit with successful explicit rollback, SQLite rollback failure, JSON compensation, YAML temp write/rename, config apply, intent prune, config rollback/reapply, and compensation failure. Crash-state fixtures cover JSON-replaced/SQLite-uncommitted and YAML-renamed/config-not-yet-applied windows. Concurrent config update/eject tests prove serialization and no lost mappings.

Last-model behavior:

- account-managed: delete the account lifecycle row after preflight and derived prune, preserving unrelated credential files according to existing credential lifecycle policy;
- runtime-config-managed: remove the provider mapping; if no mappings remain, remove that provider config entry and its generated account;
- both return `removedAccount:true` when no configured membership remains for that account.

## Restart and Legacy Sanitization Contract

- Replace `repairPersistedProviderAccountsFromRuntimeState()` membership union with authority-led `reconcileConfiguredModelDerivedState()`.
- Run reconciliation after authoritative accounts/config mappings are materialized and before endpoint replay.
- Remove endpoint rows and remote activations whose exact membership key is absent.
- Remove bindings for non-configured models.
- Preserve still-configured keys, sibling accounts, unrelated endpoints/activations, credentials, and local wildcard semantics.
- Endpoint bootstrap filters activations through the authoritative snapshot before replay.
- Record a deterministic `ConfiguredMembershipReconciliationReceipt` with timestamp, authority version, inspected counts, pruned counts, and stable reason codes.
- Surface the latest receipt in runtime summary/health APIs; corrupt operator intent remains an explicit degraded diagnostic and is not silently overwritten.

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: The runtime must expose one authoritative configured-model membership contract | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R2` | Coverage: direct | Source Quote: `Eject from pool` must be an authoritative, atomic, idempotent lifecycle mutation | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`, `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R3` | Coverage: direct | Source Quote: Restart, rebuild, and repair flows must not resurrect intentionally removed membership | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R4` | Coverage: direct | Source Quote: Explicit conflicting references must be handled systematically and extensibly | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R5` | Coverage: direct | Source Quote: Legacy-state migration and sanitization must be first-class | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R6` | Coverage: direct | Source Quote: UI and API surfaces must remain consistent with the authoritative contract | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R7` | Coverage: direct | Source Quote: The contract must be future-proof and extensible | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R8` | Coverage: direct | Source Quote: strict TDD with owning regression coverage | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | Verification Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`, `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/04-test-summary.md` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`
- `R9` | Coverage: direct | Source Quote: rebuilt standalone runtime end to end | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/packaged-standalone-restart.test.ts`, `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md` | Verification Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md` | QA Surface: rebuilt standalone package, runtime APIs, real eject/restart, and remaining-model routing

## Plan Drift Check

- The plan stays inside configured membership authority, eject convergence, diagnostics, and necessary UI truth.
- No provider-specific branch is planned.
- No catalog, route-scoring, benchmark, or local wildcard semantic change is planned.
- Runtime config remains authoritative for its own model mappings; the plan removes a mapping only because eject is itself an explicit membership mutation.
- Existing recovery behavior remains for still-configured models.
- Phase 5 uses isolated representative state and does not modify the user's controller runtime state without an explicit later authorization.

## Planned Changes by File

- `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts` (new)
  - normalized key/snapshot, owner provenance, reference descriptors/inspectors, conflict error/result types, pure reconciliation planners.
- `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`
  - remove/sanitize activations by exact account-plus-model key and preserve atomic file replacement.
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - pure exact mapping removal for runtime-config-managed accounts; empty-provider handling; atomic same-directory config replacement; retain primary-alias helpers.
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - replace membership union repair, integrate snapshot/reconciliation, refactor config apply helper, add preflight/mutation/rollback, structured 409/result, reconciliation summary, bootstrap filtering.
- `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts` (new)
  - pure identity, reserved-id collision precedence, source ownership, conflict descriptors, and reconciliation plans.
- `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
  - sibling, last, repeated, activation prune, conflict, cross-account, rollback, and structured receipt coverage.
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
  - invert legacy drift expectation; stale activation/endpoint sanitization, still-configured preservation, sibling-account and local wildcard controls.
- `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - runtime-config mapping eject, same-id disjoint/overlapping collision migration, provider removal, config reapply/restart, concurrent update serialization, atomic-write/apply/intent/rollback fault injection, custom alias/controller/classifier conflicts.
- `role-model-router/apps/runtime-host-bridge/test/packaged-standalone-restart.test.ts`
  - rebuilt executable state/restart regression harness if the existing fixture is the owning packaged seam.
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - structured eject receipt and conflict payload types.
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
  - success/idempotent/conflict parsing.
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - expose latest sanitization receipt semantics without treating residue as configured membership.
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - configured counts/cards and maintenance/residue negative controls.
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - precise eject/idempotent/prune/conflict/startup-sanitization messaging.
- `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
  - message/label policy tests where pure exported helpers own the behavior.

## Implementation Steps

1. Implement Sub-phase A pure contract and reference planning under strict RED/GREEN.
2. Implement Sub-phase B account-managed eject and authority-led derived reconciliation under strict RED/GREEN.
3. Implement Sub-phase C runtime-config-managed membership mutation/reapply/restart under strict RED/GREEN.
4. Implement Sub-phase D API/UI receipts and packaged-runtime regression under strict RED/GREEN.
5. Run focused suites after each slice, then host/UI critical suites, builds, packaging, and Phase 5 rebuilt-runtime QA.

## Implementation Sub-phases

### SP-A - Contract and conflict registry

- Requirements: `R1`, `R4`, `R7`
- RED: pure tests for account-plus-model identity, reserved-id YAML precedence, disjoint and exact-key collisions, source ownership, safe-prune vs block descriptors, cross-account isolation.
- GREEN: add `configured-model-membership.ts` pure contract.
- Gate: focused new test file passes; no host mutation yet.

### SP-B - Account-managed eject and sanitizer

- Requirements: `R2`, `R3`, `R5`, supporting `R6`, `R8`
- RED: extend eject/restart suites for activation resurrection, stale endpoint, sibling/last/repeat, JSON-write/SQLite-commit/successful-rollback/SQLite-rollback-failure/JSON-compensation failures, legacy sanitation, local wildcard.
- GREEN: replace union repair, add exact activation removal, ordered SQLite transaction/atomic-intent compensation protocol, bootstrap filter, receipt.
- Gate: eject + restart suites pass and preserved reproduction harness no longer reproduces the bug (its expected output becomes a Phase 3 RED historical receipt, not a permanent green test).

### SP-C - Runtime-config-managed convergence

- Requirements: `R1-R5`, `R7`, `R8`
- RED: config-backed eject is undone by current mapping reapply; same-id disjoint/overlapping collisions union; concurrent updates lose changes; YAML write/apply/intent/rollback failure postconditions fail.
- GREEN: reserved-id YAML ownership, global config mutation lock, atomic replacement, exact mapping removal through config apply/rollback, no union with stale generated account, empty provider cleanup, typed indeterminate recovery.
- Gate: unified-config and restart suites pass.

### SP-D - API/UI truth and rebuilt seam

- Requirements: `R6`, `R8`, preparation for `R9`
- RED: structured client/result/conflict and sanitization view-model/message tests fail.
- GREEN: bridge HTTP 409/result/summary plus runtime API/view-model/control page messaging.
- Gate: focused UI tests, host/UI builds, critical tests, and packaged restart test pass.

## Testing Strategy

- TDD Mode: `strict`
- Every production edit requires a preceding failing owning test and separate RED/GREEN log under the run evidence tree.
- One behavior per RED test; use real backend state unless a pure helper is the actual owner.
- No provider network calls are required for automated tests.
- The historical reproduction harness remains evidence; durable regression coverage lives in owning Vitest suites.

## Playwright Plan (if applicable)

Not required for the core behavior because no navigation/layout redesign is planned. If control-models messaging cannot be fully verified through pure/unit tests, add one focused runtime-UI Playwright scenario for successful, blocked, and post-restart card truth; otherwise record the justified unit/API coverage and verify the rebuilt UI manually in Phase 5.

## Focused RED/GREEN Commands

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/configured-model-membership.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/remove-account-model.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/restart-rehydration.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/packaged-standalone-restart.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/lib/view-models.test.ts app/routes/control-models.test.ts
```

Final automated checks:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm run runtime:test-critical
corepack pnpm run runtime:package-sea
```

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

Use an isolated copied representative state root with synthetic/secret-safe credentials; do not mutate the user's active controller state.

1. Build/package the standalone runtime from this worktree and record executable hash/version/commit.
2. Seed or migrate representative state containing:
   - one account with two configured models;
   - matching endpoints and activations;
   - stale endpoint/activation for a non-configured model;
   - unaffected sibling account;
   - config-backed provider mappings;
   - one explicit blocking reference in a separate scenario.
3. Capture before-state: membership owner, accounts, mappings, bindings, endpoints, activations, inventory/cards/counts, reconciliation receipt.
4. Eject one sibling model through the real HTTP/UI path; verify structured receipt and remaining model routing.
5. Repeat the eject; verify idempotent success.
6. Restart the rebuilt standalone runtime twice; verify the model stays absent and stale evidence remains pruned.
7. Eject the last model in a separate account/config provider; verify deterministic account/provider removal.
8. Attempt a conflict-blocked eject; verify HTTP 409, reference path, `mutationApplied:false`, and byte/semantic-equivalent state.
9. Verify startup sanitization receipt and UI/API truth.
10. Prove an unaffected configured model still routes normally after restart.

## Idempotence and Recovery

- Reconciliation is set/key based and produces zero prunes after convergence.
- Repeated eject is a successful no-op plus cleanup of any newly discovered stale derived residue.
- Every config write, including ordinary `updateRuntimeConfig`, uses one shared global lock and same-directory temp-file-plus-rename replacement; YAML and manifest snapshots compensate cross-store failures.
- A process crash after one store changes is repaired on next startup from the authoritative owner and emits a reconciliation receipt.
- Corrupt operator intent remains degraded/blocked for mutation rather than being silently replaced.

## Gaps Found

None. The plan covers manual and config-backed ownership, conflicts, migration, UI/API truth, strict TDD, and rebuilt-runtime verification.

## Earlier Phase Reconciliation

- Requirements remain unchanged.
- Phase 1's competing-input matrix is resolved by explicit source ownership under one backend contract.
- RC1-RC5 each have a planned implementation and test slice detailed below.
- No addenda are required.

## Root-Cause-to-Execution Matrix

| Root cause | Production files | Owning RED/GREEN test and command | Phase 5 relevance |
| --- | --- | --- | --- |
| RC1 activation survives and is promoted | `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts` | `test/remove-account-model.test.ts`; run its focused Vitest command before and after exact activation pruning | eject then immediate inventory/API check |
| RC2 endpoint evidence is promoted | `role-model-router/apps/runtime-host-bridge/src/index.ts`, `src/configured-model-membership.ts` | `test/restart-rehydration.test.ts`; focused restart command before and after authority-led endpoint sanitation | seed stale endpoint, boot twice, prove zero resurrection |
| RC3 YAML mapping reapplies membership | `role-model-router/apps/runtime-host-bridge/src/index.ts`, `src/unified-runtime-config.ts` | `test/backend-unified-runtime-config.test.ts`; focused config command before and after mapping mutation/collision precedence | config-backed eject, reapply, restart twice |
| RC4 partial cross-store mutation | all three host source files above | account/config fault-injection cases in remove/config suites; each focused command captures RED then GREEN for every ordered boundary | conflict/failed mutation state snapshots and recovery receipt |
| RC5 no generic conflict preflight | `src/configured-model-membership.ts`, `src/index.ts` | conflict registry pure tests plus unchanged-state host tests in configured-membership/remove/config suites | real 409 with reference path and byte/semantic-equivalent state |

## Subagent Contribution Verification

- Reviewed Action Records:
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-02-to-be-plan-planner-attempt-01.md`
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-02-to-be-plan-planner-attempt-02.md`
- Main-Agent Verification Performed:
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/01-as-is.md`
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/01.5-root-cause.md`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`
  - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- Acceptance Decision: accepted
- Refresh Handling: regenerated the canonical bundle after each material repair and obtained a final hash-bound PASS.
- Repair Performed After Verification:
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/02-to-be-plan.md`

## Repair Work Performed

- Reserved matching `*.litellm` ids for YAML-owned membership and defined collision migration/non-resurrection.
- Replaced vague compensation with ordered SQLite rollback, JSON restoration, verification, and typed indeterminate outcomes.
- Added shared config serialization, atomic YAML replacement, crash/fault windows, and concurrent-update coverage.
- Added explicit RC1-RC5 execution traceability and normalized R1-R9 file/verification/QA paths.

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R2` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`, `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R3` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R4` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R5` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R6` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R7` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/configured-model-membership.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md`
- `R8` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/configured-model-membership.test.ts`, `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts` | Verification Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`, `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/04-test-summary.md` | QA Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/03-implementation-summary.md`
- `R9` | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/packaged-standalone-restart.test.ts`, `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md` | Verification Surface: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/05-manual-qa.md` | QA Surface: rebuilt standalone package, runtime APIs, real eject/restart, and remaining-model routing

## Traceability

- `R1`, `R7` -> canonical snapshot/key/owner/inspector contract (SP-A).
- `R2`, `R3`, `R5` -> authoritative mutation, sanitizer, and bootstrap filter (SP-B/SP-C).
- `R4` -> ownership-aware preflight and 409 diagnostics (SP-A/SP-C/SP-D).
- `R6` -> structured bridge/client/summary/view-model/page truth (SP-D).
- `R8` -> strict RED/GREEN evidence for every sub-phase.
- `R9` -> packaged test plus isolated rebuilt-runtime Phase 5 matrix.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `a4a33a525030fea037a4cfc52222fbeca83535b8`
- Comparison reference: `working-tree`
- Normalized baseline: `a4a33a525030fea037a4cfc52222fbeca83535b8`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only a4a33a525030fea037a4cfc52222fbeca83535b8`
- Expected product/worktree paths: exactly the host/UI source and test files listed in Planned Changes by File plus run evidence/artifacts.
- Tracked product diff at planning time: empty.
- Unexplained drift: none.

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] R1-R9 map to implementation, verification, and QA
- [x] RC1-RC5 map to ordered sub-phases
- [x] Authority, persistence, identity, conflict, rollback, migration, diagnostics, and restart behavior are explicit
- [x] Strict TDD and rebuilt-runtime gates are executable
- [x] Delegated planner audit passes

Coverage: PASS

## Approval Gate

- [x] Plan is self-contained and novice-executable
- [x] Sub-phases have independent RED/GREEN gates
- [x] Scope remains provider-agnostic and preserves unaffected lifecycle families
- [x] Audit passes

Approval: PASS
