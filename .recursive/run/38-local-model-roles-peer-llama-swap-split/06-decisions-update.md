Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-11T02:55:03Z`
LockHash: `b367f7931ce91902fb4b487e8c605f6dd9d5eab9dda64db2858830876651c0f4`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/05-manual-qa.md`
Outputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/06-decisions-update.md`
- `/.recursive/DECISIONS.md` (receipt — apply on lock)
Scope note: Delta receipt for global decisions ledger entry for run 38.

## TODO

- [x] Summarize what changed and why
- [x] Record follow-ups
- [x] Complete gates

## Decisions Changes Applied

- Add `### Run \`38-local-model-roles-peer-llama-swap-split\`` entry to `/.recursive/DECISIONS.md`
- Record split Local UI (chooser + peer models + llama-swap models)
- Record split local APIs and `local-model-role-bindings` router integration
- Record peer wildcard validation and sync merge persistence

## Rationale

- Local models were routable but not role-aware; mixed UI confused operators; peer roles were wiped on sync

## Resulting Decision Entry

- `/.recursive/DECISIONS.md#run-38-local-model-roles-peer-llama-swap-split`

## Decision summary (for `DECISIONS.md`)

**Run `38-local-model-roles-peer-llama-swap-split`**

- **What changed:** Local model role assignment now works for peer-backed models end-to-end (UI, split APIs, provider-account persistence, router dynamic bindings). Local UI splits peer and llama-swap into separate operator surfaces with a chooser and legacy redirects. llama-swap role APIs and UI are implemented; operator proof deferred where llama-swap is disabled.
- **Why:** Peer and llama-swap were mixed on one page, peer roles were wiped on sync, and router bindings ignored llama-swap registry endpoints — blocking role-aware local routing.
- **How:** Extended existing persistence (`modelRoleBindings`, `model-overrides.json`), added `local-model-role-bindings.ts`, split HTTP and UI routes per addendum, strict TDD, SEA rebuild, probe regression, browser QA.
- **What was not done:** llama-swap live load+role browser proof in operator env; full worktree isolation (implemented on branch from `main` @ `c269a6d`).
- **Follow-ups:** Rebuild SEA to pick up peer-models loading flash fix; optional llama-swap-enabled QA for `R3`/`R7` scenario B.

## Traceability

- `R1` → decision entry records split Local UI and legacy redirects
- `R2` → decision entry records peer load/roles APIs and sync merge
- `R3` → decision entry records llama-swap APIs/UI (live load proof deferred)
- `R4` → decision entry records wildcard peer validation
- `R5` → decision entry records `local-model-role-bindings` integration
- `R6` → decision entry records candidates/telemetry role readback
- `R7` → decision entry records peer routing proof on `:3456`
- `R8` → decision entry records strict TDD discipline
- `R9` → decision entry records SEA rebuild + browser QA
- `R10` → decision entry records design-system IA update
- `R11` → decision entry records probe regression green

## Coverage Gate

- [x] Decision delta is concise and points to run folder
- [x] Follow-ups are actionable

Coverage: PASS

## Approval Gate

- [x] Ready to append to `/.recursive/DECISIONS.md` on Phase 6 lock

Approval: PASS

Audit: PASS
