# Addendum 25 Routing Contract Map

Generated: 2026-06-18

## Backend Contract

| Concept | Accepted values | Backend source | UI write/read surface | Effective behavior |
|---|---|---|---|---|
| Routing strategy | `null`, `baseline`, `controller`, `difficulty`, `hybrid` | `UnifiedRuntimeConfig.routingStrategy`; normalized by `normalizeConfiguredRoutingMode()` for request routing | `/app/router/strategy` writes with `updateRuntimeConfig()`; `/app/router` reads config and router summary | Chooses baseline, controller, difficulty, or hybrid arbitration. It does not decide local-vs-remote eligibility by itself. |
| Execution mode | `decision_only`, `hybrid`, `local_only`, `remote_only` | `UnifiedRuntimeConfig.executionMode`; parsed from `execution_mode` and `executionMode` | `/app/router/strategy` writes the selected mode; `/app/router`, `/api/role-model/router/summary`, `/api/role-model/router/candidates`, `/api/role-model/controller`, and `/v1/models` read the effective mode | Filters the effective router registry. `local_only` exposes only local endpoints; `remote_only` exposes only remote endpoints; `hybrid` and `decision_only` expose both for diagnostics/routing visibility. |
| Alias routing mode | `basic`, `difficulty`, `intelligent`, `hybrid` | `UnifiedRuntimeModelAliasConfig.mode`; parsed from `model_aliases.*.mode` | `/app/router` alias inventory displays the mode; `/app/router/strategy` writes config when edited through runtime config | Preserved and surfaced as alias strategy metadata. Endpoint expansion is filtered by effective execution mode before alias resolution. |
| Routing alias pool | alias id plus `model_ids` | `model_aliases` in runtime config | `/app/router` alias inventory and `/v1/models` model list | Resolves only against the effective routable inventory. Local hints disappear under `remote_only`; remote hints disappear under `local_only`. |
| Controller assignment | endpoint/model/source tuple | persisted controller row plus effective fallback | `/api/role-model/controller`, `/app/router`, `/app/router/strategy` | Persisted controller is accepted only if its endpoint is present in the effective execution-mode registry; otherwise backend falls back to an allowed default controller. |

## Implementation Alignment

- `filterRouterRegistryByExecutionMode()` is the central local/remote filter.
- `backend.effectiveRegistry` and `backend.getEffectiveRoutableInventory()` are the execution-facing accessors.
- Chat completions, responses, controller guidance, `/v1/models`, router summary, router candidates, and public controller readback now use effective execution-mode-scoped inputs.
- Raw `backend.registry` remains available for diagnostics and setup surfaces that need the complete inventory.

## Verification Matrix

Live API verification exercised:

- `5` routing strategy states: `null`, `baseline`, `controller`, `difficulty`, `hybrid`
- `4` execution modes: `decision_only`, `hybrid`, `local_only`, `remote_only`
- `4` alias modes: `basic`, `difficulty`, `intelligent`, `hybrid`
- Total: `80` combinations

Evidence:

- Matrix result: `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-25-routing-config-matrix.json`
- Browser result: `/.recursive/run/49-runtime-telemetry-analytics-charts/evidence/manual-qa/addendum-25-routing-browser-verification.json`

Observed final state after verification:

- Runtime config: `routingStrategy = hybrid`, `executionMode = remote_only`
- Router summary controller: `moonshot.personal.kimi-code.global.kimi-k2.7-code`
- Public controller endpoint: `moonshot.personal.kimi-code.global.kimi-k2.7-code`
- Router candidates: remote only
- `/v1/models`: `mixed.local-remote`, `moonshot/kimi-k2.7-code`
- `/app/router` and `/app/router/strategy`: no stale local controller or local routing candidate surfaced.
