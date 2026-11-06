# S12b first Foldkit primitive facade with a Scene test (public, R7/R8)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R7/R8 (one first-party primitive, RM3 semantics preserved).

## Read first, in this order
1. `.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/foldkit-0.169-api-notes.md` - the citation-first digest of the vendored Foldkit 0.169 source. Every API you use must be traceable to it or to a line you read yourself.
2. `vendor/foldkit/packages/ui/src/button/index.ts` (the pure attribute builder) and one Submodel component such as `listbox` if you need state.
3. `role-model-router/packages/ui/src` for the existing RM3 button semantics, tokens and variants that must be preserved.

## Required work
1. A first-party Foldkit primitive for a button, living in `role-model-router/packages/ui` as a new module that does NOT import React and does NOT change the existing React exports.
2. It must preserve the RM3 contract the React version has: the variant/size vocabulary, disabled and loading behaviour, accessible name requirements, and the token-driven classes. Where the React version relies on React-specific prop plumbing, document the equivalent explicitly.
3. A Scene test using the vendored `foldkit/test/vitest` matchers (`Scene.scene`, given/click/expectHandled) that proves: the message is emitted on click, a disabled button emits nothing, and the rendered VNode carries the expected accessible attributes. happy-dom is installed; use it as the environment the way the vendored configs do.
4. If the Scene tooling cannot express an assertion you need, say so and use the lowest-level honest assertion instead (for example asserting on the VNode tree) rather than skipping the behaviour.

## Files you may write
- one new module under `role-model-router/packages/ui/src/` and its test file
- `role-model-router/packages/ui/package.json` only if a new devDependency is truly required (report it instead of installing)
- `evidence/logs/s12b-*` and `evidence/other/s12b-tdd.json`

Do not touch existing React modules, the wrappers, root, lockfile, vendor, or the private repo.

## Strict TDD
Write the Scene test first. It should fail because the primitive does not exist; if you can produce a behavioural RED (wrong message payload, disabled emitting), capture that instead and say which you got.

Report: the vendored API lines you relied on, the RM3 contract items preserved and any you could not, RED/GREEN, test counts, and anything unverified.