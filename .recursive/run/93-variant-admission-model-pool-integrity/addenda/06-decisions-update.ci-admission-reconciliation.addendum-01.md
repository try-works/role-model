Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `6-decisions-update`
Artifact: `06-decisions-update.md`
Addendum: `01`
Status: `LOCKED`
LockedAt: `2026-08-22T12:46:55Z`
LockHash: `968aebd8db9c1071f86acf5c05a1e6ae89bff3824f5a4682b69961a1bb2ee235`
Inputs:
- Current Run 93 diff basis.
Outputs:
- Decision-record scope reconciliation.
Scope note: No decision reversal; only post-close CI verification paths are recorded.

## Worktree Diff Audit

- `role-model-router/apps/runtime-host-bridge/src/validate-catalog-economics.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-restart-rehydration.ts`
- `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/restart-rehydration.test.ts`

## Requirement Completion Status

The decision remains: remote endpoint admission is required and validation must remain hermetic.

## TODO

- [x] Reconcile decision-update paths.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
