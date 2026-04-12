# Routing Policy

The routing contract applies a deterministic order:

1. hard constraints and policy denies,
2. observed real-world performance,
3. benchmark-derived quality,
4. declared capability profile,
5. neutral defaults.

If scores are tied within epsilon, the baseline tie-break sequence is:

1. preferred locality strategy,
2. lower estimated cost when cost optimization is active,
3. lower p95 latency when latency optimization is active,
4. lexicographically stable `endpoint_id`.

Every exclusion or selection must emit reason codes so the final `RouterDecision` is explainable.
