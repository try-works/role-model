Run: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-17T10:29:58Z`
LockHash: `db6611a364ade4d7ed08db620c276dd3a280ffd9b9c7f5bcafb145772e7c1080`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md` (LOCKED)
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-worktree.md` (LOCKED)
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- relevant run 39, 47, 71, and 72 artifacts
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
Outputs:
- This file
Scope note: Record the current configured-model ownership, eject, rebuild, restart, conflict, and UI behavior before remediation.

## TODO

- [x] Re-read locked run inputs and relevant prior lifecycle runs
- [x] Trace account, endpoint, operator-intent, config, inventory, and UI data flow
- [x] Inspect the current eject mutation and restart repair behavior
- [x] Record the source-requirement inventory for R1-R9
- [x] Identify ownership gaps and missing tests
- [x] Complete delegated audit and repair loop
- [x] Lock the phase

## Audit Context

- Audit Execution Mode: `subagent`
- Subagent Availability: `available`
- Subagent Capability Probe: the Codex collaboration runtime exposes a read-only analyst slot for a bounded Phase 1 audit.
- Delegation Decision Basis: configured membership spans SQLite accounts/endpoints, a JSON operator-intent manifest, runtime YAML references, rebuild logic, and UI projections; an independent analyst pass is valuable once the canonical review bundle is generated.
- Delegation Override Reason: N/A
- Audit Inputs Provided: locked run inputs, relevant prior-run artifacts and memory, this draft, normalized diff basis, targeted source/test/UI paths, and R1-R9 coverage questions.

## Effective Inputs Re-read

- `00-requirements.md` fixes backend ownership and a single configured-membership contract, but deliberately leaves the owning persistence surface, reads, writes, and identity rules for Phase 2. It also requires authoritative and idempotent eject, stale-state sanitization, conflict handling, strict TDD, and rebuilt-runtime QA.
- `00-worktree.md` fixes the baseline at `a4a33a525030fea037a4cfc52222fbeca83535b8` and confines all work to the run-76 worktree.
- Run 39 introduced durable `operator-intent.remoteActivations` and endpoint rehydration.
- Run 47 expanded account repair and UI lifecycle surfaces.
- Run 71 hardened restart/bootstrap truth.
- Run 72 did not establish one canonical configured-membership contract; it did leave standalone YAML mappings authoritative for config-generated `*.litellm` account membership and routing references.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/39-runtime-session-rehydration-model-inventory/02-to-be-plan.md`: remote activations were intentionally persisted so endpoint state could be rehydrated after restart.
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`: account repair merged lifecycle evidence to recover missing model membership and bindings, while the plan intended SQLite endpoints to be authoritative and `operator-intent.remoteActivations` to be fallback-only when SQLite lacked activation state.
- `/.recursive/run/71-runtime-startup-lifecycle-and-health-truth-reconciliation/02-to-be-plan.md`: restart bootstrap made persisted state visible and deterministic.
- `/.recursive/run/72-standalone-runtime-config-authority-and-alias-rematerialization/02-to-be-plan.md`: standalone runtime config, provider mappings, and post-bootstrap alias rematerialization became explicit authorities for their own domains and are reapplied on startup.
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`: current domain memory confirms account, endpoint, alias, and routing lifecycle ownership surfaces.
- Combined consequence: individually useful recovery paths now compete with an operator's later eject intent because historical endpoint/activation evidence and config-derived provider mappings can expand or replace persisted account membership.

## Source Requirement Inventory

