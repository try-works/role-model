# S596 - dead-control remediation and re-gate (2026-10-31)

## S595 RED -> GREEN (evidence/other/s595-red.log, s595-green.log)
Wired (host routes verified against the runtime bridge):
- Storage retention: Save policy PUT /api/role-model/storage-retention/policy {maxSizeGb,maxAgeDays}; Dry-run POST /dry-run; Execute plan POST /execute; busy/saved/error status shown inline (data-retention-status).
- Operator shadow learning: mode select persists (LearningModeSelectChanged), Update Mode POST /api/role-model/operator/learning/mode {mode}, Roll Back Shadow State POST /operator/learning/rollback; injectable operatorLearningFetchImpl.
- Local logs Refresh re-reads the localLogs readback (data-local-logs-refresh).

Reason-disabled (no host write route; visible data-reason-disabled text, aria-disabled):
- peer Add endpoint, peer Register model / + Add role / Select all roles, llama-swap Load model / All roles, replay Create Replay, extensions Pause / Download & validate latest.

## Bug fixed en route
app.ts positional spreads: an absent localPolicyFetchImpl dropped the retention commands into the local-policy slot (and vice versa); both slots are now padded with [undefined] so defaults apply deterministically.

## Verification at HEAD 4d6e19bf
- UI suite 831/831 (81 files), tsc 0; host-bridge tsc 0.
- Packaged artifact 0.0.20-445-g4d6e19bf: validate-packaging PASS, verify PASS, audit-rendered-ui 20/20, dialog a11y PASS.
- compare-release vs preserved 0.0.20: 6 same / 2 additive-shape (release_id + private_distribution_sha256) / 1 environment-state / 0 different.

## Remaining
- Independent review of this slice (dispatched to s9b-reviewer; findings handled next round).
- R27 follow-up: swap the imperative hostScope acquisitions for the tested Layer DAG nodes in the production composition path.
- Owner-gated (unchanged, excluded): R15 live provider, R16 seeding approval, R39-live CI dispatch/toggle, stage/prod Run88 identity, pixel visual-delta sign-off. E1/E2 deferred by owner.
