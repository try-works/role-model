# Observability Model

Observability is protocol-owned data, not leftover logs.

The baseline distinguishes:

- `RouterDecision` for explainable selection outcomes,
- `TraceEvent` and `TraceSpan` for execution-path timing and fallback detail,
- `UsageEvent` for request/accounting outcomes,
- `ObservedPerformanceProfile` for measured endpoint behavior over time.

The lightweight host writes artifacts to a documented runtime output path so later dashboards can build
leaderboards, regression views, cost/latency comparisons, and failure-trend analysis without changing the
core data model.
