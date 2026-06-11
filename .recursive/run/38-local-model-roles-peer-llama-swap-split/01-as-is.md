Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-11T02:53:42Z`
LockHash: `dd060bff3c59f7cf6af17d71fa9529637c35e202d5b0cc7a48b914538ad9dff9`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/00-requirements.md`
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/ui-architecture-and-page-spec.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/routes/local-models.tsx`
- `role-model-router/packages/provider-account/src/index.ts`
Outputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/01-as-is.md`
Scope note: Documents the pre-run operator and routing behavior for local peer and llama-swap backends.

## TODO

- [x] Map current local model load paths (peer vs llama-swap)
- [x] Map current role persistence and router binding gaps
- [x] Map current Local UI navigation and mixed-page problems
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\role-model-router`
2. Open `apps/runtime-ui/app/routes/local-models.tsx` — note single mixed Local → Models page
3. Open `apps/runtime-host-bridge/src/index.ts` — search `loadLocalModel` (peer-first) and `buildRuntimeRoleBindings` (SQLite endpoints only pre-run)
4. Open `packages/provider-account/src/index.ts` — search `MODEL_ROLE_MODEL_NOT_ALLOWED` for empty `allowedModels`
5. Launch packaged runtime on `:3456`; open `/app/local/models` and Control → Models for `lfm2.5-8b-a1b` — roles not assignable on Local page; peer sync can wipe bindings

## Current Behavior by Requirement

### `R1` Split Local UI

- Single `/app/local/models` mixed peer and llama-swap copy; no `/app/local/choose` or split peer/llama-swap pages.

### `R2` Peer role assignment

- Roles only via Control → Models inspect; `syncLocalPeerState` replaced account bindings on peer refresh.

### `R3` Llama-swap role assignment

- No role picker on load; `model-overrides.json` had no `roleIds` contract in UI.

### `R4` Wildcard validation

- `validateProviderAccounts` rejected bindings when `allowedModels` empty.

### `R5` Router bindings

- `buildRuntimeRoleBindings` did not walk llama-swap registry endpoints; peer bindings lost on sync.

### `R6` Observe surfaces

- Router candidates could show local endpoints without `roleIds`.

### `R7`–`R11`

- Not verifiable from worktree alone; required packaged runtime (runs 37 pattern).

### `R8` TDD

- No failing tests for peer sync merge or split bindings before run 38.

### `R9` Browser QA

- No split-page browser contract; mixed Models page only.

### `R10` Design system

- `DESIGN_SYSTEM.md` documented single Local → Models; navigation did not separate backends.

## Relevant Code Pointers

| Area | Path |
| --- | --- |
| Combined load | `apps/runtime-host-bridge/src/index.ts` (`loadLocalModel`) |
| Peer sync | `apps/runtime-host-bridge/src/index.ts` (`syncLocalPeerState`) |
| Bindings | `apps/runtime-host-bridge/src/index.ts` (`buildRuntimeRoleBindings`) |
| Validation | `packages/provider-account/src/index.ts` |
| Mixed UI | `apps/runtime-ui/app/routes/local-models.tsx` |
| Nav | `apps/runtime-ui/app/lib/design-system.ts` |

## Evidence

- Requirements analysis in `00-requirements.md` problem summary table
- Run 34 precedent for role policy UI; run 37 for packaged-runtime validation pattern
- Operator baseline from run 37 `runtime-config-baseline-pre-rebuild.json`

## Known Unknowns

- Whether operator `runtime-config.yaml` enables llama-swap in this environment (later proved disabled — Scenario B deferred)
- Exact peer endpoint UUID after rebuild (allowed to churn per requirements)

## Local backend split (AS-IS)

| Backend | Operator entry | Load API | Role assignment | Router bindings |
| --- | --- | --- | --- | --- |
| Peer-backed | Local → Endpoints, then Local → Models | `POST /api/role-model/local/models/:id/load` (peer-first) | Hidden in Control → Models; blocked when `allowedModels` empty | Only if `modelRoleBindings` exist on peer account; wiped on `syncLocalPeerState` |
| llama-swap | Runtime config + Local → Models | Same combined load API when no peers | No surface | Never — `buildRuntimeRoleBindings` only walked SQLite runtime endpoints |

## UI AS-IS problems

- Single **Local → Models** page mixed peer and llama-swap copy (“llama-swap-managed”) while `loadLocalModel` preferred peers.
- No chooser explaining which backend an operator is using.
- llama-swap satellite routes (`/app/local/swap`, `/app/local/policy`, etc.) lived beside peer routes without backend grouping.
- Control → Models `selectedModelAccounts` filter excluded wildcard peer accounts with active endpoints.

## Validation AS-IS

- `validateProviderAccounts` rejected `modelRoleBindings` when `allowedModels` was empty, blocking peer wildcard role saves.
- Router candidates and endpoint lists could show local endpoints without `roleIds` even when operators believed roles were configured remotely.

## Traceability

- `R1` → mixed Local UI documented under Current Behavior
- `R2` → peer role + sync wipe documented
- `R3` → llama-swap role gap documented
- `R4` → validation blocker documented
- `R5` → binding gap documented
- `R6` → candidates/telemetry gap documented
- `R7`–`R11` → packaged-runtime proof requirement documented
- `R8` → missing TDD baseline documented
- `R9` → no split browser contract documented
- `R10` → design-system single-page IA documented

## Subagent Capability Probe

- Subagent tools available in controller session; Phase 1 analysis performed as controller self-audit.
- Delegation Decision Basis: AS-IS is documentation-only; no delegated audit required.

## Audit Execution Mode

- self-audit

## Coverage Gate

- [x] Peer vs llama-swap load and persistence paths documented
- [x] Router binding gap documented
- [x] Mixed Local UI problems documented
- [x] Validation and Control → Models filter gaps documented

Coverage: PASS

## Approval Gate

- [x] AS-IS is sufficient to plan Phase 2 without guessing backend semantics
- [x] No contradictory statements vs requirements or addendum

Approval: PASS

Audit: PASS
