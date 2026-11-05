# Task-132 - benchmark request includes every selected endpoint; coherent progress

## Changes
- The mounted route body guard: BenchmarkRunRequested already posts the full click-time selection; s642 now mounts the
  route, checks all three endpoint rows, and asserts the POST /api/role-model/benchmark/runs body carries all three
  endpointIds (regression guard against a stale/filtered subset).
- Requested vs executed endpoints: BenchmarkRunRequested records the click-time selection
  (benchmarkRunRequestedEndpointIds); the progress panel renders "Requested N endpoints · executed M · skipped: ...".
  Host requestedEndpointCount/executedEndpointCount/skippedEndpoints are used when present; otherwise requested comes
  from the click-time selection and skipped is derived from the completed result's endpointGrades. A mismatch or any
  skipped endpoint is highlighted.
- Poll ownership: BenchmarkRunPolled ignores snapshots whose runId differs from the run this client started and keeps
  polling the started id, so a stale run can never replace the panel.
- Coherence: a case index beyond completedSteps is not rendered (no "case 5/12" beside "2 / 60 steps").

## Tests
- s642 (5): mounted three-checkbox POST body; host requested/executed/skipped display; derived skipped fallback;
  stale runId poll ignored while the started run keeps polling; contradictory case index suppressed.
- RED t132-progress-red.log: HEAD product files restored -> 4/5 failed (missing counts line, run-B replaced run-A,
  case 5/12 rendered); GREEN t132-progress-green.log 5/5.
- Full suite 120 files / 1019 tests PASS (t132-full-ui.log); S247 4/4; tsc 0.
