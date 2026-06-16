Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-15T15:32:00Z`
LockHash: `9215518d6c04ac949dd94d0a7d1f87460c9039909d052f6249a63d686280ec8f`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- Prior related runs:
  - `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/00-requirements.md`
  - `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
  - `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
  - `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md`
- Current audited code surfaces:
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts`
  - `role-model-router/apps/runtime-host-bridge/src/credential-ref-env.ts`
  - `role-model-router/packages/sqlite-memory/src/index.ts`
  - `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx`
  - `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- User guidance:
  - `User input: "the behavior i want is that the user only needs to set up endpoints and models once and they are persisted, whether local, oauth or api key."`
  - `User input: "remote endpoints should also have the option to update api key, or to re-auth oauth if it has expired. add this to the proposal. should be part of the ui"`
  - `User input: "re-auth should just be clicking a button, and updating api key should bring up a model and allow inputting api key and save / cancel"`
  - `User input: "you shouldnt be specifically targetting moonshot or kimi, this proposal should be endpoint and model agnostic. make sure that that is the case."`
  - `User input: "the frontend should be changed by first updating the design system, then implementing the changes made to the design system."`
  - `User input: "approved. lets start the run. make sure you follow the recursive workflow. the implementation should be done in a worktree"`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
Scope note: Define a provider/model-agnostic runtime persistence and rehydration contract so local endpoints, remote OAuth accounts, remote API-key accounts, endpoint activations, and readiness UI survive restart cleanly without stale onboarding state or misleading provider-level status.

# Runtime Persistence, Rehydration, and Credential Lifecycle

## TODO

- [x] Create new recursive run scaffold
- [x] Convert audit findings and approved proposal into concrete `R#` requirements
- [x] Record provider/model-agnostic invariants
- [x] Record verification discipline for backend, UI, restart, and packaged runtime proof
- [x] Record out-of-scope boundaries and constraints
- [x] User approval of this requirements artifact (approved in chat before run start)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist
- [x] Lock `00-requirements.md`

## Source Requirement Inventory

| Source | What it contributes |
| --- | --- |
| Run `06` | Provider-account and SQLite persistence foundations |
| Run `17` | OAuth account/token continuity and auth-mode generalization |
| Run `35` | Connect-route UI expectations and decluttered operator flows |
| Run `39` | Restart rehydration and bootstrap continuity baseline |
| Current audit | Root cause: stale transient auth state can survive forever and poison readiness after restart |
| User guidance | One-time setup persistence, endpoint/model agnosticism, in-place re-auth, in-place API-key update UX |

## Problem Summary

The runtime currently persists several pieces of operator setup, but it does not treat persistence ownership, startup reconciliation, readiness, and maintenance actions as one coherent lifecycle. As a result, stale transient OAuth rows can survive restart, provider-level readiness can look incomplete even when a specific account is ready, API-key persistence semantics are implicit, and operators cannot reliably maintain remote credentials in place.

This run must make the system systematic: operators configure local or remote execution accounts once, restart the runtime, and see truthful account-scoped status with direct maintenance actions instead of stale onboarding noise or forced re-onboarding.

## Observed Gaps

| Gap | Current behavior | Required correction |
| --- | --- | --- |
| `G1` stale transient auth | Expired or legacy pending device-auth rows can survive restart and continue to count as active onboarding | Bootstrap reconciliation must reclassify/archive them so they stop poisoning readiness |
| `G2` misleading provider rollups | A stale sibling account can make a provider/group look incomplete even when one account is ready | Readiness must be computed account-first, with provider/group summaries derived secondarily |
| `G3` implicit API-key persistence | API-key accounts can silently switch between env-backed and persisted-local behavior based on user input shape | Storage mode must be explicit in both backend contract and UI |
| `G4` missing in-place repair UX | Operators cannot systematically repair expired OAuth or replace API keys in place | Existing accounts need direct **Reconnect** and **Update API key** maintenance actions |
| `G5` restart continuity gaps | Durable config, activation/load intent, credentials, and derived readiness are not treated as one lifecycle | Startup must reconcile, rehydrate, and explain state across all supported account families |
| `G6` legacy-state ambiguity | Older persisted rows/files can linger without a clear migration or archival policy | Migration, archival, corruption handling, and repeated-start idempotence must be explicit |
| `G7` frontend governance drift | Route/page changes can be made without first updating the design-system contract | Frontend changes must update `DESIGN_SYSTEM.md` first, then implement the documented UI contract |
| `G8` bootstrap-order ambiguity | Restart behavior can vary when hydration, reconciliation, restore, probing, and summary publication are not defined as one ordered pipeline | Phase 2 must define an ordered bootstrap pipeline with partial-failure isolation |
| `G9` repair mutation ambiguity | Reconnect/update-key flows could accidentally create new accounts, drift bindings, or partially overwrite durable state | Backend repair actions must target existing account identity and be atomic, idempotent, and secret-safe |
| `G10` local-family proof drift | Verification can prove only one local path and miss another supported local family | Phase 5 must explicitly state which local families are covered and why |
| `G11` backend-owned lifecycle gap | Backend exposes aggregate readiness counts, but UI still re-derives provider/account posture independently across multiple surfaces | Backend must publish canonical account lifecycle records and provider rollups that all readiness surfaces consume |
| `G12` bootstrap-authority ambiguity | Bootstrap mutates state asynchronously, so summaries can be observed before the runtime is fully authoritative | APIs must distinguish provisional bootstrap state from authoritative post-bootstrap state |
| `G13` credential-backend naming drift | Legacy and canonical credential backend names both remain in execution and UI-adjacent paths | Backward-read compatibility must remain, but write/display behavior must normalize to one canonical backend name |
| `G14` cross-source identity ambiguity | Runtime-config and manual accounts can represent overlapping logical accounts without an explicit merge/collision contract | Phase 2 must define logical-account identity, duplicate handling, and deterministic merges for allowed models and bindings |

