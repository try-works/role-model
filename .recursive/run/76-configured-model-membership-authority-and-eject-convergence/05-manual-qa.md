Run: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-07-17T12:12:07Z`
LockHash: `909898032735ba883845be20309d7e23de916992f2e0027dbcd3fc01bcda1ac5`
Workflow version: `recursive-mode-audit-v2`
Inputs: rebuilt runtime package and isolated representative persisted state.
Outputs: end-to-end QA record.
Scope note: Records isolated rebuilt-runtime QA for durable eject and restart convergence.

## TODO

- [x] Use rebuilt standalone artifact
- [x] Exercise representative persisted-state eject/restart
- [x] Verify sibling preservation and sanitation
- [x] Verify package restart

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: `primary Codex agent`
- Tools Used: `PowerShell, Node.js, pnpm, Vitest, SEA packaging`
- State: isolated temporary roots created by owning integration/package tests; no user controller state mutated.
- Rebuilt executable: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- Package/test result: PASS.
- Evidence Path: `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/evidence/logs/green/sp-c-config-membership.md`

## QA Scenarios and Results

1. Manual account with sibling models, endpoints, and activation intent: eject pruned exact endpoint/activation, preserved sibling, and repeat eject converged successfully. PASS.
2. Legacy stale endpoint/activation across restart: account membership remained authoritative; residue and stale binding were sanitized; non-zero receipt remained visible through runtime summary. PASS.
3. YAML-backed account: concurrent config update plus eject preserved both changes; removed mapping stayed absent after shutdown/restart; sibling remained. PASS.
4. Reserved-id collision: YAML mapping owned membership while manual credential metadata remained intact. PASS.
5. Local synthesized endpoint negative control: config update/reconciliation preserved the local lifecycle. PASS.
6. Rebuilt standalone executable restart seam: packaged restart test passed. PASS.

## Evidence and Artifacts

- `04-test-summary.md`
- `evidence/logs/red/`, `evidence/logs/green/`
- `evidence/review-bundles/phase-03-5-code-review.md`

## User Sign-Off

Not required: locked QA mode is agent-operated and uses isolated state.

## Traceability

- R1: scenarios 1-4 exercised exact configured-model identity.
- R2: scenarios 1 and 4 exercised provider-aware ownership.
- R3: scenarios 1-4 exercised YAML/manual membership authority.
- R4: scenarios 2 and 3 exercised restart reconciliation.
- R5: scenarios 1 and 3 exercised exact convergent eject.
- R6: scenario 3 exercised concurrent serialized mutation.
- R7: scenarios 1, 2, 4, and 5 exercised receipts and preservation.
- R8: structured operator outcomes were verified by the Phase 4 UI/API suite.
- R9: scenario 6 exercised the rebuilt packaged restart seam.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS

## Audit Verdict

Audit: PASS
