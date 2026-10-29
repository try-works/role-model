# S482 — packaged operator surface live (milestone)

Pair: public 3299ad00 + private b8733789; sealed package D:/DEV/rm-clean/release-final4 (exe role-model-dev.exe, sidecar 92960f89). Chain of five reviewed bounded fixes unblocked packaged dev readiness: S469 sidecar healthz real worker status (0670a14a) + S472 contribution flush deadline (b8733789) + S475 QA invoke bound (342fcd86) + S478 packaged markReady (ae7f8a3e) + S480 dev Run88 skip (3299ad00).

Probe (ephemeral port 51985, fresh temp state, no operator ports): /healthz 200; /api/role-model/models 200 (1495B); /api/role-model/operator/status 200 (38192B storage audit); /api/role-model/operator/learning/records?kind=pack 200 (324B). Previously all operator routes answered 503 runtime_initializing pending forever. Source-identity sealed clean; no provider/operator state used.

Still open before packaged parity claim: offline gates on this ready pair (verify-packaged-candidate journeys, validate-packaging, parity-selfcheck with temp drive override), compare-release vs preserved v0.0.20 R exe, and approval-gated real-client R15/R16-live/R39. Workspace ownership and R33 ledger remain open per S420.
