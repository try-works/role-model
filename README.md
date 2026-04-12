# role-model

`role-model` defines the protocol, schemas, tooling, and baseline host scaffolding for capability-aware
AI routing. The protocol lives as repository content, not as chat convention.

## Stable baseline

This baseline establishes:

- canonical protocol docs and JSON Schemas under `protocol/` and `docs/`
- generated protocol types plus schema validation tooling under `packages/`
- a deterministic routing core with conformance tests
- observability artifacts for router decisions, traces, usage, and observed performance
- a lightweight `role-model-router` host path for ACP, MCP, and CLI-backed routing
- reserved homes for browser, edge, and native provider families without claiming full runtime support

## Intentionally deferred

This repository does **not** claim production-complete support for:

- Pi daemon or desktop router hosts
- long-lived localhost OpenAI gateways
- production-grade WebLLM, MediaPipe, LiteRT-LM, ONNX, MLX, or GGUF execution
- package publishing, model-pack installation, or full memory backends

## Repository map

| Path | Purpose |
| --- | --- |
| `protocol/` | Canonical JSON Schema contracts and fixtures |
| `docs/` | Architecture, protocol semantics, and ADRs |
| `packages/` | Shared protocol-wide tooling and contracts |
| `role-model-router/` | Routing packages, host scaffolds, apps, and native placeholders |
| `testdata/` | Prompts, eval cases, traces, and endpoint metadata fixtures |

## Root commands

All commands run from the repository root with **Node.js 22** and **pnpm 10.x**.

1. `pnpm install` — bootstrap workspace dependencies
2. `pnpm run schemas:validate` — validate canonical JSON Schemas
3. `pnpm run types:generate` — generate protocol TypeScript types from schemas
4. `pnpm run lint` — Biome plus Rust formatting/clippy checks
5. `pnpm run build` — build TypeScript workspace packages after type generation
6. `pnpm run test` — run TypeScript and routing tests
7. `pnpm run test:rust` — run Rust workspace tests
8. `pnpm run smoke` — execute the lightweight gateway smoke flow
9. `pnpm run ci:check` — CI-parity aggregate command
