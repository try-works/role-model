Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-11T02:53:43Z`
LockHash: `71fb115631efb8f0de388974a500d501d7c0eda2f609125a4af0511375f1792c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/01-as-is.md`
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/ui-architecture-and-page-spec.md`
Outputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/02-to-be-plan.md`
Scope note: Planned product and worktree changes for local role assignment and split Local UI.

## TODO

- [x] Plan backend API split and persistence seams
- [x] Plan UI routes, navigation, and shared role picker
- [x] Plan router binding module and peer sync merge
- [x] Plan verification (strict TDD + SEA rebuild + browser QA)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Implementation Sub-phases

### SP1 — Provider validation + peer sync merge (`R4`, `R2` partial)

- Allow `modelRoleBindings` on peer accounts with empty `allowedModels` (wildcard).
- Merge persisted `modelRoleBindings` / `allowedModels` / `deniedModels` in `syncLocalPeerState` instead of wiping on peer refresh.

### SP2 — Split local model APIs + bindings (`R2`, `R3`, `R5`)

- Add `local-model-role-bindings.ts` to build dynamic bindings for peer and llama-swap registry endpoints.
- Split HTTP APIs:
  - `GET/POST/PUT /api/role-model/local/peer/models[...]`
  - `GET/POST/PUT /api/role-model/local/llama-swap/models[...]`
- Persist peer roles on provider account `modelRoleBindings`; llama-swap roles on `model-overrides.json` `roleIds`.

### SP3 — Split Local UI (`R1`, `R10`)

- Routes: `/app/local/choose`, `/app/local/peer-models`, `/app/local/llama-swap/models`, llama-swap satellite under `/app/local/llama-swap/*`.
- Shared `LocalModelRolePicker` on peer and llama-swap model pages.
- Legacy redirects from `/app/local/models`, `/app/local/swap`, `/app/local/policy`, `/app/local/logs`, `/app/local/matrix`.
- Update `design-system.ts`, `DESIGN_SYSTEM.md`, `runtime-api.ts`, `control-models.tsx` wildcard filter.

### SP4 — Verification (`R8`, `R9`, `R11`)

- Strict TDD for `provider-account`, `local-model-role-bindings`, `design-system`.
- Rebuild SEA, launch `:3456`, restore config parity, run `probe-downstream-ingress.py`, browser QA split pages.

## Worktree scope (planned)

- `role-model-router/apps/runtime-host-bridge/**`
- `role-model-router/apps/runtime-ui/**`
- `role-model-router/packages/provider-account/**`

## Implementation Steps

1. SP1: provider-account wildcard + peer sync merge tests and implementation
2. SP2: `local-model-role-bindings.ts`, split APIs, persistence wiring
3. SP3: design-system + routes + three Local pages + role picker + redirects
4. SP4: SEA rebuild, config parity, probe regression, browser QA, phase artifacts

## Planned Changes by File

| File | Change |
| --- | --- |
| `packages/provider-account/src/index.ts` | Wildcard binding validation |
| `runtime-host-bridge/src/local-model-role-bindings.ts` | New bindings module |
| `runtime-host-bridge/src/index.ts` | Split APIs, sync merge, binding wiring |
| `runtime-ui/app/routes/local-choose.tsx` | New chooser |
| `runtime-ui/app/routes/local-peer-models.tsx` | Peer-only page |
| `runtime-ui/app/routes/local-llama-swap-models.tsx` | Llama-swap-only page |
| `runtime-ui/app/components/local-model-role-picker.tsx` | Shared picker |
| `runtime-ui/app/lib/design-system.ts` | Split Local IA |
| `runtime-ui/DESIGN_SYSTEM.md` | Documented split |

## Testing Strategy

- Strict TDD for `provider-account`, `local-model-role-bindings`, `design-system.test.ts`
- Bridge integration via config parity API checks
- `probe-downstream-ingress.py` regression on launched SEA
- Browser MCP snapshots for split pages and legacy redirects

## Manual QA Scenarios

1. Navigate `/app/local/choose` — verify backend cards and copy
2. Peer models — register/load `lfm2.5-8b-a1b` with roles; verify candidates
3. Llama-swap models — verify shell and empty state (optional live load if enabled)
4. Legacy redirects: `/app/local/models`, `/app/local/swap`, `/app/local/policy`, `/app/local/logs`, `/app/local/matrix`
5. Routing regression green on same runtime session

## Playwright Plan (if applicable)

- Not used; agent-operated browser MCP QA on packaged `:3456` runtime per `R9`.

## Idempotence and Recovery

- Peer role saves are idempotent via `PUT .../roles` and account merge on sync
- Re-running `POST .../load` with same `roleIds` is safe
- SEA rebuild is repeatable; config parity steps documented in baseline JSON
- On regression failure: fix → rebuild → relaunch → reconfigure → retest (`R11` loop)

## Out of scope (unchanged)

- Per `00-requirements.md` OOS1–OOS7.

## Traceability

| Sub-phase | Requirements |
| --- | --- |
| SP1 | `R4`, `R2` |
| SP2 | `R2`, `R3`, `R5` |
| SP3 | `R1`, `R6`, `R10` |
| SP4 | `R7`, `R8`, `R9`, `R11` |

## Subagent Capability Probe

- Subagent tools available; plan authored by controller.
- Delegation Decision Basis: planning phase; self-audit sufficient.

## Audit Execution Mode

- self-audit

## Coverage Gate

- [x] Every in-scope `R1`–`R11` maps to at least one sub-phase
- [x] UI plan matches addendum paths and copy ownership
- [x] Verification plan includes SEA rebuild and browser QA

Coverage: PASS

## Approval Gate

- [x] Plan is implementable without new persistence systems
- [x] Diff scope stays within bridge, runtime-ui, provider-account

Approval: PASS

Audit: PASS
