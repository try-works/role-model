# Router Runtime Hardening Playbook

This playbook is the durable operator-facing guide for the first complete single-host `role-model-router`
runtime baseline.

## Scope

Use this playbook for:

- fresh-worktree validation,
- local deployment and upgrade checks,
- vendored `llama-swap` refreshes,
- runtime SQLite backup, restore, export, and delete drills,
- investigation of host, adapter, SQLite, and control-plane failures.

This playbook assumes the first-milestone architecture locked in:

- `docs/architecture/05-memory-model.md`
- `docs/architecture/06-router-runtime-architecture-lock.md`

## Validation command surface

Run these from the repo root:

1. `corepack pnpm run runtime:validate-host`
2. `corepack pnpm run runtime:validate-observability`
3. `corepack pnpm run runtime:validate-operations`
4. `corepack pnpm run runtime:validate-state`
5. `corepack pnpm run runtime:validate-routing`
6. `corepack pnpm run runtime:validate-adapter`
7. `corepack pnpm run schemas:validate`
8. `corepack pnpm run smoke`

## What each runtime command proves

| Command | Purpose | Primary evidence |
| --- | --- | --- |
| `runtime:validate-host` | clean vendored host startup plus one host-integrated request path | host startup, `/health`, `/logs`, `/api/metrics`, `/api/captures/:id` |
| `runtime:validate-observability` | current observability alias over the same host-integrated path | structured request/profile reads plus the same host evidence |
| `runtime:validate-operations` | strongest local run-12 drill | host validation, scope isolation, replay/shadow comparison, SQLite export/backup/delete/restore |
| `runtime:validate-state` | SQLite schema and provider-account baseline | database path, schema version, migration receipts, maintenance defaults |

## Validation and repair order

When the runtime is unhealthy, inspect in this order:

1. Run `corepack pnpm run runtime:validate-host`.
2. If startup fails, read the surfaced vendored host stdout/stderr first.
3. If startup succeeds, read:
   - `/logs`
   - `/api/metrics`
   - `/api/captures/:id`
   - `/api/role-model/requests`
   - `/api/role-model/requests/<requestId>`
   - `/api/role-model/endpoints/<endpointId>/profile`
4. Re-run `corepack pnpm run runtime:validate-operations` after any repair that touches host startup, runtime state,
   or structured inspection behavior.
5. Re-run the broader runtime floor:
   - `runtime:validate-state`
   - `runtime:validate-routing`
   - `runtime:validate-adapter`
   - `schemas:validate`
   - `smoke`

## Vendor update procedure

The pinned vendor baseline lives in:

- `role-model-router/packages/catalog/data/vendor-version-ledger.json`

Before refreshing the vendored host:

1. Record the upstream commit or tag you intend to import.
2. Confirm whether the refresh changes:
   - host process behavior,
   - proxy operator routes,
   - UI build output expectations under `role-model-router/vendor/llama-swap/ui-svelte`,
   - capture, log, or metrics behavior.
3. Refresh the vendored tree intentionally.
4. If you want the full upstream UI locally, build it from `role-model-router/vendor/llama-swap/ui-svelte` using the
   upstream Node build path. The runtime no longer requires that build to start on a fresh worktree, but the full UI is
   still optional operator polish.
5. Update the vendor ledger only when the pinned vendor snapshot changes intentionally.
6. Re-run:
   - `runtime:validate-host`
   - `runtime:validate-observability`
   - `runtime:validate-operations`
   - focused vendored `go test ./proxy`

## Deployment and upgrade guidance

The first runtime milestone is a single-host, local-machine deployment. Keep these rules:

- keep runtime state on the same local disk as the host bridge,
- preserve OS or disk-level encryption for the runtime state root,
- treat `scopeId` as the isolation boundary for runtime SQLite state,
- run the runtime validation commands after upgrades to the vendored host, bridge app, or SQLite schema.

Upgrade checklist:

1. stop the local runtime host,
2. back up runtime SQLite state,
3. apply the code or vendor update,
4. run `runtime:validate-host`,
5. run `runtime:validate-operations`,
6. only then resume normal operator use.

## SQLite runtime-data drills

`runtime:validate-operations` exercises the current run-12 maintenance helpers by:

- exporting runtime observations and latest endpoint-profile summaries to JSON,
- creating a SQLite backup snapshot,
- deleting the scoped runtime-state files,
- restoring the scoped runtime-state files from backup,
- confirming the restored request observation is readable again.

Treat that command as the current canonical drill for:

- backup verification,
- restore verification,
- export verification,
- scoped delete verification.

## Known first-milestone limits

- `runtime:validate-observability` currently aliases the same host-integrated validator as `runtime:validate-host`.
- The runtime records cache-observability receipts, but deterministic live cache-hit reproduction may still depend on the
  provider fixture path in use.
- Replay/shadow evaluation is currently deterministic routing comparison over the current local validation fixtures; it is
  not a second live provider execution path.
- Full upstream `go test ./...` may still hit upstream vendor assumptions outside the role-model-owned proxy slice.