## Fixed Guidance

1. **Provider/model agnostic first.** Lifecycle, persistence, reconciliation, readiness, and maintenance flows must not special-case Moonshot, Kimi, or any other single provider/model family. Provider-specific details are limited to declarative metadata such as auth endpoints, required headers, env var names, and model catalogs.
2. **Execution account is the primary unit.** Readiness and maintenance are account-scoped first, with provider/group rollups derived secondarily.
3. **Durable intent and transient workflow state must be separated.** Persisted accounts, credentials, endpoints, local peers, and operator intent are durable. Device-authorization sessions and similar onboarding workflows are transient and must not masquerade as durable readiness.
4. **Maintenance is in place, not destructive.** Re-auth and API-key update actions must repair an existing configured account/endpoint without forcing the operator to recreate it or lose bindings.
5. **Restart must be first-class.** The packaged runtime, not only dev-time browser flows, is the authoritative verification target.
6. **Frontend contract before frontend implementation.** Any runtime UI changes required by this run must first update `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`, then implement route/component changes that conform to that updated contract.
7. **Prior run guarantees remain in force unless explicitly superseded.** This run extends the persistence, OAuth continuity, Connect-surface, and restart work already established by runs `06`, `17`, `35`, and `39`; it must not silently regress them.
8. **Repair and restart paths must be crash-safe.** Credential maintenance and startup reconciliation must preserve last-known-good state or fail with explicit diagnostics instead of leaving mixed partial state.
9. **Backend owns lifecycle/readiness truth.** Operator UI surfaces may present, filter, and group canonical readiness data, but they must not invent separate lifecycle semantics from raw account/session/endpoint fields.
10. **All readiness-consuming UI surfaces move together.** Connect/Endpoints is not the only surface in scope; any route that shows readiness or execution posture must adopt the canonical model in the same run.
11. **Cross-source identity and normalization are first-class.** Manual accounts, runtime-config accounts, legacy credential references, and canonical credential backends must reconcile under explicit rules rather than implicit heuristics.
12. **Strict TDD applies to the entire run.** Every production change delivered by this run must be justified by explicit RED then GREEN evidence in Phase 3 unless an approved exception addendum states otherwise.
13. **Phase 5 verification is real rebuilt-runtime proof.** Verification is only complete after rebuilding the runtime package, launching that rebuilt packaged runtime, and exercising every changed behavior class end to end against it.

## Canonical Domain Decisions

### D1 - Canonical persistence ownership

Phase 2 must define and then implement one canonical contract for the following categories:

- **Durable execution-account config**: provider/account identity, auth mode, allowed models, role bindings, endpoint-facing metadata
- **Durable credentials**: OAuth token material, persisted local API keys, env-backed API-key references
- **Durable activation/load intent**: remote endpoint activations, local peer registrations, local loaded-model intent where applicable
- **Transient onboarding state**: pending device-auth/session state, expiry windows, verification URLs, polling metadata
- **Derived runtime state**: computed readiness, health, lifecycle status, stale/archived markers, bootstrap diagnostics

### D2 - Lifecycle state machine

Phase 2 must formalize a generic account lifecycle state machine. The minimum vocabulary is:

- `execution-ready`
- `connected-no-endpoint`
- `pending-authorization`
- `expired-auth`
- `credentials-missing`
- `env-unresolved`
- `archived-stale`

Phase 2 may add finer-grained internal substates, but these operator-facing states are the minimum required surface.

