# Real DeepSeek benchmark proof (0.0.20-657-g7f8e420e)

## Run
runId 727eabaf-a7d7-4130-9365-f91753cc55a3
POST /api/role-model/benchmark/runs
subjects: deepseek.personal.deepseek-api-key.global.deepseek-flash
          deepseek.personal.deepseek-api-key.global.deepseek-flash-low
judge:    deepseek.personal.deepseek-api-key.global.deepseek-flash-high
mode: quick
status: completed, 60/60 steps
scores: flash 0.416666..., flash-low 0.383333...
Real DeepSeek calls are visible in caseResults (judge/heuristic mix); failures include host
"response_format type is unavailable now" from the actual DeepSeek API. Non-zero scores prove
the endpoint executed.

UI capture: /system/benchmark Scores table shows deepseek/deepseek-flash 42% and 38%, judge
deepseek/deepseek-flash, run 727eabaf in Run history. See scores-ui-*.json/.png.

## Purge
Deleted review.judge/review.subject.alpha/review.subject.beta endpoints through DELETE
/api/role-model/endpoints/<id>, then deleted 3 provider_accounts rows with provider_account_id
LIKE 'review.%' or 'mock.%' from ui-review21. Remaining endpoints: openai fixture, anthropic
fixture, 4 real deepseek effort slots, cli.local. No mock.* or review.* endpoint remains.

## Opt-in dev scripts
scripts/runtime/dev/{mock-benchmark-upstream,seed-review-benchmark-mock,seed-review-benchmark-endpoints}.mjs
are not called by seed-review-telemetry; the default review seed creates no fake accounts.

## Credential scan (no values printed)
Command:
node scripts/runtime/scan-credential-material.mjs <exe> <release build/client> <evidence tree>
Result: sk-key 0 hits; bearer-token 0 hits. api-key-assignment 3 hits are false positives
(source text "x-api-key" header and a form label), not secret values. MOCK_API_KEY matches only
the identifier in two historical README files; no value is present.
