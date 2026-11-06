# Three-mode real DeepSeek verification — 0.0.20-670-g26f21e01

Build: clean review-src21; distribution/package/verify-packaged-candidate PASS.
Only real DeepSeek endpoints in root ui-review26 (4 flash effort slots). No review.*/mock.*.

## 1. Direct to model
POST /v1/chat/completions model deepseek/deepseek-flash with response_format json_schema.
Response 200, JSON content {"answer":"ok"}; request req-67f9ae76-7251-4552-9672-923fda4ba644.
Telemetry: endpoint deepseek-flash, adapter ai-sdk-openai-compatible, ingress 338 bytes,
provider wire 267 bytes -> json_schema request lowered to json_object. No error.
## 2. Via routing alias
PUT /api/role-model/runtime/config with modelAliases [{aliasId:"deepseek-flash-direct",mode:"basic",
modelIds:["deepseek/deepseek-flash"],endpointIds:["...deepseek-flash"]}] -> 200 applied.
POST same request with model "deepseek-flash-direct" -> 200, {"answer":"alias-ok"}.
Telemetry req-1b333429-c507-42e7-8763-6668b22b506d: requestedModelId deepseek-flash-direct,
selectedModelId deepseek/deepseek-flash, endpoint deepseek-flash, status success, adapter
ai-sdk-openai-compatible, ingress 342 -> wire 273 bytes.
## 3. Benchmark
runId 4d3ca38c-5682-473e-8a44-085cd37187a0
subjects deepseek-flash-low + deepseek-flash-high, judge deepseek-flash-max, quick.
status completed, outcome PASSED, caseCounts total 24 / passed 24 / failed 0.
Scores: low 0.7500 (12/12), high 0.8083 (12/12); gradingMethod judge, judgeError null.
Pre-fix comparison: 5/12, 0.4167. UI history OUTCOME passed PASSED 24/24; detail headline
"completed · outcome passed", 24 rows, 24 PASS.
## Secret scan
scripts/runtime/scan-credential-material.mjs on exe + build/client + evidence:
sk-key 0, bearer-token 0, api-key-assignment 3 false positives (x-api-key header/form label),
MOCK_API_KEY identifier only in historical docs, no value.
