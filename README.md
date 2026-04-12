# role-model

`role-model` is an open protocol and reference router for capability-aware AI routing.

It gives you a shared way to describe AI endpoints, routing policies, role/task requirements, and
observability artifacts such as router decisions, traces, usage events, and observed performance.

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
