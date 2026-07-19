Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-23T09:59:01Z`
LockHash: `6563f62bcfb048d57566f46329ff311fc0a6ad27d00b0a9145cbdce5b8de15cf`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- Current runtime router and host bridge source
- Current runtime UI source
- Current `packages/pi-role-model` source
- Current protocol schemas and docs/testdata
Outputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
Scope note: This artifact audits the unimplemented baseline for approved run 57 before Phase 2 planning or Phase 3 production changes.
Audit Execution Mode: `self-audit`
Subagent Availability: `not used`
Subagent Capability Probe: `Phase 1 required local source inventory across runtime, UI, protocol schemas, docs, and Pi package. No delegated subagent was needed for source reads; controller performed direct source verification.`
Audit Scope: `Run 57 Phase 1-4 feasibility and implementation baseline for taxonomy, runtime discovery/validation, router/controller use, runtime UI integration, Pi compact taxonomy/classification, docs, versioning, and scope boundaries.`
Audit Result: `PASS`
Audit: PASS

## TODO

- [x] Re-read locked run 57 requirement
- [x] Re-read Phase 0 worktree artifact and inherited baseline validation state
- [x] Confirm proposal heading structure and normative sections
- [x] Inventory current canonical role/task/capability sources
- [x] Inventory current protocol schemas and routing request shape
- [x] Inventory current router/controller role/task decision use
- [x] Inventory current host bridge role/task APIs
- [x] Inventory current runtime UI routes/components for model role assignment and role catalog
- [x] Inventory current `pi-role-model` package surfaces
- [x] Inventory docs/testdata that still use old role/task IDs
- [x] Identify missing proposal repository paths and Phase 2 reconciliation needs

## Audit Context

This Phase 1 audit establishes the AS-IS state for approved requirement 57. The run implements proposal phases 1-4 only. Run 58 remains draft and proposal phases 5-6 remain later work except for reserved extension points and explicit QA notes required by run 57.

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `Phase 1 required local source inventory across runtime, UI, protocol schemas, docs, and Pi package. No delegated subagent tool was available or necessary for this local source audit.`
Delegation Decision Basis: `self-audit selected because this phase was source inventory and requirement reconciliation, not an independent code review of implemented changes.`
Audit Inputs Provided: `00-requirements.md`, `00-worktree.md`, proposal heading inventory, current runtime/router/UI/Pi/protocol/docs/testdata source reads.

## Audit Verdict

Audit: PASS

The repository is feasible for run 57 implementation, but the proposal taxonomy is not already present. Implementation must add new taxonomy schemas/data/source, extend existing runtime/UI/Pi surfaces, preserve run 56 Pi safety boundaries, and use strict TDD before production behavior changes.

## Earlier Phase Reconciliation

Phase 0 created the isolated worktree, copied and locked the approved requirement, installed dependencies, and recorded an inherited baseline validation failure. This Phase 1 audit reconciles with Phase 0 as follows:

- Work continues in `D:/DEV/role-model/.worktrees/57-role-model-taxonomy-v1-phase-1-4`.
- Baseline commit remains `cf78d869954fc36e146ff17199b035bebccb7dfd`.
- `corepack pnpm install --frozen-lockfile` passed and added a missing `packages/pi-role-model` importer entry to `pnpm-lock.yaml`.
- `corepack pnpm run runtime:test-critical` failed before implementation due to inherited runtime UI/observability validator timeouts.
- No production source has been edited in Phase 1.

## Effective Inputs Re-read

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` heading inventory
- `role-model-router/packages/roles/src/index.ts`
- `role-model-router/packages/tasks/src/index.ts`
- `role-model-router/packages/core/src/types.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx`
- `packages/pi-role-model/package.json`
- `packages/pi-role-model/src/**` inventory
- `packages/pi-role-model/test/**` inventory
- `protocol/schemas/**` inventory

## Prior Recursive Evidence Reviewed

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`: approved run 57 scope, exact proposal matching requirements, TDD and Phase 5 QA requirements.
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`: worktree, branch, baseline commit, setup command, inherited baseline validation failure, and diff basis.
- `/.recursive/run/56-pi-role-model-gap-closure/01-as-is.md`: structural reference for recursive audit format only; run 56 implementation findings were not used as a substitute for run 57 source reads.

