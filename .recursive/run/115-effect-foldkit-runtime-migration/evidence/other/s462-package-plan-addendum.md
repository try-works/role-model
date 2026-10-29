# S462 — package plan addendum: workspace dist builds required before package-sea

S450/S453 plan missed that workspace packages with dist-based exports (foldkit "dist is not vendored", effect-platform-browser, effect, @effect/sql-sqlite-node) must be BUILT inside the clean public tree before runtime:package-sea. First staged run proved it: private distribution stage4 PASSED sealed ({status PASS, extensionCount 13, sidecarSha256 27ef612bf86c3a7e0a2a646dec510d233d486b73f72587edb161f2d68942575a}), then package-sea failed at runtime-ui-next build with 13 esbuild "Could not resolve @role-model-router/foldkit" errors (clean foldkit dist absent; dirty tree has it prebuilt).

Repair stage (inserted before package-sea, inside clean public):
corepack pnpm --filter effect run build; --filter @role-model-router/effect-platform-browser run build; --filter @role-model-router/foldkit run build; --filter @role-model-router/sql-sqlite-node run build (dependency order; each is node build.mjs). Then continue package-sea unchanged. No lockfile/source change; build outputs are gitignored dists inside the clean tree, source identity unchanged.

Also recorded: bounded online-install deviation S461 (frozen lockfile retained; only missing npm tarballs fetched). No operator ports/state; no provider calls.
