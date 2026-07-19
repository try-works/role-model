# Runtime Testing Matrix

## Purpose

This document maps changed repository paths to the minimum verification tiers required before closeout. Future runs and contributors should use it to determine their validation floor without inventing new rules ad hoc.

## Verification Tiers

| Tier | Scope | CI-safe | Typical cost |
| --- | --- | --- | --- |
| Fast unit | Package-level Vitest suites | Yes | Seconds |
| Critical regression | `runtime:test-critical` (focused host + UI + validators) | Yes | Under 1 minute |
| Router regression | `runtime:test-router` (curated router-backend, trace/usage packages, routing + observability validators) | Yes | Under 1 minute |
| Full package tests | `pnpm run test` (all workspace packages) | Yes | Minutes |
| Browser E2E | `runtime:test-browser` (Playwright rebuilt runtime) | Yes (local) | Tens of seconds |
| Rebuilt-runtime QA | Manual or agent-operated browser proof against rebuilt runtime | Yes (local) | Minutes |
| Packaged-runtime | `runtime:validate-packaging` or `build-binaries.yml` | Yes (mock) | Minutes to tens of minutes |

## Changed-Path Regression Matrix

| Changed path | Fast unit | Critical regression | Full package | Browser E2E | Rebuilt-runtime QA | Packaged-runtime |
| --- | --- | --- | --- | --- | --- | --- |
| `role-model-router/apps/runtime-host-bridge/src/**` | Yes | Yes | Yes | If UI-facing | If operator-facing | If packaging-affecting |
| `role-model-router/apps/runtime-host-bridge/test/**` | Yes | If critical | Yes | No | No | No |
| `role-model-router/apps/runtime-ui/app/**` | Yes | Yes | Yes | Yes | Yes | If packaging-affecting |
| `role-model-router/packages/core/**` | Yes | If routing logic | Yes | No | No | No |
| `role-model-router/packages/protocol-routing/**` | Yes | If routing logic | Yes | No | No | No |
| `role-model-router/packages/catalog/**` | Yes | If provider/model data | Yes | No | No | No |
| `role-model-router/packages/sqlite-memory/**` | Yes | If persistence logic | Yes | No | No | No |
| `role-model-router/packages/runtime-observability/**` | Yes | If telemetry logic | Yes | No | No | No |
| Benchmark surfaces (`benchmark-*.ts`) | Yes | Yes (benchmark-summary) | Yes | No | No | No |
| Packaging surfaces (`package-sea.ts`, `validate-packaging.ts`) | Yes | No | Yes | No | No | Yes |
| `/.github/workflows/ci.yml` | No | No | Yes | No | No | No |
| `/.github/workflows/build-binaries.yml` | No | No | No | No | No | Yes |
| `/package.json` (root scripts) | No | Yes | Yes | No | No | No |
| `/docs/**` | No | No | No | No | No | No |

## When Rebuilt-Runtime Verification Is Required

Rebuilt-runtime browser verification is required when:

1. Any file under `role-model-router/apps/runtime-ui/app/**` changes the rendered operator surface.
2. Any file under `role-model-router/apps/runtime-host-bridge/src/index.ts` changes the HTTP API contract consumed by the UI.
3. Any change affects the runtime shell boot path, session bootstrap, or provider/readiness rendering.

## Cross-Lifecycle Verification Gap

Some changes require a broader system proof even though the repo does not yet ship a dedicated `runtime:test-system-e2e` command family. Treat the following as cross-lifecycle proof surfaces:

1. Pi or Craft ingress correlation, request IDs, or persisted routing receipts.
2. SQLite persistence, retention, compaction, or prune eligibility.
3. replay-to-evaluation, evaluation-to-profile, or artifact projection handoffs.
4. hold acquisition, renewal, release, expiry, or blocked-prune diagnostics.
5. upload or import state, signed bundle lifecycle, or post-prune survivability.

Until a dedicated lane exists, changes that touch those surfaces must record a run-specific verification plan that combines the owning package tests with the relevant broader checks:

- `runtime:test-router` when routing, receipts, or persistence read paths are involved.
- `runtime:test-critical` when the same change also affects ordinary runtime-host or runtime-ui critical behavior.
- rebuilt-runtime QA when operator-visible diagnostics, receipts, or flows change.
- `runtime:validate-packaging` when packaged-runtime composition or packaged behavior could regress.

## When Packaged-Runtime Verification Is Required

Packaged-runtime verification is required when:

1. Any file under `role-model-router/apps/runtime-host-bridge/src/package-sea.ts` or `validate-packaging.ts` changes.
2. The SEA blob configuration, asset extraction, or build pipeline changes.
3. The `runtime:package-sea` or `runtime:validate-packaging` scripts change.
4. Any change adds or removes files that the packaged runtime must include or exclude.

## CI Tiering

### Default PR-safe floor (ci.yml)

1. `pnpm run lint`
2. `pnpm run schemas:validate`
3. `pnpm run build`
4. `pnpm run test`
5. `pnpm run runtime:test-critical`
6. `pnpm run runtime:test-router`
7. `pnpm run test:rust`
8. `pnpm run smoke`

### Heavier verification (manual dispatch or change-triggered)

- `runtime:test-browser` - Run locally or in a dedicated workflow when UI or operator-facing changes are present.
- Cross-lifecycle proof surfaces - No named root command exists yet; use a run-specific verification plan grounded in the owning tests plus `runtime:test-router`, `runtime:test-critical`, rebuilt-runtime QA, and `runtime:validate-packaging` as applicable.
- `runtime:validate-packaging` - Run when packaging-affecting files change.
- `build-binaries.yml` - Runs on `main` pushes and tags; verifies packaging hygiene.

## Extension Rules

When a new subsystem or verification surface is introduced:

1. Add the new path to the changed-path regression matrix.
2. Determine which existing tiers cover it and whether a new validator or test file is needed.
3. Update `docs/architecture/10-runtime-testing-architecture.md` if a new testing layer is introduced.
4. Ensure the new surface has at least one test in the critical regression tier if it is high-risk.

## Local Development Loop

For fast iteration:

```bash
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-ui test
```

For broader confidence before pushing:

```bash
corepack pnpm run runtime:test-critical
```

For full local regression:

```bash
corepack pnpm run runtime:test-full
```