### D3 - Archived stale state is non-blocking by default

Legacy or expired transient state may remain inspectable for diagnostics, but it must not count as active pending onboarding, degrade unrelated ready accounts, or force manual DB/file cleanup.

### D4 - Source-of-truth and conflict-resolution matrix is mandatory

Phase 2 must produce a matrix covering, at minimum, each persistence surface's:

- store/path
- owning subsystem
- durable vs transient class
- read path
- write path
- startup reconciliation role
- conflict-precedence order
- corruption/missing-data repair behavior

### D5 - Lifecycle transitions must be explicit

Phase 2 must define transitions for each operator-facing lifecycle state, including:

- entry conditions
- exit conditions
- blocking/non-blocking semantics
- whether the state contributes to readiness badges
- visible repair actions
- default UI visibility rules

### D6 - Archived-state policy must be explicit

Phase 2 must decide and document:

- archive vs hard-delete default
- when archival occurs
- where archived state remains inspectable
- whether operators can dismiss or remove archived entries
- which operator surfaces show archived state by default

### D7 - Ordered bootstrap pipeline and partial-failure isolation are mandatory

Phase 2 must define a server-side bootstrap pipeline with:

- explicit stage order
- per-stage success/failure reporting
- partial-failure isolation so one broken account does not block unrelated ready accounts
- a clear point at which runtime summaries become authoritative

### D8 - Mutation atomicity and identity stability are mandatory

Phase 2 must define how reconnect/update-key and related persistence writes preserve:

- stable account identity
- stable bindings/endpoint associations unless intentionally changed
- atomic commit semantics or explicit rollback behavior
- secret redaction in logs, summaries, and error surfaces

### D9 - Backend-owned lifecycle/readiness API is mandatory

Phase 2 must define one canonical backend contract that publishes, at minimum:

- per-account lifecycle records
- provider/group rollups derived from those records
- aggregate readiness counts derived from the same records
- bootstrap authority state indicating whether the view is provisional or authoritative

### D10 - Canonical credential-backend normalization is mandatory

Phase 2 must define one canonical credential-backend vocabulary for write/display behavior while preserving backward-read compatibility for legacy persisted data.

### D11 - Logical-account identity and merge rules are mandatory

Phase 2 must define:

- logical-account identity across manual and runtime-config sources
- duplicate/collision behavior
- deterministic merge rules for `allowedModels` and `modelRoleBindings`
- how the canonical backend API reports source provenance when multiple persistence sources contribute to one logical account

## Phase 5 Verification Baseline

Phase 5 verification must use a representative baseline that covers the lifecycle classes this run claims to repair.

| Fixture | Minimum baseline |
| --- | --- |
| `L1` local ready fixture | One persisted local endpoint/model setup with at least one bound role and expected post-restart visibility |
| `L2` secondary local-family fixture | Because the repo currently carries both peer and llama-swap operator-intent restore paths, Phase 2 must explicitly mark each family as in-scope with restart proof or deferred with rationale; Phase 5 verifies the second family when in scope |
| `O1` remote OAuth ready fixture | One configured OAuth-backed remote account with durable token material, one activated endpoint/model, and expected post-restart readiness |
| `K1` remote API-key ready fixture | One configured API-key-backed remote account with explicit storage mode, one activated endpoint/model, and expected post-restart readiness |
| `S1` stale-state fixture | One legacy/expired transient or orphaned persistence case proving stale state no longer blocks unrelated ready accounts |

Minimum Phase 5 assertions after rebuild and packaged-runtime launch:

1. The rebuilt packaged runtime starts successfully and exposes the expected runtime APIs.
2. `L1`, `O1`, and `K1` appear with truthful lifecycle state after startup.
3. `S1` is archived, ignored, or otherwise rendered non-blocking per the documented policy.
4. No fixture requires recreating the account/endpoint/model setup after restart.
5. UI surfaces and API summaries agree on readiness/lifecycle state for the same fixtures.
6. `O1` reconnect and `K1` API-key maintenance can repair the existing account in place without changing account identity or losing bindings.
7. If `L2` is in scope, its durable restore behavior is also proven after restart.
8. The canonical readiness API reports whether the snapshot is provisional or authoritative during and after bootstrap.
9. Every readiness-consuming UI surface in scope reflects the same canonical lifecycle state for the same fixtures.
10. `/api/role-model/runtime/summary` and `/healthz` expose aligned bootstrap authority semantics and do not present contradictory runtime posture for the same session.
11. Phase 5 exercises every changed behavior class introduced by the run end to end against the rebuilt packaged runtime, including lifecycle/readiness APIs, readiness UI surfaces, reconnect/update-key flows, migration/sanitization behavior, diagnostics, and restart continuity.
12. At least one non-Connect readiness consumer and one maintenance UI path are verified live against the rebuilt packaged runtime.