- `R1` | Disposition: `in-scope` | Source Quote: The runtime must expose one authoritative configured-model membership contract | Summary: current code treats account `allowedModels`, runtime-config LiteLLM mappings, endpoints, and activations as competing membership inputs; authority is therefore not exclusive | Owner: Phase 2 must choose the canonical persistence/read/write contract
- `R2` | Disposition: `in-scope` | Source Quote: `Eject from pool` must be an authoritative, atomic, idempotent lifecycle mutation | Summary: current eject removes account membership, bindings, and endpoints but not matching remote activations or config mappings, has no generic conflict preflight, deletes endpoints before account validation, and returns `success:false` on repeat | Owner: `removeProviderAccountModel()` plus config mutation/rollback contract
- `R3` | Disposition: `in-scope` | Source Quote: Restart, rebuild, and repair flows must not resurrect intentionally removed membership | Summary: repair unions endpoints and activations into non-empty `allowedModels`, bootstrap recreates endpoints from activations, and startup reapplication recreates runtime-config accounts from LiteLLM mappings | Owner: account repair, config apply, and bootstrap endpoint stage
- `R4` | Disposition: `in-scope` | Source Quote: Explicit conflicting references must be handled systematically and extensibly | Summary: controller, classifier, custom aliases, and LiteLLM mappings can explicitly reference the target model or endpoint, but eject performs no ownership-aware reference scan and exposes no conflict details | Owner: generic reference descriptors plus eject preflight
- `R5` | Disposition: `in-scope` | Source Quote: Legacy-state migration and sanitization must be first-class | Summary: current startup repairs stale endpoint/activation evidence toward membership and reapplies config mappings without reconciling an eject tombstone or equivalent authority | Owner: startup/config/read reconciliation
- `R6` | Disposition: `in-scope` | Source Quote: UI and API surfaces must remain consistent with the authoritative contract | Summary: UI refreshes after DELETE and renders account/lifecycle projections, but API returns only two booleans and startup sanitization/conflict diagnostics do not exist | Owner: bridge API, lifecycle summary, runtime API client, view models, and control-models route
- `R7` | Disposition: `in-scope` | Source Quote: The contract must be future-proof and extensible | Summary: current mutation is provider-agnostic, but reference ownership and cleanup are embedded ad hoc rather than exposed through a generic lifecycle contract | Owner: host-bridge lifecycle helpers/types
- `R8` | Disposition: `in-scope` | Source Quote: strict TDD with owning regression coverage | Summary: two existing tests cover sibling preservation and last-model deletion only; repeat eject, stale activations/endpoints, conflicts, migration, sibling accounts, and local wildcard controls are missing | Owner: owning host test suites
- `R9` | Disposition: `in-scope` | Source Quote: rebuilt standalone runtime end to end | Summary: no run-76 rebuilt-runtime evidence exists yet; current baseline is source build plus focused unit/integration tests | Owner: Phase 5 evidence

## Current Behavior by Requirement

The sections below cover R1-R9 across authority, mutation, rebuild/restart, conflicts, UI/API projection, automated coverage, and rebuilt-runtime evidence.

## Current Authority and Derivation Matrix

| Surface | Persistence | Current effective authority | Current problem |
| --- | --- | --- | --- |
| provider account `allowedModels` | SQLite | nominal configured membership | expanded by endpoint/activation repair, so not exclusive |
| `modelRoleBindings` | SQLite account record | configured role intent | can be reconstructed from activation bindings |
| LiteLLM `modelMappings` | standalone runtime YAML | config-owned configured membership for `*.litellm` accounts | reapplied into generated accounts on config apply/startup, independently resurrecting an ejected mapping |
| runtime endpoint rows | SQLite | execution/readiness state | treated as evidence that can add membership |
| `operator-intent.remoteActivations` | JSON manifest | durable endpoint rehydration intent | not pruned by eject and treated as membership evidence |
| controller/classifier/custom aliases | standalone runtime YAML | explicit user-authored routing references | not checked before eject |
| merged inventory/UI cards | in-memory/API projection | derived | inherits whichever upstream surface won the last rebuild |
| health/readiness | SQLite/in-memory | derived/advisory | may retain residue for removed endpoints |

## Current Mutation Behavior

`removeProviderAccountModel()` at `src/index.ts:22226-22292`:

