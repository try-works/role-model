Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-14T19:09:59Z`
LockHash: `89bae19c41882105dff31c45269090abde3861e2e1750727d958d1192cbb9ee1`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/05-manual-qa.md` (LOCKED — accelerated tier)
- `/.recursive/run/43-benchmark-routing-display/addenda/05-manual-qa.addendum-01.md` (F1–F3 remediated)
- `/.recursive/run/43-benchmark-routing-display/addenda/05-manual-qa.addendum-02.md` (S1–S3 remediated)
- `/.recursive/run/43-benchmark-routing-display/addenda/02-to-be-plan.addendum-01.md`
- `/.recursive/run/43-benchmark-routing-display/addenda/02-to-be-plan.addendum-02.md`
Outputs:
- `/.recursive/run/43-benchmark-routing-display/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Closeout decisions for benchmark display/routing-quality loop plus post-lock addenda (UI IA, hardBlend persist, env credential refs).

## TODO

- [x] Record the exact decisions delta applied during closeout
- [x] Reconcile locked Phase 5 with addendum-01/02 effective outcomes
- [x] Reference the updated decision ledger entry
- [x] Complete the audited decision-update gates before locking

## Addenda Reconciliation

Locked `05-manual-qa.md` (accelerated tier) marked R1 verified via standalone “Last runs by mode” and Q5 PASS without `hardBlend`. **Addendum 01** supersedes those UI/API acceptances:

| Addendum | Effective decision |
| --- | --- |
| **01 / F1–F3** | Dual full+quick snapshots live **inside each model card**; run history at page bottom; `benchmark_mode` on persist enables live `hardBlend` on candidates API |
| **02 / S1–S3** | LiteLLM provider keys use `${PROVIDER}_API_KEY}` in external runtime config; bridge **never** persists inline `sk-` material in SQLite `credential_ref` |

## Decisions Changes Applied

Added run index entry **43-benchmark-routing-display** documenting:

1. **Per-mode benchmark display** — by-mode API plus UI model cards (not a single global latest run).
2. **Routing quality semantics** — `resolveRoutingBenchmarkQuality` with case-weighted overall, hard full+quick blend, `benchmark_mode` on sqlite samples.
3. **Score role separation** — artifact `benchmarkCapability` vs sqlite `routingBenchmarkQuality` / `routingQualityScore`.
4. **Dashboard latency (run 41 completion)** — Overview FactCard passes telemetry `detail` (p95 context).
5. **Global benchmark clear** — `DELETE /api/role-model/benchmark/data` removes artifacts and all benchmark sqlite samples.
6. **Addendum 01 layout** — supersede SP43-H standalone dual-run section; per-endpoint full/quick blocks in model cards.
7. **Addendum 02 credential hygiene** — `credential-ref-env.ts` normalizes inline secrets to env var names; operator config uses `${DEEPSEEK_API_KEY}` on host.

## Rationale

Run 43 closes operator-visible gaps G1–G7 (dual-run display, routing-quality semantics, dashboard latency, benchmark latency, global clear) on post-run-42 `main`. Addendum 01 supersedes locked Phase 5 UI/API acceptance for per-card dual-run layout and live `hardBlend`. Addendum 02 records a durable credential-ref policy so external yaml env indirection is not mirrored as literal secrets in SQLite. These ledger entries give later runs a single authoritative decision surface without reopening locked Phase 3–5 artifacts.

## Resulting Decision Entry

See `/.recursive/DECISIONS.md` → Run `43-benchmark-routing-display`.

## Requirement Completion Status

| R# | Status | Notes |
| --- | --- | --- |
| R1 | verified | Addendum 01 Q4′ + by-mode API; model-card dual-run |
| R2 | verified | Run list + history order (addendum F2) |
| R3–R6 | verified | Routing quality aggregator + candidate enrichment |
| R4 | verified | Addendum 01 Q5′ `hardBlend` on candidates after quick re-run |
| R9–R11 | verified | Dashboard latency, benchmark latency, global clear |
| R12 | verified | Phase 5 accelerated + addendum re-verify logs on `:3456` |
| S1–S3 | verified | Addendum 02 env credential + sqlite ref check |

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: closeout receipts; addenda authoritative over superseded Phase 5 UI rows
- Delegation Override Reason: n/a

Audit: PASS

## Traceability

- R0: Decision preserves post-run-42 baseline (`9ca5e3b`); no benchmark case/judge/catalog changes
- R1: Addendum 01 per-model-card dual full+quick display; `sp43-r1*.log`
- R2: Addendum 01 run history at page bottom; `sp43-r2*.log`
- R3: `resolveRoutingBenchmarkQuality` case-weighted overall; SP43-B/C GREEN
- R4: Addendum 01 `hardBlend` on candidates after `benchmark_mode` persist; `phase5-addendum-q5-hardblend.log`
- R5: Candidate `routingBenchmarkQuality` enrichment distinct from artifact scores; Q3/Q5 logs
- R6: Legacy samples without `benchmark_mode` default to full; SP43-B unit tests
- R7: Phase 4 verification floor log covers automated regression scope
- R8: This Phase 6 decision receipt documents run 43 ledger entry
- R9: Dashboard Overview FactCard passes telemetry `detail` (run 41 completion)
- R10: Benchmark case + profile latency visibility; SP43-E/F + Q6/Q7
- R11: Global `DELETE /api/role-model/benchmark/data` clears artifacts + sqlite; Q8–Q10
- R12: Packaged SEA QA on `:3456` scope `run43-verify` including addendum re-verify logs
- S1–S3: Addendum 02 env credential refs; `sp43-s1*.log`, `sp43-s3*.log`

## Coverage Gate

- [x] Decision ledger updated
- [x] Addenda 01 and 02 reconciled in closeout narrative

Coverage: PASS

## Approval Gate

- [x] Decision accurately reflects implementation and addenda

Approval: PASS
