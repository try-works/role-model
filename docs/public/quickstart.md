# Quickstart

This quickstart uses the real `gateway-smoke` app in the repository. It is the fastest way to see
`role-model` route a request and emit explainable runtime artifacts.

## Prerequisites

- Node.js 22
- pnpm 10.x

## Run the smoke flow

From the repository root:

```bash
pnpm install
pnpm run smoke
```

The smoke app lives at `role-model-router/apps/gateway-smoke/` and routes a synthetic request through the
reference router.

## What the smoke request looks like

The smoke run asks the router to satisfy a request with these requirements:

- `taskType: "code.edit"`
- `requiredCapabilities: ["code.edit"]`
- `preferredCapabilities: ["reasoning.multi_step"]`
- `requiredModalities: ["text"]`
- `needsTools: true`
- `strategy: "balanced"`
- `preferLocal: true`
- `budgetLimit: 0.01`

That request is matched against the sample endpoint metadata in
`testdata/endpoint-metadata/sample-endpoints.json`.

## What gets emitted

The smoke run writes artifacts under `runtime-output/gateway-smoke/`:

| File | What it shows |
| --- | --- |
| `router-decision.json` | the chosen endpoint, eligibility results, scores, and selection reasons |
| `trace-spans.json` | the high-level routing phases and their timing |
| `trace-events.jsonl` | event-level trace output |
| `usage-events.jsonl` | request accounting metadata |
| `observed-performance.json` | the measured profile aggregated for the chosen endpoint |

## What you should see

In the current baseline, the smoke flow chooses `cli.local.coder`.

Why:

1. it satisfies the required `code.edit` capability
2. it supports text output and tools
3. it matches the local preference
4. the other sample endpoints are excluded for missing required capability

The resulting `router-decision.json` records:

- `chosen_endpoint_id: "cli.local.coder"`
- exclusion reason code `CAPABILITY_MISSING` for the non-coder endpoints
- selection reasons including `BEST_TOTAL_SCORE`, `DECLARED_PROFILE_USED`, `MEASURED_PROFILE_USED`, and
  `LOCAL_PREFERENCE_APPLIED`

## Inspect the artifacts

Start with these files:

1. `runtime-output/gateway-smoke/router-decision.json`
2. `runtime-output/gateway-smoke/trace-spans.json`
3. `runtime-output/gateway-smoke/usage-events.jsonl`
4. `runtime-output/gateway-smoke/observed-performance.json`

Together they show the main four outputs the protocol cares about:

- **decision**: what the router chose and why
- **trace**: how routing progressed
- **usage**: what the request consumed
- **observed performance**: how the chosen endpoint behaved

## Read the flow in context

- [How role-model works](concepts/how-role-model-works.md)
- [Routing overview](concepts/routing-overview.md)
- [Observability model reference](../architecture/03-observability-model.md)
