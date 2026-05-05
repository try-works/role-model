# Benchmarks

Benchmark suites are capability-oriented collections of cases executed against concrete endpoints.

The baseline requires fixture coverage for:

- chat,
- multi-step reasoning,
- code chat and code edit,
- tool calling,
- schema adherence,
- text embeddings.

Benchmark outputs are not isolated reports; they are designed to refresh or seed observed performance data.

In the current baseline, benchmark output is one of the canonical sources for
`ObservedPerformanceProfile`. Benchmark-derived samples are recorded with `source_type: "benchmark"`
and later aggregated together with `live_request` samples.

That means benchmark suites are part of the same empirical evidence model as production traffic:

- benchmark samples increase `sources.benchmark_samples`,
- live traffic increases `sources.live_request_samples`,
- both contribute to `sample_size`, freshness, confidence, and optional measured quality or cost fields.

This lets the router prefer measured evidence without requiring a separate benchmark-only profile type.