## Verification Discipline

| Layer | Requirement |
| --- | --- |
| Phase 3 | `TDD Mode: strict`; every production change in the run requires explicit RED then GREEN evidence before it is accepted |
| Package tests | Existing relevant package suites must pass after implementation |
| Phase 5 packaged-runtime verification | Rebuild the runtime package, launch the rebuilt packaged runtime, and perform Phase 5 verification against that launched runtime |
| Restart drill | After rebuild and launch in Phase 5, must prove persisted local + remote configuration survives full runtime restart without re-onboarding |
| Browser QA | After rebuild and packaged-runtime launch, verify Connect/Providers plus at least one non-Connect readiness consumer in a live browser |
| Phase 5 end-to-end sweep | After rebuild and packaged-runtime launch, verify every changed behavior class introduced by the run end to end |
| Packaged runtime proof | Verification is not complete until the rebuilt packaged runtime has been launched and exercised, not only unit tests |

`QA Execution Mode` for the eventual Phase 5 should be **hybrid**: agent-operated restart/build/browser proof plus user-observable artifacts where useful.

## Requirements

### `R0` Provider/model-agnostic lifecycle architecture

Description:
The implementation must be generic across endpoint types, remote providers, auth methods already supported by the runtime, and model families.

Acceptance criteria:
- No lifecycle, readiness, reconciliation, or credential-maintenance logic keys behavior off a single provider/model id unless the behavior is supplied by declarative metadata.
- Remote OAuth and remote API-key flows use the same generic account lifecycle framework even when provider metadata differs.
- Tests cover provider-neutral behavior and do not prove correctness only with a single hard-coded provider fixture.
- Requirement language, API shapes, diagnostics, and UI copy remain account/endpoint oriented rather than provider-brand specific.

### `R1` Canonical durable vs transient persistence contract

Description:
Define and enforce one canonical ownership model for persisted runtime state so restart behavior is reconstructible and no store silently doubles as something else.

Acceptance criteria:
- Phase 2 names the authoritative store for each category in `D1` and records conflict-resolution order when more than one source exists.
- Phase 2 records the `D4` source-of-truth matrix with store, owner, durability class, read path, write path, precedence, and corruption-repair fields.
- Device-authorization session rows are treated as transient onboarding state, not as durable credential readiness.
- Runtime startup rebuilds derived readiness from durable account/credential/endpoint state rather than trusting raw transient rows.
- API-key storage semantics are explicit: env-backed reference and persisted local key are distinct modes with distinct persistence and readiness meaning.

### `R2` Startup reconciliation and stale-state sanitization

Description:
On every runtime start, reconcile durable state with transient onboarding state and sanitize stale legacy artifacts automatically.

Acceptance criteria:
- Expired pending device-auth sessions are reclassified, archived, or otherwise made non-blocking during bootstrap.
- Orphan transient sessions, orphan credential files, and orphan account records are detected and handled according to a documented policy.
- Legacy earlier-version state that no longer represents a usable configured account does not surface as active pending onboarding.
- Reconciliation emits structured diagnostics summarizing what was rehydrated, archived, ignored, or needs operator repair.
- Reconciliation is idempotent across repeated runtime starts.
- No manual SQLite or credential-file cleanup is required to clear stale readiness for normal legacy-upgrade cases.
- Reconciliation follows the explicit ordered bootstrap pipeline required by `D7`.

### `R3` Generic account lifecycle and readiness computation

Description:
Replace ambiguous provider-level readiness with an explicit account lifecycle model and derived provider summaries.

Acceptance criteria:
- Every configured execution account resolves to one operator-facing lifecycle state from `D2`.
- The lifecycle model is produced by a canonical backend mapping layer that explicitly translates raw `status`, `healthStatus`, `rotationState`, pending device-auth state, and endpoint activation into one lifecycle outcome.
- Phase 2 defines the `D5` transition table for lifecycle entry, exit, blocking semantics, badge participation, visible repair actions, and default UI visibility.
- Readiness summaries are computed account-first, then rolled up to provider/group summaries without allowing a stale sibling account to make a ready account appear incomplete.
- `archived-stale` and expired transient state do not count toward active pending onboarding badges.
- The backend publishes first-class account lifecycle records, derived provider/group rollups, and aggregate readiness counts through the canonical contract required by `D9`.
- The runtime summary surface records counts by lifecycle state and enough identifiers/reason codes to explain each non-ready account.

### `R4` Canonical readiness across runtime UI surfaces

