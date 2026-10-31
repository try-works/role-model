# S597 - second-review HOLD remediation and final re-gate (2026-10-31)

## HOLDs resolved (commit c706acd0, evidence/other/s595-operator-red.log + s597-holdfix-green.log)
- HOLD1 retention payloads: policy PUT now sends {policyId:"ui-managed", scope:"all", maxBytes: sizeGb*2^30, maxAgeDays}; execute POST sends {manifestHash} captured from the dry-run response (client parses manifestHash from the plan or retention.currentPlan); Execute plan stays aria-disabled with a reason until a dry-run binds the hash. s595 asserts the real contract and the pre-hash disabled state.
- HOLD2 production wiring: app.ts now always builds retention and operator-learning commands (default fetch + operator token provider); the fragile [undefined] positional padding is removed.
- HOLD3 RED/behavioral tests: operator learning has genuine RED (captured against the pre-wiring tree 8d3bb5ce in a temporary worktree); the reason-disabled test asserts reason text + disabled state for all eight controls; the four native-disabled buttons now carry AriaDisabled(true).
- HOLD4 partials: save hydrates host custom weights for untouched fields (weightOf/readback meta) with a new s591 no-edit save test; SessionReadiness ok-state copy now reports the manifest/drift status as not-reported instead of claiming applied/schema-valid/no-warnings; the r27 DAG shared owner is composeReadinessOwner() and s593 proves it passes the composed admission assertion.

## Infrastructure incident recovered
A temporary-worktree junction removal wiped node_modules and 88 tracked files (PowerShell Remove-Item recursed through junctions). Recovery: all deleted tracked files restored from git (0 deletions remaining), stale node_modules removed, pnpm install re-run, and packages effect / effect-platform-browser / foldkit / foldkit-ui rebuilt via their build.mjs scripts. Suites re-verified green afterwards.

## Verification at HEAD a2139e72
- UI suite 832/832 (81 files), tsc 0; host-bridge tsc 0; s593 4/4, s324 green.
- Packaged artifact 0.0.20-449-ga2139e72: validate-packaging PASS, verify PASS, audit-rendered-ui 20/20, dialog a11y PASS.
- compare-release vs preserved 0.0.20: 6 same / 2 additive-shape / 1 environment-state / 0 different.

## Remaining
- Re-review verdict from s9b-reviewer (dispatched; handled next round).
- R27 production wiring follow-up: the DAG is closed, tested, and admission-compatible; replacing the imperative hostScope acquisitions with the Layer nodes remains a tracked follow-up.
- Owner-gated (unchanged, excluded): R15 live provider, R16 seeding approval, R39-live CI dispatch/toggle, stage/prod Run88 identity, pixel visual-delta sign-off. E1/E2 deferred by owner.
