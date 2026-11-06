# S66 R17 corrections: two classifications were wrong, verified against the live host

## J6 - the capability exists; the probe used the wrong paths

Probing the packaged host myself:

| Path | Result |
|---|---|
| `/api/role-model/operator/replay/jobs` | **200 `[]`** |
| `/api/role-model/operator/evaluation/jobs` | **200 `[]`** |
| `/api/role-model/operator/learning` | **200**, `candidates: 0` |
| `/api/role-model/replay/jobs` (un-prefixed) | 404 |

So "all 404, capability absent" was wrong: the surfaces exist and answer with honest empty lists. The correct classification is **honesty PASS** (empty and honest, no seeded rows) with **job execution NOT RUN** (no jobs configured).

## J4 - the 400 is correct, not a defect

`/api/role-model/endpoints` shows all three configured endpoints with **empty** `reasoningEffort` and **empty** `reasoningEffortLevels`, `effortSource=provider-default`.

Therefore a request declaring `reasoning_effort: high` is correctly rejected with `400 capability_eligibility_error / no_eligible_target`: no configured target can honour effort. The honest classification is **effort-honoring NOT RUN** (no effort-capable endpoint exists in this environment) with **honesty PASS** - the readback reports `reasoningEffort: null`, `effortSource: none`, and no fabricated live-only support.

Reporting it as a product defect would have been wrong; the environment lacks an effort-capable endpoint, and the API said so precisely.

## J3 - cancel needs a slow upstream

The cancel leg never ran because the failing mock upstream poisoned the endpoint and the circuit breaker answered `503 endpoint_temporarily_unavailable` first. Exercising cancel needs a slow (multi-second) upstream and a mid-flight abort on a fresh state, then: terminal non-success, no hung spinner, counter +1 exactly.
