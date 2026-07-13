Run: `/.recursive/run/69-benchmark-scoring-integrity/`
Phase: `00 Worktree`
Status: `DRAFT`
Inputs:
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
- current git state observed from `D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity`
Outputs:
- `/.recursive/run/69-benchmark-scoring-integrity/00-worktree.md`
Scope note: This standalone run 69 must create its own isolated implementation worktree, but the source baseline for that worktree is run 68 rather than root `main`. This artifact records that requirement so Phase 0 does not silently branch from the wrong baseline.

## TODO

- [x] Record that run 69 is a standalone run with its own Phase 0 artifact
- [x] Record run 68 as the required source baseline for implementation
- [x] Record the current observed source branch and source worktree path
- [ ] Record the actual run 69 worktree creation command during Phase 0 execution
- [ ] Record the actual run 69 baseline commit or snapshot during Phase 0 execution
- [ ] Confirm the clean baseline command results in the new run 69 worktree

## Directory Selection

- Repository root for the source baseline: `D:\DEV\role-model\.worktrees\68-codex-subscription-tool-call-parity`
- Preferred new run worktree location: `D:\DEV\role-model\.worktrees\69-benchmark-scoring-integrity`
- This run is standalone from run 68 at the artifact level, but it must fork from run 68's implementation state rather than from root `main`.

## Safety Verification

- Source baseline branch observed on `2026-07-13`: `recursive/68-codex-subscription-tool-call-parity`
- Source baseline HEAD observed on `2026-07-13` after the run 68 implementation commit: `4b1928cfff5d194599a3125e95f7e9c88cb81f3c`
- The run 68 implementation baseline now exists as a concrete commit and is the preferred fork point for run 69.
- The source baseline worktree is still not clean because it contains local rebuild residue under `role-model-router/vendor/llama-swap/dist-assets/win32-x64/` plus this new run 69 draft tree.
- Phase 0 for run 69 should branch from commit `4b1928cfff5d194599a3125e95f7e9c88cb81f3c` or from a clean snapshot derived from it rather than from the current dirty worktree.

## Worktree Creation

- Intended source branch: `recursive/68-codex-subscription-tool-call-parity`
- Intended standalone run branch: `recursive/69-benchmark-scoring-integrity`
- Record the exact creation command and resulting worktree path when Phase 0 is executed.

## Main Branch Protection

- Run 69 must not branch from `D:\DEV\role-model` on `main`.
- If Phase 0 needs a clean snapshot beyond commit `4b1928cfff5d194599a3125e95f7e9c88cb81f3c`, record that snapshot step here rather than silently mixing the two runs.

## Diff Basis For Later Audits

- Baseline type: `TBD during Phase 0 execution`
- Baseline reference: `must resolve to commit 4b1928cfff5d194599a3125e95f7e9c88cb81f3c or to a clean snapshot derived from it, not root main`
- Comparison reference: `working-tree`
- Normalized diff command: `TBD during Phase 0 execution`

## Traceability

- `R1` in `00-requirements.md` requires run 69 to implement from the run 68 baseline rather than from `main`.

## Coverage Gate

Coverage: PASS

- This artifact makes run 69 standalone while still binding its implementation baseline to run 68.
- The remaining unchecked TODO items are Phase 0 execution tasks, not missing proposal decisions.

## Approval Gate

Approval: PASS

- The standalone-run requirement is explicit.
- The implementation-baseline requirement is explicit.
- The remaining work is the normal Phase 0 execution detail, not unresolved scoping.
