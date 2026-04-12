# Profiles

The baseline uses two complementary profile types:

- `DeclaredCapabilityProfile` for provider-declared capabilities and constraints,
- `ObservedPerformanceProfile` for measured endpoint behavior such as latency, throughput, failures,
  cost estimates, freshness, and confidence.

Routing should prefer measured evidence when available, but retain declared capability metadata as the
fallback shape for eligibility and neutral defaults.
