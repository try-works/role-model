# S594 - audit-remediation slices, independent review and final re-gate (2026-10-31)

## Slices delivered with TDD (RED -> GREEN)
- S589 LocalPolicy: the route now renders the wired policy editor (TTL/concurrency/auto-unload + Save/Reset/Open models) instead of the static supplement; the shell gained an injectable local-policy fetch client so the save PUT to /api/role-model/local/policy is provable (RED log evidence/other/s589-s590-red.log).
- S590 SessionReadiness: bootstrap/health/authority/credentials tiles derive from the operator status readback (overall row, status, honest unavailable/unknown/failed states); operator-intent and alias-drift copy is state-honest. Four states covered by tests.
- S591 Router weights editor: six weight inputs (quality/latency/throughput/cost/reliability/preference) hydrate from the host readback and persist as routing.weights ONLY when scoring strategy is custom (matching the host validator unified-runtime-config.ts:1712-1717); non-custom saves omit weights. Save defaults (mode/scoring/execution) now hydrate from the readback.
- S592 Story coverage: 10 previously-uncovered route tags now have port-captured page stories; s565 iterates the full route union.
- S593 R27 Layer DAG (host-bridge): closed scoped Layer DAG (readiness->permits->backend->bootstrap->refresh->drains->benchmarks->server->cli->host) with early readiness, partial shutdown and reverse-order release, ONE shared readiness owner per launch. Not yet wired as the production composition; CLI keeps the composed readiness owner.

## Independent review (s9b-reviewer) - 3 HOLDs, all resolved
- HOLD1 production regression: the CLI readiness swap was reverted (composeReadinessOwner restored) and the DAG owner split fixed.
- HOLD2 weights contract: custom-only weights + hydration; new s591 hydration and omission contracts.
- HOLD3 remaining fabricated session copy: manifest/drift honesty + unknown-health case; s590 extended.
Commit bdcffa8e.

## Verification at final HEAD bdcffa8e
- UI suite 827/827 (80 files), tsc 0; host-bridge tsc 0; s593 3/3, s324 green.
- Packaged artifact 0.0.20-443-gbdcffa8e: validate-packaging PASS, verify-packaged-candidate PASS, audit-rendered-ui 20/20, dialog a11y PASS.
- compare-release vs preserved 0.0.20: 6 same / 2 additive-shape (release_id + private_distribution_sha256 keys absent in 0.0.20) / 1 environment-state / 0 different.

## Still open (next goal rounds)
- Wire or reason-disable the remaining handler-less controls: local peers add, peer-model register, llama-swap load/roles, local logs refresh, storage retention policy/dry-run/execute, operator replay/mode/rollback, extensions pause/download.
- R27 follow-up: replace the imperative hostScope acquisitions with the Layer nodes in the production composition path.
- Owner-gated (unchanged, excluded): R15 live provider, R16 seeding approval, R39-live CI dispatch/toggle, stage/prod Run88 identity, pixel visual-delta sign-off. E1/E2 deferred by owner.
