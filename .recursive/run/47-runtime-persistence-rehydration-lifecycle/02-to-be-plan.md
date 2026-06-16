Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-06-15T16:37:58Z`
LockHash: `ab713af6656747aa2615b440beeae053da5efbde533f73cbd5cd217e01c498a3`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-worktree.md`
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/01-as-is.md`
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md`
Scope note: ExecPlan for making runtime persistence, bootstrap, lifecycle/readiness, and remote credential maintenance systematic across local, OAuth, and API-key account families while preserving prior run continuity and requiring rebuilt-runtime proof.

## TODO

- [x] Resolve Phase 1 known unknowns into explicit Phase 2 decisions
- [x] Define the canonical lifecycle/readiness contract, source-of-truth matrix, and archived-state policy
- [x] Plan design-system-first UI changes plus explicit backend repair operations
- [x] Map `R0`-`R17` to bounded implementation sub-phases, TDD slices, and verification
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Outcome

Run 47 will:

1. Define one canonical backend-owned lifecycle/readiness contract and make every readiness-consuming UI surface consume it.
2. Harden startup reconciliation so stale transient auth state becomes non-blocking, bootstrap authority is explicit, and failure accounting is structured instead of silent.
3. Normalize credential backend/storage semantics so persisted-local keys, env-backed refs, OAuth token files, and legacy backend names behave predictably.
4. Replace generic remote-account repair behavior with explicit reconnect/update-key mutations and a maintenance-first Providers UI.
5. Preserve run-39 bootstrap/readiness infrastructure and prior persistence continuity while removing the remaining split-truth seams.
6. Require strict RED -> GREEN proof for every production slice and Phase 5 rebuilt-runtime verification against the packaged runtime on the real operator surface.

All work executes from worktree `D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle` on branch `recursive/47-runtime-persistence-rehydration-lifecycle`.

## Phase 1 Decisions (resolved)

| Unknown | Decision |
| --- | --- |
| Canonical lifecycle/readiness transport | **Extend, do not fork.** Add a versioned `credentialLifecycle` contract to `RuntimeSummary` and therefore to `RuntimeSnapshot.summary`. Keep legacy `readinessSummary` only as a compatibility alias derived from `credentialLifecycle.counts` during this run. Do not add a second parallel lifecycle endpoint unless a Phase 3 RED case proves transport size or coupling requires it. |
| Logical-account identity across runtime-config/manual sources | **No provider-only auto-merge.** Different `providerAccountId` values remain distinct logical accounts even when they share `providerId`. Cross-source merge only happens on exact account-id collision. Runtime-config synthesized accounts keep reserved ids such as `{providerId}.litellm`. On exact collision, persisted/manual state is authoritative for mutable fields, runtime-config contributes only bounded metadata/model unions, and provenance is exposed explicitly. |
| Remote activation authority | **SQLite first, manifest fallback only.** `runtime_endpoints` remains the authoritative durable store for remote endpoint activations. `operator-intent.remoteActivations` is retained only for backward-read compatibility and bootstrap fallback when SQLite does not contain the activation state yet. Phase 3 should not introduce a new parallel durable activation store. |
| Local restart-proof scope (`L2`) | **Peer live proof is in scope; llama-swap live packaged-runtime proof is deferred with rationale.** Peer-backed local restore is in-scope for Phase 5 live restart proof because it uses the existing repo/operator baseline without extra model-asset prerequisites. Llama-swap code-path continuity remains in scope for automated regression and lifecycle correctness, but live packaged-runtime restart proof is deferred in this run because it depends on host-local model assets and runtime conditions outside the repo-controlled baseline. Phase 5 receipts must restate that explicit deferral. |
| Pre-existing host-bridge failures | **Acknowledge, do not chase unless touched.** `test/executable.test.ts`, `test/benchmark-runner-compare.test.ts`, and `test/validate-vendors.test.ts` remain Phase 0 baseline carve-outs. Run 47 validation uses focused host-bridge slices plus rebuilt-runtime proof and must not claim those failures are fixed unless the delivered diff directly changes them. |

## Canonical source-of-truth and conflict-resolution matrix

