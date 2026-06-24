# Implementation Summary Addendum 01: Run 57 Gap Closure Audit

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `03 Implementation Summary Addendum 01`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.run57-gap-closure-audit.addendum-01.md`  
Status: `LOCKED`
LockedAt: `2026-06-23T14:21:38Z`
LockHash: `601301733c9d90ede6d531bfe4a10b32d397fc4eb06030303b00a3ba72d0c9e7`
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation addendum  
CreatedAt: `2026-06-23`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`  
Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/04-test-summary.md`
- Run 57 implementation audit findings against proposal phases 1 through 4
Outputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.run57-gap-closure-audit.addendum-01.md`
Scope note: Run-local addendum to the locked Run 57 implementation summary. It records post-implementation audit gaps and the required corrections for a follow-up recursive run.

## Purpose

Run 57 implemented the first Role-Model Taxonomy V1 rollout across runtime taxonomy data, runtime discovery and routing, existing runtime UI surfaces, and `pi-role-model` consumer integration. A follow-up audit found that the implementation has the right structural outline but does not yet fully satisfy the proposal's exact catalog, stable request contract, validation behavior, Pi runtime-taxonomy precedence, compact package data, schema enforcement, release receipts, and model role assignment semantics.

This addendum is an authoritative gap-closure plan for the next implementation run. It does not replace the original proposal. It narrows the required corrective work needed before phases 1 through 4 can be considered complete.

## TODO

- [x] Preserve the original proposal as the base artifact
- [x] Convert every Run 57 audit finding into an explicit correction requirement
- [x] Keep proposal phases 5 and 6 out of implementation scope except extension points
- [x] Require strict TDD and verifiable implementation evidence
- [x] Require rebuilt local runtime and live Pi verification
- [x] Add traceability from audit finding to addendum section and verification type

## Workflow Alignment

This file follows the recursive run-local addendum naming pattern:

```text
addenda/<base-phase-artifact>.<slug>.addendum-<NN>.md
```

This addendum amends the Run 57 implementation record. A follow-up recursive run that implements these corrections must list this file as an effective input in its `00-requirements.md`, `01-as-is.md`, `02-to-be-plan.md`, and later phase artifacts that depend on the gap analysis.

## Non-Goals

- Do not implement proposal Phase 5 taxonomy-aware benchmarks in this gap-closure run.
- Do not implement proposal Phase 6 telemetry aggregation dimensions in this gap-closure run.
- Do not change the approved V1 role, group, capability, modality, or tool-class vocabulary unless the proposal is explicitly amended.
- Do not create a separate top-level taxonomy product surface in the runtime UI.
- Do not make `pi-role-model` own, install, start, stop, update, or launch the Role-Model runtime process.

## Required Corrections

### G1: Exact Canonical Task Catalog

Finding: The implementation generates generic task records from role task suffixes. The generated records do not match the proposal's exact task table for labels, descriptions, classifier guidance, compatible roles, required capabilities, preferred capabilities, and routing meaning.

Required changes:

- Replace generated task semantics with proposal-owned canonical task records.
- Keep the approved counts: `6` groups, `28` roles, `280` task types, `46` capabilities, `9` modalities, `15` tool classes, and `0` canonical intent presets.
- Preserve task ID naming: `{role-family}.{task-action}[.{variant}]`.
- Ensure every role has at least `10` native task types whose first ID segment matches the role ID.
- Ensure every task record includes:
  - `id`
  - `kind: "task_type"`
  - `label`
  - `description`
  - `classifier.useWhen`
  - `classifier.doNotUseWhen`
  - `primaryRole`
  - `compatibleRoles`
  - `requiredCapabilities`
  - `preferredCapabilities`
  - `requiredModalities`
  - `toolClasses`
  - `variants`
  - `authority`
  - `stability`
- Ensure proposal examples match exactly, including:
  - `coder.review` label `Code Review`, compatible roles `coder`, `security`, `architect`, required capability `code.read`, preferred capability `reasoning.multi_step`.
  - `operator.install` label `Installation`, compatible roles `operator`, `coder`, `support`, required capability `tools.function_calling`, preferred capability `tools.command_execution`.
  - all other explicitly listed proposal task rows.

Implementation requirements:

