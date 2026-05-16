Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T22:24:19Z`
LockHash: `17ea1faaddf8983dde7b591d309d983d71aff539f28ec319b8caff28067c284e`
Addendum: `09`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run77-biome-debt.addendum-08.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run77.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run77-repro.red.log`
- User direction: continue with the fixes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run77-biome-debt.addendum-09.md`
Scope note: This addendum expands run 31 from the run-76 remediation to the next masked vendored-Svelte/runtime-host-bridge Biome debt layer exposed by run `77`.

## TODO

- [x] Record the run-77 file scope from GitHub CI
- [x] Define the bounded formatter-plus-lint cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-77 blocker revealed after the run-76 remediation:

1. format the vendored Svelte helper/test files
2. organize imports in the three vendored files Biome flagged
3. repair the vendored Svelte lint findings in `main.ts`, `markdown.ts`, and `markdown.test.ts`
4. replace the two `noNonNullAssertion` sites in `role-model-router/apps/runtime-host-bridge/src/index.ts`
5. rerun focused Biome validation on the same bounded set
6. rerun branch GitHub CI

## Planned Changes by File

- `role-model-router/vendor/llama-swap/ui-svelte/src/main.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/speechApi.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/sdApi.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/rerankApi.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/modelUtils.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.test.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/imageApi.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`

## Implementation Steps

1. Preserve `phase4-branch-ci-run77.red.log` and `phase4-branch-ci-run77-repro.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact run-77 file set.
3. Apply Biome-managed formatting and organize-import cleanup to the full run-77 file set.
4. Manually repair:
   - `src/main.ts` by guarding the mount target instead of using `!`
   - `src/lib/markdown.ts` by removing the unnecessary `continue`, using template literals, and avoiding parameter reassignment with a local variable
   - `src/index.ts` by replacing repeated/asserted lookups with local guarded values
5. Re-run the focused local Biome check over the same 9-file set and capture GREEN evidence.
6. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run77.red.log`
  - preserve `phase4-branch-ci-run77-repro.red.log`
- GREEN plan:
  - run `corepack pnpm exec biome check role-model-router/vendor/llama-swap/ui-svelte/src/main.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/speechApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/sdApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/rerankApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/modelUtils.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.test.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/imageApi.ts role-model-router/apps/runtime-host-bridge/src/index.ts`
  - rerun branch CI
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe role-model-router/vendor/llama-swap/ui-svelte/src/main.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/speechApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/sdApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/rerankApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/modelUtils.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.test.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/imageApi.ts role-model-router/apps/runtime-host-bridge/src/index.ts`
  - focused green check: `corepack pnpm exec biome check role-model-router/vendor/llama-swap/ui-svelte/src/main.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/speechApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/sdApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/rerankApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/modelUtils.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.test.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/imageApi.ts role-model-router/apps/runtime-host-bridge/src/index.ts`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Once the run-77 file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the 9 GitHub-reported files unless a later branch-CI run surfaces a new explicit blocker.
- If the write pass leaves `src/index.ts` or `src/lib/markdown.ts` red, repair only those hotspots manually and rerun the bounded check before widening further.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run76-biome-debt.addendum-07.md`

This addendum adds the bounded run-77 vendored-Svelte/runtime-host-bridge Biome debt cleanup to the run.

## Traceability

- `R4` -> the widened parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the run-77 surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] The manual lint repairs are explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-77 remediation needed to move branch CI past the next vendored-Svelte/runtime-host-bridge Biome debt layer.
Audit: PASS