| Category | Canonical store/path | Owner | Durability | Read path | Write path | Precedence / conflict rule | Corruption / missing-data handling |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Manual execution-account config | SQLite `provider_accounts` | runtime-host-bridge account mutations | durable | bridge startup + account APIs | explicit account save/update/repair operations | authoritative for manual account identity, auth mode, bindings, status hints | invalid/corrupt row becomes operator-visible diagnostic and non-ready lifecycle outcome, not silent skip |
| Runtime-config synthesized accounts | unified runtime config file + in-memory synthesis | runtime-config editor + bridge synthesis | durable config, derived account rows | bridge startup + config reload | runtime-config save/apply path | authoritative only for synthesized runtime-config accounts; lower precedence than persisted/manual row on exact same account id | invalid config already fails validation; no silent creation of partial logical account |
| OAuth token material / persisted local API keys | runtime state credential files (`local-file`) | explicit credential save/repair helpers | durable | credential hydrate / live execution / restart | reconnect/update-key save paths | authoritative for local credential material referenced by account row | missing/corrupt file yields `credentials-missing` or `expired-auth` with archived diagnostic; no secret echo |
| Env-backed credential references | `provider_accounts.credentialRef` + process env | account save/update path | durable ref, runtime-resolved | credential hydrate / live execution | account save/update path | authoritative for env-mode accounts; unresolved env never auto-falls back to local-file | unresolved env yields `env-unresolved` with repair guidance |
| Remote endpoint activations | SQLite `runtime_endpoints` | activate/deactivate endpoint ops | durable | runtime snapshot + bootstrap restore | activation/deactivation handlers | authoritative source for remote execution-ready posture; legacy operator-intent activation read only if SQLite missing/empty | broken/orphan endpoint row becomes degraded lifecycle reason or archived diagnostic, not silent disappearance |
| Local peer load intent | `operator-intent.json` `peerLoads[]` | local peer load/unload ops | durable | bootstrap peer reload stage | peer load/unload handlers | authoritative for peer auto-reload intent | corrupt manifest -> bootstrap degraded + visible operator-intent diagnostic |
| Local llama-swap load intent | `operator-intent.json` `llamaSwapLoads[]` | llama-swap load/unload ops | durable | bootstrap llama-swap reload stage | llama-swap load/unload handlers | authoritative for llama-swap auto-reload intent | corrupt manifest -> bootstrap degraded + visible operator-intent diagnostic |
| Device-auth onboarding state | SQLite device-auth session rows | OAuth start/poll handlers | transient | bootstrap reconciliation + Providers UI poll state | OAuth start/poll handlers | never authoritative for ready state; only authoritative for current unexpired pending authorization | expired/orphan sessions are archived/non-blocking and surfaced in diagnostics |
| Derived lifecycle/readiness + bootstrap state | in-memory canonical contract published in `RuntimeSummary` / snapshot | bridge bootstrap + lifecycle mapper | derived | summary APIs + UI fetchers | recomputed on startup and on relevant mutations | single source of lifecycle truth for readiness consumers | provisional during bootstrap, authoritative after bootstrap finalization even if degraded |

## Canonical lifecycle/readiness contract

`RuntimeSummary` gains a canonical `credentialLifecycle` block:

```ts
credentialLifecycle: {
  contractVersion: 1,
  authority: {
    state: "provisional" | "authoritative",
    bootstrapStatus: "pending" | "running" | "ready" | "degraded" | "blocked",
    reason?: string,
  },
  counts: {
    executionReady: number,
    connectedNoEndpoint: number,
    pendingAuthorization: number,
    expiredAuth: number,
    credentialsMissing: number,
    envUnresolved: number,
    archivedStale: number,
  },
  accounts: CredentialLifecycleAccountRecord[],
  providerRollups: CredentialLifecycleProviderRollup[],
  archivedArtifacts: CredentialLifecycleArchivedArtifact[],
}
```

### Account lifecycle record minimum fields

- `logicalAccountId`
- `providerAccountId`
- `providerId`
- `sourceProvenance[]` (`manual`, `runtime-config`, `legacy-manifest`, etc.)
- `authMode`
- `credentialStorageMode` (`persisted-local`, `env-ref`, `oauth-local`, or equivalent normalized presentation)
- `credentialBackendCanonical`
- `lifecycleState`
- `reasonCode`
- `blocking`
- `activeEndpointIds[]`
- `configuredModelIds[]`
- `availableActions[]` (`reconnect`, `update-api-key`, `activate-endpoint`, `set-env`, etc.)

