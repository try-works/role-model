# Profiles

The baseline uses two complementary profile types:

- `DeclaredCapabilityProfile` for provider-declared capabilities and constraints,
- `ObservedPerformanceProfile` for measured endpoint behavior such as latency, throughput, failures,
  cost estimates, freshness, and confidence.

Routing should prefer measured evidence when available, but retain declared capability metadata as the
fallback shape for eligibility and neutral defaults.

`ObservedPerformanceProfile` is now a stable, linkage-friendly contract. The required fields are:

- `endpoint_id`
- `endpoint_version`
- `measured_at_ms`
- `measurement_window`
- `sample_size`
- `sources`
- `latency_ms_p50`
- `latency_ms_p95`
- `failure_rate`
- `freshness_score`
- `confidence_score`

`measurement_window` replaces the older `sample_window` name. It captures the start and end timestamps
of the samples that fed the aggregate. `sources` is split into `benchmark_samples` and
`live_request_samples`, and the runtime helper enforces `sample_size >= benchmark_samples + live_request_samples`.

Observed samples are recorded with `source_type`, `timestamp_ms`, and `endpoint_version` before
aggregation. Aggregation rejects mixed endpoint versions, computes freshness and confidence from the
sample set, and emits optional measured fields such as `judge_score`, `quality_score`,
`tokens_per_sec`, `cost_per_1k_tokens_est`, `currency`, and `error_class_rates` only when the
underlying evidence exists.
