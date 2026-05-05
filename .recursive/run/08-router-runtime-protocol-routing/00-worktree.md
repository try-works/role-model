Run: `/.recursive/run/08-router-runtime-protocol-routing/`
Phase: `00 Worktree`
Status: `LOCKED`
LockedAt: `2026-05-05T04:13:59Z`
LockHash: `cefaa8937c7d3a4180e293eaac4d7a55dc719dd4b65ff6df66c83bb83f07c8f3`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- Current git repository state
Outputs:
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
Scope note: This document records the Phase 0 worktree context and the executable diff basis that all later audited phases for run `08` must reuse.

## TODO

- [x] Confirm the selected worktree location and isolation approach
- [x] Confirm the base branch and worktree branch values
- [x] Run setup and verify the clean or explicitly acknowledged baseline state
- [x] Confirm the diff basis fields still match live git state
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Directory Selection

- Repository root: `D:\DEV\role-model`
- Preferred in-repo worktree location: `D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing`
- Selected isolated worktree location: `D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing`
- Git-ignore verification: `git check-ignore -v .worktrees` resolved through the root `.gitignore` entry `.worktrees/`, so the in-repo worktree root is already ignored
- Subsequent run work must execute from the isolated worktree, not from the protected checkout on `main`

## Safety Verification

- Protected checkout branch before worktree creation: `main`
- Protected checkout status before creation: clean
- Protected checkout status after creation: clean
- Isolated feature branch: `recursive/08-router-runtime-protocol-routing`
- Isolation rule for this run: write recursive artifacts and any run-local changes from the isolated in-repo worktree only

## Worktree Creation

- Worktree creation command:
  - `git worktree add D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing -b recursive/08-router-runtime-protocol-routing main`
- Selected worktree branch: `recursive/08-router-runtime-protocol-routing`
- Base commit used to create the worktree: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Creation result: run `08` starts from merged `main` after run `07-router-runtime-endpoint-registry-context-envelope` was committed and merged

## Main Branch Protection

- Protected checkout remains on `main`
- The run branch exists in the isolated worktree at `D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing`
- No exception to the isolated-worktree rule was taken

## Project Setup

- Commands executed from `D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing`:
  - `corepack pnpm install --frozen-lockfile`
- Results:
  - workspace dependencies installed successfully in the selected worktree
  - Node emitted the existing `DEP0169` `url.parse()` deprecation warning during install and command execution
  - baseline command execution produced incidental churn in `packages/protocol-types/src/generated.ts`; that file was restored to `HEAD` before Phase 0 was finalized so later diffs stay anchored to intentional run-08 work

## Test Baseline Verification

- Authoritative baseline commands executed from the real worktree path:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Results:
  - `schemas:validate`: PASS (`Validated 19 schema file(s).` and `Validated 28 fixture file(s).`)
  - `build`: FAIL in `packages/schema-tools/src/validate-schemas.ts` while generating protocol types because Biome reported `No files were processed in the specified paths` and the generator raised `Biome formatting failed for generated protocol types with exit code 1.`
  - `test`: FAIL on `packages/schema-tools/test/generate-protocol-types.test.ts` with the same underlying Biome/generated-types formatting failure
  - `smoke`: PASS and emitted the expected linked runtime artifacts under `runtime-output\`
  - per-command evidence logs were written under `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/baseline/`
- Explicit baseline acknowledgement:
  - the selected worktree is setup-complete and ready for downstream phases, but the current baseline is not fully green because `build` and `test` share the schema-tools/Biome generated-types failure above
  - this result matches the inherited baseline observed during runs `04-router-runtime-architecture-lock`, `05-router-runtime-catalog-foundation`, `06-router-runtime-provider-accounts-sqlite-memory`, and `07-router-runtime-endpoint-registry-context-envelope`, so it is treated as the currently observed merged baseline in the selected execution context rather than as a regression introduced by run `08`
  - `git restore packages/protocol-types/src/generated.ts` was run after baseline verification so the worktree returned to a clean intentional-diff state apart from the new evidence logs

## Worktree Context

- Base branch: `main`
- Worktree branch: `recursive/08-router-runtime-protocol-routing`
- Base commit: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`

## Diff Basis For Later Audits

- Baseline type: `local commit`
- Baseline reference: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Comparison reference: `working-tree`
- Normalized baseline: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Base branch: `main`
- Worktree branch: `recursive/08-router-runtime-protocol-routing`
- Diff basis notes: `Phase 0 anchors later audited phases to the merged main-branch commit that already includes the completed run-07 endpoint-registry, context-envelope, and retrieval-receipt baseline.`

## Traceability

- `R4` -> Phase 0 creates an isolated worktree, records the real baseline command results, and preserves the inherited baseline failure as an explicit acknowledged condition instead of leaving it implicit
- Recursive workflow safety -> Phase 0 records a reusable executable diff basis before audited phases begin

## Coverage Gate

- [x] Worktree location and branch context are recorded
- [x] Setup and clean or explicitly acknowledged baseline verification are recorded
- [x] Diff basis fields are executable against live git state

Coverage: PASS

## Approval Gate

- [x] Phase 0 context is ready for downstream audited phases
- [x] No unresolved setup or diff-basis inconsistencies remain

Approval: PASS