### Provider rollup minimum fields

- `providerId`
- `accountIds[]`
- `countsByLifecycle`
- `readyAccountIds[]`
- `attentionAccountIds[]`
- `hasArchivedArtifacts`

Client-side transforms may only regroup/filter/present these records. They may not derive lifecycle semantics from raw `status`, `healthStatus`, `rotationState`, or device-auth rows.

## Lifecycle mapping and archived-state policy

### Lifecycle precedence

The mapper resolves one lifecycle outcome per visible account using this precedence:

1. `archived-stale` — record/artifact quarantined by reconciliation and intentionally non-blocking
2. `pending-authorization` — active unexpired device-auth session exists for the account
3. `env-unresolved` — account is env-backed and the referenced env var is absent/empty
4. `credentials-missing` — local credential material is absent/unreadable and no active reconnect is in progress
5. `expired-auth` — OAuth credential exists historically, but startup refresh/validation proves it no longer yields a usable token
6. `execution-ready` — usable credential plus active endpoint (or local load) exists
7. `connected-no-endpoint` — credential is usable but no active endpoint/load is attached yet

### Transition / visibility table

| State | Entry rules | Blocking? | Visible repair | Default visibility |
| --- | --- | --- | --- | --- |
| `execution-ready` | usable credential + active endpoint/load | no | none required | visible on all readiness surfaces |
| `connected-no-endpoint` | usable credential, no active endpoint/load | yes | activate endpoint / load model | visible on all readiness surfaces |
| `pending-authorization` | unexpired pending OAuth device auth | yes | continue/reconnect OAuth | visible on Providers, Session readiness, Connect rollups |
| `expired-auth` | OAuth token missing/expired after prior connection and reconnect required | yes | reconnect | visible on Providers + readiness surfaces |
| `credentials-missing` | persisted credential absent/corrupt | yes | update API key or reconnect depending on auth mode | visible on Providers + readiness surfaces |
| `env-unresolved` | env ref unresolved | yes | edit env reference / set env | visible on Providers + readiness surfaces |
| `archived-stale` | stale/orphan/legacy artifact quarantined | no | inspect only in Phase 3; cleanup optional/deferred | hidden by default from blocking surfaces; visible on Session readiness diagnostics and bounded Providers detail |

### Archived-state policy

- **Archive, do not hard-delete by default** during normal reconciliation.
- Expired/orphan device-auth rows, legacy duplicate states, and orphan credential-file references become `archivedArtifacts` and are excluded from active blocking counts.
- Archived entries remain inspectable on `System -> Session readiness` and, if useful, in a collapsed diagnostics region on `Remote -> Providers`.
- Phase 3 will not add operator-facing hard-delete affordances unless implementation forces it; explicit destructive cleanup remains future work or explicit reset tooling.

## Ordered bootstrap pipeline and authority semantics

### Stage order

| Order | Stage id | Actions | Output obligation |
| --- | --- | --- | --- |
| 1 | `load-state` | read SQLite accounts/endpoints/device-auth rows, read operator-intent, synthesize runtime-config accounts | structured read receipts + corruption diagnostics |
| 2 | `reconcile-transient` | archive expired/orphan transient state, normalize legacy credential-backend names, detect orphan credentials/accounts | archived-artifact receipts + reconciliation counts |
| 3 | `hydrate-credentials` | hydrate OAuth/local/env credentials, attempt bounded refresh, classify unresolved env refs | per-account lifecycle reason updates |
| 4 | `restore-remote-activations` | restore remote activations from SQLite; use legacy operator-intent fallback only if SQLite lacks activations | restored/deferred/failed counts |
| 5 | `restore-peer-loads` | replay peer auto-reload intent from manifest | reloaded/failed counts |
| 6 | `restore-llama-swap-loads` | replay llama-swap auto-reload intent from manifest when in scope/runtime available | reloaded/failed counts |
| 7 | `remote-health` | probe remote endpoints and update health posture | probed/healthy/degraded counts |
| 8 | `publish-lifecycle` | build canonical lifecycle records, provider rollups, counts, archived diagnostics, alias/readiness summaries | switches authority to `authoritative` |