1. refuses local-peer account ids;
2. finds the in-memory account;
3. filters the model from `allowedModels` and `modelRoleBindings`;
4. detects a matching runtime endpoint;
5. deletes matching endpoint rows;
6. deletes the account if no models remain, otherwise upserts the filtered account;
7. calls `rebuildCurrentState()`;
8. returns `{success, removedAccount}`.

Missing behavior:

- matching `remoteActivations` are never removed;
- config-owned references are never preflighted;
- repeat eject is reported as unsuccessful rather than an idempotent converged result;
- writes span multiple stores without an explicit rollback contract;
- endpoints are deleted before the surviving account is validated/upserted, so a later validation failure can leave partial mutation;
- diagnostics do not say what was pruned, sanitized, blocked, or left unchanged.

## Current Rebuild and Restart Behavior

- `rebuildCurrentState()` calls `readCurrentAccounts()` before reading endpoints.
- `readCurrentAccounts()` calls `repairPersistedProviderAccountsFromRuntimeState()`.
- That repair collects every persisted endpoint and remote activation into `requiredModelsByAccountId`.
- For every account with at least one allowed model, it writes the union of `account.allowedModels` and those required models back to SQLite (`src/index.ts:15522-15644`).
- The bootstrap endpoints stage iterates every remote activation and recreates a missing endpoint (`src/index.ts:24106-24151`).

This produces the manual-account resurrection cycle:

`eject account membership + endpoint` -> `stale activation survives` -> `rebuild unions activation model into allowedModels` -> `bootstrap recreates endpoint` -> UI inventory shows the model again.

Stale endpoint rows can trigger the same union even without an activation. The repair direction is inverted relative to the new requirement: derived evidence repairs authority instead of authority sanitizing derived evidence.

There is a second independent resurrection path for runtime-config-backed accounts:

- `createUnifiedProviderAccounts()` maps every LiteLLM provider mapping to account `allowedModels` (`src/index.ts:5065-5150`);
- `mergeRuntimeConfigProviderAccount()` unions manual/persisted and config-derived models (`src/index.ts:5895-5923`);
- `applyUnifiedRuntimeConfigState()` deletes and re-persists config accounts from those mappings (`src/index.ts:17362-17389`);
- startup calls that apply path again (`src/index.ts:17453-17455`).

Therefore an eject from a `*.litellm` account cannot be durable unless the canonical contract either mutates the YAML mapping or records a higher-precedence membership decision that config application respects. Phase 2 must choose that contract; Phase 1 does not preselect SQLite.

## Current Conflict Behavior

Explicit runtime YAML references include:

- `controller.modelId` and `controller.endpointId`;
- `difficultyClassifier.modelId` and `difficultyClassifier.endpointId`;
- custom `modelAliases[].modelIds`.
- LiteLLM provider `modelMappings[].modelId`, which currently generates configured membership rather than merely referencing it.

They are user-authored routing intent. Eject neither blocks nor reports them. Primary/generated aliases are backend-owned and may be rematerialized, so they require classification separate from custom aliases. There is no common reference descriptor or checker extension point today.

## UI and API Behavior

- `control-models.tsx:621-655` invokes DELETE, refreshes all model state, and reports whether the last account was removed.
- The client contract in `runtime-api.ts:1887-1900` exposes only `{success, removedAccount}`.
- The bridge HTTP route maps all thrown failures to a generic HTTP 400 `{error}`.
- Backend lifecycle records copy repaired account membership into `configuredModelIds` (`src/index.ts:15930-16031`).
- UI lifecycle rows prefer account `allowedModels` and fall back to lifecycle `configuredModelIds` (`runtime-ui/app/lib/view-models.ts:427-498`).
- Provider rollups derive `configuredModels` from account `allowedModels` (`view-models.ts:1454-1519`). Once repair or config reapply rewrites the account, the resurrected model is indistinguishable from intentionally configured membership across cards, counts, and lifecycle surfaces.
- No structured conflict, pruned-reference, sanitization, or idempotence outcome reaches the operator.
- Maintenance-only credential, archived residue, and configured membership are not represented by a distinct eject/sanitization result contract.

