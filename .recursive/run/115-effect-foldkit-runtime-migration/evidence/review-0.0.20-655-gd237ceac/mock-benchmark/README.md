# Mock benchmark proof — 0.0.20-655-gd237ceac

Harness scripts: scripts/runtime/mock-benchmark-upstream.mjs, scripts/runtime/seed-review-benchmark-mock.mjs.
Mock server runs at 127.0.0.1:3490 (healthy) and :3491 (fail-after-first). Host launched with
MOCK_API_KEY=mock-secret; accounts use credentialRef {backend:"env",ref:"MOCK_API_KEY"} plus
baseUrlOverride, no secret committed.

## Passing run (real HTTP)
runId 42947605-c528-49ca-8139-027ba03f3a4a
status completed, 60/60 steps.
endpointGrades: both 0.683333...; hard 12 cases each; caseResults gradingMethod "judge",
score 0.82, judgeError null. Progress: 0/60 execute -> ... -> judge -> compare -> completed
(see passing/progress-samples.json, 40 distinct samples after dedupe).

## Failing run (real HTTP 500 after admission)
runId d0aa9d7b-c7a0-4665-998e-4320fe9ecd0e
status completed, 60/60 steps.
mock.local.fail2 overallScore 0, 12/12 failed; caseResults actualPreview "mock upstream failure",
rationale "Benchmark execution failed.", gradingMethod "heuristic", judgeError null.
There is NO errorMessage field anywhere in the terminal record; the only error carrier is
actualPreview (+ rationale). Host still reports status completed for a run with 12/12 failed
cases on one endpoint and 2 validator failures on the healthy endpoint.

## UI
/system/benchmark run-detail panel on this build:
  Run detail · d0aa9d7b-... · completed
  10/24 cases passed — 14 failed
  24 [data-benchmark-case-row] rows; FAIL rows show actualPreview "mock upstream failure"
  and judgeError "—" (null).
Evidence: ui/benchmark-detail-dom-0.0.20-655-gd237ceac.json + .png.

## Host contract question
Should a terminal run with a 12/12 failed endpoint (and 14/24 failed cases overall) be
status completed, or failed/partial? Current host says completed; the UI now derives
"14 failed" from caseResults. A host-side honesty change is still needed if completed is
meant to mean all cases executed successfully.
