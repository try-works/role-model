Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `00 Requirements - post-lock addendum 03`
Status: `LOCKED`
LockedAt: `2026-10-01T08:08:26Z`
LockHash: `f3ad0e38dcd34b1d8101c24d5bbab508dbf6d1a1cb4a0800e87266057537caf5`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED, hash `ff9fe4a6`)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` (`T1.2g`, `## Gaps Found`)
- `evidence/other/as-is/sidecar-traffic-effect.md`
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-benchmark-value.addendum-03.md`
Scope note: Corrects one factual clause of `R14` after Phase 1 traced the benchmark stamp.

## TODO

- [x] State what in the locked requirement was wrong
- [x] Provide evidence for why the amendment is needed
- [x] Specify the amended acceptance criteria
- [x] State the impact on traceability
- [x] Lock this addendum

## What was wrong

`R14` states that "the type's `benchmark` value is never written". That is false on the execution/observation
plane: `benchmark-runner.ts:91` declares
`executionTrafficClass?: "live" | "benchmark" | "health" | "synthetic"` and sets `"benchmark"` at `:100` for its
dispatch, and its sample carries `source_type: "benchmark"` (`:1486`) into `observed_performance_samples`
(`sqlite-memory/src/index.ts:4430-4445`) and into the observation row (`:4726-4730`). What never happens is the
**telemetry** row receiving it: `runtime_telemetry_records.request_class` is stamped with the literal
`live_request` (`runtime-host-bridge/src/index.ts:27574`, `:20140`). The real defect is a two-plane
disagreement for the same request, not a never-written value.

## Evidence

- `benchmark-runner.ts:91`/`:100`/`:1486`; `sqlite-memory/src/index.ts:4430-4445`, `:4726-4730`;
  `runtime-host-bridge/src/index.ts:20140`, `:27574` (all re-read by the wave-2 analyst and spot-checked by the
  controller).
- Live queue/store evidence: the benchmark samples exist while the telemetry readback shows 100% `live_request`.

## Amended requirement text

`R14` acceptance criteria are amended to:

- The closed vocabulary reconciles with the existing execution enum
  (`live | benchmark | health | synthetic` on `executionTrafficClass`): the traffic-class vocabulary becomes
  `live | replay | evaluation | benchmark | probe | unknown`, and any `health`/`synthetic` producer maps into it
  explicitly rather than being dropped.
- No unconditional `live_request` stamp survives in the telemetry writer; the request's declared class (from the
  producer marker or the execution plane) is threaded to `runtime_telemetry_records`, so the telemetry row and
  the observation/sample row for the same request **agree** on the class.
- Every other `R14` criterion stands: live-only operator aggregates, visible excluded counts, latest-live
  sampling, class filter in the query/analytics path, and the observed-data-plane tests.

## Impact on traceability

- `R14` only (its premise and the "no unconditional stamp" criterion); `T1.2g` and `SP9` scope gain the
  telemetry/observation reconciliation and the mapping from the execution enum.

## Coverage Gate

- [x] The corrected premise is grounded in file:line evidence for both planes (execution/observation vs telemetry)
- [x] The amended criteria remain observable (writer test, two-plane agreement test, live-only aggregate tests)
- [x] No `R14` criterion was removed; the vocabulary is extended to reconcile with the landed execution enum

Coverage: PASS

## Approval Gate

- [x] The operator approved the run and instructed the controller to unlock and edit the requirements as needed
  (this thread, 2026-10-01); the correction removes a factually wrong clause

Approval: PASS
