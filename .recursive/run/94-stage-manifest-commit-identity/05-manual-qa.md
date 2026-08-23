Run: `/.recursive/run/94-stage-manifest-commit-identity/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-08-23T09:03:43Z`
LockHash: `523fcca1ca3715d3afacac7cbf17171c840fbe03259bc0d955f00eb74e536461`
Inputs:
- `/.recursive/run/94-stage-manifest-commit-identity/04-test-summary.md`
Outputs:
- `/.recursive/run/94-stage-manifest-commit-identity/05-manual-qa.md`
Scope note: Agent-operated contract QA for the provenance repair only; fresh Stage runtime UAT is a later release gate.

## TODO

- [x] Execute agent-operated provenance scenarios.
- [x] Preserve evidence and separate fresh human UAT.

## QA Execution Record

- QA Execution Mode: agent-operated
- Agent Executor: Codex in the isolated repair worktree.
- Tools Used: PowerShell, Corepack/pnpm, Vitest, Node test runner, workflow contract suite.
- Evidence Path: `/.recursive/run/94-stage-manifest-commit-identity/evidence/logs/green/runtime-stage-identity-focused-green.log` and `/.recursive/run/94-stage-manifest-commit-identity/evidence/logs/green/release-workflow-contract-green.log`.

## QA Scenarios and Results

1. Simulate shallow Stage CI metadata: `GITHUB_SHA` becomes the runtime manifest commit. PASS.
2. Start/validate a packaged Stage identity without a 40-hex commit: fail closed. PASS.
3. Validate a Stage/production package whose manifest commit differs from producing SHA: fail closed. PASS.
4. Validate production resolution of a downloaded Stage manifest that differs from accepted Stage SHA: fail closed. PASS.
5. Exercise the existing Stage unit, integration, and regression release boundary layers. PASS (52 tests).

## Evidence and Artifacts

- `evidence/logs/red/runtime-version-ci-sha-red.log`
- `evidence/logs/red/runtime-stage-manifest-commit-red.log`
- `evidence/logs/red/build-binaries-production-stage-commit-red.log`
- `evidence/logs/green/runtime-stage-identity-focused-green.log`
- `evidence/logs/green/release-workflow-contract-green.log`

## User Sign-Off

Not applicable: this phase verifies source/workflow contracts. Human UAT must be repeated on the newly generated Stage RC and cannot be substituted by the rejected candidate's earlier result.

## Traceability

- R1: shallow CI and startup commit tests establish exact runtime provenance.
- R2: package producer and downloaded Stage candidate mismatch scenarios fail closed.
- R3: RED/GREEN receipts and focused layered suite make the repair reproducible.
- OOS release promotion remains deferred.

## Coverage Gate

- [x] All controllable QA scenarios passed.
- [x] No release path was falsely represented as complete.
Coverage: PASS

## Approval Gate

- [x] Agent-operated QA is appropriate for deterministic local contract verification.
- [x] Fresh human Stage UAT is required before main promotion.
Approval: PASS
