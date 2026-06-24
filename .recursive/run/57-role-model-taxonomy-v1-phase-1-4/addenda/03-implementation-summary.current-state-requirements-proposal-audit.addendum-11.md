# Run 57 Current-State Requirements/Proposal Audit Findings Addendum 11

Status: DRAFT
CreatedAt: 2026-06-24
Run: 57-role-model-taxonomy-v1-phase-1-4
ArtifactKind: run-local implementation audit findings addendum
Scope: Audit the current Run 57 implementation state against the approved Run 57 requirement and the Role-Model Taxonomy V1 proposal, with emphasis on proposal phases 1-4.

## Inputs

- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-05.md`
- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-closure-implementation.addendum-10.md`
- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-reconciliation.addendum-02.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- Current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Audit Method

This audit compared the implementation artifacts, tests, generated taxonomy files, Pi package taxonomy snapshots, documentation checks, and QA reconciliation receipts against:

- The explicit acceptance criteria in the approved Run 57 requirement.
- The exact taxonomy/progressive-disclosure/API/UI/E2E expectations in the proposal phases 1-4.
- The latest gap-closure implementation summary and QA reconciliation receipts.

No production code was changed for this audit addendum.

## Finding Summary

Audit result: FAIL

The current implementation has strong coverage for the taxonomy data set, permissive advisory metadata handling, Pi package snapshots, runtime classifier integration, and many tests/builds. However, the current state still has several gaps against the original requirement and proposal. The largest gaps are schema naming drift, progressive-disclosure payload shape/size drift, incomplete E2E coverage reconciliation, and under-evidenced docs/cache parity checks.

## Findings

### F1 - Manifest schema uses `counts` instead of required/proposed `entryCounts`

Severity: High

The approved requirement requires taxonomy manifests to expose `entryCounts`, and the proposal manifest example also uses `entryCounts`.

Evidence:

