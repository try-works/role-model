# Run 57 Current-State Requirements/Proposal Audit Findings Addendum 13

Status: DRAFT
CreatedAt: 2026-06-24
Run: 57-role-model-taxonomy-v1-phase-1-4
Phase: 03 Implementation Summary Addendum 13
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-13.md`
Workflow version: `recursive-mode-audit-v1`
Artifact kind: run-local implementation audit findings addendum
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-12.md`
Scope: Audit the current Run 57 implementation state against the approved Run 57 requirement and the Role-Model Taxonomy V1 proposal, with emphasis on proposal phases 1-4 after the latest gap-closure implementation and live Pi/runtime QA receipts.

## Inputs

- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-06.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-12.md`
- `/.recursive/STATE.md`
- Current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Audit Method

This audit compared the current implementation files, current run receipts, Pi package code, runtime packaging validator, generated docs, and QA reconciliation script against:

- the approved Run 57 requirement acceptance criteria;
- the proposal phases 1-4 taxonomy, progressive-disclosure, generated-docs, runtime, UI, Pi integration, and E2E verification requirements;
- the latest implementation addendum and Phase 5 live Pi/runtime QA receipts.

No production code was changed for this audit addendum.

Command evidence used during the audit:

- `node scripts/check-run57-qa-reconciliation.mjs` passed.
- `git status --short --branch` confirmed the audit ran in the run 57 worktree on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`.
- Source inspections covered `packages/pi-role-model/src/taxonomy/**`, `packages/pi-role-model/src/request-intent.ts`, `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`, `scripts/check-public-taxonomy-v1-docs.mjs`, generated public taxonomy docs, `05-manual-qa.md`, `05-manual-qa-addendum-01-healthy-backends.md`, and `.recursive/STATE.md`.

## Finding Summary

Audit result: FAIL

The current implementation has strong coverage for the canonical taxonomy data set, runtime taxonomy routes, runtime request metadata normalization, advisory metadata degradation, UI role-assignment behavior, Pi package installation, Pi request metadata injection, and live Pi-to-runtime routing through healthy managed QA backends.

The remaining gaps are narrower but still material. The largest issue is that the Pi package data is physically chunked, but the main Pi taxonomy loader and classifier still behave as though the full compact taxonomy is already loaded. That does not satisfy the proposal's progressive-disclosure algorithm or the Run 57 requirement's staged loading contract. Additional gaps remain around generated docs classifier guidance, packaged-runtime taxonomy parity validation, and stale recursive state metadata.

## Findings

### F1 - Pi compact taxonomy loader still eagerly loads every role task chunk

Severity: High

The proposal requires progressive disclosure for clients that cannot or should not read the full catalog in one prompt. It defines staged retrieval where clients load summary data, then role summaries, then only likely role task lists, and task detail only when needed.

Requirement `R8` requires Pi package APIs to load group summaries first, role summaries second, and task chunks only for likely roles. Requirement `R9` requires Pi to load task indexes only for likely roles and fetch full task detail only for ambiguous candidates or final validation.

Evidence:

- Proposal reference: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:1271`
- Proposal consumer algorithm: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:1312`
- Requirement reference: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:445`
- Requirement reference: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:458`
- Current implementation: `packages/pi-role-model/src/taxonomy/load-compact-taxonomy.ts:48`
- Runtime effective taxonomy merge: `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts:258`

Observed current state:

- `loadCompactTaxonomy()` reads the compact manifest, groups, role summaries, role-task index, and then eagerly reads every `roles/{roleId}/tasks.compact.json` file by mapping over every role summary.
- `resolveEffectiveTaxonomy()` begins by calling `loadCompactTaxonomy()`, so even runtime effective taxonomy resolution starts from the full package task-chunk map.
- When runtime role chunks are fetched for candidate roles, they are merged over the already-loaded full package chunk set.

Expected state:

- Pi package APIs should expose a staged loader that can read:
  - manifest only;
  - groups only;
  - role summaries only;
  - role-task index for candidate roles;
  - task chunks only for likely/candidate roles.