- The canonical source of truth must be versioned JSON data under `role-model-router/packages/core/data/taxonomy/`.
- Runtime TypeScript exports must load, validate, normalize, and expose that data instead of deriving authoritative semantics from generic suffix arrays.
- Any generated TypeScript helper may be derived from the JSON data, but the JSON data remains authoritative.

Verification:

- Add exact snapshot or fixture tests for all approved canonical task rows from the proposal.
- Add targeted tests for `coder.review`, `operator.install`, cross-role compatibility, and required/preferred capabilities.
- Add a validator that fails if JSON data and runtime exports diverge.
- Add a validator that fails if any task's generated docs, runtime endpoint response, or Pi compact data changes the canonical task semantics.

### G2: Stable Request Classification Contract

Finding: The proposal defines a stable wire shape using `role_model.contract_version` and snake_case intent fields such as `task_type`, `role_hint_id`, `requested_role_id`, `required_capabilities`, `preferred_capabilities`, `required_modalities`, and `tool_classes`. The implementation accepts and emits an implementation-specific camelCase shape with nested `role`, `task`, `capabilities`, `modalities`, and `toolClasses`.

Required changes:

- Implement the proposal stable request contract as the primary external wire contract:

```json
{
  "role_model": {
    "contract_version": 1,
    "intent": {
      "task_type": "coder.review",
      "task_action": "review",
      "task_variant": null,
      "task_source": "client.rule",
      "task_confidence": 0.91,
      "role_hint_id": "security",
      "requested_role_id": null,
      "role_source": "user",
      "required_capabilities": ["code.read"],
      "preferred_capabilities": ["security.analysis"],
      "required_modalities": ["text"],
      "tool_classes": ["filesystem.read"],
      "context_tokens_estimate": 42000,
      "taxonomy_version": "1.0.0-alpha.1",
      "content_revision": "taxonomy-v1-alpha.1",
      "classification_contract_version": "role-model.classification.v1"
    }
  }
}
```

- Normalize the external contract into an internal router intent shape before routing.
- Keep backwards compatibility for the current camelCase shape only as a transitional adapter if needed, but do not document it as the stable consumer contract.
- Strip or sanitize `role_model` before forwarding upstream to providers.
- Persist the normalized intent plus the original contract versions used at request time in request observations and routing diagnostics.

Verification:

- Add request-mapping tests for the proposal-shaped payload on chat completions and responses paths.
- Add Pi package tests proving `pi-role-model` emits the stable proposal contract.
- Add runtime tests proving provider-bound requests do not include raw `role_model`.
- Add docs and skill tests that reject or flag stale camelCase-only examples.

### G3: Hard And Advisory Validation

Finding: Live request handling does not fully enforce the proposal's validation rules. Unknown hard role/task/capability/modality fields can be ignored rather than rejected, and unknown advisory fields do not consistently produce diagnostics.

Required changes:

- Implement live request validation before routing:
  - unknown hard `requested_role_id` rejects the request;
  - unknown hard `task_type` rejects the request;
  - unknown required capability rejects the request;
  - unknown required modality rejects the request;
  - incompatible requested role and task rejects the request;
  - unsupported taxonomy version rejects or explicitly degrades with a diagnostic;
  - unknown advisory `role_hint_id` is ignored with a diagnostic;
  - unknown preferred capability is ignored with a diagnostic;
  - unauthorized advisory taxonomy entry is ignored with a diagnostic.
- Apply validation identically on chat completions and responses ingress.
- Record accepted, ignored, rejected, and degraded metadata in routing diagnostics.
- Ensure the controller receives normalized intent and eligible candidates only.
- Ensure hard constraints filter candidates before scoring or controller selection.
- Ensure advisory signals may influence scoring only after hard eligibility filtering.

Verification:

- Add tests for valid metadata, invalid hard metadata, invalid advisory metadata, and incompatible requested role/task metadata.
- Add tests proving rejected hard metadata returns a deterministic HTTP error with actionable diagnostics.
- Add tests proving ignored advisory metadata is absent from normalized routing constraints but present in diagnostics.
- Add tests proving the controller cannot select a candidate filtered by hard role/task/capability/modality constraints.

### G4: Pi Runtime Effective Taxonomy Precedence

