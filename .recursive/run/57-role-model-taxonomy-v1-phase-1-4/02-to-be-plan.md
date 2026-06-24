Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-23T10:01:51Z`
LockHash: `ebe3bd91ebb07ec4e5151dc428bad167da46a40eb2b2ffd363854eb91da4330b`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
Scope note: This artifact defines the implementation, TDD, verification, and QA plan for approved run 57 phases 1-4 while keeping run 58 and proposal benchmark/telemetry implementation draft/out of scope.
Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `Phase 2 is a controller-owned implementation plan derived from locked requirements and AS-IS evidence; no delegated subagent tool was available or needed.`
Delegation Decision Basis: `self-audit selected because the work is planning and traceability, not independent implemented-code review.`
Audit Result: `PASS`
Audit: PASS
TDD Mode: `strict`

## TODO

- [x] Preserve exact proposal source authority
- [x] Define repository paths and path reconciliation
- [x] Define strict RED/GREEN implementation slices for `R2` through `R12`
- [x] Define docs, safety, and future benchmark/telemetry boundaries
- [x] Define Phase 4 verification command set and audit coverage
- [x] Define Phase 5 Pi-driven QA checklist at the planning level
- [x] Confirm no production implementation is part of Phase 2

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `Phase 2 required direct reconciliation of locked requirement, locked AS-IS findings, and the external proposal. No delegated subagent was used.`
Delegation Decision Basis: `self-audit selected because this phase defines the implementation plan that the controller must execute in strict TDD.`
Audit Inputs Provided:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`