### Authority rule

- `credentialLifecycle.authority.state = "provisional"` while bootstrap is `pending` or `running`.
- `credentialLifecycle.authority.state = "authoritative"` once `publish-lifecycle` completes, even if one or more stages finished `degraded` or `blocked`.
- `/healthz` and `/api/role-model/runtime/summary` expose the same bootstrap status and authority semantics; neither may claim a contradictory posture for the same session.

### Bounded-work fairness and failure accounting

- Pending OAuth poll resume remains bounded to the current small-startup window, but selection becomes deterministic:
  1. sort by earliest `expiresAtMs`
  2. tie-break by `authRequestId`
  3. process the first `N` eligible rows (`N = current startup cap unless a RED case justifies change`)
- Deferred eligible rows are surfaced as `deferred` in stage details with count and selection reason.
- Startup refresh/poll failures must increment structured `attempted/succeeded/failed/skipped/deferred` counters and attach reason codes; no bare `catch {}` outcomes remain invisible.

## Backend repair mutation contract and concurrency rule

- Introduce explicit per-account repair operations:
  - `Reconnect` targets an existing OAuth account id and creates or resumes only that account's repair session
  - `Update API key` targets an existing API-key account id and updates only that account's credential storage mode/material
- Per-account mutation concurrency rule:
  - only one repair mutation may be active for a given `providerAccountId`
  - concurrent or repeated repair requests for the same account must either return the current active repair session or fail with a clear conflict diagnostic
  - reconnect and update-key actions for the same account may not interleave silently
- Last-known-good durable state remains authoritative until the new repair mutation commits successfully.
- Deterministic successful-repair merge rule:
  - account identity is unchanged
  - endpoint associations remain unless the operator explicitly changes them
  - `allowedModels` and `modelRoleBindings` follow the same-id merge policy from the logical-account decision above

## API transition and consumer migration

### Contract strategy

1. Extend `RuntimeSummary` and `RuntimeSnapshot.summary` with `credentialLifecycle`.
2. Keep `readinessSummary` during this run as a compatibility alias derived from `credentialLifecycle.counts`.
3. Treat `listAccounts()` as an inventory/detail readback API, not readiness truth:
   - it may gain normalized backend/provenance fields
   - it must not remain a parallel lifecycle authority

### Consumer migration

These runtime-ui consumers all move in the same run:

- `app/routes/endpoints.tsx`
- `app/routes/providers.tsx`
- `app/routes/runtime.tsx`
- `app/routes/session-readiness.tsx`
- `app/routes/workbench.tsx`
- `app/routes/studio-advanced.tsx`
- `app/lib/view-models.ts`
- `app/lib/runtime-api.ts`

Migration rules:

- `buildCredentialReadinessRows()` becomes presentation over `summary.credentialLifecycle.counts`
- `buildConfiguredProviderRows()` is replaced or reduced to presentation over canonical `providerRollups`
- saved-account UI may still display raw account detail, but lifecycle badges/actions must come from the canonical contract
- any validation/test harness consuming `readRuntimeSummary()` must update to the same contract or explicitly use the compatibility alias with rationale

## Design-system-first frontend contract

Phase 3 UI work starts with `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`, then `design-system.ts` / tests, then route/component code.

The design-system update must define:

1. **Providers saved-account contract**
   - saved account cards show lifecycle badge, storage mode, provenance hints, and explicit maintenance actions
   - OAuth accounts expose **Reconnect**
   - API-key accounts expose **Update API key**
2. **Credential maintenance modal contract**
   - rectilinear modal
   - storage-mode-aware form fields
   - `idle -> editing -> saving -> success|error`
   - explicit **Save** / **Cancel**
   - no secret echo/backfill
3. **Readiness surface contract**
   - Connect, Runtime, Session readiness, Workbench, and Studio Advanced use the same lifecycle vocabulary
   - archived stale entries remain non-blocking and visually separated

## Implementation Sub-phases

### SP47-A — Design-system and route-contract reset (`R4`, `R5`, `R11`, `R17`)

**Order (mandatory):**

1. `DESIGN_SYSTEM.md`
2. `app/lib/design-system.ts`
3. `app/lib/design-system.test.ts`
4. route/component implementation only after contract/tests are red then green

