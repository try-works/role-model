# S70 R16 R-vs-C delta table (released 0.0.20 at :3456 vs candidate at :5802)

Read-only GETs against the operator production host (`:3456`, released `0.0.20`) and the candidate served from the packaged branch build (`:5802`, `0.0.20-29-gd45ba6ff`). No POST, no state written to R.

## Same contract, same shapes

| Endpoint | R `:3456` | C `:5802` |
|---|---|---|
| `/healthz` | 200 JSON | 200 JSON, same shape |
| `/api/role-model/runtime/summary` | 200 JSON | 200 JSON |
| `/api/role-model/router/summary` | 200 (`strategy:null`, `executionMode:decision_only`, controller scope global) | identical semantics |
| `/api/role-model/operator/learning` | 200, `role-model.knowledge-worker.v1` | 200, same `schemaVersion` and field set |
| `/api/role-model/operator/replay/jobs` | 200 `[]` | 200 `[]` |
| `/api/role-model/operator/evaluation/jobs` | 200 (241 jobs) | 200 `[]` |

## Deltas, classified

| Delta | R | C | Classification |
|---|---|---|---|
| Version | `0.0.20` | `0.0.20-29-gd45ba6ff` | **Expected** (candidate after the release commit) |
| Models | 2 | 3 | **Environment/config** - the candidate runs the dev fixture config, R runs the operator config |
| Endpoints | 3 | 3 | **Environment/config** - different endpoint ids, same count and shape |
| Telemetry | 25 requests recorded | 0 | **Environment/state** - fresh candidate state root |
| Evaluation jobs | 241 | 0 | **Environment/state** - job history exists only in the operator store |
| `/api/role-model/version` (a path that does not exist) | **200 `text/html`** (SPA fallback) | **404 `application/json`** | **Intentional, approved (S38a)**: API paths no longer fall back to the index, so a mistyped GET is a typed 404 instead of a false success |
| `/` , `/app`, `/learning`, `/observe/queues` with `Accept: text/html` | 200 `text/html` (React app) | 200 `text/html` (Foldkit client boot) | **Intentional** - the client replacement is this run's purpose |

## What this establishes

- The **API contract** the UI depends on is unchanged between R and C: the same paths answer with the same shapes, and the operator learning/replay/evaluation surfaces exist on both.
- The only behavioural difference in HTTP semantics is the **intentional** 404-instead-of-HTML for missing API paths, which also makes the candidate stricter.
- The remaining differences are **environment/config/state**, not code: model and endpoint inventories come from config, telemetry and jobs from the state root.

## Not yet established (R16 is not closed)

- Route-by-route **UI** comparison of R against C (only sampled here: `/`, `/app`, `/learning`, `/observe/queues` all serve a client shell on both).
- R identity preservation (byte-identical artifact vs the released build) and a full R/D/C triple with `dev` as D.
- Any R behaviour that depends on operator state (evaluation jobs) cannot be compared without an equivalent seeded candidate state.