## Proposal Baseline

The approved requirement treats `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` as normative background for Phase 1 through Phase 4. The proposal has explicit sections for canonical groups, role group membership, roles, task types, capabilities, modalities, tool classes, data model, UI/UX, progressive disclosure, classification contract, RBAC/extensibility, runtime discovery, request metadata, router/controller decision use, validation, versioning, repository shape, generated docs, runtime/consumer responsibilities, and Phase 1-4 E2E cases.

Phase 1 confirms that the repo does not yet contain the proposal taxonomy implementation. Implementation must therefore add the canonical taxonomy rather than trying to patch an existing V1 taxonomy.

## Current Behavior by Requirement

| Requirement | Current behavior |
| --- | --- |
| `R1` | AS-IS audit is now documented by this artifact. |
| `R2` | No proposal V1 canonical taxonomy data, manifest, schemas, or golden parity tests exist. |
| `R3` | Runtime core still uses old roles/tasks and has no taxonomy data loaders or generated docs source. |
| `R4` | Host bridge exposes role/task policy APIs but not taxonomy discovery, compact retrieval, validation, or effective taxonomy APIs. |
| `R5` | Current routing input uses `requestedRoleId`, `taskType`, capability/modalities arrays, and `needsTools`; no `role_model.intent` contract exists. |
| `R6` | Router uses old fields for eligibility/scoring and controller guidance uses old heuristic role/task IDs. |
| `R7` | Existing UI routes/components render flat role lists and role/task policy, not grouped taxonomy and all-role default assignment. |
| `R8` | Pi package has no compact taxonomy snapshot or progressive disclosure loaders. |
| `R9` | Pi package has no progressive classifier and sends no proposal-shaped role/task/capability/modality/tool metadata. |
| `R10` | Public docs and skill guidance still use older role/task examples and do not explain taxonomy V1. |
| `R11` | Existing Pi safety boundaries are present; future benchmark/telemetry scope is not yet encoded in taxonomy extension points. |
| `R12` | No split schema/taxonomy/database/content/classification versioning for taxonomy exists. |
| `R13` | TDD has not started; Phase 3 must begin with failing tests. |
| `R14` | Pi-driven rebuilt-runtime QA is pending for Phase 5 after implementation verification. |
| `R15` | Proposal Phase 1-4 E2E cases are pending for Phase 5 evidence. |

## Relevant Code Pointers

| Area | Files |
| --- | --- |
| Existing roles/tasks | `role-model-router/packages/roles/src/index.ts`, `role-model-router/packages/tasks/src/index.ts` |
| Router request and decision types | `role-model-router/packages/core/src/types.ts`, `role-model-router/packages/core/src/router.ts` |
| Protocol schemas | `protocol/schemas/role-definition.schema.json`, `protocol/schemas/task-definition.schema.json`, `protocol/schemas/role-binding.schema.json`, `protocol/schemas/router-decision.schema.json` |
| Host bridge role/task APIs | `role-model-router/apps/runtime-host-bridge/src/index.ts` |
| Runtime UI API and routes | `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`, `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx` |
| Pi package | `packages/pi-role-model/package.json`, `packages/pi-role-model/src/**`, `packages/pi-role-model/test/**` |
| Old docs/testdata | `docs/public/**`, `testdata/**`, `protocol/fixtures/router-golden/**` |

## Evidence

Commands executed from the run 57 worktree:

```powershell
git status --short --branch
rg -n "api/role-model/roles|api/role-model/role-policy|api/role-model/tasks|listRole|updateRole|roleDefinitions|taskDefinitions" role-model-router/apps/runtime-host-bridge/src/index.ts
rg -n "export interface RuntimeRolePolicy|RuntimeRolePolicyRole|RuntimeTaskDefinition|modelRoleBindings|fetchRolePolicy|updateRole|roleDefinitions|taskDefinitions" role-model-router/apps/runtime-ui/app/lib/runtime-api.ts role-model-router/apps/runtime-ui/app/routes/control-models.tsx role-model-router/apps/runtime-ui/app/routes/control-roles.tsx role-model-router/apps/runtime-ui/app/routes/local-peer-models.tsx role-model-router/apps/runtime-ui/app/routes/local-llama-swap-models.tsx
rg --files protocol/schemas
Test-Path schemas/role-model/taxonomy; Test-Path role-model-router/packages/core/data/taxonomy; Test-Path packages/pi-role-model/data/taxonomy
Select-String -Path D:\DEV\role-model-proposals\16-role-model-taxonomy-v1-proposal.md -Pattern '^#|^##|^###'
```

