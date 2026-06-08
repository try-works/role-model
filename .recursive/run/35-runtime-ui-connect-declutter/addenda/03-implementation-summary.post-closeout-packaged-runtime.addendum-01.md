Run: `/.recursive/run/35-runtime-ui-connect-declutter/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `01`
Inputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/addenda/02-to-be-plan.post-closeout-packaged-runtime.addendum-01.md`
Outputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/addenda/03-implementation-summary.post-closeout-packaged-runtime.addendum-01.md`
Scope note: Post-closeout SP8 implementation for packaged-runtime UI serving and routing-strategy control-plane counts.

## SP8-A — Bridge static UI serving

### Root cause

- `Role-Model.bat` passed `--static-root <package>/build/client` but `cli.ts` ignored the flag and always used `resolveBridgeServerOptions().staticRoot`, which pointed at a dev-repo UI path missing from release bundles.
- `package-sea` bundled stale `dist/cli.js` because `tsc` was not run before esbuild.

### Changes

| File | Change |
| --- | --- |
| `role-model-router/apps/runtime-host-bridge/src/cli.ts` | Honor `args.values["static-root"]` when starting the server |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | Add `resolveStandaloneStaticRoot()`; prefer packaged `build/client` |
| `role-model-router/apps/runtime-host-bridge/src/package-sea.ts` | Compile bridge TypeScript before SEA bundling |
| `role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Packaged-options test accepts standalone `build/client` |

### Verification

- `vitest run test/index.test.ts -t "resolves packaged bridge server options"`
- `pnpm run validate-packaging` (after `package-sea`)
- Manual: `/` returns HTML from `Role-Model.bat`

## SP8-B — Routing Strategy live counts

### Root cause

`control-routing-strategy.tsx` displayed `config.llamaSwap.models.length` and LiteLLM `modelMappings` counts. Operator-configured models via Connect/control-plane (peer-backed local + OAuth remote) live in the registry, not in those YAML arrays.

### Changes

| File | Change |
| --- | --- |
| `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | `countActiveEndpointModels()` |
| `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` | Unit coverage |
| `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx` | Load snapshot; show live local/remote model counts with YAML footnote |

### Verification

- `vitest run app/lib/view-models.test.ts` — 88/88 runtime-ui tests PASS
- Manual: strategy page shows `1` local / `1` remote with active endpoints configured

## Requirement Completion Status (addendum)

| ID | Status | Changed Files | Evidence |
| --- | --- | --- | --- |
| A1 | implemented | `cli.ts` | `validate-packaging`, manual `/` HTML |
| A2 | implemented | `index.ts` | packaged static root test |
| A3 | implemented | `view-models.ts`, `control-routing-strategy.tsx` | view-models test, manual UI |
| A4 | implemented | `package-sea.ts` | `package-sea` build includes fresh `tsc` |
