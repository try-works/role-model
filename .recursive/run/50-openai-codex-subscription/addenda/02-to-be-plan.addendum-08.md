Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `08`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-08.md`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.test.tsx`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-08.md`
- future host-bridge and runtime-ui regression tests
Scope note: This addendum adds end-to-end regression coverage for run-50 behaviors that are already confirmed working: sanitized controller-guided routing and role-first task drill-down on the Roles page.

## Objective

Lock the confirmed controller-contract and role-first UI behaviors behind regression tests that exercise the real bridge HTTP surface and the rendered roles route surface.

## Implementation Plan

### Phase 1: Host-bridge RED coverage

1. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` with an intelligent-alias HTTP regression
2. send a live `/v1/chat/completions` request through a stubbed bridge server and controller-capable alias
3. assert the returned routing diagnostics preserve valid controller fields and drop invalid ones at the HTTP boundary
4. assert the selected endpoint and accepted directives match the runtime-known role/task/capability contract

Acceptance:
- the live bridge request path is regression-protected, not just the helper

### Phase 2: Live policy-shape regression

1. extend the same bridge integration harness to assert the live role-policy and task endpoints expose the role/task relationships used by controller routing
2. verify the role ids and task allowlists line up across the API responses

Acceptance:
- controller-visible policy data stays coherent at the live API boundary

### Phase 3: Roles-route regression

1. extend the runtime-ui route regression suite to assert `/app/models/roles` keeps role-first copy and task-detail drill-down language
2. keep the assertion route-level rather than implementation-detail-heavy so layout refactors do not create brittle failures

Acceptance:
- the live route contract fails if the role page flattens tasks back into the first-layer experience

### Phase 4: Verification

1. run the targeted host-bridge Vitest suite containing the new HTTP regressions
2. run the targeted runtime-ui Vitest suite containing the new route regressions
3. run package-level test commands for both touched packages when practical
4. record any remaining unrelated package-level failures separately from this slice

Acceptance:
- confirmed working behaviors are locked behind repeatable regression tests
