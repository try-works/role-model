# Mock benchmark functional proof (0.0.20-649-g4a5c9faa)

## Harness
- scripts/runtime/mock-benchmark-upstream.mjs: local OpenAI-compatible /v1/chat/completions.
  - healthy mode returns a substantive judge JSON for judge prompts and a normal answer for subjects.
  - fail-after-first / invalid-judge modes produce real execution/judge errors after the admission probe.
- scripts/runtime/seed-review-benchmark-mock.mjs: creates 4 non-secret provider accounts and endpoints through the host API.
- Host launched with MOCK_API_KEY=mock-secret (credentialRef env, no secret committed).

Commands:
  node scripts/runtime/mock-benchmark-upstream.mjs --port 3490 --mode healthy --log <log>
  node scripts/runtime/mock-benchmark-upstream.mjs --port 3491 --mode fail-after-first --succeed-first 1 --log <log>
  node scripts/runtime/seed-review-benchmark-mock.mjs --url http://127.0.0.1:3480

## Passing run (real HTTP against 3490)
runId 359092a5-b75e-4e60-ab09-d5a0db30ff08
status completed, 60/60 steps. Both endpointGrades overallScore 0.6833; hard cases 12/12;
caseResults use gradingMethod "judge", score 0.82, rationale "Mock judge: ...", judgeError null.
Progress samples: 0/60 execute -> 2/60 case 3 -> ... -> 25/60 judge -> compare -> completed.

## Failing run (real HTTP against fail-after-first 3491)
runId 88e065d8-d1e5-4591-a117-4b02b229d9b4
status completed, 60/60 steps. mock.local.fail2 overallScore 0, actualPreview "mock upstream failure",
rationale "Benchmark execution failed.", gradingMethod "heuristic", judgeError null.
There is NO errorMessage field anywhere in the run record; the per-case error is carried only in
actualPreview + rationale. The run still reports status completed even though 12/12 of that
endpoint's cases failed.

## Contract question recorded for the host owner
Should a run with one endpoint at 12/12 failed cases be status completed, or failed/partial?
Today the host reports completed (same shape as the owner-observed run 24a89d52), so the UI has to
derive "partial failure" from endpointGrades[].caseResults[].score/actualPreview and surface it.
