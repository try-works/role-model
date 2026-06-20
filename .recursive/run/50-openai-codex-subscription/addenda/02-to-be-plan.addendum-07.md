Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `07`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-07.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-07.md`
- future bridge, UI, and test changes
Scope note: This addendum restores controller-guided routing by bounding guidance to the live runtime role policy and updates the runtime Roles UI to show role-first hierarchy with drill-down task detail.

## Objective

Make the controller choose only from runtime-known roles, tasks, capabilities, strategy values, and endpoint ids, while making the operator UI display the same hierarchy: roles first, tasks on demand.

## Implementation Plan

### Phase 1: Controller allowlist contract

1. Build a controller choice summary from the live runtime role policy:
   - role ids with descriptions
   - task types grouped under roles
   - known capabilities derived from tasks and roles
   - supported strategy values
   - candidate endpoint ids
2. Rewrite the controller prompt so it:
   - returns JSON only
   - may choose only from the listed runtime-known values
   - should omit any field when no exact match exists
   - prefers selecting a valid role over inventing a new task label

Acceptance:
- the controller prompt is bounded by runtime truth rather than free-form English guesses

### Phase 2: Guidance filtering and guardrails

1. Add or extend bridge helpers so controller output is filtered against runtime-known:
   - role ids
   - task types
   - capabilities
   - strategy values
   - endpoint ids
2. Keep valid partial guidance:
   - if task type is invalid but role id is valid, preserve the role id
   - if capabilities are unknown, drop only those capabilities
   - if strategy is unsupported, drop only strategy
3. Record accepted directives from the filtered result so diagnostics match what the runtime actually used

Acceptance:
- invalid controller fields no longer force avoidable fallback when other guidance remains usable

### Phase 3: Role-first UI hierarchy

1. Update `/app/models/roles` so the role catalog initially shows only role-level information
2. Remove direct first-layer task-pill display from role cards
3. Add a `Task detail` action that expands task information only for the chosen role
4. Rework the task allowlist management surface so task membership is presented underneath the selected role instead of as a task-first top-level list

Acceptance:
- operators see roles first and tasks only after deliberate drill-down

### Phase 4: RED-first test coverage

Bridge RED coverage:

1. controller output with invalid task labels but valid role ids still yields accepted role guidance
2. controller output with mixed valid and invalid capabilities keeps only runtime-known capabilities
3. controller output with unsupported strategy values does not poison otherwise-valid guidance
4. controller prompt includes runtime-known role/task/capability options and omission rules

UI RED coverage:

1. roles route does not render task chips in the initial role catalog card state
2. `Task detail` affordance is present on role cards
3. task content appears only after drill-down

Acceptance:
- both bridge and UI behavior are regression-protected before production edits

### Phase 5: Role/task expansion addendum planning

1. Record an implementation-plan note for later expansion of builtin role/task coverage
2. Keep the current slice focused on:
   - controller/runtime contract correctness
   - role-first UI hierarchy
3. Candidate future additions may include broader coding, browsing, analysis, research, extraction, summarization, and tool-agent task families, but they should land as explicit runtime roles/tasks rather than ad-hoc controller vocabulary

Acceptance:
- the current fix is not blocked on broad policy expansion, but the next growth path is documented

### Phase 6: Verification

1. Run targeted bridge tests for controller routing
2. Run targeted runtime-ui tests for the Roles page hierarchy
3. rebuild `@role-model-router/runtime-host-bridge` and `@role-model-router/runtime-ui`
4. if needed, send live alias traffic through the rebuilt runtime and inspect controller-routing diagnostics

Acceptance:
- controller guidance is bounded and usable
- the Roles UI reflects the runtime hierarchy consistently