Observed evidence:

- Proposal taxonomy path checks returned `False`, `False`, `False`.
- Protocol schema inventory does not include a routing request schema or taxonomy V1 schemas.
- Host bridge route search found current role/task policy APIs.
- Runtime UI search found current `RuntimeRolePolicyRole`, `RuntimeTaskDefinition`, and flat `modelRoleBindings`.
- `git diff -- pnpm-lock.yaml` shows only a missing importer entry for `packages/pi-role-model` from dependency installation.

## Reproduction Steps (Novice-Runnable)

From the implementation worktree:

```powershell
cd D:\DEV\role-model\.worktrees\57-role-model-taxonomy-v1-phase-1-4
git status --short --branch
Test-Path schemas/role-model/taxonomy
Test-Path role-model-router/packages/core/data/taxonomy
Test-Path packages/pi-role-model/data/taxonomy
Get-Content role-model-router/packages/roles/src/index.ts
Get-Content role-model-router/packages/tasks/src/index.ts
rg --files protocol/schemas
```

Expected baseline result: taxonomy paths are absent, role/task defaults are the old small lists, and protocol schemas do not include proposal V1 taxonomy contracts.

## Gaps Found

None for the Phase 1 AS-IS audit. The current-state inventory is complete enough to proceed to Phase 2 planning.

## Implementation Gaps Carried Forward

- Proposal V1 taxonomy schemas/data/source paths are missing.
- Current role/task defaults use old IDs and do not satisfy the exact canonical catalog.
- Current request metadata has no proposal-shaped `role_model.intent`.
- Current router/controller logic has no normalized hard/advisory taxonomy semantics.
- Current host bridge lacks taxonomy discovery, validation, compact retrieval, and effective taxonomy routes.
- Current runtime UI lacks grouped roles, all-role default assignment, task drill-down modal behavior from taxonomy metadata, and model assignment override shape.
- Current Pi package lacks compact taxonomy data, progressive disclosure loaders, classifier, version comparison, and metadata sending.
- Current docs/testdata use older examples and require migration or compatibility framing.
- Taxonomy versioning, deprecation, RBAC/effective taxonomy, benchmark placeholders, and telemetry placeholders are not yet implemented.

## Repair Work Performed

No production repair work was performed in Phase 1. The only file added by this phase is this audit artifact.

The dependency-install side effect from Phase 0 remains a modified `pnpm-lock.yaml` importer entry for `packages/pi-role-model`. Phase 2 must classify it as workspace metadata repair or remove it if later commands prove it is unnecessary.

## Subagent Contribution Verification

Subagents were not used. All Phase 1 evidence was gathered directly in the implementation worktree with local source reads and searches.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `cf78d869954fc36e146ff17199b035bebccb7dfd`
- Baseline commit: `cf78d869954fc36e146ff17199b035bebccb7dfd`
- Comparison reference: `working-tree`
- Normalized baseline: `cf78d869954fc36e146ff17199b035bebccb7dfd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only cf78d869954fc36e146ff17199b035bebccb7dfd`

Current expected diffs:

- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `pnpm-lock.yaml` importer entry for `packages/pi-role-model`

No production taxonomy implementation files have been edited.


## Current Taxonomy Sources

Current runtime role/task defaults are small, flat, and older than the proposal taxonomy:

