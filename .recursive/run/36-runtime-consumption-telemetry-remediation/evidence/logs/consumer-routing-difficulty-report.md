# Consumer Routing Test — Difficulty Strategy

- Generated: 2026-06-10T12:05:34.803631+00:00
- Runtime: `http://127.0.0.1:3456`
- Model: `mixed.local-remote` (exact-model cases use pinned ids)
- Scenarios: 15 | **Passed: 14** | Failed: 1
- Telemetry rows matched: 15/15
- Hard→remote: 3/3 | Easy→local: 3/3

## Results

| # | Scenario | HTTP | Endpoint | Difficulty | Cache | Latency | Status |
| ---: | --- | ---: | --- | --- | --- | ---: | --- |
| 1 | `e01-yes-no` | 200 | local | easy | None | 3169ms | PASS |
| 2 | `e03-count` | 200 | local | easy | True | 455ms | PASS |
| 3 | `p02-easy-math` | 200 | local | easy | True | 375ms | PASS |
| 4 | `p06-medium-explain` | 200 | local | easy | True | 12561ms | PASS |
| 5 | `l01-verbose-incident` | 200 | local | medium | None | 632ms | PASS |
| 6 | `p12-code-patch` | 200 | remote | medium | True | 11148ms | PASS |
| 7 | `c02-ts-generics` | 200 | remote | medium | True | 46101ms | PASS |
| 8 | `p17-tools-multi-hard` | 200 | remote | hard | None | 12443ms | PASS |
| 9 | `t02-tools-triple` | 200 | remote | hard | True | 85887ms | PASS |
| 10 | `x01-max-signal` | 200 | remote | hard | None | 5015ms | PASS |
| 11 | `p24-exact-local` | 200 | local | easy | None | 4018ms | PASS |
| 12 | `p25-exact-remote` | 200 | remote | easy | True | 2046ms | PASS |
| 13 | `p26-cache-easy-a` | 200 | local | easy | True | 448ms | FAIL |
| 14 | `p27-cache-easy-b` | 200 | local | easy | True | 484ms | PASS |
| 15 | `p30-cache-invalidate` | 200 | remote | hard | None | 13658ms | PASS |

## Failures / mismatches

- **p26-cache-easy-a**: expected cacheHit=False, got True

## Preconditions

```json
{
  "base_url": "http://127.0.0.1:3456",
  "captured_at": "2026-06-10T12:02:13.070101+00:00",
  "health": {
    "status": 200,
    "body": {
      "status": "healthy",
      "executionMode": "decision_only",
      "vendors": {
        "llama-swap": {
          "vendorId": "llama-swap",
          "healthStatus": "inactive"
        },
        "litellm": {
          "vendorId": "litellm",
          "healthStatus": "inactive"
        }
      },
      "inactiveVendors": [
        "llama-swap",
        "litellm"
      ]
    }
  },
  "version": {
    "status": 200,
    "body": {
      "version": "1.0",
      "commit": "runtime-derived",
      "build_date": "runtime-derived"
    }
  },
  "endpoints": {
    "status": 200,
    "body": [
      {
        "endpointId": "local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0.local.lfm2.5-1.2b-instruct",
        "modelId": "lfm2.5-1.2b-instruct",
        "providerId": "local-openai-compatible",
        "providerAccountId": "local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0",
        "roleIds": [],
        "localModelSource": "peer-backed",
        "endpointKind": "local_engine",
        "servingSource": "local-peer",
        "sourceType": "local",
        "healthStatus": "healthy",
        "capabilities": [
          "text.chat",
          "tools.function_calling"
        ],
        "toolCallingSupported": true,
        "toolCallingStyle": "none",
        "status": "active"
      },
      {
        "endpointId": "moonshot.personal.kimi-code.global.kimi-k2.6",
        "modelId": "moonshot/kimi-k2.6",
        "providerId": "moonshot",
        "providerAccountId": "moonshot.personal.kimi-code",
        "roleIds": [
          "classifier",
          "coder.patch",
          "coder.review",
          "embedder",
          "general.chat",
          "language.detector",
          "tool.agent"
        ],
        "endpointKind": "remote_api",
        "servingSource": "remote-service",
        "sourceType": "remote",
        "healthStatus": "healthy",
        "capabilities": [
          "text.chat",
          "tools.function_calling",
          "structured.output"
        ],
        "toolCallingSupported": true,
        "toolCallingStyle": "openai",
        "status": "active"
      }
    ]
  },
  "runtime_summary": {
    "status": 200,
    "body": {
      "lifecycleSummary": {
        "active": 2,
        "degraded": 0,
        "offline": 0
      },
      "providerCount": 215,
      "accountCount": 3,
      "endpointCount": 2,
      "scopeId": "standalone-runtime",
      "runtimeStateRoot": "C:\\Users\\erikb\\AppData\\Local\\Role Model Runtime",
      "readinessSummary": {
        "pendingDeviceAuthorizationCount": 1,
        "credentialsMissingAccountCount": 0,
        "connectedWithoutEndpointCount": 0,
        "readyAccountCount": 2
      },
      "executionMode": "decision_only",
      "unifiedConfig": {
        "enabled": true,
        "path": "C:\\Users\\erikb\\AppData\\Local\\Role Model Runtime\\runtime-config.yaml"
      }
    }
  },
  "telemetry_summary": {
    "status": 200,
    "body": {
      "requestCount": 0,
      "successCount": 0,
      "failureCount": 0,
      "totalInputTokens": 0,
      "totalOutputTokens": 0,
      "totalTokens": 0,
      "cachedRequestCount": 0,
      "totalActualCostUsd": 0,
      "totalEstimatedCostUsd": 0,
      "averageLatencyMs": null,
      "p95LatencyMs": null,
      "lastSeenAtMs": null,
      "sourceBreakdown": {
        "local": {
          "requestCount": 0,
          "successCount": 0,
          "failureCount": 0,
          "totalInputTokens": 0,
          "totalOutputTokens": 0,
          "totalTokens": 0,
          "cachedRequestCount": 0,
          "totalActualCostUsd": 0,
          "totalEstimatedCostUsd": 0,
          "averageLatencyMs": null,
          "p95LatencyMs": null,
          "lastSeenAtMs": null
        },
        "remote": {
          "requestCount": 0,
          "successCount": 0,
          "failureC
```
