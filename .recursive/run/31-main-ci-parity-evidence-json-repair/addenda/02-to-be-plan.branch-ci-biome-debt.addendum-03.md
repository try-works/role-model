Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T21:45:37Z`
LockHash: `f0bcce3684da9a5d15c61ce1c777644790cea812441146824e77177d7ea4fc13`
Addendum: `03`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-biome-debt.addendum-02.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run73.red.log`
- User scope decision: expand run 31 to include the broader Biome formatting cleanup now
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-biome-debt.addendum-03.md`
Scope note: This addendum expands run 31 from the malformed-JSON repair to the bounded 13-file Biome cleanup exposed by branch CI run `73`.

## TODO

- [x] Record the widened file scope from branch CI
- [x] Define the new RED/GREEN validation flow
- [x] Keep the cleanup bounded to the GitHub-reported file set
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the 13-file Biome blocker revealed by run `73`:

1. format the reported JSON, TSX, and evidence files
2. fix organize-import diagnostics in the vendored llama-swap UI files
3. fix the two reported `role-model-router/vendor/llama-swap/ui-svelte/src/stores/api.ts` style diagnostics
4. rerun focused Biome validation on the same 13 files
5. rerun branch GitHub CI

## Planned Changes by File

- `.agents/skills/ui-design-system/scripts/tests/coverage-ui.json`
- `.recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-host-streaming-e2e.json`
- `.recursive/run/15-unified-vendor-execution/evidence/browser/run15-real-vendor-browser-probe.json`
- `apps/docs-site/app/components/docs-header.tsx`
- `role-model-router/vendor/llama-swap/ui-svelte/vite.config.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/stores/theme.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/stores/playgroundActivity.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/stores/persistent.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/stores/api.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Playground.svelte`
- `testdata/catalog/litellm-model-prices.json`
- `testdata/router-runtime/fixtures/routing-model-guidance.json`
- `testdata/router-runtime/routing-model-guidance.json`

## Implementation Steps

1. Preserve run `73` as the authoritative RED evidence for the widened Biome debt.
2. Apply Biome-managed formatting and organize-import fixes to the 13 reported files only.
3. Apply the minimal manual edits required for the two remaining `stores/api.ts` style diagnostics if Biome does not auto-fix them safely.
4. Run a focused local Biome check over the same 13-file set and capture GREEN evidence.
5. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run73.red.log` as the failing baseline
- GREEN plan:
  - run `corepack pnpm exec biome check <13-file-set>` after the cleanup
  - rerun branch CI
- Commands:
  - GREEN focused lint: `corepack pnpm exec biome check .agents/skills/ui-design-system/scripts/tests/coverage-ui.json .recursive/run/14-router-runtime-ui-foundation/evidence/logs/verify/runtime-host-streaming-e2e.json .recursive/run/15-unified-vendor-execution/evidence/browser/run15-real-vendor-browser-probe.json apps/docs-site/app/components/docs-header.tsx role-model-router/vendor/llama-swap/ui-svelte/vite.config.ts role-model-router/vendor/llama-swap/ui-svelte/src/stores/theme.ts role-model-router/vendor/llama-swap/ui-svelte/src/stores/playgroundActivity.ts role-model-router/vendor/llama-swap/ui-svelte/src/stores/persistent.ts role-model-router/vendor/llama-swap/ui-svelte/src/stores/api.ts role-model-router/vendor/llama-swap/ui-svelte/src/routes/Playground.svelte testdata/catalog/litellm-model-prices.json testdata/router-runtime/fixtures/routing-model-guidance.json testdata/router-runtime/routing-model-guidance.json`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Re-running Biome over the 13-file set should be idempotent once the files are clean.
- The cleanup must not widen beyond the GitHub-reported file list unless a later validation run produces new explicit diagnostics.
- If GitHub CI still fails after the 13-file set is clean, record the new blocker explicitly before touching more files.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.shell-transcript-json-reclassification.addendum-02.md`

This addendum adds the bounded 13-file Biome cleanup to the run.

## Traceability

- `R4` -> the widened local-plus-GitHub parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Widened file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the GitHub-reported file set

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded 13-file Biome cleanup needed to finish branch CI.
Audit: PASS
