# 3-endpoint benchmark verification — 0.0.20-680-g82c13ca9

Build clean review-src23; distribution/package/verify-packaged-candidate PASS.
Root ui-review28: only real DeepSeek endpoints; no review.*/mock.*.
Suite 120 files / 1019 tests PASS.

## 3-endpoint run
runId f3422b68-ac5c-4256-ac1a-e79715c493b0
subjects: deepseek-flash-low, deepseek-flash-max (same model), deepseek-v4-pro-high
judge: deepseek-flash
status completed, outcome PARTIAL, requestedEndpointCount=3, executedEndpointCount=3,
skippedEndpoints=[], totalSteps=84, completedSteps=84, caseCounts 36 total / 33 passed / 3 failed.
Scores: flash-low 0.8375 (11/12), flash-max 0.8417 (11/12), v4-pro-high 0.7750 (11/12).
Step formula verified on 300 progress samples: totalSteps = 3*12 (execute) + 36 (judge) + 12 (compare) = 84;
completedSteps == (endpointIndex-1)*caseCount + (caseIndex-1) on every running sample (0 violations,
monotonic). UI detail: 36 rows, 33 PASS / 3 FAIL, headline outcome partial.

UI panel live text:
  t=1.5s: "Requested 3 endpoints · executed — · skipped: <three ids>" (pre-admission placeholder)
  t=3s:   "Requested 3 endpoints · executed 3" (no stale 0/0; steps 0/84)
  t=5s:   "Requested 3 endpoints · executed 3" (1/84)
Observed UI does not append "· skipped: none" when skipped is empty; host skippedEndpoints is [].

## Regressions
router overview: baseline.remote-only + EXECUTION MODE remote_only, no strategy.execution_mode alias;
requests 9 charts, routing 9 charts, queues renders, sidebar models.

## Secret scan
exe + build/client + evidence (2761 files): sk-key 0, bearer 0; api-key-assignment 3 false positives.
