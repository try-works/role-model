# S639 - DeepSeek structured-output fix + three-mode real verification (goal-bbbda9ce)

## Final artifact
0.0.20-670-g26f21e01 (HEAD 26f21e01), sha256 45d045f1b821092591dc2e0f4f0cd345803fe95513fb5aaf6e3608f64b842910 - CHANGED vs ef5e0c6a. verify-packaged-candidate PASS. UI suite 118 files / 1012 tests PASS. Health healthy. Root ui-review26 contains only real DeepSeek endpoints (flash/low/high/max); no review.*/mock.*.

## Root cause
provider-openai advertised structuredOutputs "native" whenever the request asked for structured output (ignoring the model) and always sent response_format {type:"json_schema"}; the benchmark runner set response_format directly, so the passthrough branch forwarded json_schema to DeepSeek, which rejects it ("This response_format type is unavailable now"). Result pre-fix: 7/12 cases per endpoint scored 0 with generic "Benchmark execution failed."; endpoint score 0.4167.

## Fix (26f21e01)
- DeepSeek models are no longer native: provider-openai treats deepseek/* and deepseek-(flash|v4-pro) as json-fallback.
- Chat-completions builder sends {type:"json_object"} for structured requests and rewrites an explicit benchmark response_format json_schema to json_object; normalization reports structuredOutputMode "json-fallback".
- benchmark-runner sends json_object for DeepSeek subjects and for a DeepSeek judge/compare instead of JUDGE/COMPARE json_schema.
- Tests: provider 37/37 (RED captured with the policy disabled), benchmark-runner 19/19, host tsc 0; fake upstream that rejects json_schema and accepts json_object proves the fallback and that the case grades > 0.

## Three-mode real verification (c073c964)
1) DIRECT TO MODEL: POST /v1/chat/completions model deepseek/deepseek-flash with response_format json_schema -> 200, valid JSON; request req-67f9ae76...; telemetry shows adapter ai-sdk-openai-compatible and provider wire 267 bytes vs 338 ingress (json_schema lowered to json_object).
2) VIA ROUTING ALIAS: two forms were checked. (a) A user modelAliases config entry {aliasId:"deepseek-flash-direct", mode:"basic", ...} applied via PUT /api/role-model/runtime/config -> 200, request model "deepseek-flash-direct" -> 200 valid JSON, telemetry req-1b333429... requested alias -> selected deepseek/deepseek-flash. CORRECTION from the owner: this is a user model-alias entry, NOT a routing alias. (b) The REAL routing alias family (baseline.remote-only / difficulty.remote-only / controller.remote-only / hybrid.remote-only) was verified directly: POST /v1/chat/completions with model "baseline.remote-only" and a json_schema response_format -> 200, routed to deepseek/deepseek-flash, content {"ok":true,"alias":"baseline.remote-only"}, usage 79/34/113 (evidence s639-routing-alias-baseline-remote-only.json).
3) BENCHMARK (real): runId 4d3ca38c-5682-473e-8a44-085cd37187a0 (low+high subjects, deepseek-flash-max judge) -> completed, outcome PASSED, caseCounts 24/24 passed, 0 failed; scores low 0.7500, high 0.8083, gradingMethod judge, judgeError null. UI history OUTCOME=passed, PASSED 24/24; detail "completed - outcome passed", 24 PASS rows. Pre-fix comparison: 10/24 (0.4167 each).
   Independent lead run 4fe95740-3107-419c-8f0b-992a157db3fe on the same build: completed, outcome partial, 23/24 passed (low 0.871, high 0.775); the single failure is a real benchmark miss (h09-agent-metrics-chain: checklist requires multiple API tool calls, model emitted one). Both results are recorded honestly - pass rate varies run to run, transport failures are gone.

## Secret scan
Exe + build/client + evidence (2705 files): sk-key 0, bearer-token 0; api-key-assignment 3 false positives (x-api-key header/form label); MOCK_API_KEY identifier only in historical docs, no value.

## Evidence
- c073c964 review-0.0.20-670-g26f21e01/ (identity, three-mode transcripts, telemetry wire sizes, benchmark run JSON, UI detail, secret scan).
- 26f21e01 provider/runner fix + tests.

## Notes
- Production :3456 is 0.0.20 @ 945a8906 (our merge-base), so it carries the same defect until this ships.
- Alias routing config requires mode basic|difficulty|intelligent|hybrid.
