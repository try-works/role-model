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

### Telemetry query semantics

Runtime telemetry separates four contracts:

- **Aggregates** (`/api/role-model/telemetry/summary` and `/rows`) cover the complete half-open UTC window
  `[startAtMs, endAtMs)` and are independent of any recent-page size.
- **Recent lists** (`/api/role-model/telemetry/requests` and `/requests/page`) are intentionally bounded
  pages. The page envelope reports `returned`, `totalMatching`, `pageSize`, `truncated`, `nextCursor`, and
  the effective `window`/`asOfMs` snapshot.
- **Router decisions** retain the compatibility array at `/api/role-model/router/decisions`; the additive
  `/api/role-model/router/decisions/page` envelope exposes the full window total beside its bounded page.
- **Exact lookups** use the persisted `requestId`; they do not scan a recent page. Capture links emitted by
  the Activity view carry the persisted request identity so inserting a newer request cannot retarget an old
  inspection link.
- **Rankings** retain an explicit `topN` limit and are not a substitute for totals.

The default Activity page remains 50 rows for bounded transfer and rendering. Its cards and sidebar counts
come from the aggregate window, and the UI labels the visible page as `Showing N of total`. A `limit` must
never be reused as an aggregate or exact-lookup bound. See the Run 90 semantic regression tests under
`packages/sqlite-memory/test/run90-telemetry-query-semantics.test.ts` and
`apps/runtime-host-bridge/test/run90-telemetry-query-semantics.test.ts`.

Future Pi and desktop hosts will add long-lived orchestration and richer runtime management on top of this
protocol-compatible baseline.
