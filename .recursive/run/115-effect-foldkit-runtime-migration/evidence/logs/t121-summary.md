# Task-121 - benchmark progress/result parity and per-case failure visibility

## Product
- Benchmark progress now keeps the full host snapshot (runPhase, currentPhase, completedSteps/totalSteps,
  endpointIndex/Count + currentEndpointModelId, caseIndex/Count + currentCaseId, errorCode/errorMessage and the
  completed run result) instead of only N/M steps.
- The panel renders the reference phase wording ("Phase 1 of 3 · Recording responses", "Phase 2 of 3 · Judge
  grading", "Phase 3 of 3 · Head-to-head compare"/"Complete"), a percent bar, "N / M steps" and the endpoint/case
  context. Terminal failure shows the host errorCode + errorMessage. A host "completed" run whose cases all failed
  shows "0/12 cases executed — 12 failed", the first case rationale/actualPreview/judgeError and per-endpoint scores,
  so it can never read as a green completed state.
- Run history rows keep the reference table and add "View details". The new LoadBenchmarkRunDetail command GETs
  /api/role-model/benchmark/runs/<id>; the panel shows run status/error, passed/failed counts and a per-case table
  (case, difficulty, score, PASS/FAIL, rationale, actual preview, judge error).

## Tests
- s638 (6): running phase label/percent/bar/steps/context; terminal failed error; completed all-failed run warning
  and failure sample; per-case detail panel; detail command + exact active/detail paths; mounted running->completed
  transition via readback + poll fixtures.
- RED t121-progress-red.log: benchmark view reverted to the old N/M-only panel -> 6/6 failed. GREEN
  t121-progress-green.log: 6/6. t121-targeted.log (s563+s622+s638) 39/39. Full UI suite 115 files / 999 tests PASS
  (t121-full-ui.log); S247 4/4 (t121-s247.log).

## Evidence
- Fixture DOM/screenshots (component-level, generated from the committed view with the exact host record shape):
  t121-running-fixture.png/.html (49/60, 82%, compare phrase) and t121-completed-failure-fixture.png/.html
  (completed but 0/12 cases executed, per-case detail with 12 FAIL rows). DOM facts in t121-fixture-dom.json.
- Live packaged capture is delegated to the rebuild/capture lane (s9b-eventlog holds mock runs 359092a5 pass and
  fe8... fail on the 649 root); this branch commit is what they rebuild.
