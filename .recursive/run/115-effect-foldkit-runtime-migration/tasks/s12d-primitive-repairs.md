# S12d repair the three RM3 primitives from the independent review (public, R7/R8)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The reviewer's findings are accepted. Fix them in the primitives; do not weaken a test to get green.

## Required fixes
1. CHECKBOX (blocking): the live component exposes `onClick` and `onPointerDown`, and `apps/runtime-ui/app/components/local-model-role-picker.tsx:306-321` uses both to preventDefault/stopPropagation inside a `<summary>` so the checkbox does not also expand it. Add optional `onClick`/`onPointerDown` config hooks (event-capable, so a caller can preventDefault) and keep the default toggle behaviour when they are absent. Prove it with a Scene test that a caller-supplied handler runs and can prevent the default toggle.
2. CHECKBOX: `data-disabled` is emitted but the live component never emits it (0 usages). Remove it and fix any test that asserted it.
3. INPUT/TEXTAREA: add `inputMode` and `autoComplete` pass-through; both are used by live call sites (`inputMode` storage-retention.tsx:461, studio-images.tsx:169/178; `autoComplete` operator-controls.tsx:378).
4. CLASS ASSERTIONS: the tests pin 2-3 tokens, so deleting `focus-visible:ring-[3px]`, `placeholder:*`, `shadow-xs` still passes. Assert equality with the full exported constant instead, the way the button test now asserts its full class attribute.
5. ANTI-SLOP: the new files carry findings (input 3, textarea 3, checkbox 5) - `no-runtime-typeof` on typeof checks and an uncommented `id as string`. Fix by narrowing without runtime typeof where possible, or add a `SAFETY:` justification. Re-run the lint tool with ABSOLUTE paths (a relative target from this linked worktree scans zero files and reports a false clean).
6. BUTTON CONSISTENCY: the button still uses `cn`/tailwind-merge while the live helpers and the new controls compose by plain concatenation. Align the button with live composition and keep its tests green; if that changes rendered classes, say exactly which.
7. EVIDENCE CORRECTIONS in `evidence/other/s12c-tdd.json`: drop the third claimed doc-vs-code disagreement (DESIGN_SYSTEM.md:391's 13px/18px nav scale is correct for the live `selectFieldClassName`; the field label is a different element at 12/16), and correct the two false statements: the s12b button test does pass now (7/7), and `packages/ui` DOES have `typecheck:foldkit` + `tsconfig.foldkit.json` with tsc exit 0.

## Files you may write
- `role-model-router/packages/ui/src/foldkit-{button,input,textarea,checkbox}.ts`
- the Scene tests under `role-model-router/packages/foldkit/test/s12b-*`/`s12c-*`
- `evidence/other/s12c-tdd.json` and new `evidence/logs/s12d-*`

Nothing else: no React modules, wrappers, root, lockfile, vendor, private repo.

## Rules
- No installs, no commits, no subagents.
- Run the Scene tests with happy-dom and the primitives typecheck (`npm run typecheck:foldkit` equivalent: `node ../../../../node_modules/typescript/bin/tsc -p tsconfig.foldkit.json` from packages/ui).
Report: each fix with its test, the exact class-constant assertions added, lint before/after with absolute paths, and the evidence corrections.