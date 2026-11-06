# Final verification — 0.0.20-676-g29dfe8ea

Build clean review-src22; distribution/package/verify-packaged-candidate PASS.
Root ui-review27: only real DeepSeek endpoints; no review.*/mock.*.
Suite 119 files / 1014 tests PASS.

## Router Overview
CURRENT ACTIVE ALIAS = baseline.remote-only (hyphen), separate EXECUTION MODE = remote_only.
Inventory ids hyphenated (baseline.hybrid, controller.remote-only). DOM contains no
"strategy.execution_mode" fabricated alias. See router/overview-dom.json + .png.

## Alias request
POST /v1/chat/completions model baseline.remote-only with json_schema response_format -> 200,
{"answer":"alias-baseline-ok"}. Telemetry req-b7c1a381-f6fe-4233-bf57-bb966c0a22e5:
requested baseline.remote-only -> selected deepseek/deepseek-flash, endpoint deepseek-flash,
success, adapter ai-sdk-openai-compatible, routingDecisionId
decision-req-b7c1a381-f6fe-4233-bf57-bb966c0a22e5.

## Benchmark
runId 4c970a25-8a08-49a6-b3cf-47895bdf91d4, subjects deepseek-flash-low + high, judge max.
status completed, outcome PARTIAL, caseCounts 24 total / 22 passed / 2 failed.
Scores: low 0.7042 (11/12), high 0.7750 (11/12). Failures are grounded_truth_mismatch on
h08-multi-turn-tool-refine. UI history OUTCOME partial PASSED 22/24; detail 24 rows 22 PASS 2 FAIL.

## Regressions
requests 9 charts, routing 9 charts, queues renders, sidebar models present.

## Secret scan
exe + build/client + evidence (2734 files): sk-key 0; bearer 0; api-key-assignment 3 false
positives (x-api-key header/form label); MOCK_API_KEY identifier only in historical docs.
