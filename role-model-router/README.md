# role-model-router

`role-model-router` contains router-specific implementation for the role-model baseline.

## Sections

- `skills/` — lightweight operator-facing entry points such as router, benchmark, endpoint detection, and
  config export
- `packages/` — pure routing core, adapter/provider packages, observability helpers, role/task packages,
  and runtime-web support
- `apps/` — smoke and development executables for the lightweight baseline
- `rust/` — native host/provider/store placeholders and future native runtime workspace

## Lightweight baseline host

The stable baseline can:

- detect declared ACP, MCP, and CLI endpoints,
- normalize them into endpoint identities and capability profiles,
- route a synthetic request through the deterministic core,
- emit routing decision, trace, and usage artifacts,
- export stable config metadata for downstream tools.

## Runtime operations

The current single-host runtime baseline now has three operator-facing validation commands:

- `corepack pnpm run runtime:validate-host`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:validate-operations`

The durable playbook for vendor updates, deployment and upgrade guidance, validation and repair, and SQLite
runtime-data drills lives at `docs/operations/01-router-runtime-hardening-playbook.md`.

Future Pi and desktop hosts will add long-lived orchestration and richer runtime management on top of this
protocol-compatible baseline.