## Existing Test Coverage and Gaps

Current owning coverage:

- sibling models/bindings/endpoints preserved after eject;
- last configured model deletes its account and endpoints;
- restart suite includes legacy endpoint-driven Kimi model drift repair;
- restart suite includes local peer wildcard normalization.

Missing run-76 RED coverage:

- matching remote activation pruned on eject;
- stale activation cannot re-add membership after rebuild/restart;
- stale endpoint cannot re-add membership;
- repeated eject converges idempotently;
- config reference conflicts block before mutation and identify the reference;
- startup sanitizes legacy stale endpoint/activation evidence while preserving configured models and sibling accounts;
- account-plus-model identity prevents cross-account pruning;
- existing local wildcard behavior remains unchanged;
- runtime-config-backed account eject and restart/config-reapply behavior;
- rebuilt standalone executable preserves the same behavior.

## Relevant Code Pointers

- `src/index.ts:15522-15644`: derived endpoint/activation evidence expands account membership.
- `src/index.ts:5065-5150`, `:5895-5923`, `:17362-17455`: YAML mappings generate, merge, and reapply runtime-config account membership.
- `src/index.ts:15930-16031`: lifecycle summaries derive configured ids from repaired accounts.
- `src/index.ts:16377-16404`: every rebuild invokes that repair.
- `src/index.ts:22226-22292`: incomplete eject mutation.
- `src/index.ts:24106-24151`: bootstrap replays all remote activations.
- `src/operator-intent.ts`: atomic file replacement and endpoint-id-only activation removal helper.
- `src/unified-runtime-config.ts:70-92`: alias, classifier, and controller reference types.
- `test/remove-account-model.test.ts`: only two happy-path deletion tests.
- `test/restart-rehydration.test.ts:1323+`: test that currently codifies endpoint evidence expanding account membership.
- `runtime-ui/app/routes/control-models.tsx:621-655`: immediate refresh and limited success/error messaging.
- `runtime-ui/app/lib/view-models.ts:427-498`, `:1454-1519`: account/lifecycle rows and provider counts project configured membership.

## Known Unknowns

- Whether explicit config conflict reporting should use only a thrown typed error or also a richer success payload; Phase 2 must choose one stable API contract.
- Whether the canonical authority mutates runtime YAML mappings directly or introduces a higher-precedence backend membership/tombstone store; Phase 2 must decide using the required ownership matrix.
- Whether the current SQLite helpers can provide a single transaction across account and endpoint mutation; the JSON manifest and runtime YAML necessarily require explicit rollback/compensation even if SQLite work is transactional.
- Which aliases are generated backend-owned aliases versus custom user-authored aliases at eject time; the existing primary-alias identification helpers must be reused rather than duplicating string rules.

## Evidence

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/evidence/review-bundles/phase-01-as-is-analyst.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-01-as-is-analyst-attempt-01.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-01-as-is-analyst-attempt-02.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-01-as-is-analyst-attempt-03.md`

## Reproduction Steps (Novice-Runnable)

1. Configure an account with two remote models and activate both so account rows, endpoint rows, and `remoteActivations` exist.
2. Eject one model through DELETE.
3. Observe that the account and endpoint are initially removed but the matching activation remains in `operator-intent.json`.
4. Trigger a rebuild or restart bootstrap.
5. Observe `repairPersistedProviderAccountsFromRuntimeState()` re-add the model to `allowedModels`; bootstrap can recreate the endpoint; the UI shows the model again.

The baseline suites pass because they do not seed or assert remote activation cleanup.

## Gaps Found

None. Phase 1 identified no analysis gaps; all current-state defects are mapped above and remain implementation work for later phases. Phase 1.5 must confirm the causal chain with a minimal deterministic reproduction before Phase 2.

## Earlier Phase Reconciliation

- The requirements and worktree diff basis remain valid.
- No run-76 addenda exist.
- No production or test source has changed during Phase 1.

## Subagent Contribution Verification

- Reviewed Action Records:
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-01-as-is-analyst-attempt-01.md`
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-01-as-is-analyst-attempt-02.md`
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/subagents/phase-01-as-is-analyst-attempt-03.md`
- Main-Agent Verification Performed:
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`
  - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/evidence/review-bundles/phase-01-as-is-analyst.md`
  - `git status --short --untracked-files=all`