Finding: The Pi package skill says to prefer the live runtime taxonomy, but package code currently classifies from the packaged compact snapshot and runtime discovery does not fetch `/api/role-model/taxonomy/effective` or compact taxonomy endpoints.

Required changes:

- Add `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts`.
- At setup/status or first request time, Pi must:
  1. fetch `/api/role-model/taxonomy/manifest` or `/api/role-model/taxonomy/effective`;
  2. compare `taxonomyVersion`, `contentRevision`, and `classificationContractVersion`;
  3. fetch compact groups, role summaries, and only needed role task chunks from the runtime when compatible;
  4. use the runtime effective taxonomy for classification when available;
  5. fall back to the package snapshot only when runtime taxonomy is unavailable, incompatible, or malformed;
  6. report degraded fallback and version mismatch clearly.
- Runtime effective taxonomy must take precedence over packaged data.
- The consumer classification algorithm must remain progressive:
  - groups first;
  - role summaries next;
  - task chunks only for likely role families or ambiguous role pairs;
  - task detail only when needed for diagnostics or final validation.

Verification:

- Add Pi unit tests for runtime taxonomy success, runtime taxonomy version mismatch, runtime taxonomy malformed response, runtime unavailable fallback, and compact package fallback.
- Add Pi integration tests using mocked runtime taxonomy endpoints.
- Add an agent-operated QA script or receipt showing Pi updates/installs the local package, reads live runtime taxonomy, classifies requests, and emits stable `role_model.intent` metadata.

### G5: Complete Pi Compact Taxonomy Snapshot

Finding: The runtime taxonomy has `280` tasks, while the packaged Pi compact manifest reports `86` tasks and most roles expose only three or four tasks. This prevents Pi from progressively reading the actual built taxonomy.

Required changes:

- Generate Pi compact taxonomy data from the canonical runtime JSON taxonomy.
- `packages/pi-role-model/data/taxonomy/compact-manifest.json` must include:
  - schema version;
  - taxonomy version;
  - content revision;
  - classification contract version;
  - counts for groups, roles, tasks, capabilities, modalities, and tool classes;
  - entry file references;
  - content hashes for compact files.
- Each role task chunk must include every native task for that role, with enough classifier guidance for Pi to classify without loading the full taxonomy.
- Compact task entries must include at least:
  - `id`
  - `label`
  - `description`
  - `useWhen`
  - `doNotUseWhen`
  - `primaryRole`
  - `compatibleRoles`
  - `requiredCapabilities`
  - `preferredCapabilities`
  - `requiredModalities`
  - `toolClasses`
  - `variants`
- Package tests must fail if compact data count or content hash differs from canonical runtime data.

Verification:

- Add tests proving compact Pi task count is `280`.
- Add tests proving every role has at least `10` compact tasks.
- Add tests proving compact `coder.review` and `operator.install` match canonical runtime semantics.
- Add npm package file tests proving the full compact taxonomy data ships in the package tarball.

### G6: Strong JSON Schemas And Schema Tests

Finding: Several taxonomy JSON Schemas are too permissive. `classification.schema.json` accepts almost any `role_model` object, and task/model assignment schemas do not strongly enforce the proposal data model.

Required changes:

- Strengthen schemas under `schemas/role-model/taxonomy/`:
  - `manifest.schema.json`
  - `group.schema.json`
  - `role.schema.json`
  - `task-type.schema.json`
  - `capability.schema.json`
  - `modality.schema.json`
  - `tool-class.schema.json`
  - `intent-preset.schema.json`
  - `classification.schema.json`
  - `model-role-assignment.schema.json`
  - `effective-taxonomy.schema.json`
- Use explicit required fields, stable enums where appropriate, ID patterns, bounded arrays, `additionalProperties: false` by default, and explicit extension points where future org/team/user entries are allowed.
- `classification.schema.json` must validate the stable proposal contract, not just existence of `role_model`.
- `task-type.schema.json` must require classifier guidance, compatibility, capabilities, modalities, authority, and stability.
- `model-role-assignment.schema.json` must enforce valid `roleAssignmentMode` semantics and distinguish:
  - `all`;
  - explicit include list;
  - explicit exclude list;
  - custom overrides.

Verification:

- Add schema tests proving valid proposal-shaped examples pass.
- Add malformed tests for every schema proving missing required fields, unknown enum values, invalid IDs, wrong types, and disallowed properties fail.
- Add taxonomy data validation through the schemas in CI and release packaging.

