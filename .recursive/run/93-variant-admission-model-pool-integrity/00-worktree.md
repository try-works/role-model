Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `00 Worktree`
Status: `LOCKED`
LockedAt: `2026-08-22T00:11:21Z`
LockHash: `475fb5cca6a6bcad6139f76b1cdd2f5b863588914305e4bf89259af94baf6946`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- Current `origin/dev` worktree state
Outputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-worktree.md`
Scope note: This artifact records the isolated workspace and executable diff basis for all later audited phases.

## TODO

- [x] Confirm the selected worktree location and isolation approach.
- [x] Confirm base and worktree branch values.
- [x] Run dependency setup and record a clean test baseline before Phase 1.
- [x] Confirm diff-basis fields match the current worktree.
- [x] Complete final Phase 0 coverage and approval gates after baseline testing.

## Directory Selection

- Repository root: `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity`
- Selected isolated worktree: `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity`
- The ordinary `D:\DEV\role-model` checkout is not used because it contains unrelated user changes.

## Safety Verification

- The worktree was created from `origin/dev` with no inherited working-tree modifications.
- User runtime state, credentials, and Stage-RC state are prohibited as fixtures.
- Package/isolated-runtime evidence must stay in this run's evidence tree or a declared D: temporary directory.

## Worktree Creation

- Worktree branch: `recursive/93-variant-admission-model-pool-integrity`
- Base ref: `origin/dev`
- Base commit: `1aab0512ce23aacc50cea66c2926e374be1e249e`

## Main Branch Protection

- This run changes neither `dev`, `stage`, nor `main` directly.
- Promotion and release publication are out of scope until separately authorized.

## Project Setup

- `recursive-init.py` created the run scaffold.
- Its optional training-loader subprocess emitted a Windows CP1252 encoding error while printing an arrow character; scaffold creation succeeded. This is a non-blocking skill-output issue, not verified training output.
- Dependency install: `corepack pnpm install --frozen-lockfile` -> PASS in `2.6s` using pnpm `10.6.5` (workspace, 46 projects). Lockfile up to date. The ignored-build-script warning for Biome, esbuild, sharp, workerd, protobufjs, and `@google/genai` did not block the owning build or baseline tests (matches Run 92).
- Worktree carries only tooling/environment working-tree changes (see Diff Basis notes); these are unrelated to product code and are not part of this run's product diff.

## Test Baseline Verification

Commands:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/configured-model-membership.test.ts test/remove-account-model.test.ts test/restart-rehydration.test.ts test/benchmark-data-clear.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/candidate-space.test.ts app/lib/format-score.test.ts
```

Results:

- Host bridge TypeScript build (`tsc -p tsconfig.json`): PASS.
- Owning backend baseline: PASS; `4` files, `26` tests passed (`configured-model-membership` 4, `remove-account-model` 4, `restart-rehydration` 15, `benchmark-data-clear` 3).
- Owning UI baseline: PASS; `2` files, `15` tests passed (`candidate-space` 10, `format-score` 5).
- Baseline includes sibling-model preservation, last-model account deletion, controller reassignment/clear on eject, restart rehydration without membership expansion, benchmark-data-clear, candidate-space projection, and score-formatting behavior.
- Baseline recorded `2026-08-21` at `08:08` local, before any Run 93 implementation edits.

## Worktree Context

- Base branch: `origin/dev`
- Worktree branch: `recursive/93-variant-admission-model-pool-integrity`
- Base commit: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Worktree HEAD: `cdda5d665fd223a53f5c492ced03d6a29691518f`
- All Phase 1+ commands and edits must run from `D:\DEV\role-model\.worktrees\93-variant-admission-model-pool-integrity`.

## Diff Basis For Later Audits

- Baseline type: `remote ref`
- Baseline reference: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Comparison reference: `working-tree`
- Normalized baseline: `1aab0512ce23aacc50cea66c2926e374be1e249e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 1aab0512ce23aacc50cea66c2926e374be1e249e`
- Diff basis notes: Preserve this basis for all Run 93 audits unless a later locked artifact records a reviewed base update. Baseline is the exact `origin/dev` commit (`1aab0512`) the run branches from. Recursive run artifacts under `.recursive/run/93-variant-admission-model-pool-integrity/` are excluded from product diff accounting by the audit tooling. The worktree's working-tree changes against base are exclusively tooling/environment files (`AGENTS.md`, `.codex/AGENTS.md`, `.recursive/RECURSIVE.md`, `.recursive/memory/*`, `.recursive/scripts/recursive-training-*`, `.cursorrules`, `.github/copilot-instructions.md`, `CLAUDE.md`) and are NOT part of this run's product diff.

## Traceability

- R1-R6 -> isolated implementation and later audited diffs use this exact baseline.
- R7-R8 -> fresh-state package and rebuilt-runtime evidence must not reuse developer state.

## Coverage Gate

- [x] Worktree location and branch context are recorded.
- [x] Setup and clean baseline verification are recorded.
- [x] Diff basis is executable against the live worktree.
Coverage: PASS

## Approval Gate

- [x] Phase 0 context is ready for requirement review.
- [x] No unresolved setup or baseline verification remains.
Approval: PASS