Description:
All readiness-consuming runtime UI surfaces must consume the canonical backend lifecycle/readiness contract and present consistent account/endpoint status.

Acceptance criteria:
- The implementation covers Connect/Endpoints/Providers plus any other readiness-consuming routes in the current runtime UI surface, including `runtime.tsx`, `session-readiness.tsx`, `workbench.tsx`, and `studio-advanced.tsx`, unless a route is explicitly deferred in Phase 2 with rationale.
- A ready account/model can display as ready even when a sibling legacy account for the same provider is archived or needs repair.
- Provider/group summaries are secondary rollups; the UI exposes the concrete account/endpoint row that needs attention.
- Readiness indicators are sourced from the canonical backend lifecycle/readiness contract, not raw stale transient counts or client-side re-derivation of lifecycle semantics.
- If changed readiness fields also affect other runtime summary consumers, including control/benchmark surfaces or validation harnesses, those consumers are updated in the same run or explicitly deferred in Phase 2 with rationale.
- Archived or stale legacy entries are hidden by default or visually separated so they do not read like current setup blockers.
- If this run changes runtime UI components, page layouts, action placement, lifecycle indicators, or maintenance modals, `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` is updated first and the route/component implementation follows that updated contract.
- UI artifacts in Phase 3/5 must cite the design-system change that authorized the implementation shape.

### `R5` In-place remote credential maintenance UX

Description:
Operators must be able to repair remote credentials directly from the UI without recreating accounts or endpoints.

Acceptance criteria:
- OAuth-backed remote accounts expose a **Reconnect** action that starts re-auth for the existing account with one click.
- API-key-backed remote accounts expose an **Update API key** action that opens a modal, allows key entry, and supports **Save** and **Cancel**.
- Maintenance actions preserve provider account identity, model selections, bindings, endpoint associations, and durable intent unless the operator explicitly changes them.
- Expired/invalid credentials transition the account into a repairable lifecycle state instead of a misleading generic pending state.
- The UI makes it clear whether the operator is reconnecting an account or updating a stored key, not creating a brand-new account.
- The API-key update modal defines and handles idle, editing, saving, success, and error states.
- Existing secret values are never echoed back in UI fields or summaries.
- Successful reconnect/update flows refresh both backend summary state and visible UI state without requiring full manual re-onboarding.
- The UI repair flows call explicit backend repair operations or an equally explicit mutation contract for reconnecting OAuth and updating API keys; they do not rely on unspecified generic upsert side effects.

### `R6` Explicit API-key storage mode and credential-backend normalization contract

Description:
The runtime must stop relying on implicit "paste something and infer the backend" behavior for persisted API-key accounts and must normalize legacy credential-backend naming.

Acceptance criteria:
- The account/config surface distinguishes at least two API-key modes: persisted local key and env-backed reference.
- The persisted mode survives restart with no extra operator action.
- The env-backed mode survives restart only when the referenced env var resolves; unresolved env-backed accounts surface as `env-unresolved` or equivalent.
- Backend and UI agree on the storage mode and show truthful maintenance affordances for each mode.
- Migration/backward-compat logic handles pre-existing implicitly-created API-key accounts.
- Legacy persisted credential backends such as `local-encrypted-file` remain readable, but canonical write behavior and operator-visible display normalize to one backend name.
- UI surfaces do not expose legacy backend names as if they were current operator choices.

### `R7` End-to-end restart rehydration contract

Description:
A fully configured local or remote account should not require the operator to repeat setup after runtime restart.

Acceptance criteria:
- Local peer definitions, local loaded-model intent, remote provider accounts, remote credential material, and remote endpoint activations all rehydrate from their canonical durable stores.
- Restarted runtime restores truthful endpoint/model availability without requiring the operator to revisit Providers just to finish normal startup.
- Remote OAuth accounts with valid durable token material rehydrate as ready after restart.
- Remote API-key accounts with valid persisted-local keys rehydrate as ready after restart.
- Local and remote accounts that cannot be made ready after restart surface a specific lifecycle state and repair reason instead of disappearing silently.
- Phase 5 verification uses the `L1`, `L2` (when in scope), `O1`, `K1`, and `S1` baseline fixtures defined in this artifact.
- Phase 5 explicitly states whether peer and llama-swap are each in scope for restart proof and, if not, why they are deferred.

### `R8` Bootstrap observability and repair diagnostics

Description:
Runtime startup must explain what it did and what still needs repair.