### G7: Manifest And Release Receipts

Finding: The proposal requires entry files and content hashes as release receipts, but the current manifest only includes versions and counts.

Required changes:

- Add `entryFiles` and `contentHashes` to the canonical taxonomy manifest.
- Content hashes must cover:
  - groups;
  - roles;
  - task types;
  - capabilities;
  - modalities;
  - tool classes;
  - intent presets;
  - compact Pi data files.
- Build/package scripts must fail if generated docs, runtime endpoint data, packaged Pi compact data, or bundled runtime assets are stale relative to canonical taxonomy data.
- Runtime discovery responses should expose the manifest hash metadata needed for consumer cache validation.

Verification:

- Add tests for manifest hash stability and changed-content detection.
- Add package validation proving Pi compact data and runtime taxonomy data were produced from the same content revision.
- Add release validation proving packaged runtime taxonomy endpoints report the same manifest as source.

### G8: Runtime UI Role Assignment And Progressive Disclosure

Finding: The `All roles` checkbox cannot represent unchecked-all because `[]` means all roles. Some proposal UI requirements are also only partially implemented.

Required changes:

- Replace ambiguous role assignment arrays with explicit model role assignment state:
  - `roleAssignmentMode: "all" | "include" | "exclude" | "custom"`;
  - `enabledRoleIds`;
  - `disabledRoleIds`;
  - `taskOverrides`;
  - `capabilityOverrides`;
  - `modalityOverrides`;
  - `toolClassOverrides`.
- Newly added or loaded models must default to `roleAssignmentMode: "all"` with all roles visibly checked.
- Users must be able to uncheck individual roles.
- The `All roles` control must:
  - check all roles;
  - uncheck all roles when intentionally selected;
  - show an indeterminate state when some roles are selected.
- Group headers must remain visible in role assignment UI.
- High-risk roles must be visibly labeled.
- Task detail must remain progressively disclosed from configured model or role catalog surfaces, not forced into initial model add/load flow.
- `/app/models/roles` must remain the canonical existing role/task catalog surface for phase 1-4.
- `/app/models`, `/app/models/benchmark`, `/app/router/*`, and `/app/observe/*` must include only phase-appropriate placeholders or links for later benchmark/telemetry integration.

Verification:

- Add component tests for:
  - default all roles selected;
  - all roles unchecked;
  - partial role selection;
  - indeterminate all checkbox;
  - high-risk role labels;
  - grouped rendering;
  - task drill-down.
- Add runtime API tests for explicit model role assignment persistence and readback.
- Add manual QA receipts showing role removal affects routing eligibility.

### G9: Router And Controller Use Of Classified Intent

Finding: Router intent hooks exist, but the gap closure must prove that classified role/task/capability/modality/tool metadata is actually used according to the proposal decision order and cannot bypass policy.

Required changes:

- Normalize request classification into a single internal intent record.
- Use the normalized intent in this order:
  1. validate taxonomy versions and contract versions;
  2. expand presets if present in future versions;
  3. derive task action and variant from `task_type`;
  4. apply hard role/task/capability/modality/tool constraints;
  5. apply model role assignment and RBAC/policy constraints;
  6. apply endpoint health and trust constraints;
  7. score remaining candidates using advisory role/task/capability/context/cost/latency signals;
  8. pass only normalized intent, candidate facts, candidate scores, and diagnostics to the controller;
  9. reject controller output that violates hard constraints;
  10. record deterministic fallback when controller output is invalid or unavailable.
- Routing diagnostics must expose accepted, ignored, rejected, and degraded classification inputs.

Verification:

- Add router tests proving hard role/task intent filters candidates before scoring.
- Add router tests proving advisory role/task intent changes scoring without changing eligibility.
- Add controller tests proving a blocked candidate cannot be selected.
- Add request-detail or routing-decision tests proving normalized intent and classification diagnostics are visible.

## Required End-To-End QA

The next implementation run must include agent-operated manual QA on this local device. QA must rebuild the runtime and `pi-role-model`, then drive Pi against the rebuilt local runtime.

Minimum QA sequence:

