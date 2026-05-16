Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T23:13:26Z`
LockHash: `56e066d48772bc9dbc51537b6835c5d316456ba6caff858531a33e1b4059d198`
Addendum: `15`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run80-biome-debt.addendum-14.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run80.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run80-repro.red.log`
- User direction: continue fixing locally until ci passes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run80-biome-debt.addendum-15.md`
Scope note: This addendum expands run 31 from the run-79 remediation to the next masked runtime-ui-routes-plus-vendored-helper Biome debt layer exposed by run `80`.

## TODO

- [x] Record the run-80 file scope from GitHub CI and local repro
- [x] Define the bounded formatter-plus-lint cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-80 blocker revealed after the run-79 remediation:

1. format the bounded 8-file runtime-ui-plus-vendored-helper set
2. organize imports in the files Biome flagged
3. repair the small accessibility/style findings in `integrations-upstream.tsx`, `local-logs.tsx`, and `local-peers.tsx`
4. rerun focused local Vitest and Biome validation on the same bounded set
5. push only after the bounded local surface is green, then rerun branch GitHub CI

## Planned Changes by File

- `role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx`
- `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-logs.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/chatApi.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/audioApi.ts`

## Implementation Steps

1. Preserve `phase4-branch-ci-run80.red.log` and `phase4-branch-ci-run80-repro.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact run-80 file set.
3. Run the regression first and preserve its RED output.
4. Apply Biome-managed formatting and organize-import cleanup to the full run-80 file set.
5. Manually repair:
   - `integrations-upstream.tsx` by adding the safe blank-target rel attribute and replacing the unnecessary template literal with a plain string literal
   - `local-logs.tsx` by adding explicit button type and replacing array-index keys with stable derived keys
   - `local-peers.tsx` by connecting each label to its corresponding input
6. Re-run the focused regression and the bounded file-set Biome check and capture GREEN evidence.
7. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run80.red.log`
  - preserve `phase4-branch-ci-run80-repro.red.log`
  - add and run `packages/schema-tools/test/recursive-biome-run80.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-biome-run80.test.ts` from `packages/schema-tools`
  - run `corepack pnpm exec biome check role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx role-model-router/apps/runtime-ui/app/routes/endpoints.tsx role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx role-model-router/apps/runtime-ui/app/routes/local-logs.tsx role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx role-model-router/apps/runtime-ui/app/routes/local-peers.tsx role-model-router/vendor/llama-swap/ui-svelte/src/lib/chatApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/audioApi.ts`
  - rerun branch CI after the local bounded surface is green
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx role-model-router/apps/runtime-ui/app/routes/endpoints.tsx role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx role-model-router/apps/runtime-ui/app/routes/local-logs.tsx role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx role-model-router/apps/runtime-ui/app/routes/local-peers.tsx role-model-router/vendor/llama-swap/ui-svelte/src/lib/chatApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/audioApi.ts`
  - focused green check: `corepack pnpm exec biome check role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx role-model-router/apps/runtime-ui/app/routes/endpoints.tsx role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx role-model-router/apps/runtime-ui/app/routes/local-logs.tsx role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx role-model-router/apps/runtime-ui/app/routes/local-peers.tsx role-model-router/vendor/llama-swap/ui-svelte/src/lib/chatApi.ts role-model-router/vendor/llama-swap/ui-svelte/src/lib/audioApi.ts`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Once the run-80 file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the 8 GitHub-reported files unless a later branch-CI run surfaces a new explicit blocker.
- If the write pass leaves `integrations-upstream.tsx`, `local-logs.tsx`, or `local-peers.tsx` red, repair only those hotspots manually and rerun the bounded checks before widening further.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run79-biome-debt.addendum-13.md`

This addendum adds the bounded run-80 runtime-ui-routes-plus-vendored-helper Biome debt cleanup to the run.

## Traceability

- `R4` -> the widened parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the run-80 surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] The manual lint repairs are explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-80 remediation needed to move branch CI past the next runtime-ui-routes-plus-vendored-helper Biome debt layer.
Audit: PASS
