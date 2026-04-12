# role-model

`role-model` is an open protocol and reference router for capability-aware AI routing.

It gives you a shared way to describe AI endpoints, routing policies, role/task requirements, and
observability artifacts such as router decisions, traces, usage events, and observed performance.

## The protocol in plain English

The protocol gives a router a consistent vocabulary for answering questions like:

- what kind of task is being requested
- which capabilities and modalities that task requires
- which endpoints claim or demonstrate those capabilities
- which policy or operational rules should influence selection
- how the final routing decision should be recorded and explained

In practice, the repository defines schemas for endpoint identity, declared and observed capability
profiles, routing policy, router decisions, traces, usage events, and related fixtures and examples.

## How roles are assigned to models

In `role-model`, roles are assigned through **routing metadata**, not by hard-coding a single model to
a prompt persona.

The flow is:

1. A `RoleDefinition` describes a role such as `general.chat`, `coder.patch`, `coder.review`, or `tool.agent`.
2. That role constrains which task families are allowed and what capabilities are required, preferred, or forbidden.
3. A task definition declares the capabilities and modalities needed for execution.
4. Endpoint profiles describe what a model or host can actually do.
5. The router filters for eligible endpoints, then selects among them using policy plus declared and observed evidence.

That means a role is not simply "this model always does code review." Instead, the router can assign a
role to whichever endpoint currently satisfies the role's task and capability requirements best.

## What you get

- JSON Schema contracts under `protocol/`
- TypeScript schema tooling and generated protocol types under `packages/`
- a deterministic reference router under `role-model-router/`
- fixture-driven conformance tests for schemas and routing behavior
- a lightweight smoke path that exercises routing end to end

## Quick start

This repository expects **Node.js 22** and **pnpm 10.x**.

```bash
pnpm install
pnpm run schemas:validate
pnpm run types:generate
pnpm run build
pnpm run test
pnpm run smoke
```

For CI-parity validation, run:

```bash
pnpm run ci:check
```

## Repository layout

| Path | What it contains |
| --- | --- |
| `protocol/` | Canonical schemas and example fixtures |
| `docs/` | Protocol docs, architecture notes, and decisions |
| `packages/` | Shared tooling, generated types, and conformance packages |
| `role-model-router/` | Reference router packages, adapters, and smoke apps |
| `testdata/` | Prompts, eval cases, traces, and endpoint metadata |

## Current scope

Today this repository is best understood as a **reference baseline**:

- the protocol and schemas are real
- the router core and conformance coverage are real
- the smoke path and observability artifacts are real
- some future runtime hosts and provider families are still scaffold-level rather than production-ready

## Learn more

- Start with `docs/protocol/` for the protocol model
- See `docs/protocol/routing-policy.md` for routing policy semantics
- See `docs/protocol/roles.md` and `docs/protocol/tasks.md` for role/task concepts
- See `role-model-router/README.md` for the router implementation surface

## License

Apache-2.0
