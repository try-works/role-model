# Protocol overview

The `role-model` protocol is the contract layer that lets routing systems talk about requests, endpoints,
policy, and observability in one stable vocabulary.

It is designed so hosts and providers can vary without forcing every integration to invent a new routing
shape.

## What the protocol owns

The protocol defines schemas and terms for the main routing entities:

| Entity | Purpose |
| --- | --- |
| `EndpointIdentity` | names the concrete endpoint being considered |
| `DeclaredCapabilityProfile` | records what an endpoint says it supports |
| `ObservedPerformanceProfile` | records measured behavior such as latency, cost, and failure rate |
| `RoleDefinition` | describes a role such as `general.chat` or `coder.patch` |
| `TaskDefinition` | describes the unit of work being satisfied |
| `RoutingPolicy` | defines hard constraints, preferences, and tie-break behavior |
| `RouterDecision` | records the chosen endpoint, exclusions, and reasons |
| `TraceEvent` / `TraceSpan` | records execution-path timing and routing stages |
| `UsageEvent` | records accounting and request outcome metadata |

The canonical schemas live under [`../../../protocol/`](../../../protocol/README.md).

## Protocol first, router second

This repository is organized around a simple rule: **the protocol is canonical, and hosts adapt to it**.

That means:

- the schemas are the source of truth
- generated types and validators should follow the schemas instead of redefining them
- router implementations are expected to consume and emit protocol-shaped data

The reference implementation in `role-model-router/` is important, but it is not the protocol itself.

## Why the protocol is endpoint-centric

The protocol routes against concrete endpoints because that is where meaningful differences live:

- one model may be available through multiple providers
- tool support can differ by endpoint
- runtime, device, region, and package metadata can differ
- measured latency, quality, freshness, or cost can differ

Two endpoints serving the same base model are not automatically interchangeable. The protocol makes that
difference explicit.

## Roles, tasks, and capabilities

The protocol separates three things that often get collapsed together:

| Concept | Meaning |
| --- | --- |
| role | the kind of worker or behavior being requested |
| task | the unit of work to be performed |
| capability | the concrete feature needed to perform that work |

For example, a code-editing flow might combine:

- a role like `coder.patch`
- a task like `code.edit`
- capabilities such as `code.edit`, `reasoning.multi_step`, and `tools.function_calling`

That separation lets the router reason in a more durable way than "pick model X for prompt Y."

## Current implemented baseline

Today the repository already includes:

- protocol schemas and fixtures
- schema tooling and generated types
- deterministic routing behavior
- smoke-path artifact generation for decisions, traces, usage, and observed performance

Some future host families are still reference architecture rather than fully built runtime surfaces.

## Related reference docs

- [Protocol root](../../../protocol/README.md)
- [Roles](../../protocol/roles.md)
- [Tasks](../../protocol/tasks.md)
- [Profiles](../../protocol/profiles.md)
- [Routing policy](../../protocol/routing-policy.md)
- [Repository overview](../../architecture/00-overview.md)
