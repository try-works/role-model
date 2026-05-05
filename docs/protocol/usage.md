# Usage Events

`UsageEvent` records application-facing request outcomes.

Each event ties together:

- application and organization context,
- request and routing decision identifiers,
- endpoint/provider/model/package identity,
- token counts, latency, cost estimate, currency, and error class.

Usage events are designed for per-application usage accounting, cost summaries, and operational forensics.

The baseline usage contract is also part of observability linkage. Every usage event must identify:

- `app_id`
- `request_id`
- `routing_decision_id`
- `endpoint_id`
- `provider_kind`
- token counts and latency

Optional fields such as `org_id`, `model_id`, `package_id`, `cost_estimate`, `currency`,
`error_class`, and `sample_source` let the same event stream support application billing, benchmark
samples, and runtime troubleshooting without changing shape.

`sample_source` distinguishes `live_request` from `benchmark`. `validateUsageLinkage` enforces that a
usage stream belongs to one router decision by matching both `request_id` and `routing_decision_id`.
`summarizeUsageEvents` provides stable rollups by app, endpoint, model, and provider kind.
