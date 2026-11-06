# S598 - final HOLD closure: genuine REDs and the production DAG spine (2026-10-31)

## HOLD A resolved - genuine behavioral REDs
- evidence/other/s595-operator-red.log: the seven UI wiring files were temporarily replaced with their pre-wiring content from 8d3bb5ce in the SAME worktree (deps intact) and restored from backups; the operator-learning test fails behaviorally ("learning mode select missing"). Method header included.
- evidence/other/s593-red.log: composeR27HostLayer was temporarily replaced with a no-acquisition stub; the s593 suite fails 4/4 behaviorally (no acquire/release/ready events). Method header included.

## HOLD B resolved - R27 DAG is now a production caller (commit e5f170a8)
cli.ts builds composeR27HostLayer via ManagedRuntime.make with the shared composed readiness owner and registers its dispose as the "r27-dag" shutdown drain. Production startup now acquires the closed DAG (readiness -> permits -> backend -> bootstrap -> refresh -> drains -> benchmarks -> server -> cli -> host) before the server admission gate reads the readiness the host leaf marked; a DAG acquisition failure aborts host startup. The imperative builders still own their individual resources (recorded follow-up: fold them into the DAG nodes), but the DAG is the acquisition spine and owns readiness.
Production-coverage evidence: the packaged verify gate boots this exact CLI (0.0.20-451-ge5f170a8 healthy).

## Verification at HEAD e5f170a8
- host-bridge tsc 0; s593 4/4 + s324 green; UI tsc 0, suite 833/833 (re-run after the recovery incident).
- Packaged artifact 0.0.20-451-ge5f170a8: validate-packaging PASS, verify PASS (CLI boots), audit-rendered-ui 20/20, dialog a11y PASS.
- compare-release vs preserved 0.0.20: 6 same / 2 additive-shape / 1 environment-state / 0 different.

## Remaining
- Re-review verdict from s9b-reviewer (dispatched; handled next round).
- Follow-up (documented, not owner-gated): fold the imperative resource builders into the DAG nodes.
- Owner-gated (unchanged, excluded): R15 live provider, R16 seeding approval, R39-live CI dispatch/toggle, stage/prod Run88 identity, pixel visual-delta sign-off. E1/E2 deferred by owner.
