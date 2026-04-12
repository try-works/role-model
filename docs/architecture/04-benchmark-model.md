# Benchmark Model

Benchmarks are endpoint-centric, not model-family-only.

A benchmark run captures:

- the concrete endpoint identity,
- serving source and runtime/backend,
- device class, region, and warm/cold context,
- task/capability-oriented fixture suites,
- judge outputs that can feed observed performance profiles.

The baseline keeps suites intentionally small, but the schemas and package layout are designed so later
benchmark expansion does not require protocol rewrites.