Deliverables:

- maintenance-first saved-account contract
- modal contract for update-key flow
- explicit lifecycle/readiness vocabulary for all in-scope routes

### SP47-B — Canonical lifecycle mapper and normalization layer (`R0`, `R3`, `R6`, `R15`, `R16`, `R17`)

Deliverables:

- new `credential-lifecycle.ts` + tests
- canonical backend-name normalization helpers
- logical-account identity/provenance rules
- provider rollup builder derived from canonical account records

Key rule:

- Phase 3 should prefer extracting this logic from `index.ts` into dedicated helpers instead of spreading new lifecycle logic through route-local UI transforms.

### SP47-C — Bootstrap reconciliation and stale-state hardening (`R1`, `R2`, `R7`, `R8`, `R9`, `R13`, `R14`)

Deliverables:

- updated `session-bootstrap.ts` + tests
- deterministic bounded poll/refresh accounting
- archived-stale diagnostics
- authority-state publication and `/healthz` alignment
- SQLite-first remote activation restore with legacy manifest fallback only

### SP47-D — Explicit backend repair mutations (`R5`, `R6`, `R12`, `R13`, `R16`)

Deliverables:

- reconnect mutation targeting an existing account id
- update-key mutation targeting an existing account id
- per-account repair-session concurrency/serialization rule
- deterministic merge behavior for `allowedModels` and `modelRoleBindings`
- rollback/last-known-good handling on failed writes

Constraint:

- The UI must not rely on undocumented `upsertProviderAccount()` side effects for reconnect/update-key semantics after this sub-phase.

### SP47-E — Readiness consumer migration and maintenance UI (`R4`, `R5`, `R6`, `R11`, `R15`, `R17`)

Deliverables:

- Providers page maintenance actions + modal
- Connect/Endpoints provider rollups from canonical contract
- Runtime / Session readiness / Workbench / Studio Advanced banners from canonical contract
- archived-state separation on diagnostic surfaces

### SP47-F — Verification and rebuilt-runtime proof (`R10`)

Deliverables:

- focused package-test floor
- rebuilt packaged runtime via existing repo script
- packaged-runtime launch receipt with startup/shutdown/restart evidence
- live restart proof for `L1`, deferred `L2` rationale, `O1`, `K1`, `S1`
- browser proof for one Connect consumer, Providers maintenance flows, and at least one non-Connect readiness consumer

## Requirement Mapping

| R# | Sub-phase(s) | Primary deliverable |
| --- | --- | --- |
| `R0` | SP47-B | provider-neutral lifecycle mapper and tests |
| `R1` | SP47-C | source-of-truth matrix plus SQLite-first restore implementation |
| `R2` | SP47-C | stale-state reconciliation and structured diagnostics |
| `R3` | SP47-B, SP47-C | lifecycle transition mapping + canonical counts/rollups |
| `R4` | SP47-A, SP47-E | all readiness routes consume one contract |
| `R5` | SP47-A, SP47-D, SP47-E | reconnect/update-key UX and mutations |
| `R6` | SP47-B, SP47-D, SP47-E | explicit storage modes and backend normalization |
| `R7` | SP47-C, SP47-F | restart continuity for peer/llama/oauth/api-key fixtures |
| `R8` | SP47-C, SP47-E | bootstrap authority + diagnostics surfaces |
| `R9` | SP47-C | legacy migration/archive policy |
| `R10` | SP47-F | rebuilt-runtime launch and end-to-end proof |
| `R11` | SP47-A, SP47-E | design-system-first UI delivery |
| `R12` | SP47-D | explicit repair mutation contract |
| `R13` | SP47-C, SP47-D | repeatability / rollback / bounded work rules |
| `R14` | SP47-C, SP47-F | preserve run 06/17/35/39 behavior and prove it |
| `R15` | SP47-B, SP47-E | backend-owned lifecycle/readiness API |
| `R16` | SP47-B, SP47-D | logical-account identity/provenance/merge rules |
| `R17` | SP47-A, SP47-B, SP47-E | summary/snapshot/accounts migration with no split truth |

## Planned Changes by File

