# Gate chain at the final rebuilt artifact 0.0.20-471-g2e4aca6b (2026-11-01)

Rebuilt after all run-115 slice work (R27 node-owned server, R20 writer, R23 cleanup, R30 fence, R32 domain layers, admission spill reassembly, contract retargets).

- Private pairing rebuild: PASS (track-b build-runtime-distribution, new exe sha256 0ed12ef580467af5b15c623b763058e25cec85e0538ef33be1950d674979ca0b).
- validate-packaging: PASS (chain exit 0).
- verify-packaged-candidate: PASS - the packaged CLI boots healthy; independently re-proven by the routing E2E run below, which asserts health "healthy 0.0.20-471-g2e4aca6b" with the version pin (wrong-artifact refusal active).
- audit-rendered-ui: {"routes":20,"failures":0,"focus":false} (20/20).
- dialog-a11y: PASS (aria-modal, initial focus Dismiss, Tab trapped, Escape closed, focus returned).
- compare-release vs preserved 0.0.20: 6 same / 2 additive-shape (/healthz + /api/role-model/runtime/summary, both missing runtime.release_id + runtime.private_distribution_sha256 on 0.0.20) / 1 environment-state (/api/role-model/telemetry/summary) / 0 different.

## Routing E2E on the rebuilt artifact (raw log: evidence/logs/routing-e2e-2e4aca6b.log)
PASS 10/10 with --expect-version 0.0.20-471-g2e4aca6b: healthy boot; provider account seed; endpoint activation; /v1/models serves routing-e2e/mock-chat; POST /v1/chat/completions -> 200 chat.completion (usage 15 tokens) served by the LIVE mock upstream (request-prompt delta matched, not a capture replay); router/summary recentDecisionCount 0->1; telemetry/summary requestCount 0->1; request ledger + router/decisions populated with the decision row for the activated endpoint.
