Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `03 IMPLEMENTATION SUMMARY`
Status: `LOCKED`
LockedAt: `2026-05-11T23:32:35Z`
LockHash: `21c21a8de116d8d9b85b9f6b31eec55a314458a4599a600578a2eb9c82ab60fa`
Addendum: `25`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-local-biome-repowide-parity.addendum-25.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-repo-wide.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-local-biome-after-runtime-package-format.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-semantic-remainder.red.log`
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/03-implementation-summary.branch-local-biome-repowide-parity.addendum-25.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-repo-wide.write.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-semantic-remainder.green.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-repo-wide.green.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-biome-repo-wide.green.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-local-lint.green.log`
- `packages/schema-tools/test/recursive-biome-repo-wide.test.ts`
- `packages/schema-tools/test/recursive-biome-semantic-remainder.test.ts`
Scope note: This addendum records the repo-wide local Biome parity sweep, the semantic remainder fixes it exposed, and the final green local lint proof.

## TODO

- [x] Add a repo-wide failing regression for local Biome parity
- [x] Preserve RED evidence for the repo-wide failure
- [x] Apply the repo-wide formatter sweep
- [x] Handle the bounded semantic lint remainder surfaced by the sweep
- [x] Capture repo-wide GREEN evidence and the full local lint proof

## TDD Cycle

### RED

- Added `packages/schema-tools/test/recursive-biome-repo-wide.test.ts`, a focused Vitest regression that shells out to `corepack pnpm exec biome check .` over the full repository.
- Ran the repo-wide regression before implementation changes and preserved the failure in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-repo-wide.red.log`
- After the repo-wide write pass exposed a smaller non-format remainder, added `packages/schema-tools/test/recursive-biome-semantic-remainder.test.ts` and preserved its red proof in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-semantic-remainder.red.log`

### GREEN

- Ran a repo-wide write pass:
  - `corepack pnpm exec biome check --write --unsafe .`
- Captured the formatter-sweep evidence in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-repo-wide.write.log`
- The repo-wide write cleared the residual formatter debt and exposed a bounded 7-file semantic lint remainder in runtime-ui and vendored Svelte files, followed by one final vendored `CaptureDialog.svelte` assignment-in-expression site.
- Applied the minimal manual fixes in:
  - `role-model-router/apps/runtime-ui/app/routes/local-models.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/local-policy.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/studio-audio.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
  - `role-model-router/vendor/llama-swap/ui-svelte/src/components/ModelsPanel.svelte`
  - `role-model-router/vendor/llama-swap/ui-svelte/src/components/playground/ChatMessage.svelte`
  - `role-model-router/vendor/llama-swap/ui-svelte/src/components/CaptureDialog.svelte`
- Re-ran the focused semantic remainder regression and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-semantic-remainder.green.log`
- Re-ran the repo-wide regression and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-repo-wide.green.log`
- Re-ran repo-wide Biome and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-biome-repo-wide.green.log`
- Re-ran the full local lint script and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-local-lint.green.log`

## Implemented Changes

### Tests

- Added `packages/schema-tools/test/recursive-biome-repo-wide.test.ts`
  - locks repo-wide local Biome parity into a repeatable regression
- Added `packages/schema-tools/test/recursive-biome-semantic-remainder.test.ts`
  - locks the final 7-file semantic lint remainder into a fast bounded regression while staying inside the repo-wide parity slice

### Repo-wide formatter sweep

- Applied repo-wide Biome formatting across the remaining repository surface, including workspace configs, runtime-ui routes, role-model-router package manifests, JSON fixtures, CSS, recursive evidence JSON, and vendored UI files.

### Manual semantic remainder repairs

- `role-model-router/apps/runtime-ui/app/routes/local-models.tsx`
  - added explicit `type="button"` to route actions and associated override labels with their inputs via stable generated ids
- `role-model-router/apps/runtime-ui/app/routes/local-policy.tsx`
  - associated numeric field labels with inputs and added explicit button types to the save/reset actions
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - replaced the array-index key on local model rows with a derived content-plus-occurrence key
- `role-model-router/apps/runtime-ui/app/routes/studio-audio.tsx`
  - added a captions track element to the speech playback audio control
- `role-model-router/apps/runtime-ui/app/routes/studio-images.tsx`
  - replaced the redundant `image` alt wording with non-redundant generated-result text
- `role-model-router/vendor/llama-swap/ui-svelte/src/components/ModelsPanel.svelte`
  - replaced assignment-in-expression timeout callbacks with block-bodied callbacks
- `role-model-router/vendor/llama-swap/ui-svelte/src/components/playground/ChatMessage.svelte`
  - replaced assignment-in-expression timeout callbacks and changed the copy-button attachment loop from `forEach` to `for...of`
- `role-model-router/vendor/llama-swap/ui-svelte/src/components/CaptureDialog.svelte`
  - replaced the final two assignment-in-expression timeout callbacks with block-bodied callbacks

## Result

- The focused semantic remainder regression now passes.
- The repo-wide Biome regression now passes.
- Repo-wide `corepack pnpm exec biome check .` now passes.
- The full local lint command CI uses (`corepack pnpm run lint`) now passes.

## Traceability

- `R4` -> local-first parity clearing now completes via the repo-wide regression, repo-wide write pass, bounded semantic remainder regression, and final full lint proof
- `R5` -> the widened scope stayed evidence-backed and narrowed again immediately when the first semantic remainder surfaced

## Coverage Gate

- [x] RED failure preserved before repo-wide implementation
- [x] GREEN evidence preserved after repo-wide implementation
- [x] Semantic remainder fixes recorded with rationale
- [x] Full local lint proof captured

Coverage: PASS

## Approval Gate

- [x] Repo-wide local Biome parity is cleared
- [x] The full local lint surface is green
- [x] The branch is ready to push and confirm on GitHub Actions

Approval: PASS

## Audit Verdict

- Audit summary: local parity is now restored end-to-end through a repo-wide Biome regression and sweep plus a bounded semantic lint cleanup, leaving the same local lint surface CI runs fully green.
Audit: PASS