- Acceptance Decision: accepted
- Refresh Handling: the review bundle was refreshed after each material repair; the final semantic audit matched the bundled draft, and the controller then applied only lock-tool-required heading/path normalization.
- Repair Performed After Verification:
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/01-as-is.md`
  - `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/evidence/review-bundles/phase-01-as-is-analyst.md`

## Repair Work Performed

- None yet; Phase 1 is analytical only.

## Requirement Completion Status

- `R1` | Status: `blocked` | Rationale: account rows, YAML mappings, endpoints, and activations currently compete; Phase 2 must select the canonical contract | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R2` | Status: `blocked` | Rationale: eject omits activation/config cleanup, conflict preflight, idempotent success, and rollback semantics and can delete endpoints before validation fails | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R3` | Status: `blocked` | Rationale: rebuild, config reapply, and restart explicitly preserve multiple resurrection paths | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R4` | Status: `blocked` | Rationale: explicit YAML references and mapping ownership are not inspected | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `R5` | Status: `blocked` | Rationale: no authority-led legacy or config reconciliation exists | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R6` | Status: `blocked` | Rationale: API, lifecycle summary, and UI projections expose insufficient lifecycle diagnostics | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `R7` | Status: `blocked` | Rationale: provider-agnostic basics exist but no extensible reference contract exists | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R8` | Status: `blocked` | Rationale: owning regression matrix lacks manual and runtime-config resurrection cases | Blocking Evidence: `role-model-router/apps/runtime-host-bridge/test/remove-account-model.test.ts`, `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`
- `R9` | Status: `blocked` | Rationale: rebuilt-runtime proof has not run | Blocking Evidence: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`

## Traceability

- `R1`, `R3`, `R5` -> runtime-config account generation/apply, account repair, rebuild, and bootstrap data flow.
- `R2` -> current eject method and cross-store mutation omissions.
- `R4`, `R7` -> unified config reference surfaces and missing generic preflight.
- `R6` -> bridge/client/lifecycle/view-model/UI response and projection behavior.
- `R8` -> owning host test gaps.
- `R9` -> required later packaged-runtime QA.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `a4a33a525030fea037a4cfc52222fbeca83535b8`
- Comparison reference: `working-tree`
- Normalized baseline: `a4a33a525030fea037a4cfc52222fbeca83535b8`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only a4a33a525030fea037a4cfc52222fbeca83535b8`
- Tracked product diff: empty; no production or test source changed in Phase 1.
- Phase-owned untracked artifacts: `01-as-is.md`, its review bundle, and its subagent action record; prerequisite requirements/worktree artifacts and receipts are also untracked because the run was copied into a new worktree.
- Unexplained drift: none after distinguishing product diff from run-local untracked control artifacts.

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] R1-R9 are mapped to current code and behavior
- [x] Authority, mutation, restart, conflict, migration, UI, test, and QA gaps are explicit
- [x] Prior-run design intent is reconciled
- [x] Delegated audit passes after two repair cycles

Coverage: PASS

## Approval Gate

- [x] The AS-IS causal chain is concrete enough for Phase 1.5 reproduction
- [x] Audit passes

Approval: PASS