| Source | Current shape |
| --- | --- |
| `role-model-router/packages/roles/src/index.ts` | `defaultRoles` contains `general.chat`, `coder.patch`, `coder.review`, `tool.agent`, `embedder`, `classifier`, and `language.detector`. |
| `role-model-router/packages/tasks/src/index.ts` | `defaultTasks` contains `text.chat`, `code.edit`, `tools.function_calling`, `embeddings.text`, `text.classification`, `text.language_detection`, and `json.schema_adherence`. |
| `testdata/endpoint-metadata/sample-endpoints.json` | Uses old capabilities including `text.chat`, `code.edit`, `reasoning.multi_step`, `tools.function_calling`, and `embeddings.text`. |
| `testdata/prompts/*` and `testdata/eval-cases/*` | Use old task types such as `code.edit`, `text.chat`, `reasoning.multi_step`, and `json.schema_adherence`. |

There is no implemented concept of canonical taxonomy groups, primary/secondary role group membership, role-family task naming, intent presets, group-first progressive disclosure, or proposal V1 taxonomy version metadata.

## Missing Proposal Paths

The proposal's expected taxonomy paths do not exist at baseline:

| Path | Baseline state |
| --- | --- |
| `schemas/role-model/taxonomy/**` | missing |
| `role-model-router/packages/core/data/taxonomy/**` | missing |
| `role-model-router/packages/core/src/taxonomy/**` | missing |
| `packages/pi-role-model/data/taxonomy/**` | missing |
| `packages/pi-role-model/src/taxonomy/**` | missing |

Phase 2 must either use these exact paths or record a repo-native reconciliation before implementation. The approved requirement allows path reconciliation only if Phase 1 records it and Phase 2 approves it.

## Protocol Schema Baseline

Existing protocol schemas are in `protocol/schemas`. Relevant current files include:

- `role-definition.schema.json`
- `task-definition.schema.json`
- `role-binding.schema.json`
- `router-decision.schema.json`
- `routing-policy.schema.json`
- `capability-taxonomy.schema.json`
- benchmark, trace, usage, and observed profile schemas

Current `role-definition.schema.json` fields include `role_id`, `name`, `description`, `role_kind`, `default_system_instructions`, `task_types_supported`, capabilities, `tool_policy`, routing overrides, output contracts, and safety refs.

Current `task-definition.schema.json` fields include `task_type`, `description`, `required_inputs`, capabilities, `quality_metrics`, `allowed_roles`, and benchmark suite refs.

Current `role-binding.schema.json` fields include `binding_id`, `role_id`, `endpoint_id`, `status`, policy overrides, `effective_capabilities`, and `effective_task_types`.

There is no `protocol/schemas/routing-request.schema.json` and no proposal-shaped taxonomy manifest, group, role, task, compact snapshot, effective taxonomy, routing intent, classification, model role assignment, or taxonomy request metadata schema.

## Router And Controller Baseline

`role-model-router/packages/core/src/types.ts` defines `RoutingRequest` with old routing metadata:

- `requestedRoleId`
- `taskType`
- `requiredCapabilities`
- `preferredCapabilities`
- `requiredModalities`
- `needsTools`
- strategy, locality, budget, and allow/deny fields

`RouteRequestInput` accepts optional `roleDefinitions`, `taskDefinitions`, and `roleBindings`.

`role-model-router/packages/core/src/router.ts` currently uses role/task definitions and role bindings for eligibility. Existing exclusion semantics include unsupported task, role not allowed, role-binding task not allowed, missing capabilities, missing modalities, tools unsupported, context too small, policy denies, provider health, quota, budget, and region constraints.

The router does not yet normalize proposal-shaped `role_model.intent`, does not split hard/advisory intent fields, does not store taxonomy schema/content/classification versions in persisted decisions, and does not expose proposal V1 diagnostics for classification source, confidence, alternatives, role group, task action, variant, modalities, or tool classes.

The host bridge has heuristic controller guidance in `runtime-host-bridge/src/index.ts` that infers old `coder.patch`, `coder.review`, `general.chat`, `code.edit`, and `text.chat` metadata from prompt text. That guidance is not proposal-taxonomy aware.

## Host Bridge API Baseline

`role-model-router/apps/runtime-host-bridge/src/index.ts` currently exposes role/task APIs:

- `GET /api/role-model/roles`
- `GET /api/role-model/role-policy`
- `POST /api/role-model/roles`
- `PUT /api/role-model/roles/:id`
- `GET /api/role-model/tasks`
- `PUT /api/role-model/tasks`