- Requirement reference: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:254`
- Proposal reference: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:2328`
- Current runtime manifest: `role-model-router/packages/core/data/taxonomy/manifest.json`
- Current manifest schema: `schemas/role-model/taxonomy/manifest.schema.json`
- Current runtime API QA receipt: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/qa/taxonomy-manifest.json`

Observed current state:

- Runtime taxonomy manifest uses `counts`.
- Runtime manifest schema validates `counts`.
- Runtime API returns `counts`.

Expected state:

- The runtime manifest, JSON schema, API response, generated docs, Pi package snapshots, and tests should either use `entryCounts` exactly as required/proposed, or the requirement/proposal should be explicitly revised. Since Run 57 requires exact proposal-derived schemas, implementation should align to `entryCounts`.

Impact:

- Public API/schema compatibility drift.
- Consumers following the proposal or requirement will read the wrong field.
- Future generated docs and package snapshots can encode inconsistent contracts.

### F2 - Pi compact role-task index is not compact and does not follow the proposed progressive-disclosure shape

Severity: High

The proposal and requirement define a progressive-disclosure package shape for Pi:

- `compact-manifest.json` contains versions, counts, hashes, and file paths only.
- `compact-role-task-index.json` contains role-to-task IDs and labels only.
- Per-role chunks under `roles/{roleId}/tasks.compact.json` contain compact details for one role only.
- Compact chunks should stay under an implementation-defined hard prompt-size guardrail, with a target under 16 KB.

Evidence:

- Proposal reference: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:2612`
- Requirement reference: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:438`
- Current index: `packages/pi-role-model/data/taxonomy/compact-role-task-index.json`
- Current tests: `packages/pi-role-model/test/taxonomy-data-files.test.ts`

Observed current state:

- `packages/pi-role-model/data/taxonomy/compact-role-task-index.json` is about 211 KB.
- The index includes full task details such as descriptions, primary role, compatible roles, required/preferred capabilities, modalities, tool classes, classifier hints, and variants.
- Tests assert file parity and hash validity, but do not enforce IDs/labels-only shape or compact size guardrails.

Expected state:

- The top-level role-task index should contain only role/task identifiers and labels needed to choose a group/role/task path.
- Detailed role/task data should live in per-role compact chunks.
- Tests should fail if the role-task index contains detailed metadata or if any compact chunk exceeds the chosen hard size limit.

Impact:

- Pi can be overloaded with taxonomy data earlier than intended.
- The implementation weakens the proposal's progressive-disclosure model.
- Future taxonomy growth can silently make the package unsuitable for prompt-bounded agents.

### F3 - Documentation checks do not prove generated docs match canonical taxonomy data

Severity: Medium

The requirement asks for tests/static checks proving docs/generated tables match canonical data and manifest counts/content hashes. Current checks mostly verify stale-token absence and presence of broad required strings.

Evidence:

- Requirement reference: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:147`
- Requirement reference: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:308`
- Current root/docs check: `scripts/check-public-taxonomy-v1-docs.mjs`
- Current docs-site check: `apps/docs-site/scripts/check-taxonomy-v1-docs.mjs`
- Current runtime docs test: `role-model-router/packages/core/test/taxonomy-docs.test.ts`

Observed current state:

- Public docs checks scan for required tokens and stale tokens.
- Runtime docs tests check for broad section/title content.
- No audit evidence shows docs tables are generated from canonical taxonomy data or compared against a proposal-derived/generated golden fixture.

Expected state:

- Tests should compare generated docs/table content against canonical taxonomy artifacts.
- Checks should fail if counts, IDs, labels, descriptions, schema fields, or content hashes drift between canonical taxonomy files and docs.

Impact:

- Documentation can drift from runtime/package taxonomy while CI remains green.
- Consumer-facing installation/classification guidance can become inaccurate without detection.

### F4 - Proposal phase 1-4 E2E coverage is incomplete or mislabeled in current QA reconciliation

Severity: High

The proposal defines explicit phase 1-4 E2E cases. The current QA reconciliation does not explicitly cover all of them and appears to reuse at least one proposal ID for a different behavior.

Evidence:

- Proposal E2E reference: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:2469`
- Current QA reconciliation: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-reconciliation.addendum-02.md`

Missing or insufficiently reconciled proposal cases:

- `E2E-P1-003`: Task catalog completeness via Pi.
- `E2E-P2-003`: Router hard filters with two configured models and required role/capability/tool constraints.
- `E2E-P2-004`: Router advisory scoring changes candidate ranking and reason codes.
- `E2E-P2-005`: Controller-generated constraints are applied so blocked candidates cannot be selected.
- `E2E-P3-002`: Proposal case for role removal affecting routing is not explicitly reconciled; the current QA table labels `E2E-P3-002` as grouped role UI/high-risk labels.
- `E2E-P3-003`: Task drill-in UI is not explicitly reconciled.

Expected state:

- The Run 57 evidence should include a one-to-one reconciliation table for every proposal phase 1-4 E2E ID.
- If a case is deferred or replaced, the addendum should say so explicitly and explain why.
- Reused E2E identifiers should preserve the proposal meaning.

Impact:

- It is not currently possible to verify from the QA receipt that all proposal phase 1-4 E2E obligations were executed or consciously deferred.
- Routing decision behavior and UI task drill-in behavior are under-proven.

### F5 - Live UI visual/interaction evidence remains incomplete for grouped role assignment and task disclosure

Severity: Medium

The QA reconciliation says several UI cases are covered by automated tests but still require final live visual receipts.

Evidence:

- Current QA reconciliation: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-reconciliation.addendum-02.md`

Observed current state:

- The QA addendum states live UI evidence is still required for grouped role assignment and high-risk labels.
- The proposal expects UI behavior based on actual routes/pages, including model add/edit flows, grouped roles, all/include/exclude role assignment, and task drill-in.

Expected state:

- Phase 5/manual QA evidence should include screenshots or equivalent browser-driven receipts for:
  - Add-model default all-roles assignment.
  - Explicit visible all-role/group controls.
  - Include/exclude role behavior.
  - Persisted model configuration display.
  - Per-role task drill-in/disclosure from the configured model page.

Impact:

- Automated component coverage is useful, but it does not fully prove the integrated runtime UI behaves as designed.
- The user-facing configuration flow remains under-evidenced.

### F6 - Pi classifier evidence does not fully match the proposal minimum request-set expectations

Severity: Medium

