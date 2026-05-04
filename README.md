# role-model

`role-model` is an open protocol for capability-aware AI routing, plus a reference router that implements
that protocol.

It gives a router a durable contract for describing **what a request needs**, **what an endpoint can do**,
**what policy allows**, and **why a final routing decision was made**.

## Start here

The public-facing docs live under [`docs/public/`](docs/public/README.md). That folder is intentionally
separate so a future docs site can serve directly from it without mixing onboarding content with lower-level
reference docs.

| Read this | If you want |
| --- | --- |
| [`docs/public/README.md`](docs/public/README.md) | the docs hub |
| [`docs/public/introduction.md`](docs/public/introduction.md) | what role-model is and why it exists |
| [`docs/public/quickstart.md`](docs/public/quickstart.md) | a real end-to-end smoke run |
| [`docs/public/concepts/how-role-model-works.md`](docs/public/concepts/how-role-model-works.md) | the system flow |
| [`docs/public/concepts/protocol-overview.md`](docs/public/concepts/protocol-overview.md) | the protocol surface |
| [`docs/public/concepts/routing-overview.md`](docs/public/concepts/routing-overview.md) | how routing decisions happen |

## What role-model is

At a high level, `role-model` separates AI routing into a few stable pieces:

1. **Requests** describe task type, required capabilities, modalities, tool needs, and constraints.
2. **Endpoint identities and profiles** describe concrete routable endpoints rather than abstract model names.
3. **Routing policy** applies hard denies, preferences, budgets, and tie-break rules.
4. **Observability artifacts** record the decision, trace, usage, and observed performance.

That makes routing explainable and portable across different providers, hosts, and deployment shapes.

## What role-model is not

`role-model` is not:

- a single provider SDK
- a prompt-role library that permanently binds one persona to one model
- a monolithic runtime host
- a benchmark-only project with no routing contract

The protocol is the canonical contract. The router in `role-model-router/` is the reference implementation
of that contract.

## What you get in this repository

- canonical schemas and fixtures under [`protocol/`](protocol/README.md)
- protocol and architecture reference docs under [`docs/`](docs)
- shared tooling and generated types under `packages/`
- a deterministic reference router under [`role-model-router/`](role-model-router/README.md)
- a smoke flow that emits real routing artifacts under `runtime-output/gateway-smoke/`

## Current baseline

Today this repository is a **real baseline**, not only a design sketch:

- the protocol and schemas are implemented
- the router core and conformance coverage are implemented
- the smoke path and emitted artifacts are implemented
- some future host/runtime families are still architecture-stage rather than production-ready

## Quick start

This repository expects **Node.js 24** and **pnpm 10.x**.

```bash
pnpm install
pnpm run smoke
```

For a fuller walkthrough, see [`docs/public/quickstart.md`](docs/public/quickstart.md).

## Repository layout

| Path | What it contains |
| --- | --- |
| `docs/public/` | public-facing docs and future docs-site content root |
| `docs/protocol/` | protocol concept/reference docs |
| `docs/architecture/` | architecture and baseline model notes |
| `protocol/` | canonical schemas and example fixtures |
| `packages/` | schema tooling, generated types, and conformance packages |
| `role-model-router/` | reference router packages, adapters, and smoke apps |
| `testdata/` | endpoint metadata, traces, eval inputs, and supporting fixtures |

## Reference docs

- [`protocol/README.md`](protocol/README.md)
- [`docs/protocol/routing-policy.md`](docs/protocol/routing-policy.md)
- [`docs/protocol/roles.md`](docs/protocol/roles.md)
- [`docs/protocol/tasks.md`](docs/protocol/tasks.md)
- [`role-model-router/README.md`](role-model-router/README.md)

## License

Apache-2.0
