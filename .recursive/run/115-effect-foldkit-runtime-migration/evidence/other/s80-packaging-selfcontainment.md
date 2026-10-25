# S80 Packaging self-containment: resolution improved, dependency declaration deferred

## What changed

`style-build.mjs` used to import Vite and `@tailwindcss/vite` from a hardcoded path into the legacy app's `node_modules` (`../runtime-ui/node_modules/...`). It now resolves them like normal dependencies first:

```js
try { return await import(name); }                                   // normal resolution
catch { fall back to ../runtime-ui/node_modules, WITH A WARNING }
```

The fallback stays because this checkout has no per-package copy of the toolchain, but it is no longer silent, and the failure message tells the operator to run `pnpm install`. In this worktree the bare import already succeeds, so the build runs without the fallback path.

## What I deliberately did NOT do

I added `vite` and `@tailwindcss/vite` to `runtime-ui-next/package.json`, verified the build, then **reverted it**. Declaring a dependency without updating `pnpm-lock.yaml` would make a frozen-lockfile install fail, and I cannot run an install during verification (owner rule). A package.json that a lockfile check would reject is worse than a documented fallback.

So the remaining work is one concrete step for a normal development session: declare the two devDependencies and regenerate the lockfile with `pnpm install`. Until then the build resolves the toolchain from the workspace and says so.

## Fonts

Fonts already copy from repo-owned `runtime-ui/public/assets/fonts` (verified earlier), so the only remaining external coupling was the CSS toolchain.

## Status of packaging self-containment

- Fonts: **repo-owned**, verified.
- CSS toolchain: **resolves normally first, warns on fallback**; full self-containment needs the lockfile regeneration above.
- Therefore "clean clone builds with no legacy app present" remains **unproven** - and cannot be proven here without an install.