| File | SP | Change summary |
| --- | --- | --- |
| `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | SP47-A | maintenance-first Providers contract, lifecycle vocabulary, modal/readiness rules |
| `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | SP47-A | route descriptions/actions aligned to the new lifecycle/maintenance contract |
| `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` | SP47-A | regression guards for lifecycle/maintenance ownership |
| `role-model-router/apps/runtime-host-bridge/src/credential-lifecycle.ts` | SP47-B | new canonical lifecycle mapping / provider rollups / normalization helpers |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | SP47-B, SP47-C, SP47-D | summary extension, mutation wiring, lifecycle publication, fallback cleanup |
| `role-model-router/apps/runtime-host-bridge/src/session-bootstrap.ts` | SP47-C | stage order, stale-state sanitization, authority publication, bounded accounting |
| `role-model-router/apps/runtime-host-bridge/src/session-bootstrap.test.ts` | SP47-C | RED/GREEN for provisional vs authoritative, stale-state, bounded work |
| `role-model-router/apps/runtime-host-bridge/test/session-bootstrap-health.test.ts` | SP47-C, SP47-F | `/healthz` and summary authority alignment under startup-state transitions |
| `role-model-router/apps/runtime-host-bridge/src/oauth-credential.ts` | SP47-B, SP47-C, SP47-D | canonical backend normalization and credential repair helpers if extraction reduces `index.ts` drift |
| `role-model-router/apps/runtime-host-bridge/src/operator-intent.ts` | SP47-C | compatibility fallback policy for legacy remote activations; local-load intent unchanged but clarified |
| `role-model-router/apps/runtime-host-bridge/src/remote-health-probe.ts` | SP47-C | only if lifecycle reasons need richer health reason codes |
| `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | SP47-B, SP47-E | typed `credentialLifecycle` contract and compatibility alias handling |
| `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts` | SP47-B, SP47-E | typed contract coverage |
| `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | SP47-E | presentation transforms from canonical contract only |
| `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` | SP47-E | readiness/provider-row presentation coverage from canonical contract |
| `role-model-router/apps/runtime-ui/app/routes/providers.tsx` | SP47-E | saved-account lifecycle badges, reconnect, update-key modal |
| `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx` | SP47-E | canonical provider rollups, no client lifecycle derivation |
| `role-model-router/apps/runtime-ui/app/routes/runtime.tsx` | SP47-E | canonical summary pills/banners |
| `role-model-router/apps/runtime-ui/app/routes/session-readiness.tsx` | SP47-E | archived diagnostics + authority presentation from canonical contract |
| `role-model-router/apps/runtime-ui/app/routes/workbench.tsx` | SP47-E | canonical blocking readiness banner |
| `role-model-router/apps/runtime-ui/app/routes/studio-advanced.tsx` | SP47-E | canonical blocking readiness banner |
| `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | SP47-B, SP47-D | lifecycle/repair integration cases |
| `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts` | SP47-C, SP47-F | end-to-end restart continuity scenarios |
| `role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts` | SP47-B, SP47-C, SP47-E | summary/authority/provider-rollup contract |
| `role-model-router/apps/runtime-host-bridge/test/remote-health-bootstrap.test.ts` | SP47-C | degraded/provisional/bootstrap health alignment |
| `role-model-router/apps/runtime-host-bridge/test/operator-intent-corrupt-bootstrap.test.ts` | SP47-C | corrupt manifest diagnostics and non-silent degradation |
| `role-model-router/apps/runtime-host-bridge/src/validate-restart-rehydration.ts` | SP47-F | align repo validation harness with canonical lifecycle contract if needed |

## Implementation Steps

1. **SP47-A** — make design-system/runtime-ui contract tests fail first, then update the contract and route metadata until green.
2. **SP47-B** — add failing lifecycle-contract/normalization tests, implement canonical mapper, then wire `RuntimeSummary`/snapshot typing.
3. **SP47-C** — add failing bootstrap-authority/stale-state tests, harden startup reconciliation, and publish authoritative lifecycle data.
4. **SP47-D** — add failing repair-mutation tests, implement reconnect/update-key operations, and preserve last-known-good state on failure.
5. **SP47-E** — migrate every readiness consumer to the canonical contract and land the maintenance UI/modal flows.
6. **SP47-F** — run focused suites, rebuild the packaged runtime, launch it, and verify the live fixture matrix plus browser flows.

## TDD Plan

TDD Mode: `strict`

Policy:

- Documentation-only contract updates in `DESIGN_SYSTEM.md` may precede code.
- Every production TypeScript change after that point must start from a failing test at the nearest relevant layer.
- No production code is accepted without recorded RED then GREEN evidence paths.

### Planned RED/GREEN evidence paths

| Slice | RED log | GREEN log |
| --- | --- | --- |
| SP47-A design-system contract | `evidence/logs/sp47-a-design-system.red.log` | `evidence/logs/sp47-a-design-system.green.log` |
| SP47-B lifecycle contract | `evidence/logs/sp47-b-lifecycle-contract.red.log` | `evidence/logs/sp47-b-lifecycle-contract.green.log` |
| SP47-C bootstrap reconciliation | `evidence/logs/sp47-c-bootstrap-reconcile.red.log` | `evidence/logs/sp47-c-bootstrap-reconcile.green.log` |
| SP47-D repair mutations | `evidence/logs/sp47-d-repair-mutations.red.log` | `evidence/logs/sp47-d-repair-mutations.green.log` |
| SP47-E readiness consumer migration | `evidence/logs/sp47-e-ui-migration.red.log` | `evidence/logs/sp47-e-ui-migration.green.log` |
| SP47-F rebuilt-runtime proof | `evidence/logs/sp47-f-packaged-runtime.green.log` | `evidence/logs/sp47-f-browser-qa.green.log` |

## Testing Strategy

### Focused package floor

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle
corepack pnpm --filter ./role-model-router/packages/sqlite-memory test
corepack pnpm --filter ./role-model-router/apps/runtime-ui test
```

