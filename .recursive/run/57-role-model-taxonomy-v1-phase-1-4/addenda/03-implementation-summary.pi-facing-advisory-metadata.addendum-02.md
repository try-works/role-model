# Implementation Summary Addendum 02: Pi-Facing Metadata Is Advisory

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `03 Implementation Summary Addendum 02`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.pi-facing-advisory-metadata.addendum-02.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation addendum  
CreatedAt: `2026-06-23`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`  
Prior Addenda:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.run57-gap-closure-audit.addendum-01.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.run57-gap-closure-implementation-plan.addendum-01.md`
Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.run57-gap-closure-implementation-plan.addendum-01.md`
- User clarification on `2026-06-23`: Pi metadata that does not fit the taxonomy should not cause failed user requests.

## Purpose

This addendum corrects the gap-closure implementation decision around hard taxonomy metadata for the Pi-facing request contract.

The user experience requirement is that `pi-role-model` must not make Role-Model requests fail merely because Pi emitted imperfect request metadata. Incorrect, stale, or out-of-taxonomy Pi metadata should degrade into hints and allow the runtime/controller to route normally wherever possible.

## Decision

The stable external `role_model.contract_version: 1` contract used by Pi is advisory for taxonomy classification metadata.

Stable Pi-facing fields such as:

- `requested_role_id`
- `role_hint_id`
- `task_type`
- `required_capabilities`
- `preferred_capabilities`
- `required_modalities`
- `tool_classes`

must not reject a request solely because the value is unknown, stale, incompatible, or absent from the current taxonomy. The runtime should ignore or degrade invalid advisory metadata, retain diagnostics where available, and continue routing through normal controller/router logic.

Explicit hard role/task rejection remains limited to the separate internal/legacy hard-constraint shape:

```json
{
  "role_model": {
    "intent": {
      "taxonomyVersion": "1.0.0-alpha.1",
      "classificationContractVersion": "role-model.classification.v1",
      "role": { "id": "security", "hard": true },
      "task": { "id": "security.unknown", "hard": true }
    }
  }
}
```

That hard shape is not the Pi stable contract and should be treated as a trusted policy/admin constraint path, not as heuristic consumer metadata.

## Implementation Changes

Updated `role-model-router/apps/runtime-host-bridge/src/index.ts`:

- stable `requested_role_id` now maps to internal `role.hard: false`;
- stable `task_type` maps to internal `task.hard: false`;
- unknown stable role/task metadata no longer throws during request mapping;
- explicit internal `role/task.hard: true` still rejects when the runtime policy cannot satisfy it.

Updated `role-model-router/apps/runtime-host-bridge/test/index.test.ts`:

- stable Pi-facing role metadata is asserted advisory;
- stable Pi-facing task metadata is asserted advisory;
- unknown stable `requested_role_id` does not reject and does not set `requestedRoleId`;
- unknown stable `task_type` does not reject and does not overwrite the effective routing task;
- explicit internal hard task metadata still rejects.

## TDD Evidence

RED:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/red/host-bridge-advisory-task-contract-tests.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/red/host-bridge-advisory-role-contract-tests.log`

GREEN:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/green/host-bridge-advisory-task-contract-tests.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/green/host-bridge-advisory-role-contract-tests.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/green/host-gap-suite.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/green/host-package-build.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/green/pi-gap-suite.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/gap-closure/green/pi-package-build.log`

## Acceptance Criteria

- [x] Pi-facing stable taxonomy metadata is advisory.
- [x] Unknown stable role metadata does not reject the request.
- [x] Unknown stable task metadata does not reject the request.
- [x] Explicit internal hard role/task constraints can still reject when unsatisfiable.
- [x] Focused runtime-host tests pass.
- [x] Runtime-host build passes.
- [x] Focused Pi package tests pass.
- [x] Pi package build passes.

## Audit Gate

Audit: PASS

This addendum records the clarified product behavior and the implemented code/test changes that prevent Pi heuristic metadata from causing avoidable user-visible request failures.

## Coverage Gate

Coverage: PASS

The addendum covers the user clarification, the runtime parser behavior, the internal hard-constraint boundary, and the verification evidence.

## Approval Gate

Approval: PASS

The change is ready for review as part of the Run 57 gap-closure implementation.
