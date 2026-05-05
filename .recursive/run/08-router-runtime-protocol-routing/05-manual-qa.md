Run: `/.recursive/run/08-router-runtime-protocol-routing/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-05-05T04:49:35Z`
LockHash: `5299cb6398042e2e417ad39a6e7747a06c349f4a6fb7a682e9a7f6a7f8c5aa56`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/04-test-summary.md`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/cli.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/testdata/router-runtime/routing-request.json`
- `/testdata/router-runtime/routing-observed-profiles.json`
- `/testdata/router-runtime/routing-role-task.json`
- `/testdata/router-runtime/routing-model-guidance.json`
Outputs:
- `/.recursive/run/08-router-runtime-protocol-routing/05-manual-qa.md`
- `/.recursive/run/08-router-runtime-protocol-routing/evidence/manual-qa/phase5-readback.txt`
Scope note: This artifact records the human-readability and handoff-focused QA for `08-router-runtime-protocol-routing`. The goal is to confirm that the new projection layer is understandable, the local validation path emits explainable routing diagnostics, and the run stays within the protocol-routing scope boundary before later adapter-execution work begins.

## TODO

- [x] Re-read the implementation and test receipts
- [x] Re-read the pinned runtime-routing fixtures
- [x] Manually inspect the projection boundary against router-core
- [x] Confirm the local validation output is explainable and scoped correctly
- [x] Confirm out-of-scope boundaries stayed intact
- [x] Complete the QA receipt and gates

## QA Execution Record

QA Execution Mode: `agent-operated`
Operator: `main agent`
Agent Executor: `GitHub Copilot CLI main agent`
Tools Used: `view`, `rg`
Environment: `local worktree at D:\DEV\role-model\.worktrees\08-router-runtime-protocol-routing`
Scope: `human-readability and handoff-consistency checks for runtime-routing fixtures, protocol projection, routing diagnostics, and scope boundaries`

## QA Scenarios and Results

1. **Runtime-routing fixture sanity check**
   - Steps:
     - read `/testdata/router-runtime/routing-request.json`
     - read `/testdata/router-runtime/routing-observed-profiles.json`
     - read `/testdata/router-runtime/routing-role-task.json`
     - read `/testdata/router-runtime/routing-model-guidance.json`
   - Result: PASS
   - Notes:
     - the fixture set clearly models request, measured-profile, role/task/binding, and advisory guidance inputs without live provider dependencies

2. **Projection-boundary sanity check**
   - Steps:
     - read `/role-model-router/packages/protocol-routing/src/index.ts`
     - compare with `/role-model-router/packages/core/src/router.ts`
   - Result: PASS
   - Notes:
     - protocol-routing owns the runtime projection/orchestration bridge, while router-core still owns deterministic eligibility, scoring, and tie-break behavior

3. **Validation-path and diagnostics sanity check**
   - Steps:
     - inspect `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-validate-routing.final.log`
     - inspect `/role-model-router/packages/protocol-routing/src/cli.ts`
   - Result: PASS
   - Notes:
     - the local validation path emits deterministic JSON with the expected `cli.local.coder` choice, retrieval-receipt summary, context-envelope summary, and explicit routing-model diagnostics

4. **Scope-boundary sanity check**
   - Steps:
     - read `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
     - read `/.recursive/run/08-router-runtime-protocol-routing/04-test-summary.md`
   - Result: PASS
   - Notes:
     - the changed surface remains limited to protocol-driven routing projection, narrow core signal handling, conformance coverage, fixtures, and the local validation command; adapter execution, host integration, and router-decision schema widening remain out of scope

## Evidence and Artifacts

- `/.recursive/run/08-router-runtime-protocol-routing/evidence/manual-qa/phase5-readback.txt`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/cli.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/testdata/router-runtime/routing-request.json`
- `/testdata/router-runtime/routing-observed-profiles.json`
- `/testdata/router-runtime/routing-role-task.json`
- `/testdata/router-runtime/routing-model-guidance.json`
- `/.recursive/run/08-router-runtime-protocol-routing/04-test-summary.md`

## User Sign-Off

- QA mode is `agent-operated`; no human sign-off was requested for this phase.
- Agent sign-off: PASS

## Traceability

- `R1` -> verified through the runtime-routing fixture sanity check and the projection-boundary sanity check.
- `R2` -> verified through the validation-path and diagnostics sanity check.
- `R3` -> verified through the runtime-routing fixture sanity check plus the projection-boundary sanity check.
- `R4` -> verified through the validation-path and diagnostics sanity check plus the scope-boundary sanity check.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/04-test-summary.md`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/protocol-routing/src/cli.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/testdata/router-runtime/routing-request.json`
  - `/testdata/router-runtime/routing-observed-profiles.json`
  - `/testdata/router-runtime/routing-role-task.json`
  - `/testdata/router-runtime/routing-model-guidance.json`
- Requirement coverage check:
  - `R1`-`R4`: covered in `## QA Scenarios and Results` and `## Traceability`

Coverage: PASS

## Approval Gate

- [x] Manual QA confirms the projection boundary is readable and scoped correctly
- [x] Manual QA confirms the local validation path emits explainable diagnostics

Approval: PASS