## Effective Inputs Re-read

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`: approved scope, exact proposal matching, TDD, and Phase 5 proposal-based QA.
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`: worktree path, branch, baseline, setup, inherited timeout evidence.
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`: missing taxonomy paths, current old role/task/router/UI/Pi baseline, docs/testdata gaps, and planning constraints.

## Earlier Phase Reconciliation

- Phase 0 established the worktree and baseline. Phase 2 keeps the same branch and baseline.
- Phase 1 found no existing V1 taxonomy implementation. Phase 2 plans an additive V1 taxonomy implementation rather than a narrow patch to old role/task files.
- Phase 1 found the proposal paths missing. Phase 2 keeps the approved proposal paths as implementation paths, avoiding path reconciliation drift.
- Phase 1 recorded `pnpm-lock.yaml` importer drift from dependency setup. Phase 2 treats that as workspace metadata repair to keep if final package commands still require it.

## Target State

After run 57, Role-Model should have a versioned taxonomy V1 implementation for proposal phases 1-4:

- canonical taxonomy schema/data/source is present and tested against the proposal;
- runtime exposes taxonomy manifest, compact discovery, validation, and effective taxonomy APIs;
- router accepts, normalizes, validates, and uses proposal-shaped classification metadata;
- controller sees only eligible candidate facts and receives normalized intent diagnostics;
- existing runtime UI pages show groups, grouped role assignment, all-roles default, and task drill-down without a new top-level taxonomy app;
- `pi-role-model` includes compact taxonomy data, progressive disclosure loaders, request classifier, version comparison, and metadata sending;
- docs and skill guidance explain taxonomy use, router/controller semantics, Pi classification, and future benchmark/telemetry boundaries;
- proposal Phase 5 benchmarks and Phase 6 telemetry remain future/draft except reserved fields and docs.

## Implementation Steps

1. Add failing taxonomy schema/catalog parity tests.
2. Add canonical taxonomy schemas, data, loaders, validators, and generated compact outputs.
3. Add failing runtime discovery/effective taxonomy tests, then implement host bridge routes.
4. Add failing routing intent/router/controller tests, then implement request normalization and decision use.
5. Add failing runtime UI tests, then extend existing model and role routes/components.
6. Add failing Pi compact taxonomy/classifier tests, then implement package data loaders and metadata sending.
7. Add failing docs/safety tests, then update docs, skill guidance, generated docs, and static safety checks.
8. Run Phase 4 verification and produce the traceability summary before Phase 5.

## Implementation Sub-phases

- Sub-phase A: canonical taxonomy schemas and source data.
- Sub-phase B: runtime taxonomy discovery, validation, and effective taxonomy.
- Sub-phase C: routing request metadata, router eligibility/scoring semantics, and controller diagnostics.
- Sub-phase D: runtime UI grouped role assignment and task drill-down on existing pages.
- Sub-phase E: Pi compact taxonomy snapshot, progressive disclosure loader, classifier, and metadata sending.
- Sub-phase F: docs, skill guidance, safety scans, and public-facing examples.

## Planned Changes by File

| Path | Planned change |
| --- | --- |
| `schemas/role-model/taxonomy/**` | Add proposal-shaped JSON schemas. |
| `role-model-router/packages/core/data/taxonomy/**` | Add canonical V1 taxonomy data and generated compact/runtime files. |
| `role-model-router/packages/core/src/taxonomy/**` | Add loaders, validation, normalization, effective taxonomy, and version/hash helpers. |
| `role-model-router/packages/roles/src/index.ts` | Bridge default roles to canonical V1 where required. |
| `role-model-router/packages/tasks/src/index.ts` | Bridge default tasks to canonical V1 where required. |
| `protocol/schemas/**` | Add or extend request/decision/taxonomy schemas. |
| `role-model-router/packages/core/src/types.ts` and `router.ts` | Add routing intent types and hard/advisory taxonomy routing semantics. |
| `role-model-router/apps/runtime-host-bridge/src/**` | Add taxonomy discovery, validation, effective taxonomy, decision persistence, and controller integration. |
| `role-model-router/apps/runtime-ui/app/**` | Add grouped role assignment and taxonomy/task display on existing routes. |
| `packages/pi-role-model/data/taxonomy/**` | Add compact taxonomy snapshot generated from canonical data. |
| `packages/pi-role-model/src/taxonomy/**` | Add compact loaders, effective taxonomy resolution, and progressive classifier. |
| `packages/pi-role-model/src/**` | Integrate classifier metadata with existing discovery/provider/command behavior while preserving safety. |
| `docs/**`, `docs-site/**`, `README.md`, `packages/pi-role-model/skills/**` | Add public taxonomy and consumer guidance. |
| `testdata/**` | Add or update focused fixtures for V1 taxonomy while preserving compatibility where required. |

## Testing Strategy

Testing is strict TDD. Every production behavior begins with a focused failing test and captured RED evidence, followed by minimal implementation and captured GREEN evidence.

Test categories:

- taxonomy schema validation and malformed example rejection;
- proposal-derived golden parity for groups, roles, tasks, capabilities, modalities, tool classes, and version fields;
- runtime taxonomy discovery, validation, effective taxonomy, and mismatch diagnostics;
- router/controller hard/advisory intent behavior and decision version persistence;
- runtime UI grouped role assignment and task drill-down on existing routes;
- Pi compact taxonomy loading, progressive disclosure, classifier outputs, runtime override, offline fallback, and safety boundaries;
- docs/static checks for generated taxonomy docs and skill guidance;
- changed-path regression commands and rebuilt-runtime validation in Phase 4.

## Playwright Plan (if applicable)

Runtime UI changes require browser validation. Phase 3 or Phase 4 must use the repo's existing runtime UI/browser validation where available and capture evidence for:

- `/app/models` grouped role assignment and all-role default controls;
- role group display and checkbox state on desktop and narrow viewport where practical;
- task drill-down/modal behavior from model pages;
- `/app/models/roles` grouped taxonomy catalog and role task expansion;
- no overlap or unreadable text in the modified UI.

If full Playwright validation is blocked by inherited runtime startup timing, Phase 4 must record the blocker and run the closest focused runtime UI validation plus screenshots or DOM-level evidence.

## Manual QA Scenarios

Manual QA is Phase 5 and agent-operated. It must install/update the rebuilt Pi package into local Pi, use Pi to configure endpoint and alias, list taxonomy groups/roles/tasks, classify and route six proposal prompts, inspect decision diagnostics, and verify relevant runtime UI pages. Any implementation defect found during manual QA must return to Phase 3 with a RED test before repair.

## Idempotence and Recovery

- Generated taxonomy outputs must be deterministic; rerunning generation should produce no diff when the source catalog is unchanged.
- Runtime discovery and Pi compact snapshot resolution must tolerate missing runtime detail and degrade to package snapshot with diagnostics.
- Version/content hash mismatch must not silently route as if compatible.
- UI save operations should be repeatable and preserve existing role assignments unless the user changes them.
- If Phase 3 or Phase 5 fails, resume from the last locked artifact and add new RED evidence for the failing behavior before editing production code.

## Traceability

| Requirement | Plan coverage |
| --- | --- |
| `R1` | Phase 1 AS-IS locked; Phase 4/5 will close evidence. |
| `R2` | Slice 1 schema/catalog parity. |
| `R3` | Slices 1-2 runtime taxonomy source/data/loading. |
| `R4` | Slice 2 runtime discovery, validation, effective taxonomy APIs. |
| `R5` | Slice 3 request metadata and normalized routing intent. |
| `R6` | Slice 3 router/controller hard/advisory decision use. |
| `R7` | Slice 4 existing runtime UI route integration. |
| `R8` | Slice 5 Pi compact taxonomy snapshot and loaders. |
| `R9` | Slice 6 Pi classifier and metadata sending. |
| `R10` | Slice 7 docs, README, docs site, and skill guidance. |
| `R11` | Safety boundaries and future benchmark/telemetry placeholders across slices. |
| `R12` | Versioning/deprecation in Slices 1-3. |
| `R13` | Strict TDD evidence model and verification commands. |
| `R14` | Phase 5 Pi-driven rebuilt-runtime QA plan. |
| `R15` | Phase 5 proposal E2E prompt/diagnostic checklist. |

## Repository Path Plan

Use the proposal paths exactly:

- `schemas/role-model/taxonomy/**`
- `role-model-router/packages/core/data/taxonomy/**`
- `role-model-router/packages/core/src/taxonomy/**`
- `packages/pi-role-model/data/taxonomy/**`
- `packages/pi-role-model/src/taxonomy/**`

Additional expected touched paths:

- `protocol/schemas/**`
- `packages/protocol-types/**` if schema generation requires it
- `role-model-router/packages/roles/src/index.ts`
- `role-model-router/packages/tasks/src/index.ts`
- `role-model-router/packages/core/src/**`
- `role-model-router/apps/runtime-host-bridge/src/**`
- `role-model-router/apps/runtime-ui/app/**`
- `packages/pi-role-model/package.json`, `src/**`, `test/**`, `skills/**`, and package docs
- `docs/**`, `docs-site/**`, `README.md` where needed for generated/public taxonomy links
- focused `testdata/**` compatibility additions

## Catalog Source Plan

The external proposal remains the human-approved source. Phase 3 will add repo-owned generated/static taxonomy data with tests that compare against proposal-derived golden IDs and counts.

Implementation approach:

1. Add JSON schemas for manifest, group, role, task, capability, modality, tool class, intent preset, model role assignment, classification, routing intent, and effective taxonomy.
2. Add a canonical taxonomy data module and JSON data files under `role-model-router/packages/core/data/taxonomy`.
3. Include version fields for `schemaVersion`, `taxonomyVersion`, `databaseVersion`, `contentRevision`, and `classificationContractVersion`.
4. Include all proposal groups, role group membership, roles, task types, capabilities, modalities, and tool classes.
5. Generate compact Pi package chunks from the same source data to avoid drift.
6. Add parity tests for exact IDs, counts, group membership, role task counts, capability refs, modality/tool-class refs, version fields, and compact hash/count consistency.

Manual copy of the large catalog is allowed only into a single canonical source file. All runtime data, Pi compact data, and docs must be generated or validated from that source so later edits do not fork the taxonomy.

## TDD Slice Plan

All production behavior in Phase 3 must follow RED -> GREEN -> REFACTOR. Evidence logs should be written under:

- RED: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase3/red/`
- GREEN: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase3/green/`
- final Phase 3: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase3/final/`
- Phase 4: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase4/`
- Phase 5: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/phase5/`

### Slice 1: Canonical Taxonomy Schemas And Data

RED tests:

- schema tests reject malformed manifest/group/role/task/classification/model-assignment/effective-taxonomy examples;
- catalog parity tests fail until exact proposal groups, roles, role group membership, tasks, capabilities, modalities, and tool classes exist;
- every canonical role has primary group membership;
- every canonical role has at least 10 task types;
- every task ID follows `{role-family}.{task-action}[.{variant}]` and has a matching primary role;
- every task capability/modality/tool-class reference resolves.

Implementation files:

- `schemas/role-model/taxonomy/**`
- `role-model-router/packages/core/data/taxonomy/**`
- `role-model-router/packages/core/src/taxonomy/**`
- `role-model-router/packages/roles/src/index.ts`
- `role-model-router/packages/tasks/src/index.ts`

### Slice 2: Runtime Discovery, Validation, And Effective Taxonomy

RED tests:

- host bridge returns taxonomy manifest with version, content hash, counts, and route links;
- compact group and role summary endpoints are group-first and omit full task details;
- role task chunk endpoint returns one role's task detail only;
- validation endpoint returns structured diagnostics for unknown roles/tasks/capabilities/modalities/tool classes;
- effective taxonomy respects core authority and future RBAC scope shape while degrading explicitly when org/team/user enforcement is unavailable.

Implementation files:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/core/src/taxonomy/**`
- protocol/runtime API types as needed

### Slice 3: Routing Request Metadata And Router/Controller Use

RED tests:

- proposal-shaped `role_model.intent` normalizes to a typed `RoutingIntent`;
- hard role/task/capability/modality/tool fields filter candidates;
- advisory role/task/capability/modality/tool fields affect diagnostics/scoring without filtering eligible candidates;
- low-confidence or unknown taxonomy metadata produces diagnostics and broad fallback behavior;
- decision records store schema/taxonomy/content/classification versions and normalized IDs;
- controller receives normalized intent and candidate facts after hard eligibility filtering, not raw untrusted client intent.

Implementation files:

- `role-model-router/packages/core/src/types.ts`
- `role-model-router/packages/core/src/router.ts`
- host bridge request parsing/decision persistence paths
- `protocol/schemas/router-decision.schema.json` and any new routing request schema

### Slice 4: Runtime UI Integration On Existing Routes

RED tests:

- `/app/models` model role assignment defaults to all roles checked and exposes an all checkbox;
- grouped role lists display canonical groups and role primary/secondary membership;
- removing roles persists disabled role IDs or equivalent proposal assignment shape;
- task details are accessed from configured model pages as drill-down/modal detail and not dumped in the add-model flow;
- `/app/models/roles` shows grouped taxonomy catalog and task drill-down using live runtime taxonomy data;
- `/app/models/benchmark`, `/app/router/*`, and `/app/observe/*` show only later-phase placeholders/diagnostics, not benchmark/telemetry implementations.

Implementation files:

- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx`
- `role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
- focused UI tests under the existing runtime UI test structure

### Slice 5: Pi Compact Taxonomy Snapshot And Progressive Loading

RED tests:

- Pi package loads compact manifest, groups, role summaries, role-task index, and role task chunks;
- compact chunk sizes stay under the implementation guardrail with a target below 16 KB;
- group-first lookup can list roles by group and secondary membership;
- runtime compatible taxonomy supersedes package snapshot;
- runtime version/content mismatch is diagnosed;
- offline fallback uses package snapshot.

Implementation files:

- `packages/pi-role-model/data/taxonomy/**`
- `packages/pi-role-model/src/taxonomy/load-compact-taxonomy.ts`
- `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts`
- `packages/pi-role-model/src/types.ts`
- `packages/pi-role-model/package.json` publish files

### Slice 6: Pi Progressive Classification And Metadata Sending

RED tests:

- classifier chooses candidate groups before loading role/task detail;
- classifier handles at least the six minimum proposal request prompts;
- classifier emits role, task, action, variant, capability, modality, tool-class, confidence, source, evidence, alternatives, taxonomy version, and classification contract version where available;
- explicit user instructions and trusted context produce hard fields, while low-confidence inference stays advisory;
- no hidden model calls occur by default;
- existing endpoint trust, alias, provider registration, auth fail-closed, and runtime-ownership safety behavior remain intact.

Implementation files:

- `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`
- `packages/pi-role-model/src/runtime-discovery.ts`
- `packages/pi-role-model/src/downstream-openai.ts`
- `packages/pi-role-model/src/commands.ts`
- `packages/pi-role-model/src/extension.ts`
- package tests

### Slice 7: Docs, Skill Guidance, And Safety Scans

RED tests/static checks:

- generated docs describe groups, roles, task types, capabilities, modalities, tool classes, and intent presets;
- docs explain taxonomy naming rules and role/task relationship;
- docs explain progressive classification for Pi/consumers;
- docs explain router/controller use of hard and advisory metadata;
- docs mention benchmark and telemetry as later phases only;
- `packages/pi-role-model/skills/role-model/SKILL.md` explains taxonomy discovery, compact fallback, classifier behavior, diagnostics, and authority boundaries;
- safety scan confirms Pi package still does not launch, install, stop, update, or own runtime processes and does not read Pi credentials.

Implementation files:

- `docs/**`
- `docs-site/**`
- `README.md` links where appropriate
- `packages/pi-role-model/skills/role-model/SKILL.md`
- `packages/pi-role-model/test/docs-and-safety.test.ts`

## Verification Commands

Focused commands will be selected per changed path, but the expected floor is:

```powershell
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm run runtime:validate-ui
corepack pnpm run runtime:test-browser
```

If package names differ from the above, Phase 3 must record the corrected exact commands in the RED/GREEN logs. Phase 4 must decide whether `runtime:test-critical` is runnable or still blocked by the inherited timeout from Phase 0; focused taxonomy/routing/UI/Pi evidence remains mandatory either way.

## Phase 4 Verification Plan

Phase 4 must create `04-test-summary.md` and verify:

- every normative proposal section listed in `00-requirements.md` maps to implemented files/tests or an explicit later-phase boundary;
- exact catalog IDs, labels, descriptions, group membership, guidance, counts, and references match the proposal;
- schema examples pass and malformed examples fail;
- runtime discovery and validation APIs return versioned taxonomy metadata;
- routing hard/advisory metadata changes candidate eligibility/diagnostics as specified;
- runtime UI uses existing routes and supports grouped roles plus all-role default assignment;
- Pi compact taxonomy and classifier tests cover progressive disclosure and six minimum prompts;
- docs and skill guidance are public-facing and match actual behavior;
- no Phase 5 benchmark or Phase 6 telemetry implementation was added beyond placeholders;
- no Pi runtime process ownership, launcher calls, credential reads, hidden model calls, or remote trust regressions were added.

## Phase 5 Pi-Driven QA Plan

Phase 5 must re-read `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` and use it as the verification checklist. It must be agent-operated on this local device after Phase 4 locks.

Required checks:

1. Rebuild runtime packages, runtime UI, and `pi-role-model` from this worktree.
2. Launch the rebuilt Role-Model runtime locally on a known port.
3. Command local Pi to install or update the rebuilt `pi-role-model` package.
4. Command Pi to configure the router endpoint URL and a user-facing alias.
5. Command Pi to compare package taxonomy snapshot with runtime taxonomy manifest.
6. Command Pi to list groups, roles by group, secondary role membership, and sample role task counts.
7. Command Pi to inspect or configure model role assignment where UI/API supports it.
8. Send the six minimum proposal prompts through the configured alias.
9. Inspect response/decision IDs, normalized intents, candidate filters, candidate scores, selected endpoint/model, diagnostics, and relevant runtime UI pages.
10. Record not-yet-implemented notes for proposal Phase 5 benchmark and Phase 6 telemetry surfaces.

Implementation defects found in Phase 5 must return to Phase 3 with a new failing test before repair unless they are true external Pi/runtime limitations documented with evidence.

## Safety Boundaries

Run 57 must not add:

- benchmark suite runner, benchmark scoring engine, benchmark dashboard, or benchmark-informed routing;
- production telemetry aggregation, telemetry dashboards, telemetry rollups, or telemetry-informed routing;
- a new top-level runtime UI taxonomy route;
- Role-Model runtime launcher, installer, updater, process manager, or lifecycle ownership inside `pi-role-model`;
- Pi auth-file reads, credential printing/copying/syncing, or hidden classification model calls;
- remote endpoint trust weakening.

## Gaps Found

None for Phase 2 planning. The implementation gaps from Phase 1 are covered by the TDD slice plan.

## Repair Work Performed

No production repair work was performed in Phase 2. This artifact is planning only.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`, `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- Acceptance Decision: `accepted`
- Refresh Handling: no delegated bundle or action record exists, so no refresh was needed.
- Repair Performed After Verification: `none`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `cf78d869954fc36e146ff17199b035bebccb7dfd`
- Baseline commit: `cf78d869954fc36e146ff17199b035bebccb7dfd`
- Comparison reference: `working-tree`
- Normalized baseline: `cf78d869954fc36e146ff17199b035bebccb7dfd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only cf78d869954fc36e146ff17199b035bebccb7dfd`
- Planned or claimed changed files:
  - `schemas/role-model/taxonomy/**`
  - `role-model-router/packages/core/data/taxonomy/**`
  - `role-model-router/packages/core/src/taxonomy/**`
  - `packages/pi-role-model/data/taxonomy/**`
  - `packages/pi-role-model/src/taxonomy/**`
  - runtime, UI, protocol, docs, and focused tests listed in this plan
- Actual changed files reviewed:
  - `pnpm-lock.yaml`
  - run-control artifacts under `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
- Unexplained drift:
  - none

## Requirement Completion Status

- R1 | Status: deferred | Rationale: AS-IS audit is locked in `01-as-is.md`; final completion proof remains in Phase 4/5 evidence. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R2 | Status: deferred | Rationale: canonical taxonomy implementation is planned in Slice 1. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R3 | Status: deferred | Rationale: runtime taxonomy data implementation is planned in Slices 1-2. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R4 | Status: deferred | Rationale: runtime discovery and validation APIs are planned in Slice 2. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R5 | Status: deferred | Rationale: request metadata schemas and normalization are planned in Slice 3. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R6 | Status: deferred | Rationale: router/controller taxonomy use is planned in Slice 3. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R7 | Status: deferred | Rationale: runtime UI integration is planned in Slice 4. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R8 | Status: deferred | Rationale: Pi compact taxonomy implementation is planned in Slice 5. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R9 | Status: deferred | Rationale: Pi classification and metadata sending are planned in Slice 6. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R10 | Status: deferred | Rationale: docs and skill guidance are planned in Slice 7. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R11 | Status: deferred | Rationale: safety boundaries and future extension placeholders are planned across Slices 1, 2, and 7. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R12 | Status: deferred | Rationale: versioning, compatibility, and deprecation are planned in Slices 1-3 and verified in Phase 4. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R13 | Status: deferred | Rationale: strict TDD evidence starts in Phase 3 using this slice plan. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R14 | Status: deferred | Rationale: Pi-driven rebuilt-runtime QA belongs to Phase 5 after Phase 4 locks. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R15 | Status: deferred | Rationale: proposal Phase 1-4 E2E case evidence belongs to Phase 5 after Phase 4 locks. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`

## Known Unknowns

- Exact package test names may differ from the command floor and must be corrected in Phase 3 logs.
- The inherited `runtime:test-critical` timeout may persist and must be handled honestly in Phase 4.
- Catalog generation may reveal proposal row inconsistencies; if exact proposal matching cannot be implemented, work must stop for an approved addendum.
- Runtime UI persistence shape may need a small API compatibility bridge for existing account `roleIds`.

## Audit Verdict

- Audit summary: Phase 2 maps all run 57 requirements to strict TDD slices, expected paths, verification commands, and Phase 5 QA.
- Follow-up required before lock: none.
- Audit: PASS

## Coverage Gate

Coverage: PASS

The plan covers `R1` through `R15`, uses the proposal as background, keeps run 58 draft/out of scope, and requires proposal-based Phase 5 verification.

## Approval Gate

Approval: PASS

Requirement 57 was already approved by the user. Phase 2 is ready to lock before implementation begins.