- `loadCompactTaxonomy()` may remain available for tests, docs, administration, or advanced/offline full-cache use, but request classification must not use it in a way that loads all task chunks before candidate narrowing.
- Tests should prove the request classification path does not read every task chunk.

Impact:

- The implementation satisfies physical file chunking but not the runtime behavior promised to Pi and other consumer agents.
- E2E-P1-003's requirement to prove Pi inspects sampled role tasks "without loading the full taxonomy at once" remains under-satisfied.
- Large future custom org/team/user taxonomies could regress Pi context and memory use even though the files are chunked.

### F2 - Pi classifier is rule-first, not group-first progressive classification

Severity: High

The proposal says Pi and similar clients should use role summaries for first-pass classification, fetch only likely role task lists, then fetch task detail only for likely candidate tasks, ambiguity resolution, or diagnostics. Requirement `R9` adds that Pi classification first chooses candidate groups from prompt/mode/tools/attachments/hints/context, then loads roles only for likely groups.

Evidence:

- Proposal reference: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:1314`
- Requirement reference: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:458`
- Current classifier: `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts:190`
- Current returned loaded chunks: `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts:259`

Observed current state:

- `classifyWithProgressiveDisclosure()` picks a role and task directly from hardcoded regex rules.
- The selected group is derived after role selection from `roleSummary.primaryGroupId`.
- The classifier reports `loadedChunks: ["groups", "role-summaries", "tasks:${roleId}"]`, but that report is not proof of actual staged file loading because the default taxonomy path already calls `loadCompactTaxonomy()`.

Expected state:

- The request classification flow should have separate, testable stages:
  1. group candidate selection from compact group and role summary data;
  2. likely role selection within candidate groups;
  3. likely task selection after loading only relevant role task chunks;
  4. optional detail fetch for ambiguous/final validation where supported.
- Tests should fail if classification reads task chunks for unrelated roles.

Impact:

- The classifier can classify the approved six prompt examples, but the implementation does not yet match the proposal's extensible classification design.
- Future taxonomy expansion will likely increase rule maintenance and reduce the benefit of group-based progressive disclosure.

### F3 - Generated public task docs omit classifier guidance columns required by the proposal

Severity: Medium

The proposal states that task type tables must include classifier guidance so Pi and other agents can read the taxonomy and know how to classify requests. The proposal task table includes `Description`, `Use When`, and `Do Not Use When`.

Evidence:

- Proposal reference: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:489`
- Proposal table shape: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:491`
- Current generated public docs table: `docs/protocol/taxonomy-v1.md:154`
- Current docs parity script: `scripts/check-public-taxonomy-v1-docs.mjs:147`

Observed current state:

- The generated task table includes task type, label, primary role, required capabilities, required modalities, and tool classes.
- The generated task table does not include description, use-when guidance, do-not-use-when guidance, compatible roles, or preferred capabilities.
- The public docs parity check ensures identifiers and counts appear, but it does not prove that classifier guidance fields are generated into the docs.

Expected state:

- Generated docs should include enough classifier guidance for consumer agents and humans to choose among roles/tasks.
- At minimum, generated task catalog output should include description plus use/do-not-use guidance, or a separate generated classification-guide table should provide equivalent task-level guidance and be checked for parity.
- Docs parity scripts should fail if canonical task classifier fields are missing from generated public docs/docs-site content.

Impact:

- Consumers reading the public generated docs cannot use the task table alone to understand classification boundaries.
- Docs can pass the current parity check while omitting classification guidance that the proposal explicitly requires.

### F4 - Packaged runtime taxonomy parity is not directly validated by the packaging validator

Severity: Medium

The proposal and addendum plans treat manifest counts and content hashes as release receipts. The run 57 gap-closure plan required parity checks proving runtime taxonomy data, Pi compact snapshots, generated docs, and release/package bundle taxonomy metadata share the same versions, counts, and content hashes.

Evidence:

- Proposal release receipt requirement: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:2358`
- Addendum plan requirement: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-06.md:221`
- Root packaging validation command: `package.json:31`
- Current packaged-runtime validator checks role policy and `/v1/models`: `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts:274`

