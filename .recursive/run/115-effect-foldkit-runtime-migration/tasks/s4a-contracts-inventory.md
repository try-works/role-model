# S4a contracts and callers inventory with dispositions (public, R19)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R19 requires an actual enumeration of operations/resources/callers with an explicit disposition each (pure / existing Effect / adapter / convert), cited so that planned and implemented cannot be confused. This slice produces that inventory and makes it machine-checkable.

## Read first
1. `00-requirements.md` R19 (lines 182-188).
2. The public packages under `role-model-router/packages/` and the host app `role-model-router/apps/runtime-host-bridge/src/`.
3. `evidence/other/effect-4.0.6-api-notes.md` so the dispositions use the APIs that actually exist in the pin.

## Required work
1. A JSON inventory at `evidence/other/s4-contracts-inventory.json` listing the real surfaces the migration must account for: for each entry an id, kind (operation/resource/caller), the file and line that defines it, its callers (file:line), and a disposition from exactly {pure, existing-effect, adapter, convert}, plus a one-line reason.
2. Scope rule: cover the packages and host modules that the requirements name, and say explicitly which areas you did NOT inventory (the private repo is out of scope for this public artifact).
3. A maintained test `scripts/s4-contracts-inventory.test.mjs` (node:test) that fails when the inventory drifts from the code: every cited definition and caller path must exist, every line must be within the file, every disposition must be in the allowed set, ids must be unique, and a deliberately wrong citation must fail (capture that as the behavioural RED).
4. Keep it honest: do not mark something `existing-effect` unless it demonstrably uses the vendored Effect already; do not mark `pure` because it looks synchronous without checking.

## Files you may write
- `evidence/other/s4-contracts-inventory.json`
- `scripts/s4-contracts-inventory.test.mjs`
- `evidence/logs/s4a-*` and `evidence/other/s4a-tdd.json`

Do not modify product code in this slice.

## Strict TDD
Write the test first against a tiny hand-written sample inventory, then grow the real inventory until it passes. Report: entry count per kind and per disposition, what you excluded and why, the drift RED, and any surface you could not classify honestly.