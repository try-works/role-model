# Introduction

`role-model` is an open protocol for capability-aware AI routing.

It gives a system a shared way to describe:

- the request being routed
- the task and role requirements behind that request
- the concrete endpoints that can satisfy it
- the routing policy that constrains selection
- the observability artifacts that explain what happened

## Why this exists

Most AI integrations start by hard-coding a model name and then slowly accumulate one-off rules for cost,
latency, locality, tool support, and fallback behavior.

`role-model` turns that into an explicit contract:

1. define the work as a task
2. describe the endpoint as a concrete routable identity with declared and observed profiles
3. apply policy consistently
4. emit explainable artifacts for the final decision

That makes routing easier to audit, compare, evolve, and move across hosts or providers.

## What role-model is

`role-model` is best understood as two connected layers:

| Layer | Purpose |
| --- | --- |
| `role-model` | the protocol and contract layer |
| `role-model-router` | the deterministic reference implementation of that protocol |

The protocol defines the vocabulary. The router shows how that vocabulary can be implemented in a stable
baseline.

## What role-model is not

`role-model` is not:

- a promise that one model permanently owns one role
- a single hosted runtime or orchestration product
- a provider-specific SDK abstraction
- a replacement for low-level schemas, traces, or usage records

Roles in `role-model` are assigned through routing metadata and policy, not by pinning a role forever to a
single model name.

## Endpoint-centric, not model-name-centric

One of the main design choices in this repository is that routing happens on **concrete endpoints**, not on
abstract model labels.

That matters because the same base model can behave differently depending on:

- provider and serving surface
- runtime version
- device or region
- quantization or precision
- tool support and policy constraints
- observed latency, failure rate, freshness, and cost

The protocol captures those differences directly so routing can operate on the thing that is actually being
selected.

See also:

- [Endpoint identity reference](../protocol/endpoint-identity.md)
- [Profiles reference](../protocol/profiles.md)

## What is implemented today

Today the repository already includes a working baseline:

- canonical JSON Schemas and fixtures
- generated types and schema tooling
- a reference router core
- a gateway smoke flow that emits a router decision, traces, usage, and observed performance artifacts

Some future host families and runtime surfaces are still architecture-stage. The public docs describe the
implemented baseline first and treat future runtime families as extensions, not as current product claims.

## Where to go next

- Read the [Quickstart](quickstart.md) to see the smoke flow produce real artifacts.
- Read [How role-model works](concepts/how-role-model-works.md) for the end-to-end system flow.
- Read [Protocol overview](concepts/protocol-overview.md) for the main protocol entities.
- Read [Routing overview](concepts/routing-overview.md) for the deterministic routing order and worked example.