Acceptance criteria:
- Bootstrap records ordered stage results for hydration, reconciliation, activation/load restore, and readiness derivation.
- Bootstrap stage ordering is explicit, at minimum covering durable state load, transient reconciliation, credential hydrate/refresh, activation/load restore, health checks if applicable, and summary publication, or a documented equivalent.
- Failure in one account/bootstrap branch does not prevent unrelated valid accounts from reaching `execution-ready`.
- Runtime summary or dedicated diagnostics APIs expose per-account lifecycle state, repair reason codes, and bootstrap authority state distinguishing provisional snapshots from authoritative post-bootstrap snapshots.
- `/healthz` and runtime summary expose aligned bootstrap authority semantics; if one surface is provisional, the relationship to authoritative state is explicit and non-contradictory.
- Bootstrap polling/refresh/reconciliation work reports attempted, succeeded, failed, skipped, or equivalent bounded accounting instead of silently swallowing failures.
- Bootstrap retry and polling limits are documented and surfaced; bounded retries are allowed, but silent indefinite degradation is not.
- If bootstrap uses bounded polling or refresh windows, the selection policy for eligible work is deterministic and documented, and deferred work remains operator-visible with its reason.
- Operator-visible diagnostics distinguish at minimum: stale archived state, expired auth, missing credential material, unresolved env reference, missing endpoint activation, and successful rehydration.
- Logs and summary surfaces are specific enough to debug restart failures without opening SQLite directly.

### `R9` Backward compatibility and legacy-state migration

Description:
Older runtime state must be migrated, archived, or normalized so that upgrades do not leave misleading or duplicate setup behind.

Acceptance criteria:
- Phase 2 defines the migration/normalization approach for legacy provider accounts, legacy credential refs, legacy device-auth rows, and old API-key persistence semantics.
- Existing valid accounts remain usable after migration without forced re-onboarding.
- Legacy stale data that cannot be mapped to a valid current account is archived or ignored safely.
- Migration is idempotent across repeated runtime starts.
- Corrupt rows/files, duplicate ids, orphan credentials, accounts missing credentials, and partial-write recovery behavior are explicitly handled or surfaced with operator-visible diagnostics.
- Migration/reconciliation does not silently create duplicate active accounts for one logical configured account without operator-visible explanation.
- Legacy credential-backend normalization and cross-source logical-account reconciliation are included in the migration plan, not treated as post-hoc cleanup.

### `R10` Verification matrix and acceptance proof

Description:
This run is not complete until the system is proven end to end under real restart conditions.

Acceptance criteria:
- Strict RED/GREEN evidence exists for the production changes introduced in Phase 3.
- Relevant automated package suites covering runtime-host-bridge, sqlite-memory, and runtime-ui pass.
- Phase 5 rebuilds the runtime package, launches the rebuilt packaged runtime, and records verification against that launched runtime.
- The packaged runtime verification in Phase 5 occurs after launch, not only against prebuild/dev-runtime processes.
- Browser verification covers account readiness presentation, at least one non-Connect readiness consumer, and the **Reconnect** and **Update API key** maintenance flows.
- Restart proof demonstrates that the representative local setup(s), OAuth remote setup, API-key remote setup, and stale-state fixture survive or reconcile with truthful lifecycle state and no forced re-onboarding.
- Required automated coverage includes, at minimum: expired pending auth no longer counting as pending, credential-backend normalization, reconnect/update-key preserving identity and bindings, provisional-vs-authoritative bootstrap summary behavior, and duplicate/logical-account collision handling.
- All changed behavior classes delivered in Phase 3 are re-tested end to end in Phase 5 against the rebuilt packaged runtime; unit/package tests alone are insufficient for verification.

### `R11` Frontend design-system-first workflow

Description:
Frontend changes for this run must flow from design-system contract updates into route/component implementation, not the other way around.

Acceptance criteria:
- Any frontend behavior or layout change in scope for this run first updates `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`.
- Phase 2 plans UI work by naming the affected design-system primitives, page templates, or route-contract rules before implementation tasks.
- Phase 3 implementation changes cite the corresponding design-system update in the phase artifact.
- Phase 5 browser QA verifies the implemented UI against the updated design-system contract, not only ad hoc visual behavior.

### `R12` Backend maintenance mutation contract

Description:
UI repair actions for reconnecting OAuth or updating API keys must be backed by stable backend mutations that repair existing configured accounts rather than silently replacing them.

Acceptance criteria:
- Backend repair behavior is exposed as explicit reconnect/update-key operations or a documented mutation contract that is semantically equivalent.
- Reconnect/update-key actions target an existing account identifier rather than requiring account recreation.
- Successful repair preserves account identity, bindings, and endpoint associations unless the operator explicitly changes them.
- Repair flows have deterministic merge behavior for `allowedModels` and `modelRoleBindings`; unspecified implicit merge semantics are not acceptable.
- Failed repair leaves the last-known-good durable state intact or surfaces an explicit rollback/partial-failure diagnostic.
- Secrets and token material are redacted from summaries, logs, and mutation responses except where the operator is intentionally entering new secret input.

