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

Future Pi and desktop hosts will add long-lived orchestration and richer runtime management on top of this
protocol-compatible baseline.