The host bridge maintains `currentRolePolicy.roleDefinitions` and `currentRolePolicy.taskDefinitions` and builds a runtime role catalog from them. It has validation for duplicate role IDs, duplicate task types, and task `allowed_roles` references. It does not expose proposal taxonomy discovery routes such as manifest, compact groups, role summaries, role chunks, task chunks, validation, or effective taxonomy endpoints.

Existing benchmark endpoints are present under `/api/role-model/benchmark/*`, but run 57 must not implement proposal Phase 5 benchmark scoring/routing behavior beyond reserved taxonomy fields and documentation.

## Runtime UI Baseline

Existing UI routes are declared in `role-model-router/apps/runtime-ui/app/routes.ts`. Relevant routes already exist and should be extended rather than replaced:

- `/app/models`
- `/app/models/roles`
- `/app/models/benchmark`
- `/app/router/candidates`
- `/app/router/decisions`
- `/app/router/decisions/:requestId`
- `/app/observe/requests`
- `/app/observe/routing`
- `/app/observe/requests/:requestId`
- `/app/local/peer-models`
- `/app/local/llama-swap/models`
- `/app/remote/providers`

`role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` defines current `RuntimeRolePolicyRole`, `RuntimeTaskDefinition`, and `RuntimeRolePolicy` types with the old flat role/task shapes. `RuntimeAccount.modelRoleBindings` currently stores only `{ modelId, roleIds }[]`.

`role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx` renders a flat role checkbox list with selected role IDs. There is no group display, all-roles assignment mode, disabled-role list, task override UI, or role task drill-down from canonical taxonomy chunks.

`role-model-router/apps/runtime-ui/app/routes/control-models.tsx` renders role checkboxes for model/account bindings from `rolePolicy.roleDefinitions`. The current default is whatever the account binding contains; there is no visible checked all-roles default or `roleAssignmentMode`.

`role-model-router/apps/runtime-ui/app/routes/control-roles.tsx` shows a role catalog and nested task detail from live role policy, but it is not grouped by canonical taxonomy group and does not use proposal metadata for primary/secondary membership, task variants, classifier guidance, UI icons, accents, or progressive disclosure.

## Pi Package Baseline

`packages/pi-role-model/package.json` is currently public-facing package metadata for `@try-works/pi-role-model` version `0.1.1`. It registers one extension and one skill and currently publishes only `extensions`, `skills`, and `src`.

Current source files include:

- `src/config.ts`
- `src/runtime-discovery.ts`
- `src/downstream-openai.ts`
- `src/provider-registration.ts`
- `src/alias-store.ts`
- `src/commands.ts`
- `src/extension.ts`
- `src/types.ts`

Current tests cover discovery, downstream OpenAI mapping, commands, extension registration, config, alias store, manifest metadata, docs, and safety.

The package can discover an externally running runtime, register a `role-model` provider, expose `/role-model` commands, select aliases, and preserve run 56 endpoint trust/auth fail-closed behavior. It does not include a compact taxonomy snapshot, taxonomy manifest/hash comparison, group-first lookup, role task lazy loading, progressive classifier, `role_model.intent` request metadata construction, runtime effective taxonomy override, version mismatch diagnostics, or request classification tests.

The package also does not own, install, start, stop, update, or launch the Role-Model runtime. That boundary must be preserved.

## Docs And Testdata Baseline

Public docs still use the older vocabulary:

- `docs/public/concepts/how-role-model-works.md` uses `code.edit`.
- `docs/public/concepts/protocol-overview.md` uses `coder.patch`, `code.edit`, and old capability examples.
- `docs/public/quickstart.md` uses `taskType: "code.edit"`.

Testdata and router golden fixtures also use old role/task IDs. Phase 2 must decide which fixtures are compatibility examples and which should be migrated or supplemented with proposal V1 fixtures.

## Worktree And Baseline State

Implementation worktree:

```text
D:/DEV/role-model/.worktrees/57-role-model-taxonomy-v1-phase-1-4
```

Branch:

```text
recursive/57-role-model-taxonomy-v1-phase-1-4
```

Baseline commit:

