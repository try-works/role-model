# S283 — clean paired packaging preflight (read-only)

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash** (verified via `list_agents`). No builds run by me; no product writes, no children/CLI/provider, no operator ports 3456/57/58.
- Snapshots (Lead-created, verified here): `E:/role-model-run115/package-s284-public` @ `a01230f0524bd724536108b0b3aab5e7dc824492`; `E:/role-model-run115/package-s284-private` @ `0c5216b69ea44126a67654bfe44655acb9d97eee`; both `git status --porcelain --untracked-files=all` empty. Offline frozen `--ignore-scripts` installs with isolated virtual stores `E:/role-model-run115/s284-{public,private}-virtual` (Lead-reported PASS; not shared with the original worktrees).

## Exact clean build command (Lead to execute)

```powershell
# one-shot immutable snapshot; do not reuse after dist/ exists
Set-Location E:/role-model-run115/package-s284-private
$env:ROLE_MODEL_PUBLIC_WORKTREE = "E:/role-model-run115/package-s284-public"
Remove-Item Env:ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD -ErrorAction SilentlyContinue
corepack pnpm build:run00-runtime   # = node scripts/track-b/build-runtime-distribution.mjs
```

- Node `>=24 <25` (host: v24.11.0), corepack 0.34.0, pnpm `10.6.5` per root `packageManager`; `package.json` script `build:run00-runtime`.
- Output: `package-s284-private/dist/run00-dev/track-b-runtime-manifest.json` (+ staged extensions/contracts/sidecar/public-router/UI). The build does not accept a custom output root (fixed `dist/run00-dev`), so the snapshot becomes dirty after the build — expected; package once per fresh snapshot.
- Source-lock caveat: `evidence/source-set/tb00-release-source-lock.json` still points at old `D:` paths; `ROLE_MODEL_PUBLIC_WORKTREE` override is mandatory and wins (build script line 67-70).
- `ROLE_MODEL_TEST_ALLOW_DIRTY_BUILD=1` is test-only: it would mark `sourceSeal.status="unsealed_dirty_test"`, `releaseEligible=false`, and the packaged-executable validator rejects it — must stay unset.

## Identity gates actually enforced (private `scripts/track-b/build-runtime-distribution.mjs`)

- `gitIdentity` (lines 77-88): `git status --porcelain --untracked-files=all` must be empty for BOTH worktrees; commit and tree must be 40-hex; public tree re-read and compared (lines 89-97). Our snapshots satisfy this.
- Manifest fields to assert after the build: `publicCommit=a01230f0…`, `privateCommit=0c5216b6…`, matching `publicSourceTree`/`privateSourceTree`, `sourceSeal.status="sealed_clean"`, `releaseEligible=true`, `privateClean=true`, `publicClean=true`.
- The packaged-executable validator (`scripts/track-b/packaged-runtime-executable.mjs:24-50`) rejects any manifest whose seal is not clean/release-eligible.

## Build dependency types (what the build needs installed)

1. Private root: `esbuild@0.25.12` (bundles sidecar/extensions), `hyparquet-writer` runtime dep, and the workspace wrappers `effect`, `effect-mq`, `@effect/sql-sqlite-node` → private packages under `shared/` (`pnpm-workspace.yaml`: `extensions/*`, `cloud/*`, `shared/*`); `ensureVendoredWrapperDists` rebuilds their gitignored `dist/` from vendor stamps before bundling.
2. Public snapshot (driven internally by `buildPublicRuntimeDependencies`, `corepack pnpm` filters): `effect`, `effect-mq`, `@effect/sql-sqlite-node`, `@role-model-router/sqlite-memory...`, and `@role-model-router/runtime-ui` (vite build). Public workspace install is therefore required; isolated virtual store keeps its links inside the snapshot.
3. No runtime/provider/network dependency: the private build only spawns local pnpm builds and esbuild; keep `--offline`/fail-closed corepack so a missing package fails instead of fetching.

## SEA/executable packaging — PUBLIC repo (CORRECTION)

**Retraction:** my earlier claim that no in-repo SEA command exists was based on a private-`scripts/track-b` search only. The public repo owns the SEA/packaged-candidate path; that broad absence claim is withdrawn.