1. Rebuild runtime packages and runtime UI.
2. Rebuild the `@try-works/pi-role-model` package from the worktree.
3. Install or update the local package into Pi.
4. Launch the rebuilt Role-Model runtime.
5. Use Pi to run `/role-model setup`.
6. Use Pi to configure the runtime endpoint.
7. Use Pi to choose a Role-Model alias.
8. Use Pi to fetch or verify live runtime taxonomy.
9. Use Pi to send valid classified requests covering:
   - `coder.review`;
   - `operator.install`;
   - `security.audit`;
   - `researcher.web_research.current`;
   - `support.ticket.reply`;
   - one role with a secondary group.
10. Use Pi to send invalid hard metadata and verify runtime rejection.
11. Use Pi to send invalid advisory metadata and verify runtime ignores it with diagnostics.
12. Verify runtime request observations show:
   - stable proposal-shaped request metadata accepted;
   - normalized intent;
   - taxonomy version;
   - content revision;
   - classification contract version;
   - accepted/ignored/rejected/degraded diagnostics;
   - role/task candidate filtering;
   - selected endpoint/model;
   - controller output or deterministic fallback when applicable.
13. Verify the runtime UI can inspect the routed requests and role/task diagnostics.
14. Verify role removal from a configured model changes routing eligibility.
15. Verify packaged runtime and package tarball do not contain stale taxonomy data.

QA must iterate until the above checks pass or document a concrete blocker with code evidence and a follow-up requirement.

## TDD Requirements

Implementation must use strict TDD for production behavior:

- Write failing tests before changing production code.
- Record RED evidence for each gap area.
- Implement the minimal production change needed to pass.
- Record GREEN evidence for each gap area.
- Refactor only after tests are green.
- Do not mark the requirement verified without tests and agent-operated QA receipts.

## Acceptance Criteria

This addendum is satisfied only when:

- Canonical runtime taxonomy records exactly match the proposal and this addendum.
- Runtime JSON data is authoritative and validated by schemas.
- Runtime manifest includes counts, entry files, and content hashes.
- Pi compact taxonomy is generated from canonical runtime taxonomy and includes all `280` tasks.
- Pi uses live runtime effective taxonomy when available and package snapshot only as fallback.
- Pi emits the stable proposal request contract.
- Runtime accepts, validates, normalizes, routes with, diagnoses, and strips classification metadata correctly.
- Hard taxonomy constraints reject or filter before scoring/controller selection.
- Advisory taxonomy signals affect scoring only after hard filters.
- UI model role assignment uses explicit assignment semantics and supports all/partial/none role states.
- Runtime and UI expose enough diagnostics to prove classified requests affected routing decisions.
- Agent-operated Pi QA passes against rebuilt local runtime and rebuilt local package.

## Traceability Matrix

| Audit Finding | Addendum Section | Primary Verification |
| --- | --- | --- |
| Generic task catalog does not match proposal | G1 | Exact catalog fixture tests, runtime endpoint parity tests |
| Wire contract mismatch | G2 | Chat/responses mapping tests, Pi emission tests |
| Hard/advisory validation incomplete | G3 | Valid/invalid request tests, diagnostic tests |
| Pi does not prefer runtime effective taxonomy | G4 | Runtime taxonomy discovery/fallback tests |
| Pi compact snapshot incomplete | G5 | Compact count/hash/package tests |
| Schemas too permissive | G6 | Valid/malformed schema tests |
| Manifest lacks release receipts | G7 | Hash and stale-build validation tests |
| UI all-role state ambiguous | G8 | Component and persistence tests |
| Router/controller intent use insufficiently proven | G9 | Router/controller/diagnostic tests |

## Audit Gate

Audit: PASS

This addendum is itself the post-implementation audit gap record. It identifies the implementation drift and missing verification needed to close Run 57 against proposal phases 1 through 4.

## Coverage Gate

Coverage: PASS

This addendum covers all nine audit findings: exact canonical task catalog, stable request contract, hard/advisory validation, Pi runtime effective taxonomy precedence, complete Pi compact taxonomy snapshot, strong schemas, manifest/release receipts, runtime UI role assignment semantics, and router/controller classified-intent use.

## Approval Gate

Approval: PASS

This addendum is ready to be used as an effective input for a follow-up recursive requirement. It remains DRAFT until a recursive lock step is explicitly run for this post-run addendum.