### `R13` Atomicity, concurrency, and repeatability

Description:
Persistence writes and repair flows must behave predictably under repeated startup, repeated operator actions, and interrupted writes.

Acceptance criteria:
- Repeated startup reconciliation remains idempotent.
- Concurrent or repeated reconnect/update-key actions are serialized, rejected with clear diagnostics, or otherwise handled by a documented consistency rule.
- Persistence writes for credentials, account updates, and repair actions are atomic or have documented rollback semantics.
- Crash/interruption during a repair write does not leave the runtime in an unexplained mixed state on next startup.

### `R14` Prior-run compatibility and non-regression

Description:
This run extends prior runtime persistence and restart work; it must preserve previously-proven behavior unless an addendum explicitly changes the contract.

Acceptance criteria:
- Phase 1 cites the relevant locked artifacts from runs `06`, `17`, `35`, and `39` as inherited baseline behavior.
- Existing working provider-account persistence, OAuth continuity, Connect-surface behavior, and packaged-runtime restart continuity from those runs do not regress without explicit supersession rationale.
- If this run intentionally changes prior behavior, the affected contract is called out in Phase 2 and re-verified in Phase 5.

### `R15` Backend-owned lifecycle/readiness API

Description:
Lifecycle and readiness semantics must be published by the backend as one canonical contract rather than re-derived independently in client-side route logic.

Acceptance criteria:
- The backend exposes one canonical lifecycle/readiness contract containing per-account lifecycle records, provider/group rollups, aggregate readiness counts, and bootstrap authority state.
- Client-side transforms are presentation-only; they do not invent separate lifecycle semantics from raw account/session/endpoint fields.
- The same canonical backend contract powers all readiness-consuming UI surfaces in scope for this run.
- Tests verify consistency between per-account lifecycle records, provider/group rollups, and aggregate readiness counts.
- Phase 2 defines the transition plan for `RuntimeSummary`, `listAccounts()`, and `runtime-api.ts` so old count-only or partially-overlapping semantics are extended, replaced, or deprecated deliberately rather than left ambiguous.

### `R16` Logical-account identity and deterministic cross-source merges

Description:
The runtime must define how manual accounts, runtime-config accounts, and legacy persisted state map to logical execution accounts without ad hoc duplication or merge drift.

Acceptance criteria:
- Phase 2 defines logical-account identity rules across runtime-config and manual account sources.
- Duplicate/collision handling is explicit and operator-visible when multiple source records map to one logical account or when two logical accounts conflict.
- Merge rules for `allowedModels` and `modelRoleBindings` are deterministic, documented, and verified.
- The canonical backend lifecycle/readiness contract reports enough provenance to explain which source or merge path produced the effective logical account.
- Automated coverage proves duplicate/logical-account collision handling and deterministic merge behavior.
- Canonical credential-ref/path rules across manual, runtime-config, and legacy persisted accounts are documented and included in the merge/provenance model.

### `R17` API transition, consumer migration, and validation alignment

Description:
Introducing the canonical lifecycle/readiness contract must include an explicit transition plan for existing runtime summary/account APIs and their consumers.

Acceptance criteria:
- Phase 2 states whether the canonical lifecycle/readiness contract extends `RuntimeSummary`, introduces a new endpoint, replaces parts of `listAccounts()`, or uses another explicit migration strategy.
- Client `runtime-api.ts` types and fetch helpers are updated consistently with that strategy.
- Affected runtime summary consumers, including readiness routes, other runtime summary UI surfaces, and validation/test harnesses that rely on `readRuntimeSummary()` or `listAccounts()`, are updated in the same run or explicitly deferred with rationale.
- The run does not leave parallel truth models where old count-only semantics remain active beside the canonical lifecycle contract without an explicit compatibility story.

## Out of Scope

- Adding brand-new providers, models, or auth families beyond making the existing account/auth framework systematic
- Provider-specific UX forks where the behavior can be expressed through generic lifecycle and metadata
- Broad router-strategy changes unrelated to persistence, rehydration, readiness, or maintenance
- True credential encryption/hardware-backed secret storage if the run can satisfy the lifecycle contract without it
- Unrelated visual redesign of runtime UI pages outside the lifecycle and maintenance surfaces needed by this run

## Constraints

