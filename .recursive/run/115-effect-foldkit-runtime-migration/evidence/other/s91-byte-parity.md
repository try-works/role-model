# S91 Like-for-like D vs C under one fixture config: byte-identical API bodies

The earlier R/D/C table compared shapes. This compares **bytes** with both candidates started on the SAME fixture config and their own fresh state roots.

## Method

- D = `0.0.20-1-g9b0ca8bd` (dev tip), C = `0.0.20-66-g91f089ec` (this branch).
- Both launched with `--fixture-root <same fixtures>`, separate fresh state roots on `E:`, ephemeral ports 5920/5921.
- Same GETs against both; timestamps normalised; bodies compared as strings.

## Result

| Endpoint | identical | lengths |
|---|---|---|
| `/api/role-model/models` | **YES** | 1495 / 1495 |
| `/api/role-model/endpoints` | **YES** | 3056 / 3056 |
| `/api/role-model/router/summary` | **YES** | 527 / 527 |
| `/api/role-model/operator/replay/jobs` | **YES** | 3 / 3 |
| `/api/role-model/operator/evaluation/jobs` | **YES** | 3 / 3 |
| `/api/role-model/operator/learning` | **YES** | 335 / 335 |
| `/api/role-model/runtime/summary` | differs | 4997 / 4999 |

`runtime/summary` differs in exactly **12 fields**, and every one is identity or process state:

`runtime.commit`, `runtime.version`, `runtime.release_version`, `runtime.source_tree`, `runtime.executable_sha256`, `runtime.core_payload_sha256`, `runtime.build_date`, `processMetrics.pid`, `processMetrics.rssBytes`, `runtimeStateRoot`, `unifiedConfig.path`, `operatorIntent.path`.

**No semantic field differs.**

## What this establishes

The migration (D) and this branch (C) are **observationally identical** on the shared API surface when the configuration is equal: same bytes out of models, endpoints, router summary and all three operator surfaces, and a runtime summary that differs only by which binary is running and where its temp state lives.

That is the strongest form of the D-vs-C parity claim available without operator state, and it is reproducible: two packaged artifacts, one fixture config, seven GETs.
