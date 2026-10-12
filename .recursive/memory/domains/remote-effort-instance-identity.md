---
Type: domain
Status: CURRENT
Scope: Remote endpoint effort-instance identity, admission, eligibility, and UI projection.
Owns-Paths: role-model-router/apps/runtime-host-bridge/src/; role-model-router/apps/runtime-ui/app/lib/
Watch-Paths: role-model-router/apps/runtime-ui/app/routes/; role-model-router/packages/provider-*/
Source-Runs: 91-reasoning-effort-instance-identity; 92-configured-model-pool-benchmark-convergence; 93-variant-admission-model-pool-integrity; 106-client-neutral-model-effort-routing
Validated-At-Commit: working-tree Run 106 closeout (HEAD 9260a10b)
Last-Validated: 2026-10-04
Tags: effort, endpoint, admission, telemetry, benchmark, track-b, effort-policy, effort-source
---

# Remote effort-instance identity

Each configured effort variant is an independent endpoint identity. It must
retain its own admission state, readiness/health, benchmark profile, telemetry,
routing eligibility, and candidate colour. The provider default is represented
by an absent effort value, never by inheriting a sibling variant's effort.

Managed adapter inventory (for example LiteLLM) is not a user-configurable
provider connection. The paired Track B distribution is mandatory at packaged
runtime startup; extension actions remain accurately labelled when shadow or
gated.
Run 106 makes reasoning effort a first-class, client-neutral routing dimension:
the normalized input separates `requested_effort` from `effort_policy`
(`strict` | `preferred` | `router`), the router selects over executable
model-endpoint-effort arms, and the effort state is preserved losslessly end to
end. The decision surface keeps a four-state vocabulary
(`named` | `disabled` | `provider-default` | `no-client-preference`) while the
occurrence boundary keeps a binary `effort_source` vocabulary; the two must not
be conflated (M-3 regression). Benchmark/operational evidence is keyed by the
effort arm, and cross-effort evidence only ever acts as a labeled, discounted
borrowed/related prior — never as exact evidence.
