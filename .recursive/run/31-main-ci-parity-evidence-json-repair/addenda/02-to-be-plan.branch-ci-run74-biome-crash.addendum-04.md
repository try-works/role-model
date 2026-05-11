Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T22:05:01Z`
LockHash: `8ac6ff7f4c93bdc1ec0978755697d553ea3dfab536986aacbf0ae949fdffb513`
Addendum: `04`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run74-biome-crash.addendum-03.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run74.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-biome-crash-repro.red.log`
- User scope decision: expand run 31 again to fix the newly exposed blocker now
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run74-biome-crash.addendum-04.md`
Scope note: This addendum expands run 31 from the run-73 cleanup to the next masked branch-CI blocker exposed by run `74`.

## TODO

- [x] Record the newly exposed config-plus-file scope from run `74`
- [x] Define the bounded remediation steps for the file-size gap and the vendored Svelte crash path
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-74 blocker revealed after the earlier 13-file cleanup:

1. raise Biome's repository file-size limit high enough for `testdata/catalog/litellm-model-prices.json`
2. format `packages/conformance/src/protocol-fixture-conformance.test.ts`
3. format and normalize `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Models.svelte`
4. format and normalize `role-model-router/vendor/llama-swap/ui-svelte/src/routes/LogViewer.svelte`
5. normalize `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Activity.svelte` without relying on the crashing raw diagnostic path
6. rerun focused Biome validation on the same bounded set
7. rerun branch GitHub CI

## Planned Changes by File

- `biome.json`
- `testdata/catalog/litellm-model-prices.json`
- `packages/conformance/src/protocol-fixture-conformance.test.ts`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Models.svelte`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/LogViewer.svelte`
- `role-model-router/vendor/llama-swap/ui-svelte/src/routes/Activity.svelte`

## Implementation Steps

1. Preserve `phase4-branch-ci-run74.red.log` and `phase4-biome-crash-repro.red.log` as the authoritative RED evidence for this slice.
2. Update `biome.json` to set `files.maxSize` above the real `litellm-model-prices.json` size so CI can process that tracked fixture without CLI-only overrides.
3. Apply Biome-managed formatting to `packages/conformance/src/protocol-fixture-conformance.test.ts`, `Models.svelte`, and `LogViewer.svelte`.
4. Repair `Activity.svelte` with the smallest change set that removes the current `useTemplate` / `useConst` findings before the next repo-wide lint run.
5. Prefer a bounded `biome check --write --unsafe` pass for `Activity.svelte`; if Biome still crashes during write, apply the emitted minimal edits manually and verify them with a single-file recheck.
6. Run a focused local Biome check over the bounded set without CLI size overrides and capture GREEN evidence.
7. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run74.red.log`
  - preserve `phase4-biome-crash-repro.red.log`
- GREEN plan:
  - run `corepack pnpm exec biome check biome.json testdata/catalog/litellm-model-prices.json packages/conformance/src/protocol-fixture-conformance.test.ts role-model-router/vendor/llama-swap/ui-svelte/src/routes/Models.svelte role-model-router/vendor/llama-swap/ui-svelte/src/routes/LogViewer.svelte role-model-router/vendor/llama-swap/ui-svelte/src/routes/Activity.svelte`
  - rerun branch CI
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe biome.json testdata/catalog/litellm-model-prices.json packages/conformance/src/protocol-fixture-conformance.test.ts role-model-router/vendor/llama-swap/ui-svelte/src/routes/Models.svelte role-model-router/vendor/llama-swap/ui-svelte/src/routes/LogViewer.svelte role-model-router/vendor/llama-swap/ui-svelte/src/routes/Activity.svelte`
  - focused green check: `corepack pnpm exec biome check biome.json testdata/catalog/litellm-model-prices.json packages/conformance/src/protocol-fixture-conformance.test.ts role-model-router/vendor/llama-swap/ui-svelte/src/routes/Models.svelte role-model-router/vendor/llama-swap/ui-svelte/src/routes/LogViewer.svelte role-model-router/vendor/llama-swap/ui-svelte/src/routes/Activity.svelte`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Once `biome.json` includes the larger file-size limit and the bounded file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the six planned files unless a later GitHub validation run surfaces a new explicit blocker.
- If `Activity.svelte` still crashes Biome after the minimal edit pass, stop and record the remaining tool failure explicitly before widening further.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.multiple-malformed-run15-json.addendum-01.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.shell-transcript-json-reclassification.addendum-02.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-biome-debt.addendum-03.md`

This addendum adds the run-74 config gap and bounded five-file cleanup to the run.

## Traceability

- `R4` -> the widened parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Newly exposed file and config scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the run-74 surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] The crash-handling path is explicit instead of implicit guesswork

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-74 remediation needed to finish branch CI after the earlier 13-file cleanup.
Audit: PASS