- Preserve existing intended successful behavior for currently working local, OAuth, and API-key setups.
- Do not require users to manually edit SQLite, token files, or JSON manifests for standard upgrade/restart scenarios.
- Prefer extending existing persistence surfaces before inventing new parallel stores; any new durable manifest must be justified in Phase 2.
- Keep account identifiers stable across maintenance actions whenever possible.
- Avoid silent fallback behavior that makes broken persistence appear successful.
- Frontend implementation must follow design-system-first sequencing: update `DESIGN_SYSTEM.md` before route/component code changes.
- Secret material must remain redacted from logs, diagnostics, and operator summaries.
- Readiness and lifecycle semantics must not be re-derived inconsistently by different UI routes.

## Assumptions

- The runtime continues to support the existing local, OAuth device-code, and API-key account families already present in the product.
- The packaged runtime continues to use the current runtime state root and persistence surfaces unless Phase 2 justifies a narrow addition or normalization layer.
- No provider-specific product expansion is required for this run beyond expressing existing differences through generic metadata and lifecycle handling.

## Phase 2 planning minimums

Phase 2 must, at minimum:

1. Map every existing persistence surface to the canonical ownership model.
2. Define the reconciliation algorithm and archived-stale policy.
3. Define lifecycle-state transitions and reason codes.
4. Define UI action placement and state transitions for **Reconnect** and **Update API key**.
5. Define the restart-proof verification matrix, including packaged-runtime evidence paths.
6. Define the source-of-truth/conflict-resolution matrix required by `D4`.
7. Define the archived-state visibility/removal policy required by `D6`.
8. Define the design-system-first frontend update sequence required by `R11`.
9. Define the ordered bootstrap pipeline and summary-publication point required by `D7`.
10. Define the mutation atomicity/identity-preservation rules required by `D8`.
11. Define the canonical backend lifecycle/readiness contract required by `D9` and `R15`.
12. Define the canonical credential-backend normalization plan required by `D10` and `R6`.
13. Define logical-account identity, provenance, collision handling, and merge rules required by `D11` and `R16`.
14. Explicitly mark peer and llama-swap each as in-scope or deferred for restart proof and explain the decision.
15. Enumerate all readiness-consuming UI surfaces in scope and map each to the canonical backend contract.
16. Define the transition/deprecation plan for `RuntimeSummary`, `listAccounts()`, `runtime-api.ts`, and any validation harnesses affected by the canonical lifecycle/readiness contract.
17. Define `/healthz` and runtime-summary bootstrap authority alignment, including provisional vs authoritative semantics.
18. Define fairness/selection semantics for any bounded bootstrap polling, refresh, or reconciliation work.

## Traceability

| Requirement | Planned focus | Minimum evidence |
| --- | --- | --- |
| `R0` | Generic lifecycle architecture | Code refs + provider-neutral tests |
| `R1` | Persistence ownership contract | Source-of-truth matrix + backend tests |
| `R2` | Startup reconciliation | Bootstrap diagnostics + stale-state tests |
| `R3` | Lifecycle computation | Transition table + summary/readiness tests |
| `R4` | Canonical readiness UI surfaces | UI diffs + browser evidence + design-system citation |
| `R5` | Credential maintenance UX | Modal/action tests + browser evidence |
| `R6` | API-key storage modes | Backend/UI contract tests + migration coverage |
| `R7` | Restart rehydration | Packaged-runtime restart proof using `L1/L2/O1/K1/S1` |
| `R8` | Diagnostics/observability | Summary/log/API evidence |
| `R9` | Legacy migration/corruption handling | Migration tests + diagnostics evidence |
| `R10` | End-to-end verification | Rebuild, packaged-runtime launch, Phase 5 receipts |
| `R11` | Design-system-first frontend workflow | `DESIGN_SYSTEM.md` diff + downstream UI implementation refs |
| `R12` | Backend repair mutation contract | Mutation/API tests + redaction evidence |
| `R13` | Atomicity/concurrency/repeatability | Failure-mode tests + restart evidence |
| `R14` | Prior-run compatibility | Phase 1 inheritance refs + regression evidence |
| `R15` | Backend-owned lifecycle/readiness API | API contract tests + route-consumption evidence |
| `R16` | Logical-account identity and cross-source merges | Collision tests + provenance/merge evidence |
| `R17` | API transition and consumer migration | Runtime-summary/listAccounts migration evidence + validation alignment |

---

## Coverage Gate

Coverage: PASS

The current audit findings, restart-persistence goal, stale-state sanitation, backend-owned readiness semantics, account-scoped lifecycle mapping, bootstrap authority, credential-backend normalization, cross-source identity/merge rules, API transition planning, frontend design-system governance, backend repair semantics, atomicity/repeatability, prior-run compatibility, and UI maintenance requirements are all mapped to `R0`-`R17` or Out of Scope.

## Approval Gate

Approval: PASS

User approval is recorded and the tightened requirement is ready for lock before Phase 1 analysis.
