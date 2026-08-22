---
Type: domain
Status: CURRENT
Scope: Remote endpoint effort-instance identity, admission, eligibility, and UI projection.
Owns-Paths: role-model-router/apps/runtime-host-bridge/src/; role-model-router/apps/runtime-ui/app/lib/
Watch-Paths: role-model-router/apps/runtime-ui/app/routes/; role-model-router/packages/provider-*/
Source-Runs: 91-reasoning-effort-instance-identity; 92-configured-model-pool-benchmark-convergence; 93-variant-admission-model-pool-integrity
Validated-At-Commit: working-tree Run 93 Phase 5 rebuild
Last-Validated: 2026-08-22
Tags: effort, endpoint, admission, telemetry, benchmark, track-b
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
