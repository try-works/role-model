Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `00 Worktree`
Status: `LOCKED`
LockedAt: `2026-06-11T04:22:13Z`
LockHash: `d4893012208224d7b8535e765e6f625823c40cf4294c4b3964efa0793e2dc796`
Workflow version: `recursive-mode-audit-v2`
Addendum: `01`
Inputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/00-worktree.md` (locked; records repo-root deviation)
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/00-requirements.llama-swap-setup-scaffold-and-ui-hints.addendum-01.md`
- `/.agents/skills/recursive-worktree/SKILL.md`
Outputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/00-worktree.addendum-01.md`
Scope note: Mandates isolated git worktree execution for all addendum implementation (`R12`–`R16`). Reconciles the locked Phase 0 note that run 38 primary implementation occurred at repository root.

## TODO

- [x] Record required worktree path and branch
- [x] Record bootstrap commands when branch is already checked out at repo root
- [x] Record diff basis continuity with locked `00-worktree.md`
- [x] Record verification that subsequent addendum phases run from worktree only
- [x] Worktree created and verified before addendum implementation begins
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Worktree mandate

All addendum implementation for `R12`–`R16` **must** execute from:

| Field | Value |
| --- | --- |
| Worktree path | `D:\DEV\role-model\.worktrees\38-local-model-roles-peer-llama-swap-split\` |
| Branch | `recursive/38-local-model-roles-peer-llama-swap-split` |
| Base commit (unchanged) | `c269a6d2e462dc0ca80539f1684785b2fc3b0960` |
| Diff command | `git diff --name-only c269a6d2e462dc0ca80539f1684785b2fc3b0960` |

Forbidden for addendum work:

- Editing product code from repository root `D:\DEV\role-model\` while on the run-38 branch
- Running addendum tests/build/SEA from repo root paths when the worktree exists
- Creating or editing run-38 control-plane docs (requirements, addenda, phase artifacts, evidence) under repository root `D:\DEV\role-model\.recursive\run\38-...`

## Run control-plane location (worktree-only)

All run-38 artifacts — including **addenda** — live under the worktree, not repository root:

| Artifact class | Worktree path |
| --- | --- |
| Requirements + locked phases | `.recursive/run/38-local-model-roles-peer-llama-swap-split/*.md` |
| Addenda | `.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/**` |
| Evidence | `.recursive/run/38-local-model-roles-peer-llama-swap-split/evidence/**` |

Full path prefix:

`D:\DEV\role-model\.worktrees\38-local-model-roles-peer-llama-swap-split\.recursive\run\38-local-model-roles-peer-llama-swap-split\`

Repository root `D:\DEV\role-model\.recursive\run\38-...` must not be used; remove any duplicate copy there after bootstrap.

## Reconciliation with locked Phase 0 deviation

Locked `00-worktree.md` records that run 38 `R1`–`R11` landed on repo root because `.worktrees/38-local-model-roles-peer-llama-swap-split/` was never created. This addendum does **not** rewrite that history.

Before any addendum product edits:

1. Ensure branch `recursive/38-local-model-roles-peer-llama-swap-split` contains all run-38 commits and working-tree changes (commit or stash repo-root state if needed).
2. Create the worktree (commands below).
3. Verify worktree tree matches expected run-38 product diff vs `c269a6d`.
4. Perform all `R12`–`R16` edits only inside the worktree.

## Bootstrap commands

From `D:\DEV\role-model`:

```powershell
# If the feature branch is checked out at repo root, move root to main first:
git checkout main

# Create worktree on existing branch (preferred when branch already exists):
git worktree add .worktrees/38-local-model-roles-peer-llama-swap-split recursive/38-local-model-roles-peer-llama-swap-split

cd .worktrees/38-local-model-roles-peer-llama-swap-split
corepack pnpm install
cd role-model-router
corepack pnpm exec vitest run apps/runtime-host-bridge/src/local-model-role-bindings.test.ts apps/runtime-ui/app/lib/design-system.test.ts
```

If `git worktree add` fails because the branch is still checked out elsewhere:

```powershell
git checkout main
git worktree add .worktrees/38-local-model-roles-peer-llama-swap-split recursive/38-local-model-roles-peer-llama-swap-split
```

If the worktree directory already exists, verify and use it:

```powershell
cd D:\DEV\role-model\.worktrees\38-local-model-roles-peer-llama-swap-split
git status
git branch --show-current
```

## Product path prefix (worktree-relative)

All addendum acceptance paths in `00-requirements.llama-swap-setup-scaffold-and-ui-hints.addendum-01.md` are relative to:

`D:\DEV\role-model\.worktrees\38-local-model-roles-peer-llama-swap-split\role-model-router\`

Example: `apps/runtime-ui/app/lib/llama-swap-setup.ts` → full path under worktree `role-model-router/`.

## Verification record (fill on bootstrap)

| Check | Expected | Actual |
| --- | --- | --- |
| Worktree exists | `.worktrees/38-local-model-roles-peer-llama-swap-split/` | **PASS** — created 2026-06-11 |
| Branch | `recursive/38-local-model-roles-peer-llama-swap-split` | **PASS** |
| Run-38 tests baseline | scoped vitest PASS in worktree | **PASS** — 26/26 (`local-model-role-bindings` + `design-system`) |
| Repo root branch | `main` (or documented exception) | **PASS** — `main` clean product tree; run-38 edits in worktree only |

Evidence path (on bootstrap): `evidence/logs/worktree-bootstrap-addendum-01.log`

Bootstrap completed 2026-06-11. Uncommitted run-38 product + run artifacts restored via `git stash` → `git worktree add` → `git stash pop` in worktree. Control-plane canonical copy is worktree-only (repo-root duplicate removed).

## Traceability

- `R16` → this artifact is the authoritative worktree contract for addendum implementation
- Parent `00-worktree.md` → diff basis preserved; deviation reconciled forward, not retro-edited

## Coverage Gate

- [x] Worktree path and branch recorded
- [x] Bootstrap commands documented for branch-already-checked-out case
- [x] Diff basis aligned with locked Phase 0
- [x] Forbidden repo-root product and control-plane edits stated
- [x] Worktree physically created and verification table filled
- [x] Addenda path recorded as worktree-only

Coverage: PASS

## Approval Gate

- [x] Addendum implementation has an executable isolation contract
- [x] Does not edit locked `00-worktree.md`
- [x] User approved worktree bootstrap before implementation (closeout 2026-06-08)

Approval: PASS

Audit: PASS
