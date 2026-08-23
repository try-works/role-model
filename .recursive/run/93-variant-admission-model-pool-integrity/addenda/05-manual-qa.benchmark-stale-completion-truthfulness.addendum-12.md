Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `05 Manual QA Addendum 12`
Status: `DRAFT`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md`
- `/.recursive/run/93-variant-admission-model-pool-integrity/05-manual-qa.md`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
Scope note: Post-closeout UAT repair for truthful stale benchmark reporting and per-variant quality projection.

## UAT finding

UAT benchmark `d1f6f3d5-f0b3-4067-91fc-762ccfc9247c` completed execution and grading, but the configured membership changed from 13 to 16 endpoint variants before publish. The runner correctly wrote `completionState: stale`, omitted `result.json`, and rejected publication. The completed-run reader nevertheless treated `gradingCompletedAtMs` alone as completion, causing run history and latest-summary APIs to present a failed stale run as completed while the canonical candidate portfolio correctly returned no quality evidence (`Q—`).

## Requirements

- `BSQ1`: A run with explicit `completionState` other than `completed` must never appear in completed-run history, latest summary, mode summary, or current portfolio.
- `BSQ2`: A run without a persisted `result.json` must never appear as completed, even if a grading timestamp and comparison artifacts exist.
- `BSQ3`: Legacy manifests without `completionState` remain readable only when a valid persisted result exists.
- `BSQ4`: Membership drift before publish must expose a distinct safe terminal error code and message; it must not be collapsed into a generic execution failure.
- `BSQ5`: A valid completed result under stable membership remains endpoint-variant exact and projects its `overallScore` to the overview candidate `Q` metric.
- `BSQ6`: The repaired runtime must be rebuilt with the mandatory 13-extension Track B distribution and relaunched on the existing isolated UAT port `59921`; Stage `3457` remains untouched.

## Strict TDD and verification plan

1. RED: add stale/no-result completed-reader regression coverage and membership-drift terminal progress coverage.
2. GREEN: minimally tighten the completed-run predicate and add the distinct terminal code/message.
3. REFACTOR: keep one completed-run admission predicate shared by history, summaries, and portfolio.
4. Run focused host tests, the relevant host regression suite, formatting/type/build checks, Track B distribution validation, and packaged executable build.
5. Restart the same isolated UAT runtime on `59921` and verify:
   - stale failed UAT run is absent from completed history/latest summary;
   - its progress endpoint reports the distinct membership-drift failure;
   - existing valid per-variant results remain projected;
   - 13/13 Track B extensions are ready and available.
6. Run a bounded stable-membership benchmark only if required to establish new live quality evidence; do not mutate configured membership while it runs.

## Coverage Gate

- [x] `BSQ1` through `BSQ6` have implementation and verification evidence.

Coverage: `PASS`

## Approval Gate

- [x] Strict RED/GREEN evidence exists.
- [x] Rebuilt-runtime UAT verification passes.

Approval: `PASS`

## Implementation and verification record

TDD Mode: strict

- RED: `evidence/logs/red/bsq-stale-completion-truthfulness-red.log`
  records 2 expected failures. A `completionState: stale` run with a grading
  timestamp was admitted as the latest completed run, and membership drift was
  rendered as the generic `Benchmark execution failed.` error.
- GREEN: `evidence/logs/green/bsq-stale-completion-truthfulness-green.log`
  and `evidence/logs/green/bsq-benchmark-regression-green.log` record 20/20
  focused tests and 37/37 benchmark summary/progress/runner tests passing.
- The shared completed-run reader now rejects an explicit non-`completed`
  state and a missing `result.json`. Legacy manifests remain compatible only
  when their result artifact exists.
- The runner now reports `benchmark_membership_drifted` with the bounded message
  `Configured model membership changed during the benchmark. Run it again
  after model changes are complete.`
- `runtime:test-critical` passed 103 host tests, 146 UI tests, UI validation,
  and observability validation in
  `evidence/logs/green/bsq-runtime-critical-green.log`.
- The paired private Track B distribution was rebuilt from this public source
  tree and passed 2/2 distribution and supervised-shadow tests with exactly 13
  integrity-bound extensions.
- The Windows SEA was rebuilt from committed source at
  `3b8a2d68adaf22f1a97be17ba1a2122372fcd902`, including the Track B
  distribution. Its SHA-256 is
  `24b61974fc425e938e2785ce7d6a35b5fe6f8406cde9851606c0673f88307b43`.
- The prior UAT process on `59921` was the only process stopped. Stage remained
  listening on `3457` with its original process. The rebuilt executable was
  relaunched against the same `D:/DEV/tmp/run93-uat-bsh-20260823` state root.
- Rebuilt live API and browser checks prove:
  - stale run `d1f6f3d5-f0b3-4067-91fc-762ccfc9247c` is absent from completed
    history and latest summary;
  - completed history contains only the two valid persisted runs;
  - the Benchmark page shows those same two runs and no stale Luna result;
  - Overview lists all 16 configured endpoint variants and truthfully renders
    Luna and Luna Max as `Q—` because no valid result matches current membership;
  - all 13 Track B extensions report `lifecycle: ready` and
    `health.available: true` (the knowledge worker remains intentionally in
    shadow mode).

The quarantined run's partial response/judge/compare artifacts were not
salvaged into scores. A new quick benchmark performed without changing model
membership will establish current Luna quality evidence; this repair does not
send that additional live provider workload on the user's behalf.