Observed current state:

- Source-tree parity checks cover canonical runtime taxonomy files, Pi compact snapshot hashes, and generated public docs identifiers.
- `runtime:validate-packaging` builds the packaged runtime and validates health/model/chat/responses behavior.
- The packaged-runtime validator does not fetch `/api/role-model/taxonomy/manifest`, `/api/role-model/taxonomy/version`, `/api/role-model/taxonomy/summary`, or a sampled task chunk from the packaged executable.
- Therefore, the packaged executable can pass validation without directly proving its embedded taxonomy manifest and hashes match the canonical source/Pi/docs taxonomy.

Expected state:

- `runtime:validate-packaging` or an adjacent release validation command should fetch taxonomy manifest/version/summary from the packaged executable.
- The packaged executable's taxonomy metadata should be compared against canonical `schemaVersion`, `taxonomyVersion`, `classificationContractVersion`, `contentRevision`, `entryCounts`, and content hashes.
- A sampled role task chunk should be fetched from the packaged runtime to prove progressive taxonomy assets are bundled and served correctly.

Impact:

- Source checks are strong, but release confidence is incomplete.
- Users installing a packaged runtime are not protected by a direct packaged-runtime taxonomy parity assertion.

### F5 - Recursive state metadata is stale for the Pi package version

Severity: Low

The current state document says the public package is `@try-works/pi-role-model@0.1.0`, while the worktree package version is `0.1.1`.

Evidence:

- Current state: `/.recursive/STATE.md:8`
- Package version: `packages/pi-role-model/package.json:3`

Observed current state:

- `.recursive/STATE.md` says `@try-works/pi-role-model@0.1.0`.
- `packages/pi-role-model/package.json` says `0.1.1`.

Expected state:

- Recursive state should identify the correct package version or explicitly distinguish the public npm baseline from the current unpublished worktree version.

Impact:

- Future runs can use stale package metadata as a baseline.
- Release/package QA could compare against the wrong npm version.

## Confirmed Non-Findings / Covered Areas

The following areas appear covered by the current implementation and receipts:

- Canonical taxonomy count coverage for `6` groups, `28` roles, `280` task types, `46` capabilities, `9` modalities, and `15` tool classes.
- Runtime taxonomy discovery route family exists under `/api/role-model/taxonomy*`.
- Runtime request metadata normalization accepts `role_model.intent`.
- Invalid advisory Pi metadata degrades safely instead of causing request failures.
- Runtime role/task policy is applied to routing for valid intent metadata.
- Existing runtime UI model/role surfaces include grouped role assignment and task drill-in coverage.
- `05-manual-qa-addendum-01-healthy-backends.md` supersedes the earlier disabled-backend limitation and records successful live Pi prompt completion through healthy managed QA backends.
- `scripts/check-run57-qa-reconciliation.mjs` passes.

## Recommended Next Addendum Plan Scope

The next implementation plan addendum should close `F1` through `F5` using strict TDD and live Pi/runtime verification:

1. Add failing tests that prove request-time Pi classification does not read unrelated role task chunks.
2. Add a staged Pi compact taxonomy API and update request classification to use it.
3. Refactor classifier flow into group-first, role-second, task-chunk-third stages.
4. Generate docs classifier guidance or an equivalent task-level classification guide and update docs parity checks.
5. Extend packaged-runtime validation to assert taxonomy manifest/version/summary/task-chunk parity from the packaged executable.
6. Update recursive state/package-version metadata.
7. Re-run affected unit/integration/docs/package checks.
8. Rebuild runtime and `pi-role-model`, install the package into local Pi, drive Pi through endpoint/alias setup, classify representative prompts, and verify the runtime receives and routes taxonomy intent while staged-loading receipts prove no full-taxonomy load in the request path.

## Disposition

Status: DRAFT

This addendum documents current implementation gaps only. It does not change production code or recursive state. The run should not be considered fully closed against the proposal/requirement until these findings are either fixed or explicitly accepted as scoped deferrals with requirement/proposal updates.
