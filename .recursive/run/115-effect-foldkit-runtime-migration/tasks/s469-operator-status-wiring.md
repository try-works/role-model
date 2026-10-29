# S469 — packaged operator healthz status wiring

Status: pending
TDD Mode: strict
Private basis 3d03ad78; public b9841f94; original paired00-worktree authority unchanged.

Root cause (S468 trace + S464 bisect): the packaged dev pair stays runtime_initializing forever because the sidecar /healthz computes capabilitiesReady from operatorSurface.status() whose trace is always unobservedOperatorEvidence() (runtime-operations-server.mjs:3757-3758; surface created without a status callback at :9027-9038). operatorProcess.health() worker readiness (:1415-1426) is never consulted by healthz (:9195 scheduler only). Bisect proved this predates private handshake commits ac809d31/3d03ad78 (pre-handshake a86ea7a9 pair stalls identically), so the handshake gates are NOT the cause.

Repair (PRIVATE runtime-operations-server.mjs ONLY, plus a dedicated test): wire the operator surface status callback to real worker evidence — derive overall/capabilities from operatorProcess.health() (workerStates lifecycle ready + pid for the required six bindings), never the unobserved default; keep honest degraded when workers are not all ready or health() unavailable; do NOT fabricate ready. Bounded diagnostic logging per S468 proposal (timing + capability names) may be added, no timeouts/behavior changes elsewhere. No runtime-operations-server HTTP contract change beyond healthz truthfully reporting real readiness.

Strict behavioral RED first: a node --test asserting packaged healthz readiness flips ready only when all required workers report ready (injectable worker state/health seam already used by existing tests), and degraded otherwise; today always degraded. Then minimal wiring. Preserve ALL existing operator/evaluation/healthz tests; run affected private suites + node --check + anti_slop_lint abs effect:true nonempty. No runtime-server contract drift, no public edits, no provider/ports, no commit; freeze hashes; independent review by a different member (s9-private-readonly); no whole R32/R33 claim.