The proposal's minimum request set expects classification outputs that include specific task/capability/tool signals. Current evidence shows broadly reasonable classifications but not always the requested task set.

Evidence:

- Proposal minimum request set: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- Current classifier receipt: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/qa/pi-classifier-six-prompts.json`

Observed current state examples:

- "Implement this small bug fix and add a regression test." classified primarily as `coder.edit`; no explicit `coder.test.write` task evidence was captured.
- "Compare current public documentation..." classified primarily as `researcher.web_research.current`; `researcher.compare_sources` appears only as an alternative.
- "Inspect this schema and propose a migration plan." classified primarily as `architect.migration.strategy`; no explicit `data.schema.review` task evidence was captured.

Expected state:

- The QA evidence should either:
  - prove multi-task classification where the prompt requires multiple task intents, or
  - explicitly document that the current metadata contract emits one primary task plus alternatives and map each proposal minimum request to accepted primary/alternative outputs.

Impact:

- Routing may underuse important secondary task constraints, such as test-writing or schema-review requirements.
- Proposal conformance is ambiguous without an explicit classification acceptance mapping.

### F7 - Taxonomy discovery ETag/cache behavior is under-evidenced

Severity: Medium

The proposal calls for taxonomy discovery responses to include version/cache semantics such as `ETag` where useful, and for clients to support cache validation. The requirement also asks for tests covering ETag/version fields and cache invalidation.

Evidence:

- Proposal reference: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md:1300`
- Requirement reference: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:338`
- Runtime host bridge taxonomy tests: `role-model-router/apps/runtime-host-bridge/test/taxonomy-discovery.test.ts`

Observed current state:

- Current taxonomy discovery tests cover endpoint availability, manifest shape, and content counts.
- No audit evidence shows tests for `ETag`, `If-None-Match`, `304 Not Modified`, or cache invalidation behavior for taxonomy discovery responses.

Expected state:

- Runtime API tests should prove taxonomy endpoints expose deterministic version/cache validators where required.
- Tests should prove cache validation changes when taxonomy content/version changes or when a request is made with matching `If-None-Match`.

Impact:

- Agent and UI consumers may repeatedly fetch large taxonomy payloads.
- Cache behavior remains a contract gap for progressive disclosure and future taxonomy growth.

### F8 - Runtime/package/docs content-hash parity is not fully proven across release artifacts

Severity: Low

The requirement asks for tests proving generated docs, compact Pi snapshots, and runtime bundles were produced from the same content hashes. Current evidence proves several local hash/parity properties, but not the whole chain across docs and release bundles.

Evidence:

- Requirement reference: `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md:309`
- Current Pi package tests: `packages/pi-role-model/test/taxonomy-data-files.test.ts`
- Current runtime manifest: `role-model-router/packages/core/data/taxonomy/manifest.json`
- Current release artifact manifests under `role-model-router/dist/release/`

Observed current state:

- Pi compact taxonomy files have content hashes and tests validate those compact file hashes.
- Pi snapshots mirror runtime taxonomy content hashes.
- Documentation parity appears to be token-based rather than content-hash or canonical-data based.
- Release artifact parity with current taxonomy hashes is not explicitly proven by an audit receipt.

Expected state:

- A single static check or test should verify runtime taxonomy, Pi package taxonomy snapshots, generated docs, and release bundle taxonomy artifacts are derived from the same manifest version and content hashes.

Impact:

- A stale release bundle or stale docs page could ship without detection.
- This is lower severity because current source-level parity is mostly present, but release/docs parity should be closed before final Run 57 acceptance.

## Required Follow-Up

Create a run-local addendum implementation plan that fixes or explicitly defers each finding above. The plan should:

- Use TDD for code/schema/test changes.
- Preserve permissive routing behavior for invalid Pi advisory metadata.
- Rebuild the runtime and Pi package after fixes.
- Re-run automated tests and static checks.
- Re-run live Pi/runtime verification where affected.
- Produce updated Phase 5/manual QA receipts with one-to-one coverage for proposal phase 1-4 E2E IDs.

## Audit Disposition

Run 57 should not be considered fully conformant to the approved requirement and proposal phases 1-4 until the findings in this addendum are either fixed with evidence or explicitly accepted as deferred scope by a later requirement.
