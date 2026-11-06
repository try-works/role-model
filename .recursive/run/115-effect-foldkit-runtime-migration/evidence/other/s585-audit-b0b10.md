# S585 - B0-B10 backend requirement audit (self-audit, 2026-10-31)

Audit Execution Mode: self-audit.
Delegation Override Reason: audit delegated to teammate flash-api-probe twice; the teammate returned to inactive without producing a report or message (member limit 8 prevented spawning a fresh auditor). Lead performed the audit directly.

Basis: public worktree HEAD f3d700c6 (clean), requirement texts in 00-requirements.md (R19,R20,R22,R23,R25,R26,R27,R28,R30,R32,R33), disposition ledger in 03-implementation-summary.md (~line 1915-1945), cited evidence under evidence/other and evidence/logs. Private-repository claims are accepted as cited evidence only where the private tree is required (marked private-evidence).

## Per-requirement table

| B# | R# | Ledger | Auditor verdict | Evidence checked | Notes |
|---|---|---|---|---|---|
| B0 | R19 | verified | CONFIRMED | scripts/s4-contracts-inventory.test.mjs tracked at repo root (git ls-files), s4-contracts-inventory.json + s4a-tdd.json exist, verify-r19-inventory.log exists | Inventory body-verified entries carry file:line disposition; exclusions reason-bearing |
| B1 | R20 | blocked | ACCURATE | module-health-writer.ts exists with Cause classification (grep), module-health-writer.test.ts exists | 4 clauses open (edge classification, Fail/Die/Interrupt unwired at edge, client-caused escapes coarse, limits placeholder until calibration) - named precisely |
| B2/B2a | R22 | implemented | ACCURATE (not verified) | validate-packaging.ts + s27b-validator-scope.test.ts exist; s27b-tdd.json, s27-packaged-run.md exist | Ledger says implemented, not verified - consistent with evidence |
| B3 | R23 | blocked | ACCURATE | sql service files + pinned second batch cited; s310/s310b tdd files present | Remaining items named: multi-row table_info, transaction-owned cleanup, queue DDL/outbox writers, QA script, graph hydration, backup drain, owner fence |
| B4 | R25 | verified | CONFIRMED | route-decision-producer.ts, route-decision-boundary.ts, run115-s7b/s7c tests exist; s7b/s7c-tdd.json + green/red logs exist | RED log (producer-reorder) proves mutation sensitivity |
| B5 | R26 | verified | CONFIRMED | track-b-operations.ts, sse-transcript.ts, s17a-transport-signal.test.ts exist; s17b/s17d tdd + green logs exist | |
| B6 | R27 | blocked | ACCURATE | r27-composition.ts, host-runtime-scope.ts, host-runtime-resource.ts exist; s65-r27-park.md, s95-acquisition-wired.md exist | Ledger admits acquisition is still imperative and Layer DAG is NOT closed - the actual blocker named (server-first start, backend-later, process.exit before finalizers) |
| B7 | R28 | blocked | ACCURATE (private-evidence) | s135 private slice doc exists; private repo not inspected from public tree | Two blockers: prune OFFSET defect pinned-not-fixed (needs product approval); graph_references_only label vs capture_wal raw payload |
| B8 | R30 | blocked | ACCURATE (private-evidence) | capture-close closure cited; private suites 34/34 per ledger | Open: PersistedQueue deviation/IDs/public consumer, evidence-before-ack, kill/lease semantics |
| B9 | R32 | blocked | ACCURATE (private-evidence) | s135-r32-private-slice-verified.md exists | Seven domains bounded; open: per-domain Layers + DTO negotiation + ambient domains (retention manager, diagnostics) |
| B10 | R33 | implemented | ACCURATE (not verified) | validate-packaging + s27-packaged-run.md + s28a-tdd.json exist; lint obligation discharged note present | implemented, not verified |

## Bottom-line verdict

B0-B10 is NOT complete. 3 of 11 rows are verified (R19, R25, R26), 2 are implemented-but-unverified (R22, R33), and 6 remain blocked with precise, still-accurate rationales (R20, R23, R27, R28, R30, R32). The single largest open item is R27's closed Effect Layer DAG (acquisition is imperative at the composition root). No stale/contradicted ledger row found in the public tree; two private-repository rows (R28, R30) could not be re-verified from the public tree and rest on cited private evidence.