- Public root `package.json:30`: `runtime:package-sea` = `corepack pnpm --filter @role-model-router/runtime-ui-next run build && corepack pnpm --filter @role-model-router/runtime-host-bridge... build && corepack pnpm --filter @role-model-router/runtime-host-bridge run package-sea`. `package.json:31`: `runtime:validate-packaging` wraps it with `validate-packaging`; `:85` `runtime:verify-packaged-candidate`; `:87` `runtime:audit-rendered-ui`.
- Exact SEA invocation (public snapshot root): ```powershell
Set-Location E:/role-model-run115/package-s284-public
$env:ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT = "E:/role-model-run115/package-s284-private/dist/run00-dev"
corepack pnpm runtime:package-sea
``` The Track B root env is the only integration input named in `package-sea.ts:1015-1022`; the helper stages it as `<releaseDir>/track-b-runtime` and checks `expectedPublicSourceTree` against the public tree.
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts:942-1041`: public worktree clean + `HEAD^{tree}` seal; `tsc -p runtime-host-bridge/tsconfig.json`; `buildLlamaSwapAsset`; `bundleSeaEntrypoint`; `writeSeaConfig` → `node --experimental-sea-config`; copy `process.execPath`; inject SEA blob (Windows `BeginUpdateResource`/`UpdateResource` + sentinel patch, POSIX `postject`); stage standalone files; stage Track B distribution; launcher/.bat; sha256; artifact closure verify. Optional `BUILD_DATE`/`RUN88_RELEASE_ID` envs per helper.
- Public worktree cleanliness is re-checked at SEA time, so SEA must run from the clean public snapshot (build artifacts under gitignored `dist/` do not dirty tracked paths).

## Rendered/legacy audit flags — PUBLIC authoritative flags

- `scripts/runtime/verify-packaged-candidate.mjs`: `--static-root` (default `role-model-router/apps/runtime-ui-next/dist/client`), `--rendered`, `--require-rendered`, plus `--url`/`--state-root` pass-through; `R39_VERIFY_BLOCKING=true` acts as blocking. `--rendered` internally invokes `scripts/runtime/audit-rendered-ui.mjs`; `--require-rendered` fails (rather than skips) when no browser is available.
- `scripts/runtime/audit-rendered-ui.mjs` flags: `--url` or `--exe`, `--routes` (default 20-route list incl. `/`, `/runtime`, `/models`, `/router`, `/dashboard`, `/studio`, `/learning`, `/diagnostics/42`), `--state-root`, `--width`, `--height`, `--click-sweep`, `--control-action`, `--studio-run`. Exit 0 clean / 1 failures / 2 not run (no browser or host unreachable).
- Exact commands from the public snapshot root: ```powershell
corepack pnpm runtime:verify-packaged-candidate -- --rendered --require-rendered --static-root "<packaged UI client dir>"
corepack pnpm runtime:audit-rendered-ui -- --exe "<packaged runtime exe>" --routes /,/models,/dashboard --click-sweep --control-action --studio-run
```
- `prove-packaged-product.mjs` (private) remains `--private-root/--public-root/--release-root|--development-release-root|--stage-release-root/--release-target/--track`; `run95-runtime-conformance.mjs` remains `--manifest` (+ ephemeral sidecar flags); private `storage-audit.mjs` remains `--read-only --state-root --channel [--output]`.
- **Do not point rendered audits at operator ports 3456/3457/3458**: use the packaged candidate's own ephemeral port or `--exe`, and an E: state root. This is the rendered legacy-URL/current-query audit path; source mount tests (s269/s278/s280) are complementary, not a substitute.

## Risks / recommendations

1. **Do not junction or point at the original worktrees' `node_modules`**: pnpm workspace/store links resolve to the original trees (identity risk); the isolated virtual stores are the correct route.
2. `--ignore-scripts` is acceptable here because all builds are explicit `pnpm run build` steps; still verify the esbuild platform binary resolves (`node -e "require('esbuild').version"`) before building.
3. Keep the original worktrees' untracked evidence untouched (no clear/stash/add -A/delete); the snapshot excludes all 86 public untracked entries by construction. The capture worker writes evidence to the originals, never the snapshot.
4. One build per fresh snapshot: after `dist/run00-dev` exists the guard would fail a second run; never use the dirty-test switch to bypass it.
5. Do not start or call operator ports 3456/3457/3458 during packaging/proof; use the conformance sidecar's ephemeral port.

## Limits

Read-only preflight; I did not install, build, run tests, or touch snapshots/product files. Install PASS and the running build are Lead-reported. Correction: the SEA and rendered-audit commands live in the PUBLIC repo (package.json:30/31/85/87, `package-sea.ts`, `scripts/runtime/*`); my earlier private-only search is superseded. Rendered audits were not executed here (no browser/exe run by me).

