# S12c three more RM3 primitives with Scene tests (public, R7/R8)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The button primitive and the app shell are accepted and verified. Extend coverage to the form controls the diagnostics and route views need first.

## Read first
1. `evidence/other/foldkit-0.169-api-notes.md` (sections 2 and 5).
2. `role-model-router/packages/ui/src/foldkit-button.ts` as the accepted shape to follow, and its Scene test.
3. `role-model-router/apps/runtime-ui/app/lib/design-system.ts` for the RM3 input/select/checkbox class helpers and `DESIGN_SYSTEM.md` for the written grammar, noting that the doc is stale where the two disagree - the live helpers win.
4. `vendor/foldkit/packages/ui/src` for the closest upstream component (input, checkbox) to see what focus/keyboard behaviour the framework expects the parent to own.

## Required work
1. `foldkit-input.ts`, `foldkit-textarea.ts`, `foldkit-checkbox.ts` in `role-model-router/packages/ui/src`, same shape as the button: pure `view(config, h)`, no React import, config carrying value/placeholder/disabled/id/name/ariaLabel/message handlers as appropriate.
2. Each must preserve the RM3 class contract used by the live app (copy the class strings from the live helpers, not from the doc).
3. Scene tests in `role-model-router/packages/foldkit/test/` proving: typing/input emits the right Message payload, disabled controls emit nothing, the accessible name and label association are present, and checkbox checked state reflects the model rather than local state.
4. Where a control needs a StableId for label association, follow the digest's slotId/keyed guidance rather than inventing ids.

## Files you may write
- the three new modules and their Scene tests
- `role-model-router/packages/ui/package.json` only for the additive exports the new modules need
- `evidence/logs/s12c-*` and `evidence/other/s12c-tdd.json`

Do not touch the button primitive, the app shell, React modules, wrappers, root, lockfile, vendor, or the private repo.

## Strict TDD
Scene test first for each control. If a control's behaviour cannot be expressed through Scene, say so and use the lowest honest assertion.
Report: the live RM3 helpers you copied, any doc-versus-code disagreement, RED/GREEN per control, counts, and anything not preserved.