### Focused host-bridge slices

Use file-focused vitest invocations rather than the full host-bridge suite while the acknowledged baseline carve-outs remain unchanged:

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\apps\runtime-host-bridge
corepack pnpm exec vitest run src/operator-intent.test.ts src/oauth-credential.test.ts src/session-bootstrap.test.ts src/remote-health-probe.test.ts src/routable-inventory.test.ts test/index.test.ts test/restart-rehydration.test.ts test/session-readiness-api.test.ts test/session-bootstrap-health.test.ts test/remote-health-bootstrap.test.ts test/operator-intent-corrupt-bootstrap.test.ts test/validate-restart-rehydration.test.ts
```

Phase 4 must also rerun any broader existing package test command that becomes relevant to the changed files, but it must distinguish new failures from the three acknowledged Phase 0 host-bridge carve-outs.

### Packaging / rebuild floor

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle
corepack pnpm run runtime:package-sea
```

Supplementary compatibility check only after the real packaged runtime has been built and launched:

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle
corepack pnpm run runtime:validate-packaging
```

`runtime:validate-packaging` is not a substitute for Phase 5. Phase 5 must launch the actual packaged runtime artifact produced by `runtime:package-sea`, capture its startup log, verify `/healthz` and `/api/role-model/runtime/summary` against that launched process, then run the restart and browser scenarios against that same packaged runtime.

## Playwright Plan (if applicable)

Not required.

QA Execution Mode for Phase 5: `hybrid`

- agent-operated packaged-runtime build/restart/API/browser proof
- user-observable artifacts and logs captured in run evidence where useful

## Manual QA Scenarios

All scenarios run against the rebuilt packaged runtime, not just a dev host:

1. **L1 peer restore** — prove one persisted peer-backed local endpoint/model with role binding survives restart and appears as `execution-ready`.
2. **L2 llama-swap restore** — either prove restart continuity live or explicitly record Phase 2 deferral rationale if not in scope.
3. **O1 OAuth restore** — prove a previously connected OAuth account rehydrates with stable identity, truthful lifecycle state, and endpoint readiness.
4. **K1 API-key restore** — prove a persisted-local API-key account rehydrates with stable identity and endpoint readiness.
5. **S1 stale-state cleanup** — prove an expired/orphan transient auth artifact no longer blocks unrelated ready accounts and is visible only as archived/non-blocking diagnostics.
6. **Reconnect flow** — from a repairable OAuth account, click **Reconnect**, complete the reconnect path, and verify identity/bindings/endpoints remain intact.
7. **Update API key flow** — from an API-key account, open the modal, enter a new key, Save, and verify identity/bindings/endpoints remain intact; Cancel must leave state unchanged.
8. **Readiness consumer consistency** — verify canonical lifecycle state matches on:
   - `Remote -> Providers`
   - `Connect`
   - `System -> Runtime`
   - `System -> Session readiness`
   - one non-Connect execution surface (`Workbench` or `Studio -> Advanced`)
9. **Authority alignment** — verify `/healthz` and `/api/role-model/runtime/summary` agree on provisional vs authoritative posture during startup and after bootstrap completion.
10. **Packaged-runtime launch receipt** — capture the packaged runtime artifact/executable path, startup log, listening URL, successful shutdown, and successful restart receipts in Phase 5 evidence.

## Idempotence and Recovery

- Repeated startup reconciliation must leave lifecycle state stable after the first successful reconciliation pass.
- Failed reconnect/update-key writes must preserve last-known-good durable state or surface explicit partial-failure diagnostics.
- Legacy manifest fallback for remote activations is read-compatible only; Phase 3 should not reintroduce new dual-write truth after migration.
- Archived stale artifacts remain diagnostic-only and non-blocking across repeated restarts.

## Out of scope (unchanged)

- As locked in `00-requirements.md`: no new provider/model families, no unrelated router-strategy redesign, no unrelated runtime-ui visual overhaul, no brand-specific forks, no hardware-backed secret-storage initiative.

## Traceability

| Requirement | Planned focus | Minimum evidence |
| --- | --- | --- |
| `R0` | canonical provider-neutral mapper | provider-neutral lifecycle tests |
| `R1` | explicit ownership matrix | Phase 2 matrix + bootstrap restore tests |
| `R2` | stale-state reconciliation | expired/orphan auth tests + diagnostics |
| `R3` | lifecycle states and rollups | mapper tests + summary contract assertions |
| `R4` | all readiness UI consumers migrate together | design-system citations + route tests + browser proof |
| `R5` | reconnect/update-key UX | modal/action tests + live browser proof |
| `R6` | storage-mode/backend normalization | normalization tests + UI copy/behavior proof |
| `R7` | restart continuity | `L1/L2/O1/K1/S1` packaged-runtime proof |
| `R8` | authority and diagnostics | `/healthz` + summary alignment evidence |
| `R9` | migration/backward compatibility | corrupt/orphan/legacy coverage |
| `R10` | rebuilt-runtime end-to-end verification | package rebuild, launch, browser and API receipts |
| `R11` | design-system-first sequencing | design-system diff precedes UI diff |
| `R12` | explicit repair mutations | backend mutation tests + preserved identity evidence |
| `R13` | atomicity/repeatability | failure-mode tests + restart repetition evidence |
| `R14` | prior-run continuity | inherited-baseline references + regression checks |
| `R15` | backend-owned lifecycle contract | summary/snapshot/provider-rollup tests |
| `R16` | deterministic cross-source identity/provenance | collision/merge tests |
| `R17` | no parallel truth after migration | runtime-api/view-model/validation alignment evidence |

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: controller-authored plan first, followed by delegated audit once the Phase 2 artifact was concrete enough to check against locked requirements, locked AS-IS, and live code seams
- Audit Execution Mode: delegated audit plus controller repair

## Subagent Contribution Verification

- Action Record Path: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/subagents/run47-phase2-plan-audit.md`
- Delegated reviewer findings applied before lock:
  - explicit `L2` scope decision (peer in scope, llama-swap live proof deferred with rationale)
  - explicit per-account repair concurrency rule
  - explicit `test/session-bootstrap-health.test.ts` coverage
  - stricter packaged-runtime launch receipt requirement

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Phase 1 unknowns are resolved into concrete Phase 2 decisions
- [x] Source-of-truth matrix, lifecycle mapping, archived-state policy, bootstrap order, and authority semantics are defined
- [x] Design-system-first sequencing, explicit repair mutations, TDD slices, and rebuilt-runtime verification are planned

Coverage: PASS

## Approval Gate

- [x] The plan is concrete enough to start strict-TDD implementation
- [x] No blocking ambiguity remains about lifecycle authority, repair semantics, or verification strategy

Approval: PASS
