# Final gate: ui identity fixed

Date: 2026-11-01. No product source or verify-gate code changed.

## Root cause

The package's build/client was copied from an older runtime-ui-next/dist/client. The UI source moved (TanStack charts, replay card, etc.), so the packaged client bytes differed from the current built client. The verify gate correctly refused the package.

## Pipeline fix

1. Rebuilt the current UI client into role-model-router/apps/runtime-ui-next/dist/client:
   `corepack pnpm --filter @role-model-router/runtime-ui-next run build`
   Result: PASS, assets/main.js 3.2 MB, assets/main.css rebuilt.
2. Rebuilt the private Track B distribution with:
   `ROLE_MODEL_PUBLIC_WORKTREE=D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`
   `node scripts/track-b/build-runtime-distribution.mjs`
   Result: PASS, 13 extensions.
3. Repackaged the SEA so build/client is copied from the current UI and embedded:
   `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration/dist/run00-dev`
   `corepack pnpm run runtime:package-sea`
   Result: role-model-dev.exe sha256 `6d90b28aa2092e7af074324e7f1f0cc5c30d3d9d039c1a0ee25524aa52eea3ed`

## Verified

`corepack pnpm run runtime:verify-packaged-candidate`:

- version=healthy **0.0.20-503-ga7aafb46**
- sha256=**6d90b28aa2092e7af074324e7f1f0cc5c30d3d9d039c1a0ee25524aa52eea3ed**
- PASS health, models, telemetry, controller, learning, replay jobs, evaluation jobs
- PASS ui css: 65632 bytes, both theme blocks
- PASS ui bundle: 3335314 bytes
- PASS ui theme boot, chat completion, ui shell

Full logs:
- gate-ui-identity-rebuild.log
- gate-ui-identity-package.log
- gate-ui-identity-verify.log
