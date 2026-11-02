# S617 - goal-a94a4502 closeout: recorded follow-ups complete (2026-11-02)

## 1. R14 rendered wave (task-87, a8b6a74b) - review PASS
- parity-capture.mjs waits for a LOADED page (main + >=200 visible chars, deadline-bounded, loadedMs recorded) before capture; never-loaded raises capture_not_loaded -> NOT_RUN exit 2 (never a fake pass).
- TDD RED (missing isLoadedPayload export) -> GREEN 33/33.
- Full lane PASSED: React run0/run1 sha-identical 0e1cf45f... (84805 bytes); Foldkit run0/run1 sha-identical 66e2d614... (64907 bytes); reactVsFoldkit honestly "different" (exact PNG bytes only, no perceptual claim; perceptual classifier + owner thresholds recorded as the remaining layer).

## 2. Live PUT->ledger->GET->card integration harness (task-88, 310fee1a + d7c31009) - review PASS
- scripts/runtime/replay-autoqueue-integration.mjs, version+sha pinned (0.0.20-505-ge0b1800a / 6d90b28a...), mismatch refuses, isolated mkdtemp state, redacted.
- Live 7/7: PUT cap 25 -> ledger counterfactualLimit=25 + hardCounterfactualLimit=25 -> GET config.replay.autoQueue 25/true -> REAL parseRuntimeConfigFixture projection (row replay.autoQueue, card hydration source) -> enabled:false -> hard=0 and the REAL replayBudgetAvailable returns false. No local reimplementations (node --import tsx, product imports).
- Reviewer correction recorded: product replayBudgetAvailable checks hardCounterfactualLimit BEFORE the enforced guard (track-b-replay-ledger.ts:212); afda292e is in the packaged 505 source.

## 3. Remaining DAG node factories (task-89, ef6dc6bd + b4b7b392) - review PASS
- bootstrap, drains, benchmarks now owned by real r27 per-node acquire factories (handle + release); server remains DAG-owned; closeR27Dag memoized shutdown unchanged.
- backend + refresh explicitly left as records with Effect-first rationale comments (would invert the locked acquisition order / start only after extension-runtime readiness).
- Tests: run115-s603 2/2 + s593 4/4 + s598 6/6 = 12/12; host tsc 0.
- Full host suite with the PINNED Vitest 3.2.4: 2843 passed / 5 skipped / 0 failed (461 files). The earlier 3-failed-suite report was a Vitest 4.1.11 artifact from the harness checkout - documented in task89-dag-nodes.md and task89-v3-suite.log.

## Remaining (recorded, not blocking)
- Perceptual pixel-diff classifier for R14 (needs an image decoder + owner-approved thresholds).
- Owner clarifications still pending: R39-live meaning, R28 prune approval, R20 limit numbers, DAG node factories for backend/refresh (documented as deliberate records).