```text
cf78d869954fc36e146ff17199b035bebccb7dfd
```

Phase 0 recorded `corepack pnpm install --frozen-lockfile` as PASS. The install modified `pnpm-lock.yaml` by adding the missing `packages/pi-role-model` importer entry; Phase 2 must decide whether to keep this lockfile repair as required workspace metadata or isolate it from product implementation accounting.

Phase 0 recorded `corepack pnpm run runtime:test-critical` as FAIL on the unmodified baseline due to internal `60000ms` timeouts in `test/validate-ui.test.ts` and `test/validate-observability.test.ts`. `corepack pnpm run runtime:validate-ui` passed, while `corepack pnpm run runtime:validate-observability` timed out after approximately `304s`. Phase 4 must distinguish inherited baseline timeout from run 57 regressions.

## Requirement Completion Status

- R1 | Status: deferred | Rationale: Phase 1 AS-IS audit is recorded in this artifact, but recursive run-control files are excluded from product diff accounting; final R1 closeout verification remains in later audited phases. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R2 | Status: deferred | Rationale: Phase 1 records that canonical taxonomy implementation is absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R3 | Status: deferred | Rationale: Phase 1 records that runtime taxonomy data implementation is absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R4 | Status: deferred | Rationale: Phase 1 records that taxonomy discovery and validation APIs are absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R5 | Status: deferred | Rationale: Phase 1 records that request metadata schema implementation is absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R6 | Status: deferred | Rationale: Phase 1 records that router/controller taxonomy use is absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R7 | Status: deferred | Rationale: Phase 1 records that runtime UI taxonomy integration is absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R8 | Status: deferred | Rationale: Phase 1 records that Pi compact taxonomy implementation is absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R9 | Status: deferred | Rationale: Phase 1 records that Pi progressive classification is absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R10 | Status: deferred | Rationale: Phase 1 records that generated taxonomy docs and skill guidance are absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R11 | Status: deferred | Rationale: Phase 1 records existing safety boundaries and missing future extension placeholders, both scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R12 | Status: deferred | Rationale: Phase 1 records that taxonomy versioning/deprecation semantics are absent and scheduled for Phase 3 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R13 | Status: deferred | Rationale: Strict TDD and verification evidence belong to Phase 3 and Phase 4 after Phase 2 planning. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R14 | Status: deferred | Rationale: Pi-driven rebuilt-runtime QA belongs to Phase 5 after implementation and Phase 4 verification are locked. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- R15 | Status: deferred | Rationale: Proposal Phase 1-4 E2E evidence belongs to Phase 5 after implementation and Phase 4 verification are locked. | Deferred By: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`

| Requirement | Phase 1 status | Notes |
| --- | --- | --- |
| `R1` AS-IS audit | covered | This artifact records current taxonomy, schema, runtime, UI, Pi, docs, testdata, and baseline validation state. |
| `R2` canonical taxonomy | pending | No V1 taxonomy exists; requires new data/schema/tests. |
| `R3` runtime taxonomy data | pending | No core taxonomy data/source package exists. |
| `R4` discovery/validation APIs | pending | Current role/task APIs exist, taxonomy discovery APIs missing. |
| `R5` request metadata/schema | pending | Current request shape is old flat `requestedRoleId`/`taskType`. |
| `R6` router/controller use | pending | Router uses old fields; no proposal normalized intent yet. |
| `R7` runtime UI integration | pending | Existing routes/components identified; grouped/default-all assignment missing. |
| `R8` Pi compact taxonomy | pending | Pi has no taxonomy data or loader. |
| `R9` Pi classification | pending | Pi has no progressive classifier or metadata sender. |
| `R10` docs/skill guidance | pending | Existing docs need generated taxonomy and consumer guidance. |
| `R11` scope/extension boundaries | pending | Existing Pi safety boundaries must be preserved; benchmark/telemetry remain future. |
| `R12` versioning/deprecation | pending | No split schema/taxonomy/database/content/classification versioning yet. |
| `R13` strict TDD/verification | pending | Phase 3 must start with failing tests before production behavior. |
| `R14` Pi-driven rebuilt-runtime QA | pending | Phase 5 only, after Phase 4. |
| `R15` proposal E2E cases | pending | Phase 5 only, using proposal as checklist. |

## Phase 2 Planning Constraints

- Use the proposal as the source of truth for canonical IDs, labels, descriptions, guidance, compatibility, and schema semantics.
- Add exact taxonomy paths unless Phase 2 records an explicit repo-native reconciliation.
- Preserve existing routes and extend them; do not create a separate top-level taxonomy app route.
- Preserve existing Pi package safety boundaries from run 56.
- Keep run 58 and proposal Phase 5/6 benchmark/telemetry implementation out of scope except for reserved fields, documentation, and later-phase extension points.
- Start Phase 3 with failing tests for every production behavior slice.
- Include explicit compatibility treatment for old role/task fixtures and public docs so existing routing tests are not broken accidentally.
- Use focused passing tests to cover changed taxonomy behavior even if inherited baseline validator timeouts remain.

## Traceability

Requirement IDs explicitly covered by this audit: `R1`, `R2`, `R3`, `R4`, `R5`, `R6`, `R7`, `R8`, `R9`, `R10`, `R11`, `R12`, `R13`, `R14`, and `R15`.

| Finding | Source evidence | Phase 2 implication |
| --- | --- | --- |
| No V1 taxonomy paths exist | `Test-Path` checks returned false for proposal taxonomy paths | Add canonical taxonomy schema/data/source paths. |
| Current roles/tasks are old flat lists | `packages/roles/src/index.ts`, `packages/tasks/src/index.ts` | Replace or bridge defaults to proposal V1 with compatibility tests. |
| Current routing request lacks `role_model.intent` | `packages/core/src/types.ts` | Add normalized request metadata contract and router validation. |
| Current UI has existing routes to extend | `apps/runtime-ui/app/routes.ts`, `DESIGN_SYSTEM.md` | Implement proposal UI on existing pages. |
| Current model role bindings store only `roleIds` | `runtime-api.ts` | Extend persistence/API shape for all-role default and overrides. |
| Pi package lacks compact taxonomy/classifier | `packages/pi-role-model/src` and tests | Add package data, loaders, classifier, and request metadata tests. |
| Docs/testdata use old role/task examples | `docs/public/**`, `testdata/**` | Update or supplement examples during docs/test phase. |
| Baseline critical validation times out | `00-worktree.md` | Phase 4 must record inherited failure and provide focused changed-path evidence. |

## Self-Audit

Coverage:

- Proposal source and normative sections: covered by proposal baseline and requirement reference.
- Current source shape: covered for taxonomy defaults, schemas, router request shape, host bridge APIs, runtime UI, Pi package, docs, and testdata.
- Missing implementation paths: covered.
- Phase 2 constraints and risks: covered.
- Run 58 draft boundary: preserved; no run 58 artifact was read or modified in this worktree.

Residual risks:

- The proposal catalog is large; Phase 2 should choose generation/checking mechanisms that avoid manual drift from the proposal.
- The runtime has inherited slow validator behavior; Phase 4 must avoid conflating baseline timeouts with taxonomy regressions.
- Existing old role/task IDs may be compatibility-sensitive in fixtures and docs; implementation must make compatibility decisions explicit.

## Known Unknowns

- Whether the `pnpm-lock.yaml` importer repair should be committed as part of run 57 or separated as setup hygiene.
- Whether all old role/task IDs should remain accepted as compatibility aliases or be migrated only in docs/testdata while runtime defaults move to taxonomy V1.
- Whether inherited observability validation timeouts will persist after implementation; Phase 4 must run focused changed-path tests regardless.
- Whether host bridge persistence should store full model role assignment objects in the existing account shape or a new policy-adjacent shape; Phase 2 must decide before tests.

## Coverage Gate

Coverage: PASS

This artifact satisfies `R1` by auditing existing role/task taxonomy sources, schemas, runtime routing/controller surfaces, host bridge APIs, runtime UI pages/components, Pi package behavior, docs/testdata, proposal path gaps, inherited validation state, and implementation constraints for run 57.

## Approval Gate

Approval: PASS

Phase 1 is ready to lock. The AS-IS state is documented and no production implementation has started.
