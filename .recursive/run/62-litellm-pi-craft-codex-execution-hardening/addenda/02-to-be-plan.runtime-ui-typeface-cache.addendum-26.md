Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `26`
Status: `VERIFIED`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.runtime-ui-typeface-cache.addendum-26.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/cli-startup-readiness.test.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.runtime-ui-typeface-cache.addendum-26.md`

# Addendum 26 Plan: Prevent Stale Typeface Assets After Rebuild

## Required Behavior

R26.1 The packaged runtime static server must prevent stale browser-cache reuse for local runtime UI files.

R26.2 The fix must apply generically to HTML, CSS, JS, font, image, and fallback static responses served from `staticRoot`.

R26.3 The fix must not change the approved typography contract: Inter for display/body and IBM Plex Mono for diagnostic/id/path/JSON/transport content.

R26.4 The rebuilt package must still serve `/app` quickly and include the bundled font assets.

R26.5 The packaged launcher must open `/app` with a launch-scoped cache-busting query parameter so stale cached HTML cannot keep pointing at old CSS assets.

## Strict TDD Plan

RED:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/cli-startup-readiness.test.ts
```

Expected failure: static UI responses do not include `cache-control: no-store`.

GREEN:

- Add cache-control headers to the static response path in `startBridgeServer`.
- Re-run the focused startup readiness test.

## Verification Plan

- Run the focused TDD test.
- Rebuild/package the runtime.
- Verify release `/app` includes font preloads.
- Verify release `/assets/root-*.css` and `/assets/fonts/*.woff2` return `cache-control: no-store`.
- Verify the packaged launcher binary contains the `rm_launch` handoff token.
- Verify no stale runtime/background probe processes are left behind.

## Verification Evidence

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/cli-startup-readiness.test.ts` passed.
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts -t "applies the Paper Linear palette"` passed.
- `corepack pnpm --filter @role-model-router/runtime-ui run build` produced `/assets/root-DZdKbiZ8.css`.
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run package-sea` refreshed `role-model-router/dist/release/win32-x64/`.
- `GO111MODULE=off go test` passed in `role-model-router/apps/launcher`.
- Packaged launcher binary contains the `rm_launch` handoff token.
- Packaged runtime smoke returned `/health` in 1134 ms, `/app?rm_launch=smoke` in 38 ms, and `cache-control: no-store` for `/app`, CSS, Inter, and IBM Plex Mono font assets.
- Fresh Edge CDP verification computed the overview heading family as `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

## Requirement Completion Status

- `R26.1` | `verified` | Static response cache headers return `cache-control: no-store`.
- `R26.2` | `verified` | The shared `staticRoot` file response path covers HTML, CSS, JS, font, image, and fallback assets.
- `R26.3` | `verified` | Typography tokens remain Inter for display/body and IBM Plex Mono for mono content; bundled font declarations remain present.
- `R26.4` | `verified` | Rebuilt package served `/app` in 36 ms and bundled font assets with no-store headers.
- `R26.5` | `verified` | Launcher opens frontend URLs with `rm_launch` cache busting.

## Coverage Gate

- [x] Requirements are specific and verifiable.
- [x] TDD command is defined.
- [x] Live packaged verification is defined.

Coverage: PASS

## Approval Gate

- [x] Plan fixes the stale-cache boundary instead of adding consumer-specific behavior.
- [x] Plan does not reintroduce remote fonts.
- [x] Plan is ready for implementation.

Approval: PASS
