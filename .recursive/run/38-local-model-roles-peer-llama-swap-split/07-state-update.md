Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `07 State Update`
Status: `LOCKED`
LockedAt: `2026-06-11T02:55:03Z`
LockHash: `d75c04f143d046fd8de167640816fa1d873deca937283a50e14597bed2ba416c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/06-decisions-update.md`
Outputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/07-state-update.md`
- `/.recursive/STATE.md` (receipt — apply on lock)
Scope note: Delta receipt for global state truths after run 38.

## TODO

- [x] List new operator-surface truths
- [x] List routing/persistence truths
- [x] Complete gates

## State Changes Applied

- Append run-38 bullets to `/.recursive/STATE.md` Current State section (see deltas below)

## Rationale

- `STATE.md` must reflect operator-visible split Local IA and local role persistence truths post-run

## Resulting State Summary

- Local pillar is split; peer roles persist and feed router bindings; llama-swap role path implemented

## State deltas (for `STATE.md`)

- `/role-model-router/apps/runtime-ui/` Local pillar now uses **Choose local backend** at `/app/local/choose` with separate **Peer models** (`/app/local/peer-models`) and **Llama-swap models** (`/app/local/llama-swap/models`) pages; legacy `/app/local/models` redirects to the chooser.
- Llama-swap satellite routes live under `/app/local/llama-swap/*` with legacy redirects from `/app/local/swap`, `/app/local/policy`, `/app/local/logs`, `/app/local/matrix`.
- `/role-model-router/apps/runtime-host-bridge/` exposes split local model APIs for peer and llama-swap list/load/roles/unload; peer roles persist on provider-account `modelRoleBindings` and survive `syncLocalPeerState` merge; llama-swap roles persist on `model-overrides.json` `roleIds`.
- `local-model-role-bindings.ts` feeds `buildRuntimeRoleBindings` for peer-backed and llama-swap registry endpoints so assigned local roles appear in router candidates and endpoint readback.
- `packages/provider-account/` accepts `modelRoleBindings` on peer accounts with empty `allowedModels` (wildcard semantics).
- Packaged runtime validation on `:3456` proves peer role assignment + routing regression (0 BRIDGE_CRASH) with operator baseline `lfm2.5-8b-a1b` + `moonshot/kimi-k2.6` + `mixed.local-remote`.

## Traceability

- `R1` → split routes and chooser documented in STATE
- `R2` → peer persistence and APIs documented in STATE
- `R3` → llama-swap role persistence documented in STATE
- `R4` → wildcard validation documented in STATE
- `R5` → dynamic bindings module documented in STATE
- `R6` → candidates readback documented in STATE
- `R7` → peer routing proof on packaged runtime documented in STATE
- `R8` → strict TDD cited in run artifacts referenced by STATE
- `R9` → SEA + browser QA documented in STATE
- `R10` → design-system split IA documented in STATE
- `R11` → 0 BRIDGE_CRASH regression documented in STATE

## Coverage Gate

- [x] Deltas are factual post-run truths, not intentions
- [x] Paths are repo-absolute style consistent with `STATE.md`

Coverage: PASS

## Approval Gate

- [x] Ready to merge into `/.recursive/STATE.md` on Phase 7 lock

Approval: PASS

Audit: PASS
