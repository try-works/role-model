Run: `/.recursive/run/35-runtime-ui-connect-declutter/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `01`
Inputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/02-to-be-plan.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/03-implementation-summary.md`
- Packaged-runtime operator validation on `2026-06-08` (Role-Model.bat, port `3456`)
Outputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/addenda/02-to-be-plan.post-closeout-packaged-runtime.addendum-01.md`
Scope note: Post-closeout remediation for packaged-runtime UI serving and routing-strategy control-plane truthfulness discovered after run-35 UI delivery.

## Problem Statement

Operator validation after run 35 exposed two product defects outside the original UI de-clutter scope but blocking packaged-runtime usability:

1. **Packaged runtime root 404** — `Role-Model.bat` starts `role-model-runtime.exe` with `--static-root <package>/build/client`, but the CLI ignored that flag and defaulted to a dev-repo UI path that does not exist in the release bundle. Browser opened to `{"error":"not found"}`.
2. **Routing Strategy false zeros** — `/app/router/strategy` "Current control-plane context" showed `Local models: 0` and `Remote mappings: 0` while the live registry had one local and one remote model configured through Connect/control-plane activation (peer-backed local + Moonshot OAuth remote), not through `runtime-config.yaml` `llamaSwap.models` / `liteLLM.providers` arrays.

Secondary issue fixed in the same addendum:

3. **SEA packaging staleness** — `package-sea` bundled `dist/cli.js` without running `tsc` first, so bridge fixes did not reach `role-model-runtime.exe` until a manual compile step was performed.

## Requirement Delta

| ID | Requirement | Disposition |
| --- | --- | --- |
| A1 | Packaged launcher must serve `build/client/index.html` at `/` when `--static-root` is provided | new |
| A2 | Packaged runtime must resolve `build/client` next to the executable when present | new |
| A3 | Routing Strategy control-plane context must count active registry-backed local/remote models, not only YAML-declared llama-swap / LiteLLM mappings | new |
| A4 | `package-sea` must compile `runtime-host-bridge` TypeScript before esbuild bundling | new |

## Implementation Slices

### SP8-A — Bridge static UI serving (`A1`, `A2`, `A4`)

Files:

- `/role-model-router/apps/runtime-host-bridge/src/cli.ts`
  - honor `args.values["static-root"]` when starting the bridge server
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - add `resolveStandaloneStaticRoot()` preferring `<exe-dir>/build/client` and `<repo-root>/build/client`
- `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
  - run `tsc` for `runtime-host-bridge` before `bundleSeaEntrypoint()`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - update packaged-options test to accept standalone `build/client` when present

Verification:

- `pnpm run build && pnpm run package-sea` in `runtime-host-bridge`
- `pnpm run validate-packaging`
- manual: `Role-Model.bat` serves HTML at `http://127.0.0.1:3456/`

### SP8-B — Routing Strategy live counts (`A3`)

Files:

- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - add `countActiveEndpointModels(endpoints)`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
  - unit test for mixed local/remote endpoint registry
- `/role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
  - load `fetchRuntimeSnapshot()`; display live local/remote model counts in control-plane context
  - keep YAML-declared counts as secondary footnote when non-zero

Verification:

- `vitest run app/lib/view-models.test.ts` in `runtime-ui`
- manual: with one local + one remote active endpoint, strategy page shows `1` / `1`

## Out of Scope

- Replacing the 120 ms latency adapter fallback (separate runtime-observability fix)
- Populating `/logs` text capture in standalone packaged mode
- Rebasing Connect nav label in an already-built client without rebuild

## Coverage Gate

- [x] A1–A4 mapped to concrete file edits
- [x] Verification paths recorded for bridge and UI
- [x] Scope bounded to post-closeout operator blockers

## Approval Gate

- [x] Addendum reconciles locked run-35 scope with observed packaged-runtime defects
- [x] Does not rewrite locked Phase 0–2 artifacts; supplements them only
