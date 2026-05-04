# Routing overview

Routing in `role-model` is deterministic and explainable.

The goal is not only to choose an endpoint, but to produce an answer to two questions:

1. which endpoints were valid candidates?
2. why was the final endpoint chosen over the others?

## The routing order

The baseline routing contract applies this order:

1. hard constraints and policy denies
2. observed real-world performance
3. benchmark-derived quality
4. declared capability profile
5. neutral defaults

If scores are tied within epsilon, the baseline tie-break order is:

1. local preference
2. lower estimated cost when cost optimization is active
3. lower p95 latency when latency optimization is active
4. stable lexical `endpoint_id`

See the reference note in [`../../protocol/routing-policy.md`](../../protocol/routing-policy.md) for the
concise contract wording.

## Eligibility comes first

Before scoring, the router filters out endpoints that cannot legally or practically satisfy the request.

Baseline exclusion families include:

- `CAPABILITY_MISSING`
- `MODALITY_UNSUPPORTED`
- `CONTEXT_TOO_SMALL`
- `TOOLS_UNSUPPORTED`
- `POLICY_DENY_ENDPOINT`
- `POLICY_DENY_REMOTE`
- `BUDGET_EXCEEDED`
- `PROVIDER_OFFLINE`

This matters because the router should never "score its way out of" a hard incompatibility.

## Measured evidence beats declarations

After eligibility, the router prefers measured evidence when it exists:

- latency and throughput
- failure behavior
- cost estimates
- freshness and confidence
- benchmark quality signals

Declared profiles still matter, but mainly as the baseline shape for eligibility and fallback behavior.

## Worked example: the gateway smoke route

The smoke request asks for:

- `code.edit`
- text output
- tool support
- balanced strategy
- local preference
- a strict per-request budget cap

The candidate set contains three endpoints:

| Endpoint | Result |
| --- | --- |
| `cli.local.coder` | eligible |
| `acp.remote.general` | excluded |
| `mcp.remote.embedder` | excluded |

Why the exclusions happen:

- `acp.remote.general` does not provide the required `code.edit` capability
- `mcp.remote.embedder` does not provide the required `code.edit` capability

Both exclusions are recorded as `CAPABILITY_MISSING`.

That leaves `cli.local.coder` as the only eligible candidate. The router then records the final decision
with selection reasons:

- `BEST_TOTAL_SCORE`
- `DECLARED_PROFILE_USED`
- `MEASURED_PROFILE_USED`
- `LOCAL_PREFERENCE_APPLIED`

The final `router-decision.json` therefore names:

- `chosen_endpoint_id: "cli.local.coder"`
- no fallback endpoints
- one scored candidate

## Why the artifacts matter

The decision is only one artifact in the routing story.

The smoke baseline also emits:

- `trace-spans.json` to show routing phases such as eligibility, scoring, and selection
- `usage-events.jsonl` to show request/accounting metadata
- `observed-performance.json` to show measured endpoint behavior

That artifact set is what makes routing explainable after the fact.

## Related reference docs

- [Routing policy](../../protocol/routing-policy.md)
- [Reason codes](../../protocol/reason-codes.md)
- [How role-model works](how-role-model-works.md)
- [Quickstart](../quickstart.md)
