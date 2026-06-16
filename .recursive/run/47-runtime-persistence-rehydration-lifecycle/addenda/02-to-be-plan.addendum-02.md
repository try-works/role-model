Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `02 To-Be Plan`
Addendum: `02`
Status: `LOCKED`
LockedAt: `2026-06-16T03:21:32Z`
LockHash: `d00d6f6f104a50c4dc4d1666ae613a99b0da236fe4f564a858ca9d244151b314`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/05-manual-qa.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-01.md` (LOCKED)
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-02.md`
Scope note: Refinement patch for locked `02-to-be-plan.addendum-01.md`. Tightens the `/app` source-of-truth contract, makes the request-id/correlation-id model explicit, and replaces the generic verification floor with exact command blocks. Supplements locked planning artifacts without editing them.

## TODO

- [x] Re-read locked base plan, locked addendum 01, and locked implementation/QA receipts
- [x] Tighten `/app` source-of-truth guidance so it cannot drift from run-47 canonical lifecycle authority
- [x] Tighten the latest-request identity contract into explicit canonical/correlation fields
- [x] Replace the generic verification floor with exact reproducible command blocks
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: `R4`, `R8`, `R10`, `R15`, `R16`, `R17`
- `02-to-be-plan.md`: locked SP47-A through SP47-F baseline
- `03-implementation-summary.md`: run-47 already established `credentialLifecycle`, provider rollups, explicit repair mutations, and migrated readiness consumers
- `05-manual-qa.md`: final packaged-runtime proof and post-lock packaged-runtime repair reconciliation
- `addenda/02-to-be-plan.addendum-01.md`: first follow-up implementation plan for F1-F6

## Earlier Addendum Reconciliation

`02-to-be-plan.addendum-01.md` is directionally correct and systematic, but three points need to be made more explicit before it becomes the next implementation baseline:

1. `/app` must not reintroduce route-local truth by loosely mixing `RuntimeSummary` and `RuntimeSnapshot`.
2. The request-ledger fix needs a concrete canonical-id vs caller-correlation-id contract.
3. The Phase 4 floor should name exact commands, not only command focus areas.

This addendum resolves those ambiguities and should be treated as part of the effective Phase 2 follow-up plan together with addendum 01.

## Refinement A — `/app` current-state panels must consume run-47 canonical truth

### Why this refinement is required

Run 47 already established the canonical readiness/lifecycle authority in the backend:

- `credentialLifecycle`
- provider rollups
- canonical readiness consumers on Providers, Runtime, Session readiness, Workbench, and Studio Advanced

The first follow-up addendum correctly says `/app` should become a current-state overview, but the wording "`RuntimeSummary` / `RuntimeSnapshot` / canonical lifecycle-inventory data" is too loose and could permit new route-local joins or inferred lifecycle semantics.

### Binding source-of-truth rule for `SP47-G`

`SP47-G` is refined as follows:

1. Any `/app` panel that communicates account readiness, provider posture, bootstrap authority, stale diagnostics, or routable posture **must** be presentation over backend-owned canonical fields already introduced by run 47.
2. The preferred source order is:
   - `summary.credentialLifecycle`
   - `summary.inventorySummary`
   - `summary.sessionBootstrap`
   - health/authority parity fields already aligned in run 47
3. `snapshot.endpoints` may be used only for endpoint inventory/topology display and must not be used by the dashboard to invent provider/account lifecycle semantics or aggregate readiness counts.
4. If `/app` needs a current-state endpoint comparison view that cannot be rendered faithfully from the existing canonical summary/snapshot contract, the backend must publish a dedicated current-state endpoint projection. The dashboard must not solve that gap with client-side inference.

### Concrete planning consequence

`SP47-G` should be read as:

- current-state cards and current-state readiness sections are canonical-backend presentation
- recent-activity sections are telemetry presentation
- no dashboard card may silently recompute lifecycle/readiness truth from raw endpoint/account rows

## Refinement B — canonical request id vs caller correlation contract

### Why this refinement is required

Addendum 01 correctly identifies the overwrite hazard from constant fallback request ids, but it does not fully specify:

- which field remains the canonical detail-route identifier
- how caller-provided ids are preserved
- how historical rows are interpreted

### Binding identity rule for `SP47-H`

`SP47-H` is refined as follows:

1. Every persisted execution row must have one **canonical request ledger id** used by:
   - `/api/role-model/telemetry/requests`
   - `/api/role-model/requests/:requestId`
   - `/api/role-model/router/decisions/:requestId`
   - in-app links into request and router-decision detail pages
2. The canonical request ledger id must be unique per execution.
3. Caller-provided request headers are preserved as optional **client correlation ids**, not as the only persisted identity.
4. Compatibility rule:
   - if the inbound caller id is absent, generate a canonical request id
   - if the inbound caller id is present and safe to use as a unique canonical request id, it may remain the canonical request id
   - if the inbound caller id is reused, collides, or would otherwise cause row replacement, generate a new canonical request id and persist the caller value separately as `clientRequestId` or equivalent
5. Historical rows that do not carry the new correlation field remain readable; their correlation field is treated as `null`
6. The UI latest-request widget and request-detail views should display both when useful:
   - canonical request id for navigation/debugging
   - client correlation id only as auxiliary provenance, not as the primary identity

### Required overview-widget semantics

The `/app` latest-request widget must be backed by a query contract that explicitly states:

- which request origins are included by default
- whether benchmark/validation/system traffic is excluded
- how alias-routed requests are labeled
- whether the widget groups or filters by origin rather than exposing the raw full ledger ordering

The canonical `/app/observe/requests` page remains the full ledger and does not adopt the same filtered semantics.

## Refinement C — exact verification commands

### Why this refinement is required

The original run-47 Phase 2 plan used exact command blocks. Addendum 01 dropped to generic “command focus” wording, which is weaker than the repo’s normal recursive-mode standard for reproducible validation.

### Binding Phase 4 floor for addenda 01 + 02

Unless implementation adds new dedicated test files that must be appended explicitly, the retained exact verification floor is:

#### Runtime UI

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\apps\runtime-ui
corepack pnpm exec vitest run app/lib/design-system.test.ts app/lib/runtime-api.test.ts app/lib/view-models.test.ts
```

#### SQLite memory

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\packages\sqlite-memory
corepack pnpm exec vitest run test/index.test.ts
```

#### Runtime host bridge

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\apps\runtime-host-bridge
corepack pnpm exec vitest run src/routable-inventory.test.ts test/index.test.ts test/account-repair.test.ts test/backend-unified-runtime-config.test.ts test/restart-rehydration.test.ts test/session-readiness-api.test.ts test/session-bootstrap-health.test.ts test/remote-health-bootstrap.test.ts test/operator-intent-corrupt-bootstrap.test.ts test/validate-ui.test.ts test/validate-restart-rehydration.test.ts
```

#### Packaged runtime rebuild

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle
corepack pnpm run runtime:package-sea
```

### Command-extension rule

If the follow-up implementation introduces a new dedicated test file for `SP47-G` through `SP47-L`, append that file path to the corresponding exact command above and retain the base command block in the artifact/evidence.

## Resulting plan amendments

The following lines in addendum 01 should be interpreted through this refinement:

- `SP47-G` lines about `RuntimeSummary` / `RuntimeSnapshot` now mean canonical-backend presentation first, snapshot topology second
- `SP47-H` lines about “distinct transport/request-ledger id” now mean the explicit canonical-id vs correlation-id contract above
- the addendum 01 Phase 4 floor now inherits the exact commands in this artifact

## Phase 5 re-verification carry-forward

Addendum 01’s Phase 5 matrix remains valid. The only extra interpretation requirement from this refinement is:

- `Q-A1` must prove the overview is consuming canonical run-47 lifecycle/readiness truth rather than route-local inference
- `Q-A2` must prove both that repeated bridge requests no longer overwrite each other and that the widget’s filtered latest-live semantics differ intentionally from the full request ledger

## Traceability

| Requirement / concern | Refinement | Verification |
| --- | --- | --- |
| `R4`, `R15`, `R17` | Refinement A | `/app` current-state panels consume canonical backend truth |
| `R8`, `R10`, `R17` | Refinement B | canonical request id and filtered live-request semantics verified on packaged runtime |
| reproducible validation discipline | Refinement C | exact commands recorded and rerunnable from the worktree |

## Coverage Gate

- [x] The `/app` dashboard source-of-truth rule is now explicit and consistent with run-47 canonical lifecycle authority
- [x] The request-ledger identity model is now explicit enough to avoid ambiguous implementation choices
- [x] The follow-up verification floor now uses exact commands instead of generic focus areas
- [x] The refinement is recorded via addendum instead of editing locked prior artifacts

Coverage: PASS

## Approval Gate

- [x] This refinement resolves the main ambiguity remaining in addendum 01
- [x] The effective follow-up plan remains consistent with locked run-47 implementation and QA receipts
- [x] The addendum is concrete enough to guide the next implementation slices without reopening locked history

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: `tool_search` resolved `multi_agent_v1.spawn_agent`, `wait_agent`, and related tools on 2026-06-16
- Delegation Decision Basis: refinement was limited to plan-precision work against already locked artifacts and current code refs
- Delegation Override Reason: current subagent tool contract allows spawning only when the user explicitly requests delegation or parallel agent work; no such authorization was given in this turn
- Audit Inputs Provided:
  - `00-requirements.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `05-manual-qa.md`
  - `addenda/02-to-be-plan.addendum-01.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: reconciled the refinement against locked run-47 implementation and QA receipts, then mapped it onto concrete existing test files and command paths in the current worktree
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

Audit: PASS
